/**
 * Offline Queue — IndexedDB-based CDR draft storage
 * 
 * When network is unavailable:
 *   1. CDR draft saved to IndexedDB
 *   2. Queue marker set
 *   3. When online, sync() pushes all queued items to Supabase
 *   4. On success, removes from local queue
 * 
 * Idempotency: each entry has a local UUID that becomes
 * the idempotency key to prevent duplicate submissions.
 */

const DB_NAME = "fp_theatre_offline";
const DB_VERSION = 1;
const STORE_CDR = "cdr_drafts";
const STORE_PHOTOS = "cdr_photos";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CDR)) {
        db.createObjectStore(STORE_CDR, { keyPath: "localId" });
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: "localId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface OfflineCDR {
  localId: string;
  bookingId: string;
  showDate: string;
  showNumber: number;
  showTiming: string;
  filmDay: number;
  classEntries: Array<{
    className: string;
    pricePaise: number;
    qty: number;
    snoFrom: number;
    snoTo: number;
    totalPaise: number;
    displayOrder: number;
  }>;
  channel: { bms: number; district: number; counter: number; comp: number };
  totalQty: number;
  grossPaise: number;
  gstPaise: number;
  bmsCommissionPaise: number;
  districtCommissionPaise: number;
  netCollectionPaise: number;
  status: "draft" | "queued";
  createdAt: string;
  syncAttempts: number;
  lastError?: string;
}

/** Save CDR draft to IndexedDB */
export async function saveDraftOffline(cdr: OfflineCDR): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CDR, "readwrite");
    tx.objectStore(STORE_CDR).put(cdr);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Save photo blob for offline CDR */
export async function savePhotoOffline(
  localId: string,
  photoBlob: Blob
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, "readwrite");
    tx.objectStore(STORE_PHOTOS).put({ localId, blob: photoBlob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all queued CDRs */
export async function getQueuedCDRs(): Promise<OfflineCDR[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CDR, "readonly");
    const req = tx.objectStore(STORE_CDR).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** Get photo blob for a CDR */
export async function getPhotoOffline(
  localId: string
): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, "readonly");
    const req = tx.objectStore(STORE_PHOTOS).get(localId);
    req.onsuccess = () => resolve(req.result?.blob || null);
    req.onerror = () => reject(req.error);
  });
}

/** Remove synced CDR from queue */
export async function removeSynced(localId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CDR, STORE_PHOTOS], "readwrite");
    tx.objectStore(STORE_CDR).delete(localId);
    tx.objectStore(STORE_PHOTOS).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Update sync attempt count and error */
export async function markSyncFailed(
  localId: string,
  error: string
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_CDR, "readwrite");
  const store = tx.objectStore(STORE_CDR);
  const req = store.get(localId);
  req.onsuccess = () => {
    if (req.result) {
      req.result.syncAttempts = (req.result.syncAttempts || 0) + 1;
      req.result.lastError = error;
      store.put(req.result);
    }
  };
}

/** Check if we have queued items */
export async function hasQueuedItems(): Promise<boolean> {
  const items = await getQueuedCDRs();
  return items.length > 0;
}

/** Get queue count */
export async function getQueueCount(): Promise<number> {
  const items = await getQueuedCDRs();
  return items.length;
}

/** Generate a local UUID for idempotency */
export function generateLocalId(): string {
  return "local_" + crypto.randomUUID();
}

/** Check if online */
export function isOnline(): boolean {
  return navigator.onLine;
}

/** Sync all queued CDRs to Supabase */
export async function syncQueue(
  submitFn: (cdr: OfflineCDR, photoBlob: Blob | null) => Promise<boolean>
): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) return { synced: 0, failed: 0 };

  const queued = await getQueuedCDRs();
  let synced = 0;
  let failed = 0;

  for (const cdr of queued) {
    if (cdr.syncAttempts >= 3) {
      failed++;
      continue;
    }

    try {
      const photo = await getPhotoOffline(cdr.localId);
      const success = await submitFn(cdr, photo);
      if (success) {
        await removeSynced(cdr.localId);
        synced++;
      } else {
        await markSyncFailed(cdr.localId, "Submit returned false");
        failed++;
      }
    } catch (err) {
      await markSyncFailed(
        cdr.localId,
        err instanceof Error ? err.message : "Unknown error"
      );
      failed++;
    }
  }

  return { synced, failed };
}
