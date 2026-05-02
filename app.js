// app.js

import {
  openDB,
  getRecord,
  getAllRecords,
  STORES
} from "./db.js";

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

import {
  createSource,
  listSources,
  listSourcesByEntity,
  deleteSource
} from "./sourceService.js";

import { normalizeText, capitalize } from "./utils/text.js";
import { escapeHtml } from "./utils/html.js";
import { formatYear, formatPeriod, yearToVisDate } from "./utils/dates.js";

import { getFamilySummary } from "./familyService.js";

import { createOrUpdateEventFromWizard } from "./eventService.js";

import { createOrUpdatePersonFromWizard } from "./personService.js";

import {
  renderFamilyGraphView,
  fitCurrentGraph,
  destroyCurrentGraph
} from "./graphView.js";

const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwZaZy20etEXXhryfSSnLKKoQn_yTL_bKqyUyCMhYBspJ4TmWxgWzcO4Rrm9vqGY7o-/exec";

let appStarted = false;
let entitiesCache = [];
let timelineInstance = null;

// ===== ELEMENTOS: ENTIDADES =====
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

const filterType = document.getElementById("filterType");
const filterYear = document.getElementById("filterYear");

// ===== ELEMENTOS: PERÍODOS =====
const tsForm = document.getElementById("timeSpanForm");
const timeSpanIdInput = document.getElementById("timeSpanId");
const tsEntity = document.getElementById("tsEntity");
const tsKind = document.getElementById("tsKind");
const tsLabel = document.getElementById("tsLabel");
const tsStartYear = document.getElementById("tsStartYear");
const tsEndYear = document.getElementById("tsEndYear");
const tsApprox = document.getElementById("tsApprox");
const timeSpanList = document.getElementById("timeSpanList");

// ===== ELEMENTOS: RELAÇÕES =====
const relForm = document.getElementById("relationForm");
const relationIdInput = document.getElementById("relationId");
const relSource = document.getElementById("relSource");
const relType = document.getElementById("relType");
const relTarget = document.getElementById("relTarget");
const relNotes = document.getElementById("relNotes");
const relationList = document.getElementById("relationList");

// ===== ELEMENTOS: MODAL DETALHE =====
const entityDetailModal = document.getElementById("entityDetailModal");
const detailEntityId = document.getElementById("detailEntityId");
const detailName = document.getElementById("detailName");
const detailType = document.getElementById("detailType");
const detailSummary = document.getElementById("detailSummary");
const closeDetailButton = document.getElementById("closeDetail");
const editEntityFromDetail = document.getElementById("editEntityFromDetail");

const detailTimeForm = document.getElementById("detailTimeForm");
const detailTsKind = document.getElementById("detailTsKind");
const detailTsLabel = document.getElementById("detailTsLabel");
const detailTsStart = document.getElementById("detailTsStart");
const detailTsEnd = document.getElementById("detailTsEnd");
const detailTimeList = document.getElementById("detailTimeList");

const detailRelationForm = document.getElementById("detailRelationForm");
const detailRelationType = document.getElementById("detailRelationType");
const detailRelationTarget = document.getElementById("detailRelationTarget");
const detailRelationList = document.getElementById("detailRelationList");

const detailAddChildForm = document.getElementById("detailAddChildForm");
const detailChildSelect = document.getElementById("detailChildSelect");
const detailChildOtherParentSelect = document.getElementById("detailChildOtherParentSelect");
const detailAddParentForm = document.getElementById("detailAddParentForm");
const detailParentSelect = document.getElementById("detailParentSelect");

const detailAddSpouseForm = document.getElementById("detailAddSpouseForm");
const detailSpouseSelect = document.getElementById("detailSpouseSelect");




// ===== ELEMENTOS: ABAS =====
const tabs = document.querySelectorAll(".tabs button");
const tabEntities = document.getElementById("tab-entities");
const tabTime = document.getElementById("tab-time");
const tabRelations = document.getElementById("tab-relations");
const tabTimeline = document.getElementById("tab-timeline");

// ===== ELEMENTOS: TIMELINE =====
const timelineContainer = document.getElementById("timelineContainer");
const refreshTimelineButton = document.getElementById("refreshTimeline");
const timelineTypeFilter = document.getElementById("timelineTypeFilter");

// ===== ELEMENTOS: BACKUP =====
const appsScriptUrlInput = document.getElementById("appsScriptUrl");
const saveBackupUrlButton = document.getElementById("saveBackupUrl");
const backupButton = document.getElementById("backupButton");
const restoreButton = document.getElementById("restoreButton");
const backupStatus = document.getElementById("backupStatus");

// ===== REFERENCIAS
const detailSourceForm = document.getElementById("detailSourceForm");
const detailSourceType = document.getElementById("detailSourceType");
const detailSourceCitation = document.getElementById("detailSourceCitation");
const detailSourceReference = document.getElementById("detailSourceReference");
const detailSourceUrl = document.getElementById("detailSourceUrl");
const detailSourceNotes = document.getElementById("detailSourceNotes");
const detailSourceList = document.getElementById("detailSourceList");

// ===== MODAL FONTES
const quickSourceModal = document.getElementById("quickSourceModal");
const quickSourceForm = document.getElementById("quickSourceForm");
const closeQuickSource = document.getElementById("closeQuickSource");

const quickSourceEntityId = document.getElementById("quickSourceEntityId");
const quickSourceTimeSpanId = document.getElementById("quickSourceTimeSpanId");
const quickSourceRelationId = document.getElementById("quickSourceRelationId");

const quickSourceType = document.getElementById("quickSourceType");
const quickSourceCitation = document.getElementById("quickSourceCitation");
const quickSourceReference = document.getElementById("quickSourceReference");
const quickSourceUrl = document.getElementById("quickSourceUrl");
const quickSourceNotes = document.getElementById("quickSourceNotes");


// ===== BUSCA GLOBAL 
const tabSearch = document.getElementById("tab-search");
const globalSearchInput = document.getElementById("globalSearchInput");
const globalSearchResults = document.getElementById("globalSearchResults");

// ===== CADASTRO RAPIDO
const tabEventWizard = document.getElementById("tab-eventWizard");

const eventWizardForm = document.getElementById("eventWizardForm");
const eventWizardTitle = document.getElementById("eventWizardTitle");
const eventWizardSubtype = document.getElementById("eventWizardSubtype");
const eventWizardStartYear = document.getElementById("eventWizardStartYear");
const eventWizardEndYear = document.getElementById("eventWizardEndYear");
const eventWizardPlace = document.getElementById("eventWizardPlace");
const eventWizardParticipants = document.getElementById("eventWizardParticipants");
const eventWizardCitation = document.getElementById("eventWizardCitation");
const eventWizardNotes = document.getElementById("eventWizardNotes");
const eventWizardStatus = document.getElementById("eventWizardStatus"); 

