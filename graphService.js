// graphService.js

import { listEntities } from "./entityService.js";
import { listRelations } from "./relationService.js";

const CHILD_OF = "filho_de";
const SPOUSE_OF = "conjuge_de";

const DEFAULT_OPTIONS = {
  ancestorDepth: 3,
  descendantDepth: 3,
  includeSpouses: true
};

export async function buildFamilyGraph(centerEntityId, options = {}) {
  const entities = await listEntities();
  const relations = await listRelations();

  return buildFamilyUnionGraphFromData(centerEntityId, entities, relations, options);
}

export function buildFamilyUnionGraphFromData(centerEntityId, entities, relations, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const entityMap = buildEntityMap(entities);
  const centerEntity = entityMap[centerEntityId];

  if (!centerEntity || centerEntity.type !== "person") {
    return {
      centerEntity: null,
      nodes: [],
      edges: [],
      elements: [],
      warnings: []
    };
  }

  const childRelations = relations.filter((rel) => rel.relation_type_key === CHILD_OF);
  const spouseRelations = relations.filter((rel) => rel.relation_type_key === SPOUSE_OF);

  const includedPeople = new Set();
  const generationMap = new Map();
  const warnings = [];

  addPerson(centerEntityId, 0, includedPeople, generationMap);

  collectAncestors({
    entityId: centerEntityId,
    depth: config.ancestorDepth,
    generation: 0,
    childRelations,
    spouseRelations,
    includedPeople,
    generationMap
  });

  collectDescendants({
    entityId: centerEntityId,
    depth: config.descendantDepth,
    generation: 0,
    childRelations,
    spouseRelations,
    includedPeople,
    generationMap
  });

  if (config.includeSpouses) {
    addSpousesForIncludedPeople({
      includedPeople,
      generationMap,
      spouseRelations
    });
  }

  const unions = buildFamilyUnions({
    includedPeople,
    entityMap,
    childRelations,
    spouseRelations,
    generationMap,
    warnings
  });

  const nodes = buildNodes({
    includedPeople,
    unions,
    entityMap,
    generationMap,
    centerEntityId,
    warnings
  });

  const edges = buildEdges({
    unions,
    includedPeople,
    spouseRelations,
    childRelations
  });

  const elements = buildCytoscapeElements(nodes, edges);

  return {
    centerEntity,
    nodes,
    edges,
    elements,
    warnings
  };
}

function buildEntityMap(entities) {
  const map = {};
  entities.forEach((entity) => {
    map[entity.id] = entity;
  });
  return map;
}

function addPerson(entityId, generation, includedPeople, generationMap) {
  if (!entityId) return;

  includedPeople.add(entityId);

  if (!generationMap.has(entityId)) {
    generationMap.set(entityId, generation);
    return;
  }

  const current = generationMap.get(entityId);

  if (Math.abs(generation) < Math.abs(current)) {
    generationMap.set(entityId, generation);
  }
}

function getParentsOf(entityId, childRelations) {
  return childRelations
    .filter((rel) => rel.source_id === entityId)
    .map((rel) => rel.target_id);
}

function getChildrenOf(entityId, childRelations) {
  return childRelations
    .filter((rel) => rel.target_id === entityId)
    .map((rel) => rel.source_id);
}

function getSpousesOf(entityId, spouseRelations) {
  return spouseRelations
    .filter((rel) => rel.source_id === entityId || rel.target_id === entityId)
    .map((rel) => (rel.source_id === entityId ? rel.target_id : rel.source_id));
}

function collectAncestors({
  entityId,
  depth,
  generation,
  childRelations,
  spouseRelations,
  includedPeople,
  generationMap
}) {
  if (depth <= 0) return;

  const parentIds = getParentsOf(entityId, childRelations);

  parentIds.forEach((parentId) => {
    const parentGeneration = generation - 1;
    addPerson(parentId, parentGeneration, includedPeople, generationMap);

    getSpousesOf(parentId, spouseRelations).forEach((spouseId) => {
      addPerson(spouseId, parentGeneration, includedPeople, generationMap);
    });

    collectAncestors({
      entityId: parentId,
      depth: depth - 1,
      generation: parentGeneration,
      childRelations,
      spouseRelations,
      includedPeople,
      generationMap
    });
  });
}

function collectDescendants({
  entityId,
  depth,
  generation,
  childRelations,
  spouseRelations,
  includedPeople,
  generationMap
}) {
  if (depth <= 0) return;

  const childIds = getChildrenOf(entityId, childRelations);

  childIds.forEach((childId) => {
    const childGeneration = generation + 1;
    addPerson(childId, childGeneration, includedPeople, generationMap);

    getSpousesOf(childId, spouseRelations).forEach((spouseId) => {
      addPerson(spouseId, childGeneration, includedPeople, generationMap);
    });

    collectDescendants({
      entityId: childId,
      depth: depth - 1,
      generation: childGeneration,
      childRelations,
      spouseRelations,
      includedPeople,
      generationMap
    });
  });
}

function addSpousesForIncludedPeople({ includedPeople, generationMap, spouseRelations }) {
  Array.from(includedPeople).forEach((personId) => {
    const generation = generationMap.get(personId) || 0;

    getSpousesOf(personId, spouseRelations).forEach((spouseId) => {
      addPerson(spouseId, generation, includedPeople, generationMap);
    });
  });
}

