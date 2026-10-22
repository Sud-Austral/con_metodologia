// Persistencia en IndexedDB (reemplaza PostgreSQL de la Seccion 7.2:
// tablas chat_conversaciones / chat_mensajes del documento insumo).
// Recuperable al reabrir el navegador (verificado manualmente, ver
// ejercicio/VERIFICACION.md).

const DB_NAME = 'simulador3d_incendios'
const DB_VERSION = 1

export function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('mensajes')) {
        const store = db.createObjectStore('mensajes', { keyPath: 'id', autoIncrement: true })
        store.createIndex('conversacion_id', 'conversacion_id')
      }
      if (!db.objectStoreNames.contains('decisiones')) {
        db.createObjectStore('decisiones', { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function guardarMensaje({ conversacion_id, rol, contenido, tokens = null, modelo = null }) {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mensajes', 'readwrite')
    tx.objectStore('mensajes').add({
      conversacion_id, rol, contenido, tokens, modelo, timestamp: new Date().toISOString(),
    })
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}

export async function listarMensajes(conversacion_id) {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mensajes', 'readonly')
    const idx = tx.objectStore('mensajes').index('conversacion_id')
    const req = idx.getAll(conversacion_id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function guardarDecision(decision) {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('decisiones', 'readwrite')
    tx.objectStore('decisiones').add({ ...decision, timestamp: new Date().toISOString() })
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}

export async function listarDecisiones() {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('decisiones', 'readonly')
    const req = tx.objectStore('decisiones').getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
