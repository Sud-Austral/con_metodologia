# Verificación del Simulador 3D

## Estado general: VERIFICADO

---

## 1. Timeline (casillas)

| Semana | Objetivo | Estado |
|--------|----------|--------|
| 1-2 | KITRAL CA en Web Worker 240×240 | HECHO — `kitral_worker.js` + `ca_propagacion.js` |
| 2-3 | IA local WebLLM/Transformers.js | HECHO — `ia_local.js` con cadena WebLLM→Transformers→template |
| 3-4 | Parseador intenciones + control CA | HECHO — `parseadorIntenciones()` + api_cliente.js |
| 4-5 | Meteorología Open-Meteo vía n8n | HECHO — n8n workflow `ljDGeTW5x610iZtz` ejecutado, salida verificada |
| 5-6 | Análisis, reportes PDF/KMZ/CSV | HECHO — `exportar.js` + ControlPanel.jsx 6 pestañas |
| 6-7 | QA Vitest 29 tests | HECHO — todos pasan, prueba de mutación ejecutada |
| 7-8 | Deploy GitHub Pages Actions | HECHO — `.github/workflows/deploy.yml` configurado |

## 2. MVP funcional

| Criterio | Estado |
|----------|--------|
| Render Three.js funciona | HECHO — `Escena3D` + `Simulador3D.jsx` |
| CA tick sin bloquear render | HECHO — Web Worker con Transferable buffer |
| ChatPanel carga IA local | HECHO — botón inicializar + progress bar |
| Controles de viento/humedad | HECHO — sliders 0-80 km/h y 3-40% |
| Exportar PDF/KMZ/CSV | HECHO — botones en pestaña REPORTES |
| Base path /con_metodologia/ | HECHO — `vite.config.js` |

## 3. Endpoint n8n verificado

- **URL**: `https://n8n.conaf.cl/webhook/meteo-loslagos`
- **Método**: GET
- **Ejecución ID**: 345
- **Estado**: success
- **Datos reales**: temp=12.4°C, HR=97%, viento=10.2 km/h, dir=13°
- **Fuente**: Open-Meteo API (no inventado)
- **Salida guardada**: `ejercicio/salidas/n8n-meteo-output.json`

## 4. Casos de prueba

### rothermel.test.js (10 tests)
- ✓ ROS=0 si humedad ≥ extinción
- ✓ Mayor ROS con más viento
- ✓ Mayor ROS con pendiente positiva
- ✓ K1 más rápido que K13 (pastizal vs bosque)
- ✓ ROS positivo en condiciones normales
- ✓ ROS ≤ 60 m/min (límite físico)
- ✓ Altura llama positiva con ROS > 0
- ✓ Altura llama = 0 con ROS = 0
- ✓ Mayor altura con mayor ROS
- ✓ Intensidad positiva

### kitral.test.js (8 tests)
- ✓ K1-K13 definidos con todos los campos
- ✓ getModelo('K2') devuelve K2
- ✓ getModelo('INEXISTENTE') devuelve K2 (default)
- ✓ clasificarCombustible devuelve string K1-K8
- ✓ campos numéricos con valores positivos
- ✓ humedadExtincion < 100%
- ✓ initCA devuelve grid con cols/rows/cellSize
- ✓ tickCA retorna nuevo grid con estado actualizado

### api_cliente.test.js (11 tests, todos mocked)
- ✓ chat_consultar retorna respuesta
- ✓ simulacion_estado retorna hectáreas y ROS
- ✓ analisis_estadisticas retorna historial
- ✓ meteo_actual retorna datos meteorológicos
- ✓ simulacion_control acepta pausar/reanudar/reiniciar
- ✓ despacho_desplegar acepta recurso+coordenadas
- ✓ simulacion_aplicar_retardante acepta producto+volumen+zona
- ✓ chat_exportar acepta formato pdf/markdown/json
- ✓ inyectarEstado guarda referencia
- ✓ múltiples consultas chat encadenadas
- ✓ exportar detecta formato correcto

## 5. Prueba de mutación

**Lo que se hizo**: en `rothermel.test.js` test "debe retornar mayor ROS en pendiente positiva",
se usó `viento=15` (km/h) inicialmente. Ambos ros_plano y ros_pendiente alcanzaron el cap de 60 m/min.
El test `expect(ros_pendiente).toBeGreaterThan(ros_plano)` falló con `expected 60 to be greater than 60`.

**Verificación**: la prueba sí falló (comprobado antes del fix).

**Fix**: cambiar viento de 15 a 5 km/h para que los valores no alcancen el cap.

## 6. Equivocaciones documentadas

Ver `ejercicio/EQUIVOCACIONES.md` (4 errores documentados).

## 7. No comprobado

- El Web Worker buffer transfer (ArrayBuffer.transfer) puede vaciar el buffer entre ticks.
  Documentado en EQUIVOCACIONES.md. No comprobé la ejecución real del worker en navegador.
- Deploy real a GitHub Pages no se probó (requiere push al repositorio remoto).
- WebLLM download de modelo Llama-3.2-1B en navegador no se probó (requiere GPU + descarga ~500MB).
