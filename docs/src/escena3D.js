// Motor Three.js (Seccion 6.3 y 8.1 del documento insumo), version
// simplificada para este MVP solo-frontend.
//
// ALCANCE REDUCIDO respecto al documento (ver metadatos.json -> no_hecho):
// - Vegetacion: color de terreno por modelo KITRAL, NO billboards
//   instanciados con fotos reales (Seccion 5.2/8.1 Vegetacion.js).
// - Ciudades OSM (edificios/calles/servicios, Seccion 5.3/8.1 Ciudad.js):
//   NO implementado en este ejercicio.
// - Llamas/humo: Points con sprite generado por canvas + additive
//   blending, NO el shader GLSL multi-bocanada completo de la Seccion 6.3.

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { initCA, ESTADO } from './motores/ca_propagacion.js'
import { clasificarCombustible } from './motores/kitral.js'
import { calcularPendiente, generarDEMSintetico } from './motores/descarga_dem.js'
import { calcularROS, alturaLlama } from './motores/rothermel.js'
import { estadoSimulacion } from './estado.js'

// El tick del CA corre en un Web Worker aislado (kitral_worker.js) para
// no bloquear el render, cumpliendo el requisito de la Seccion 6.1 /
// Checklist Minimo ("KITRAL CA ejecuta en <100 ms/tick", "no bloquea
// render").

const COLOR_MODELO = {
  K1: 0xc9b458, K2: 0xb5a14a, K3: 0x7c9b4a, K4: 0x6a8b3f, K12: 0x9c8b3a,
  K5: 0x4f7a3a, K6: 0x3f6a32, K7: 0x35602c, K8: 0x2d5526, K9: 0x244a20,
  K10: 0x1c3f1a, K11: 0x2a4f24, K13: 0x163515,
}

function texturaCirculo() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

