// Descarga y decodificación DEM desde tiles Terrarium (Mapzen/AWS)
// Formato Terrarium: elev = (R*256 + G + B/256) - 32768

/**
 * Calcular bounds para lat/lng + radioKm
 */
export function calcularBounds(lat, lng, radioKm) {
  const dlat = radioKm / 111.32
  const dlng = radioKm / (111.32 * Math.cos(lat * Math.PI / 180))
  return {
    sur: lat - dlat, norte: lat + dlat,
    oeste: lng - dlng, este: lng + dlng,
  }
}

/**
 * Calcular tile XYZ para lat/lng/zoom
 */
export function latLngToTile(lat, lng, zoom) {
  const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom))
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))
  return { x, y, z: zoom }
}

/**
 * Cargar tile Terrarium y decodificar a elevación
 */
async function cargarTile(x, y, z) {
  // Terrarium tiles (AWS Terrain Tiles)
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`

  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) throw new Error(`Tile ${z}/${x}/${y} falló: ${response.status}`)

  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)

  const pixels = imageData.data
  const w = bitmap.width
  const h = bitmap.height
  const elev = new Float32Array(w * h)

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    elev[i / 4] = (r * 256 + g + b / 256) - 32768
  }

  return { elev, width: w, height: h }
}

/**
 * Cargar DEM para zona
 * @param {number} lat - Latitud central
 * @param {number} lng - Longitud central
 * @param {number} radioKm - Radio en km
 * @returns {Promise<Float32Array>} DEM en Float32Array
 */
export async function cargarDEM(lat, lng, radioKm = 2) {
  const zoom = 13  // ~10m resolución en zoom 13
  const tile = latLngToTile(lat, lng, zoom)

  try {
    const { elev, width, height } = await cargarTile(tile.x, tile.y, tile.z)
    return elev
  } catch(e) {
    console.warn('Terrarium falló, usando DEM sintético:', e.message)
    return generarDEMSintetico(240, 240)
  }
}

/**
 * DEM sintético de fallback (terreno con variación realista)
 */
export function generarDEMSintetico(cols, rows) {
  const dem = new Float32Array(cols * rows)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c / cols
      const y = r / rows
      // Terreno con pendiente suave + ruido
      dem[r * cols + c] = 100 + x * 300 + y * 200
        + Math.sin(x * 8) * 30 + Math.cos(y * 6) * 25
        + (Math.random() - 0.5) * 15
    }
  }
  return dem
}

export default { cargarDEM, calcularBounds, generarDEMSintetico }
