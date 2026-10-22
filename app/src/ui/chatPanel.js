// ChatPanel (Seccion 7.3 / 8.1 del documento insumo), puerto de JSX a DOM
// vanilla (no hay build de React en este ejercicio: todo corre con
// <script type="module"> sin bundler, servido como estatico).

import { chatConsultar } from '../endpoints.js'
import { listarMensajes, listarDecisiones } from '../persistencia/db.js'
import { estadoSimulacion, snapshotEstadisticas } from '../estado.js'

export function montarChatPanel(container) {
  container.innerHTML = `
    <div class="chat-header"><span>IA del Incendio</span><span class="chat-local">local (navegador)</span></div>
    <div class="chat-historial" id="chat-historial"></div>
    <div class="chat-input-row">
      <input id="chat-input" type="text" placeholder="¿ROS actual? ¿Estrategia?..." />
      <button id="chat-enviar">Enviar</button>
    </div>
  `
  const historial = container.querySelector('#chat-historial')
  const input = container.querySelector('#chat-input')
  const boton = container.querySelector('#chat-enviar')

  function pintarMensaje(rol, contenido, meta) {
    const div = document.createElement('div')
    div.className = `msg msg-${rol}`
    div.textContent = contenido
    if (meta) {
      const small = document.createElement('div')
      small.className = 'msg-meta'
      small.textContent = meta
      div.appendChild(small)
    }
    historial.appendChild(div)
    historial.scrollTop = historial.scrollHeight
  }

  async function cargarHistorialPrevio() {
    try {
      const previos = await listarMensajes(estadoSimulacion.simulacion_id)
      for (const m of previos) pintarMensaje(m.rol, m.contenido)
    } catch (e) {
      console.warn('No se pudo cargar historial de IndexedDB:', e.message)
    }
  }

  async function enviar() {
    const pregunta = input.value.trim()
    if (!pregunta) return
    input.value = ''
    pintarMensaje('user', pregunta)
    boton.disabled = true
    pintarMensaje('assistant', 'Pensando...')
    const nodoCargando = historial.lastChild
    try {
      const resp = await chatConsultar({ pregunta, simulacion_id: estadoSimulacion.simulacion_id, estadisticas: snapshotEstadisticas() })
      nodoCargando.remove()
      pintarMensaje('assistant', resp.respuesta, `${resp.modelo} · ${resp.latencia_s.toFixed(2)}s${resp.tokens ? ' · ' + resp.tokens + ' tokens' : ''}`)
      if (resp.comando_ejecutado) pintarMensaje('assistant', `✅ Comando ejecutado: ${JSON.stringify(resp.comando_ejecutado)}`)
    } catch (e) {
      nodoCargando.remove()
      pintarMensaje('assistant', `❌ Error: ${e.message}`)
    } finally {
      boton.disabled = false
    }
  }

  boton.addEventListener('click', enviar)
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar() })
  cargarHistorialPrevio()

  return { enviarProgramatico: (texto) => { input.value = texto; return enviar() } }
}
