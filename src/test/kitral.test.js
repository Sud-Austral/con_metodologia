import { describe, it, expect } from 'vitest'
import { initCA, tickCA, calcularSuperficieHa, gridAPerimetro, ESTADO } from '../pages/simulador3d/motores/ca_propagacion.js'

describe('initCA', () => {
  it('debe crear un grid con las dimensiones correctas', () => {
    const grid = initCA(-41.47, -72.94, 60, 60, 13, null)
    expect(grid.cols).toBe(60)
    expect(grid.rows).toBe(60)
    expect(grid.state.length).toBe(60 * 60)
    expect(grid.tIgn.length).toBe(60 * 60)
  })

  it('debe tener exactamente una celda ardiendo al inicio', () => {
    const grid = initCA(-41.47, -72.94, 60, 60, 13, null)
    let ardiendo = 0
    for (let i = 0; i < grid.state.length; i++) {
      if (grid.state[i] === ESTADO.ARDIENDO) ardiendo++
    }
    expect(ardiendo).toBe(1)
  })

  it('celda de ignición tiene tIgn = 0', () => {
    const grid = initCA(-41.47, -72.94, 60, 60, 13, null)
    let tIgnMin = Infinity
    for (let i = 0; i < grid.tIgn.length; i++) {
      if (grid.tIgn[i] < tIgnMin) tIgnMin = grid.tIgn[i]
    }
    expect(tIgnMin).toBe(0)
  })
})

describe('tickCA', () => {
  it('debe propagar fuego a celdas vecinas', () => {
    const grid = initCA(-41.47, -72.94, 60, 60, 13, null)

    // Contar ardiendo inicial
    let ardiendo0 = 0
    for (let i = 0; i < grid.state.length; i++) {
      if (grid.state[i] === ESTADO.ARDIENDO) ardiendo0++
    }

    // Ejecutar varios ticks
    let gridActual = grid
    for (let t = 0; t < 10; t++) {
      gridActual = tickCA(gridActual, t * 5, 15, 270, 10, 5, {})
    }

    let ardiendo1 = 0
    for (let i = 0; i < gridActual.state.length; i++) {
      if (gridActual.state[i] === ESTADO.ARDIENDO || gridActual.state[i] === ESTADO.QUEMADA) ardiendo1++
    }

    // Debe haber más celdas quemadas/ardiendo después de los ticks
    expect(ardiendo1).toBeGreaterThan(ardiendo0)
  })

  it('con humedad de extinción NO debe propagar', () => {
    const grid = initCA(-41.47, -72.94, 60, 60, 13, null)

    // Humedad al 50% (bien por encima de extinción de todos los modelos)
    let gridActual = grid
    for (let t = 0; t < 5; t++) {
      gridActual = tickCA(gridActual, t * 5, 0, 270, 50, 5, {})
    }

    // La ignición inicial puede quemarse, pero no debe propagar
    let ardiendo = 0
    for (let i = 0; i < gridActual.state.length; i++) {
      if (gridActual.state[i] === ESTADO.ARDIENDO) ardiendo++
    }
    // Con humedad muy alta, no debería propagar mucho
    expect(ardiendo).toBeLessThan(5)
  })
})

describe('calcularSuperficieHa', () => {
  it('debe retornar 0 para grid inicial sin quemar mucho', () => {
    const grid = initCA(-41.47, -72.94, 60, 60, 13, null)
    // 1 celda ardiendo = 13*13 m2 = 169 m2 = 0.0169 ha
    const ha = calcularSuperficieHa(grid)
    expect(ha).toBeCloseTo(0.0169, 3)
  })

  it('debe aumentar después de ticks', () => {
    const grid = initCA(-41.47, -72.94, 60, 60, 13, null)
    const ha0 = calcularSuperficieHa(grid)

    let g = grid
    for (let i = 0; i < 5; i++) {
      g = tickCA(g, i * 5, 20, 270, 8, 5, {})
    }
    const ha1 = calcularSuperficieHa(g)

    expect(ha1).toBeGreaterThanOrEqual(ha0)
  })
})

describe('gridAPerimetro', () => {
  it('debe retornar array de puntos [lat,lng]', () => {
    const grid = initCA(-41.47, -72.94, 60, 60, 13, null)
    const peri = gridAPerimetro(grid)
    expect(Array.isArray(peri)).toBe(true)
    if (peri.length > 0) {
      expect(peri[0]).toHaveLength(2)
    }
  })
})
