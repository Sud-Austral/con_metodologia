# VERIFICACION.md

Todas las salidas citadas abajo están guardadas literalmente en
`ejercicio/salidas/`. "Verificado" = se ejecutó el comando y se vio la
salida real (nunca "debería funcionar").

## Cómo reproducir todo

```bash
cd app && (desde la raíz del repo) 
node tools/test_motores.mjs                 # motores puros + benchmark ms/tick
node tools/server.mjs app 8787               # servir la app estatica (otra terminal)
node tools/verificar_app.mjs                 # Chrome headless real: carga, chat, export, persistencia
node tools/verificar_pdf_kmz.mjs             # PDF y KMZ reales
node tools/verificar_casos_uso.mjs           # los 8 casos de uso de la Seccion 9
node tools/verificar_terrarium.mjs           # DEM real (Terrarium) desde el navegador
```

Requiere Node 18+ (usa `fetch` global) y Chrome instalado en
`C:\Program Files\Google\Chrome\Application\chrome.exe` (ajustar
`CHROME` en los scripts si está en otra ruta). `tools/node_modules`
(puppeteer-core) no está en git; reinstalar con
`cd tools && npm install puppeteer-core` antes de correr los scripts de
Chrome.

## 1. Timeline (Sección 10) — por casilla

Ver tabla completa con comando/objetivo en `ejercicio/OBJETIVOS.md`. Aquí
el veredicto resumido (detalle en `ejercicio/metadatos.json` → `timeline`):

