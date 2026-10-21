# HERRAMIENTAS.md — Bitácora de llamadas a servidores MCP

Hora en UTC aproximada (hora del entorno de ejecución, 2026-10-21).

## mcp-metodologias (Neo4j IGNUS, instancia `conaf`)

| Hora aprox. | Herramienta | Parámetros clave | Resultado |
|---|---|---|---|
| 22:02 | `listar_metodologias` | `neo4j_instance: conaf, filtro_estado: vigente` | OK, 50 metodologías vigentes devueltas (respuesta grande, guardada por el harness a archivo, inspeccionada con Python) |
| 22:02 | `listar_objetivos` | `neo4j_instance: conaf, compacto: true` | OK, 152 objetivos totales en la instancia |
| 22:08 | `ver_metodologia` | `sombrero_id: smb-metodologia-monitor-de-datos-publicos` | OK, 13 objetivos pero 12 Flujo + 1 Capacidad (no coincide con "10+3") |
| 22:09 | `ver_metodologia` | `sombrero_id: smb-metodologia-conaf-demo-viento-para-propagacion-de-incendios-de-la-base-i` | OK, `resumen: {total_objetivos:13, flujo:10, capacidad:3}` — **coincide exactamente** con los "13 objetivos (10 de flujo + 3 de capacidad)" del CLAUDE.md del usuario. Metodología elegida como referencia (además temáticamente relacionada: viento/incendios) |
| 22:10 | `crear_metodologia` | `nombre: "CONAF - Simulador 3D Incendios + IA en Navegador..."`, 13 objetivos existentes referenciados (sin duplicar) | OK, creado `smb-metodologia-conaf-simulador-3d-incendios-ia-en-navegador-ejercicio-metod`, 0 errores, 0 avisos |

Ningún fallo en llamadas a `mcp-metodologias`. No fue necesario `crear_objetivo`:
los 13 objetivos genéricos ya existían en la instancia `conaf` y el método
`crear_metodologia` permite componerlos sin duplicarlos (preferido sobre
crear objetivos nuevos para no inflar el catálogo compartido AIBO).

## n8n-mcp

**No se usó.** Decisión explícita (ver `ejercicio/metadatos.json` →
`supuestos`): la restricción de arquitectura del encargo es "SOLO FRONTEND,
sin backend/servicio propio, sin depender de procesos externos a la
pestaña del navegador". n8n es "lo único externo permitido, solo para
tareas periódicas (meteorología programada, reportes programados)". Para
este MVP, la meteorología se consulta en vivo directo desde el navegador
(`cargarMeteo`, endpoint de cliente #8) cada vez que se necesita, sin
requerir una tarea programada de antemano — no hay un requisito del
Checklist Mínimo ni de los 8 casos de uso que exija datos pre-cacheados por
un cron. Por lo tanto **no se creó ningún flujo n8n**, siguiendo la
instrucción de que es "permitido, no obligatorio". Si en una iteración
futura se quisiera cachear meteorología cada hora para reducir llamadas a
Open-Meteo, ese sería el candidato natural a flujo n8n (validar → crear →
publicar → ejecutar → mirar salida, vía skill `n8n-flujo`).

## Otras herramientas no-MCP usadas para verificación (no son MCP, se listan por trazabilidad)

| Herramienta | Uso |
|---|---|
| Node.js 24.11.0 (`node tools/test_motores.mjs`) | Pruebas unitarias de motores puros + benchmark ms/tick |
| Chrome real (`C:\Program Files\Google\Chrome\Application\chrome.exe`) vía `puppeteer-core` | Verificación end-to-end en navegador real (headless): carga de la página, chat, exportaciones, capturas de pantalla, persistencia IndexedDB |
| `fetch` directo a `api.open-meteo.com` | Verificar meteorología real |
| `fetch` directo a `s3.amazonaws.com/elevation-tiles-prod` (Terrarium) | Verificar DEM real — falló por falta de cabeceras CORS en el bucket público (ver EQUIVOCACIONES.md) |
