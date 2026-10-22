// ControlPanel con 6 pestanas (Seccion 8.1 del documento insumo):
// FUEGO, ESCENARIO, RECURSOS, PERIMETRO, ANALISIS, REPORTES.

import { estadoSimulacion, snapshotEstadisticas } from '../estado.js'
import { despachoDesplegar, simulacionAplicarRetardante, simulacionControl, chatExportar, analisisEstadisticas } from '../endpoints.js'
import { listarMensajes, listarDecisiones } from '../persistencia/db.js'

const PESTANAS = ['FUEGO', 'ESCENARIO', 'RECURSOS', 'PERIMETRO', 'ANALISIS', 'REPORTES']

export function montarControlPanel(container) {
  container.innerHTML = `
    <div class="tabs">${PESTANAS.map(t => `<button class="tab-btn" data-tab="${t}">${t}</button>`).join('')}</div>
    <div class="tab-body" id="tab-body"></div>
  `
  const body = container.querySelector('#tab-body')
  let activa = 'FUEGO'

  function render() {
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('activa', b.dataset.tab === activa))
    if (activa === 'FUEGO') return renderFuego()
    if (activa === 'ESCENARIO') return renderEscenario()
    if (activa === 'RECURSOS') return renderRecursos()
    if (activa === 'PERIMETRO') return renderPerimetro()
    if (activa === 'ANALISIS') return renderAnalisis()
    if (activa === 'REPORTES') return renderReportes()
  }

  function renderFuego() {
    body.innerHTML = `
      <label>Viento (km/h): <input id="f-viento" type="range" min="0" max="80" value="${estadoSimulacion.vel_viento}"> <span id="f-viento-v">${estadoSimulacion.vel_viento}</span></label>
      <label>Direccion viento (°): <input id="f-dir" type="range" min="0" max="360" value="${estadoSimulacion.dir_viento}"> <span id="f-dir-v">${estadoSimulacion.dir_viento}</span></label>
      <label>Humedad combustible (%): <input id="f-hum" type="range" min="2" max="40" value="${estadoSimulacion.hum_combustible}"> <span id="f-hum-v">${estadoSimulacion.hum_combustible}</span></label>
      <div class="controles-sim">
        <button id="btn-pausar">${estadoSimulacion.pausado ? 'Reanudar' : 'Pausar'}</button>
        <span>Tiempo: <b id="f-tiempo">${estadoSimulacion.tiempo_min}</b> min · Hectareas: <b id="f-ha">${estadoSimulacion.hectareas.toFixed(1)}</b></span>
      </div>
    `
    body.querySelector('#f-viento').addEventListener('input', (e) => { estadoSimulacion.vel_viento = Number(e.target.value); body.querySelector('#f-viento-v').textContent = e.target.value })
    body.querySelector('#f-dir').addEventListener('input', (e) => { estadoSimulacion.dir_viento = Number(e.target.value); body.querySelector('#f-dir-v').textContent = e.target.value })
    body.querySelector('#f-hum').addEventListener('input', (e) => { estadoSimulacion.hum_combustible = Number(e.target.value); body.querySelector('#f-hum-v').textContent = e.target.value })
    body.querySelector('#btn-pausar').addEventListener('click', () => {
      simulacionControl({ accion: estadoSimulacion.pausado ? 'reanudar' : 'pausar' })
      render()
    })
  }

  function renderEscenario() {
    body.innerHTML = `
      <p>Lugar: Los Lagos, Chile (demo Coigue-1)</p>
      <p>Lat/Lng ignicion: ${estadoSimulacion.lat}, ${estadoSimulacion.lng}</p>
      <p>Grid CA: 240x240 celdas de 13 m</p>
    `
  }

  function renderRecursos() {
    body.innerHTML = `
      <ul class="lista-recursos">
        ${estadoSimulacion.recursos.map(r => `<li>${r.id} (${r.tipo}) — ${r.estado} <button data-id="${r.id}" class="btn-desplegar">Desplegar</button></li>`).join('')}
      </ul>
    `
    body.querySelectorAll('.btn-desplegar').forEach(b => b.addEventListener('click', async () => {
      await despachoDesplegar({ recurso_id: b.dataset.id, direccion: 'norte' })
      render()
    }))
  }

  function renderPerimetro() {
    const grid = estadoSimulacion.grid
    body.innerHTML = `<p>Celdas quemando/quemadas: ${grid ? Array.from(grid.state).filter(s => s > 0).length : 0}</p>
      <p>Aviso borde: ${grid && grid.avisoBorde ? grid.avisoBorde : 'ninguno'}</p>`
  }

  function renderAnalisis() {
    body.innerHTML = `<canvas id="canvas-analisis" width="420" height="220"></canvas><p class="nota">ROS (naranjo) y hectareas (verde) vs tiempo</p>`
    const canvas = body.querySelector('#canvas-analisis')
    const ctx = canvas.getContext('2d')
    const { serie } = analisisEstadisticas()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!serie.length) return
    const maxRos = Math.max(1, ...serie.map(s => s.ros_m_min))
    const maxHa = Math.max(1, ...serie.map(s => s.hectareas))
    ctx.strokeStyle = '#ff6a00'
    ctx.beginPath()
    serie.forEach((s, i) => {
      const x = (i / Math.max(1, serie.length - 1)) * canvas.width
      const y = canvas.height - (s.ros_m_min / maxRos) * canvas.height
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
    ctx.strokeStyle = '#2d8f3f'
    ctx.beginPath()
    serie.forEach((s, i) => {
      const x = (i / Math.max(1, serie.length - 1)) * canvas.width
      const y = canvas.height - (s.hectareas / maxHa) * canvas.height
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  function renderReportes() {
    body.innerHTML = `
      <button id="exp-md">Exportar Markdown</button>
      <button id="exp-csv">Exportar CSV</button>
      <button id="exp-json">Exportar JSON</button>
      <button id="exp-pdf">Exportar PDF</button>
      <div id="exp-status"></div>
    `
    const status = body.querySelector('#exp-status')
    async function descargar(formato) {
      status.textContent = 'Generando...'
      try {
        const mensajes = await listarMensajes(estadoSimulacion.simulacion_id)
        const decisiones = await listarDecisiones()
        if (formato === 'csv') {
          const { exportarCSV } = await import('../exportar/exportar.js')
          const blob = new Blob([exportarCSV(estadoSimulacion.serieEstadisticas)], { type: 'text/csv' })
          disparaDescarga(blob, 'estadisticas.csv')
        } else {
          const { blob, extension } = await chatExportar({ conversacion_id: estadoSimulacion.simulacion_id, formato, mensajes, decisiones })
          disparaDescarga(blob, `analisis_ia.${extension}`)
        }
        status.textContent = 'Listo.'
      } catch (e) {
        status.textContent = `Error: ${e.message}`
      }
    }
    body.querySelector('#exp-md').addEventListener('click', () => descargar('markdown'))
    body.querySelector('#exp-csv').addEventListener('click', () => descargar('csv'))
    body.querySelector('#exp-json').addEventListener('click', () => descargar('json'))
    body.querySelector('#exp-pdf').addEventListener('click', () => descargar('pdf'))
  }

  function disparaDescarga(blob, nombre) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nombre
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  container.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => { activa = b.dataset.tab; render() }))
  render()
  setInterval(() => { if (activa === 'FUEGO' || activa === 'ANALISIS' || activa === 'PERIMETRO') render() }, 2000)
}
