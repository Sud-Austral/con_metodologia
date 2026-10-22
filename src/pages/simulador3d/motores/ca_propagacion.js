// Motor KITRAL CA (Autómatas Celulares) para propagación de incendios
// Implementa el mismo algoritmo que SimuladorIncendio.jsx (2D) pero para uso en 3D/Worker
// NO modificar el SimuladorIncendio.jsx original

import { calcularROS } from './rothermel.js'
import { clasificarCombustible, MODELOS_KITRAL } from './kitral.js'

// Estados de celda
export const ESTADO = {
  VIRGEN: 0,
  ARDIENDO: 1,
  QUEMADA: 2,
  RETARDANTE: 3,  // aplicación retardante reduce probabilidad
}

// Vecindad Moore: 8 direcciones [dx, dy, factor_distancia]
const VECINOS = [
  [-1, -1, 1.414], [-1, 0, 1.0], [-1, 1, 1.414],
  [ 0, -1, 1.0],                 [ 0, 1, 1.0],
  [ 1, -1, 1.414], [ 1, 0, 1.0], [ 1, 1, 1.414],
]

/**
 * Inicializar grid CA
 * @param {number} lat_ign - Latitud ignición
 * @param {number} lng_ign - Longitud ignición
 * @param {number} cols - Columnas (default 240)
 * @param {number} rows - Filas (default 240)
 * @param {number} cellSize - Tamaño celda en metros (default 13)
 * @param {Float32Array|null} dem - DEM elevación (opcional)
 * @returns {Object} Grid inicializado
 */
export function initCA(lat_ign, lng_ign, cols = 240, rows = 240, cellSize = 13, dem = null) {
  const n = cols * rows

  // DEM: si no viene, crear plano con ruido leve
  let elevacion
  if (dem && dem.length >= n) {
    elevacion = dem
  } else {
    elevacion = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = i % cols
      const y = Math.floor(i / cols)
      // Terreno sintético con pendiente suave
      elevacion[i] = 100 + (x / cols) * 200 + (y / rows) * 150 + (Math.random() - 0.5) * 30
    }
  }

  // Calcular percentiles para clasificar combustible
  const sorted = Float32Array.from(elevacion).sort()
  const p40 = sorted[Math.floor(0.40 * sorted.length)]
  const p72 = sorted[Math.floor(0.72 * sorted.length)]

  // Clasificar pendiente local (3x3 kernel)
  const pendiente = new Float32Array(n)
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const idx = r * cols + c
      const dzdx = (elevacion[idx + 1] - elevacion[idx - 1]) / (2 * cellSize)
      const dzdy = (elevacion[idx + cols] - elevacion[idx - cols]) / (2 * cellSize)
      pendiente[idx] = Math.sqrt(dzdx * dzdx + dzdy * dzdy)
    }
  }

  // Tipo de combustible por celda
  const combustible = new Uint8Array(n)
  const KITRAL_KEYS = Object.keys(MODELOS_KITRAL)
  for (let i = 0; i < n; i++) {
    const tipo = clasificarCombustible(elevacion[i], pendiente[i], p40, p72)
    combustible[i] = KITRAL_KEYS.indexOf(tipo)  // índice en array
  }

  // Estado inicial: todo virgen
  const state = new Uint8Array(n)
  const tIgn = new Float32Array(n).fill(Infinity)

  // Encontrar celda de ignición (lat/lng → índice de grid)
  // Asumimos que el grid cubre una zona de ~3.12 km x 3.12 km (240*13m) alrededor del punto
  const lat0 = lat_ign - (rows / 2 * cellSize) / 111320  // metros a grados
  const lng0 = lng_ign - (cols / 2 * cellSize) / (111320 * Math.cos(lat_ign * Math.PI / 180))

  const ign_col = Math.round((lng_ign - lng0) / (cellSize / (111320 * Math.cos(lat_ign * Math.PI / 180))))
  const ign_row = Math.round((lat_ign - lat0) / (cellSize / 111320))

  const ic = Math.max(1, Math.min(cols - 2, ign_col))
  const ir = Math.max(1, Math.min(rows - 2, ign_row))
  const ign_idx = ir * cols + ic

  state[ign_idx] = ESTADO.ARDIENDO
  tIgn[ign_idx] = 0

  return {
    state,
    tIgn,
    combustible,
    elevacion,
    pendiente,
    cols,
    rows,
    cellSize,
    lat0,
    lng0,
    lat_ign,
    lng_ign,
    p40,
    p72,
    kitralKeys: KITRAL_KEYS,
  }
}

/**
 * Ejecutar un tick de simulación CA
 * @param {Object} grid - Grid actual
 * @param {number} tiempo_min - Tiempo actual en minutos
 * @param {number} viento_kmh - Velocidad viento km/h
 * @param {number} viento_dir - Dirección viento en grados (0=N, 90=E)
 * @param {number} humedad - Humedad combustible %
 * @param {number} dt - Delta tiempo en minutos
 * @param {Object} params - Parámetros opcionales
 * @returns {Object} Nuevo grid
 */
