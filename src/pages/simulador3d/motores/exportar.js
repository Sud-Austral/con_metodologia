// Exportaciones del cliente: Markdown, PDF, KMZ/GeoJSON, CSV

/**
 * Exportar conversación a Markdown
 */
export function exportarMarkdown(mensajes, estadisticas = {}) {
  const { tiempo_min = 0, hectareas = 0, ros = 0, viento_kmh = 0 } = estadisticas
  const fecha = new Date().toLocaleString('es-CL')

  let md = `# Simulación Incendio Forestal - CONAF Los Lagos\n\n`
  md += `**Fecha**: ${fecha}\n`
  md += `**Tiempo simulado**: ${tiempo_min} minutos\n`
  md += `**Superficie afectada**: ${hectareas.toFixed(1)} ha\n`
  md += `**ROS máximo**: ${ros.toFixed(1)} m/min\n`
  md += `**Viento**: ${viento_kmh} km/h\n\n`
  md += `---\n\n## Conversación con IA\n\n`

  for (const msg of mensajes) {
    const prefijo = msg.rol === 'user' ? '**Despachador**' : '**IA CONAF**'
    md += `### ${prefijo} _(${new Date(msg.timestamp || Date.now()).toLocaleTimeString('es-CL')})_\n\n`
    md += `${msg.contenido}\n\n`
  }

  md += `---\n_Generado por Simulador 3D CONAF Los Lagos_\n`
  return md
}

/**
 * Descargar archivo de texto
 */
export function descargarArchivo(contenido, nombre, tipo = 'text/plain') {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Exportar a PDF usando jsPDF
 */
export async function exportarPDF(mensajes, estadisticas = {}) {
  try {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    const { tiempo_min = 0, hectareas = 0, ros = 0 } = estadisticas
    const fecha = new Date().toLocaleString('es-CL')

    // Título
    doc.setFontSize(18)
    doc.setTextColor(200, 50, 20)
    doc.text('Simulación 3D - CONAF Los Lagos', 20, 25)

    doc.setFontSize(11)
    doc.setTextColor(60, 60, 60)
    doc.text(`Fecha: ${fecha}`, 20, 38)
    doc.text(`Tiempo simulado: ${tiempo_min} min | Superficie: ${hectareas.toFixed(1)} ha | ROS: ${ros.toFixed(1)} m/min`, 20, 46)

    // Línea separadora
    doc.setDrawColor(200, 50, 20)
    doc.line(20, 50, 190, 50)

    let y = 60
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Conversación con IA', 20, y)
    y += 10

    doc.setFontSize(10)
    for (const msg of mensajes) {
      const prefijo = msg.rol === 'user' ? 'Despachador' : 'IA CONAF'
      const hora = new Date(msg.timestamp || Date.now()).toLocaleTimeString('es-CL')

      // Rol + hora
      doc.setFont(undefined, 'bold')
      doc.setTextColor(msg.rol === 'user' ? 150 : 20, msg.rol === 'user' ? 80 : 120, 20)
      doc.text(`${prefijo} (${hora}):`, 20, y)
      y += 6

      // Contenido
      doc.setFont(undefined, 'normal')
      doc.setTextColor(40, 40, 40)
      // Truncar texto largo
      const lineas = doc.splitTextToSize(msg.contenido.slice(0, 500), 170)
      for (const linea of lineas) {
        if (y > 280) { doc.addPage(); y = 20 }
        doc.text(linea, 20, y)
        y += 5
      }
      y += 3

      if (y > 280) { doc.addPage(); y = 20 }
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Generado por Simulador 3D CONAF Los Lagos - WebLLM + KITRAL', 20, 290)

    const blob = doc.output('blob')
    descargarArchivo(await blob.arrayBuffer(), `simulacion_${Date.now()}.pdf`, 'application/pdf')
    return true
  } catch(e) {
    // Fallback: descargar como markdown si jsPDF falla
    const md = exportarMarkdown(mensajes, estadisticas)
    descargarArchivo(md, `simulacion_${Date.now()}.md`, 'text/markdown')
    return false
  }
}

/**
 * Exportar perimetro como GeoJSON/KMZ
 */
export function exportarKMZ(perimetro, estadisticas = {}) {
  const { tiempo_min = 0, hectareas = 0 } = estadisticas
  const fecha = new Date().toISOString()

  // Crear GeoJSON con perimetro
  const geojson = {
    type: 'FeatureCollection',
    features: [],
    metadata: {
      generado: fecha,
      tiempo_min,
      hectareas: hectareas.toFixed(1),
      simulador: 'CONAF-Simulador3D-KITRAL',
    }
  }

  if (perimetro && perimetro.length > 2) {
    // Cerrar el anillo
    const coords = perimetro.map(([lat, lng]) => [lng, lat])
    if (coords.length > 0) {
      coords.push(coords[0])  // cerrar polígono
    }

    geojson.features.push({
      type: 'Feature',
      properties: {
        nombre: 'Perimetro_Incendio',
        tiempo_min,
        hectareas: parseFloat(hectareas.toFixed(1)),
        fecha,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    })
  }

  const json = JSON.stringify(geojson, null, 2)
  descargarArchivo(json, `perimetro_incendio_${Date.now()}.geojson`, 'application/json')
  return geojson
}

/**
 * Exportar estadísticas como CSV
 */
export function exportarCSV(historial = []) {
  const headers = ['tiempo_min', 'hectareas', 'ros', 'viento_kmh', 'humedad', 'ardiendo', 'quemada']
  let csv = headers.join(',') + '\n'

  for (const h of historial) {
    const row = headers.map(k => h[k] ?? '').join(',')
    csv += row + '\n'
  }

  descargarArchivo(csv, `estadisticas_${Date.now()}.csv`, 'text/csv')
  return csv
}

export default { exportarMarkdown, exportarPDF, exportarKMZ, exportarCSV, descargarArchivo }
