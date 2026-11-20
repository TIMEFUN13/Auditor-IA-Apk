// Prepara el proyecto Android generado por Capacitor:
//  1) permisos de cámara y de captura de pantalla
//  2) complemento nativo «ScreenCapture» (MediaProjection) para analizar otra app en vivo,
//     por ejemplo MotiConnect en pantalla dividida
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const appId = JSON.parse(readFileSync('capacitor.config.json', 'utf8')).appId;
const pkgDir = `android/app/src/main/java/${appId.replace(/\./g, '/')}`;
mkdirSync(pkgDir, { recursive: true });

/* ---------- AndroidManifest.xml ---------- */
const mf = 'android/app/src/main/AndroidManifest.xml';
let x = readFileSync(mf, 'utf8');
const perms = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '<uses-permission android:name="android.permission.INTERNET" />',
].filter((l) => !x.includes(l));
if (perms.length) x = x.replace('</manifest>', '    ' + perms.join('\n    ') + '\n</manifest>');
const svc = '<service android:name=".ScreenCaptureService" android:exported="false" android:foregroundServiceType="mediaProjection" />';
if (!x.includes('ScreenCaptureService')) x = x.replace('</application>', '        ' + svc + '\n    </application>');
// Cámaras WiFi de estereoscopio: sirven imágenes por HTTP simple dentro de su propia red (sin internet)
if (!x.includes('usesCleartextTraffic')) x = x.replace('<application', '<application android:usesCleartextTraffic="true"');
writeFileSync(mf, x);

/* ---------- MainActivity: registra el complemento ---------- */
writeFileSync(`${pkgDir}/MainActivity.java`, `package ${appId};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenCapturePlugin.class);
        registerPlugin(CamStreamPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);

/* ---------- Complemento: pide permiso y arranca el servicio ---------- */
writeFileSync(`${pkgDir}/ScreenCapturePlugin.java`, `package ${appId};

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScreenCapture")
public class ScreenCapturePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        MediaProjectionManager mpm = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        startActivityForResult(call, mpm.createScreenCaptureIntent(), "onPermission");
    }

    @ActivityCallback
    private void onPermission(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Permiso de captura denegado");
            return;
        }
        ScreenCaptureService.listener = (jpegBase64, width, height) -> {
            JSObject o = new JSObject();
            o.put("data", jpegBase64);
            o.put("width", width);
            o.put("height", height);
            notifyListeners("frame", o);
        };
        Intent svc = new Intent(getContext(), ScreenCaptureService.class);
        svc.putExtra("resultCode", result.getResultCode());
        svc.putExtra("resultData", result.getData());
        svc.putExtra("maxWidth", call.getInt("maxWidth", 1280).intValue());
        svc.putExtra("fps", call.getInt("fps", 6).intValue());
        svc.putExtra("quality", call.getInt("quality", 75).intValue());
        ContextCompat.startForegroundService(getContext(), svc);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        ScreenCaptureService.listener = null;
        getContext().stopService(new Intent(getContext(), ScreenCaptureService.class));
        call.resolve();
    }
}
`);

/* ---------- Complemento: video directo de cámaras WiFi de microscopio (Moticam X/X3/X5…) ----------
   Lee el video MJPEG (o imágenes JPEG sueltas) que la cámara sirve por HTTP en su propia red WiFi,
   a la calidad original de la cámara: sin MotiConnect y sin captura de pantalla. */
writeFileSync(`${pkgDir}/CamStreamPlugin.java`, `package ${appId};

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "CamStream")
public class CamStreamPlugin extends Plugin {

    private volatile boolean running = false;
    private volatile Thread worker = null;
    private volatile HttpURLConnection conn = null;

