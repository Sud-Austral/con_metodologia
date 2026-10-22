// Persistencia IndexedDB para conversaciones y decisiones
// Usa la librería idb para simplificar el API

import { openDB } from 'idb'

const DB_NAME = 'simulador3d-conaf'
const DB_VERSION = 1

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('mensajes')) {
        const store = db.createObjectStore('mensajes', { keyPath: 'id', autoIncrement: true })
        store.createIndex('simulacion_id', 'simulacion_id', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
      if (!db.objectStoreNames.contains('decisiones')) {
        const store = db.createObjectStore('decisiones', { keyPath: 'id', autoIncrement: true })
        store.createIndex('simulacion_id', 'simulacion_id', { unique: false })
      }
      if (!db.objectStoreNames.contains('simulaciones')) {
        db.createObjectStore('simulaciones', { keyPath: 'id' })
      }
    }
  })
}

/**
 * Guardar mensaje de chat
 */
export async function guardarMensaje(msg) {
  try {
    const db = await getDB()
    const id = await db.add('mensajes', {
      ...msg,
      timestamp: msg.timestamp || new Date().toISOString(),
    })
    return id
  } catch(e) {
    console.warn('Error guardarMensaje:', e)
    return null
  }
}

/**
 * Cargar mensajes de una simulación
 */
export async function cargarMensajes(simulacion_id) {
  try {
    const db = await getDB()
    return await db.getAllFromIndex('mensajes', 'simulacion_id', simulacion_id)
  } catch(e) {
    console.warn('Error cargarMensajes:', e)
    return []
  }
}

/**
 * Guardar decisión táctica
 */
export async function guardarDecision(decision) {
  try {
    const db = await getDB()
    return await db.add('decisiones', {
      ...decision,
      timestamp: new Date().toISOString(),
    })
  } catch(e) {
    console.warn('Error guardarDecision:', e)
    return null
  }
}

/**
 * Cargar decisiones
 */
export async function cargarDecisiones(simulacion_id) {
  try {
    const db = await getDB()
    if (simulacion_id) {
      return await db.getAllFromIndex('decisiones', 'simulacion_id', simulacion_id)
    }
    return await db.getAll('decisiones')
  } catch(e) {
    console.warn('Error cargarDecisiones:', e)
    return []
  }
}

/**
 * Guardar estado de simulación
 */
export async function guardarSimulacion(sim) {
  try {
    const db = await getDB()
    await db.put('simulaciones', sim)
    return true
  } catch(e) {
    console.warn('Error guardarSimulacion:', e)
    return false
  }
}

/**
 * Cargar simulación por ID
 */
export async function cargarSimulacion(id) {
  try {
    const db = await getDB()
    return await db.get('simulaciones', id)
  } catch(e) {
    return null
  }
}

export default { guardarMensaje, cargarMensajes, guardarDecision, cargarDecisiones, guardarSimulacion, cargarSimulacion }
