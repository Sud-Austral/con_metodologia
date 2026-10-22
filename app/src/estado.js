// Estado de la simulacion en memoria (reemplaza grid_ca + BD del backend
// FastAPI de la Seccion 7 del documento insumo: aqui todo vive en el
// cliente). Un solo objeto mutable, simple a proposito para este MVP.

export const estadoSimulacion = {
  simulacion_id: 'demo-coigue1',
  nombre: 'Los Lagos — Coigue-1 (demo)',
  pausado: false,
  tiempo_min: 0,
  lat: -41.47,
  lng: -72.70,
  dir_viento: 270,
  vel_viento: 22,
  hum_combustible: 9,
  modelo: 'K2',
  grid: null, // asignado por escena3D.js tras initCA
  hectareas: 0,
  ros_cabeza: 0,
  altura_llama: 0,
  recursos: [
    { id: 'R-22', tipo: 'Brigada', estado: 'Base', lat: -41.49, lng: -72.72 },
    { id: 'H-01', tipo: 'Helicoptero', estado: 'Base', lat: -41.46, lng: -72.68 },
  ],
  amenazadas: [
    { nombre: 'Escuela Pucatrihue', lat: -41.45, lng: -72.69, distancia_km: 4.5 },
  ],
  serieEstadisticas: [], // {tiempo_min, hectareas, ros_m_min}
  retardanteActivo: null,
}

export function recursosMarkdown() {
  return estadoSimulacion.recursos.map(r => `- ${r.id} (${r.tipo}): ${r.estado}`).join('\n')
}

export function amenazadasMarkdown() {
  return estadoSimulacion.amenazadas.map(a => `- ${a.nombre}: ${a.distancia_km} km`).join('\n')
}

export function snapshotEstadisticas() {
  const e = estadoSimulacion
  return {
    nombre: e.nombre,
    minutos: e.tiempo_min,
    hectareas: e.hectareas,
    ros_cabeza: e.ros_cabeza,
    altura_llama: e.altura_llama,
    dir_viento: e.dir_viento,
    vel_viento: e.vel_viento,
    hum_combustible: e.hum_combustible,
    modelo: e.modelo,
    lat: e.lat,
    lng: e.lng,
    recursos_markdown: recursosMarkdown(),
    amenazadas_markdown: amenazadasMarkdown(),
  }
}
