import { describe, it, expect } from 'vitest'
import { calcularROS, calcularAlturaLlama, calcularIntensidad } from '../pages/simulador3d/motores/rothermel.js'

describe('calcularROS', () => {
  it('debe retornar 0 si humedad >= extincion', () => {
    // K1 tiene humedadExtincion = 12%, si ponemos 15% debe retornar 0
    const ros = calcularROS('K1', 15, 10, 15)
    expect(ros).toBe(0)
  })

  it('debe retornar mayor ROS con más viento', () => {
    const ros_bajo = calcularROS('K2', 5, 10, 8)
    const ros_alto = calcularROS('K2', 40, 10, 8)
    expect(ros_alto).toBeGreaterThan(ros_bajo)
  })

  it('debe retornar mayor ROS en pendiente positiva', () => {
    // Usar viento bajo para evitar que ambos valores alcancen el cap de 60 m/min
    const ros_plano = calcularROS('K2', 5, 0, 8)
    const ros_pendiente = calcularROS('K2', 5, 30, 8)
    expect(ros_pendiente).toBeGreaterThan(ros_plano)
  })

  it('debe retornar menor ROS para K13 que para K1 (bosque vs pastizal)', () => {
    const ros_k1 = calcularROS('K1', 15, 10, 8)
    const ros_k13 = calcularROS('K13', 15, 10, 8)
    expect(ros_k1).toBeGreaterThan(ros_k13)
  })

  it('ROS debe ser positivo en condiciones normales', () => {
    const ros = calcularROS('K2', 15, 15, 8)
    expect(ros).toBeGreaterThan(0)
  })

  it('ROS no debe superar 60 m/min (límite físico)', () => {
    const ros = calcularROS('K1', 80, 50, 3)
    expect(ros).toBeLessThanOrEqual(60)
  })
})

describe('calcularAlturaLlama', () => {
  it('debe retornar altura positiva con ROS > 0', () => {
    const h = calcularAlturaLlama(5, 'K2')
    expect(h).toBeGreaterThan(0)
  })

  it('debe retornar 0 con ROS = 0', () => {
    const h = calcularAlturaLlama(0, 'K2')
    expect(h).toBe(0)
  })

  it('debe ser mayor con mayor ROS', () => {
    const h1 = calcularAlturaLlama(2, 'K2')
    const h2 = calcularAlturaLlama(8, 'K2')
    expect(h2).toBeGreaterThan(h1)
  })
})

describe('calcularIntensidad', () => {
  it('debe retornar valor positivo', () => {
    const i = calcularIntensidad(5, 'K2')
    expect(i).toBeGreaterThan(0)
  })
})
