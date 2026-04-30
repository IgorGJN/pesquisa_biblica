// familyService.js

import { listEntities } from "./entityService.js";
import { listRelations } from "./relationService.js";

const FAMILY_RELATION_TYPES = {
  CHILD_OF: "filho_de",
  SPOUSE_OF: "conjuge_de"
};

function buildEntityMap(entities) {
  const map = {};

  entities.forEach((entity) => {
    map[entity.id] = entity;
  });

  return map;
}

function uniqueEntities(entities) {
  const map = new Map();

  entities.forEach((entity) => {
    if (entity?.id && !map.has(entity.id)) {
      map.set(entity.id, entity);
    }
  });

  return Array.from(map.values());
}

function getChildOfRelations(relations) {
  return relations.filter(
    (rel) => rel.relation_type_key === FAMILY_RELATION_TYPES.CHILD_OF
  );
}

function getSpouseRelations(relations) {
  return relations.filter(
    (rel) => rel.relation_type_key === FAMILY_RELATION_TYPES.SPOUSE_OF
  );
}

export async function getFamilySummary(entityId) {
  const entities = await listEntities();
  const relations = await listRelations();

  return buildFamilySummary(entityId, entities, relations);
}

export function buildFamilySummary(entityId, entities, relations) {
  const entityMap = buildEntityMap(entities);

  const childOfRelations = getChildOfRelations(relations);
  const spouseRelations = getSpouseRelations(relations);

  const parents = getParents(entityId, childOfRelations, entityMap);
  const children = getChildren(entityId, childOfRelations, entityMap);
  const spouses = getSpouses(entityId, spouseRelations, entityMap);

  const siblingData = getSiblings(entityId, childOfRelations, entityMap);

  return {
    entity: entityMap[entityId] || null,
    parents,
    children,
    spouses,
    siblings: siblingData.siblings,
    halfSiblings: siblingData.halfSiblings
  };
}

export function getParents(entityId, childOfRelations, entityMap) {
  return uniqueEntities(
    childOfRelations
      .filter((rel) => rel.source_id === entityId)
      .map((rel) => entityMap[rel.target_id])
      .filter(Boolean)
  );
}

export function getChildren(entityId, childOfRelations, entityMap) {
  return uniqueEntities(
    childOfRelations
      .filter((rel) => rel.target_id === entityId)
      .map((rel) => entityMap[rel.source_id])
      .filter(Boolean)
  );
}

export function getSpouses(entityId, spouseRelations, entityMap) {
  return uniqueEntities(
    spouseRelations
      .filter((rel) => rel.source_id === entityId || rel.target_id === entityId)
      .map((rel) => {
        const otherId = rel.source_id === entityId ? rel.target_id : rel.source_id;
        return entityMap[otherId];
      })
      .filter(Boolean)
  );
}

export function getSiblings(entityId, childOfRelations, entityMap) {
  const currentParentIds = childOfRelations
    .filter((rel) => rel.source_id === entityId)
    .map((rel) => rel.target_id);

  const currentParentIdSet = new Set(currentParentIds);

  if (currentParentIdSet.size === 0) {
    return {
      siblings: [],
      halfSiblings: []
    };
  }

  const siblingMap = new Map();

  childOfRelations.forEach((rel) => {
    const possibleSiblingId = rel.source_id;
    const sharedParentId = rel.target_id;

    if (possibleSiblingId === entityId) return;
    if (!currentParentIdSet.has(sharedParentId)) return;

    const possibleSibling = entityMap[possibleSiblingId];
    if (!possibleSibling) return;

    if (!siblingMap.has(possibleSiblingId)) {
      siblingMap.set(possibleSiblingId, {
        entity: possibleSibling,
        sharedParentIds: new Set()
      });
    }

    siblingMap.get(possibleSiblingId).sharedParentIds.add(sharedParentId);
  });

  const siblings = [];
  const halfSiblings = [];

  siblingMap.forEach((data) => {
    const sharedCount = data.sharedParentIds.size;

    if (currentParentIdSet.size >= 2) {
      if (sharedCount >= 2) {
        siblings.push(data.entity);
      } else {
        halfSiblings.push(data.entity);
      }

      return;
    }

    // Se só existe um pai/mãe conhecido no cadastro,
    // não há base suficiente para afirmar que é meio-irmão.
    siblings.push(data.entity);
  });

  return {
    siblings: uniqueEntities(siblings),
    halfSiblings: uniqueEntities(halfSiblings)
  };
}