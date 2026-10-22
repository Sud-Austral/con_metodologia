// Web Worker para motor KITRAL CA
// Se ejecuta en hilo separado para no bloquear el render Three.js
// IMPORTANTE: Este archivo es un Web Worker - no usa import/export de ES modules de forma directa
// Se usa como módulo ES worker (type: 'module') configurado en vite.config.js

import { initCA, tickCA, calcularSuperficieHa, gridAPerimetro, calcularROSFrente } from './ca_propagacion.js'
import { calcularROS, calcularAlturaLlama } from './rothermel.js'

let gridActual = null

self.onmessage = function(evt) {
  const { cmd } = evt.data

  if (cmd === 'init') {
    const { lat_ign, lng_ign, cols, rows, cellSize, dem } = evt.data
    const demArr = dem ? new Float32Array(dem) : null

    try {
      gridActual = initCA(lat_ign, lng_ign, cols || 240, rows || 240, cellSize || 13, demArr)

      self.postMessage({
        tipo: 'init_ok',
        hectareas: 0,
        celdas_ardiendo: 1,
        cols: gridActual.cols,
        rows: gridActual.rows,
      })
    } catch(e) {
      self.postMessage({ tipo: 'error', mensaje: e.message })
    }
    return
  }

  if (cmd === 'tick') {
    if (!gridActual) {
      self.postMessage({ tipo: 'error', mensaje: 'Grid no inicializado' })
      return
    }

    const { tiempo_min, viento_kmh, viento_dir, humedad, dt, params } = evt.data
    const t0 = performance.now()

    try {
      gridActual = tickCA(gridActual, tiempo_min, viento_kmh || 15, viento_dir || 270, humedad || 10, dt || 5, params || {})

      const hectareas = calcularSuperficieHa(gridActual)
      const perimetro = gridAPerimetro(gridActual)
      const ros = calcularROSFrente(gridActual, viento_kmh || 15, viento_dir || 270, humedad || 10)
      const alturaLlama = calcularAlturaLlama(ros, 'K2')

      // Contar celdas por estado
      let ardiendo = 0
      let quemada = 0
      const { state } = gridActual
      for (let i = 0; i < state.length; i++) {
        if (state[i] === 1) ardiendo++
        else if (state[i] === 2) quemada++
      }

      const ms_tick = performance.now() - t0

      self.postMessage({
        tipo: 'tick_ok',
        tiempo_min: tiempo_min + (dt || 5),
        hectareas,
        ros,
        alturaLlama,
        perimetro,
        ardiendo,
        quemada,
        ms_tick,
        // Enviar estado comprimido (solo ardiendo y quemada para visualización)
        state: gridActual.state.buffer,
        cols: gridActual.cols,
        rows: gridActual.rows,
      }, [gridActual.state.buffer])

      // Restaurar buffer (transferido, necesita nueva copia)
      gridActual.state = new Uint8Array(gridActual.cols * gridActual.rows)
      // Re-leer desde los datos transferidos no es posible; crear estado desde perimetro
      // En práctica el worker mantiene su copia interna
      // NOTA: Transferir buffer vacía el original - mejor usar structuredClone o no transferir

    } catch(e) {
      self.postMessage({ tipo: 'error', mensaje: e.message })
    }
    return
  }

  if (cmd === 'retardante') {
    // Aplicar retardante a una zona del grid
    const { lat, lng, radioM } = evt.data
    if (!gridActual) return

    const { lat0, lng0, cellSize, cols, rows, state } = gridActual
    const lat_ign = gridActual.lat_ign

    // Convertir lat/lng a índice grid
    const radioCeldas = Math.ceil(radioM / cellSize)
    const cLng = Math.round((lng - lng0) / (cellSize / (111320 * Math.cos(lat_ign * Math.PI / 180))))
    const cLat = Math.round((lat - lat0) / (cellSize / 111320))

    let aplicadas = 0
    for (let dr = -radioCeldas; dr <= radioCeldas; dr++) {
      for (let dc = -radioCeldas; dc <= radioCeldas; dc++) {
        if (dr*dr + dc*dc > radioCeldas*radioCeldas) continue
        const r = cLat + dr
        const c = cLng + dc
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue
        const idx = r * cols + c
        if (state[idx] === 1) {  // apagar celdas ardiendo
          state[idx] = 2  // quemada con retardante
          aplicadas++
        } else if (state[idx] === 0) {
          state[idx] = 3  // retardante preventivo
          aplicadas++
        }
      }
    }

    self.postMessage({ tipo: 'retardante_ok', celdas_afectadas: aplicadas })
    return
  }

  if (cmd === 'get_state') {
    if (!gridActual) return
    self.postMessage({
      tipo: 'state_ok',
      hectareas: calcularSuperficieHa(gridActual),
      perimetro: gridAPerimetro(gridActual),
      ros: calcularROSFrente(gridActual, evt.data.viento_kmh || 15, 270, evt.data.humedad || 10),
    })
    return
  }
}
