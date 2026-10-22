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