export function tickCA(grid, tiempo_min, viento_kmh, viento_dir, humedad, dt = 5, params = {}) {
  const { state, tIgn, combustible, elevacion, pendiente, cols, rows, cellSize, kitralKeys } = grid
  const ajusteROS = params.ajusteROS || 1.0

  // Nuevo estado (copia)
  const newState = new Uint8Array(state)
  const newTIgn = new Float32Array(tIgn)

  // Dirección viento como vector
  const vDir_rad = (viento_dir * Math.PI) / 180
  const vx = Math.sin(vDir_rad)
  const vy = -Math.cos(vDir_rad)

  // Procesar celdas ardiendo
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const idx = r * cols + c

      if (state[idx] !== ESTADO.ARDIENDO) continue

      // Tiempo de residencia: modelo quema por ~5-15 min
      const combustibelIdx = combustible[idx]
      const modeloKey = kitralKeys[combustibelIdx] || 'K2'

      // Después de dt*2 minutos ardiendo → QUEMADA
      if (tiempo_min - tIgn[idx] > dt * 2.5) {
        newState[idx] = ESTADO.QUEMADA
        continue
      }

      // Propagar a vecinos
      for (const [dr, dc, distFactor] of VECINOS) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue

        const nidx = nr * cols + nc
        if (state[nidx] !== ESTADO.VIRGEN) continue

        // Pendiente local hacia vecino
        const dElev = elevacion[nidx] - elevacion[idx]
        const distMetros = cellSize * distFactor
        const pendienteLocal_pct = (dElev / distMetros) * 100

        // Factor de alineación con viento (dot product)
        const vecX = dc / distFactor
        const vecY = dr / distFactor
        const dot = vecX * vx + vecY * vy
        const viento_efectivo = Math.max(0, viento_kmh * (0.5 + 0.5 * dot))

        // ROS para esta celda
        const combVecino = kitralKeys[combustible[nidx]] || 'K2'
        const ros = calcularROS(combVecino, viento_efectivo, Math.abs(pendienteLocal_pct), humedad) * ajusteROS

        if (ros <= 0) continue

        // Tiempo para llegar a vecino: distancia / ROS
        const t_llegada = tiempo_min + (distMetros / ros)

        // Probabilidad estocástica (evitar frente perfecto)
        const prob = 0.75 + Math.random() * 0.25

        if (prob > 0.5 && t_llegada <= tiempo_min + dt * 1.5) {
          newState[nidx] = ESTADO.ARDIENDO
          newTIgn[nidx] = Math.min(newTIgn[nidx], t_llegada)
        }
      }
    }
  }

  return { ...grid, state: newState, tIgn: newTIgn }
}

/**
 * Calcular superficie quemada en hectáreas
 */
export function calcularSuperficieHa(grid) {
  const { state, cellSize } = grid
  let celdas = 0
  for (let i = 0; i < state.length; i++) {
    if (state[i] === ESTADO.ARDIENDO || state[i] === ESTADO.QUEMADA) celdas++
  }
  return (celdas * cellSize * cellSize) / 10000  // m2 → ha
}

/**
 * Extraer perimetro como array de puntos [[lat,lng],...]
 */
export function gridAPerimetro(grid) {
  const { state, cols, rows, cellSize, lat0, lng0 } = grid
  const puntos = []

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const idx = r * cols + c
      if (state[idx] !== ESTADO.ARDIENDO && state[idx] !== ESTADO.QUEMADA) continue

      // Verificar si es borde (tiene vecino virgen)
      let esBorde = false
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ni = (r + dr) * cols + (c + dc)
        if (state[ni] === ESTADO.VIRGEN) { esBorde = true; break }
      }

      if (esBorde) {
        const lat = lat0 + (r * cellSize) / 111320
        const lng = lng0 + (c * cellSize) / (111320 * Math.cos(grid.lat_ign * Math.PI / 180))
        puntos.push([lat, lng])
      }
    }
  }

  return puntos
}

/**
 * Calcular ROS promedio del frente activo
 */
export function calcularROSFrente(grid, viento_kmh, viento_dir, humedad) {
  const { state, combustible, kitralKeys } = grid
  let sumROS = 0
  let count = 0

  for (let i = 0; i < state.length; i++) {
    if (state[i] !== ESTADO.ARDIENDO) continue
    const combKey = kitralKeys[combustible[i]] || 'K2'
    sumROS += calcularROS(combKey, viento_kmh, 15, humedad)  // pendiente media 15%
    count++
  }

  return count > 0 ? sumROS / count : 0
}

export default { initCA, tickCA, calcularSuperficieHa, gridAPerimetro, calcularROSFrente, ESTADO }
