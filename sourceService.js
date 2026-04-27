// sourceService.js

import {
  STORES,
  addRecord,
  putRecord,
  getRecord,
  getAllRecords,
  softDeleteRecord,
  generateId
} from "./db.js";

export async function createSource(data) {
  const source = {
    id: generateId("src"),
    source_type: data.source_type || "biblical",
    citation: data.citation || "",
    reference: data.reference || "",
    excerpt: data.excerpt || "",
    url: data.url || "",
    notes: data.notes || "",
    related_entity_ids: data.related_entity_ids || "",
    related_relation_ids: data.related_relation_ids || "",
    related_time_span_ids: data.related_time_span_ids || "",
    meta_json: data.meta_json || "{}"
  };

  return addRecord(STORES.sources, source);
}

export async function updateSource(id, data) {
  const existing = await getRecord(STORES.sources, id);

  if (!existing) {
    throw new Error("Fonte não encontrada.");
  }

  return putRecord(STORES.sources, {
    ...existing,
    ...data
  });
}

export async function listSources() {
  return getAllRecords(STORES.sources);
}

export async function getSource(id) {
  return getRecord(STORES.sources, id);
}

export async function listSourcesByEntity(entityId) {
  const sources = await getAllRecords(STORES.sources);

  return sources.filter((source) => {
    const ids = String(source.related_entity_ids || "").split("|");
    return ids.includes(entityId);
  });
}

export async function deleteSource(id) {
  return softDeleteRecord(STORES.sources, id);
}