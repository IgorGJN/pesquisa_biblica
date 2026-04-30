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

import { normalizeText } from "./utils/text.js";

function normalizeSourceData(data) {
  return {
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
}

function splitIds(value) {
  return String(value || "")
    .split("|")
    .map((id) => id.trim())
    .filter(Boolean);
}

function sameIdList(a, b) {
  const listA = splitIds(a).sort();
  const listB = splitIds(b).sort();

  if (listA.length !== listB.length) return false;

  return listA.every((id, index) => id === listB[index]);
}

export function areSameSource(a, b) {
  if (!a || !b) return false;

  const sameBasicData =
    normalizeText(a.source_type) === normalizeText(b.source_type) &&
    normalizeText(a.citation) === normalizeText(b.citation) &&
    normalizeText(a.reference) === normalizeText(b.reference) &&
    normalizeText(a.url) === normalizeText(b.url) &&
    normalizeText(a.notes) === normalizeText(b.notes);

  if (!sameBasicData) return false;

  return (
    sameIdList(a.related_entity_ids, b.related_entity_ids) &&
    sameIdList(a.related_relation_ids, b.related_relation_ids) &&
    sameIdList(a.related_time_span_ids, b.related_time_span_ids)
  );
}

export async function findExistingSource(data, options = {}) {
  const { ignoreId = "" } = options;

  const sourceData = normalizeSourceData(data);
  const sources = await getAllRecords(STORES.sources);

  return (
    sources.find((source) => {
      if (ignoreId && source.id === ignoreId) return false;

      return areSameSource(source, sourceData);
    }) || null
  );
}

export async function sourceExists(data, options = {}) {
  const existing = await findExistingSource(data, options);
  return Boolean(existing);
}

export async function createSource(data) {
  const sourceData = normalizeSourceData(data);

  const existing = await findExistingSource(sourceData);

  if (existing) {
    return existing;
  }

  const source = {
    id: generateId("src"),
    ...sourceData
  };

  return addRecord(STORES.sources, source);
}

export async function ensureSource(data) {
  return createSource(data);
}

export async function updateSource(id, data) {
  const existing = await getRecord(STORES.sources, id);

  if (!existing) {
    throw new Error("Fonte não encontrada.");
  }

  const updated = normalizeSourceData({
    ...existing,
    ...data
  });

  const duplicate = await findExistingSource(updated, {
    ignoreId: id
  });

  if (duplicate) {
    throw new Error("Já existe uma fonte igual cadastrada.");
  }

  return putRecord(STORES.sources, {
    ...existing,
    ...updated,
    id
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
    const ids = splitIds(source.related_entity_ids);
    return ids.includes(entityId);
  });
}

export async function listSourcesByRelation(relationId) {
  const sources = await getAllRecords(STORES.sources);

  return sources.filter((source) => {
    const ids = splitIds(source.related_relation_ids);
    return ids.includes(relationId);
  });
}

export async function listSourcesByTimeSpan(timeSpanId) {
  const sources = await getAllRecords(STORES.sources);

  return sources.filter((source) => {
    const ids = splitIds(source.related_time_span_ids);
    return ids.includes(timeSpanId);
  });
}

export async function deleteSource(id) {
  return softDeleteRecord(STORES.sources, id);
}