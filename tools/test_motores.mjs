// Pruebas Node (sin DOM) de los motores puros. Ejecutar:
//   node tools/test_motores.mjs
import { calcularROS, alturaLlama } from '../app/src/motores/rothermel.js'
import { MODELOS_KITRAL, clasificarCombustible } from '../app/src/motores/kitral.js'
import { initCA, tickCA, calcularSuperficieHa, gridAFrente, gridAPerimetro, ESTADO } from '../app/src/motores/ca_propagacion.js'
import { generarDEMSintetico, calcularPendiente, decodificarRGB, remuestrear } from '../app/src/motores/descarga_dem.js'
import { procesarFWI, calcularFWISimplificado } from '../app/src/motores/meteorologia.js'
import { parseadorIntenciones } from '../app/src/ia/parseadorIntenciones.js'
import { exportarMarkdown, exportarCSV, gridAPoligonoKML } from '../app/src/exportar/exportar.js'

let fallas = 0
let total = 0
function assert(cond, nombre, detalle = '') {
  total++
  if (cond) {
    console.log(`PASS - ${nombre}`)
  } else {
    fallas++
    console.log(`FAIL - ${nombre} ${detalle}`)
  }
}

console.log('=== Rothermel / KITRAL ===')
const rosK1Seco = calcularROS('K1', 0, 0, 2)
// Prueba de mutacion ejecutada y documentada en ejercicio/EQUIVOCACIONES.md
// y ejercicio/salidas/test_motores_fallida.txt: con valor esperado 9999
// (incorrecto a proposito) esta asercion fallo, confirmando que el arnes
// detecta errores reales. Valor correcto medido: 2.7 m/min.
assert(Math.abs(rosK1Seco - 2.7) < 0.05, 'ROS K1 viento=0 pend=0 hum=2% ~= 2.7 m/min', `valor real=${rosK1Seco}`)

assert(calcularROS('K2', 0, 0, 30) === 0, 'ROS=0 cuando humedad >= humedadExtincion', `modelo K2 extincion=${MODELOS_KITRAL.K2.humedadExtincion}`)
assert(calcularROS('K1', 40, 20, 9) > calcularROS('K1', 0, 0, 9), 'ROS sube con viento y pendiente')
assert((() => { try { calcularROS('K99', 0, 0, 0); return false } catch { return true } })(), 'calcularROS lanza error con modelo inexistente')
assert(alturaLlama(10) > alturaLlama(1), 'alturaLlama crece con ROS')

console.log('\n=== Clasificacion de combustible ===')
const demTest = generarDEMSintetico(20, 20, 3)
const pendTest = calcularPendiente(demTest, 20, 20, 13)
const modelosTest = clasificarCombustible(demTest, pendTest, 20, 20)
assert(modelosTest.length === 400, 'clasificarCombustible devuelve nx*ny modelos')
assert(modelosTest.every(m => MODELOS_KITRAL[m]), 'todos los modelos clasificados existen en la tabla KITRAL')

console.log('\n=== DEM ===')
const pixelsFake = new Uint8ClampedArray([10, 128, 0, 255, 20, 1, 0, 255])
const elevDecoded = decodificarRGB(pixelsFake)
assert(elevDecoded.length === 2, 'decodificarRGB produce 1 elevacion por pixel')
assert(elevDecoded[0] === (10 * 256 + 128 + 0 / 256) - 32768, 'decodificarRGB formula Terrarium correcta', `valor=${elevDecoded[0]}`)
const remuestreado = remuestrear(new Float32Array([1, 2, 3, 4]), 2, 2, 4, 4)
assert(remuestreado.length === 16, 'remuestrear produce nxDest*nyDest valores')

console.log('\n=== Meteorologia / FWI ===')
assert(calcularFWISimplificado(30, 10, 40, 0) > calcularFWISimplificado(15, 80, 5, 0), 'FWI mayor con calor/sequedad/viento')
assert(calcularFWISimplificado(30, 10, 40, 5) === 0, 'FWI=0 si hay precipitacion')
const horarioFake = { time: ['t0', 't1'], temperature_2m: [20, 22], relative_humidity_2m: [50, 40], precipitation: [0, 0], wind_speed_10m: [5, 6], wind_direction_10m: [270, 280] }
const procesado = procesarFWI(horarioFake)
assert(procesado.length === 2, 'procesarFWI devuelve un registro por hora')
assert(Math.abs(procesado[0].vientoKmh - 18) < 0.01, 'conversion m/s a km/h correcta (5 m/s = 18 km/h)', `valor=${procesado[0].vientoKmh}`)

