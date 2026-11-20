# Partículas C175 · APK para Android

Este repositorio genera automáticamente el APK de la app «Identificador de partículas C175».
La app va completa dentro del APK: no necesita internet ni servidor.

## Cómo obtener el APK
1. Suba estos archivos a un repositorio de GitHub (puede ser **privado**).
2. Pestaña **Actions** → «Construir APK». Se ejecuta solo al subir los archivos (unos 5–8 minutos).
3. Cuando aparezca el visto verde ✔, entre a la ejecución y descargue **Particulas-C175-APK** (abajo, en «Artifacts»).
4. Descomprima el ZIP: adentro está `app-debug.apk`.

## Instalar en el celular o tablet Android
1. Copie `app-debug.apk` al equipo (cable, Drive o WhatsApp).
2. Ábralo. Android pedirá permitir «Instalar apps desconocidas» para esa app (Archivos, Drive…): actívelo.
3. Instale y abra «Partículas C175». La primera vez que use la cámara, acepte el permiso.

## Actualizar la app
Reemplace `www/index.html` por la versión nueva (por ejemplo, la app descargada con sus ejemplos de
aprendizaje desde la pestaña «Aprendizaje») y súbalo: GitHub compila un APK nuevo. Instálelo encima del anterior.

## Actualizar sin desinstalar (desde la versión 2.2.1)
Hasta la 2.2.0 cada APK salía firmado con una llave distinta y Android respondía «No se instaló la app»;
había que desinstalar y se perdía lo aprendido. Desde la 2.2.1 todas las versiones usan la llave fija de
`keystore/` y un número de versión creciente: **se instalan encima y conservan todo**.
- **Una sola vez** (al pasar a la 2.2.1): en «Aprendizaje» pulse **Exportar ejemplos** y guarde el archivo,
  desinstale la versión anterior, instale la 2.2.1 y pulse **Importar ejemplos**.
- Desde ahí: solo instalar encima. **No desinstale nunca**: desinstalar borra lo aprendido en esa tablet.
- La compilación se detiene sola si un APK no sale con la llave fija, para que nunca llegue uno incompatible.

## Novedades 2.2 · conexión directa a la Moticam, versión web y sincronización
- **«En vivo» → «Moticam»**: la app se conecta directo a la cámara del estereoscopio, como MotiConnect, pero con
  la imagen original de la cámara (no la captura de pantalla borrosa).
  1. Conecte la tablet a la WiFi de la cámara (nombre `MoticamX3_…` en la etiqueta, clave de fábrica `12345678`).
  2. Cierre MotiConnect (la cámara atiende mejor a una sola app).
  3. Pulse **Conectar** con la dirección vacía: la busca sola (`192.168.1.151:8080` en Moticam X/X3/X5),
     la pasa a modo JPEG (`/?H264=0`) y abre su video.
  4. **Analizar este cuadro** pide a la cámara la foto completa (hasta 2592×1520 en Moticam X3).
  - Si no conecta, pulse **Informe** y envíe el archivo: trae lo que respondió la cámara para ajustar el conector a su modelo.
  - Si la cámara está conectada a un router, escriba su dirección (por ejemplo `192.168.3.110:8080`).
- **Versión web gratis** (GitHub Pages): la misma app en `https://<su-usuario>.github.io/Auditor-IA-Apk/`, instalable
  en PC y funciona sin internet tras abrirla una vez. Activar una sola vez: repositorio → **Settings → Pages →
  Source: GitHub Actions**. La conexión directa a la cámara solo funciona en la APK (los navegadores lo bloquean).
- **Sincronización del aprendizaje entre sitios** con Google Apps Script (gratis): vea `apps-script/LEEME.md`.

## Novedades 2.1 · aprendizaje que mejora solo (sin internet)
- **Modelo nuevo**: bosque aleatorio (60 árboles) + vecinos más cercanos (k-NN). Entrena en milisegundos en la tablet.
  Es sensible al costo: confundir una abrasiva con blanda pesa el doble, y si el modelo ve ≥ 40 % de probabilidad
  de abrasiva en algo que las reglas llaman blando, la partícula va a **sondear**.
- **Variables nuevas** (criterios de VDA 19 / ISO 16232 y de ferrografía): destello máximo, nitidez del contorno,
  circularidad, convexidad, relleno de caja y **color corregido con la propia membrana** (balance de blancos), para que
  lo aprendido en un sitio sirva con otra cámara u otra luz.
- **Cola de revisión** (aprendizaje activo): la app junta sola las partículas dudosas, las que discrepan y las que no se
  parecen a nada aprendido. En «Aprendizaje» se toca la tarjeta y la clase: cada toque es el ejemplo que más enseña.
- **Autoaprendizaje en video**: con el modelo ya validado, una partícula seguida ≥ 8 cuadros en la que reglas y
  aprendizaje coinciden se guarda como ejemplo «auto» (peso 35 %). Límites: 6 por minuto, nunca más de la mitad de los
  ejemplos humanos por clase, y nunca se usan para validar. Se pueden quitar con un botón.
- **Aviso de equipo nuevo**: si la mitad de lo que ve en video no se parece a lo aprendido, avisa para etiquetar la cola.
- **Sitio y equipo** (Ajustes): cada ejemplo guarda dónde se tomó, para combinar bibliotecas de varios lugares con
  «Exportar» / «Importar ejemplos».
- **Cámara WiFi (experimental)** en «En vivo»: lee directamente la imagen de cámaras WiFi de microscopio que sirven una
  instantánea JPEG por HTTP en su propia red. Si la cámara solo se ve en su app (MotiConnect), siga usando «Pantalla»
  con esa app en pantalla dividida.
- Los ejemplos de la versión 2.0 se conservan y siguen sirviendo (las variables nuevas faltantes se completan solas).

## Notas
- Es un APK de uso interno (firmado en modo depuración con la llave de `keystore/`): sirve para instalar directo, no para Play Store. No borre esa carpeta: si la firma cambia, Android no deja actualizar encima y hay que desinstalar primero.
- Android no permite «compartir pantalla» a ninguna app web; use la cámara trasera o «Analizar foto».
- «Imagen anotada», «CSV» y «Exportar» abren el menú Compartir de Android para guardar o enviar.
