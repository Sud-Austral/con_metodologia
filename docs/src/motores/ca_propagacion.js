// Automata celular de propagacion de incendios (aproximacion a KITRAL CA,
// Seccion 6.1 del documento insumo). Algoritmo de "tiempo minimo de viaje":
// cada celda quemando propone un tiempo de llegada a sus 8 vecinas segun el
// ROS de Rothermel en esa direccion (favorecida si coincide con el viento);
// la celda vecina se enciende cuando el tiempo simulado alcanza su tiempo
// de llegada mas temprano.
//
// Nota de alcance: este motor es una replica propia inspirada en la
// descripcion del documento, no una copia de
// frontend/src/pages/simulacion/motores/ca_propagacion.js (marcado
// "NO TOCAR" en la Seccion 2) porque ese archivo no existe en este
// repositorio (con_metodologia nace vacio, ver supuestos en metadatos.json).

import { calcularROS } from './rothermel.js'

const VECINOS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
]

export const ESTADO = { UNBURNED: 0, BURNING: 1, BURNED: 2 }

export function initCA({ nx = 240, ny = 240, cellSizeM = 13, modelos, pendiente, i0, j0 }) {
  const n = nx * ny
  const grid = {
    nx, ny, cellSizeM,
    modelos: modelos || new Array(n).fill('K2'),
    pendiente: pendiente || new Float32Array(n).fill(10),
    state: new Uint8Array(n),
    tIgn: new Float32Array(n).fill(Infinity),
    tiempo_min: 0,
    tiempoResidenciaMin: 12,
  }
  const ci = i0 ?? Math.floor(nx / 2)
  const cj = j0 ?? Math.floor(ny / 2)
  const idx0 = cj * nx + ci
  grid.state[idx0] = ESTADO.BURNING
  grid.tIgn[idx0] = 0
  return grid
}

function anguloEntre(dx, dy) {
  // 0 = Norte, sentido horario, igual convencion que direccion de viento meteorologica
  return (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360
}

export function tickCA(grid, tiempo_min, viento_kmh, viento_dir, pendienteGlobal, humedad, dt, params = {}) {
  const { nx, ny, state, tIgn, modelos, pendiente } = grid
  const ajusteROS = params.ajusteROS ?? 1.0
  const burning = []
  for (let i = 0; i < state.length; i++) if (state[i] === ESTADO.BURNING) burning.push(i)

  for (const idx of burning) {
    const ci = idx % nx
    const cj = Math.floor(idx / nx)
    for (const [dx, dy] of VECINOS) {
      const ni = ci + dx
      const nj = cj + dy
      if (ni < 0 || ni >= nx || nj < 0 || nj >= ny) continue
      const nidx = nj * nx + ni
      if (state[nidx] !== ESTADO.UNBURNED) continue

      const dist = grid.cellSizeM * Math.sqrt(dx * dx + dy * dy)
      const anguloViaje = anguloEntre(dx, dy)
      let diff = Math.abs(anguloViaje - viento_dir)
      if (diff > 180) diff = 360 - diff
      const factorDireccion = 1 + 0.55 * Math.cos(diff * Math.PI / 180)

      const pend = pendiente ? pendiente[nidx] : pendienteGlobal
      const ros = calcularROS(modelos[nidx], viento_kmh, pend, humedad) * ajusteROS * Math.max(0.1, factorDireccion)
      if (ros <= 0) continue

      const llegada = tIgn[idx] + dist / ros
      if (llegada < tIgn[nidx]) tIgn[nidx] = llegada
    }
  }

  const tiempoFinal = tiempo_min + dt
  for (let i = 0; i < state.length; i++) {
    if (state[i] === ESTADO.UNBURNED && tIgn[i] <= tiempoFinal) {
      state[i] = ESTADO.BURNING
    } else if (state[i] === ESTADO.BURNING && (tiempoFinal - tIgn[i]) >= grid.tiempoResidenciaMin) {
      state[i] = ESTADO.BURNED
    }
  }

  grid.tiempo_min = tiempoFinal
  return grid
}

export function gridAFrente(grid) {
  const { nx, state } = grid
  const frente = []
  for (let i = 0; i < state.length; i++) {
    if (state[i] === ESTADO.BURNING) frente.push({ i: i % nx, j: Math.floor(i / nx) })
  }
  return frente
}

export function gridAPerimetro(grid) {
  const { nx, ny, state } = grid
  const perimetro = []
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const idx = j * nx + i
      if (state[idx] === ESTADO.UNBURNED) continue
      let esBorde = false
      for (const [dx, dy] of VECINOS) {
        const ni = i + dx, nj = j + dy
        if (ni < 0 || ni >= nx || nj < 0 || nj >= ny) { esBorde = true; break }
        if (state[nj * nx + ni] === ESTADO.UNBURNED) { esBorde = true; break }
      }
      if (esBorde) perimetro.push({ i, j })
    }
  }
  return perimetro
}

export function calcularSuperficieHa(grid) {
  let quemadas = 0
  for (let i = 0; i < grid.state.length; i++) if (grid.state[i] !== ESTADO.UNBURNED) quemadas++
  return (quemadas * grid.cellSizeM * grid.cellSizeM) / 10000
}

// Expansion dinamica del grid cuando el fuego alcanza el borde.
// NO IMPLEMENTADO COMPLETAMENTE (ver ejercicio/metadatos.json -> no_hecho):
// se detecta el borde y se informa, pero no se reconstruye un grid mas
// grande (requeriria remapear DEM/combustible fuera del area original).
export function expandirGridSiNecesario(grid) {
  const { nx, ny, state } = grid
  let tocaBorde = false
  for (let i = 0; i < nx && !tocaBorde; i++) {
    if (state[i] !== ESTADO.UNBURNED || state[(ny - 1) * nx + i] !== ESTADO.UNBURNED) tocaBorde = true
  }
  for (let j = 0; j < ny && !tocaBorde; j++) {
    if (state[j * nx] !== ESTADO.UNBURNED || state[j * nx + nx - 1] !== ESTADO.UNBURNED) tocaBorde = true
  }
  if (tocaBorde) {
    grid.avisoBorde = 'El frente alcanzo el borde del grid. Expansion dinamica no implementada en este ejercicio.'
  }
  return grid
}