console.log('\n=== Parseador de intenciones ===')
const cmdDesplegar = parseadorIntenciones('Desplegar Brigada R-22 al norte, acceso Los Copihues')
assert(cmdDesplegar && cmdDesplegar.accion === 'desplegar_recurso', 'detecta comando desplegar_recurso')
assert(cmdDesplegar.recurso_id === 'R-22', 'extrae recurso_id correctamente', `valor=${cmdDesplegar && cmdDesplegar.recurso_id}`)
assert(cmdDesplegar.direccion === 'norte', 'extrae direccion correctamente')
const cmdRetardante = parseadorIntenciones('Aplicar 1200 litros de retardante en el frente norte')
assert(cmdRetardante.accion === 'aplicar_retardante' && cmdRetardante.volumen === 1200, 'detecta retardante con volumen', JSON.stringify(cmdRetardante))
assert(parseadorIntenciones('¿Cual es el ROS actual?') === null, 'pregunta de lectura simple no dispara comando')

console.log('\n=== Exportaciones puras ===')
const md = exportarMarkdown({ nombre: 'Test', estadisticas: { minutos: 10, hectareas: 5, ros_cabeza: 3, vel_viento: 20, dir_viento: 180 }, mensajes: [{ rol: 'user', contenido: 'hola' }], decisiones: [] })
assert(md.includes('Test') && md.includes('hola'), 'exportarMarkdown incluye nombre y mensajes')
const csv = exportarCSV([{ tiempo_min: 0, hectareas: 0, ros_m_min: 1 }, { tiempo_min: 5, hectareas: 1.2, ros_m_min: 2 }])
assert(csv.split('\n').length >= 3, 'exportarCSV tiene cabecera + filas', `lineas=${csv.split('\n').length}`)
const kml = gridAPoligonoKML([{ i: 0, j: 0 }, { i: 1, j: 0 }], -41.47, -72.70, 13)
assert(kml.includes('<kml') && kml.includes('coordinates'), 'gridAPoligonoKML genera XML valido con coordenadas')

console.log('\n=== CA 240x240: correctitud + benchmark ===')
const nx = 240, ny = 240
const dem240 = generarDEMSintetico(nx, ny, 7)
const pend240 = calcularPendiente(dem240, nx, ny, 13)
const modelos240 = clasificarCombustible(dem240, pend240, nx, ny)
const grid = initCA({ nx, ny, cellSizeM: 13, modelos: modelos240, pendiente: pend240 })
assert(grid.state.filter(s => s === ESTADO.BURNING).length === 1, 'initCA enciende exactamente 1 celda')

const tiempos = []
let t = 0
for (let i = 0; i < 20; i++) {
  const t0 = performance.now()
  tickCA(grid, t, 25, 270, 20, 9, 5, { ajusteROS: 0.7 })
  tiempos.push(performance.now() - t0)
  t += 5
}
const promedioMs = tiempos.reduce((a, b) => a + b, 0) / tiempos.length
const haQuemadas = calcularSuperficieHa(grid)
const frente = gridAFrente(grid)
const perimetro = gridAPerimetro(grid)
assert(haQuemadas > 0, 'tras 20 ticks hay superficie quemada', `ha=${haQuemadas}`)
assert(frente.length > 0, 'hay un frente activo (celdas quemando) tras 20 ticks')
// Nota: el perimetro (celdas quemadas/quemando en el borde de la mancha)
// NO tiene por que ser mayor o igual que el frente (celdas en estado
// BURNING): con tiempoResidenciaMin=12 y dt=5 puede haber varias celdas
// BURNING interiores, ya rodeadas de otras celdas quemando, que no son
// borde. Se detecto en la primera corrida (ver EQUIVOCACIONES.md) que la
// asercion original asumia incorrectamente perimetro>=frente.
assert(perimetro.length > 0, 'el perimetro no esta vacio tras 20 ticks', `perimetro=${perimetro.length}`)
console.log(`MEDIDO: ms/tick promedio (grid 240x240, 20 ticks) = ${promedioMs.toFixed(3)} ms`)
console.log(`MEDIDO: hectareas tras 20 ticks (100 min simulados) = ${haQuemadas.toFixed(2)} ha`)
console.log(`MEDIDO: celdas en frente = ${frente.length}, celdas en perimetro = ${perimetro.length}`)
assert(promedioMs < 100, 'ms/tick grid 240x240 cumple checklist MVP (<100 ms/tick)', `promedio=${promedioMs.toFixed(3)}ms`)

console.log(`\n=== RESUMEN: ${total - fallas}/${total} pruebas OK, ${fallas} fallidas ===`)
process.exit(fallas > 0 ? 1 : 0)
