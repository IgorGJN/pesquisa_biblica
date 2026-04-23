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

export async function createTimeSpan(data) {
  const timeSpan = {
    id: generateId("ts"),
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

  return addRecord(STORES.time_spans, timeSpan);
}

export async function updateTimeSpan(id, data) {
  const existing = await getRecord(STORES.time_spans, id);

  if (!existing) {
    throw new Error("Período não encontrado.");
  }

  return putRecord(STORES.time_spans, {
    ...existing,
    ...data
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
    .sort((a, b) => Number(a.start_year || 999999) - Number(b.start_year || 999999));
}

export async function deleteTimeSpan(id) {
  return softDeleteRecord(STORES.time_spans, id);
}