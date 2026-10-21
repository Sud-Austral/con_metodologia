// Los "8 endpoints de cliente" (Seccion 8.3 del documento insumo + 2
// ampliados, ver nota abajo). Mismo contrato de entrada/salida que
// tendria un endpoint HTTP, pero son funciones JS invocadas directo desde
// la UI (restriccion de arquitectura: SOLO FRONTEND, sin backend propio).
//
// NOTA DE ALCANCE (ver metadatos.json -> supuestos):
// La Seccion 8.3 del documento lista textualmente 6 endpoints
// (chat/consultar, despacho/desplegar, simulacion/aplicar-retardante,
// simulacion/control, chat/exportar, analisis/estadisticas). La consigna
// de este ejercicio pide registrar "8 endpoints". Para llegar a 8 sin
// inventar funcionalidad nueva, se incorporan como endpoints de cliente
// adicionales dos funciones que la Seccion 5 del documento SI especifica
// con firma y contrato claros: cargarDEM (5.1) y cargarMeteo (5.4). Esta
// decision se deja explicita aqui y en metadatos.json, no se omite.

import { chat as chatLLM, inicializarLLM } from './ia/clienteLLM.js'
import { ensamblarContextoSistema } from './ia/contexto.js'
import { parseadorIntenciones } from './ia/parseadorIntenciones.js'
import { guardarMensaje, guardarDecision } from './persistencia/db.js'
import { exportarMarkdown, exportarCSV, exportarKMZ, exportarPDF } from './exportar/exportar.js'
import { cargarDEM } from './motores/descarga_dem.js'
import { cargarMeteo } from './motores/meteorologia.js'
import { calcularROS } from './motores/rothermel.js'
import { estadoSimulacion, snapshotEstadisticas } from './estado.js'

let llmInicializado = false

// Endpoint 1 — POST /api/v1/chat/consultar
export async function chatConsultar({ pregunta, simulacion_id, estadisticas }) {
  if (!llmInicializado) { await inicializarLLM(); llmInicializado = true }
  const promptSistema = ensamblarContextoSistema(estadisticas || snapshotEstadisticas())
  const t0 = performance.now()
  const resultado = await chatLLM(promptSistema, pregunta, estadisticas)
  const latencia_s = (performance.now() - t0) / 1000

  const comando = parseadorIntenciones(resultado.respuesta) || parseadorIntenciones(pregunta)
  let comandoEjecutado = null
  if (comando) comandoEjecutado = await ejecutarComando(comando)

  await guardarMensaje({ conversacion_id: simulacion_id, rol: 'user', contenido: pregunta })
  await guardarMensaje({ conversacion_id: simulacion_id, rol: 'assistant', contenido: resultado.respuesta, tokens: resultado.tokens, modelo: resultado.modo })

  return {
    respuesta: resultado.respuesta,
    timestamp: new Date().toISOString(),
    modelo: resultado.modo,
    tokens_utilizados: resultado.tokens,
    latencia_s,
    comando_detectado: comando,
    comando_ejecutado: comandoEjecutado,
  }
}

async function ejecutarComando(cmd) {
  if (cmd.accion === 'desplegar_recurso') return despachoDesplegar({ recurso_id: cmd.recurso_id, direccion: cmd.direccion })
  if (cmd.accion === 'aplicar_retardante') return simulacionAplicarRetardante({ producto: cmd.producto, volumen: cmd.volumen })
  if (cmd.accion === 'pausar') return simulacionControl({ accion: 'pausar' })
  if (cmd.accion === 'reanudar') return simulacionControl({ accion: 'reanudar' })
  if (cmd.accion === 'guardar_decision') return guardarDecisionActual()
  return null
}

// Endpoint 2 — POST /api/v1/despacho/desplegar
export async function despachoDesplegar({ recurso_id, lat, lng, direccion }) {
  const recurso = estadoSimulacion.recursos.find(r => r.id === recurso_id) || estadoSimulacion.recursos[0]
  recurso.estado = 'EN TRANSITO'
  const distanciaKm = 2 + Math.random() * 3
  const eta_min = Math.round((distanciaKm / 30) * 60) // 30 km/h promedio terreno
  if (lat != null) recurso.lat = lat
  if (lng != null) recurso.lng = lng
  return { ok: true, recurso_id: recurso.id, destino: direccion || 'destino indicado', eta_min, estado: recurso.estado }
}

// Endpoint 3 — POST /api/v1/simulacion/aplicar-retardante
export async function simulacionAplicarRetardante({ producto, volumen, zona }) {
  const reduccionPct = Math.min(45, Math.round(volumen / 50))
  estadoSimulacion.retardanteActivo = { producto, volumen, zona, reduccionPct, aplicadoEnMin: estadoSimulacion.tiempo_min }
  return { ok: true, producto, volumen, ros_reduccion_pct: reduccionPct }
}

// Endpoint 4 — POST /api/v1/simulacion/control
export function simulacionControl({ accion }) {
  if (accion === 'pausar') estadoSimulacion.pausado = true
  else if (accion === 'reanudar') estadoSimulacion.pausado = false
  else if (accion === 'reiniciar') estadoSimulacion.tiempo_min = 0
  else throw new Error(`Accion de control desconocida: ${accion}`)
  return { ok: true, accion, pausado: estadoSimulacion.pausado }
}

// Endpoint 5 — GET /api/v1/chat/exportar/{conversacion_id}?formato=...
export async function chatExportar({ conversacion_id, formato, mensajes, decisiones }) {
  const estadisticas = snapshotEstadisticas()
  if (formato === 'markdown') return { blob: new Blob([exportarMarkdown({ nombre: estadisticas.nombre, estadisticas, mensajes, decisiones })], { type: 'text/markdown' }), extension: 'md' }
  if (formato === 'json') return { blob: new Blob([JSON.stringify({ estadisticas, mensajes, decisiones }, null, 2)], { type: 'application/json' }), extension: 'json' }
  if (formato === 'pdf') return { blob: await exportarPDF({ nombre: estadisticas.nombre, estadisticas, mensajes }), extension: 'pdf' }
  throw new Error(`Formato de exportacion no soportado: ${formato}`)
}

// Endpoint 6 — GET /api/v1/analisis/estadisticas
export function analisisEstadisticas() {
  return {
    serie: estadoSimulacion.serieEstadisticas,
    actual: snapshotEstadisticas(),
  }
}

// Endpoint 7 (Seccion 5.1) — cargarDEM(lat, lng, radioKm)
export { cargarDEM }

// Endpoint 8 (Seccion 5.4) — cargarMeteo(lat, lon, fecha, dias)
export { cargarMeteo }

async function guardarDecisionActual() {
  const snap = snapshotEstadisticas()
  await guardarDecision({ descripcion: `Plan guardado en T=${snap.minutos}: ROS ${snap.ros_cabeza} m/min, ${snap.hectareas} ha`, snapshot: snap })
  return { ok: true }
}

export function rosActual() {
  return calcularROS(estadoSimulacion.modelo, estadoSimulacion.vel_viento, 20, estadoSimulacion.hum_combustible)
}
