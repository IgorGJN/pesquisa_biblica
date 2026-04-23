// entityService.js

import {
  STORES,
  addRecord,
  putRecord,
  getRecord,
  getAllRecords,
  softDeleteRecord,
  generateId
} from "./db.js";

export async function createEntity(data) {
  const entity = {
    id: generateId("ent"),
    type: data.type || "",
    subtype: data.subtype || "",
    name: data.name || "",
    summary: data.summary || "",
    description: data.description || "",
    tags: data.tags || "",
    status: data.status || "active",
    alt_names: data.alt_names || "",
    meta_json: data.meta_json || "{}"
  };

  return addRecord(STORES.entities, entity);
}

export async function updateEntity(id, data) {
  const existing = await getRecord(STORES.entities, id);

  if (!existing) {
    throw new Error("Entidade não encontrada.");
  }

  const updated = {
    ...existing,
    ...data
  };

  return putRecord(STORES.entities, updated);
}

export async function listEntities() {
  const entities = await getAllRecords(STORES.entities);
  return entities.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEntity(id) {
  return getRecord(STORES.entities, id);
}

export async function deleteEntity(id) {
  return softDeleteRecord(STORES.entities, id);
}