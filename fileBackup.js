// fileBackup.js

import { exportBackup, restoreBackup } from "./db.js";

export function initFileBackup(options = {}) {
  const {
    exportButtonId = "exportJsonButton",
    importButtonId = "importJsonButton",
    importInputId = "importJsonInput",
    statusId = "fileStatus",
    afterImport = async () => {}
  } = options;

  const exportButton = document.getElementById(exportButtonId);
  const importButton = document.getElementById(importButtonId);
  const importInput = document.getElementById(importInputId);
  const status = document.getElementById(statusId);

  if (exportButton) {
    exportButton.addEventListener("click", async () => {
      await exportJson(status);
    });
  }

  if (importButton && importInput) {
    importButton.addEventListener("click", () => importInput.click());

    importInput.addEventListener("change", async (event) => {
      await importJson(event, status, afterImport);
    });
  }
}

async function exportJson(status) {
  try {
    setStatus(status, "Gerando arquivo...");

    const data = await exportBackup();

    const payload = {
      exported_at: new Date().toISOString(),
      app_version: "0.1.0",
      payload_version: "1",
      data
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });

    const date = new Date().toISOString().slice(0, 10);
    const filename = `estudo-biblico-backup-${date}.json`;

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);

    setStatus(status, "Arquivo baixado.");
  } catch (error) {
    console.error("Erro ao exportar JSON:", error);
    setStatus(status, "Erro ao baixar arquivo. Veja o console.");
  }
}

async function importJson(event, status, afterImport) {
  const file = event.target.files?.[0];

  if (!file) return;

  const confirmed = confirm(
    "Importar este arquivo vai substituir os dados locais atuais. Continuar?"
  );

  if (!confirmed) {
    event.target.value = "";
    return;
  }

  try {
    setStatus(status, "Importando arquivo...");

    const text = await file.text();
    const payload = JSON.parse(text);

    const data = payload.data || payload;

    await restoreBackup(data);
    await afterImport();

    event.target.value = "";

    setStatus(status, "Arquivo importado com sucesso.");
  } catch (error) {
    console.error("Erro ao importar JSON:", error);
    setStatus(status, "Erro ao importar arquivo. Veja o console.");
  }
}

function setStatus(element, message) {
  if (element) {
    element.textContent = message;
  } else {
    console.log(message);
  }
}