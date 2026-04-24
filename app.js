// app.js

import { openDB, getAllRecords, STORES } from "./db.js";
import { seedRelationTypes } from "./seed.js";

import {
  createEntity,
  updateEntity,
  listEntities,
  deleteEntity
} from "./entityService.js";

import {
  createTimeSpan,
  updateTimeSpan,
  listTimeSpans,
  deleteTimeSpan
} from "./timeSpanService.js";

import {
  createRelation,
  updateRelation,
  listRelations,
  deleteRelation
} from "./relationService.js";

import {
  backupToGoogleSheets,
  restoreFromGoogleSheets
} from "./backupService.js";

import { initFileBackup } from "./fileBackup.js";

const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwZaZy20etEXXhryfSSnLKKoQn_yTL_bKqyUyCMhYBspJ4TmWxgWzcO4Rrm9vqGY7o-/exec";

let entitiesCache = [];

// ===== ELEMENTOS =====
const form = document.getElementById("entityForm");
const entityIdInput = document.getElementById("entityId");
const typeInput = document.getElementById("type");
const subtypeInput = document.getElementById("subtype");
const nameInput = document.getElementById("name");
const summaryInput = document.getElementById("summary");
const tagsInput = document.getElementById("tags");
const entityList = document.getElementById("entityList");
const entityCount = document.getElementById("entityCount");
const searchInput = document.getElementById("searchInput");
const formTitle = document.getElementById("formTitle");
const cancelEditButton = document.getElementById("cancelEdit");

const tsForm = document.getElementById("timeSpanForm");
const timeSpanIdInput = document.getElementById("timeSpanId");
const tsEntity = document.getElementById("tsEntity");
const tsKind = document.getElementById("tsKind");
const tsLabel = document.getElementById("tsLabel");
const tsStartYear = document.getElementById("tsStartYear");
const tsEndYear = document.getElementById("tsEndYear");
const tsApprox = document.getElementById("tsApprox");
const timeSpanList = document.getElementById("timeSpanList");

const relForm = document.getElementById("relationForm");
const relationIdInput = document.getElementById("relationId");
const relSource = document.getElementById("relSource");
const relType = document.getElementById("relType");
const relTarget = document.getElementById("relTarget");
const relNotes = document.getElementById("relNotes");
const relationList = document.getElementById("relationList");

const appsScriptUrlInput = document.getElementById("appsScriptUrl");
const saveBackupUrlButton = document.getElementById("saveBackupUrl");
const backupButton = document.getElementById("backupButton");
const restoreButton = document.getElementById("restoreButton");
const backupStatus = document.getElementById("backupStatus");

const entityDetail = document.getElementById("entityDetail");
const detailName = document.getElementById("detailName");
const detailType = document.getElementById("detailType");
const detailSummary = document.getElementById("detailSummary");
const detailTimeSpans = document.getElementById("detailTimeSpans");
const detailRelations = document.getElementById("detailRelations");
const closeDetailButton = document.getElementById("closeDetail");

// ===== INIT =====
async function initApp() {
  await openDB();
  await seedRelationTypes();

  await renderEntities();
  await populateSelects();
  await renderTimeSpans();
  await renderRelations();

  if (form) form.addEventListener("submit", handleSubmit);
  if (searchInput) searchInput.addEventListener("input", handleSearch);
  if (cancelEditButton) cancelEditButton.addEventListener("click", resetForm);

  if (tsForm) tsForm.addEventListener("submit", handleTimeSpanSubmit);
  if (relForm) relForm.addEventListener("submit", handleRelationSubmit);

  const savedUrl = localStorage.getItem("apps_script_url");

  if (appsScriptUrlInput) {
    appsScriptUrlInput.value = savedUrl || DEFAULT_APPS_SCRIPT_URL;
  }

  if (saveBackupUrlButton) {
    saveBackupUrlButton.addEventListener("click", () => {
      const url = getAppsScriptUrl();
      localStorage.setItem("apps_script_url", url);
      setBackupStatus("URL salva.");
    });
  }

  if (backupButton) backupButton.addEventListener("click", handleBackup);
  if (restoreButton) restoreButton.addEventListener("click", handleRestore);

  initFileBackup({
  afterImport: async () => {
    await renderEntities();
    await populateSelects();
    await renderTimeSpans();
    await renderRelations();
  }
});

if (closeDetailButton) {
  closeDetailButton.addEventListener("click", closeEntityDetail);
}

}

