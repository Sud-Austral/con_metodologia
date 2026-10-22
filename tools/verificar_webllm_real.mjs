// Medicion limpia y honesta de WebLLM real: deteccion de WebGPU, tiempo de
// descarga/carga del modelo, y latencia de una respuesta real. Se corrio
// esto porque verificar_casos_uso.mjs revelo, sin buscarlo, que WebGPU SI
// esta disponible en este Chrome headless (a diferencia de lo que mostro
// verificar_app.mjs, que lanzaba Chrome con flags --use-angle=swiftshader
// que aparentemente desactivan el backend WebGPU). Ver EQUIVOCACIONES.md.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'ejercicio/salidas'

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.on('console', (m) => console.log('[console]', m.text()))
  await page.goto('http://localhost:8787/index.html', { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 2000))

  console.log('Iniciando inicializarLLM() real, esto puede tardar varios minutos (descarga del modelo)...')
  const resultado = await page.evaluate(async () => {
    const { detectarWebGPU, inicializarLLM, chat } = await import('./src/ia/clienteLLM.js')
    const gpu = await detectarWebGPU()
    const t0 = performance.now()
    const init = await inicializarLLM()
    const tInit = (performance.now() - t0) / 1000
    let respuestaPrueba = null
    if (init.ok) {
      respuestaPrueba = await chat('Eres un asistente breve.', 'Responde solo con la palabra OK.', {})
    }
    return { gpuDisponible: gpu.disponible, gpuMotivo: gpu.motivo, init, tInit, respuestaPrueba }
  })

  console.log(JSON.stringify(resultado, null, 2))
  fs.writeFileSync(`${OUT}/webllm_real_medicion.json`, JSON.stringify(resultado, null, 2))
  await browser.close()
}

main().catch((e) => { console.error('FALLO:', e); process.exit(1) })
