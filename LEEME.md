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

## Notas
- Es un APK de uso interno (firmado en modo depuración con la llave de `keystore/`): sirve para instalar directo, no para Play Store. No borre esa carpeta: si la firma cambia, Android no deja actualizar encima y hay que desinstalar primero.
- Android no permite «compartir pantalla» a ninguna app web; use la cámara trasera o «Analizar foto».
- «Imagen anotada», «CSV» y «Exportar» abren el menú Compartir de Android para guardar o enviar.
