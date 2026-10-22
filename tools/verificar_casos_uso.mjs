// Reproduce los 8 casos de uso de la Seccion 9 del documento insumo contra
// la app real en Chrome headless. Como no hay WebGPU en este entorno
// (verificado), las respuestas usan el fallback por plantilla: para los
// casos que requieren razonamiento del LLM (3, 4, 6 y parte del 7) se
// documenta honestamente que NO se pudo verificar la calidad de
// razonamiento de IA real, solo que el pipeline completo (parseo intencion
// -> ejecucion -> persistencia -> export) funciona de punta a punta.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'ejercicio/salidas'

const CASOS = [
  { n: 1, nombre: 'Lectura Simple', texto: '¿Cual es el ROS actual?' },
  { n: 2, nombre: 'Control — Desplegar Brigada', texto: 'Desplegar Brigada R-22 al norte, acceso Los Copihues' },
  { n: 3, nombre: 'Proyeccion Alternativa', texto: '¿Que pasa si el viento sube a 35 km/h en 30 minutos?' },
  { n: 4, nombre: 'Analisis Estrategico', texto: '¿Brigada al norte o al este?' },
  { n: 5, nombre: 'Guardado de Decision', texto: 'Guarda la estrategia actual' },
  { n: 6, nombre: 'Analisis de Amenaza', texto: 'Cual es el riesgo para Puerto Montt' },
  { n: 7, nombre: 'Multi-turno (1/2)', texto: '¿Hay alternativa sin helicoptero?' },
  { n: 8, nombre: 'Multi-turno (2/2) + intento de exportacion por chat', texto: 'Exporta todo a PDF' },
]

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.goto('http://localhost:8787/index.html', { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(r => setTimeout(r, 4000))

  const transcripcion = []
  for (const caso of CASOS) {
    await page.evaluate(() => { document.getElementById('chat-input').value = '' })
    await page.waitForFunction(() => !document.getElementById('chat-enviar').disabled, { timeout: 15000 }).catch(() => {})
    await page.type('#chat-input', caso.texto)
    await page.click('#chat-enviar')
    // Esperar a que desaparezca el placeholder "Pensando..." (no solo a
    // que aparezca un mensaje nuevo: el placeholder sincronico satisfacia
    // la condicion antes de tiempo, bug real detectado, ver
    // EQUIVOCACIONES.md).
    await page.waitForFunction(() => {
      const msgs = document.querySelectorAll('.msg')
      const ultimo = msgs[msgs.length - 1]
      return ultimo && !ultimo.textContent.includes('Pensando')
    }, { timeout: 20000 }).catch(() => {})
    await new Promise(r => setTimeout(r, 500))
    const mensajes = await page.$$eval('.msg', els => els.map(e => e.textContent))
    transcripcion.push({ caso: caso.n, nombre: caso.nombre, pregunta: caso.texto, ultimos_mensajes: mensajes.slice(-3) })
  }

  const decisionesGuardadas = await page.evaluate(async () => {
    const { listarDecisiones } = await import('./src/persistencia/db.js')
    return listarDecisiones()
  })

  fs.writeFileSync(`${OUT}/casos_de_uso_transcripcion.json`, JSON.stringify({ transcripcion, decisionesGuardadas }, null, 2))
  console.log(JSON.stringify({ transcripcion, decisionesGuardadas }, null, 2))

  await browser.close()
}

main().catch(e => { console.error('FALLO:', e); process.exit(1) })
