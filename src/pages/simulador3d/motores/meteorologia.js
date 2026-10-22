// Módulo meteorología - Open-Meteo con fallback a n8n webhook
// n8n webhook proxy actualiza cada hora: menos latencia, más resiliente

// URL del webhook n8n (se actualiza en metadatos.json tras crear el flujo)
const N8N_WEBHOOK_URL = 'https://n8n.conaf.cl/webhook/meteo-loslagos'

// URL directa Open-Meteo (fallback)
function buildOpenMeteoURL(lat, lon, dias = 3) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m',
    timezone: 'America/Santiago',
    forecast_days: dias.toString(),
  })
  return `https://api.open-meteo.com/v1/forecast?${params}`
}

/**
 * Cargar meteorología con fallback
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Object>} Datos meteorológicos procesados
 */
export async function cargarMeteo(lat = -41.47, lon = -72.94) {
  // Intentar n8n webhook primero
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const r = await fetch(N8N_WEBHOOK_URL, { signal: controller.signal })
    clearTimeout(timeout)
    if (r.ok) {
      const data = await r.json()
      if (data.datos && data.datos.hourly) {
        return procesarDatosMeteo(data.datos, lat, lon, 'n8n-webhook')
      }
    }
  } catch (e) {
    // Fallback silencioso
  }

  // Fallback a Open-Meteo directo
  const url = buildOpenMeteoURL(lat, lon)
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Open-Meteo error: ${r.status}`)
  const data = await r.json()
  return procesarDatosMeteo(data, lat, lon, 'open-meteo-directo')
}

/**
 * Procesar datos de Open-Meteo al formato interno
 */
export function procesarDatosMeteo(data, lat, lon, fuente = 'open-meteo') {
  const { hourly } = data
  if (!hourly) return null

  const horas = hourly.time || []
  const resultado = horas.map((hora, idx) => {
    const temp = hourly.temperature_2m?.[idx] ?? 20
    const hr = hourly.relative_humidity_2m?.[idx] ?? 40
    const precip = hourly.precipitation?.[idx] ?? 0
    const vel_ms = hourly.wind_speed_10m?.[idx] ?? 5
    const dir = hourly.wind_direction_10m?.[idx] ?? 270

    // Velocidad m/s → km/h
    const vel_kmh = vel_ms * 3.6

    // Humedad combustible fino empírica
    const hum_fino = 30 * Math.pow(hr / 100, 2)

    // FWI simplificado
    const fwi = calcularFWI(temp, hr, vel_kmh, precip)

    return {
      hora,
      idx,
      temp,
      hr,
      precip,
      vel_kmh,
      vel_ms,
      dir_grados: dir,
      hum_fino,
      fwi,
    }
  })

  return {
    lat,
    lon,
    fuente,
    generado: new Date().toISOString(),
    horas: resultado,
    actual: resultado[0] || null,
  }
}

/**
 * FWI canadiense simplificado
 */
function calcularFWI(temp, hr, vel_kmh, precip) {
  // FFMC simplificado
  const ffmc = 85.0 + (temp - 20) * 0.5 - hr * 0.3 - precip * 10
  const clamped = Math.max(0, Math.min(101, ffmc))
  // ISI = viento * FFMC
  const isi = vel_kmh * 0.01 * clamped
  // BUI simplificado
  const bui = Math.max(0, (temp / 15) * 20 - hr * 0.1)
  // FWI
  return Math.max(0, (isi * bui) / 50)
}

/**
 * Obtener condición actual
 */
export async function meteoActual(lat = -41.47, lon = -72.94) {
  const datos = await cargarMeteo(lat, lon)
  return datos?.actual || { vel_kmh: 15, dir_grados: 270, hr: 30, temp: 25, hum_fino: 8 }
}

export default { cargarMeteo, meteoActual, procesarDatosMeteo }
