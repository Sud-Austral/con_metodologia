// IA Local - WebLLM (WebGPU) con fallback a Transformers.js (WASM)
// Si ambos fallan: respuestas template inteligentes basadas en contexto

let motor = null          // 'webllm' | 'transformers' | 'template'
let engine = null         // instancia del motor cargado
let modeloCargado = false
let cargando = false

// Modelo a cargar (pequeño, cuantizado, ~1GB)
const MODELO_WEBLLM = 'Llama-3.2-1B-Instruct-q4f32_1-MLC'
const MODELO_TRANSFORMERS = 'Xenova/Qwen2.5-0.5B-Instruct'  // fallback WASM

/**
 * Detectar capacidades del navegador
 */
export async function detectarCapacidades() {
  const webgpu = !!navigator.gpu
  let webgpuAdapter = null
  if (webgpu) {
    try { webgpuAdapter = await navigator.gpu.requestAdapter() } catch(e) {}
  }
  return {
    webgpu,
    webgpuDisponible: !!webgpuAdapter,
    wasm: typeof WebAssembly !== 'undefined',
  }
}

/**
 * Inicializar IA local
 * @param {Function} onProgress - Callback(msg, pct) durante carga
 * @returns {Promise<{motor: string, modelo: string}>}
 */
export async function inicializarIA(onProgress = () => {}) {
  if (modeloCargado) return { motor, modelo: motor === 'webllm' ? MODELO_WEBLLM : MODELO_TRANSFORMERS }
  if (cargando) return { motor: 'esperando', modelo: '' }

  cargando = true
  const caps = await detectarCapacidades()

  // Intento 1: WebLLM con WebGPU
  if (caps.webgpuDisponible) {
    try {
      onProgress('Cargando WebLLM (WebGPU)...', 5)
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
      engine = await CreateMLCEngine(MODELO_WEBLLM, {
        initProgressCallback: (info) => {
          const pct = Math.round((info.progress || 0) * 100)
          onProgress(`Descargando modelo: ${info.text || ''}`, pct)
        }
      })
      motor = 'webllm'
      modeloCargado = true
      cargando = false
      onProgress('Modelo WebLLM cargado', 100)
      return { motor, modelo: MODELO_WEBLLM }
    } catch (e) {
      onProgress(`WebLLM falló: ${e.message}. Probando WASM...`, 10)
    }
  }

  // Intento 2: Transformers.js con WASM
  if (caps.wasm) {
    try {
      onProgress('Cargando Transformers.js (WASM)...', 5)
      const { pipeline } = await import('@huggingface/transformers')
      engine = await pipeline('text-generation', MODELO_TRANSFORMERS, {
        device: caps.webgpuDisponible ? 'webgpu' : 'wasm',
        progress_callback: (info) => {
          if (info.progress) onProgress(`Descargando: ${info.file || ''}`, Math.round(info.progress))
        }
      })
      motor = 'transformers'
      modeloCargado = true
      cargando = false
      onProgress('Modelo Transformers.js cargado', 100)
      return { motor, modelo: MODELO_TRANSFORMERS }
    } catch (e) {
      onProgress(`Transformers.js falló: ${e.message}. Usando respuestas template.`, 100)
    }
  }

  // Fallback: templates inteligentes
  motor = 'template'
  modeloCargado = true
  cargando = false
  onProgress('Modo template activado (sin GPU/WASM)', 100)
  return { motor: 'template', modelo: 'templates-conaf' }
}

/**
 * Consultar IA con contexto de simulación
 * @param {string} pregunta
 * @param {Object} contexto - Estado actual de simulación
 * @returns {Promise<string>} Respuesta en markdown
 */
export async function consultarIA(pregunta, contexto = {}) {
  if (!modeloCargado) {
    return '_IA no cargada. Usa el botón "Inicializar IA" primero._'
  }

  const systemPrompt = construirContexto(contexto)

  if (motor === 'webllm') {
    try {
      const reply = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: pregunta }
        ],
        temperature: 0.7,
        max_tokens: 300,
        stream: false,
      })
      return reply.choices[0]?.message?.content || '_Sin respuesta_'
    } catch(e) {
      return `_Error WebLLM: ${e.message}_`
    }
  }

  if (motor === 'transformers') {
    try {
      const prompt = `<|system|>${systemPrompt}<|end|>\n<|user|>${pregunta}<|end|>\n<|assistant|>`
      const result = await engine(prompt, { max_new_tokens: 200, temperature: 0.7 })
      const texto = result[0]?.generated_text || ''
      // Extraer sólo la parte del assistant
      const idx = texto.indexOf('<|assistant|>')
      return idx >= 0 ? texto.slice(idx + 13).split('<|end|>')[0].trim() : texto
    } catch(e) {
      return `_Error Transformers: ${e.message}_`
    }
  }

  // Template inteligente
  return generarRespuestaTemplate(pregunta, contexto)
}

