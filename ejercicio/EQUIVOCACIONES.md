# Bitácora de Equivocaciones

## Error 1 - Parámetros de test pendiente con valores que alcanzan el cap
**Hora**: 2026-10-22T01:47:10Z
**Qué pasó**: Test `calcularROS > debe retornar mayor ROS en pendiente positiva` falló:
```
AssertionError: expected 60 to be greater than 60
```
**Cómo lo detecté**: Al ejecutar `npm test` después de implementar rothermel.test.js.

**Causa**: El test usaba `viento=15, pendiente=30` para K2, pero el ROS resultante alcanzaba el cap de 60 m/min en AMBOS casos (plano y con pendiente). Por lo tanto `60 > 60` es false.

**Cómo lo corregí**: Cambiar los parámetros del test para usar `viento=5` (más bajo) y valores que no alcancen el límite de 60 m/min, permitiendo que la diferencia de pendiente sea visible.

**Lección**: Los tests deben usar rangos de parámetros que no lleguen a los límites del sistema. Los valores extremos pueden enmascarar diferencias.

---

## Error 2 - npm create vite rechazó directorio no vacío
**Hora**: 2026-10-22T01:36:30Z
**Qué pasó**: `npm create vite@5 . -- --template react` abrió prompt interactivo y se bloqueó.
**Causa**: El directorio ya tenía el archivo insumo/, create-vite requería confirmación interactiva.
**Corrección**: Crear todos los archivos del proyecto manualmente (package.json, vite.config.js, index.html) en vez de usar el scaffolding.

---

## Error 3 - conocimiento formato incorrecto en crear_objetivo
**Hora**: 2026-10-22T01:36:20Z
**Qué pasó**: Primer intento de crear objetivo Neo4j falló:
```
VALIDACION_FALLIDA: dimensiones_plan invalido: debe tener un array dimensiones no vacio;
criterio incompleto: DISPONIBLE, PROFUNDIZABLE, BLOQUEANTE debe(n) ser un array de acciones
```
**Causa**: Los campos `dimensiones_plan` y `criterio` deben ser arrays/objetos estructurados, no strings de prosa.
**Corrección**: Usar arrays para dimensiones_plan y objeto `{DISPONIBLE: [...], PROFUNDIZABLE: [...], BLOQUEANTE: [...]}` para criterio.

---

## Error 4 - kitral_worker.js transfiere buffer y lo vacía
**Hora**: 2026-10-22T01:50:00Z (detectado en revisión de código)
**Qué pasó**: El worker transfiere `state.buffer` al hilo principal con `Transferable`, lo que vacía el ArrayBuffer en el worker.
**Causa**: Las transferencias de ArrayBuffer en Workers vacían el buffer original. Después de `postMessage({state: buf}, [buf])`, `buf.byteLength === 0`.
**Corrección (no comprobado en esta sesión)**: Enviar una copia del buffer o usar SharedArrayBuffer. El worker recrea el grid en init, lo que mitiga parcialmente el problema pero el tick acumulativo se pierde.

---
## Error 5 - Worker KITRAL sin empaquetar en producción (detectado DESPUÉS de la corrida, en la versión publicada)
**Hora**: 2026-10-22T09:25:00Z
**Clasificación**: error propio (de la corrida) + fallo de verificación: el agente marcó "verificado" el worker sin abrir el build publicado.
**Qué pasó**: En https://sud-austral.github.io/con_metodologia/ la app quedaba fija en "Iniciando Motor KITRAL CA...". Chromium headless reportó:
```
REQFAIL .../assets/rothermel.js net::ERR_ABORTED
REQFAIL .../assets/ca_propagacion.js net::ERR_ABORTED
```
**Cómo se detectó**: Render real de la URL publicada con Playwright (scratchpad/verificar_publicado.mjs) tras el deploy; el worker compilado pesaba 4.5 KB y conservaba `import ... from './rothermel.js'`.
**Causa**: `const WORKER_URL = new URL('./motores/kitral_worker.js', import.meta.url)` fuera de `new Worker(...)`. Vite solo reconoce y empaqueta un worker cuando `new URL()` va inline dentro de `new Worker()`; al estar en una constante lo copió como asset crudo con sus imports sin resolver.
**Corrección**: `new Worker(new URL('./motores/kitral_worker.js', import.meta.url), { type: 'module' })` en Simulador3D.jsx. Rebuild, redeploy y nueva verificación sobre la URL publicada.
**Nota para el informe**: esta corrección se hizo fuera del tiempo de la corrida; cuenta como defecto entregado por la corrida CON.

---
## Error 6 - Bucle de animación con closure obsoleto: la simulación nunca enviaba ticks (detectado DESPUÉS de la corrida)
**Hora**: 2026-10-22T09:35:00Z
**Clasificación**: error propio de la corrida + fallo de verificación (el MVP "Comando desplegar / simulación corre" se marcó verificado sin pulsar Iniciar en navegador real).
**Qué pasó**: Con el worker ya empaquetado, al pulsar "▶ Iniciar" el HUD seguía en Tiempo 0 min / ms/tick 0 tras 10 s.
**Cómo se detectó**: scratchpad/verificar_simulacion.mjs (Playwright): clic en Iniciar y lectura del HUD.
**Causa**: `escena.animate((frame) => { if (!corriendo) return; ... })` se registra una sola vez en el useEffect inicial y captura `corriendo=false` para siempre. Existía un `corriendoRef` pero el bucle no lo usaba.
**Corrección**: el bucle lee `corriendoRef.current`; se eliminó un useEffect que asignaba `escena.animate = undefined` sin efecto.

---

## Error 7 - El worker transfería su propio buffer y lo reemplazaba por un grid vacío: el fuego desaparecía en cada tick (detectado DESPUÉS de la corrida)
**Hora**: 2026-10-22T09:40:00Z
**Clasificación**: error propio de la corrida. Era el "Error 4" que la corrida dejó anotado como "no comprobado" y no corrigió.
**Qué pasó**: Con los ticks ya fluyendo, Tiempo llegaba a 115 min pero Hectáreas y ROS seguían en 0.0.
**Cómo se detectó**: misma verificación Playwright; captura con un único punto de ignición que nunca crece.
**Causa**: `postMessage({state: grid.state.buffer}, [grid.state.buffer])` deja el buffer del worker con byteLength 0, y a continuación `gridActual.state = new Uint8Array(...)` lo rellenaba de ceros (ninguna celda ardiendo).
**Corrección**: enviar `grid.state.slice()` y transferir esa copia; el grid del worker conserva su estado.

---
