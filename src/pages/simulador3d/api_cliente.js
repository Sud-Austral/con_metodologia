// API Cliente - 8 funciones con mismo contrato que endpoints FastAPI (Sección 8.3)
// NO hay backend. Todo corre en el navegador.

import { consultarIA, parseadorIntenciones } from './motores/ia_local.js'
import { guardarMensaje, guardarDecision } from './motores/persistencia.js'
import { exportarMarkdown, exportarPDF, exportarKMZ, exportarCSV } from './motores/exportar.js'
import { meteoActual } from './motores/meteorologia.js'

// Estado global del simulador (referencia externa que se inyecta)
let _estadoSimulacion = null
let _controlSimulacion = null

export function inyectarEstado(estado, control) {
  _estadoSimulacion = estado
  _controlSimulacion = control
}

// ── 1. POST /api/v1/chat/consultar ──────────────────────────────────────────
/**
 * Pregunta a IA local con contexto de simulación
 * @param {Object} params - {pregunta, simulacion_id, grid_ca, estadisticas}
 * @returns {Promise<Object>} {respuesta, timestamp, modelo, tokens_utilizados}
 */
export async function chat_consultar({ pregunta, simulacion_id = 'demo', grid_ca = {}, estadisticas = {} }) {
  const t0 = performance.now()

  const contexto = {
    ...(_estadoSimulacion || {}),
    ...estadisticas,
  }

  const respuesta = await consultarIA(pregunta, contexto)
  const latencia = (performance.now() - t0) / 1000

  // Detectar y ejecutar comando si corresponde
  const comando = parseadorIntenciones(respuesta)
  if (comando && _controlSimulacion) {
    await _ejecutarComando(comando)
  }

  // Persistir en IndexedDB
  await guardarMensaje({ rol: 'user', contenido: pregunta, simulacion_id, timestamp: new Date().toISOString() })
  await guardarMensaje({ rol: 'assistant', contenido: respuesta, simulacion_id, timestamp: new Date().toISOString(), latencia })

  return {
    respuesta,
    timestamp: new Date().toISOString(),
    modelo: 'webllm-browser',
    tokens_utilizados: Math.round(respuesta.length / 4),  // estimado
    latencia_s: latencia,
    comando_detectado: comando,
  }
}

// ── 2. POST /api/v1/despacho/desplegar ─────────────────────────────────────
/**
 * Desplegar recurso en coordenadas
 * @param {Object} params - {recurso_id, lat, lng}
 */
export async function despacho_desplegar({ recurso_id, lat, lng }) {
  // Calcula ETA simplificada
  const eta = Math.round(5 + Math.random() * 15)

  const decision = {
    tipo: 'despliegue',
    recurso_id,
    lat,
    lng,
    eta_min: eta,
    timestamp: new Date().toISOString(),
    simulacion_id: _estadoSimulacion?.simulacion_id || 'demo',
  }

  await guardarDecision(decision)

  if (_controlSimulacion?.desplegar) {
    _controlSimulacion.desplegar(recurso_id, lat, lng)
  }

  return {
    ok: true,
    recurso_id,
    lat, lng,
    eta_min: eta,
    estado: 'EN_TRANSITO',
    mensaje: `Recurso ${recurso_id} desplegado. ETA: ${eta} min`,
  }
}

// ── 3. POST /api/v1/simulacion/aplicar-retardante ───────────────────────────
/**
 * Aplicar retardante a zona del grid
 * @param {Object} params - {producto, volumen, zona: {lat, lng, radio}}
 */
export async function simulacion_aplicar_retardante({ producto = 'Phos-Chek', volumen = 1200, zona = {} }) {
  const { lat, lng, radio = 500 } = zona

  if (_controlSimulacion?.retardante) {
    _controlSimulacion.retardante(lat, lng, radio)
  }

  const decision = {
    tipo: 'retardante',
    producto,
    volumen,
    lat, lng, radio,
    efecto_esperado_pct: 30,
    timestamp: new Date().toISOString(),
  }
  await guardarDecision(decision)

  return {
    ok: true,
    producto,
    volumen,
    zona,
    efecto_estimado: 'ROS -30% durante 4 horas',
    mensaje: `Retardante ${producto} (${volumen} L) aplicado en radio ${radio}m`,
  }
}

