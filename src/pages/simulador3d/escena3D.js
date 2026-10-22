// Motor Three.js para Simulador 3D
// Gestiona escena, terreno, fuego y renderizado

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class Escena3D {
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = null
    this.scene = null
    this.camera = null
    this.controls = null
    this.animando = false
    this.frameCounter = 0
    this.fpsClock = new THREE.Clock()
    this.fpsCount = 0
    this.fps = 0

    // Referencias a objetos 3D
    this.meshTerreno = null
    this.grupoFuego = null
    this.grupoHumo = null
    this.gridLines = null

    // Datos del grid
    this.cols = 240
    this.rows = 240
    this.cellSize = 13
    this.estadoGrid = null
    this.perimetro = []

    // Partículas fuego
    this.particulas = []

    // Callbacks
    this.onFPS = null
    this.onTick = null
  }

  init() {
    const w = this.canvas.clientWidth || 800
    const h = this.canvas.clientHeight || 600

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    // Escena
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a0a00)  // cielo noche/humo
    this.scene.fog = new THREE.FogExp2(0x1a0a00, 0.0008)

    // Cámara
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 20000)
    this.camera.position.set(0, 800, 1200)
    this.camera.lookAt(0, 0, 0)

    // Controles
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI * 0.75
    this.controls.minDistance = 100
    this.controls.maxDistance = 8000

    // Luces
    this._crearLuces()

    // Terreno inicial (sintético hasta que cargue DEM real)
    this._crearTerrenoSintetico()

    // Grupos
    this.grupoFuego = new THREE.Group()
    this.grupoHumo = new THREE.Group()
    this.scene.add(this.grupoFuego)
    this.scene.add(this.grupoHumo)

    // Resize handler
    window.addEventListener('resize', () => this._onResize())

    return this
  }

  _crearLuces() {
    // Luz ambiental tenue (noche/humo)
    const ambiente = new THREE.AmbientLight(0x442211, 0.4)
    this.scene.add(ambiente)

    // Sol/luna
    const direccional = new THREE.DirectionalLight(0xffeedd, 0.8)
    direccional.position.set(1000, 2000, 500)
    direccional.castShadow = true
    direccional.shadow.mapSize.width = 2048
    direccional.shadow.mapSize.height = 2048
    this.scene.add(direccional)

    // Luz naranja del fuego
    this.luzFuego = new THREE.PointLight(0xff6600, 0, 3000)
    this.luzFuego.position.set(0, 200, 0)
    this.scene.add(this.luzFuego)
  }

  _crearTerrenoSintetico() {
    const cols = this.cols
    const rows = this.rows
    const size = cols * this.cellSize

    // Geometría del terreno
    const geometry = new THREE.PlaneGeometry(size, size, cols - 1, rows - 1)
    geometry.rotateX(-Math.PI / 2)

    // Variar alturas con noise simple
    const positions = geometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      // Terreno con pendiente + ondulación
      const y = (x / size + 0.5) * 400 + Math.sin(x * 0.003) * 80 + Math.cos(z * 0.004) * 60
      positions.setY(i, y)
    }

    geometry.computeVertexNormals()

    // Color del terreno: verde/marrón
    const colores = new Float32Array(positions.count * 3)
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i)
      const t = Math.max(0, Math.min(1, y / 500))
      colores[i * 3] = 0.25 + t * 0.2      // R
      colores[i * 3 + 1] = 0.35 - t * 0.1   // G
      colores[i * 3 + 2] = 0.08             // B
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colores, 3))

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    })

    this.meshTerreno = new THREE.Mesh(geometry, material)
    this.meshTerreno.receiveShadow = true
    this.scene.add(this.meshTerreno)

    // Guardar referencia al geometry para actualizar colores
    this._terrenoGeometry = geometry
    this._terrenoColores = colores
  }

  /**
   * Actualizar visualización desde datos del worker KITRAL
   */
  actualizarDesdeGrid(data) {
    const { state, cols, rows, perimetro, ardiendo, hectareas, ros, alturaLlama } = data

    this.perimetro = perimetro || []

    // Actualizar color terreno según estado
    if (state && this._terrenoGeometry) {
      const positions = this._terrenoGeometry.attributes.position
      const colores = this._terrenoColores
      const stateArr = state instanceof ArrayBuffer ? new Uint8Array(state) : state

      // Mapear celdas del grid a vértices del terreno (aproximado)
      for (let r = 0; r < Math.min(rows || this.rows, this.rows - 1); r++) {
        for (let c = 0; c < Math.min(cols || this.cols, this.cols - 1); c++) {
          const idx = r * (cols || this.cols) + c
          const vidx = r * this.cols + c
          const estado = stateArr[idx] || 0

          if (estado === 1) {  // Ardiendo → naranja
            colores[vidx * 3] = 0.9 + Math.random() * 0.1
            colores[vidx * 3 + 1] = 0.3 + Math.random() * 0.3
            colores[vidx * 3 + 2] = 0.0
          } else if (estado === 2) {  // Quemada → negro/gris
            colores[vidx * 3] = 0.12
            colores[vidx * 3 + 1] = 0.10
            colores[vidx * 3 + 2] = 0.10
          }
        }
      }

      this._terrenoGeometry.attributes.color.needsUpdate = true
    }

    // Actualizar intensidad luz fuego
    if (this.luzFuego) {
      this.luzFuego.intensity = Math.min(ardiendo * 0.5, 500)
    }

    // Actualizar partículas fuego
    this._actualizarParticulas(ardiendo || 0, alturaLlama || 5, ros || 1)
  }

  _actualizarParticulas(numCeldas, alturaLlama, ros) {
    // Limpiar partículas antiguas si hay demasiadas
    while (this.grupoFuego.children.length > 200) {
      const mesh = this.grupoFuego.children[0]
      this.grupoFuego.remove(mesh)
      mesh.geometry.dispose()
      mesh.material.dispose()
    }

    // Emitir nuevas partículas proporcional a ardiendo
    const numNuevas = Math.min(numCeldas * 0.1, 20)
    const geom = new THREE.SphereGeometry(this.cellSize * 0.3, 4, 4)

    for (let i = 0; i < numNuevas; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.0, 0.3 + Math.random() * 0.4, 0.0),
        transparent: true,
        opacity: 0.7 + Math.random() * 0.3,
      })

      const mesh = new THREE.Mesh(geom, mat)
      const spread = this.cols * this.cellSize * 0.3
      mesh.position.set(
        (Math.random() - 0.5) * spread,
        100 + Math.random() * alturaLlama * 10,
        (Math.random() - 0.5) * spread
      )
      mesh.scale.setScalar(0.5 + Math.random())
      mesh.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * 2
      )
      mesh.userData.vida = 1.0
      this.grupoFuego.add(mesh)
    }
  }

  animate(onFrame) {
    this.animando = true
    this.fpsClock.start()

    const loop = () => {
      if (!this.animando) return
      requestAnimationFrame(loop)

      const delta = this.fpsClock.getDelta()
      this.frameCounter++
      this.fpsCount++

      // FPS contador
      const elapsed = this.fpsClock.elapsedTime
      if (elapsed > 0 && this.frameCounter % 60 === 0) {
        this.fps = Math.round(this.fpsCount / elapsed)
        this.fpsCount = 0
        this.fpsClock.start()
        this.onFPS?.(this.fps)
      }

      // Actualizar partículas
      this._animarParticulas(delta)

      // Controles
      this.controls?.update()

      // Callback externo (para tick worker)
      onFrame?.(this.frameCounter)

      // Render
      this.renderer.render(this.scene, this.camera)
    }

    loop()
    return this
  }

  _animarParticulas(delta) {
    const toRemove = []

    for (const mesh of this.grupoFuego.children) {
      if (!mesh.userData.vel) continue
      mesh.position.addScaledVector(mesh.userData.vel, delta * 30)
      mesh.userData.vida -= delta * 0.5
      mesh.material.opacity = Math.max(0, mesh.userData.vida)

      if (mesh.userData.vida <= 0) toRemove.push(mesh)
    }

    for (const m of toRemove) {
      this.grupoFuego.remove(m)
      m.geometry.dispose()
      m.material.dispose()
    }
  }

  stop() {
    this.animando = false
  }

  _onResize() {
    if (!this.canvas) return
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.stop()
    this.renderer?.dispose()
    window.removeEventListener('resize', () => this._onResize())
  }
}

export default Escena3D
