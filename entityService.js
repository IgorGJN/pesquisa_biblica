// entityService.js

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

function normalizeEntityData(data) {
  return {
    type: data.type || "",
    subtype: data.subtype || "",
    name: data.name || "",
    summary: data.summary || "",
    description: data.description || "",
    tags: data.tags || "",
    status: data.status || "active",
    alt_names: data.alt_names || "",
    meta_json: data.meta_json || "{}"
  };
}

function validateEntityData(data) {
  if (!data.type) {
    throw new Error("Tipo da entidade não informado.");
  }

  if (!data.name) {
    throw new Error("Nome da entidade não informado.");
  }
}

export async function findEntityByNameAndType(name, type, options = {}) {
  const { ignoreId = "" } = options;

  const entities = await listEntities();

  return (
    entities.find((entity) => {
      if (ignoreId && entity.id === ignoreId) return false;

      return (
        normalizeText(entity.name) === normalizeText(name) &&
        entity.type === type
      );
    }) || null
  );
}

export async function entityExists(name, type, options = {}) {
  const existing = await findEntityByNameAndType(name, type, options);
  return Boolean(existing);
}

export async function createEntity(data) {
  const entityData = normalizeEntityData(data);

  validateEntityData(entityData);

  const existing = await findEntityByNameAndType(
    entityData.name,
    entityData.type
  );

  if (existing) {
    return existing;
  }

  const entity = {
    id: generateId("ent"),
    ...entityData
  };

  return addRecord(STORES.entities, entity);
}

export async function ensureEntity(data) {
  return createEntity(data);
}

export async function updateEntity(id, data) {
  const existing = await getRecord(STORES.entities, id);

  if (!existing) {
    throw new Error("Entidade não encontrada.");
  }

  const updated = normalizeEntityData({
    ...existing,
    ...data
  });

  validateEntityData(updated);

  const duplicate = await findEntityByNameAndType(
    updated.name,
    updated.type,
    {
      ignoreId: id
    }
  );

  if (duplicate) {
    throw new Error(
      `Já existe uma entidade chamada "${duplicate.name}" do mesmo tipo.`
    );
  }

  return putRecord(STORES.entities, {
    ...existing,
    ...updated,
    id
  });
}

export async function listEntities() {
  const entities = await getAllRecords(STORES.entities);

  return entities.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );
}

export async function getEntity(id) {
  return getRecord(STORES.entities, id);
}

export async function deleteEntity(id) {
  return softDeleteRecord(STORES.entities, id);
}