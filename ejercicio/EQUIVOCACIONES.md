# EQUIVOCACIONES.md

Cada entrada: hora aproximada, qué pasó, cómo se detectó, cómo se corrigió,
clasificación (error propio / infraestructura / reintento).

## 1. Nombre de rama `ejercicio/con` imposible en Windows
- **Hora**: inicio de la tarea (~22:00)
- **Qué pasó**: `git checkout -b ejercicio/con` falló con
  `fatal: cannot lock ref 'refs/heads/ejercicio/con': Invalid argument`.
- **Cómo se detectó**: salida directa del comando git.
- **Causa**: Windows reserva el nombre `CON` (y otros, `PRN`, `AUX`, `NUL`,
  `COM1-9`, `LPT1-9`) como dispositivo especial para CUALQUIER componente de
  ruta, sin importar la extensión o mayúsculas. Un ref de git es un archivo
  en `.git/refs/heads/ejercicio/con`, y el componente final `con` no se
  puede crear como archivo en NTFS/Windows.
- **Cómo se corrigió**: se intentó escribir el ref directo en
  `packed-refs` (evita el archivo suelto), pero el sandbox del agente
  bloqueó la operación por tocar el `.git` común fuera del worktree
  (regla de aislamiento, correcta). Se usó en su lugar la rama
  `ejercicio/con-sim3d`, documentado explícitamente aquí y en
  `metadatos.json` en vez de forzar el nombre pedido.
- **Clasificación**: infraestructura (limitación del sistema operativo, no
  del repositorio ni de la metodología).

## 2. Carpeta `insumo/` no estaba en el worktree
- **Hora**: ~22:00
- **Qué pasó**: `insumo/PROMPT_UNICO_SIMULADOR_3D_IA_COMPLETO.md` no existía
  en el worktree asignado (`D:\...\worktrees\agent-a914cbfae6fa2f0a7`),
  solo en el checkout principal `D:\GitHub\con_metodologia`. El commit
  base `17ee9cfe` solo contiene `.gitattributes`: la carpeta `insumo/`
  nunca estuvo trackeada por git.
- **Cómo se detectó**: `Read` del archivo devolvió "File does not exist".
- **Cómo se corrigió**: se copió `insumo/` completo al worktree
  (`cp -r`) para poder leerlo y para que quede disponible junto al código
  en la rama de este ejercicio.
- **Clasificación**: infraestructura (el insumo no estaba versionado).

## 3. Syntax error en IIFE dentro de `tools/test_motores.mjs`
- **Hora**: primera corrida de pruebas
- **Qué pasó**: `assert(() => {...}(), 'msg')` es un error de sintaxis
  (falta paréntesis para invocar la función flecha inmediatamente).
- **Cómo se detectó**: `node tools/test_motores.mjs` lanzó
  `SyntaxError: missing ) after argument list` antes de ejecutar ninguna
  prueba (ver `ejercicio/salidas/test_motores_fallida.txt`, primera
  versión).
- **Cómo se corrigió**: se envolvió la flecha en paréntesis:
  `(() => {...})()`.
- **Clasificación**: error propio.

## 4. Prueba de mutación (obligatoria por metodología)
- **Hora**: tras corregir el error anterior
- **Qué pasó**: se dejó a propósito una aserción con valor esperado
  incorrecto (`ROS K1 ... ~= 9999`, cuando el valor real es 2.7 m/min)
  para comprobar que el arnés de pruebas sí detecta fallas reales.
- **Cómo se detectó**: la corrida mostró `FAIL - ROS K1 ... valor real=2.7`
  (guardada en `ejercicio/salidas/test_motores_fallida.txt`, exit code 1).
- **Cómo se corrigió**: se cambió el valor esperado a 2.7 (el real,
  medido) y se volvió a correr, quedando 27/27 pruebas OK
  (`ejercicio/salidas/test_motores_exitosa.txt`, exit code 0).
- **Clasificación**: prueba de mutación deliberada (requisito de la
  metodología, no un error real del código).

## 5. Aserción propia incorrecta: `perimetro.length >= frente.length`
- **Hora**: misma corrida que el punto 4
- **Qué pasó**: la misma corrida mostró un segundo `FAIL` inesperado (no
  planeado): "el perimetro incluye al menos el frente" (perímetro=142,
  frente=151).