// ===== CADASTRO PESSOAS
// ===== ASSISTENTE DE PESSOA
const tabPersonWizard = document.getElementById("tab-personWizard");

const personWizardForm = document.getElementById("personWizardForm");
const personWizardName = document.getElementById("personWizardName");
const personWizardGender = document.getElementById("personWizardGender");
const personWizardSummary = document.getElementById("personWizardSummary");
const personWizardTags = document.getElementById("personWizardTags");

const personWizardBirthYear = document.getElementById("personWizardBirthYear");
const personWizardBirthDateText = document.getElementById("personWizardBirthDateText");
const personWizardBirthPlace = document.getElementById("personWizardBirthPlace");
const personWizardBirthApprox = document.getElementById("personWizardBirthApprox");

const personWizardDeathYear = document.getElementById("personWizardDeathYear");
const personWizardDeathDateText = document.getElementById("personWizardDeathDateText");
const personWizardDeathPlace = document.getElementById("personWizardDeathPlace");
const personWizardDeathApprox = document.getElementById("personWizardDeathApprox");

const personWizardFather = document.getElementById("personWizardFather");
const personWizardMother = document.getElementById("personWizardMother");
const personWizardSpouse = document.getElementById("personWizardSpouse");

const personWizardCitation = document.getElementById("personWizardCitation");
const personWizardSourceNotes = document.getElementById("personWizardSourceNotes");
const personWizardStatus = document.getElementById("personWizardStatus");

const detailTabButtons = document.querySelectorAll("[data-detail-tab]");
const detailTabPanels = document.querySelectorAll(".detail-tab-panel");

// ===== ELEMENTOS ARVORE
const detailGraphContainer = document.getElementById("detailGraphContainer");
const refreshDetailGraph = document.getElementById("refreshDetailGraph");
const graphAncestorDepth = document.getElementById("graphAncestorDepth");
const graphDescendantDepth = document.getElementById("graphDescendantDepth");

const fitDetailGraph = document.getElementById("fitDetailGraph");

// ===== INIT =====
async function initApp() {
  if (appStarted) return;
  appStarted = true;

  await openDB();
  await seedRelationTypes();

  await renderEntities();
  await populateSelects();
  await renderTimeSpans();
  await renderRelations();

  if (form) form.addEventListener("submit", handleSubmit);
  if (searchInput) searchInput.addEventListener("input", handleSearch);
  if (cancelEditButton) cancelEditButton.addEventListener("click", resetForm);

  if (filterType) {
    filterType.addEventListener("change", () => {
      renderEntities(searchInput?.value || "");
    });
  }

  if (filterYear) {
    filterYear.addEventListener("input", () => {
      renderEntities(searchInput?.value || "");
    });
  }

  if (tsForm) tsForm.addEventListener("submit", handleTimeSpanSubmit);
  if (relForm) relForm.addEventListener("submit", handleRelationSubmit);

  if (closeDetailButton) {
    closeDetailButton.addEventListener("click", closeEntityDetail);
  }

  if (detailTimeForm) {
    detailTimeForm.addEventListener("submit", handleDetailTimeSubmit);
  }

  if (detailRelationForm) {
    detailRelationForm.addEventListener("submit", handleDetailRelationSubmit);
  }

  if (editEntityFromDetail) {
    editEntityFromDetail.addEventListener("click", async () => {
      const id = detailEntityId?.value;
      if (!id) return;

      const entity = await getRecord(STORES.entities, id);
      if (!entity) return;

      closeEntityDetail();
      switchTab("entities");
      fillForm(entity);
    });
  }

  detailTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchDetailTab(button.dataset.detailTab);
  });
});

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  if (refreshTimelineButton) {
    refreshTimelineButton.addEventListener("click", renderTimeline);
  }

  if (timelineTypeFilter) {
    timelineTypeFilter.addEventListener("change", renderTimeline);
  }

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
      await populateEventWizardSelects();
      await populatePersonWizardSelects();
      await renderTimeSpans();
      await renderRelations();
      await renderTimeline();
    }
  });
  if (detailSourceForm) {
  detailSourceForm.addEventListener("submit", handleDetailSourceSubmit);
}


  if (closeQuickSource) {
  closeQuickSource.addEventListener("click", closeQuickSourceModal);
}

if (quickSourceForm) {
  quickSourceForm.addEventListener("submit", handleQuickSourceSubmit);
}

if (globalSearchInput) {
  globalSearchInput.addEventListener("input", handleGlobalSearch);
}

if (relType) {
  relType.addEventListener("change", updateRelationTargetOptions);
}

if (detailAddChildForm) {
  detailAddChildForm.addEventListener("submit", handleAddChildFromDetail);
}

if (detailAddParentForm) {
  detailAddParentForm.addEventListener("submit", handleAddParentFromDetail);
}

if (detailAddSpouseForm) {
  detailAddSpouseForm.addEventListener("submit", handleAddSpouseFromDetail);
}

if (detailAddChildForm) {
  detailAddChildForm.addEventListener("submit", handleAddChildFromDetail);
}

if (eventWizardForm) {
  eventWizardForm.addEventListener("submit", handleEventWizardSubmit);
}

await populateEventWizardSelects();

if (personWizardForm) {
  personWizardForm.addEventListener("submit", handlePersonWizardSubmit);
}

await populatePersonWizardSelects();

if (refreshDetailGraph) {
  refreshDetailGraph.addEventListener("click", renderCurrentDetailGraph);
}

if (graphAncestorDepth) {
  graphAncestorDepth.addEventListener("change", renderCurrentDetailGraph);
}

if (graphDescendantDepth) {
  graphDescendantDepth.addEventListener("change", renderCurrentDetailGraph);
}

if (fitDetailGraph) {
  fitDetailGraph.addEventListener("click", () => {
    fitCurrentGraph();
  });
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
    const entities = await listEntities();

    const duplicate = entities.find((entity) => {
      const sameName =
        normalizeText(entity.name) === normalizeText(payload.name);

      const sameType = entity.type === payload.type;

      const isAnotherEntity = !editingId || entity.id !== editingId;

      return sameName && sameType && isAnotherEntity;
    });

    if (duplicate) {
      alert(
        `Já existe uma entidade chamada "${duplicate.name}" do mesmo tipo.\n\nAltere o nome que você está cadastrando ou edite o registro existente.`
      );
      return;
    }

    if (editingId) {
      await updateEntity(editingId, payload);
    } else {
      await createEntity(payload);
    }

    resetForm();

    await renderEntities();
    await populateSelects();
    await populateEventWizardSelects();
    await populatePersonWizardSelects();
    await renderTimeSpans();
    await renderRelations();
    await renderTimeline();
  } catch (error) {
    console.error("Erro ao salvar entidade:", error);
    alert("Erro ao salvar entidade. Veja o console.");
  }
}

