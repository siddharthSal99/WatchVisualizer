const DB_NAME = 'WatchVisualizerGallery'
const DB_VERSION = 1
const STORE_NAME = 'generations'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Save a generated watch image to the gallery.
 * @param {Object} entry
 * @param {string} entry.imageDataUrl - The generated image (data URL or external URL)
 * @param {string[]} entry.partsUsed - Array of part IDs that were uploaded
 * @param {Object} entry.colorCustomizations - Color overrides used
 * @returns {Promise<number>} The ID of the saved entry
 */
export async function saveGeneration(entry) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const record = {
      imageDataUrl: entry.imageDataUrl,
      partsUsed: entry.partsUsed || [],
      colorCustomizations: entry.colorCustomizations || {},
      timestamp: Date.now(),
    }

    const request = store.add(record)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * Get all saved generations, newest first.
 * @returns {Promise<Array>}
 */
export async function getAllGenerations() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const results = request.result || []
      // Sort newest first
      results.sort((a, b) => b.timestamp - a.timestamp)
      resolve(results)
    }
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * Delete a generation by ID.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteGeneration(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * Clear all generations.
 * @returns {Promise<void>}
 */
export async function clearAllGenerations() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

