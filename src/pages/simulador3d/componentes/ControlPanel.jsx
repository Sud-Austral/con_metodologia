import React, { useState } from 'react'
import { simulacion_control, despacho_desplegar, simulacion_aplicar_retardante, chat_exportar, exportarKMZ as _exportarKMZ, exportarCSV as _exportarCSV } from '../api_cliente.js'
import { exportarKMZ, exportarCSV } from '../motores/exportar.js'

const PESTANAS = ['FUEGO', 'ESCENARIO', 'RECURSOS', 'PERIMETRO', 'ANÁLISIS', 'REPORTES']

export default function ControlPanel({
  estado = {},
  onCambioViento,
  onCambioHumedad,
  onCambioUbicacion,
  historial = [],
  perimetro = [],
  visible = true,
}) {
  const [pestana, setPestana] = useState('FUEGO')
  const [viento, setViento] = useState(estado.viento_kmh || 15)
  const [humedad, setHumedad] = useState(estado.humedad || 10)
  const [lat, setLat] = useState(-41.4700)
  const [lng, setLng] = useState(-72.9400)
  const [corriendo, setCorriendo] = useState(false)

  if (!visible) return null

  function cambiarViento(v) {
    setViento(v)
    onCambioViento?.(v)
  }

  function cambiarHumedad(h) {
    setHumedad(h)
    onCambioHumedad?.(h)
  }

  return (
    <div className="absolute right-3 top-3 w-64 bg-gray-900/95 border border-gray-700 rounded-lg overflow-hidden shadow-xl z-10">

      {/* Pestañas */}
      <div className="flex overflow-x-auto bg-gray-800/80 border-b border-gray-700">
        {PESTANAS.map(p => (
          <button
            key={p}
            onClick={() => setPestana(p)}
            className={`px-2 py-1.5 text-[9px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              pestana === p ? 'bg-orange-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="p-3 text-xs text-gray-100 max-h-80 overflow-y-auto">

        {/* FUEGO */}
        {pestana === 'FUEGO' && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Viento</span><span className="text-orange-400 font-mono">{viento} km/h</span>
              </div>
              <input type="range" min={0} max={80} value={viento}
                onChange={e => cambiarViento(parseInt(e.target.value))}
                className="w-full accent-orange-500" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Humedad combustible</span><span className="text-blue-400 font-mono">{humedad}%</span>
              </div>
              <input type="range" min={3} max={40} value={humedad}
                onChange={e => cambiarHumedad(parseInt(e.target.value))}
                className="w-full accent-blue-500" />
            </div>

            {/* Estado actual */}
            <div className="bg-gray-800 rounded p-2 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-400">ROS</span>
                <span className="font-mono text-orange-300">{(estado.ros || 0).toFixed(1)} m/min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hectáreas</span>
                <span className="font-mono text-red-300">{(estado.hectareas || 0).toFixed(1)} ha</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tiempo</span>
                <span className="font-mono text-yellow-300">{estado.tiempo_min || 0} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Llama</span>
                <span className="font-mono text-orange-400">{(estado.alturaLlama || 0).toFixed(1)} m</span>
              </div>
            </div>

            {/* Controles */}
            <div className="flex gap-1.5">
              <button onClick={async () => { setCorriendo(!corriendo); await simulacion_control({ accion: corriendo ? 'pausar' : 'reanudar' }) }}
                className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-colors ${corriendo ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-green-700 hover:bg-green-600'}`}>
                {corriendo ? '⏸ Pausar' : '▶ Iniciar'}
              </button>
              <button onClick={() => simulacion_control({ accion: 'reiniciar' })}
                className="px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-[11px] transition-colors">
                🔄
              </button>
            </div>
          </div>
        )}

        {/* ESCENARIO */}
        {pestana === 'ESCENARIO' && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-gray-400">Latitud</label>
              <input type="number" value={lat} step={0.001}
                onChange={e => setLat(parseFloat(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-[11px] mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400">Longitud</label>
              <input type="number" value={lng} step={0.001}
                onChange={e => setLng(parseFloat(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-[11px] mt-0.5" />
            </div>
            <button onClick={() => onCambioUbicacion?.(lat, lng)}
              className="w-full py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-[11px] font-medium transition-colors">
              📍 Aplicar Ubicación
            </button>
            <div className="text-[10px] text-gray-500 mt-2">
              <p>Los Lagos: -41.47, -72.94</p>
              <p>Puerto Montt: -41.47, -72.94</p>
            </div>
          </div>
        )}

        {/* RECURSOS */}
        {pestana === 'RECURSOS' && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-400">Brigadas disponibles:</p>
            {['R-22', 'R-15', 'R-08'].map(b => (
              <div key={b} className="flex items-center gap-2 bg-gray-800 rounded p-1.5">
                <span className="text-orange-400">🚒</span>
                <span className="flex-1 text-[11px]">Brigada {b}</span>
                <button
                  onClick={() => despacho_desplegar({ recurso_id: b, lat, lng })}
                  className="px-2 py-0.5 rounded bg-orange-700 hover:bg-orange-600 text-[10px] transition-colors">
                  Desplegar
                </button>
              </div>
            ))}
            <p className="text-[10px] text-gray-400 mt-2">Aéreos:</p>
            {['H-01', 'H-03'].map(h => (
              <div key={h} className="flex items-center gap-2 bg-gray-800 rounded p-1.5">
                <span className="text-blue-400">🚁</span>
                <span className="flex-1 text-[11px]">Heli {h}</span>
                <button
                  onClick={() => simulacion_aplicar_retardante({ producto: 'Phos-Chek', volumen: 1200, zona: { lat, lng, radio: 500 } })}
                  className="px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] transition-colors">
                  Retardante
                </button>
              </div>
            ))}
          </div>
        )}

        {/* PERIMETRO */}
        {pestana === 'PERIMETRO' && (
          <div className="space-y-2">
            <div className="bg-gray-800 rounded p-2 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-400">Puntos perimetro</span>
                <span className="font-mono text-green-400">{perimetro.length}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-400">Celdas ardiendo</span>
                <span className="font-mono text-orange-400">{estado.ardiendo || 0}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-400">Celdas quemadas</span>
                <span className="font-mono text-gray-500">{estado.quemada || 0}</span>
              </div>
            </div>
            <button onClick={() => exportarKMZ(perimetro, estado)}
              className="w-full py-1.5 rounded bg-green-700 hover:bg-green-600 text-[11px] transition-colors">
              📐 Exportar KMZ/GeoJSON
            </button>
          </div>
        )}

        {/* ANÁLISIS */}
        {pestana === 'ANÁLISIS' && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-400 mb-2">Historial de simulación ({historial.length} registros)</p>
            {historial.length === 0 ? (
              <p className="text-gray-500 text-[10px]">Inicia la simulación para ver datos</p>
            ) : (
              <div className="space-y-1">
                {/* Mini gráfico ASCII de ROS */}
                <p className="text-[9px] text-gray-400">ROS (m/min):</p>
                <div className="font-mono text-[8px] text-orange-400 bg-gray-800 rounded p-1 leading-tight">
                  {historial.slice(-20).map((h, i) => {
                    const bars = Math.round((h.ros || 0) / 2)
                    return <div key={i}>{'█'.repeat(Math.min(bars, 20))} {(h.ros || 0).toFixed(1)}</div>
                  })}
                </div>
                <p className="text-[9px] text-gray-400 mt-2">Hectáreas:</p>
                <div className="font-mono text-[8px] text-red-400 bg-gray-800 rounded p-1 leading-tight">
                  {historial.slice(-10).map((h, i) => (
                    <div key={i}>T{h.tiempo_min || 0}m: {(h.hectareas || 0).toFixed(1)} ha</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPORTES */}
        {pestana === 'REPORTES' && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-400 mb-2">Exportar datos:</p>
            <button onClick={() => chat_exportar({ conversacion_id: 'demo', formato: 'markdown' })}
              className="w-full py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-[11px] transition-colors flex items-center gap-2 justify-center">
              📝 Conversación Markdown
            </button>
            <button onClick={() => chat_exportar({ conversacion_id: 'demo', formato: 'pdf' })}
              className="w-full py-1.5 rounded bg-red-800 hover:bg-red-700 text-[11px] transition-colors flex items-center gap-2 justify-center">
              📄 Reporte PDF
            </button>
            <button onClick={() => exportarKMZ(perimetro, estado)}
              className="w-full py-1.5 rounded bg-green-800 hover:bg-green-700 text-[11px] transition-colors flex items-center gap-2 justify-center">
              🗺️ Perímetro KMZ/GeoJSON
            </button>
            <button onClick={() => exportarCSV(historial)}
              className="w-full py-1.5 rounded bg-blue-800 hover:bg-blue-700 text-[11px] transition-colors flex items-center gap-2 justify-center">
              📊 Estadísticas CSV
            </button>
            <button onClick={() => chat_exportar({ conversacion_id: 'demo', formato: 'json' })}
              className="w-full py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-[11px] transition-colors flex items-center gap-2 justify-center">
              🔧 JSON Completo
            </button>
          </div>
        )}
      </div>

      {/* FPS indicator */}
      <div className="px-3 py-1.5 bg-gray-950 border-t border-gray-800 flex justify-between text-[9px] text-gray-500">
        <span>FPS: <span className="text-green-400 font-mono">{estado.fps || '--'}</span></span>
        <span>ms/tick: <span className="text-yellow-400 font-mono">{(estado.ms_tick || 0).toFixed(0)}</span></span>
        <span>Motor: KITRAL CA</span>
      </div>
    </div>
  )
}
