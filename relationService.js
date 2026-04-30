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

const SYMMETRIC_RELATION_TYPES = new Set([
  "conjuge_de"
]);

function normalizeRelationData(data) {
  return {
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
}

function validateRelationData(data) {
  if (!data.source_id) {
    throw new Error("Origem da relação não informada.");
  }

  if (!data.relation_type_key) {
    throw new Error("Tipo de relação não informado.");
  }

  if (!data.target_id) {
    throw new Error("Destino da relação não informado.");
  }

  if (data.source_id === data.target_id) {
    throw new Error("Uma entidade não pode se relacionar consigo mesma.");
  }
}

function isSymmetricRelationType(relationTypeKey) {
  return SYMMETRIC_RELATION_TYPES.has(relationTypeKey);
}

export function areSameRelation(a, b) {
  if (!a || !b) return false;

  const sameType = a.relation_type_key === b.relation_type_key;

  if (!sameType) return false;

  const sameDirection =
    a.source_id === b.source_id &&
    a.target_id === b.target_id;

  if (sameDirection) return true;

  if (isSymmetricRelationType(a.relation_type_key)) {
    const inverseDirection =
      a.source_id === b.target_id &&
      a.target_id === b.source_id;

    if (inverseDirection) return true;
  }

  return false;
}

export async function findExistingRelation(data, options = {}) {
  const { ignoreId = "" } = options;

  const relation = normalizeRelationData(data);
  const records = await getAllRecords(STORES.relations);

  return (
    records.find((item) => {
      if (ignoreId && item.id === ignoreId) return false;

      return areSameRelation(item, relation);
    }) || null
  );
}

export async function relationExists(data, options = {}) {
  const existing = await findExistingRelation(data, options);
  return Boolean(existing);
}

export async function createRelation(data) {
  const relationData = normalizeRelationData(data);

  validateRelationData(relationData);

  const existing = await findExistingRelation(relationData);

  if (existing) {
    return existing;
  }

  const relation = {
    id: generateId("rel"),
    ...relationData
  };

  return addRecord(STORES.relations, relation);
}

export async function createRelationSafe(data) {
  return createRelation(data);
}

export async function ensureRelation(data) {
  return createRelation(data);
}

export async function updateRelation(id, data) {
  const existing = await getRecord(STORES.relations, id);

  if (!existing) {
    throw new Error("Relação não encontrada.");
  }

  const updated = normalizeRelationData({
    ...existing,
    ...data
  });

  validateRelationData(updated);

  const duplicate = await findExistingRelation(updated, {
    ignoreId: id
  });

  if (duplicate) {
    throw new Error("Já existe uma relação igual cadastrada.");
  }

  return putRecord(STORES.relations, {
    ...existing,
    ...updated,
    id
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

  return records.filter((item) => {
    return item.source_id === entityId;
  });
}

export async function listRelationsByTarget(entityId) {
  const records = await getAllRecords(STORES.relations);

  return records.filter((item) => {
    return item.target_id === entityId;
  });
}

export async function deleteRelation(id) {
  return softDeleteRecord(STORES.relations, id);
}