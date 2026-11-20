# Sincronización del aprendizaje entre sitios (gratis)

Las tablets trabajan sin internet. Cuando tienen señal (por ejemplo, al salir de la WiFi de la
cámara), envían sus ejemplos **confirmados por personas** y reciben los de los demás sitios.
Los ejemplos automáticos nunca se envían.

## Instalar (una sola vez, unos 5 minutos)
1. Abra [script.google.com](https://script.google.com) → su proyecto **AUDITOR IA** (o uno nuevo).
2. Cree un archivo `Sincronizacion.gs` y pegue el contenido de `Code.gs`.
   Si su proyecto ya tiene `doGet` o `doPost`, use un proyecto nuevo solo para esto.
3. ⚙️ Configuración del proyecto → **Propiedades del script** → agregar `CLAVE` con una clave larga
   (por ejemplo 24 letras y números al azar). Solo sus tablets deben conocerla.
4. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario** (la clave protege los datos)
   - Autorice los permisos (crea una hoja de cálculo en su Drive).
5. Copie la URL que termina en `/exec`.
6. En cada tablet: **Ajustes → Sincronizar el aprendizaje**: pegue la URL y la clave, y escriba el
   **Sitio y equipo**. Guardar.

## Uso
- Automático: al abrir la app con internet, al volver la señal y un minuto después de etiquetar.
- Manual: pestaña **Aprendizaje → Sincronizar ahora**.
- Panel: abra la URL `/exec` en el navegador para ver los ejemplos por sitio y clase.
- Los ejemplos de otros sitios aparecen en la galería con el nombre del sitio en amarillo.

## Límites (cuenta gratuita de Google)
- Hoja de cálculo: 10 millones de celdas (≈ 1 millón de ejemplos). Cada ejemplo ocupa 9 celdas.
- Apps Script: 20 000 llamadas por día. Cada sincronización usa 2 o 3.
