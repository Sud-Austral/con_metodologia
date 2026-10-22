// Verificacion con Chrome real (headless) via puppeteer-core.
// Ejecutar: node tools/verificar_app.mjs
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const URL_APP = 'http://localhost:8787/index.html'
const OUT = 'ejercicio/salidas'

function log(...args) { console.log(new Date().toISOString(), ...args) }

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--enable-unsafe-webgpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--no-sandbox'],
  })
  const page = await browser.newPage()
  const consola = []
  page.on('console', (msg) => consola.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', (err) => consola.push(`[pageerror] ${err.message}`))
  await page.setViewport({ width: 1366, height: 800 })

  log('navegando a', URL_APP)
  await page.goto(URL_APP, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(r => setTimeout(r, 4000))

  const webgpuBadge = await page.$eval('#webgpu-badge', el => el.textContent).catch(() => 'NO ENCONTRADO')
  const fpsBadge = await page.$eval('#fps-badge', el => el.textContent).catch(() => 'NO ENCONTRADO')
  log('webgpu-badge:', webgpuBadge)
  log('fps-badge:', fpsBadge)

  await page.screenshot({ path: `${OUT}/captura_01_carga_inicial.png` })

  // Caso de uso 1: pregunta de lectura simple en el chat
  await page.type('#chat-input', '¿Cual es el ROS actual?')
  await page.click('#chat-enviar')
  await new Promise(r => setTimeout(r, 6000))
  await page.screenshot({ path: `${OUT}/captura_02_chat_respuesta.png` })
  const historialTexto = await page.$eval('#chat-historial', el => el.textContent).catch(() => '')

  // Caso de uso 2: comando de despliegue
  await page.type('#chat-input', 'Desplegar Brigada R-22 al norte, acceso Los Copihues')
  await page.click('#chat-enviar')
  await new Promise(r => setTimeout(r, 6000))
  await page.screenshot({ path: `${OUT}/captura_03_chat_comando.png` })
  const historialTexto2 = await page.$eval('#chat-historial', el => el.textContent).catch(() => '')

  // Persistencia: recargar la pagina y comprobar que el historial de
  // chat se recupera desde IndexedDB (requisito del ejercicio). Se
  // compara contra el conteo real en IndexedDB, no contra los <div class
  // ="msg"> del DOM: estos incluyen burbujas de confirmacion ("Comando
  // ejecutado...") que son solo UI y nunca se persisten (bug de medicion
  // detectado y corregido, ver EQUIVOCACIONES.md).
  const numMensajesEnDBAntes = await page.evaluate(async () => {
    const { listarMensajes } = await import('./src/persistencia/db.js')
    const { estadoSimulacion } = await import('./src/estado.js')
    return (await listarMensajes(estadoSimulacion.simulacion_id)).length
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 2500))
  const numMensajesTrasRecargar = (await page.$$('.msg')).length
  await page.screenshot({ path: `${OUT}/captura_06_tras_recargar_persistencia.png` })

  // Pestana ANALISIS
  await page.evaluate(() => document.querySelector('[data-tab="ANALISIS"]').click())
  await new Promise(r => setTimeout(r, 1500))
  await page.screenshot({ path: `${OUT}/captura_04_pestana_analisis.png` })

  // Pestana REPORTES: exportar markdown
  await page.evaluate(() => document.querySelector('[data-tab="REPORTES"]').click())
  await new Promise(r => setTimeout(r, 500))
  await page.screenshot({ path: `${OUT}/captura_05_pestana_reportes.png` })

  // Descarga via <a download> es poco confiable en Chrome headless (no
  // dispara Browser.setDownloadBehavior de forma consistente). Para
  // verificar el CONTENIDO real exportado se invoca el endpoint de
  // cliente directamente dentro de la pagina y se trae el texto a Node.
  const exportados = await page.evaluate(async () => {
    const { chatExportar } = await import('./src/endpoints.js')
    const { listarMensajes, listarDecisiones } = await import('./src/persistencia/db.js')
    const { exportarCSV } = await import('./src/exportar/exportar.js')
    const { estadoSimulacion } = await import('./src/estado.js')
    const mensajes = await listarMensajes(estadoSimulacion.simulacion_id)
    const decisiones = await listarDecisiones()
    const md = await chatExportar({ conversacion_id: estadoSimulacion.simulacion_id, formato: 'markdown', mensajes, decisiones })
    const mdTexto = await md.blob.text()
    const csvTexto = exportarCSV(estadoSimulacion.serieEstadisticas)
    const json = await chatExportar({ conversacion_id: estadoSimulacion.simulacion_id, formato: 'json', mensajes, decisiones })
    const jsonTexto = await json.blob.text()
    return { mdTexto, csvTexto, jsonTexto, numMensajesEnIndexedDB: mensajes.length }
  })
  fs.writeFileSync(`${OUT}/analisis_ia_exportado.md`, exportados.mdTexto)
  fs.writeFileSync(`${OUT}/estadisticas_exportado.csv`, exportados.csvTexto)
  fs.writeFileSync(`${OUT}/analisis_ia_exportado.json`, exportados.jsonTexto)
  const statusMd = `markdown: ${exportados.mdTexto.length} caracteres, mensajes en IndexedDB: ${exportados.numMensajesEnIndexedDB}`
  const statusCsv = `csv: ${exportados.csvTexto.split('\n').length} lineas`

  // FPS/ms-tick final
  await new Promise(r => setTimeout(r, 3000))
  const fpsBadgeFinal = await page.$eval('#fps-badge', el => el.textContent).catch(() => 'NO ENCONTRADO')

  const resultado = {
    webgpuBadge, fpsBadge, fpsBadgeFinal,
    statusExportarMarkdown: statusMd, statusExportarCsv: statusCsv,
    historialTras_pregunta_simple: historialTexto,
    historialTras_comando_desplegar: historialTexto2,
    persistencia: { numMensajesEnDBAntes, numMensajesTrasRecargar, recupera: numMensajesTrasRecargar === numMensajesEnDBAntes && numMensajesTrasRecargar > 0 },
    consola,
  }
  fs.writeFileSync(`${OUT}/verificacion_app_real.json`, JSON.stringify(resultado, null, 2))
  log('RESULTADO:', JSON.stringify(resultado, null, 2))

  await browser.close()
}

main().catch((e) => { console.error('FALLO VERIFICACION:', e); process.exit(1) })