function buildFamilyUnions({
  includedPeople,
  entityMap,
  childRelations,
  spouseRelations,
  generationMap,
  warnings
}) {
  const unions = [];
  const unionMap = new Map();

  spouseRelations.forEach((rel) => {
    const a = rel.source_id;
    const b = rel.target_id;

    if (!includedPeople.has(a) && !includedPeople.has(b)) return;

    includedPeople.add(a);
    includedPeople.add(b);

    const key = makePairKey(a, b);

    if (!unionMap.has(key)) {
      unionMap.set(key, {
        id: `union_${key}`,
        partnerA: a,
        partnerB: b,
        children: [],
        generation: Math.min(
          generationMap.get(a) ?? 0,
          generationMap.get(b) ?? 0
        )
      });
    }
  });

  childRelations.forEach((rel) => {
    const childId = rel.source_id;
    const parentId = rel.target_id;

    if (!includedPeople.has(childId) && !includedPeople.has(parentId)) return;

    const parentSpouses = getSpousesOf(parentId, spouseRelations);
    const childParentIds = getParentsOf(childId, childRelations);

    const otherParentId =
      childParentIds.find((id) => id !== parentId && parentSpouses.includes(id)) ||
      childParentIds.find((id) => id !== parentId) ||
      "";

    const unionKey = otherParentId
      ? makePairKey(parentId, otherParentId)
      : `single_${parentId}`;

    if (!unionMap.has(unionKey)) {
      unionMap.set(unionKey, {
        id: `union_${unionKey}`,
        partnerA: parentId,
        partnerB: otherParentId,
        children: [],
        generation: generationMap.get(parentId) ?? 0
      });
    }

    const union = unionMap.get(unionKey);

    if (!union.children.includes(childId)) {
      union.children.push(childId);
    }

    includedPeople.add(parentId);
    includedPeople.add(childId);

    if (otherParentId) includedPeople.add(otherParentId);
  });

  unionMap.forEach((union) => {
    if (!union.partnerA && !union.partnerB) return;

    detectUnionWarnings(union, warnings);

    unions.push(union);
  });

  return unions;
}

function detectUnionWarnings(union, warnings) {
  const partners = [union.partnerA, union.partnerB].filter(Boolean);

  union.children.forEach((childId) => {
    if (partners.includes(childId)) {
      warnings.push({
        type: "invalid_family_cycle",
        entityId: childId,
        unionId: union.id,
        message: "Pessoa aparece como filho e cônjuge/pai-mãe na mesma união."
      });
    }
  });
}

function makePairKey(a, b) {
  return [a, b].filter(Boolean).sort().join("__");
}

function buildNodes({
  includedPeople,
  unions,
  entityMap,
  generationMap,
  centerEntityId,
  warnings
}) {
  const duplicateCounts = new Map();

  unions.forEach((union) => {
    [union.partnerA, union.partnerB, ...union.children].filter(Boolean).forEach((id) => {
      duplicateCounts.set(id, (duplicateCounts.get(id) || 0) + 1);
    });
  });

  const personNodes = Array.from(includedPeople)
    .map((id) => {
      const entity = entityMap[id];
      if (!entity || entity.type !== "person") return null;

      const hasWarning = warnings.some((warning) => warning.entityId === id);
      const appearsMultipleTimes = (duplicateCounts.get(id) || 0) > 2;

      return {
        id,
        type: "person",
        label: entity.name || "Sem nome",
        subtype: entity.subtype || "",
        generation: generationMap.get(id) || 0,
        isCenter: id === centerEntityId,
        hasWarning,
        isDuplicateLike: appearsMultipleTimes,
        entity
      };
    })
    .filter(Boolean);

  const unionNodes = unions.map((union, index) => ({
    id: union.id,
    type: "family_union",
    label: "",
    generation: union.generation + 0.5,
    orderIndex: index,
    partnerA: union.partnerA,
    partnerB: union.partnerB,
    children: union.children
  }));

  return [...personNodes, ...unionNodes];
}

function buildEdges({ unions, includedPeople }) {
  const edges = [];

  unions.forEach((union) => {
    if (union.partnerA && includedPeople.has(union.partnerA)) {
      edges.push({
        id: `edge_${union.id}_${union.partnerA}`,
        source: union.partnerA,
        target: union.id,
        kind: "partner",
        label: ""
      });
    }

    if (union.partnerB && includedPeople.has(union.partnerB)) {
      edges.push({
        id: `edge_${union.id}_${union.partnerB}`,
        source: union.id,
        target: union.partnerB,
        kind: "partner",
        label: ""
      });
    }

    union.children.forEach((childId) => {
      if (!includedPeople.has(childId)) return;

      edges.push({
        id: `edge_${union.id}_${childId}`,
        source: union.id,
        target: childId,
        kind: "child",
        label: "",
        motherId: union.partnerB || ""
      });
    });
  });

  return edges;
}

export function buildCytoscapeElements(nodes, edges) {
  const nodeElements = nodes.map((node) => {
    if (node.type === "family_union") {
      return {
        group: "nodes",
        data: {
          id: node.id,
          type: node.type,
          generation: node.generation,
          partnerA: node.partnerA,
          partnerB: node.partnerB,
          children: node.children
        },
        classes: "family-union-node"
      };
    }

    const classes = [
      "person-node",
      node.isCenter ? "center-node" : "",
      node.subtype === "male" ? "male-node" : "",
      node.subtype === "female" ? "female-node" : "",
      node.hasWarning ? "warning-node" : "",
      node.isDuplicateLike ? "duplicate-node" : ""
    ]
      .filter(Boolean)
      .join(" ");

    return {
      group: "nodes",
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        subtype: node.subtype,
        generation: node.generation,
        isCenter: node.isCenter,
        hasWarning: node.hasWarning,
        isDuplicateLike: node.isDuplicateLike
      },
      classes
    };
  });

  const edgeElements = edges.map((edge) => ({
    group: "edges",
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
      label: edge.label || "",
      motherId: edge.motherId || ""
    },
    classes: edge.kind === "child" ? "child-edge" : "partner-edge"
  }));

  return [...nodeElements, ...edgeElements];
}