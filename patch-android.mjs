// Agrega al proyecto Android generado los permisos que la app necesita (cámara).
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'android/app/src/main/AndroidManifest.xml';
let x = readFileSync(f, 'utf8');
const add = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',
].filter((l) => !x.includes(l));
if (add.length) x = x.replace('</manifest>', '    ' + add.join('\n    ') + '\n</manifest>');
writeFileSync(f, x);
console.log('AndroidManifest.xml listo:', add.length, 'líneas agregadas');
