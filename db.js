// db.js

export const DB_NAME = "biblia_pwa_db";
export const DB_VERSION = 1;

export const STORES = {
  entities: "entities",
  time_spans: "time_spans",
  relations: "relations",
  relation_types: "relation_types",
  sources: "sources",
  sync_log: "sync_log",
  settings: "settings"
};

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      createStore(db, STORES.entities, "id", [
        "type",
        "subtype",
        "name",
        "status",
        "updated_at"
      ]);

      createStore(db, STORES.time_spans, "id", [
        "entity_id",
        "kind",
        "start_year",
        "end_year",
        "updated_at"
      ]);

      createStore(db, STORES.relations, "id", [
        "source_id",
        "target_id",
        "relation_type_key",
        "updated_at"
      ]);

      createStore(db, STORES.relation_types, "key", [
        "category",
        "active",
        "updated_at"
      ]);

      createStore(db, STORES.sources, "id", [
        "source_type",
        "citation",
        "updated_at"
      ]);

      createStore(db, STORES.sync_log, "id", [
        "action",
        "status",
        "created_at"
      ]);

      createStore(db, STORES.settings, "key", []);
    };
  });
}

function createStore(db, storeName, keyPath, indexes = []) {
  if (db.objectStoreNames.contains(storeName)) return;

  const store = db.createObjectStore(storeName, { keyPath });

  indexes.forEach((indexName) => {
    store.createIndex(indexName, indexName, { unique: false });
  });
}

export async function addRecord(storeName, record) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    const now = new Date().toISOString();

    const finalRecord = {
      ...record,
      created_at: record.created_at || now,
      updated_at: now,
      deleted_at: record.deleted_at || "",
      version: record.version || 1
    };

    const request = store.add(finalRecord);

    request.onsuccess = () => resolve(finalRecord);
    request.onerror = () => reject(request.error);
  });
}

export async function putRecord(storeName, record) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    const now = new Date().toISOString();

    const finalRecord = {
      ...record,
      updated_at: now,
      version: Number(record.version || 0) + 1
    };

    const request = store.put(finalRecord);

    request.onsuccess = () => resolve(finalRecord);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecord(storeName, id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);

    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllRecords(storeName, includeDeleted = false) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);

    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result || [];

      if (includeDeleted) {
        resolve(records);
      } else {
        resolve(records.filter((item) => !item.deleted_at));
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function softDeleteRecord(storeName, id) {
  const record = await getRecord(storeName, id);

  if (!record) return null;

  record.deleted_at = new Date().toISOString();

  return putRecord(storeName, record);
}

export async function hardDeleteRecord(storeName, id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function exportBackup() {
  return {
    entities: await getAllRecords(STORES.entities, true),
    time_spans: await getAllRecords(STORES.time_spans, true),
    relations: await getAllRecords(STORES.relations, true),
    relation_types: await getAllRecords(STORES.relation_types, true),
    sources: await getAllRecords(STORES.sources, true),
    sync_log: await getAllRecords(STORES.sync_log, true),
    settings: await getAllRecords(STORES.settings, true)
  };
}

export async function restoreBackup(data) {
  const storesToRestore = [
    STORES.entities,
    STORES.time_spans,
    STORES.relations,
    STORES.relation_types,
    STORES.sources,
    STORES.sync_log,
    STORES.settings
  ];

  for (const storeName of storesToRestore) {
    await clearStore(storeName);

    const records = data[storeName] || [];

    for (const record of records) {
      await putRecord(storeName, record);
    }
  }

  return true;
}

export function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}