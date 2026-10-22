// Motor Rothermel - Cálculo ROS (Rate of Spread)
// Basado en Rothermel 1972 simplificado para KITRAL
// Unidades: viento en km/h, pendiente en %, humedad en %, ROS en m/min

import { MODELOS_KITRAL, getModelo } from './kitral.js'

/**
 * Calcula ROS (Rate of Spread) en m/min
 * @param {string} modelo_kitral - ID del modelo K1-K13
 * @param {number} viento_kmh - Velocidad del viento en km/h
 * @param {number} pendiente_pct - Pendiente en % (0-100)
 * @param {number} humedad_combustible - Humedad del combustible fino en %
 * @returns {number} ROS en m/min
 */
export function calcularROS(modelo_kitral, viento_kmh, pendiente_pct, humedad_combustible) {
  const modelo = getModelo(modelo_kitral)

  // Factor humedad: reduce ROS si humedad > extinción
  const hum_ext = modelo.humedadExtincion
  if (humedad_combustible >= hum_ext) return 0  // combustible húmedo, no propaga

  const factor_hum = 1.0 - (humedad_combustible / hum_ext)

  // Factor viento: Rothermel simplificado
  // Efecto de viento = C * U^B donde U es en ft/min
  const viento_ftmin = viento_kmh * 54.68  // km/h a ft/min
  const B = 1.4  // exponente típico para modelos K1-K4
  const C = 0.00304  // coeficiente empirico KITRAL
  const phi_viento = C * Math.pow(Math.max(0, viento_ftmin), B)

  // Factor pendiente: Φs = 5.275 * β^-0.3 * (tan φ)^2
  const pendiente_frac = pendiente_pct / 100.0
  const tan_phi = Math.tan(Math.atan(pendiente_frac))
  const beta = modelo.densidadBulto / 32.0  // packing ratio simplificado
  const phi_pendiente = 5.275 * Math.pow(Math.max(beta, 0.001), -0.3) * tan_phi * tan_phi

  // ROS base del modelo ajustado
  const ros_base = modelo.rosBase

  // ROS total = ros_base * factor_hum * (1 + phi_viento + phi_pendiente)
  const ros = ros_base * factor_hum * (1.0 + phi_viento * 0.5 + phi_pendiente * 0.3)

  return Math.max(0, Math.min(ros, 60))  // clamp 0-60 m/min
}

/**
 * Calcula altura de llama estimada
 * @param {number} ros - ROS en m/min
 * @param {string} modelo_kitral - ID modelo
 * @returns {number} Altura en metros
 */
export function calcularAlturaLlama(ros, modelo_kitral) {
  const modelo = getModelo(modelo_kitral)
  // FL = 0.0775 * I^0.46 donde I = intensidad
  // Simplificado: FL = ref * sqrt(ros / rosBase)
  const factor = Math.sqrt(Math.max(ros, 0) / Math.max(modelo.rosBase, 0.1))
  return modelo.alturaLlamaRef * factor
}

/**
 * Calcula intensidad de frente (kW/m)
 * @param {number} ros - m/min
 * @param {string} modelo_kitral - ID modelo
 * @returns {number} Intensidad en kW/m
 */
export function calcularIntensidad(ros, modelo_kitral) {
  const modelo = getModelo(modelo_kitral)
  // I = H * w * r donde H=calor combustion, w=carga, r=ros
  const H = 18000  // kJ/kg calor combustion tipico
  const w = modelo.cargaCombustible * 1000 / 10000  // ton/ha -> kg/m2
  const r = ros / 60  // m/min -> m/s
  return H * w * r  // kW/m
}

export default { calcularROS, calcularAlturaLlama, calcularIntensidad }
