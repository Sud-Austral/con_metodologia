// Carga de relieve digital (DEM). Seccion 5.1 del documento insumo.
// Endpoint de cliente #7: cargarDEM(lat, lng, radioKm)
//
// Cadena de fallback real (documentada en metadatos.json):
// 1) Terrarium tiles (Mapzen/AWS, HTTP publico) -> decodificarRGB
// 2) Si falla: DEM sintetico por ruido de valor (no hay
//    /public/dem_ll24_200m.tif en este repo: nace vacio, no existe el
//    archivo "ya existe" que menciona el documento -> ver supuestos).
//
// decodificarRGB y remuestrear son puras (testeadas en Node sin DOM).

export function decodificarRGB(pixels) {
  // pixels: Uint8ClampedArray tipo ImageData.data (RGBA)
  const elev = new Float32Array(pixels.length / 4)
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    elev[i / 4] = (r * 256 + g + b / 256) - 32768
  }
  return elev
}

export function remuestrear(dem, nxOrig, nyOrig, nxDest, nyDest) {
  const out = new Float32Array(nxDest * nyDest)
  for (let j = 0; j < nyDest; j++) {
    for (let i = 0; i < nxDest; i++) {
      const srcI = Math.min(nxOrig - 1, Math.floor((i / nxDest) * nxOrig))
      const srcJ = Math.min(nyOrig - 1, Math.floor((j / nyDest) * nyOrig))
      out[j * nxDest + i] = dem[srcJ * nxOrig + srcI]
    }
  }
  return out
}

export function calcularPendiente(dem, nx, ny, cellSizeM) {
  const pend = new Float32Array(nx * ny)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const idx = j * nx + i
      const e = dem[idx]
      const eE = dem[j * nx + Math.min(nx - 1, i + 1)]
      const eS = dem[Math.min(ny - 1, j + 1) * nx + i]
      const dzdx = (eE - e) / cellSizeM
      const dzdy = (eS - e) / cellSizeM
      pend[idx] = Math.sqrt(dzdx * dzdx + dzdy * dzdy) * 100 // en %
    }
  }
  return pend
}

// DEM sintetico determinista (seedable) para cuando no hay Terrarium ni
// archivo local. Usa suma de senos (sin dependencias) para producir una
// superficie con colinas, no un plano perfecto.
export function generarDEMSintetico(nx, ny, seed = 1) {
  const dem = new Float32Array(nx * ny)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = i / nx, y = j / ny
      dem[j * nx + i] = 150
        + 120 * Math.sin((x * 3 + seed) * Math.PI)
        + 90 * Math.cos((y * 2.3 + seed * 0.7) * Math.PI)
        + 40 * Math.sin((x * 7 + y * 5) * Math.PI)
    }
  }
  return dem
}

function tileXYZDeLatLng(lat, lng, zoom) {
  const n = 2 ** zoom
  const x = Math.floor((lng + 180) / 360 * n)
  const latRad = lat * Math.PI / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return { x, y, z: zoom }
}

export async function fetchTerrariumTile(lat, lng, zoom = 11) {
  const { x, y, z } = tileXYZDeLatLng(lat, lng, zoom)
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Terrarium HTTP ${resp.status}`)
  return resp
}

// cargarDEM: endpoint de cliente. En navegador usa Terrarium real via
// <img>/canvas; en Node (sin DOM) o si Terrarium falla, cae a sintetico.
export async function cargarDEM(lat, lng, radioKm, nx = 240, ny = 240) {
  const tieneDOM = typeof document !== 'undefined' && typeof Image !== 'undefined'
  if (!tieneDOM) {
    return { dem: generarDEMSintetico(nx, ny), fuente: 'sintetico (sin DOM / Node)', nx, ny }
  }
  try {
    const resp = await fetchTerrariumTile(lat, lng)
    const blob = await resp.blob()
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const demCrudo = decodificarRGB(data)
    const dem13m = remuestrear(demCrudo, bitmap.width, bitmap.height, nx, ny)
    return { dem: dem13m, fuente: 'terrarium', nx, ny }
  } catch (e) {
    console.warn('Terrarium fallo, usando DEM sintetico:', e.message)
    return { dem: generarDEMSintetico(nx, ny), fuente: `sintetico (fallback: ${e.message})`, nx, ny }
  }
}
