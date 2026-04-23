// relationService.js

import {
  STORES,
  addRecord,
  putRecord,
  getRecord,
  getAllRecords,
  softDeleteRecord,
  generateId
} from "./db.js";

export async function createRelation(data) {
  const relation = {
    id: generateId("rel"),
    source_id: data.source_id || "",
    relation_type_key: data.relation_type_key || "",
    target_id: data.target_id || "",
    label: data.label || "",
    start_year: data.start_year || "",
    end_year: data.end_year || "",
    start_approx: Boolean(data.start_approx),
    end_approx: Boolean(data.end_approx),
    date_text: data.date_text || "",
    notes: data.notes || "",
    source_ids: data.source_ids || "",
    confidence: data.confidence || "",
    order_index: data.order_index || "",
    meta_json: data.meta_json || "{}"
  };

  return addRecord(STORES.relations, relation);
}

export async function updateRelation(id, data) {
  const existing = await getRecord(STORES.relations, id);

  if (!existing) {
    throw new Error("Relação não encontrada.");
  }

  return putRecord(STORES.relations, {
    ...existing,
    ...data
  });
}

export async function getRelation(id) {
  return getRecord(STORES.relations, id);
}

export async function listRelations() {
  return getAllRecords(STORES.relations);
}

export async function listRelationsByEntity(entityId) {
  const records = await getAllRecords(STORES.relations);

  return records.filter((item) => {
    return item.source_id === entityId || item.target_id === entityId;
  });
}

export async function listRelationsBySource(entityId) {
  const records = await getAllRecords(STORES.relations);
  return records.filter((item) => item.source_id === entityId);
}

export async function listRelationsByTarget(entityId) {
  const records = await getAllRecords(STORES.relations);
  return records.filter((item) => item.target_id === entityId);
}

export async function deleteRelation(id) {
  return softDeleteRecord(STORES.relations, id);
}