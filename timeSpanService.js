// timeSpanService.js

import {
  STORES,
  addRecord,
  putRecord,
  getRecord,
  getAllRecords,
  softDeleteRecord,
  generateId
} from "./db.js";

function normalizeTimeSpanData(data) {
  return {
    entity_id: data.entity_id || "",
    kind: data.kind || "",
    label: data.label || "",
    start_year: data.start_year || "",
    end_year: data.end_year || "",
    start_month: data.start_month || "",
    end_month: data.end_month || "",
    start_day: data.start_day || "",
    end_day: data.end_day || "",
    start_approx: Boolean(data.start_approx),
    end_approx: Boolean(data.end_approx),
    date_text: data.date_text || "",
    calendar_type: data.calendar_type || "",
    notes: data.notes || "",
    source_ids: data.source_ids || "",
    meta_json: data.meta_json || "{}"
  };
}

function validateTimeSpanData(data) {
  if (!data.entity_id) {
    throw new Error("Entidade do período não informada.");
  }

  if (!data.kind) {
    throw new Error("Tipo do período não informado.");
  }
}

export function areSameTimeSpan(a, b) {
  if (!a || !b) return false;

  return (
    a.entity_id === b.entity_id &&
    a.kind === b.kind &&
    String(a.start_year || "") === String(b.start_year || "") &&
    String(a.end_year || "") === String(b.end_year || "") &&
    String(a.label || "") === String(b.label || "")
  );
}

export async function findExistingTimeSpan(data, options = {}) {
  const { ignoreId = "" } = options;

  const timeSpanData = normalizeTimeSpanData(data);
  const records = await getAllRecords(STORES.time_spans);

  return (
    records.find((item) => {
      if (ignoreId && item.id === ignoreId) return false;

      return areSameTimeSpan(item, timeSpanData);
    }) || null
  );
}

export async function timeSpanExists(data, options = {}) {
  const existing = await findExistingTimeSpan(data, options);
  return Boolean(existing);
}

export async function createTimeSpan(data) {
  const timeSpanData = normalizeTimeSpanData(data);

  validateTimeSpanData(timeSpanData);

  const existing = await findExistingTimeSpan(timeSpanData);

  if (existing) {
    return existing;
  }

  const timeSpan = {
    id: generateId("ts"),
    ...timeSpanData
  };

  return addRecord(STORES.time_spans, timeSpan);
}

export async function ensureTimeSpan(data) {
  return createTimeSpan(data);
}

export async function updateTimeSpan(id, data) {
  const existing = await getRecord(STORES.time_spans, id);

  if (!existing) {
    throw new Error("Período não encontrado.");
  }

  const updated = normalizeTimeSpanData({
    ...existing,
    ...data
  });

  validateTimeSpanData(updated);

  const duplicate = await findExistingTimeSpan(updated, {
    ignoreId: id
  });

  if (duplicate) {
    throw new Error("Já existe um período igual para esta entidade.");
  }

  return putRecord(STORES.time_spans, {
    ...existing,
    ...updated,
    id
  });
}

export async function getTimeSpan(id) {
  return getRecord(STORES.time_spans, id);
}

export async function listTimeSpans() {
  const records = await getAllRecords(STORES.time_spans);

  return records.sort((a, b) => {
    const ay = Number(a.start_year || 999999);
    const by = Number(b.start_year || 999999);
    return ay - by;
  });
}

export async function listTimeSpansByEntity(entityId) {
  const records = await getAllRecords(STORES.time_spans);

  return records
    .filter((item) => item.entity_id === entityId)
    .sort(
      (a, b) =>
        Number(a.start_year || 999999) - Number(b.start_year || 999999)
    );
}

export async function deleteTimeSpan(id) {
  return softDeleteRecord(STORES.time_spans, id);
}