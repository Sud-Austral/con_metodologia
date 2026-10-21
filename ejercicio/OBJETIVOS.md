# OBJETIVOS.md — Mapeo metodología CONAF ↔ Timeline del documento insumo

Metodología usada (instancia Neo4j `conaf`): **13 objetivos genéricos (10 Flujo + 3
Capacidad)**, los mismos que ya traen cargadas las 10 metodologías demo
`CONAF · Demo ...` (verificado con `ver_metodologia` sobre
`smb-metodologia-conaf-demo-viento-para-propagacion-de-incendios-de-la-base-i`,
que devolvió `resumen: {total_objetivos:13, flujo:10, capacidad:3}`).

Se registró una metodología propia para este ejercicio componiendo (no
duplicando) esos 13 objetivos existentes:

- `crear_metodologia` → `smb-metodologia-conaf-simulador-3d-incendios-ia-en-navegador-ejercicio-metod`
  ("CONAF - Simulador 3D Incendios + IA en Navegador (ejercicio metodologia, solo frontend)")

Los 13 objetivos y su id:

| # | Objetivo | Tipo | id |
|---|----------|------|----|
| 0 | Levantar Requerimientos | Flujo | obj-levantar-requerimientos-ax0j |
| 1 | Comprender | Flujo | obj-comprender-z5sl |
| 2 | Arqueologia de Datos | Flujo | obj-arqueologia-de-datos-3g9u |
| 3 | Contrastar Cifras contra la Fuente | Flujo | obj-contrastar-cifras-contra-la-fuente-q49z |
| 4 | Disenar Propuesta de Valor por Perfil | Flujo | obj-disenar-propuesta-de-valor-por-perfil-r05t |
| 5 | Disenar Experiencia de Usuario | Flujo | obj-disenar-experiencia-de-usuario-kbr2 |
| 6 | Construir los Componentes de Interfaz Verificados | Flujo | obj-construir-los-componentes-de-interfaz-verificados-51t9 |
| 7 | Construir la Pagina Verificada | Flujo | obj-construir-la-pagina-verificada-6kqh |
| 8 | Verificar | Flujo | obj-verificar-v2-z60x |
| 9 | Promover a Produccion | Flujo | obj-promover-a-produccion-x49j |
| 100 | Documentar | Capacidad | obj-documentar-z5hh |
| 101 | Auditar | Capacidad | obj-auditar-z5ep |
| 102 | Testing | Capacidad | obj-testing-z595 |

## Cómo cada casilla del timeline (Sección 10, semanas 1–8) se cubre con qué objetivo

### Semana 1–2: CIMENTACIÓN
| Casilla | Objetivo(s) aplicado(s) | Cómo |
|---|---|---|
| Integrar KITRAL CA en Web Worker | 6 Construir Componentes Verificados, 8 Verificar | `app/src/motores/kitral_worker.js` + `app/src/escena3D.js` (tick vía `postMessage`); medido ms/tick real en `tools/test_motores.mjs` y en navegador (`tools/verificar_app.mjs`) |
| Cargar DEM real Terrarium (HTTP) | 2 Arqueología de Datos, 3 Contrastar Cifras, 8 Verificar | `app/src/motores/descarga_dem.js::cargarDEM`; probado en Node (fallback) y en navegador real (`tools/verificar_terrarium.mjs`, Terrarium falló por CORS — ver EQUIVOCACIONES.md) |
| Clasificación automática vegetación (percentiles) | 1 Comprender, 6 Construir Componentes | `app/src/motores/kitral.js::clasificarCombustible`, probado en `tools/test_motores.mjs` |
| Endpoint `/api/v1/chat/consultar` básico | 4 Diseñar Propuesta de Valor, 6 Construir Componentes | `app/src/endpoints.js::chatConsultar` (función de cliente, mismo contrato) |
| Bocanadas de llama versión mejorada | 5 Diseñar UX, 6 Construir Componentes | Parcial: `Fuego` simplificado a `THREE.Points` en `escena3D.js` (no el shader GLSL completo de la Sección 6.3) |

### Semana 2–3: IA LOCAL (reemplazada por IA en navegador, ver restricción de arquitectura)
| Casilla | Objetivo(s) | Cómo |
|---|---|---|
| Instalar Ollama + Mistral-7B | 4 Diseñar Propuesta de Valor | **No aplica**: reemplazado por WebLLM (restricción de arquitectura del encargo) |
| Integración automática (detectar si está corriendo) | 6 Construir Componentes, 8 Verificar | `app/src/ia/clienteLLM.js::detectarWebGPU` + fallback automático, verificado real en Chrome headless |
| ChatPanel.jsx con historial | 5 Diseñar UX, 6 Construir Componentes, 8 Verificar | `app/src/ui/chatPanel.js`, capturas reales en `ejercicio/salidas/captura_0{1,2,3}*.png` |
| Ensamblar contexto dinámico | 3 Contrastar Cifras, 6 Construir Componentes | `app/src/ia/contexto.js::ensamblarContextoSistema` |
| Almacenar mensajes en BD | 6 Construir Componentes, 8 Verificar | `app/src/persistencia/db.js` (IndexedDB); recuperación tras recargar verificada real (`persistencia.recupera: true` en `verificacion_app_real.json`) |

