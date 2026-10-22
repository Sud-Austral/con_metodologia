// Modelos de combustible KITRAL K1-K13
// Fuente: Manual KITRAL CONAF, coeficientes físicos validados en producción

export const MODELOS_KITRAL = {
  K1: {
    nombre: 'Pastizal fino corto',
    cargaCombustible: 0.5,    // ton/ha
    humedadExtincion: 12,     // %
    savr: 3500,               // superficie/volumen (ft-1)
    densidadBulto: 0.034,     // lb/ft3
    profundidadCama: 0.4,     // ft
    rosBase: 12,              // m/min referencia (viento 0, pendiente 0, hum 8%)
    alturaLlamaRef: 1.5,      // m referencia
  },
  K2: {
    nombre: 'Pastizal fino largo',
    cargaCombustible: 1.0,
    humedadExtincion: 15,
    savr: 3000,
    densidadBulto: 0.046,
    profundidadCama: 0.6,
    rosBase: 9,
    alturaLlamaRef: 2.0,
  },
  K3: {
    nombre: 'Matorral bajo disperso',
    cargaCombustible: 1.5,
    humedadExtincion: 20,
    savr: 2000,
    densidadBulto: 0.057,
    profundidadCama: 1.0,
    rosBase: 6,
    alturaLlamaRef: 2.5,
  },
  K4: {
    nombre: 'Matorral bajo denso',
    cargaCombustible: 2.5,
    humedadExtincion: 22,
    savr: 1800,
    densidadBulto: 0.068,
    profundidadCama: 1.5,
    rosBase: 5,
    alturaLlamaRef: 3.0,
  },
  K5: {
    nombre: 'Matorral alto disperso',
    cargaCombustible: 3.5,
    humedadExtincion: 25,
    savr: 1500,
    densidadBulto: 0.08,
    profundidadCama: 2.0,
    rosBase: 4,
    alturaLlamaRef: 4.0,
  },
  K6: {
    nombre: 'Matorral alto denso',
    cargaCombustible: 5.0,
    humedadExtincion: 28,
    savr: 1200,
    densidadBulto: 0.09,
    profundidadCama: 2.5,
    rosBase: 3.5,
    alturaLlamaRef: 5.0,
  },
  K7: {
    nombre: 'Chaparral intermedio',
    cargaCombustible: 6.0,
    humedadExtincion: 30,
    savr: 1000,
    densidadBulto: 0.1,
    profundidadCama: 2.5,
    rosBase: 3.0,
    alturaLlamaRef: 5.5,
  },
  K8: {
    nombre: 'Bosque abierto hojarasca compacta',
    cargaCombustible: 4.0,
    humedadExtincion: 30,
    savr: 2000,
    densidadBulto: 0.068,
    profundidadCama: 0.2,
    rosBase: 2.5,
    alturaLlamaRef: 2.0,
  },
  K9: {
    nombre: 'Hojarasca de bosque comprimida',
    cargaCombustible: 5.0,
    humedadExtincion: 25,
    savr: 2500,
    densidadBulto: 0.08,
    profundidadCama: 0.2,
    rosBase: 2.0,
    alturaLlamaRef: 1.5,
  },
  K10: {
    nombre: 'Bosque denso con sotobosque',
    cargaCombustible: 8.0,
    humedadExtincion: 35,
    savr: 1500,
    densidadBulto: 0.138,
    profundidadCama: 1.0,
    rosBase: 1.8,
    alturaLlamaRef: 3.0,
  },
  K11: {
    nombre: 'Bosque maduro con material grueso',
    cargaCombustible: 12.0,
    humedadExtincion: 40,
    savr: 1500,
    densidadBulto: 0.092,
    profundidadCama: 1.0,
    rosBase: 1.5,
    alturaLlamaRef: 2.5,
  },
  K12: {
    nombre: 'Bosque con combustible aéreo',
    cargaCombustible: 15.0,
    humedadExtincion: 40,
    savr: 1500,
    densidadBulto: 0.092,
    profundidadCama: 2.5,
    rosBase: 1.2,
    alturaLlamaRef: 4.0,
  },
  K13: {
    nombre: 'Bosque denso con material húmedo',
    cargaCombustible: 20.0,
    humedadExtincion: 50,
    savr: 1500,
    densidadBulto: 0.092,
    profundidadCama: 3.0,
    rosBase: 0.8,
    alturaLlamaRef: 2.0,
  },
}

export function getModelo(id) {
  return MODELOS_KITRAL[id] || MODELOS_KITRAL.K2
}

// Clasificar modelo por elevación y pendiente (sin SIDCO/SUT)
export function clasificarCombustible(elev, pendiente, p40, p72) {
  if (elev > p72 && pendiente > 0.2) return 'K1'  // pastizal pasto
  if (elev > p72 && pendiente <= 0.2) return 'K2'  // pastizal largo
  if (elev > p40 && pendiente > 0.3) return 'K3'  // matorral bajo disperso
  if (elev > p40) return 'K4'                       // matorral bajo denso
  return 'K8'                                        // bosque abierto
}
