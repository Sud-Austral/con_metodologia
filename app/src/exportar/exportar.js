// Exportaciones 100% cliente (Seccion 8.2 exportar.js + Seccion 9 ejemplo 8
// del documento insumo). markdown/CSV/KML son puras (testeadas en Node).
// PDF usa jsPDF via CDN (solo navegador).

export function exportarMarkdown({ nombre, estadisticas, mensajes, decisiones }) {
  const fecha = new Date().toISOString().slice(0, 10)
  let md = `# Analisis IA — ${nombre || 'Simulacion'} — ${fecha}\n\n`
  md += `## Resumen\n\n`
  md += `- Tiempo: ${estadisticas.minutos ?? 0} min\n`
  md += `- Superficie quemada: ${estadisticas.hectareas ?? 0} ha\n`
  md += `- ROS: ${estadisticas.ros_cabeza ?? 0} m/min\n`
  md += `- Viento: ${estadisticas.vel_viento ?? 0} km/h / ${estadisticas.dir_viento ?? 0}°\n\n`
  md += `## Conversacion (${mensajes.length} mensajes)\n\n`
  for (const m of mensajes) {
    md += `**${m.rol === 'user' ? 'Despachador' : 'IA'}**: ${m.contenido}\n\n`
  }
  if (decisiones && decisiones.length) {
    md += `## Decisiones guardadas\n\n`
    for (const d of decisiones) md += `- ${d.descripcion || JSON.stringify(d)}\n`
  }
  return md
}

export function exportarCSV(serieEstadisticas) {
  const cols = ['tiempo_min', 'hectareas', 'ros_m_min']
  let csv = cols.join(',') + '\n'
  for (const fila of serieEstadisticas) {
    csv += cols.map(c => fila[c] ?? '').join(',') + '\n'
  }
  return csv
}

// KML/KMZ simplificado: generamos KML (XML) directo. "KMZ" real es un
// zip con el KML dentro; aqui generamos el .kml sin comprimir salvo que
// JSZip este disponible (navegador), documentado en metadatos.json.
export function gridAPoligonoKML(perimetro, origenLat, origenLng, cellSizeM) {
  const metrosPorGradoLat = 111320
  const metrosPorGradoLng = 111320 * Math.cos(origenLat * Math.PI / 180)
  const coords = perimetro.map(({ i, j }) => {
    const lat = origenLat + (j * cellSizeM) / metrosPorGradoLat
    const lng = origenLng + (i * cellSizeM) / metrosPorGradoLng
    return `${lng.toFixed(6)},${lat.toFixed(6)},0`
  }).join(' ')
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Perimetro incendio</name>
    <Placemark>
      <name>Perimetro</name>
      <Style><LineStyle><color>ff0000ff</color><width>3</width></LineStyle></Style>
      <LineString><coordinates>${coords}</coordinates></LineString>
    </Placemark>
  </Document>
</kml>`
}

export async function exportarKMZ(perimetro, origenLat, origenLng, cellSizeM) {
  const kml = gridAPoligonoKML(perimetro, origenLat, origenLng, cellSizeM)
  if (typeof window === 'undefined') return { kml, kmz: null, nota: 'Node: solo KML generado' }
  try {
    const { default: JSZip } = await import(/* webpackIgnore: true */ 'https://esm.run/jszip@3.10.1')
    const zip = new JSZip()
    zip.file('doc.kml', kml)
    const blob = await zip.generateAsync({ type: 'blob' })
    return { kml, kmz: blob }
  } catch (e) {
    return { kml, kmz: null, nota: `JSZip no disponible: ${e.message}` }
  }
}

export async function exportarPDF({ nombre, estadisticas, mensajes }) {
  if (typeof window === 'undefined') throw new Error('exportarPDF requiere navegador (jsPDF)')
  const { jsPDF } = await import(/* webpackIgnore: true */ 'https://esm.run/jspdf@2.5.1')
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`Analisis IA — ${nombre || 'Simulacion'}`, 14, 18)
  doc.setFontSize(11)
  let y = 30
  doc.text(`Hectareas: ${estadisticas.hectareas ?? 0}  ROS: ${estadisticas.ros_cabeza ?? 0} m/min`, 14, y)
  y += 10
  for (const m of mensajes.slice(-15)) {
    const linea = `${m.rol === 'user' ? 'Despachador' : 'IA'}: ${m.contenido}`.slice(0, 100)
    doc.text(linea, 14, y)
    y += 7
    if (y > 280) { doc.addPage(); y = 20 }
  }
  return doc.output('blob')
}
