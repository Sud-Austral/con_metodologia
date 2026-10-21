import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'ejercicio/salidas'

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.on('console', m => console.log('[console]', m.text()))
  page.on('pageerror', e => console.log('[pageerror]', e.message))
  await page.goto('http://localhost:8787/index.html', { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(r => setTimeout(r, 4000))
  // generar un poco de historia de simulacion
  await new Promise(r => setTimeout(r, 6000))

  const resultado = await page.evaluate(async () => {
    const { chatExportar } = await import('./src/endpoints.js')
    const { exportarKMZ, gridAPoligonoKML } = await import('./src/exportar/exportar.js')
    const { listarMensajes, listarDecisiones, guardarMensaje } = await import('./src/persistencia/db.js')
    const { estadoSimulacion } = await import('./src/estado.js')
    const { gridAPerimetro } = await import('./src/motores/ca_propagacion.js')

    await guardarMensaje({ conversacion_id: estadoSimulacion.simulacion_id, rol: 'user', contenido: 'Exporta todo a PDF' })
    const mensajes = await listarMensajes(estadoSimulacion.simulacion_id)
    const decisiones = await listarDecisiones()

    let pdfInfo = null
    try {
      const pdf = await chatExportar({ conversacion_id: estadoSimulacion.simulacion_id, formato: 'pdf', mensajes, decisiones })
      const buf = await pdf.blob.arrayBuffer()
      pdfInfo = { ok: true, bytes: buf.byteLength, base64: btoa(String.fromCharCode(...new Uint8Array(buf))) }
    } catch (e) {
      pdfInfo = { ok: false, error: e.message }
    }

    let kmzInfo = null
    try {
      const perimetro = gridAPerimetro(estadoSimulacion.grid)
      const r = await exportarKMZ(perimetro, estadoSimulacion.lat, estadoSimulacion.lng, 13)
      if (r.kmz) {
        const buf = await r.kmz.arrayBuffer()
        kmzInfo = { ok: true, tipo: 'kmz', bytes: buf.byteLength, base64: btoa(String.fromCharCode(...new Uint8Array(buf))), perimetroCeldas: perimetro.length }
      } else {
        kmzInfo = { ok: true, tipo: 'kml-sin-comprimir', nota: r.nota, kml: r.kml, perimetroCeldas: perimetro.length }
      }
    } catch (e) {
      kmzInfo = { ok: false, error: e.message }
    }

    return { pdfInfo, kmzInfo }
  })

  if (resultado.pdfInfo.ok) {
    fs.writeFileSync(`${OUT}/analisis_ia_exportado.pdf`, Buffer.from(resultado.pdfInfo.base64, 'base64'))
    console.log('PDF generado:', resultado.pdfInfo.bytes, 'bytes ->', `${OUT}/analisis_ia_exportado.pdf`)
  } else {
    console.log('PDF FALLO:', resultado.pdfInfo.error)
  }

  if (resultado.kmzInfo.ok && resultado.kmzInfo.tipo === 'kmz') {
    fs.writeFileSync(`${OUT}/perimetro_exportado.kmz`, Buffer.from(resultado.kmzInfo.base64, 'base64'))
    console.log('KMZ generado:', resultado.kmzInfo.bytes, 'bytes, perimetro de', resultado.kmzInfo.perimetroCeldas, 'celdas ->', `${OUT}/perimetro_exportado.kmz`)
  } else if (resultado.kmzInfo.ok) {
    fs.writeFileSync(`${OUT}/perimetro_exportado.kml`, resultado.kmzInfo.kml)
    console.log('KMZ no disponible (', resultado.kmzInfo.nota, '), se guardo .kml sin comprimir, perimetro de', resultado.kmzInfo.perimetroCeldas, 'celdas')
  } else {
    console.log('KMZ/KML FALLO:', resultado.kmzInfo.error)
  }

  fs.writeFileSync(`${OUT}/verificacion_pdf_kmz.json`, JSON.stringify({
    pdf: { ok: resultado.pdfInfo.ok, bytes: resultado.pdfInfo.bytes, error: resultado.pdfInfo.error },
    kmz: { ok: resultado.kmzInfo.ok, tipo: resultado.kmzInfo.tipo, bytes: resultado.kmzInfo.bytes, nota: resultado.kmzInfo.nota, perimetroCeldas: resultado.kmzInfo.perimetroCeldas, error: resultado.kmzInfo.error },
  }, null, 2))

  await browser.close()
}

main().catch(e => { console.error('FALLO:', e); process.exit(1) })