export function crearEscena(container, { nx = 240, ny = 240, cellSizeM = 13 } = {}) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87a9c4)

  const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 1, 20000)
  camera.position.set(nx * 0.6, nx * 0.5, ny * 0.6)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(nx / 2, 0, ny / 2)
  controls.update()

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const sol = new THREE.DirectionalLight(0xffffff, 0.8)
  sol.position.set(100, 300, 100)
  scene.add(sol)

  const dem = generarDEMSintetico(nx, ny)
  const pendiente = calcularPendiente(dem, nx, ny, cellSizeM)
  const modelos = clasificarCombustible(dem, pendiente, nx, ny)

  const geometry = new THREE.PlaneGeometry(nx, ny, nx - 1, ny - 1)
  geometry.rotateX(-Math.PI / 2)
  const colores = new Float32Array(nx * ny * 3)
  const posAttr = geometry.attributes.position
  for (let i = 0; i < nx * ny; i++) {
    const elev = dem[i] / 20
    posAttr.setY(i, elev)
    const hex = COLOR_MODELO[modelos[i]] || 0x3f6a32
    const col = new THREE.Color(hex)
    colores[i * 3] = col.r; colores[i * 3 + 1] = col.g; colores[i * 3 + 2] = col.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colores, 3))
  geometry.computeVertexNormals()
  const terreno = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }))
  terreno.position.set(nx / 2 - 0.5, 0, ny / 2 - 0.5)
  scene.add(terreno)

  const grid = initCA({ nx, ny, cellSizeM, modelos, pendiente })
  estadoSimulacion.grid = grid

  const worker = new Worker(new URL('./motores/kitral_worker.js', import.meta.url), { type: 'module' })
  worker.postMessage({ cmd: 'init', nx, ny, cellSizeM, modelos, pendiente })
  let frenteActual = []
  let msUltimoTick = null
  let tickPendiente = false
  worker.onmessage = (evt) => {
    const d = evt.data
    if (d.tipo !== 'tick_ok') return
    tickPendiente = false
    msUltimoTick = d.ms_tick
    grid.state.set(d.state)
    grid.tiempo_min = d.tiempo_min
    frenteActual = d.frente
    estadoSimulacion.tiempo_min = d.tiempo_min
    estadoSimulacion.hectareas = d.hectareas
    estadoSimulacion.ros_cabeza = calcularROS(estadoSimulacion.modelo, estadoSimulacion.vel_viento, 20, estadoSimulacion.hum_combustible)
    estadoSimulacion.altura_llama = alturaLlama(estadoSimulacion.ros_cabeza)
    estadoSimulacion.serieEstadisticas.push({ tiempo_min: d.tiempo_min, hectareas: d.hectareas, ros_m_min: estadoSimulacion.ros_cabeza })
    actualizarColorTerreno()
    actualizarFuegoYHumo(frenteActual)
  }

  const texFuego = texturaCirculo()
  const llamas = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ map: texFuego, color: 0xff6a00, size: 6, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  scene.add(llamas)

  const humo = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ map: texFuego, color: 0x888888, size: 14, transparent: true, opacity: 0.35, depthWrite: false })
  )
  scene.add(humo)

  function actualizarColorTerreno() {
    for (let i = 0; i < nx * ny; i++) {
      let col
      if (grid.state[i] === ESTADO.BURNING) col = new THREE.Color(0xff5a1f)
      else if (grid.state[i] === ESTADO.BURNED) col = new THREE.Color(0x2a2a2a)
      else col = new THREE.Color(COLOR_MODELO[modelos[i]] || 0x3f6a32)
      colores[i * 3] = col.r; colores[i * 3 + 1] = col.g; colores[i * 3 + 2] = col.b
    }
    geometry.attributes.color.needsUpdate = true
  }

  function actualizarFuegoYHumo(frente) {
    const posLlamas = new Float32Array(frente.length * 3)
    frente.forEach(({ i, j }, idx) => {
      posLlamas[idx * 3] = i
      posLlamas[idx * 3 + 1] = (dem[j * nx + i] / 20) + 3
      posLlamas[idx * 3 + 2] = j
    })
    llamas.geometry.setAttribute('position', new THREE.BufferAttribute(posLlamas, 3))

    const posHumo = new Float32Array(frente.length * 3)
    const vientoRad = (estadoSimulacion.dir_viento + 180) * Math.PI / 180
    frente.forEach(({ i, j }, idx) => {
      posHumo[idx * 3] = i + Math.sin(vientoRad) * 4
      posHumo[idx * 3 + 1] = (dem[j * nx + i] / 20) + 10
      posHumo[idx * 3 + 2] = j + Math.cos(vientoRad) * 4
    })
    humo.geometry.setAttribute('position', new THREE.BufferAttribute(posHumo, 3))
  }

  function tick(dt = 5) {
    if (estadoSimulacion.pausado || tickPendiente) return
    tickPendiente = true
    // Retardante aplicado (Seccion 9 ejemplo 2): reduccion GLOBAL del ROS,
    // no por zona (el MVP no rastrea geometria de la zona de aplicacion
    // celda a celda, ver metadatos.json -> no_hecho). Es un efecto real
    // sobre la fisica del tick, no solo un dato guardado sin usar.
    const factorRetardante = estadoSimulacion.retardanteActivo
      ? 1 - estadoSimulacion.retardanteActivo.reduccionPct / 100
      : 1
    worker.postMessage({
      cmd: 'tick', tiempo_min: grid.tiempo_min,
      viento_kmh: estadoSimulacion.vel_viento, viento_dir: estadoSimulacion.dir_viento,
      pendiente: 20, humedad: estadoSimulacion.hum_combustible, dt,
      params: { ajusteROS: 0.7 * factorRetardante },
    })
  }

  let frameCount = 0
  let fpsUltimos = []
  let ultimoTiempoFrame = performance.now()
  function animate() {
    frameCount++
    const ahora = performance.now()
    const dtFrame = ahora - ultimoTiempoFrame
    ultimoTiempoFrame = ahora
    // Bug real encontrado en verificacion headless (ver EQUIVOCACIONES.md):
    // el primer frame podia dar dtFrame~0 y FPS=Infinity en el HUD.
    if (dtFrame > 0 && Number.isFinite(1000 / dtFrame)) fpsUltimos.push(Math.min(240, 1000 / dtFrame))
    if (fpsUltimos.length > 60) fpsUltimos.shift()

    if (frameCount % 10 === 0) tick(5)

    controls.update()
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  window.addEventListener('resize', onResize)

  return {
    scene, camera, renderer, grid,
    fpsPromedio: () => fpsUltimos.reduce((a, b) => a + b, 0) / Math.max(1, fpsUltimos.length),
    msUltimoTick: () => msUltimoTick,
  }
}
