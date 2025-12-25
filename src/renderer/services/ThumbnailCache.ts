// Minimal IndexedDB-backed thumbnail cache for progressive artwork loading
const DB_NAME = 'player-thumbnails';
const STORE_NAME = 'thumbs';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getThumb(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const r = store.get(key);
      r.onsuccess = () => resolve(r.result?.data || null);
      r.onerror = () => reject(r.error);
    });
  } catch (e) {
    console.error('[ThumbnailCache] getThumb failed', e);
    return null;
  }
}

export async function setThumb(key: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const r = store.put({ key, data: dataUrl, ts: Date.now() });
      r.onsuccess = () => resolve(undefined);
      r.onerror = () => reject(r.error);
    });
    // After inserting, enforce an eviction policy to avoid unbounded growth
    await evictOldThumbnails(200);
  } catch (e) {
    console.error('[ThumbnailCache] setThumb failed', e);
  }
}

export async function evictOldThumbnails(maxEntries = 200) {
  try {
    const db = await openDB();
    const all: Array<{ key: string; ts: number }> = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const items: Array<{ key: string; ts: number }> = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) { resolve(items); return; }
        const val = cur.value;
        items.push({ key: val.key, ts: val.ts });
        cur.continue();
      };
      req.onerror = () => reject(req.error);
    });
    if (all.length <= maxEntries) return;
    all.sort((a, b) => a.ts - b.ts);
    const toDelete = all.slice(0, all.length - maxEntries).map(i => i.key);
    if (toDelete.length === 0) return;
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      let pending = toDelete.length;
      if (pending === 0) { resolve(undefined); return; }
      for (const k of toDelete) {
        const r = store.delete(k);
        r.onsuccess = () => { pending -= 1; if (pending === 0) resolve(undefined); };
        r.onerror = () => { pending -= 1; if (pending === 0) resolve(undefined); };
      }
    });
  } catch (e) {
    console.error('[ThumbnailCache] eviction failed', e);
  }
}

export async function getThumbStats() {
  try {
    const db = await openDB();
    return await new Promise<{ count: number }>((resolve, _reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const r = store.count();
      r.onsuccess = () => resolve({ count: Number(r.result) });
      r.onerror = () => resolve({ count: 0 });
    });
  } catch (e) {
    console.error('[ThumbnailCache] stats failed', e);
    return { count: 0 };
  }
}

export async function generateThumbnailFromDataUrl(dataUrl: string, size = 128): Promise<string> {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = img.width / img.height;
        let w = size, h = size;
        if (ratio > 1) { h = Math.round(size / ratio); } else { w = Math.round(size * ratio); }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas context unavailable'));
        ctx.drawImage(img, 0, 0, w, h);
        const thumb = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumb);
      };
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
    });
  } catch (e) {
    console.error('[ThumbnailCache] generate failed', e);
    throw e;
  }
}