async function renderEntities(filter = "") {
  if (!entityList || !entityCount) return;

  entitiesCache = await listEntities();

  const normalizedFilter = filter.toLowerCase().trim();
  const typeFilter = filterType?.value || "";
  const yearFilter = filterYear?.value ? Number(filterYear.value) : null;

  const timeSpans = await listTimeSpans();

  const entityPeriodsMap = {};

  timeSpans.forEach((ts) => {
    if (!entityPeriodsMap[ts.entity_id]) {
      entityPeriodsMap[ts.entity_id] = [];
    }

    entityPeriodsMap[ts.entity_id].push(ts);
  });

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

    const matchesSearch = text.includes(normalizedFilter);
    const matchesType = !typeFilter || entity.type === typeFilter;

    let matchesYear = true;

    if (yearFilter !== null) {
      const entityPeriods = entityPeriodsMap[entity.id] || [];

      matchesYear = entityPeriods.some((ts) => {
        const start = ts.start_year !== "" ? Number(ts.start_year) : null;
        const end = ts.end_year !== "" ? Number(ts.end_year) : null;

        if (start === null && end === null) return false;

        if (start !== null && end !== null) {
          return yearFilter >= start && yearFilter <= end;
        }

        if (start !== null && end === null) {
          return yearFilter >= start;
        }

        if (start === null && end !== null) {
          return yearFilter <= end;
        }

        return false;
      });
    }

    return matchesSearch && matchesType && matchesYear;
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

    const periods = entityPeriodsMap[entity.id] || [];
    let periodText = "";

    if (periods.length > 0) {
      const main = periods[0];
      periodText = formatPeriod(main.start_year, main.end_year);
    }

    item.innerHTML = `
      <div class="entity-top">
        <div>
          <div class="entity-name">${escapeHtml(entity.name)}</div>
          ${
            periodText
              ? `<div class="entity-period">${escapeHtml(periodText)}</div>`
              : ""
          }
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
    await renderTimeline();
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
    await renderEntities(searchInput?.value || "");
    await renderTimeline();
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
      <p>${escapeHtml(entityName)}: ${escapeHtml(formatPeriod(ts.start_year, ts.end_year))}</p>

      <div class="entity-actions">
        <button class="edit" data-action="edit" data-id="${ts.id}">Editar</button>
        <button class="danger" data-action="delete" data-id="${ts.id}">Excluir</button>
      </div>
    `;

    div.querySelector('[data-action="edit"]').onclick = () => fillTimeSpanForm(ts);

    div.querySelector('[data-action="delete"]').onclick = async () => {
      await deleteTimeSpan(ts.id);
      await renderTimeSpans();
      await renderEntities(searchInput?.value || "");
      await renderTimeline();
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

  switchTab("time");

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

      const currentDetailId = detailEntityId?.value;
      if (currentDetailId) await renderDetailRelations(currentDetailId);
    };

    relationList.appendChild(div);
  });
}

async function renderDetailRelations(entityId) {
  if (!detailRelationList) return;

  const relations = await listRelations();
  const entities = await listEntities();
  const relationTypes = await getAllRecords(STORES.relation_types);
  const sources = await listSources();

  const entityMap = {};
  entities.forEach((entity) => {
    entityMap[entity.id] = entity;
  });

  const relationTypeMap = {};
  relationTypes.forEach((rt) => {
    relationTypeMap[rt.key] = rt;
  });

  const FAMILY_RELATION_KEYS = ["filho_de", "conjuge_de"];

const filtered = relations.filter((rel) => {
  const involvesEntity =
    rel.source_id === entityId || rel.target_id === entityId;

  const isFamilyRelation = FAMILY_RELATION_KEYS.includes(
    rel.relation_type_key
  );

  return involvesEntity && !isFamilyRelation;
});

  detailRelationList.innerHTML = "";

  if (filtered.length === 0) {
    detailRelationList.innerHTML = `<p class="empty">Sem relações.</p>`;
    return;
  }

  filtered.forEach((rel) => {
    const isDirect = rel.source_id === entityId;

    const relationType = relationTypeMap[rel.relation_type_key];

    const source = entityMap[rel.source_id];
    const target = entityMap[rel.target_id];

    const sourceName = source?.name || rel.source_id;
    const targetName = target?.name || rel.target_id;

    const label = getRelationLabel(rel, relationType, isDirect, entityMap);

    const firstEntityId = isDirect ? rel.source_id : rel.target_id;
    const firstEntityName = isDirect ? sourceName : targetName;

    const secondEntityId = isDirect ? rel.target_id : rel.source_id;
    const secondEntityName = isDirect ? targetName : sourceName;

    const relSources = sources.filter((sourceItem) => {
      return String(sourceItem.related_relation_ids || "")
        .split("|")
        .includes(rel.id);
    });

    const div = document.createElement("div");
    div.className = "mini-item";

    div.innerHTML = `
      <button class="link-button" data-entity-id="${escapeHtml(firstEntityId)}">
        ${escapeHtml(firstEntityName)}
      </button>
      → ${escapeHtml(label)} →
      <button class="link-button" data-entity-id="${escapeHtml(secondEntityId)}">
        ${escapeHtml(secondEntityName)}
      </button>

      ${rel.notes ? `<p>${escapeHtml(rel.notes)}</p>` : ""}

      ${
        relSources.length
          ? `<div class="source-list">
              ${relSources
                .map(
                  (src) => `
                    <div class="source-chip">
                      Fonte: ${escapeHtml(src.citation || src.reference || "Sem título")}
                    </div>
                  `
                )
                .join("")}
            </div>`
          : ""
      }

      <div class="entity-actions">
        <button class="edit" data-action="edit">Editar</button>
        <button class="secondary" data-action="source">Fonte</button>
        <button class="danger" data-action="delete">Excluir</button>
      </div>
    `;

    div.querySelectorAll(".link-button").forEach((button) => {
      button.onclick = async () => {
        const nextEntityId = button.dataset.entityId;
        if (!nextEntityId) return;

        await openEntityDetail(nextEntityId);
      };
    });

    div.querySelector('[data-action="edit"]').onclick = () => {
      closeEntityDetail();
      fillRelationForm(rel);
    };

    div.querySelector('[data-action="source"]').onclick = () => {
      openQuickSourceForm({
        entityId,
        relationId: rel.id
      });
    };

    div.querySelector('[data-action="delete"]').onclick = async () => {
      const ok = confirm("Excluir esta relação?");
      if (!ok) return;

      await deleteRelation(rel.id);
      await renderDetailRelations(entityId);
      await renderRelations();
    };

    detailRelationList.appendChild(div);
  });
}