// ── 4. POST /api/v1/simulacion/control ──────────────────────────────────────
/**
 * Controlar simulación
 * @param {Object} params - {accion: 'pausar'|'reanudar'|'reiniciar'}
 */
export async function simulacion_control({ accion }) {
  if (_controlSimulacion?.control) {
    _controlSimulacion.control(accion)
  }
  return { ok: true, accion, timestamp: new Date().toISOString() }
}

// ── 5. GET /api/v1/chat/exportar/{conversacion_id} ─────────────────────────
/**
 * Exportar conversación
 * @param {Object} params - {conversacion_id, formato: 'pdf'|'markdown'|'json'}
 */
export async function chat_exportar({ conversacion_id, formato = 'markdown' }) {
  const { cargarMensajes } = await import('./motores/persistencia.js')
  const mensajes = await cargarMensajes(conversacion_id || 'demo')
  const estadisticas = _estadoSimulacion || {}

  if (formato === 'pdf') {
    await exportarPDF(mensajes, estadisticas)
    return { ok: true, formato, mensajes: mensajes.length }
  }

  if (formato === 'json') {
    const json = JSON.stringify({ mensajes, estadisticas }, null, 2)
    const { descargarArchivo } = await import('./motores/exportar.js')
    descargarArchivo(json, `conversacion_${Date.now()}.json`, 'application/json')
    return { ok: true, formato, mensajes: mensajes.length }
  }

  // markdown (default)
  const md = exportarMarkdown(mensajes, estadisticas)
  const { descargarArchivo } = await import('./motores/exportar.js')
  descargarArchivo(md, `conversacion_${Date.now()}.md`, 'text/markdown')
  return { ok: true, formato, mensajes: mensajes.length, contenido: md }
}

// ── 6. GET /api/v1/analisis/estadisticas ────────────────────────────────────
/**
 * Obtener estadísticas para gráficos
 */
export async function analisis_estadisticas() {
  const estado = _estadoSimulacion || {}
  return {
    tiempo_min: estado.tiempo_min || 0,
    hectareas: estado.hectareas || 0,
    ros: estado.ros || 0,
    alturaLlama: estado.alturaLlama || 0,
    viento_kmh: estado.viento_kmh || 0,
    humedad: estado.humedad || 0,
    historial: estado.historial || [],
    timestamp: new Date().toISOString(),
  }
}

// ── 7. GET /api/v1/meteo/actual ─────────────────────────────────────────────
/**
 * Obtener meteorología actual
 */
export async function meteo_actual() {
  try {
    const m = await meteoActual()
    return { ok: true, ...m }
  } catch(e) {
    return { ok: false, error: e.message, vel_kmh: 15, dir_grados: 270, hr: 30, temp: 25 }
  }
}

// ── 8. GET /api/v1/simulacion/estado ────────────────────────────────────────
/**
 * Estado completo de la simulación
 */
export async function simulacion_estado() {
  return {
    ok: true,
    estado: _estadoSimulacion || { mensaje: 'Simulación no iniciada' },
    timestamp: new Date().toISOString(),
  }
}

// ── Helper interno ───────────────────────────────────────────────────────────
async function _ejecutarComando(comando) {
  const { accion } = comando
  if (accion === 'desplegar_recurso' && _controlSimulacion?.desplegar) {
    _controlSimulacion.desplegar('auto', null, null)
  } else if (accion === 'retardante' && _controlSimulacion?.retardante) {
    _controlSimulacion.retardante(null, null, 400)
  } else if (accion === 'pausar') {
    await simulacion_control({ accion: 'pausar' })
  }
}

export default {
  chat_consultar,
  despacho_desplegar,
  simulacion_aplicar_retardante,
  simulacion_control,
  chat_exportar,
  analisis_estadisticas,
  meteo_actual,
  simulacion_estado,
  inyectarEstado,
}
