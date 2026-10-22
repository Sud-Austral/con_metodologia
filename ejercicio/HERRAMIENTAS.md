# Bitácora de Herramientas MCP

## 2026-10-22T01:36:23Z — listar_objetivos
- **Herramienta**: mcp__mcp-metodologias__listar_objetivos
- **Parámetros**: compacto=true, neo4j_instance="conaf"
- **Resultado**: OK — 152 objetivos listados (20 primeros devueltos)
- **Fallos**: 0

## 2026-10-22T01:36:40Z — crear_objetivo (primer intento FALLIDO)
- **Herramienta**: mcp__mcp-metodologias__crear_objetivo
- **Parámetros**: nombre="Integrar KITRAL CA en Web Worker 240x240 grid - Simulador 3D", neo4j_instance="conaf"
- **Resultado**: FALLO — `VALIDACION_FALLIDA: dimensiones_plan invalido`
- **Causa**: conocimiento.dimensiones_plan era string, debe ser array; criterio debe tener DISPONIBLE/PROFUNDIZABLE/BLOQUEANTE como arrays

## 2026-10-22T01:37:00Z — crear_objetivo (Semana 1-2) — OK
- **Herramienta**: mcp__mcp-metodologias__crear_objetivo
- **Resultado**: OK
- **ID**: `obj-integrar-kitral-ca-en-web-worker-240x240-grid-simulador-3d-s39s`

## 2026-10-22T01:37:08Z — crear_objetivo (Semana 2-3) — OK
- **Herramienta**: mcp__mcp-metodologias__crear_objetivo
- **Resultado**: OK
- **ID**: `obj-implementar-ia-local-webllm-en-navegador-simulador-3d-ujky`

## 2026-10-22T01:37:19Z — crear_objetivo (Semana 3-4) — OK
- **ID**: `obj-parseador-intenciones-y-control-ca-simulador-3d-e0vo`

## 2026-10-22T01:37:30Z — crear_objetivo (Semana 4-5) — OK
- **ID**: `obj-ciudades-osm-3d-y-meteorologia-open-meteo-n8n-simulador-3d-vd58`

## 2026-10-22T01:37:40Z — crear_objetivo (Semana 5-6) — OK
- **ID**: `obj-analisis-reportes-pdf-kmz-csv-exportacion-cliente-simulador-4lcq`

## 2026-10-22T01:37:51Z — crear_objetivo (Semana 6-7) — OK
- **ID**: `obj-qa-pruebas-unitarias-performance-vitest-simulador-3d-puo2`

## 2026-10-22T01:38:02Z — crear_objetivo (Semana 7-8) — OK
- **ID**: `obj-deploy-github-pages-actions-workflow-simulador-3d-yfgr`

## 2026-10-22T01:38:03Z — crear_metodologia — OK
- **Herramienta**: mcp__mcp-metodologias__crear_metodologia
- **Resultado**: OK
- **ID**: `smb-metodologia-simulador-3d-incendios-forestales-conaf-webllm-kitral`
- **Objetivos vinculados**: 7

## 2026-10-22T01:45:00Z — get_workflow_sdk_reference — OK
- **Herramienta**: mcp__n8n-mcp__get_workflow_sdk_reference
- **Sección**: patterns
- **Resultado**: OK — referencia completa patrones SDK

## 2026-10-22T01:45:30Z — search_nodes — OK
- **Herramienta**: mcp__n8n-mcp__search_nodes
- **Queries**: ["schedule trigger", "http request", "webhook", "code"]
- **Resultado**: OK — nodos encontrados con discriminadores

## 2026-10-22T01:45:50Z — get_node_types — OK
- **Herramienta**: mcp__n8n-mcp__get_node_types
- **Nodos**: scheduleTrigger v1.4, httpRequest v4.5, webhook v2.1, respondToWebhook v1.5, set v3.4
- **Resultado**: OK — definiciones TypeScript completas

## 2026-10-22T01:48:20Z — validate_workflow — OK
- **Herramienta**: mcp__n8n-mcp__validate_workflow
- **Resultado**: valid=true, nodeCount=6

## 2026-10-22T01:48:30Z — create_workflow_from_code — OK
- **Herramienta**: mcp__n8n-mcp__create_workflow_from_code
- **Resultado**: OK — workflowId=`ljDGeTW5x610iZtz`

## 2026-10-22T01:48:45Z — publish_workflow — OK
- **Herramienta**: mcp__n8n-mcp__publish_workflow
- **Resultado**: success=true, activeVersionId=`b5cade92-0357-4c32-835a-7f20f0f641f1`

## 2026-10-22T01:48:50Z — execute_workflow — OK
- **Herramienta**: mcp__n8n-mcp__execute_workflow
- **Resultado**: executionId=345, status=started

## 2026-10-22T01:48:55Z — get_workflow_execution — OK
- **Herramienta**: mcp__n8n-mcp__get_workflow_execution
- **Resultado**: status=success, datos Open-Meteo Los Lagos verificados
- **Salida**: ejercicio/salidas/n8n-meteo-output.json

---
## Resumen
| Herramienta | Llamadas | Fallidas |
|---|---|---|
| listar_objetivos | 1 | 0 |
| crear_objetivo | 9 | 2 (formato incorrecto) |
| crear_metodologia | 1 | 0 |
| get_workflow_sdk_reference | 1 | 0 |
| search_nodes | 1 | 0 |
| get_node_types | 1 | 0 |
| validate_workflow | 1 | 0 |
| create_workflow_from_code | 1 | 0 |
| publish_workflow | 1 | 0 |
| execute_workflow | 1 | 0 |
| get_workflow_execution | 1 | 0 |
