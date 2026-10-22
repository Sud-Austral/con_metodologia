import React, { useRef, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { inicializarIA, detectarCapacidades } from '../motores/ia_local.js'
import { chat_consultar } from '../api_cliente.js'
import { cargarMensajes } from '../motores/persistencia.js'

export default function ChatPanel({ simulacion_id = 'demo', estadisticas = {}, visible = true }) {
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [estadoIA, setEstadoIA] = useState('no_cargada')  // 'no_cargada'|'cargando'|'lista'|'error'
  const [motorIA, setMotorIA] = useState('')
  const [progresoIA, setProgresoIA] = useState('')
  const scrollRef = useRef(null)

  // Cargar mensajes previos de IndexedDB
  useEffect(() => {
    cargarMensajes(simulacion_id).then(msgs => {
      if (msgs.length > 0) setMensajes(msgs)
    }).catch(() => {})
  }, [simulacion_id])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function manejarInicializarIA() {
    setEstadoIA('cargando')
    setProgresoIA('Inicializando...')
    try {
      const { motor, modelo } = await inicializarIA((msg, pct) => {
        setProgresoIA(`${msg} (${pct}%)`)
      })
      setMotorIA(`${motor}: ${modelo}`)
      setEstadoIA('lista')
      setProgresoIA('')
    } catch(e) {
      setEstadoIA('error')
      setProgresoIA(`Error: ${e.message}`)
    }
  }

  async function enviar() {
    if (!input.trim()) return
    const pregunta = input.trim()
    setInput('')

    const msgUser = { rol: 'user', contenido: pregunta, timestamp: new Date().toISOString() }
    setMensajes(prev => [...prev, msgUser])
    setCargando(true)

    try {
      const data = await chat_consultar({ pregunta, simulacion_id, estadisticas })
      const msgIA = {
        rol: 'assistant',
        contenido: data.respuesta,
        timestamp: data.timestamp,
        latencia: data.latencia_s,
        comando: data.comando_detectado,
      }
      setMensajes(prev => [...prev, msgIA])
    } catch(e) {
      setMensajes(prev => [...prev, {
        rol: 'assistant', contenido: `❌ Error: ${e.message}`, timestamp: new Date().toISOString(), error: true
      }])
    } finally {
      setCargando(false)
    }
  }

  if (!visible) return null

  return (
    <div className="absolute left-3 top-3 w-72 h-[calc(100%-24px)] bg-gray-900/95 border border-gray-700 rounded-lg flex flex-col overflow-hidden shadow-xl backdrop-blur-sm z-10">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        <span className="text-orange-400 text-lg">🔥</span>
        <span className="font-bold text-gray-100 text-sm">IA del Incendio</span>
        <span className={`text-xs ml-auto font-mono px-1.5 py-0.5 rounded ${
          estadoIA === 'lista' ? 'bg-green-900 text-green-300' :
          estadoIA === 'cargando' ? 'bg-yellow-900 text-yellow-300' :
          estadoIA === 'error' ? 'bg-red-900 text-red-300' :
          'bg-gray-800 text-gray-400'
        }`}>
          {estadoIA === 'lista' ? motorIA.split(':')[0] : estadoIA}
        </span>
      </div>

      {/* Botón inicializar IA */}
      {estadoIA === 'no_cargada' && (
        <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700">
          <button
            onClick={manejarInicializarIA}
            className="w-full py-1.5 px-3 rounded bg-orange-700 hover:bg-orange-600 text-white text-xs font-medium transition-colors"
          >
            🤖 Inicializar IA Local (WebLLM)
          </button>
          <p className="text-[10px] text-gray-400 mt-1 text-center">
            Descarga modelo ~1GB una vez, funciona sin internet
          </p>
        </div>
      )}

      {estadoIA === 'cargando' && (
        <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700">
          <div className="text-xs text-yellow-300 animate-pulse">{progresoIA}</div>
          <div className="mt-1 h-1 bg-gray-700 rounded">
            <div className="h-1 bg-yellow-500 rounded animate-pulse w-1/2" />
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {mensajes.length === 0 && (
          <div className="text-center text-gray-400 text-xs py-6">
            <p className="mb-2">💭 Pregunta sobre el incendio</p>
            <p className="text-gray-500 text-[11px] leading-relaxed">
              "¿ROS actual?"<br/>
              "¿Desplegar brigada norte?"<br/>
              "¿Riesgo para Puerto Montt?"
            </p>
          </div>
        )}

        {mensajes.map((msg, i) => (
          <div key={i} className={msg.rol === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[90%] px-3 py-2 rounded-lg text-[12px] leading-relaxed ${
              msg.rol === 'user'
                ? 'bg-orange-700 text-white'
                : msg.error
                  ? 'bg-red-900/60 text-red-200 border border-red-700'
                  : 'bg-gray-800 text-gray-100'
            }`}>
              {msg.rol === 'assistant'
                ? <ReactMarkdown className="prose prose-invert prose-xs max-w-none">{msg.contenido}</ReactMarkdown>
                : <span>{msg.contenido}</span>
              }
              {msg.latencia && (
                <div className="text-[9px] text-gray-400 mt-1">{msg.latencia.toFixed(1)}s</div>
              )}
              {msg.comando && (
                <div className="text-[9px] text-green-400 mt-1">✅ Comando: {msg.comando.accion}</div>
              )}
            </div>
          </div>
        ))}

        {cargando && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-100 px-3 py-2 rounded-lg text-[12px]">
              <span className="animate-pulse">⏳ Pensando...</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-gray-700 bg-gray-800/50">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !cargando && enviar()}
            placeholder="¿ROS? ¿Estrategia? Desplegar..."
            disabled={cargando}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2.5 py-1.5 text-[11px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
          />
          <button
            onClick={enviar}
            disabled={cargando || !input.trim()}
            className="px-2 py-1.5 rounded bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 text-white text-xs transition-colors"
            title="Enviar (Enter)"
          >
            📤
          </button>
        </div>

        {/* Acciones rápidas */}
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {['¿ROS actual?', '¿Estrategia?', 'Exportar PDF'].map(sugerencia => (
            <button
              key={sugerencia}
              onClick={() => { setInput(sugerencia); }}
              className="text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded transition-colors"
            >
              {sugerencia}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