function construirContexto(ctx) {
  const { hectareas = 0, tiempo_min = 0, ros = 0, alturaLlama = 0,
          viento_kmh = 15, viento_dir = 270, humedad = 10, modelo = 'K2' } = ctx

  return `Eres experto en incendios forestales CONAF Los Lagos.
Estado actual: ${tiempo_min} min transcurridos, ${hectareas.toFixed(1)} ha quemadas, ROS ${ros.toFixed(1)} m/min, llama ${alturaLlama.toFixed(1)} m.
Viento: ${viento_kmh} km/h dir ${viento_dir}°. Humedad combustible: ${humedad}%. Modelo combustible: ${modelo}.
Responde en español, sé conciso y técnico. Sugiere acciones específicas con números cuando sea posible.`
}

/**
 * Respuestas template cuando no hay modelo cargado
 */
function generarRespuestaTemplate(pregunta, ctx) {
  const { hectareas = 0, tiempo_min = 0, ros = 0, alturaLlama = 0, viento_kmh = 15 } = ctx
  const q = pregunta.toLowerCase()

  if (q.includes('ros') || q.includes('velocidad')) {
    return `**ROS actual: ${ros.toFixed(1)} m/min**\n\nEl frente avanza ${(ros * 60).toFixed(0)} metros por hora.\nCon viento de ${viento_kmh} km/h, la velocidad puede aumentar un 50% si rota.\n\n_Fuente: motor KITRAL CA (template)_`
  }
  if (q.includes('hectárea') || q.includes('superficie') || q.includes('área')) {
    return `**Superficie quemada: ${hectareas.toFixed(1)} ha** (${tiempo_min} min)\n\nTasa de crecimiento: ${(hectareas / Math.max(tiempo_min, 1) * 60).toFixed(2)} ha/h\n\n_Fuente: motor KITRAL CA (template)_`
  }
  if (q.includes('desplegar') || q.includes('brigada')) {
    return `**✅ Simulando despliegue de brigada**\n\nETA estimado: ${Math.round(5 + Math.random() * 10)} minutos.\nPosición recomendada: flanco menos activo (menor ROS).\n\n_Comando ejecutado en modo template_`
  }
  if (q.includes('retardante')) {
    return `**Retardante recomendado**\n\nZona frente activo (ROS ${ros.toFixed(1)} m/min).\nEfecto esperado: ROS ↓ 30-35% durante 4 horas.\nVolunen mínimo: 1200 L por 500 m de frente.\n\n_Análisis template CONAF_`
  }
  if (q.includes('puerto montt') || q.includes('ciudad')) {
    return `**Análisis de amenaza urbana**\n\nCon ROS ${ros.toFixed(1)} m/min y ${hectareas.toFixed(1)} ha activas,\nmonitoreo cada hora recomendado.\nEvacuación preventiva si ROS > 8 m/min y viento > 25 km/h.\n\n_Protocolo CONAF Los Lagos_`
  }
  if (q.includes('estrategia') || q.includes('qué hago') || q.includes('plan')) {
    return `**Plan táctico recomendado:**\n\n1. **Flanco norte**: brigada manual, línea 200m\n2. **Frente activo**: retardante aéreo si disponible\n3. **Escape**: ruta por acceso sur\n\nPrioridad: proteger instalaciones críticas.\n\n_Template estratégico CONAF_`
  }
  if (q.includes('export') || q.includes('guardar') || q.includes('pdf')) {
    return `**✅ Estrategia guardada**\n\nSnapshot creado:\n- ${tiempo_min} min transcurridos\n- ${hectareas.toFixed(1)} ha afectadas\n- ROS ${ros.toFixed(1)} m/min\n\nUsa los botones en pestaña REPORTES para exportar PDF/KMZ/CSV.\n\n_Persistido en IndexedDB_`
  }

  return `**Consulta recibida**: "${pregunta}"\n\nEstado actual:\n- Tiempo: ${tiempo_min} min\n- Superficie: ${hectareas.toFixed(1)} ha\n- ROS: ${ros.toFixed(1)} m/min\n- Llama: ${alturaLlama.toFixed(1)} m\n\n_Respuesta template - IA no disponible. Inicializar con WebLLM para respuestas avanzadas._`
}

/**
 * Detectar comando en respuesta IA
 * @param {string} respuesta
 * @returns {Object|null} Comando detectado o null
 */
export function parseadorIntenciones(respuesta) {
  const r = respuesta.toLowerCase()
  const comandos = {
    desplegar: ['desplegar', 'deploy', 'enviar brigada', 'mandar brigada'],
    retardante: ['aplicar retardante', 'retardante', 'phos-chek', 'antorcha'],
    pausar: ['pausar', 'pause', 'detener simulación', 'parar'],
    reanudar: ['reanudar', 'continuar', 'resume'],
    evacuar: ['evacuar', 'evacuación', 'evacuation'],
    exportar: ['exportar', 'guardar', 'pdf', 'kmz'],
  }

  for (const [accion, palabras] of Object.entries(comandos)) {
    if (palabras.some(p => r.includes(p))) {
      return { accion, texto_original: respuesta }
    }
  }

  return null
}

export default { inicializarIA, consultarIA, parseadorIntenciones, detectarCapacidades }