// ===== ENTIDADES =====
async function handleSubmit(event) {
  event.preventDefault();

  try {
    const payload = {
      type: typeInput.value.trim(),
      subtype: subtypeInput.value.trim(),
      name: nameInput.value.trim(),
      summary: summaryInput.value.trim(),
      tags: tagsInput.value.trim()
    };

    if (!payload.type || !payload.name) {
      alert("Preencha pelo menos tipo e nome.");
      return;
    }

    const editingId = entityIdInput.value;

    if (editingId) {
      await updateEntity(editingId, payload);
    } else {
      await createEntity(payload);
    }

    resetForm();

    await renderEntities();
    await populateSelects();
    await renderTimeSpans();
    await renderRelations();
  } catch (error) {
    console.error("Erro ao salvar entidade:", error);
    alert("Erro ao salvar entidade. Veja o console.");
  }
}

async function renderEntities(filter = "") {
  if (!entityList || !entityCount) return;

  entitiesCache = await listEntities();

  const normalizedFilter = filter.toLowerCase().trim();

  const filtered = entitiesCache.filter((entity) => {
    const text = [
      entity.name,
      entity.type,
      entity.subtype,
      entity.summary,
      entity.tags
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(normalizedFilter);
  });

  entityCount.textContent = filtered.length;
  entityList.innerHTML = "";

  if (filtered.length === 0) {
    entityList.innerHTML = `<p class="empty">Nenhuma entidade encontrada.</p>`;
    return;
  }

  filtered.forEach((entity) => {
    const item = document.createElement("article");
    item.className = "entity-item";

    item.innerHTML = `
      <div class="entity-top">
        <div>
          <div class="entity-name">${escapeHtml(entity.name)}</div>
          ${
            entity.subtype
              ? `<div class="entity-summary">${escapeHtml(entity.subtype)}</div>`
              : ""
          }
        </div>
        <span class="entity-type">${escapeHtml(entity.type)}</span>
      </div>

      ${
        entity.summary
          ? `<p class="entity-summary">${escapeHtml(entity.summary)}</p>`
          : ""
      }

      <div class="entity-actions">
        <button class="secondary" data-action="detail" data-id="${entity.id}">Ver</button>
        <button class="edit" data-action="edit" data-id="${entity.id}">Editar</button>
        <button class="danger" data-action="delete" data-id="${entity.id}">Excluir</button>
      </div>
    `;

    entityList.appendChild(item);
  });

  entityList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", handleEntityAction);
  });
}

async function handleEntityAction(event) {
  const id = event.target.dataset.id;
  const action = event.target.dataset.action;

  const entity = entitiesCache.find((item) => item.id === id);
  if (!entity) return;

  if (action === "detail") {
  await openEntityDetail(id);
}

  if (action === "edit") {
    fillForm(entity);
  }

  if (action === "delete") {
    const confirmDelete = confirm(`Excluir "${entity.name}"?`);
    if (!confirmDelete) return;

    await deleteEntity(id);
    await renderEntities(searchInput?.value || "");
    await populateSelects();
    await renderTimeSpans();
    await renderRelations();
  }
}

function fillForm(entity) {
  entityIdInput.value = entity.id;
  typeInput.value = entity.type || "";
  subtypeInput.value = entity.subtype || "";
  nameInput.value = entity.name || "";
  summaryInput.value = entity.summary || "";
  tagsInput.value = entity.tags || "";

  formTitle.textContent = "Editar entidade";
  cancelEditButton.classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  entityIdInput.value = "";
  form.reset();

  formTitle.textContent = "Nova entidade";
  cancelEditButton.classList.add("hidden");
}

function handleSearch(event) {
  renderEntities(event.target.value);
}

// ===== PERÍODOS =====
async function handleTimeSpanSubmit(event) {
  event.preventDefault();

  try {
    const id = timeSpanIdInput.value;

    const payload = {
      entity_id: tsEntity.value,
      kind: tsKind.value.trim(),
      label: tsLabel.value.trim(),
      start_year: tsStartYear.value,
      end_year: tsEndYear.value,
      start_approx: tsApprox.checked,
      end_approx: tsApprox.checked
    };

    if (!payload.entity_id || !payload.kind) {
      alert("Selecione a entidade e informe o tipo do período.");
      return;
    }

    if (id) {
      await updateTimeSpan(id, payload);
    } else {
      await createTimeSpan(payload);
    }

    tsForm.reset();
    timeSpanIdInput.value = "";

    await renderTimeSpans();
  } catch (error) {
    console.error("Erro ao salvar período:", error);
    alert("Erro ao salvar período. Veja o console.");
  }
}

