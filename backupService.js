// backupService.js

import { exportBackup, restoreBackup, addRecord, STORES, generateId } from "./db.js";

export async function backupToGoogleSheets(appsScriptUrl) {
  if (!appsScriptUrl) {
    throw new Error("URL do Apps Script não informada.");
  }

  const data = await exportBackup();

  const payload = {
    action: "backup_full",
    device_id: getDeviceId(),
    app_version: "0.1.0",
    payload_version: "1",
    data: {
      entities: data.entities || [],
      time_spans: data.time_spans || [],
      relations: data.relations || [],
      relation_types: data.relation_types || [],
      sources: data.sources || []
    }
  };

  const response = await fetch(appsScriptUrl, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    }
  });

  const result = await response.json();

  await addRecord(STORES.sync_log, {
    id: generateId("sync"),
    action: "backup_full",
    scope: "full",
    status: result.ok ? "success" : "error",
    message: result.message || result.error || "",
    created_at: new Date().toISOString()
  });

  if (!result.ok) {
    throw new Error(result.error || "Erro ao fazer backup.");
  }

  return result;
}

export async function restoreFromGoogleSheets(appsScriptUrl) {
  if (!appsScriptUrl) {
    throw new Error("URL do Apps Script não informada.");
  }

  const url = appsScriptUrl.includes("?")
    ? `${appsScriptUrl}&action=export`
    : `${appsScriptUrl}?action=export`;

  const response = await fetch(url);
  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error || "Erro ao restaurar backup.");
  }

  await restoreBackup({
    entities: result.data.entities || [],
    time_spans: result.data.time_spans || [],
    relations: result.data.relations || [],
    relation_types: result.data.relation_types || [],
    sources: result.data.sources || [],
    sync_log: [],
    settings: []
  });

  await addRecord(STORES.sync_log, {
    id: generateId("sync"),
    action: "restore_full",
    scope: "full",
    status: "success",
    message: "Restauração concluída.",
    created_at: new Date().toISOString()
  });

  return result;
}

function getDeviceId() {
  let id = localStorage.getItem("device_id");

  if (!id) {
    id = "device_" + crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }

  return id;
}