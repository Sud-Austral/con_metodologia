import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.goto('http://localhost:8787/index.html', { waitUntil: 'networkidle2', timeout: 60000 })
  const r = await page.evaluate(async () => {
    const { cargarDEM } = await import('./src/motores/descarga_dem.js')
    const res = await cargarDEM(-41.47, -72.70, 5, 32, 32)
    return { fuente: res.fuente, nx: res.nx, ny: res.ny, len: res.dem.length, muestra: Array.from(res.dem.slice(0, 5)) }
  })
  console.log(JSON.stringify(r, null, 2))
  fs.writeFileSync('ejercicio/salidas/cargarDEM_terrarium_browser_real.json', JSON.stringify(r, null, 2))
  await browser.close()
}
main().catch(e => { console.error('FALLO', e); process.exit(1) })