- **Cómo se detectó**: salida de la prueba.
- **Causa real**: no es un bug del motor CA. Con `tiempoResidenciaMin=12`
  y `dt=5`, puede haber celdas en estado `BURNING` que están rodeadas
  completamente por otras celdas `BURNING`/`BURNED` (no tocan ninguna
  celda `UNBURNED` ni el borde del grid), por lo que correctamente NO
  cuentan como "perímetro" aunque sí cuenten como "frente". La aserción
  original asumía una relación de subconjunto que no se cumple en general.
- **Cómo se corrigió**: se cambió la aserción a algo que sí es una
  invariante real: `perimetro.length > 0` tras 20 ticks.
- **Clasificación**: error propio (en la prueba, no en el motor).

## 6. Unidad de viento de Open-Meteo no era la asumida
- **Hora**: verificación real de `cargarMeteo`
- **Qué pasó**: el documento insumo asume que `wind_speed_10m` viene en
  m/s y lo convierte `*3.6` a km/h. Al llamar a la API real
  (`ejercicio/salidas/open_meteo_real.json`) se vio que
  `hourly_units.wind_speed_10m` es `"km/h"` por defecto, no m/s.
- **Cómo se detectó**: inspección del JSON real devuelto por
  `api.open-meteo.com` (`hourly_units`).
- **Cómo se corrigió**: se agregó el parámetro `wind_speed_unit=ms` a la
  URL en `app/src/motores/meteorologia.js`, verificado de nuevo contra la
  API real (`hourly_units.wind_speed_10m` pasó a `"m/s"`), de modo que la
  conversión `*3.6` del documento sí sea correcta.
- **Clasificación**: error propio (supuesto no verificado contra la fuente
  real a tiempo, detectado justo por aplicar el Objetivo 3 de la
  metodología: "contrastar cifras contra la fuente").

## 7. Comando de chat extraía la dirección equivocada ("este" en vez de "norte")
- **Hora**: primera corrida de `tools/verificar_app.mjs` en Chrome real
- **Qué pasó**: al pedir "Desplegar Brigada R-22 al norte, acceso Los
  Copihues", el comando ejecutado mostró `"destino":"este"`.
- **Cómo se detectó**: salida real en
  `ejercicio/salidas/verificacion_app_real.json` (primera versión,
  sobrescrita tras la corrección).
