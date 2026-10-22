// Web Worker aislado para el tick del CA (Seccion 6.1 del documento insumo).
// Se carga con `new Worker(url, { type: 'module' })` desde escena3D.js.
import { initCA, tickCA, expandirGridSiNecesario, gridAPerimetro, gridAFrente, calcularSuperficieHa } from './ca_propagacion.js'

let grid = null

self.onmessage = (evt) => {
  const msg = evt.data
  if (msg.cmd === 'init') {
    grid = initCA({
      nx: msg.nx, ny: msg.ny, cellSizeM: msg.cellSizeM,
      modelos: msg.modelos, pendiente: msg.pendiente,
      i0: msg.i0, j0: msg.j0,
    })
    self.postMessage({ tipo: 'init_ok' })
    return
  }
  if (msg.cmd === 'tick') {
    const t0 = performance.now()
    tickCA(grid, msg.tiempo_min, msg.viento_kmh, msg.viento_dir, msg.pendiente, msg.humedad, msg.dt, msg.params)
    expandirGridSiNecesario(grid)
    const ms = performance.now() - t0
    self.postMessage({
      tipo: 'tick_ok',
      state: Array.from(grid.state),
      perimetro: gridAPerimetro(grid),
      frente: gridAFrente(grid),
      hectareas: calcularSuperficieHa(grid),
      tiempo_min: grid.tiempo_min,
      avisoBorde: grid.avisoBorde || null,
      ms_tick: ms,
    })
  }
}
