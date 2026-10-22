// Modelos de combustible KITRAL (K1-K13), aproximados.
//
// IMPORTANTE (ver ejercicio/metadatos.json -> supuestos):
// Los valores rosBase/coefViento/coefPendiente/humedadExtincion de esta tabla
// son una aproximacion razonable construida para este ejercicio, NO son los
// coeficientes oficiales calibrados del sistema KITRAL (CONAF/USACH). El
// documento insumo no incluye la tabla numerica real, solo nombra K1-K13.
// No se dispone en este repo del archivo original
// frontend/src/pages/simulacion/motores/kitral.js (marcado NO TOCAR en la
// Seccion 2 del documento) para copiarlo: este repo nace vacio. Se construyo
// una tabla propia, documentada como aproximada.

export const MODELOS_KITRAL = {
  K1: { nombre: 'Pastizal bajo', rosBase: 3.0, coefViento: 0.045, coefPendiente: 1.8, humedadExtincion: 20 },
  K2: { nombre: 'Matorral bajo', rosBase: 2.2, coefViento: 0.040, coefPendiente: 1.7, humedadExtincion: 22 },
  K3: { nombre: 'Matorral medio', rosBase: 1.8, coefViento: 0.036, coefPendiente: 1.6, humedadExtincion: 24 },
  K4: { nombre: 'Matorral alto / renoval', rosBase: 1.5, coefViento: 0.032, coefPendiente: 1.5, humedadExtincion: 26 },
  K5: { nombre: 'Plantacion joven', rosBase: 1.3, coefViento: 0.030, coefPendiente: 1.4, humedadExtincion: 28 },
  K6: { nombre: 'Plantacion adulta con sotobosque', rosBase: 1.1, coefViento: 0.028, coefPendiente: 1.3, humedadExtincion: 30 },
  K7: { nombre: 'Plantacion adulta podada', rosBase: 0.9, coefViento: 0.026, coefPendiente: 1.2, humedadExtincion: 31 },
  K8: { nombre: 'Bosque nativo abierto', rosBase: 0.8, coefViento: 0.024, coefPendiente: 1.1, humedadExtincion: 32 },
  K9: { nombre: 'Bosque nativo semidenso', rosBase: 0.65, coefViento: 0.022, coefPendiente: 1.0, humedadExtincion: 33 },
  K10: { nombre: 'Bosque nativo denso', rosBase: 0.5, coefViento: 0.020, coefPendiente: 0.9, humedadExtincion: 34 },
  K11: { nombre: 'Bosque mixto con residuos', rosBase: 0.55, coefViento: 0.022, coefPendiente: 1.0, humedadExtincion: 33 },
  K12: { nombre: 'Residuos de cosecha (slash)', rosBase: 1.6, coefViento: 0.038, coefPendiente: 1.5, humedadExtincion: 25 },
  K13: { nombre: 'Bosque denso muy humedo', rosBase: 0.35, coefViento: 0.016, coefPendiente: 0.8, humedadExtincion: 38 },
}

export const C_PASTO = ['K1', 'K2']
export const C_MATORRAL = ['K3', 'K4', 'K12']
export const C_ARBOLADO = ['K5', 'K6', 'K7', 'K8', 'K9', 'K10', 'K11', 'K13']

// Clasificacion automatica por percentiles de elevacion + pendiente
// (algoritmo descrito en Seccion 5.2 del documento insumo).
export function clasificarCombustible(dem, pendiente, nx, ny) {
  const ordenado = Float32Array.from(dem).sort()
  const p40 = ordenado[Math.floor(0.40 * (ordenado.length - 1))]
  const p72 = ordenado[Math.floor(0.72 * (ordenado.length - 1))]
  const modelos = new Array(nx * ny)
  for (let idx = 0; idx < nx * ny; idx++) {
    const elev = dem[idx]
    const pend = pendiente[idx]
    let grupo
    if (elev > p72 && pend > 0.2) grupo = C_PASTO
    else if (elev > p40) grupo = C_MATORRAL
    else grupo = C_ARBOLADO
    modelos[idx] = grupo[idx % grupo.length]
  }
  return modelos
}
