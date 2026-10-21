// Parseador de intenciones. Puerto a JS de la funcion Python de la
// Seccion 7.2 del documento insumo (parseador_intenciones / ejecutar_comando),
// adaptado para correr en el navegador contra el grid CA en memoria en vez
// de una base de datos.

const PALABRAS_CLAVE = [
  { patron: /desplegar/i, accion: 'desplegar_recurso' },
  { patron: /retardante/i, accion: 'aplicar_retardante' },
  { patron: /pausa|pausar/i, accion: 'pausar' },
  { patron: /reanudar/i, accion: 'reanudar' },
  { patron: /evacuar/i, accion: 'evacuar' },
  { patron: /exportar|exporta/i, accion: 'exportar' },
  { patron: /guarda(r)?\s+(la\s+)?estrategia|guardar la decision/i, accion: 'guardar_decision' },
]

// Extrae recurso_id y coordenadas aproximadas (direccion cardinal) de un
// texto en espanol tipo "Desplegar Brigada R-22 al norte".
function extraerParametrosDespliegue(texto) {
  const recursoMatch = texto.match(/\b([A-ZÁÉÍÓÚ]-?\d{1,3}|[A-Z]+-\d{1,3})\b/i)
  const direccion = texto.match(/\b(norte|sur|este|oeste|noreste|noroeste|sureste|suroeste)\b/i)
  return {
    recurso_id: recursoMatch ? recursoMatch[1].toUpperCase() : 'RECURSO-01',
    direccion: direccion ? direccion[1].toLowerCase() : 'norte',
  }
}

function extraerParametrosRetardante(texto) {
  const volumen = texto.match(/(\d{3,6})\s*l(itros)?/i)
  return {
    producto: /gel/i.test(texto) ? 'gel' : 'Phos-Chek',
    volumen: volumen ? parseInt(volumen[1], 10) : 1200,
  }
}

export function parseadorIntenciones(textoUsuario) {
  for (const { patron, accion } of PALABRAS_CLAVE) {
    if (patron.test(textoUsuario)) {
      const base = { accion, texto_original: textoUsuario }
      if (accion === 'desplegar_recurso') return { ...base, ...extraerParametrosDespliegue(textoUsuario) }
      if (accion === 'aplicar_retardante') return { ...base, ...extraerParametrosRetardante(textoUsuario) }
      return base
    }
  }
  return null
}
