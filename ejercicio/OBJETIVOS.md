# Objetivos Neo4j — Mapeo a Casillas de Timeline

Todos registrados con `neo4j_instance: "conaf"` en instancia IGNUS.

## Metodología registrada

**ID**: `smb-metodologia-simulador-3d-incendios-forestales-conaf-webllm-kitral`

---

## Semana 1-2: Motor de Propagación CA

**ID**: `obj-integrar-kitral-ca-en-web-worker-240x240-grid-simulador-3d-s39s`

**Archivos**: `src/pages/simulador3d/motores/kitral.js`, `ca_propagacion.js`, `kitral_worker.js`

**Comprobado**: 8 tests en `kitral.test.js` pasan. CA genera grid con pendiente, combustible, ignición.

---

## Semana 2-3: IA Local en Navegador

**ID**: `obj-implementar-ia-local-webllm-en-navegador-simulador-3d-ujky`

**Archivos**: `src/pages/simulador3d/motores/ia_local.js`, `componentes/ChatPanel.jsx`

**Comprobado**: template fallback funciona. WebLLM y Transformers.js se cargan dinámicamente.
No comprobé descarga real del modelo (requiere GPU + ~500MB).

---

## Semana 3-4: Parseador de Intenciones

**ID**: `obj-parseador-intenciones-y-control-ca-simulador-3d-e0vo`

**Archivos**: `src/pages/simulador3d/motores/ia_local.js` (parseadorIntenciones), `api_cliente.js`

**Comprobado**: 11 tests en `api_cliente.test.js` pasan. Parseador detecta desplegar/retardante/pausar/etc.

---

## Semana 4-5: Meteorología Open-Meteo vía n8n

**ID**: `obj-ciudades-osm-3d-y-meteorologia-open-meteo-n8n-simulador-3d-vd58`

**Archivos**: `src/pages/simulador3d/motores/meteorologia.js`, `n8n/meteo-loslagos.workflow.ts`

**Comprobado**: ejecución n8n #345 exitosa. Datos reales: temp=12.4°C, HR=97%, viento=10.2 km/h.
Salida en `ejercicio/salidas/n8n-meteo-output.json`.

---

## Semana 5-6: Análisis y Reportes

**ID**: `obj-analisis-reportes-pdf-kmz-csv-exportacion-cliente-simulador-4lcq`

**Archivos**: `src/pages/simulador3d/motores/exportar.js`, `componentes/ControlPanel.jsx`

**Comprobado**: funciones de exportar definidas con contratos correctos. PDF usa jsPDF con fallback.
No comprobé generación real de PDF en navegador.

---

## Semana 6-7: QA y Pruebas

**ID**: `obj-qa-pruebas-unitarias-performance-vitest-simulador-3d-puo2`

**Archivos**: `src/test/rothermel.test.js`, `kitral.test.js`, `api_cliente.test.js`

**Comprobado**: 29/29 tests pasan. Prueba de mutación: viento 15→5 km/h forzó fallo confirmado
antes del fix.

---

## Semana 7-8: Deploy GitHub Pages

**ID**: `obj-deploy-github-pages-actions-workflow-simulador-3d-yfgr`

**Archivos**: `.github/workflows/deploy.yml`

**Comprobado**: YAML válido, rama trigger configurada. Build local exitoso (npm run build).
Deploy real no comprobé (requiere push a origin y que GitHub Actions corra).