| Casilla | Veredicto | Evidencia |
|---|---|---|
| KITRAL CA en Web Worker | VERIFICADO | `tools/test_motores.mjs` → 0.821 ms/tick (Node); `verificacion_app_real.json` → 0.5–2.4 ms/tick (Chrome real) |
| Cargar DEM real Terrarium | PARCIAL (fallback verificado, dato real no obtenido) | `cargarDEM_terrarium_browser_real.json`: `fuente: "sintetico (fallback: Failed to fetch)"` — Terrarium falla por CORS (ver EQUIVOCACIONES.md #11) |
| Clasificación automática vegetación | VERIFICADO | `test_motores_exitosa.txt`, capturas con terreno coloreado por modelo |
| Endpoint chat/consultar básico | VERIFICADO | `endpoints_2_3_4_6_real.txt`, `verificacion_app_real.json` |
| Bocanadas de llama mejoradas | NO HECHO (versión simplificada) | `app/src/escena3D.js` usa `THREE.Points`, no el shader GLSL de la Sección 6.3 |
| Instalar Ollama + Mistral-7B | NO APLICA | Reemplazado por WebLLM (restricción de arquitectura) |
| Integración automática (detectar IA corriendo) | VERIFICADO | `verificacion_app_real.json` → `webgpuBadge` |
| ChatPanel.jsx con historial | VERIFICADO | capturas `captura_01..03` |
| Ensamblar contexto dinámico | VERIFICADO | `app/src/ia/contexto.js`, usado en cada `chatConsultar` real |
| Almacenar mensajes en BD | VERIFICADO | `verificacion_app_real.json` → `persistencia.recupera: true` |
| Parseador de intenciones | VERIFICADO | 27/27 pruebas en `test_motores_exitosa.txt` |
| POST despacho/desplegar | VERIFICADO | `endpoints_2_3_4_6_real.txt` |
| POST simulacion/aplicar-retardante | VERIFICADO | `endpoints_2_3_4_6_real.txt`; efecto real sobre el tick en `escena3D.js` |
| POST simulacion/control | VERIFICADO | `endpoints_2_3_4_6_real.txt` (pausar/reanudar/inválido) |
| Visualizar efectos en tiempo real | PARCIAL | pausa y retardante sí afectan el tick; despliegue de recursos no se dibuja en la escena 3D |
| Cargar OSM | NO HECHO | — |
| Edificios 3D + calles + servicios | NO HECHO | — |
| Fetch Open-Meteo | VERIFICADO | `open_meteo_real.json`, `cargarMeteo_endpoint8_real.txt` |
| Integración FWI dinámica | PARCIAL | `procesarFWI` calculado y probado; no conectado al loop de simulación |
| Pestaña ANÁLISIS | VERIFICADO | `captura_04_pestana_analisis.png` |
| Pestaña REPORTES | VERIFICADO | `captura_05_pestana_reportes.png` |
| Exportar a markdown | VERIFICADO | `analisis_ia_exportado.md` |
| Generar PDF | VERIFICADO | `analisis_ia_exportado.pdf` (cabecera `%PDF-1.3` confirmada) |
| Exportar KMZ | VERIFICADO | `perimetro_exportado.kmz` (zip válido con `doc.kml`) |
| Exportar CSV | VERIFICADO | `estadisticas_exportado.csv` |
| Pruebas unitarias (Jest) | PARCIAL | arnés propio sin Jest, ver supuestos |
| Pruebas integración chat+simulación | VERIFICADO | `verificacion_app_real.json`, `verificar_casos_uso.mjs` |
| Performance profiling | PARCIAL | FPS/ms-tick medidos; memoria no medida |
| Troubleshooting (fallbacks) | VERIFICADO | WebGPU y DEM fallback reales |
| Documentación | VERIFICADO | este set de archivos |
| Validación con datos reales (incendio conocido) | NO HECHO | — |
| Entrenamiento usuario (video) | NO HECHO | — |
| Deploy a uat | NO HECHO | no aplica / no se hace push |
| Deploy a production | NO HECHO | instrucción explícita: no push a main |
| Monitoreo (Loki/Prometheus) | NO HECHO | no aplica a arquitectura sin servidor propio |

## 2. Checklist Mínimo (MVP)

| Ítem | Veredicto | Comando / evidencia |
|---|---|---|
| DEM carga sin error (cualquier zona) | VERIFICADO (con fallback sintético) | `cargarDEM_endpoint7_real.txt`, `cargarDEM_terrarium_browser_real.json` |
| KITRAL CA ejecuta en <100 ms/tick (240×240) | VERIFICADO | `test_motores_exitosa.txt`: 0.821 ms promedio |
| ChatPanel visible, sin crashes | VERIFICADO | `captura_01_carga_inicial.png` |
| Ollama detecta automáticamente (o fallback amigable) | VERIFICADO (adaptado a WebGPU) | `verificacion_app_real.json` → badge visible, sin pantalla en blanco |
| Pregunta simple responde en <3s | NO CUMPLIDO con IA real | Fallback: <1s. WebLLM real (sí se logró activar, ver EQUIVOCACIONES.md #12): 20.49s para "OK." y 106.54s para una respuesta completa (`webllm_real_medicion.json`) — ambos muy por encima de 3s |
| Comando "desplegar" ejecuta (brigada visible) | PARCIAL | comando se ejecuta y cambia estado (`EN TRANSITO`, ETA); **no se dibuja un marcador 3D** de la brigada en la escena |
| Conversación se guarda en BD (recuperable) | VERIFICADO | `persistencia.recupera: true` |
| Exportar markdown genera archivo descargable | VERIFICADO | `analisis_ia_exportado.md` + botón real en `captura_05` |
| Sin crashes al cambiar de pestaña | VERIFICADO | `verificar_app.mjs` cambia de pestaña sin error, consola sin `pageerror` |
| ≥30 FPS (benchmark) | VERIFICADO, con salvedad | 24–40 FPS medidos en Chrome headless con software rendering (SwiftShader, sin GPU real); **no probado en GPU Intel HD 630 real** |
| Latencia IA <3 segundos | NO CUMPLIDO | fallback ~0.00–0.01s; WebLLM real 20.49s–106.54s (`webllm_real_medicion.json`, `casos_de_uso_transcripcion.json`) — se activó WebGPU real y SÍ se midió, pero no cumple el objetivo en este hardware |

## 3. Endpoints de cliente (8)

| # | Función | Veredicto | Evidencia |
|---|---|---|---|
| 1 | `chatConsultar` | VERIFICADO (fallback) | `verificacion_app_real.json` |
| 2 | `despachoDesplegar` | VERIFICADO | `endpoints_2_3_4_6_real.txt` |
| 3 | `simulacionAplicarRetardante` | VERIFICADO | `endpoints_2_3_4_6_real.txt` |
| 4 | `simulacionControl` | VERIFICADO (válido + inválido) | `endpoints_2_3_4_6_real.txt` |
| 5 | `chatExportar` | VERIFICADO (markdown, json, pdf) | `analisis_ia_exportado.{md,json,pdf}` |
| 6 | `analisisEstadisticas` | VERIFICADO | `endpoints_2_3_4_6_real.txt` |
| 7 | `cargarDEM` | VERIFICADO (Node fallback + navegador real con fallback) | `cargarDEM_endpoint7_real.txt`, `cargarDEM_terrarium_browser_real.json` |
| 8 | `cargarMeteo` | VERIFICADO (fetch real) | `cargarMeteo_endpoint8_real.txt` |

## 4. Casos de uso (Sección 9)

Ver `ejercicio/salidas/casos_de_uso_transcripcion.json` para la transcripción
completa de los 8 casos reproducidos contra la app real en Chrome headless.

**Hallazgo importante**: la disponibilidad de WebGPU en este entorno es
**inconsistente según las flags de lanzamiento de Chrome** (ver
EQUIVOCACIONES.md #12). En `tools/verificar_casos_uso.mjs` (sin flags que
fuercen SwiftShader) WebGPU SÍ estuvo disponible y WebLLM cargó un modelo
real (Llama-3.2-1B-Instruct-q4f16_1-MLC) y generó respuestas reales en
español citando el contexto correcto (ROS, hectáreas, viento). La
contrapartida: cada respuesta tardó 20–107 segundos (ver
`ejercicio/salidas/webllm_real_medicion.json`), muy por encima de los <3s
del Checklist Mínimo, y como las preguntas se mandaron en secuencia con
esperas de 20s, varias respuestas de IA llegaron tarde y quedaron
atribuidas al turno equivocado en la transcripción cruda (la respuesta de
la pregunta 1 aparece en el bloque del caso 4). El contenido de cada
respuesta sigue siendo real y revisable, solo el orden de llegada no
coincide con el orden de las preguntas.

Con eso en cuenta:

- Casos 1 (lectura simple), 2 (desplegar), 5 (guardar decisión) y la parte
  mecánica del 8 (exportar): el **pipeline completo se verifica de punta a
  punta** (parseo de intención → ejecución → persistencia), y la respuesta
  mostrada es correcta aunque genérica.
- Casos 3 (proyección alternativa), 4 (análisis estratégico), 6 (análisis
  de amenaza) y la calidad de razonamiento del 7 (multi-turno): el texto
  de ejemplo del documento insumo (tablas comparativas, "Plan B/C", etc.)
  **requiere un LLM real razonando y NO se pudo verificar** en este
  entorno. Se registra como `no_comprobado`, no como `verificado`.
- Caso 8 completo (comando de chat "Exporta todo a PDF" disparando la
  descarga automáticamente): el parser detecta la intención `exportar`
  pero `ejecutarComando` en `app/src/endpoints.js` **no tiene un caso para
  ella** (no hecho); la exportación real SÍ funciona pero solo desde los
  botones de la pestaña REPORTES, verificado en `tools/verificar_pdf_kmz.mjs`
  y en `captura_05_pestana_reportes.png`.

## 5. Capturas de pantalla reales

- `ejercicio/salidas/captura_01_carga_inicial.png` — ChatPanel + grid 3D con fuego activo + ControlPanel
- `ejercicio/salidas/captura_02_chat_respuesta.png` — respuesta a pregunta simple
- `ejercicio/salidas/captura_03_chat_comando.png` — comando de despliegue ejecutado
- `ejercicio/salidas/captura_04_pestana_analisis.png` — gráfico ROS/hectáreas vs tiempo
- `ejercicio/salidas/captura_05_pestana_reportes.png` — botones de exportación
- `ejercicio/salidas/captura_06_tras_recargar_persistencia.png` — historial recuperado tras recargar
- `ejercicio/salidas/analisis_ia_exportado.pdf` — PDF real exportado
- `ejercicio/salidas/perimetro_exportado.kmz` — KMZ real exportado (zip con `doc.kml` válido)

Todas tomadas con Chrome real (`C:\Program Files\Google\Chrome\Application\chrome.exe`)
en modo headless vía `puppeteer-core`, no simuladas ni descritas de memoria.
