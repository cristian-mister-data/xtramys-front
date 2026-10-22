# Importación de PDF de la FFRM

Por ahora, esta función solo está disponible para la FFRM (Federación de Fútbol de la Región de Murcia).

En **Rivales** o **Fichas de Partido**, pulsa **Importar PDF · FFRM**.

1. Selecciona el directorio, el calendario o ambos (máximo 20 MB y 60 páginas por PDF).
2. Pulsa **Leer PDF y preparar vista previa**.
3. Indica qué equipo del PDF corresponde al equipo seleccionado en Xtramys.
4. Si has añadido calendario, selecciona una liga existente del equipo.
5. Revisa escudos, rivales, fechas y ubicación. Puedes añadir manualmente los escudos que falten.
6. Importa. Si la conexión falla, reintenta: los rivales se identifican por nombre normalizado y las fichas por torneo y jornada.

Los PDF se procesan en el navegador. Se extraen los escudos incrustados y los campos de juego. Los descansos se omiten y las fechas de jornada se guardan a las 00:00 de la zona horaria del dispositivo, con una nota de hora pendiente. No se sobrescriben fichas existentes ni escudos existentes.

Compatible con el directorio de dos columnas y calendario de liga de la FFRM con texto seleccionable. No incluye OCR para documentos escaneados ni interpretación de eliminatorias.

En los ejemplos de 2026-2027 hay 14 equipos en calendario y 13 en directorio; falta Mar de Fondo–Javalí Nuevo y su escudo. Cada equipo disputa 26 partidos (13 en casa y 13 fuera).

## Verificación

`npm run check:federation-pdf` comprueba normalización y selección de partidos.

`npm run check:federation-import-save` comprueba el guardado con respuestas congeladas, los contadores tras una interrupción y los reintentos sin duplicados.

`npm run check:federation-pdf -- "C:/ruta/con/los/pdfs"` comprueba también los ejemplos originales `Directorio de equipos.pdf` y `Calendario.pdf`: nombres, columnas, campos, 30 jornadas y todos los equipos con sus 26 partidos.

La compilación incluye el lector y su worker en archivos locales, sin dependencia de un CDN. El lector se descarga únicamente al abrir la lectura de PDF.