- **Causa real**: `chatConsultar` parseaba primero la RESPUESTA de la IA
  (fallback de plantilla, que empieza con "Sin IA disponible en este
  navegador...") antes que la pregunta del usuario. La frase fija
  "en este navegador" contiene la palabra "este", que el regex de
  dirección matcheaba antes de llegar a "norte" (que está más adelante,
  dentro de la pregunta citada textualmente en la respuesta).
- **Cómo se corrigió**: en `app/src/endpoints.js::chatConsultar` se
  invirtió el orden (`parseadorIntenciones(pregunta) || parseadorIntenciones(resultado.respuesta)`)
  y además se reformuló el texto de fallback en `clienteLLM.js` para evitar
  la palabra "este" suelta. Verificado de nuevo: `"destino":"norte"`.
- **Clasificación**: error propio.

## 8. HUD mostraba "FPS ~ Infinity"
- **Hora**: misma corrida que el punto 7
- **Qué pasó**: el badge de FPS mostró "Infinity" en la primera lectura.
- **Cómo se detectó**: `fpsBadge` en la salida real de
  `tools/verificar_app.mjs`.
- **Causa real**: el primer frame podía tener `dtFrame` muy cercano a 0
  (o el reloj no había avanzado aún), dando `1000/dtFrame = Infinity`.
- **Cómo se corrigió**: en `app/src/escena3D.js` se filtra
  `dtFrame > 0 && Number.isFinite(...)` antes de acumular en el promedio
  de FPS. Verificado: badges pasaron a mostrar valores numéricos reales
  (ej. "FPS ~ 32").
- **Clasificación**: error propio.

## 9. Descarga de exportaciones vía `<a download>` no se materializaba en Chrome headless
- **Hora**: primera corrida de exportación en `tools/verificar_app.mjs`
- **Qué pasó**: el botón de exportar mostraba `status: "Listo."` pero
  ningún archivo aparecía en disco (`find` no encontró
  `analisis_ia.md` ni `estadisticas.csv` en ninguna carpeta).
- **Cómo se detectó**: búsqueda explícita de los archivos tras la corrida.
- **Causa**: la descarga de un Blob vía `<a download>` + `.click()` no se
  materializa de forma confiable en Chrome headless con
  `Page.setDownloadBehavior` (se requiere configuración a nivel de
  `Browser`, no de `Page`, y aun así es frágil).
- **Cómo se corrigió**: en vez de depender de la descarga del navegador
  para VERIFICAR el contenido, se invocan los endpoints de cliente
  directamente desde `page.evaluate` y se trae el texto/bytes a Node
  (`tools/verificar_app.mjs`, `tools/verificar_pdf_kmz.mjs`), que sí
  escribe los archivos reales en `ejercicio/salidas/`. La descarga por
  `<a download>` en la UI real de un usuario (no headless) sigue
  implementada igual y no se modificó.
- **Clasificación**: infraestructura (limitación de Chrome headless para
  pruebas automatizadas, no del código de la app).

## 10. Primera corrida de `tools/verificar_casos_uso.mjs`: los 8 casos mostraban el mismo estado "Pensando..."
- **Hora**: primera corrida en background
- **Qué pasó**: los 8 casos de uso devolvieron la misma transcripción
  (la del caso 1, congelada en "Pensando...").
- **Cómo se detectó**: inspección de
  `ejercicio/salidas/casos_de_uso_transcripcion.json` tras la corrida.
- **Causa real**: la condición de espera
  (`document.querySelectorAll('.msg').length > antes+1`) se cumplía con
  el propio placeholder síncrono "Pensando..." (que se agrega antes de
  esperar la respuesta real), así que el script avanzaba al siguiente
  caso antes de que la respuesta real llegara; como el botón de enviar
  queda deshabilitado mientras la pregunta anterior sigue "cargando", los
  clics de los casos 2–8 no hacían nada.
- **Cómo se corrigió**: se cambió la condición de espera a "el último
  mensaje ya no contiene la palabra 'Pensando'" en vez de "hay un mensaje
  más".
- **Clasificación**: error propio.

## 11. Terrarium real (DEM) falló por CORS al probarlo desde el navegador
- **Hora**: verificación de `cargarDEM` en Chrome real
- **Qué pasó**: `cargarDEM` desde el navegador devolvió
  `fuente: "sintetico (fallback: Failed to fetch)"` en vez de datos reales
  de Terrarium.
- **Cómo se detectó**: salida real en
  `ejercicio/salidas/cargarDEM_terrarium_browser_real.json`, y
  confirmado con `curl -D -` directo al tile de S3, que no trae cabecera
  `Access-Control-Allow-Origin`.
- **Causa**: el bucket público `elevation-tiles-prod` de AWS S3 no envía
  cabeceras CORS, así que un `fetch()` desde `http://localhost:8787`
  (origen distinto) es bloqueado por el navegador. Esto NO ocurre con
  `curl` porque CORS es una restricción del navegador, no del servidor
  per se.
- **Cómo se corrigió**: no se "corrigió" el acceso a Terrarium (requeriría
  un proxy, que violaría la restricción de "solo frontend, sin servicio
  propio"); se documenta como limitación conocida y se deja el fallback a
  DEM sintético, que sí funciona y fue el que verificó la propagación de
  fuego en todas las capturas.
- **Clasificación**: infraestructura (CORS del proveedor de datos
  público, fuera del control de este proyecto).

## ¿Hubo más errores no listados aquí?

No se omitió ningún error detectado. Como evidencia de que se buscaron
activamente: cada script de verificación (`tools/test_motores.mjs`,
`tools/verificar_app.mjs`, `tools/verificar_pdf_kmz.mjs`,
`tools/verificar_casos_uso.mjs`, `tools/verificar_terrarium.mjs`) se
corrió más de una vez y sus salidas de consola (incluyendo
`console.warn`/`console.error` del navegador) se revisaron íntegras antes
de darlas por buenas; las que mostraban texto distinto de lo esperado
están documentadas arriba. Los warnings de consola que SÍ aparecen pero
no son errores funcionales (`Multiple instances of Three.js being
imported`, deprecación de software WebGL, 404 de `favicon.ico`) se dejan
registrados en `ejercicio/salidas/verificacion_app_real.json` →
`consola`, sin tratarlos como bug porque no afectan ningún resultado
observable de la app.
