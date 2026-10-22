import { crearEscena } from './escena3D.js'
import { montarChatPanel } from './ui/chatPanel.js'
import { montarControlPanel } from './ui/controlPanel.js'
import { detectarWebGPU } from './ia/clienteLLM.js'

async function main() {
  const escenaDiv = document.getElementById('escena3d')
  const estado = { ok: true }
  try {
    window.__escena = crearEscena(escenaDiv, { nx: 240, ny: 240, cellSizeM: 13 })
  } catch (e) {
    estado.ok = false
    escenaDiv.innerHTML = `<div class="error-webgl">No se pudo iniciar WebGL: ${e.message}</div>`
    console.error(e)
  }

  montarChatPanel(document.getElementById('chat-panel'))
  montarControlPanel(document.getElementById('control-panel'))

  const gpu = await detectarWebGPU()
  const badge = document.getElementById('webgpu-badge')
  badge.textContent = gpu.disponible ? 'WebGPU: disponible' : `WebGPU: no disponible (${gpu.motivo}) — usando respuestas template`
  badge.className = gpu.disponible ? 'badge ok' : 'badge warn'

  setInterval(() => {
    const el = document.getElementById('fps-badge')
    if (window.__escena && el) {
      el.textContent = `FPS ~ ${window.__escena.fpsPromedio().toFixed(0)} · ms/tick ~ ${(window.__escena.msUltimoTick() ?? 0).toFixed(1)}`
    }
  }, 1000)
}

main().catch((e) => {
  document.body.innerHTML = `<div class="error-fatal">Error fatal cargando el simulador: ${e.message}<pre>${e.stack}</pre></div>`
  console.error(e)
})