    // La WiFi de la cámara no tiene internet: Android podría mandar el tráfico por datos móviles.
    // Se abre la conexión explícitamente por la red WiFi.
    private Network wifi() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            for (Network n : cm.getAllNetworks()) {
                NetworkCapabilities nc = cm.getNetworkCapabilities(n);
                if (nc != null && nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return n;
            }
        } catch (Exception e) { /* sin permiso o sin WiFi */ }
        return null;
    }

    private HttpURLConnection open(String url, int timeout) throws Exception {
        Network w = wifi();
        URL u = new URL(url);
        HttpURLConnection c = (HttpURLConnection) (w != null ? w.openConnection(u) : u.openConnection());
        c.setConnectTimeout(timeout);
        c.setReadTimeout(timeout);
        c.setUseCaches(false);
        c.setRequestProperty("Cache-Control", "no-cache");
        c.setInstanceFollowRedirects(true);
        return c;
    }

    /** Prueba una dirección: tipo de contenido, primeros bytes y, si es una imagen, la imagen completa. */
    @PluginMethod
    public void probe(PluginCall call) {
        final String url = call.getString("url");
        final int timeout = call.getInt("timeout", 2500);
        final int max = call.getInt("maxBytes", 6 * 1024 * 1024);
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                c = open(url, timeout);
                int code = c.getResponseCode();
                String type = String.valueOf(c.getContentType());
                InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
                boolean multipart = type.toLowerCase().contains("multipart");
                int limit = multipart ? 300000 : max;
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[16384];
                long t0 = System.currentTimeMillis();
                int n;
                while (in != null && out.size() < limit && (n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    if (multipart && System.currentTimeMillis() - t0 > 1500) break;
                }
                byte[] b = out.toByteArray();
                JSObject o = new JSObject();
                o.put("status", code);
                o.put("type", type);
                o.put("size", b.length);
                o.put("multipart", multipart);
                int head = Math.min(b.length, 60000);
                o.put("text", new String(b, 0, head, "ISO-8859-1"));
                boolean jpeg = b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8;
                o.put("jpeg", jpeg);
                if (jpeg && !multipart) o.put("data", Base64.encodeToString(b, Base64.NO_WRAP));
                call.resolve(o);
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage() != null ? e.getMessage() : e));
            } finally {
                if (c != null) c.disconnect();
            }
        }).start();
    }

    /** Abre el video MJPEG y envía cada cuadro JPEG (base64) al evento «frame». Se reconecta solo. */
    @PluginMethod
    public void start(PluginCall call) {
        stopWorker();
        final String url = call.getString("url");
        final long interval = 1000L / Math.max(1, call.getInt("fps", 15));
        running = true;
        worker = new Thread(() -> {
            while (running) {
                try {
                    HttpURLConnection c = open(url, 6000);
                    conn = c;
                    InputStream in = c.getInputStream();
                    byte[] buf = new byte[65536];
                    ByteArrayOutputStream frame = new ByteArrayOutputStream(262144);
                    boolean inFrame = false;
                    int prev = -1;
                    long last = 0;
                    int n;
                    while (running && (n = in.read(buf)) > 0) {
                        int start = 0;
                        for (int i = 0; i < n; i++) {
                            int v = buf[i] & 0xFF;
                            if (!inFrame) {
                                if (prev == 0xFF && v == 0xD8) { inFrame = true; frame.reset(); frame.write(0xFF); start = i; }
                            } else if (prev == 0xFF && v == 0xD9) {
                                frame.write(buf, start, i - start + 1);
                                inFrame = false;
                                long now = System.currentTimeMillis();
                                if (now - last >= interval && hasListeners("frame")) {
                                    last = now;
                                    JSObject o = new JSObject();
                                    o.put("data", Base64.encodeToString(frame.toByteArray(), Base64.NO_WRAP));
                                    notifyListeners("frame", o);
                                }
                            }
                            prev = v;
                        }
                        if (inFrame) {
                            frame.write(buf, start, n - start);
                            if (frame.size() > 12 * 1024 * 1024) { inFrame = false; frame.reset(); }
                        }
                    }
                    c.disconnect();
                } catch (Exception e) {
                    JSObject o = new JSObject();
                    o.put("error", String.valueOf(e.getMessage() != null ? e.getMessage() : e));
                    notifyListeners("status", o);
                }
                if (running) { try { Thread.sleep(1000); } catch (InterruptedException ie) { break; } }
            }
        }, "camara-wifi");
        worker.start();
        call.resolve();
    }

    private void stopWorker() {
        running = false;
        HttpURLConnection c = conn;
        if (c != null) { try { c.disconnect(); } catch (Exception e) { /* noop */ } }
        conn = null;
        Thread w = worker;
        if (w != null) w.interrupt();
        worker = null;
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopWorker();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() { stopWorker(); }
}
`);

/* ---------- Servicio: captura la pantalla y envía cuadros JPEG ---------- */
writeFileSync(`${pkgDir}/ScreenCaptureService.java`, `package ${appId};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.SystemClock;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.WindowManager;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

