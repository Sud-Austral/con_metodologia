// Cache OSM con Overpass API e IndexedDB
// Descarga una sola vez y usa caché local

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const CACHE_KEY = 'osm-cache-v1'

/**
 * Cargar datos OSM de una zona
 */
export async function cargarCiudad(lat, lng, radioKm = 3) {
  const cacheKey = `osm-${lat.toFixed(2)}-${lng.toFixed(2)}-${radioKm}`

  // Intentar caché IndexedDB
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const data = JSON.parse(cached)
      if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {  // 7 días
        return data.geometrias
      }
    }
  } catch(e) {}

  // Calcular bounds
  const dlat = radioKm / 111.32
  const dlng = radioKm / (111.32 * Math.cos(lat * Math.PI / 180))
  const sur = lat - dlat, norte = lat + dlat
  const oeste = lng - dlng, este = lng + dlng

  const query = `[out:json][timeout:30][bbox:${sur},${oeste},${norte},${este}];
(
  way["building"];
  way["highway"~"primary|secondary|tertiary|residential"];
  node["amenity"~"hospital|fire_station|school"];
);
out geom;`

  try {
    const resp = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    if (!resp.ok) throw new Error(`Overpass error: ${resp.status}`)
    const data = await resp.json()
    const geometrias = procesarOSM(data, lat, lng)

    // Guardar en caché
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), geometrias }))
    } catch(e) {}

    return geometrias
  } catch(e) {
    console.warn('OSM falló:', e.message)
    return { edificios: [], calles: [], servicios: [] }
  }
}

/**
 * Procesar respuesta OSM a geometrías Three.js-ready
 */
export function procesarOSM(data, latRef, lngRef) {
  const edificios = []
  const calles = []
  const servicios = []

  const METRO_POR_GRADO = 111320

  function latLngToLocal(lat, lng) {
    const x = (lng - lngRef) * METRO_POR_GRADO * Math.cos(latRef * Math.PI / 180)
    const z = (lat - latRef) * METRO_POR_GRADO
    return [x, z]
  }

  for (const elem of (data.elements || [])) {
    if (elem.type === 'way' && elem.geometry) {
      const coords = elem.geometry.map(p => latLngToLocal(p.lat, p.lon))

      if (elem.tags?.building) {
        const altura = parseInt(elem.tags?.height || elem.tags?.['building:levels'] || '3') * 3
        edificios.push({ coords, altura: Math.max(3, Math.min(altura, 30)), tags: elem.tags })
      } else if (elem.tags?.highway) {
        calles.push({ coords, tipo: elem.tags.highway })
      }
    }

    if (elem.type === 'node' && elem.tags?.amenity) {
      const [x, z] = latLngToLocal(elem.lat, elem.lon)
      servicios.push({
        x, z,
        tipo: elem.tags.amenity,
        nombre: elem.tags.name || elem.tags.amenity,
        lat: elem.lat,
        lng: elem.lon,
        critico: ['hospital', 'fire_station', 'school'].includes(elem.tags.amenity)
      })
    }
  }

  return { edificios, calles, servicios }
}

export default { cargarCiudad, procesarOSM }
