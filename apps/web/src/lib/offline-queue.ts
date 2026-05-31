const DB_NAME = 'pommier-pos'
const STORE = 'ventes-offline'
const VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'localId' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export type VenteOffline = {
  localId: string
  payload: Record<string, unknown>
  createdAt: string
}

export async function enqueueVente(payload: Record<string, unknown>): Promise<string> {
  const db = await openDB()
  const localId = `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const record: VenteOffline = { localId, payload, createdAt: new Date().toISOString() }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add(record)
    tx.oncomplete = () => resolve(localId)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getOfflineVentes(): Promise<VenteOffline[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as VenteOffline[])
    req.onerror = () => reject(req.error)
  })
}

export async function removeOfflineVente(localId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(localId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function syncOfflineVentes(): Promise<{ synced: number; failed: number }> {
  const ventes = await getOfflineVentes()
  let synced = 0
  let failed = 0
  for (const v of ventes) {
    try {
      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v.payload),
      })
      if (res.ok || res.status === 409) {
        await removeOfflineVente(v.localId)
        synced++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }
  return { synced, failed }
}
