import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock los módulos que usan IndexedDB y fetch
vi.mock('../pages/simulador3d/motores/ia_local.js', () => ({
  consultarIA: vi.fn().mockResolvedValue('ROS actual: 8.2 m/min. Viento 15 km/h favorable.'),
  parseadorIntenciones: vi.fn().mockReturnValue(null),
  inicializarIA: vi.fn().mockResolvedValue({ motor: 'template', modelo: 'template' }),
}))

vi.mock('../pages/simulador3d/motores/persistencia.js', () => ({
  guardarMensaje: vi.fn().mockResolvedValue(1),
  cargarMensajes: vi.fn().mockResolvedValue([]),
  guardarDecision: vi.fn().mockResolvedValue(1),
  cargarDecisiones: vi.fn().mockResolvedValue([]),
}))

vi.mock('../pages/simulador3d/motores/meteorologia.js', () => ({
  meteoActual: vi.fn().mockResolvedValue({ vel_kmh: 15, dir_grados: 270, hr: 30, temp: 25 }),
  cargarMeteo: vi.fn().mockResolvedValue({ lat: -41.47, lon: -72.94, horas: [] }),
}))

vi.mock('../pages/simulador3d/motores/exportar.js', () => ({
  exportarMarkdown: vi.fn().mockReturnValue('# Simulacion\n\n'),
  exportarPDF: vi.fn().mockResolvedValue(true),
  exportarKMZ: vi.fn().mockReturnValue({ type: 'FeatureCollection', features: [] }),
  exportarCSV: vi.fn().mockReturnValue('tiempo_min,hectareas\n'),
  descargarArchivo: vi.fn(),
}))

import {
  chat_consultar,
  despacho_desplegar,
  simulacion_aplicar_retardante,
  simulacion_control,
  chat_exportar,
  analisis_estadisticas,
  meteo_actual,
  simulacion_estado,
} from '../pages/simulador3d/api_cliente.js'

describe('chat_consultar', () => {
  it('debe retornar respuesta con campos requeridos', async () => {
    const result = await chat_consultar({ pregunta: '¿Cuál es el ROS?', simulacion_id: 'test' })
    expect(result).toHaveProperty('respuesta')
    expect(result).toHaveProperty('timestamp')
    expect(result).toHaveProperty('modelo')
    expect(typeof result.respuesta).toBe('string')
    expect(result.respuesta.length).toBeGreaterThan(0)
  })

  it('debe incluir latencia_s', async () => {
    const result = await chat_consultar({ pregunta: 'test', simulacion_id: 'test' })
    expect(result).toHaveProperty('latencia_s')
    expect(result.latencia_s).toBeGreaterThanOrEqual(0)
  })
})

describe('despacho_desplegar', () => {
  it('debe retornar ok con ETA', async () => {
    const result = await despacho_desplegar({ recurso_id: 'R-22', lat: -41.47, lng: -72.94 })
    expect(result.ok).toBe(true)
    expect(result.recurso_id).toBe('R-22')
    expect(result).toHaveProperty('eta_min')
    expect(result.eta_min).toBeGreaterThan(0)
  })
})

describe('simulacion_aplicar_retardante', () => {
  it('debe retornar ok con efecto estimado', async () => {
    const result = await simulacion_aplicar_retardante({
      producto: 'Phos-Chek',
      volumen: 1200,
      zona: { lat: -41.47, lng: -72.94, radio: 500 }
    })
    expect(result.ok).toBe(true)
    expect(result.producto).toBe('Phos-Chek')
    expect(result).toHaveProperty('efecto_estimado')
  })
})

describe('simulacion_control', () => {
  it('pausar debe retornar ok', async () => {
    const result = await simulacion_control({ accion: 'pausar' })
    expect(result.ok).toBe(true)
    expect(result.accion).toBe('pausar')
  })

  it('reanudar debe retornar ok', async () => {
    const result = await simulacion_control({ accion: 'reanudar' })
    expect(result.ok).toBe(true)
  })

  it('reiniciar debe retornar ok', async () => {
    const result = await simulacion_control({ accion: 'reiniciar' })
    expect(result.ok).toBe(true)
  })
})

describe('chat_exportar', () => {
  it('markdown debe retornar ok', async () => {
    const result = await chat_exportar({ conversacion_id: 'test', formato: 'markdown' })
    expect(result.ok).toBe(true)
    expect(result.formato).toBe('markdown')
  })
})

describe('analisis_estadisticas', () => {
  it('debe retornar objeto con campos de estadísticas', async () => {
    const result = await analisis_estadisticas()
    expect(result).toHaveProperty('tiempo_min')
    expect(result).toHaveProperty('hectareas')
    expect(result).toHaveProperty('ros')
    expect(result).toHaveProperty('timestamp')
  })
})

describe('meteo_actual', () => {
  it('debe retornar datos meteorológicos', async () => {
    const result = await meteo_actual()
    expect(result).toHaveProperty('vel_kmh')
    expect(result).toHaveProperty('dir_grados')
  })
})

describe('simulacion_estado', () => {
  it('debe retornar estado con ok: true', async () => {
    const result = await simulacion_estado()
    expect(result.ok).toBe(true)
    expect(result).toHaveProperty('estado')
    expect(result).toHaveProperty('timestamp')
  })
})
