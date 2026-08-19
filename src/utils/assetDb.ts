const DB_NAME = 'lps-assets';
const STORE_NAME = 'lps-assets';
const DB_VERSION = 1;

export type AssetDbErrorCode = 'unavailable' | 'quota' | 'unknown';

export class AssetDbError extends Error {
  readonly code: AssetDbErrorCode;

  constructor(code: AssetDbErrorCode, message: string) {
    super(message);
    this.name = 'AssetDbError';
    this.code = code;
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;
let availability: boolean | null = null;

function toAssetDbError(error: DOMException | Error | null): AssetDbError {
  if (error && 'name' in error && error.name === 'QuotaExceededError') {
    return new AssetDbError('quota', error.message);
  }
  if (error && 'name' in error && error.name === 'InvalidStateError') {
    return new AssetDbError('unavailable', error.message);
  }
  return new AssetDbError('unknown', error?.message ?? 'IndexedDB error');
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      dbPromise = null;
      reject(new AssetDbError('unavailable', 'IndexedDB is not defined'));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      dbPromise = null;
      reject(toAssetDbError(error instanceof Error ? error : null));
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(toAssetDbError(request.error));
    };

    request.onblocked = () => {
      dbPromise = null;
      reject(new AssetDbError('unavailable', 'IndexedDB open blocked'));
    };
  });

  return dbPromise;
}

export async function isAssetDbAvailable(): Promise<boolean> {
  if (availability !== null) return availability;
  try {
    const db = await openDb();
    availability = Boolean(db);
    return availability;
  } catch {
    availability = false;
    dbPromise = null;
    return false;
  }
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let value: T;
        try {
          const tx = db.transaction(STORE_NAME, mode);
          const request = run(tx.objectStore(STORE_NAME));
          request.onsuccess = () => {
            value = request.result;
          };
          request.onerror = () => reject(toAssetDbError(request.error));
          tx.oncomplete = () => resolve(value);
          tx.onerror = () => reject(toAssetDbError(tx.error));
          tx.onabort = () => reject(toAssetDbError(tx.error));
        } catch (error) {
          reject(toAssetDbError(error instanceof Error ? error : null));
        }
      }),
  );
}

export async function putAssetBlob(blobKey: string, blob: Blob): Promise<void> {
  await withStore('readwrite', (store) => store.put(blob, blobKey));
}

export async function getAssetBlob(blobKey: string): Promise<Blob | null> {
  const result = await withStore('readonly', (store) => store.get(blobKey));
  return result instanceof Blob ? result : null;
}

export async function deleteAssetBlob(blobKey: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(blobKey));
}

export async function deleteAssetBlobs(blobKeys: string[]): Promise<void> {
  if (blobKeys.length === 0) return;
  const unique = [...new Set(blobKeys)];
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const key of unique) {
        store.delete(key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(toAssetDbError(tx.error));
      tx.onabort = () => reject(toAssetDbError(tx.error));
    } catch (error) {
      reject(toAssetDbError(error instanceof Error ? error : null));
    }
  });
}