async function renderTimeSpans() {
  if (!timeSpanList) return;

  const data = await listTimeSpans();
  const entities = await listEntities();

  const entityMap = {};
  entities.forEach((entity) => {
    entityMap[entity.id] = entity;
  });

  timeSpanList.innerHTML = "";

  data.forEach((ts) => {
    const entityName = entityMap[ts.entity_id]?.name || ts.entity_id;

    const div = document.createElement("div");
    div.className = "mini-item";

    div.innerHTML = `
      <strong>${escapeHtml(ts.label || ts.kind)}</strong>
      <p>${escapeHtml(entityName)}: ${ts.start_year || "?"} → ${ts.end_year || "?"}</p>

      <div class="entity-actions">
        <button class="edit" data-action="edit" data-id="${ts.id}">Editar</button>
        <button class="danger" data-action="delete" data-id="${ts.id}">Excluir</button>
      </div>
    `;

    div.querySelector('[data-action="edit"]').onclick = () => fillTimeSpanForm(ts);

    div.querySelector('[data-action="delete"]').onclick = async () => {
      await deleteTimeSpan(ts.id);
      await renderTimeSpans();
    };

    timeSpanList.appendChild(div);
  });
}

function fillTimeSpanForm(ts) {
  timeSpanIdInput.value = ts.id;
  tsEntity.value = ts.entity_id || "";
  tsKind.value = ts.kind || "";
  tsLabel.value = ts.label || "";
  tsStartYear.value = ts.start_year || "";
  tsEndYear.value = ts.end_year || "";
  tsApprox.checked = !!ts.start_approx;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== RELAÇÕES =====
async function handleRelationSubmit(event) {
  event.preventDefault();

  try {
    const id = relationIdInput.value;

    const payload = {
      source_id: relSource.value,
      relation_type_key: relType.value,
      target_id: relTarget.value,
      notes: relNotes.value.trim()
    };

    if (!payload.source_id || !payload.relation_type_key || !payload.target_id) {
      alert("Preencha origem, tipo de relação e destino.");
      return;
    }

    if (id) {
      await updateRelation(id, payload);
    } else {
      await createRelation(payload);
    }

    relForm.reset();
    relationIdInput.value = "";

    await renderRelations();
  } catch (error) {
    console.error("Erro ao salvar relação:", error);
    alert("Erro ao salvar relação. Veja o console.");
  }
}

async function renderRelations() {
  if (!relationList) return;

  const data = await listRelations();
  const entities = await listEntities();

  const relationTypes = await getAllRecords(STORES.relation_types);

  const entityMap = {};
  entities.forEach((entity) => {
    entityMap[entity.id] = entity;
  });

  const relationTypeMap = {};
  relationTypes.forEach((rt) => {
    relationTypeMap[rt.key] = rt;
  });

  relationList.innerHTML = "";

  data.forEach((rel) => {
    const source = entityMap[rel.source_id]?.name || rel.source_id;
    const target = entityMap[rel.target_id]?.name || rel.target_id;
    const relLabel =
      relationTypeMap[rel.relation_type_key]?.label || rel.relation_type_key;

    const div = document.createElement("div");
    div.className = "mini-item";

    div.innerHTML = `
      <strong>${escapeHtml(source)}</strong>
      → ${escapeHtml(relLabel)} →
      <strong>${escapeHtml(target)}</strong>

      ${rel.notes ? `<p>${escapeHtml(rel.notes)}</p>` : ""}

      <div class="entity-actions">
        <button class="edit" data-action="edit" data-id="${rel.id}">Editar</button>
        <button class="danger" data-action="delete" data-id="${rel.id}">Excluir</button>
      </div>
    `;

    div.querySelector('[data-action="edit"]').onclick = () => fillRelationForm(rel);

    div.querySelector('[data-action="delete"]').onclick = async () => {
      await deleteRelation(rel.id);
      await renderRelations();
    };

    relationList.appendChild(div);
  });
}

function fillRelationForm(rel) {
  relationIdInput.value = rel.id;
  relSource.value = rel.source_id || "";
  relType.value = rel.relation_type_key || "";
  relTarget.value = rel.target_id || "";
  relNotes.value = rel.notes || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== SELECTS =====
async function populateSelects() {
  const entities = await listEntities();
  const relationTypes = await getAllRecords(STORES.relation_types);

  const entitySelects = [tsEntity, relSource, relTarget];

  entitySelects.forEach((select) => {
    if (!select) return;

    const currentValue = select.value;

    select.innerHTML = `<option value="">Selecione</option>`;

    entities.forEach((entity) => {
      const option = document.createElement("option");
      option.value = entity.id;
      option.textContent = entity.name;
      select.appendChild(option);
    });

    select.value = currentValue;
  });

  if (relType) {
    const currentRelType = relType.value;

    relType.innerHTML = `<option value="">Selecione</option>`;

    relationTypes.forEach((rt) => {
      const option = document.createElement("option");
      option.value = rt.key;
      option.textContent = rt.label || rt.key;
      relType.appendChild(option);
    });

    relType.value = currentRelType;
  }
}

// ===== BACKUP =====
async function handleBackup() {
  try {
    setBackupStatus("Fazendo backup...");

    const url = getAppsScriptUrl();
    localStorage.setItem("apps_script_url", url);

    await backupToGoogleSheets(url);

    setBackupStatus("Backup concluído.");
  } catch (error) {
    console.error("Erro no backup:", error);
    setBackupStatus("Erro no backup. Veja o console.");
  }
}

async function handleRestore() {
  const confirmed = confirm(
    "Restaurar vai substituir os dados locais pelos dados da planilha. Continuar?"
  );

  if (!confirmed) return;

  try {
    setBackupStatus("Restaurando...");

    const url = getAppsScriptUrl();
    localStorage.setItem("apps_script_url", url);

    await restoreFromGoogleSheets(url);

    await renderEntities();
    await populateSelects();
    await renderTimeSpans();
    await renderRelations();

    setBackupStatus("Restauração concluída.");
  } catch (error) {
    console.error("Erro na restauração:", error);
    setBackupStatus("Erro na restauração. Veja o console.");
  }
}

function getAppsScriptUrl() {
  return (
    appsScriptUrlInput?.value?.trim() ||
    localStorage.getItem("apps_script_url") ||
    DEFAULT_APPS_SCRIPT_URL
  );
}

function setBackupStatus(message) {
  if (backupStatus) {
    backupStatus.textContent = message;
  } else {
    console.log(message);
  }
}

// ===== UTIL =====
function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function openEntityDetail(entityId) {
  if (!entityDetail) return;

  const entities = await listEntities();
  const timeSpans = await listTimeSpans();
  const relations = await listRelations();
  const relationTypes = await getAllRecords(STORES.relation_types);

  const entity = entities.find((item) => item.id === entityId);
  if (!entity) return;

  const entityMap = {};
  entities.forEach((item) => {
    entityMap[item.id] = item;
  });

  const relationTypeMap = {};
  relationTypes.forEach((item) => {
    relationTypeMap[item.key] = item;
  });

  detailName.textContent = entity.name;
  detailType.textContent = `${entity.type}${entity.subtype ? " / " + entity.subtype : ""}`;
  detailSummary.textContent = entity.summary || "Sem resumo.";

  const relatedTimeSpans = timeSpans.filter((ts) => ts.entity_id === entityId);

  detailTimeSpans.innerHTML = "";

  if (relatedTimeSpans.length === 0) {
    detailTimeSpans.innerHTML = `<p class="empty">Nenhum período registrado.</p>`;
  } else {
    relatedTimeSpans.forEach((ts) => {
      const div = document.createElement("div");
      div.className = "mini-item";

      div.innerHTML = `
        <strong>${escapeHtml(ts.label || ts.kind)}</strong>
        <p>${escapeHtml(ts.start_year || "?")} → ${escapeHtml(ts.end_year || "?")}</p>
      `;

      detailTimeSpans.appendChild(div);
    });
  }

  const relatedRelations = relations.filter((rel) => {
    return rel.source_id === entityId || rel.target_id === entityId;
  });

  detailRelations.innerHTML = "";

  if (relatedRelations.length === 0) {
    detailRelations.innerHTML = `<p class="empty">Nenhuma relação registrada.</p>`;
  } else {
    relatedRelations.forEach((rel) => {
      const source = entityMap[rel.source_id]?.name || rel.source_id;
      const target = entityMap[rel.target_id]?.name || rel.target_id;
      const relLabel =
        relationTypeMap[rel.relation_type_key]?.label || rel.relation_type_key;

      const div = document.createElement("div");
      div.className = "mini-item";

      div.innerHTML = `
        <strong>${escapeHtml(source)}</strong>
        → ${escapeHtml(relLabel)} →
        <strong>${escapeHtml(target)}</strong>
        ${rel.notes ? `<p>${escapeHtml(rel.notes)}</p>` : ""}
      `;

      detailRelations.appendChild(div);
    });
  }

  entityDetail.classList.remove("hidden");

  entityDetail.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function closeEntityDetail() {
  if (entityDetail) {
    entityDetail.classList.add("hidden");
  }
}

initApp().catch((error) => {
  console.error("Erro ao iniciar app:", error);
  alert("Erro ao iniciar o app. Veja o console.");
});