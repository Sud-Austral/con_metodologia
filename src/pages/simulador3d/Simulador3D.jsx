import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Escena3D } from './escena3D.js'
import ChatPanel from './componentes/ChatPanel.jsx'
import ControlPanel from './componentes/ControlPanel.jsx'
import { inyectarEstado } from './api_cliente.js'

// Worker URL (Vite maneja esto con ?worker)
const WORKER_URL = new URL('./motores/kitral_worker.js', import.meta.url)

const LAT_DEFAULT = -41.4700
const LNG_DEFAULT = -72.9400

export default function Simulador3D() {
  const canvasRef = useRef(null)
  const escena3DRef = useRef(null)
  const workerRef = useRef(null)
  const tiempoInicioRef = useRef(null)

  const [estado, setEstado] = useState({
    tiempo_min: 0,
    hectareas: 0,
    ros: 0,
    alturaLlama: 0,
    viento_kmh: 15,
    viento_dir: 270,
    humedad: 10,
    ardiendo: 1,
    quemada: 0,
    fps: 0,
    ms_tick: 0,
    simulacion_id: `sim-${Date.now()}`,
    modelo: 'K2',
  })

  const [perimetro, setPerimetro] = useState([])
  const [historial, setHistorial] = useState([])
  const [corriendo, setCorriendo] = useState(false)
  const [mostrarChat, setMostrarChat] = useState(true)
  const [inicializando, setInicializando] = useState(true)

  // Estado mutable para uso en callbacks
  const estadoRef = useRef(estado)
  useEffect(() => { estadoRef.current = estado }, [estado])

  // Inyectar estado en api_cliente
  useEffect(() => {
    inyectarEstado(estadoRef.current, {
      desplegar: (id, lat, lng) => console.log('Desplegar:', id, lat, lng),
      retardante: (lat, lng, radio) => {
        workerRef.current?.postMessage({ cmd: 'retardante', lat: lat || LAT_DEFAULT, lng: lng || LNG_DEFAULT, radioM: radio || 400 })
      },
      control: (accion) => {
        if (accion === 'pausar') setCorriendo(false)
        if (accion === 'reanudar') setCorriendo(true)
        if (accion === 'reiniciar') iniciarSimulacion(LAT_DEFAULT, LNG_DEFAULT)
      }
    })
  }, [])

  // Inicializar escena Three.js
  useEffect(() => {
    if (!canvasRef.current) return

    const escena = new Escena3D(canvasRef.current)
    escena.init()
    escena3DRef.current = escena

    // Inicializar worker KITRAL
    const worker = new Worker(WORKER_URL, { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (evt) => {
      const { tipo } = evt.data

      if (tipo === 'init_ok') {
        setInicializando(false)
        console.log('Worker KITRAL inicializado')
      }

      if (tipo === 'tick_ok') {
        const { tiempo_min, hectareas, ros, alturaLlama, perimetro: peri, ardiendo, quemada, ms_tick } = evt.data

        // Actualizar visualización Three.js
        escena.actualizarDesdeGrid(evt.data)

        // Actualizar estado React
        setEstado(prev => {
          const nuevo = {
            ...prev,
            tiempo_min,
            hectareas,
            ros: ros || 0,
            alturaLlama: alturaLlama || 0,
            ardiendo: ardiendo || 0,
            quemada: quemada || 0,
            ms_tick: ms_tick || 0,
          }
          estadoRef.current = nuevo
          inyectarEstado(nuevo, estadoRef.current._control)
          return nuevo
        })

        if (peri) setPerimetro(peri)

        // Guardar en historial cada 5 ticks
        setHistorial(prev => {
          if (prev.length % 5 === 0 || prev.length === 0) {
            return [...prev.slice(-100), { tiempo_min, hectareas, ros: ros || 0, ardiendo, quemada }]
          }
          return prev
        })
      }

      if (tipo === 'error') {
        console.error('Worker error:', evt.data.mensaje)
      }
    }

    // Iniciar worker con punto de ignición
    worker.postMessage({
      cmd: 'init',
      lat_ign: LAT_DEFAULT,
      lng_ign: LNG_DEFAULT,
      cols: 240,
      rows: 240,
      cellSize: 13,
    })

    // Loop de animación
    escena.animate((frameCounter) => {
      if (!corriendo) return

      // Tick cada 10 frames (~6 ticks/s a 60fps)
      if (frameCounter % 10 === 0) {
        worker.postMessage({
          cmd: 'tick',
          tiempo_min: estadoRef.current.tiempo_min,
          viento_kmh: estadoRef.current.viento_kmh,
          viento_dir: estadoRef.current.viento_dir,
          humedad: estadoRef.current.humedad,
          dt: 5,
          params: { ajusteROS: 1.0 }
        })
      }
    })

    // FPS callback
    escena.onFPS = (fps) => {
      setEstado(prev => ({ ...prev, fps }))
    }

    return () => {
      escena.dispose()
      worker.terminate()
    }
  }, [])

  // Usar corriendo como ref para el callback de animate
  const corriendoRef = useRef(corriendo)
  useEffect(() => { corriendoRef.current = corriendo }, [corriendo])

  // Re-parchear el callback del worker con corriendo actualizado
  useEffect(() => {
    if (!escena3DRef.current) return
    escena3DRef.current.animate = undefined  // no re-inicializar, solo actualizar ref
  }, [corriendo])

  function iniciarSimulacion(lat = LAT_DEFAULT, lng = LNG_DEFAULT) {
    if (!workerRef.current) return
    setInicializando(true)
    setEstado(prev => ({ ...prev, tiempo_min: 0, hectareas: 0, ros: 0 }))
    setHistorial([])
    setPerimetro([])

    workerRef.current.postMessage({
      cmd: 'init',
      lat_ign: lat,
      lng_ign: lng,
      cols: 240,
      rows: 240,
      cellSize: 13,
    })
    tiempoInicioRef.current = Date.now()
    setCorriendo(true)
  }

  function toggleSimulacion() {
    if (!corriendo && estado.tiempo_min === 0) {
      iniciarSimulacion()
    } else {
      setCorriendo(!corriendo)
    }
  }

  return (
    <div className="w-full h-screen relative bg-gray-950 overflow-hidden">
      {/* Canvas Three.js */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Overlay de carga */}
      {inicializando && (
        <div className="absolute inset-0 bg-gray-950/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-orange-500 text-4xl mb-4 animate-pulse">🔥</div>
            <p className="text-white font-bold text-lg">Iniciando Motor KITRAL CA...</p>
            <p className="text-gray-400 text-sm mt-2">Grid 240×240 (57,600 celdas)</p>
          </div>
        </div>
      )}

      {/* Título */}
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-gray-900/80 rounded-full px-4 py-1.5 text-xs text-gray-300 backdrop-blur-sm border border-gray-700">
          🔥 Simulador 3D Incendios Forestales — CONAF Los Lagos
        </div>
      </div>

      {/* Panel Chat IA */}
      <ChatPanel
        simulacion_id={estado.simulacion_id}
        estadisticas={estado}
        visible={mostrarChat}
      />

      {/* Panel Control */}
      <ControlPanel
        estado={estado}
        historial={historial}
        perimetro={perimetro}
        onCambioViento={v => setEstado(prev => ({ ...prev, viento_kmh: v }))}
        onCambioHumedad={h => setEstado(prev => ({ ...prev, humedad: h }))}
        onCambioUbicacion={(lat, lng) => iniciarSimulacion(lat, lng)}
        visible={true}
      />

      {/* Botones flotantes inferiores */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
        <button
          onClick={toggleSimulacion}
          className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all ${
            corriendo
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-orange-600 hover:bg-orange-500 text-white'
          }`}
        >
          {corriendo ? '⏸ Pausar' : (estado.tiempo_min === 0 ? '▶ Iniciar' : '▶ Reanudar')}
        </button>

        <button
          onClick={() => iniciarSimulacion()}
          className="px-4 py-2 rounded-full text-sm bg-gray-700 hover:bg-gray-600 text-white shadow-lg transition-all"
        >
          🔄 Reiniciar
        </button>

        <button
          onClick={() => setMostrarChat(!mostrarChat)}
          className="px-4 py-2 rounded-full text-sm bg-gray-700 hover:bg-gray-600 text-white shadow-lg transition-all"
        >
          {mostrarChat ? '💬 Ocultar IA' : '💬 Mostrar IA'}
        </button>
      </div>

      {/* Estado en esquina inferior izquierda */}
      <div className="absolute bottom-4 right-4 z-20 text-[10px] text-gray-500 text-right font-mono">
        <div>Tiempo: {estado.tiempo_min} min | {estado.hectareas.toFixed(1)} ha</div>
        <div>ROS: {estado.ros.toFixed(1)} m/min | FPS: {estado.fps}</div>
      </div>
    </div>
  )
}
