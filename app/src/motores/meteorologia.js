// Meteorologia Open-Meteo. Seccion 5.4 del documento insumo.
// Endpoint de cliente #8: cargarMeteo(lat, lon, fecha, dias)
// Fetch directo desde el navegador (sin backend), real, sin API key.

export function calcularFWISimplificado(temp, hr, vientoKmh, precipitacion) {
  // FWI canadiense real requiere estado previo (varios dias) que no
  // tenemos aqui; se usa una formula simplificada propia, documentada
  // como aproximacion (ver metadatos.json -> supuestos).
  if (precipitacion > 0) return 0
  const base = Math.max(0, (temp - 10) * 1.5 + (100 - hr) * 0.3 + vientoKmh * 0.4)
  return Math.round(Math.min(100, base) * 10) / 10
}

export function procesarFWI(horario) {
  const n = horario.time.length
  const out = []
  for (let i = 0; i < n; i++) {
    const hr = horario.relative_humidity_2m[i]
    const vientoKmh = horario.wind_speed_10m[i] * 3.6
    const temp = horario.temperature_2m[i]
    const precip = horario.precipitation[i] ?? 0
    out.push({
      hora: horario.time[i],
      temp,
      hr,
      vientoKmh,
      dirVientoGrados: horario.wind_direction_10m[i],
      precipitacion: precip,
      humedadFino: 30 * Math.pow(hr / 100, 2),
      fwiIndice: calcularFWISimplificado(temp, hr, vientoKmh, precip),
    })
  }
  return out
}

export async function cargarMeteo(lat, lon, fecha, dias = 3) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m',
    timezone: 'America/Santiago',
    forecast_days: String(Math.max(1, Math.min(16, dias))),
    // Open-Meteo devuelve wind_speed_10m en km/h por defecto (verificado
    // en ejercicio/salidas/open_meteo_real.json). Se fuerza m/s aqui para
    // que procesarFWI() pueda convertir *3.6 como describe la Seccion 5.4
    // del documento insumo sin duplicar la conversion.
    wind_speed_unit: 'ms',
  })
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Open-Meteo HTTP ${resp.status}`)
  const data = await resp.json()
  return { fuente: url, crudo: data, procesado: procesarFWI(data.hourly) }
}
