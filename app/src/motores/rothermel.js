import { MODELOS_KITRAL } from './kitral.js'

// calcularROS: velocidad de propagacion base (m/min) para un modelo de
// combustible KITRAL dado viento (km/h), pendiente (%) y humedad de
// combustible fino (%). Aproximacion inspirada en Rothermel (1972):
// ROS = ROS0 * factorHumedad * factorViento * factorPendiente
// Ver nota de aproximacion en kitral.js.
export function calcularROS(modelo, viento_kmh, pendiente_pct, humedad_combustible) {
  const fuel = MODELOS_KITRAL[modelo]
  if (!fuel) throw new Error(`Modelo de combustible desconocido: ${modelo}`)
  if (humedad_combustible >= fuel.humedadExtincion) return 0
  const factorHumedad = Math.max(0, 1 - humedad_combustible / fuel.humedadExtincion)
  const factorViento = 1 + fuel.coefViento * Math.max(0, viento_kmh)
  const factorPendiente = Math.exp(fuel.coefPendiente * (pendiente_pct / 100))
  const ros = fuel.rosBase * factorHumedad * factorViento * factorPendiente
  return Math.max(0, ros)
}

// Altura de llama aproximada (m) a partir de ROS e intensidad relativa.
export function alturaLlama(ros_m_min, intensidad = 1) {
  return 0.01 * ros_m_min * 60 + 2 * Math.sqrt(Math.max(0.001, intensidad))
}

// Interpolacion de ROS en la transicion entre dos modelos de combustible
// (celda actual y celda adyacente), Seccion 6.2 del documento insumo.
export function calcularROSInterpolado(modelo1, modelo2, viento_kmh, pendiente_pct, humedad, factorTransicion = 0.5) {
  const ros1 = calcularROS(modelo1, viento_kmh, pendiente_pct, humedad)
  const ros2 = calcularROS(modelo2, viento_kmh, pendiente_pct, humedad)
  return ros1 * (1 - factorTransicion) + ros2 * factorTransicion
}