function fillRelationForm(rel) {
  relationIdInput.value = rel.id;
  relSource.value = rel.source_id || "";
  relType.value = rel.relation_type_key || "";
  relTarget.value = rel.target_id || "";
  relNotes.value = rel.notes || "";

  switchTab("relations");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== MODAL DETALHE =====
async function openEntityDetail(entityId) {
  if (!entityDetailModal) return;

  const entity = await getRecord(STORES.entities, entityId);
  if (!entity) return;

  entityDetailModal.classList.remove("hidden");
  destroyCurrentGraph();
  switchDetailTab("summary");

  detailName.textContent = entity.name || "Sem nome";
  detailType.textContent = `${entity.type || ""}${
    entity.subtype ? " / " + entity.subtype : ""
  }`;
  detailSummary.textContent = entity.summary || "Sem resumo.";

  detailEntityId.value = entity.id;

await populateDetailRelationForm(entity.id);
await renderDetailTimeSpans(entity.id);
await renderDetailFamily(entity.id);
await populateDetailParentSelect(entity.id);
await populateDetailSpouseSelect(entity.id);
await populateDetailChildSelect(entity.id);
await renderDetailRelations(entity.id);
await renderDetailSources(entity.id);
  
}

async function populateDetailParentSelect(currentEntityId) {
  if (!detailParentSelect) return;

  const entities = await listEntities();
  const relations = await listRelations();

  const currentParentIds = relations
    .filter(
      (rel) =>
        rel.relation_type_key === "filho_de" &&
        rel.source_id === currentEntityId
    )
    .map((rel) => rel.target_id);

  const people = entities.filter((entity) => {
    return (
      entity.type === "person" &&
      entity.id !== currentEntityId &&
      !currentParentIds.includes(entity.id)
    );
  });

  detailParentSelect.innerHTML = `<option value="">Selecionar pai/mãe</option>`;

  people.forEach((entity) => {
    const option = document.createElement("option");
    option.value = entity.id;
    option.textContent = formatEntityOption(entity);
    detailParentSelect.appendChild(option);
  });
}

async function handleAddParentFromDetail(event) {
  event.preventDefault();

  const currentEntityId = detailEntityId?.value;
  const parentId = detailParentSelect?.value;

  if (!currentEntityId || !parentId) {
    alert("Selecione um pai/mãe.");
    return;
  }

  await createRelation({
    source_id: currentEntityId,
    relation_type_key: "filho_de",
    target_id: parentId,
    notes: ""
  });

  detailAddParentForm.reset();

  await populateDetailParentSelect(currentEntityId);
  await populateDetailSpouseSelect(currentEntityId);
  await populateDetailChildSelect(currentEntityId);
  await renderDetailFamily(currentEntityId);
  await renderDetailRelations(currentEntityId);
  await renderRelations();
}

async function populateDetailSpouseSelect(currentEntityId) {
  if (!detailSpouseSelect) return;

  const entities = await listEntities();
  const relations = await listRelations();

  const spouseIds = relations
    .filter(
      (rel) =>
        rel.relation_type_key === "conjuge_de" &&
        (rel.source_id === currentEntityId || rel.target_id === currentEntityId)
    )
    .map((rel) =>
      rel.source_id === currentEntityId ? rel.target_id : rel.source_id
    );

  const people = entities.filter((entity) => {
    return (
      entity.type === "person" &&
      entity.id !== currentEntityId &&
      !spouseIds.includes(entity.id)
    );
  });

  detailSpouseSelect.innerHTML = `<option value="">Selecionar cônjuge</option>`;

  people.forEach((entity) => {
    const option = document.createElement("option");
    option.value = entity.id;
    option.textContent = formatEntityOption(entity);
    detailSpouseSelect.appendChild(option);
  });
}

async function handleAddSpouseFromDetail(event) {
  event.preventDefault();

  const currentEntityId = detailEntityId?.value;
  const spouseId = detailSpouseSelect?.value;

  if (!currentEntityId || !spouseId) {
    alert("Selecione um cônjuge.");
    return;
  }

  await createRelation({
    source_id: currentEntityId,
    relation_type_key: "conjuge_de",
    target_id: spouseId,
    notes: ""
  });

  detailAddSpouseForm.reset();

  await populateDetailParentSelect(currentEntityId);
  await populateDetailSpouseSelect(currentEntityId);
  await populateDetailChildSelect(currentEntityId);
  await renderDetailFamily(currentEntityId);
  await renderDetailRelations(currentEntityId);
  await renderRelations();
}

async function populateDetailChildSelect(currentEntityId) {
  if (!detailChildSelect || !detailChildOtherParentSelect) return;

  const entities = await listEntities();
  const relations = await listRelations();

  const people = entities.filter((entity) => {
    return entity.type === "person" && entity.id !== currentEntityId;
  });

  detailChildSelect.innerHTML = `<option value="">Selecionar filho</option>`;

  people.forEach((entity) => {
    const option = document.createElement("option");
    option.value = entity.id;
    option.textContent = formatEntityOption(entity);
    detailChildSelect.appendChild(option);
  });

  const spouseIds = relations
    .filter((rel) => {
      return (
        rel.relation_type_key === "conjuge_de" &&
        (rel.source_id === currentEntityId || rel.target_id === currentEntityId)
      );
    })
    .map((rel) => {
      return rel.source_id === currentEntityId
        ? rel.target_id
        : rel.source_id;
    });

  const spouses = entities.filter((entity) => {
    return spouseIds.includes(entity.id);
  });

  detailChildOtherParentSelect.innerHTML =
    `<option value="">Outro pai/mãe opcional</option>`;

  spouses.forEach((entity) => {
    const option = document.createElement("option");
    option.value = entity.id;
    option.textContent = formatEntityOption(entity);
    detailChildOtherParentSelect.appendChild(option);
  });
}

async function handleAddChildFromDetail(event) {
  event.preventDefault();

  const parentId = detailEntityId?.value;
  const childId = detailChildSelect?.value;
  const otherParentId = detailChildOtherParentSelect?.value;

  if (!parentId || !childId) {
    alert("Selecione um filho.");
    return;
  }

  const relations = await listRelations();

  async function createChildRelationIfMissing(targetParentId) {
    const alreadyExists = relations.some((rel) => {
      return (
        rel.relation_type_key === "filho_de" &&
        rel.source_id === childId &&
        rel.target_id === targetParentId
      );
    });

    if (!alreadyExists) {
      await createRelation({
        source_id: childId,
        relation_type_key: "filho_de",
        target_id: targetParentId,
        notes: ""
      });
    }
  }

  await createChildRelationIfMissing(parentId);

  if (otherParentId) {
    await createChildRelationIfMissing(otherParentId);
  }

  detailAddChildForm.reset();

await populateDetailParentSelect(parentId);
await populateDetailSpouseSelect(parentId);
await populateDetailChildSelect(parentId);
await renderDetailFamily(parentId);
await renderDetailRelations(parentId);
await renderRelations();
}

function switchDetailTab(tab) {
  detailTabButtons.forEach((button) => {
    const isActive = button.dataset.detailTab === tab;
    button.classList.toggle("active", isActive);
  });

  detailTabPanels.forEach((panel) => {
    panel.classList.add("hidden");
  });

  const activePanel = document.getElementById(`detail-tab-${tab}`);

  if (activePanel) {
    activePanel.classList.remove("hidden");
  }

  if (tab === "graph") {
  renderCurrentDetailGraph();
}
}

async function renderCurrentDetailGraph() {
  if (!detailGraphContainer) return;

  const entityId = detailEntityId?.value;

  if (!entityId) {
    detailGraphContainer.innerHTML = `<p class="empty">Nenhuma entidade selecionada.</p>`;
    return;
  }

  const ancestorDepth = Number(graphAncestorDepth?.value || 3);
  const descendantDepth = Number(graphDescendantDepth?.value || 3);

  await renderFamilyGraphView({
  container: detailGraphContainer,
  entityId,
  ancestorDepth,
  descendantDepth,
  includeSpouses: true,
  onNodeClick: async (clickedEntityId) => {
    await openEntityDetail(clickedEntityId);
    switchDetailTab("graph");
  }
});
}


function closeEntityDetail() {
  destroyCurrentGraph();

  if (entityDetailModal) {
    entityDetailModal.classList.add("hidden");
  }
}





function renderFamilyGroup(title, people) {
  if (!people || people.length === 0) {
    return "";
  }

  return `
    <div class="family-group">
      <strong>${escapeHtml(title)}</strong>

      <div class="family-list">
        ${people
          .map(
            (person) => `
              <button class="family-chip" data-family-entity-id="${escapeHtml(person.id)}">
                ${escapeHtml(person.name)}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

async function renderDetailTimeSpans(entityId) {
  if (!detailTimeList) return;

  const timeSpans = await listTimeSpans();
  const sources = await listSources();

  const filtered = timeSpans.filter((ts) => ts.entity_id === entityId);

  detailTimeList.innerHTML = "";

  if (filtered.length === 0) {
    detailTimeList.innerHTML = `<p class="empty">Sem períodos.</p>`;
    return;
  }

  filtered.forEach((ts) => {
    const tsSources = sources.filter((source) => {
      return String(source.related_time_span_ids || "")
        .split("|")
        .includes(ts.id);
    });

    const div = document.createElement("div");
    div.className = "mini-item";

    div.innerHTML = `
      <strong>${escapeHtml(ts.label || ts.kind)}</strong>
      <p>${escapeHtml(formatPeriod(ts.start_year, ts.end_year))}</p>

      ${
        tsSources.length
          ? `<div class="source-list">
              ${tsSources
                .map(
                  (src) => `
                    <div class="source-chip">
                      Fonte: ${escapeHtml(src.citation || src.reference || "Sem título")}
                    </div>
                  `
                )
                .join("")}
            </div>`
          : ""
      }

      <div class="entity-actions">
        <button class="edit" data-action="edit">Editar</button>
        <button class="secondary" data-action="source">Fonte</button>
        <button class="danger" data-action="delete">Excluir</button>
      </div>
    `;

    div.querySelector('[data-action="edit"]').onclick = () => {
      closeEntityDetail();
      fillTimeSpanForm(ts);
    };

    div.querySelector('[data-action="source"]').onclick = () => {
      openQuickSourceForm({
        entityId,
        timeSpanId: ts.id
      });
    };

    div.querySelector('[data-action="delete"]').onclick = async () => {
      const ok = confirm("Excluir este período?");
      if (!ok) return;

      await deleteTimeSpan(ts.id);
      await renderDetailTimeSpans(entityId);
      await renderTimeSpans();
      await renderEntities(searchInput?.value || "");
      await renderTimeline();
    };

    detailTimeList.appendChild(div);
  });
}


async function populateDetailRelationForm(currentEntityId) {
  if (!detailRelationType || !detailRelationTarget) return;

  const entities = await listEntities();
  const relationTypes = await getAllRecords(STORES.relation_types);

  detailRelationType.innerHTML = `<option value="">Tipo de relação</option>`;

  relationTypes.forEach((rt) => {
    const option = document.createElement("option");
    option.value = rt.key;
    option.textContent = rt.label || rt.key;
    detailRelationType.appendChild(option);
  });

  async function updateDetailRelationTargetOptions() {
    const selectedKey = detailRelationType.value;
    const selectedType = relationTypes.find((rt) => rt.key === selectedKey);

    detailRelationTarget.innerHTML = `<option value="">Destino</option>`;

    const filteredEntities = selectedType
      ? entities.filter((entity) =>
          entity.id !== currentEntityId &&
          typeIsAllowed(entity.type, selectedType.target_types)
        )
      : entities.filter((entity) => entity.id !== currentEntityId);

    filteredEntities.forEach((entity) => {
      const option = document.createElement("option");
      option.value = entity.id;
      option.textContent = formatEntityOption(entity);
      detailRelationTarget.appendChild(option);
    });
  }

  detailRelationType.onchange = updateDetailRelationTargetOptions;

  await updateDetailRelationTargetOptions();
}

async function renderDetailFamily(entityId) {
  const block = document.getElementById("detailFamilyBlock");
  if (!block) return;

  const family = await getFamilySummary(entityId);
  const entity = family.entity;

  if (!entity || entity.type !== "person") {
    block.innerHTML = `<p class="empty">Família disponível apenas para pessoas.</p>`;
    return;
  }

  const html = `
    ${renderFamilyGroup("Pais", family.parents)}
    ${renderFamilyGroup("Cônjuges", family.spouses)}
    ${renderFamilyGroup("Filhos", family.children)}
    ${renderFamilyGroup("Irmãos", family.siblings)}
    ${renderFamilyGroup("Meio-irmãos", family.halfSiblings)}
  `;

  block.innerHTML =
    html.trim() || `<p class="empty">Nenhum vínculo familiar registrado.</p>`;

  block.querySelectorAll("[data-family-entity-id]").forEach((button) => {
    button.onclick = async () => {
      await openEntityDetail(button.dataset.familyEntityId);
    };
  });
}

async function handleDetailTimeSubmit(event) {
  event.preventDefault();

  const entityId = detailEntityId?.value;
  if (!entityId) return;

  const payload = {
    entity_id: entityId,
    kind: detailTsKind.value.trim(),
    label: detailTsLabel.value.trim(),
    start_year: detailTsStart.value,
    end_year: detailTsEnd.value,
    start_approx: false,
    end_approx: false
  };

  if (!payload.kind) {
    alert("Informe o tipo do período.");
    return;
  }

  await createTimeSpan(payload);

  detailTimeForm.reset();

  await renderDetailTimeSpans(entityId);
  await renderTimeSpans();
  await renderEntities(searchInput?.value || "");
  await renderTimeline();
}

async function handleDetailRelationSubmit(event) {
  event.preventDefault();

  const entityId = detailEntityId?.value;
  if (!entityId) return;

  const payload = {
    source_id: entityId,
    relation_type_key: detailRelationType.value,
    target_id: detailRelationTarget.value,
    notes: ""
  };

  if (!payload.relation_type_key || !payload.target_id) {
    alert("Selecione o tipo de relação e o destino.");
    return;
  }

  await createRelation(payload);

  detailRelationForm.reset();

  await populateDetailRelationForm(entityId);
  await renderDetailRelations(entityId);
  await renderRelations();
}

function openQuickSourceForm({ entityId, timeSpanId = "", relationId = "" }) {
  if (!quickSourceModal) return;

  quickSourceEntityId.value = entityId || "";
  quickSourceTimeSpanId.value = timeSpanId || "";
  quickSourceRelationId.value = relationId || "";

  quickSourceForm.reset();

  quickSourceModal.classList.remove("hidden");
}

function closeQuickSourceModal() {
  if (quickSourceModal) {
    quickSourceModal.classList.add("hidden");
  }
}

async function handleQuickSourceSubmit(event) {
  event.preventDefault();

  const entityId = quickSourceEntityId.value;
  const timeSpanId = quickSourceTimeSpanId.value;
  const relationId = quickSourceRelationId.value;

  const payload = {
    source_type: quickSourceType.value,
    citation: quickSourceCitation.value.trim(),
    reference: quickSourceReference.value.trim(),
    url: quickSourceUrl.value.trim(),
    notes: quickSourceNotes.value.trim(),
    related_entity_ids: entityId,
    related_time_span_ids: timeSpanId,
    related_relation_ids: relationId
  };

  if (!payload.citation && !payload.reference && !payload.notes) {
    alert("Informe pelo menos uma referência, descrição ou observação.");
    return;
  }

  await createSource(payload);

  closeQuickSourceModal();

  if (entityId) {
    await renderDetailSources(entityId);
  }
}

async function renderDetailSources(entityId) {
  if (!detailSourceList) return;

  const sources = await listSourcesByEntity(entityId);

  detailSourceList.innerHTML = "";

  if (sources.length === 0) {
    detailSourceList.innerHTML = `<p class="empty">Sem fontes registradas.</p>`;
    return;
  }

  sources.forEach((source) => {
    const div = document.createElement("div");
    div.className = "mini-item";

    div.innerHTML = `
      <strong>${escapeHtml(source.citation || source.reference || "Fonte")}</strong>
      <p>${escapeHtml(source.source_type || "")}</p>
      ${source.reference ? `<p>${escapeHtml(source.reference)}</p>` : ""}
      ${source.notes ? `<p>${escapeHtml(source.notes)}</p>` : ""}
      ${
        source.url
          ? `<p><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">Abrir link</a></p>`
          : ""
      }

      <div class="entity-actions">
        <button class="danger" data-action="delete">Excluir</button>
      </div>
    `;

    div.querySelector('[data-action="delete"]').onclick = async () => {
      const ok = confirm("Excluir esta fonte?");
      if (!ok) return;

      await deleteSource(source.id);
      await renderDetailSources(entityId);
    };

    detailSourceList.appendChild(div);
  });
}

async function handleDetailSourceSubmit(event) {
  event.preventDefault();

  const entityId = detailEntityId?.value;
  if (!entityId) return;

  const payload = {
    source_type: detailSourceType.value,
    citation: detailSourceCitation.value.trim(),
    reference: detailSourceReference.value.trim(),
    url: detailSourceUrl.value.trim(),
    notes: detailSourceNotes.value.trim(),
    related_entity_ids: entityId
  };

  if (!payload.citation && !payload.reference && !payload.notes) {
    alert("Informe pelo menos uma referência, descrição ou observação.");
    return;
  }

  await createSource(payload);

  detailSourceForm.reset();
  if (detailSourceNotes) detailSourceNotes.value = "";

  await renderDetailSources(entityId);
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
      option.textContent = formatEntityOption(entity);
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
  await updateRelationTargetOptions();
}

// ===== TIMELINE =====
async function renderTimeline() {
  if (!timelineContainer || typeof vis === "undefined") return;

  const entities = await listEntities();
  const timeSpans = await listTimeSpans();

  const typeFilter = timelineTypeFilter?.value || "";

  const filteredEntities = typeFilter
    ? entities.filter((entity) => entity.type === typeFilter)
    : entities;

  const filteredEntityIds = new Set(filteredEntities.map((entity) => entity.id));

  const entityMap = {};
  entities.forEach((entity) => {
    entityMap[entity.id] = entity;
  });

  const groups = filteredEntities.map((entity) => ({
    id: entity.id,
    content: escapeHtml(entity.name)
  }));

  const items = timeSpans
    .filter((ts) => filteredEntityIds.has(ts.entity_id))
    .filter((ts) => ts.start_year !== "" || ts.end_year !== "")
    .map((ts) => {
      const entity = entityMap[ts.entity_id];

      const startYear =
        ts.start_year !== "" ? Number(ts.start_year) : Number(ts.end_year);

      const endYear =
        ts.end_year !== "" ? Number(ts.end_year) : Number(ts.start_year);

      if (Number.isNaN(startYear) || Number.isNaN(endYear)) return null;

      const isRange = startYear !== endYear;

      return {
        id: ts.id,
        group: ts.entity_id,
        content: escapeHtml(ts.label || ts.kind || entity?.name || "Período"),
        start: yearToVisDate(startYear),
        end: isRange ? yearToVisDate(endYear) : undefined,
        title: `${escapeHtml(entity?.name || "")}<br>${escapeHtml(
          formatPeriod(ts.start_year, ts.end_year)
        )}`,
        className: `timeline-${entity?.type || "default"}`
      };
    })
    .filter(Boolean);

  timelineContainer.innerHTML = "";

  if (timelineInstance) {
    timelineInstance.destroy();
    timelineInstance = null;
  }

  if (items.length === 0) {
    timelineContainer.innerHTML =
      `<p class="empty">Nenhum período com data cadastrado.</p>`;
    return;
  }

  const options = {
    stack: true,
    horizontalScroll: true,
    zoomKey: "ctrlKey",
    orientation: "top",
    groupOrder: "content",
    tooltip: {
      followMouse: true
    },
    margin: {
      item: 10,
      axis: 10
    }
  };

  timelineInstance = new vis.Timeline(
    timelineContainer,
    new vis.DataSet(items),
    new vis.DataSet(groups),
    options
  );

  timelineInstance.on("select", async (props) => {
    if (!props.items.length) return;

    const selected = items.find((item) => item.id === props.items[0]);
    if (!selected?.group) return;

    await openEntityDetail(selected.group);
  });
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
    await populateEventWizardSelects();
    await populatePersonWizardSelects();
    await renderTimeSpans();
    await renderRelations();
    await renderTimeline();

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

function formatEntityOption(entity) {
  const typeLabels = {
    person: "Pessoa",
    book: "Livro",
    event: "Evento",
    place: "Lugar",
    people_group: "Grupo",
    role: "Função",
    period: "Período",
    theme: "Tema"
  };

  const type = typeLabels[entity.type] || entity.type || "—";

  const subtype = entity.subtype
    ? ` · ${capitalize(entity.subtype)}`
    : "";

  return `${entity.name} (${type}${subtype})`;
}


// ===== ABAS =====
function switchTab(tab) {
  tabs.forEach((t) => t.classList.remove("active"));

  const activeTab = document.querySelector(`[data-tab="${tab}"]`);
  if (activeTab) activeTab.classList.add("active");

  // Esconde todas as abas principais
  if (tabEntities) tabEntities.classList.add("hidden");
  if (tabTime) tabTime.classList.add("hidden");
  if (tabRelations) tabRelations.classList.add("hidden");
  if (tabTimeline) tabTimeline.classList.add("hidden");
  if (tabSearch) tabSearch.classList.add("hidden");
  if (tabEventWizard) tabEventWizard.classList.add("hidden");
  if (tabPersonWizard) tabPersonWizard.classList.add("hidden");

  // Mostra apenas a aba selecionada
  if (tab === "entities" && tabEntities) {
    tabEntities.classList.remove("hidden");
  }

  if (tab === "time" && tabTime) {
    tabTime.classList.remove("hidden");
  }

  if (tab === "relations" && tabRelations) {
    tabRelations.classList.remove("hidden");
  }

  if (tab === "timeline" && tabTimeline) {
    tabTimeline.classList.remove("hidden");
    renderTimeline();
  }

  if (tab === "search" && tabSearch) {
    tabSearch.classList.remove("hidden");
  }

  if (tab === "eventWizard" && tabEventWizard) {
    tabEventWizard.classList.remove("hidden");
    populateEventWizardSelects();
  }

  if (tab === "personWizard" && tabPersonWizard) {
    tabPersonWizard.classList.remove("hidden");
    populatePersonWizardSelects();
  }
}

// ===== FORMATOS / UTIL =====





async function handleGlobalSearch() {
  if (!globalSearchInput || !globalSearchResults) return;

  const query = normalizeText(globalSearchInput.value);

  globalSearchResults.innerHTML = "";

  if (!query) {
    globalSearchResults.innerHTML = `<p class="empty">Digite algo para buscar.</p>`;
    return;
  }

  const entities = await listEntities();
  const sources = await listSources();

  const matchedEntities = entities.filter((entity) => {
    const text = normalizeText([
      entity.name,
      entity.type,
      entity.subtype,
      entity.summary,
      entity.tags
    ].join(" "));

    return text.includes(query);
  });

  const matchedSources = sources.filter((source) => {
    const text = normalizeText([
      source.citation,
      source.reference,
      source.notes,
      source.url,
      source.source_type
    ].join(" "));

    return text.includes(query);
  });

  globalSearchResults.innerHTML = `
    <h3>Entidades</h3>
    <div id="globalEntityResults"></div>

    <h3>Fontes</h3>
    <div id="globalSourceResults"></div>
  `;

  const entityBox = document.getElementById("globalEntityResults");
  const sourceBox = document.getElementById("globalSourceResults");

  if (matchedEntities.length === 0) {
    entityBox.innerHTML = `<p class="empty">Nenhuma entidade encontrada.</p>`;
  } else {
    matchedEntities.forEach((entity) => {
      const div = document.createElement("div");
      div.className = "mini-item";

      div.innerHTML = `
        <strong>${escapeHtml(entity.name)}</strong>
        <p>${escapeHtml(entity.type)}${entity.subtype ? " / " + escapeHtml(entity.subtype) : ""}</p>
        ${entity.summary ? `<p>${escapeHtml(entity.summary)}</p>` : ""}
        <button class="secondary">Abrir</button>
      `;

      div.querySelector("button").onclick = async () => {
        await openEntityDetail(entity.id);
      };

      entityBox.appendChild(div);
    });
  }

  if (matchedSources.length === 0) {
    sourceBox.innerHTML = `<p class="empty">Nenhuma fonte encontrada.</p>`;
  } else {
    matchedSources.forEach((source) => {
      const div = document.createElement("div");
      div.className = "mini-item";

      div.innerHTML = `
        <strong>${escapeHtml(source.citation || source.reference || "Fonte")}</strong>
        <p>${escapeHtml(source.source_type || "")}</p>
        ${source.reference ? `<p>${escapeHtml(source.reference)}</p>` : ""}
        ${source.notes ? `<p>${escapeHtml(source.notes)}</p>` : ""}
      `;

      sourceBox.appendChild(div);
    });
  }
}

function typeIsAllowed(entityType, allowedTypesText) {
  if (!allowedTypesText) return true;

  const allowedTypes = String(allowedTypesText)
    .split("|")
    .map((type) => type.trim())
    .filter(Boolean);

  return allowedTypes.includes(entityType);
}

async function updateRelationTargetOptions() {
  if (!relType || !relTarget) return;

  const selectedKey = relType.value;
  const relationTypes = await getAllRecords(STORES.relation_types);
  const entities = await listEntities();

  const selectedType = relationTypes.find((rt) => rt.key === selectedKey);

  relTarget.innerHTML = `<option value="">Selecione</option>`;

  const filteredEntities = selectedType
    ? entities.filter((entity) =>
        typeIsAllowed(entity.type, selectedType.target_types)
      )
    : entities;

  filteredEntities.forEach((entity) => {
    const option = document.createElement("option");
    option.value = entity.id;
    option.textContent = formatEntityOption(entity);
    relTarget.appendChild(option);
  });
}



function getRelationLabel(rel, relationType, isDirect, entityMap) {
  if (isDirect) {
    return relationType?.label || rel.relation_type_key;
  }

  if (rel.relation_type_key === "filho_de") {
    const currentEntity = entityMap[rel.target_id];

    if (currentEntity?.subtype === "female" || currentEntity?.subtype === "mulher") {
      return "mãe de";
    }

    if (currentEntity?.subtype === "male" || currentEntity?.subtype === "homem") {
      return "pai de";
    }

    return "pai/mãe de";
  }

  const inverseLabels = {
    escreveu: "escrito por",
    conjuge_de: "cônjuge de",
    nasceu_em: "local de nascimento de",
    morreu_em: "local de morte de",
    ocorreu_em: "foi local de",
    participou_de: "teve participação de",
    reinou_em: "teve como rei",
    fica_em: "contém",
    pertence_ao_periodo: "inclui"
  };

  return (
    relationType?.inverse_label ||
    inverseLabels[rel.relation_type_key] ||
    `relacionado a`
  );
}

async function populateEventWizardSelects() {
  if (!eventWizardPlace || !eventWizardParticipants) return;

  const entities = await listEntities();

  const places = entities.filter((entity) => entity.type === "place");
  const participants = entities.filter((entity) =>
    ["person", "people_group"].includes(entity.type)
  );

  eventWizardPlace.innerHTML = `<option value="">Sem local</option>`;

  places.forEach((entity) => {
    const option = document.createElement("option");
    option.value = entity.id;
    option.textContent = formatEntityOption(entity);
    eventWizardPlace.appendChild(option);
  });

  eventWizardParticipants.innerHTML = "";

  participants.forEach((entity) => {
    const option = document.createElement("option");
    option.value = entity.id;
    option.textContent = formatEntityOption(entity);
    eventWizardParticipants.appendChild(option);
  });
}

async function handleEventWizardSubmit(event) {
  event.preventDefault();

  const title = eventWizardTitle.value.trim();

  if (!title) {
    alert("Informe o título do acontecimento.");
    return;
  }

  try {
    setEventWizardStatus("Processando acontecimento...");

    const selectedParticipants = Array.from(
      eventWizardParticipants.selectedOptions
    ).map((option) => option.value);

    const eventEntity = await createOrUpdateEventFromWizard({
      title,
      subtype: eventWizardSubtype.value.trim(),
      start_year: eventWizardStartYear.value,
      end_year: eventWizardEndYear.value,
      place_id: eventWizardPlace.value,
      participant_ids: selectedParticipants,
      citation: eventWizardCitation.value.trim(),
      notes: eventWizardNotes.value.trim()
    });

    eventWizardForm.reset();

    await renderEntities();
    await populateSelects();
    await populateEventWizardSelects();
    await populatePersonWizardSelects();
    await renderTimeSpans();
    await renderRelations();
    await renderTimeline();

    setEventWizardStatus(`Acontecimento salvo: ${eventEntity.name}`);
  } catch (error) {
    console.error("Erro no assistente de acontecimento:", error);
    setEventWizardStatus(error.message || "Erro ao criar acontecimento. Veja o console.");
  }
}



function setEventWizardStatus(message) {
  if (eventWizardStatus) {
    eventWizardStatus.textContent = message;
  } else {
    console.log(message);
  }
}

async function populatePersonWizardSelects() {
  if (!personWizardFather || !personWizardMother || !personWizardSpouse) return;

  const entities = await listEntities();

  const people = entities.filter((entity) => entity.type === "person");

  fillPersonSelect(personWizardFather, people, "Sem pai selecionado");
  fillPersonSelect(personWizardMother, people, "Sem mãe selecionada");
  fillPersonSelect(personWizardSpouse, people, "Sem cônjuge selecionado");
}

function fillPersonSelect(select, people, emptyLabel) {
  if (!select) return;

  const currentValue = select.value;

  select.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>`;

  people.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = formatEntityOption(person);
    select.appendChild(option);
  });

  select.value = currentValue;
}

async function handlePersonWizardSubmit(event) {
  event.preventDefault();

  const name = personWizardName.value.trim();

  if (!name) {
    alert("Informe o nome da pessoa.");
    return;
  }

  try {
    setPersonWizardStatus("Processando pessoa...");

    const person = await createOrUpdatePersonFromWizard({
      name,
      gender: personWizardGender.value,
      summary: personWizardSummary.value.trim(),
      tags: personWizardTags.value.trim(),

      birth_year: personWizardBirthYear.value,
      birth_date_text: personWizardBirthDateText.value.trim(),
      birth_place_name: personWizardBirthPlace.value.trim(),
      birth_approx: personWizardBirthApprox.checked,

      death_year: personWizardDeathYear.value,
      death_date_text: personWizardDeathDateText.value.trim(),
      death_place_name: personWizardDeathPlace.value.trim(),
      death_approx: personWizardDeathApprox.checked,

      father_id: personWizardFather.value,
      mother_id: personWizardMother.value,
      spouse_id: personWizardSpouse.value,

      citation: personWizardCitation.value.trim(),
      source_notes: personWizardSourceNotes.value.trim()
    });

    personWizardForm.reset();

    await renderEntities();
    await populateSelects();
    await populateEventWizardSelects();
    await populatePersonWizardSelects();
    await renderTimeSpans();
    await renderRelations();
    await renderTimeline();

    setPersonWizardStatus(`Pessoa salva: ${person.name}`);
  } catch (error) {
    console.error("Erro no assistente de pessoa:", error);
    setPersonWizardStatus(error.message || "Erro ao criar pessoa. Veja o console.");
  }
}

function setPersonWizardStatus(message) {
  if (personWizardStatus) {
    personWizardStatus.textContent = message;
  } else {
    console.log(message);
  }
}

initApp().catch((error) => {
  console.error("Erro ao iniciar app:", error);
  alert("Erro ao iniciar o app. Veja o console.");
});