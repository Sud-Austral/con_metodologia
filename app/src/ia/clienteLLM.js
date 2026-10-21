// IA local EN EL NAVEGADOR (restriccion de arquitectura: reemplaza
// Ollama+Mistral-7B de la Seccion 7.1 del documento insumo por WebLLM
// (MLC, WebGPU) corriendo dentro de la pestana). Modelo pequeno
// cuantizado: Llama-3.2-1B-Instruct-q4f16_1-MLC.
//
// Si no hay WebGPU: fallback a respuestas template (documentado en la
// Seccion 11 FAQ del documento como opcion valida), nunca pantalla en
// blanco.

const MODELO_WEBLLM = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
const CDN_WEBLLM = 'https://esm.run/@mlc-ai/web-llm'

export async function detectarWebGPU() {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return { disponible: false, motivo: 'navigator.gpu no existe en este navegador/contexto' }
  }
  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) return { disponible: false, motivo: 'requestAdapter() devolvio null' }
    return { disponible: true, adapter }
  } catch (e) {
    return { disponible: false, motivo: e.message }
  }
}

let motorWebLLM = null
let estadoCarga = { estado: 'sin_iniciar', progreso: 0, texto: '' }

export function obtenerEstadoCarga() {
  return estadoCarga
}

export async function inicializarLLM(onProgreso) {
  const gpu = await detectarWebGPU()
  if (!gpu.disponible) {
    estadoCarga = { estado: 'fallback_sin_webgpu', progreso: 0, texto: gpu.motivo }
    return { ok: false, modo: 'fallback', motivo: gpu.motivo }
  }
  try {
    const webllm = await import(/* webpackIgnore: true */ CDN_WEBLLM)
    const t0 = performance.now()
    motorWebLLM = new webllm.MLCEngine()
    motorWebLLM.setInitProgressCallback((report) => {
      estadoCarga = { estado: 'cargando', progreso: report.progress ?? 0, texto: report.text ?? '' }
      if (onProgreso) onProgreso(estadoCarga)
    })
    await motorWebLLM.reload(MODELO_WEBLLM)
    const descarga_s = (performance.now() - t0) / 1000
    estadoCarga = { estado: 'listo', progreso: 1, texto: 'modelo cargado' }
    return { ok: true, modo: 'webllm', modelo: MODELO_WEBLLM, descarga_s }
  } catch (e) {
    estadoCarga = { estado: 'fallback_error_carga', progreso: 0, texto: e.message }
    return { ok: false, modo: 'fallback', motivo: e.message }
  }
}

// Respuestas template cuando no hay WebGPU/WebLLM (Seccion 11 FAQ).
function respuestaFallback(pregunta, estadisticas) {
  const e = estadisticas || {}
  return `No dispongo de IA en este navegador (sin WebGPU), pero con los datos actuales: ` +
    `ROS ${e.ros_cabeza ?? '?'} m/min, ${(e.hectareas ?? 0)} ha quemadas, ` +
    `viento ${e.vel_viento ?? '?'} km/h desde ${e.dir_viento ?? '?'}°. ` +
    `Pregunta recibida: "${pregunta}".`
}

export async function chat(promptSistema, pregunta, estadisticas) {
  const t0 = performance.now()
  if (!motorWebLLM) {
    return { respuesta: respuestaFallback(pregunta, estadisticas), modo: 'fallback', latencia_s: (performance.now() - t0) / 1000, tokens: null }
  }
  const resp = await motorWebLLM.chat.completions.create({
    messages: [
      { role: 'system', content: promptSistema },
      { role: 'user', content: pregunta },
    ],
    temperature: 0.7,
    top_p: 0.9,
  })
  const texto = resp.choices[0].message.content
  const tokens = resp.usage ? resp.usage.completion_tokens : null
  return { respuesta: texto, modo: 'webllm', latencia_s: (performance.now() - t0) / 1000, tokens }
}