### Semana 3–4: CONTROL
| Casilla | Objetivo(s) | Cómo |
|---|---|---|
| Parseador de intenciones | 6 Construir Componentes, 102 Testing | `app/src/ia/parseadorIntenciones.js`, 27/27 pruebas en `tools/test_motores.mjs` |
| POST despacho/desplegar | 6, 7 Construir Página Verificada | `app/src/endpoints.js::despachoDesplegar`, probado con caso válido e inválido |
| POST simulacion/aplicar-retardante | 6, 7 | `app/src/endpoints.js::simulacionAplicarRetardante`, con efecto real sobre `ajusteROS` del tick |
| POST simulacion/control | 6, 7 | `app/src/endpoints.js::simulacionControl` (pausar/reanudar/inválido probado) |
| Visualizar efectos en tiempo real | 8 Verificar | Parcial: pausa y retardante sí afectan el tick real; despliegue de recursos no se dibuja en la escena 3D (ver no_hecho) |

### Semana 4–5: CIUDADES + METEOROLOGÍA
| Casilla | Objetivo(s) | Cómo |
|---|---|---|
| Cargar OSM (Overpass API) | — | **No hecho** (fuera de presupuesto de este ejercicio) |
| Edificios 3D + calles + servicios | — | **No hecho** |
| Fetch Open-Meteo | 2 Arqueología de Datos, 3 Contrastar Cifras | `app/src/motores/meteorologia.js::cargarMeteo`, fetch real verificado (`ejercicio/salidas/open_meteo_real.json`) |
| Integración FWI dinámica | 3 Contrastar Cifras | Parcial: `procesarFWI` calculado y probado, pero NO conectado al loop de simulación (aceleración 60× no implementada) |
| Pestaña ANÁLISIS (gráficos) | 5, 6, 8 | `app/src/ui/controlPanel.js::renderAnalisis`, captura real `captura_04_pestana_analisis.png` |

### Semana 5–6: ANÁLISIS + EXPORTACIÓN
| Casilla | Objetivo(s) | Cómo |
|---|---|---|
| Pestaña REPORTES | 5, 6, 8 | `controlPanel.js::renderReportes`, captura real `captura_05_pestana_reportes.png` |
| Exportar conversación a markdown | 3, 6, 8 | `app/src/exportar/exportar.js::exportarMarkdown`, contenido real verificado |
| Generar PDF | 6, 8 | `exportar.js::exportarPDF` (jsPDF vía CDN, sin html2canvas), `.pdf` real generado y validado (cabecera `%PDF-1.3`) |
| Exportar KMZ | 6, 8 | `exportar.js::exportarKMZ` (JSZip vía CDN), `.kmz` real generado y validado como zip con `doc.kml` |
| Exportar CSV | 6, 8 | `exportar.js::exportarCSV`, contenido real verificado |

### Semana 6–7: QA + OPTIMIZACIONES
| Casilla | Objetivo(s) | Cómo |
|---|---|---|
| Pruebas unitarias (Jest) | 102 Testing | Parcial: arnés propio en Node (`tools/test_motores.mjs`, sin dependencia npm), NO literalmente Jest — decisión documentada en supuestos |
| Pruebas integración chat+simulación | 102 Testing, 8 Verificar | `tools/verificar_app.mjs`, `tools/verificar_casos_uso.mjs` (Chrome headless real) |
| Performance profiling | 3 Contrastar Cifras, 101 Auditar | Parcial: FPS/ms-tick medidos reales; memoria no medida |
| Troubleshooting (fallbacks) | 101 Auditar, 8 Verificar | WebGPU fallback y DEM fallback verificados reales; Terrarium real falló por CORS (ver EQUIVOCACIONES.md) |
| Documentación | 100 Documentar | Este archivo + VERIFICACION.md + HERRAMIENTAS.md + comentarios en código |

### Semana 7–8: DEPLOY
| Casilla | Objetivo(s) | Cómo |
|---|---|---|
| Validación con datos reales | — | **No hecho** (no se dispone de datos de un incendio real para contrastar) |
| Entrenamiento usuario (video) | — | **No hecho** |
| Deploy a uat | 9 Promover a Producción | **No hecho** (no aplica: arquitectura solo-frontend sin docker-compose; además no se hace push por instrucción explícita) |
| Deploy a production | 9 Promover a Producción | **No hecho** (instrucción explícita: no push, no merge a main) |
| Monitoreo (Loki/Prometheus) | — | **No hecho** (no aplica a arquitectura sin servidores propios) |

## Objetivo 3 (Contrastar Cifras contra la Fuente) — aplicado ANTES de construir vistas

Siguiendo la metodología, antes de diseñar el `ControlPanel`/pestaña ANÁLISIS se
ejecutaron y guardaron los comandos que reproducen cada cifra:

- ms/tick grid 240×240 → `node tools/test_motores.mjs` → `ejercicio/salidas/test_motores_exitosa.txt`
- FPS y ms/tick en navegador real → `node tools/verificar_app.mjs` → `ejercicio/salidas/verificacion_app_real.json`
- Meteorología real (Open-Meteo) → comando `node -e "fetch(...)"` → `ejercicio/salidas/open_meteo_real.json`
- Export PDF/KMZ reales → `node tools/verificar_pdf_kmz.mjs` → `ejercicio/salidas/verificacion_pdf_kmz.json`

Ningún número en `ejercicio/metadatos.json` bajo `mediciones` se escribió sin
haber corrido primero el comando correspondiente (ver columna
`comandos_reproducir`).