public class ScreenCaptureService extends Service {

    public interface FrameListener { void onFrame(String jpegBase64, int width, int height); }

    public static volatile FrameListener listener;

    private MediaProjection projection;
    private VirtualDisplay display;
    private ImageReader reader;
    private HandlerThread thread;
    private long lastFrame = 0;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) { stopSelf(); return START_NOT_STICKY; }
        startInForeground();
        int code = intent.getIntExtra("resultCode", 0);
        Intent data = Build.VERSION.SDK_INT >= 33
            ? intent.getParcelableExtra("resultData", Intent.class)
            : intent.getParcelableExtra("resultData");
        int maxSide = intent.getIntExtra("maxWidth", 1280);
        int fps = Math.max(1, intent.getIntExtra("fps", 6));
        final int quality = intent.getIntExtra("quality", 75);
        final long interval = 1000L / fps;

        MediaProjectionManager mpm = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        projection = mpm.getMediaProjection(code, data);
        if (projection == null) { stopSelf(); return START_NOT_STICKY; }

        thread = new HandlerThread("captura-pantalla");
        thread.start();
        Handler handler = new Handler(thread.getLooper());
        projection.registerCallback(new MediaProjection.Callback() {
            @Override public void onStop() { release(); stopSelf(); }
        }, handler);

        DisplayMetrics m = new DisplayMetrics();
        ((WindowManager) getSystemService(WINDOW_SERVICE)).getDefaultDisplay().getRealMetrics(m);
        float k = Math.min(1f, (float) maxSide / Math.max(1, Math.max(m.widthPixels, m.heightPixels)));
        final int w = Math.max(2, Math.round(m.widthPixels * k));
        final int h = Math.max(2, Math.round(m.heightPixels * k));

        reader = ImageReader.newInstance(w, h, PixelFormat.RGBA_8888, 2);
        display = projection.createVirtualDisplay("particulas-c175", w, h, m.densityDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, reader.getSurface(), null, handler);

        reader.setOnImageAvailableListener(r -> {
            Image img = null;
            try {
                img = r.acquireLatestImage();
                if (img == null) return;
                FrameListener l = listener;
                long now = SystemClock.uptimeMillis();
                if (l == null || now - lastFrame < interval) return;
                lastFrame = now;
                Image.Plane plane = img.getPlanes()[0];
                ByteBuffer src = plane.getBuffer();
                int rowStride = plane.getRowStride();
                // copia fila por fila: el búfer puede traer relleno al final de cada fila
                ByteBuffer dst = ByteBuffer.allocate(w * h * 4);
                byte[] row = new byte[w * 4];
                for (int y = 0; y < h; y++) {
                    src.position(y * rowStride);
                    src.get(row, 0, row.length);
                    dst.put(row);
                }
                dst.rewind();
                Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
                bmp.copyPixelsFromBuffer(dst);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                bmp.compress(Bitmap.CompressFormat.JPEG, quality, out);
                bmp.recycle();
                l.onFrame(Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP), w, h);
            } catch (Exception e) {
                // cuadro descartado
            } finally {
                if (img != null) img.close();
            }
        }, handler);
        return START_NOT_STICKY;
    }

    private void startInForeground() {
        String channel = "captura";
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(channel, "Captura de pantalla", NotificationManager.IMPORTANCE_LOW));
            b = new Notification.Builder(this, channel);
        } else {
            b = new Notification.Builder(this);
        }
        Notification n = b.setContentTitle("Partículas C175")
            .setContentText("Analizando la pantalla en vivo")
            .setSmallIcon(getApplicationInfo().icon)
            .setOngoing(true)
            .build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(7, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        else startForeground(7, n);
    }

    private void release() {
        try { if (display != null) display.release(); } catch (Exception e) { /* noop */ }
        display = null;
        try { if (reader != null) reader.close(); } catch (Exception e) { /* noop */ }
        reader = null;
        if (thread != null) thread.quitSafely();
        thread = null;
    }

    @Override
    public void onDestroy() {
        try { if (projection != null) projection.stop(); } catch (Exception e) { /* noop */ }
        projection = null;
        release();
        super.onDestroy();
    }
}
`);

console.log('Android listo: permisos, MainActivity, ScreenCapturePlugin y ScreenCaptureService en', pkgDir);
