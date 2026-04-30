// graphService.js

import { listEntities } from "./entityService.js";
import { listRelations } from "./relationService.js";

const FAMILY_RELATION_TYPES = {
  CHILD_OF: "filho_de",
  SPOUSE_OF: "conjuge_de"
};

const DEFAULT_OPTIONS = {
  ancestorDepth: 3,
  descendantDepth: 3,
  includeSpouses: true
};

export async function buildFamilyGraph(centerEntityId, options = {}) {
  const entities = await listEntities();
  const relations = await listRelations();

  return buildFamilyGraphFromData(centerEntityId, entities, relations, options);
}

export function buildFamilyGraphFromData(
  centerEntityId,
  entities,
  relations,
  options = {}
) {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options
  };

  const entityMap = buildEntityMap(entities);
  const centerEntity = entityMap[centerEntityId];

  if (!centerEntity || centerEntity.type !== "person") {
    return {
      centerEntity: null,
      nodes: [],
      edges: [],
      elements: []
    };
  }

  const childOfRelations = relations.filter(
    (rel) => rel.relation_type_key === FAMILY_RELATION_TYPES.CHILD_OF
  );

  const spouseRelations = relations.filter(
    (rel) => rel.relation_type_key === FAMILY_RELATION_TYPES.SPOUSE_OF
  );

  const nodeIds = new Set();
  const generationMap = new Map();

  addNode(centerEntityId, 0, nodeIds, generationMap);

  collectAncestors({
    entityId: centerEntityId,
    depth: config.ancestorDepth,
    currentGeneration: 0,
    childOfRelations,
    spouseRelations,
    nodeIds,
    generationMap,
    includeSpouses: config.includeSpouses
  });

  collectDescendants({
    entityId: centerEntityId,
    depth: config.descendantDepth,
    currentGeneration: 0,
    childOfRelations,
    spouseRelations,
    nodeIds,
    generationMap,
    includeSpouses: config.includeSpouses
  });

  if (config.includeSpouses) {
    addSpousesForAllNodes({
      nodeIds,
      generationMap,
      spouseRelations
    });
  }

  const nodes = buildNodes({
    nodeIds,
    generationMap,
    entityMap,
    centerEntityId
  });

  const edges = buildEdges({
    nodeIds,
    childOfRelations,
    spouseRelations
  });

  const elements = buildCytoscapeElements(nodes, edges);

  return {
    centerEntity,
    nodes,
    edges,
    elements
  };
}

function buildEntityMap(entities) {
  const map = {};

  entities.forEach((entity) => {
    map[entity.id] = entity;
  });

  return map;
}

function addNode(entityId, generation, nodeIds, generationMap) {
  if (!entityId) return;

  nodeIds.add(entityId);

  if (!generationMap.has(entityId)) {
    generationMap.set(entityId, generation);
    return;
  }

  const currentGeneration = generationMap.get(entityId);

  if (Math.abs(generation) < Math.abs(currentGeneration)) {
    generationMap.set(entityId, generation);
  }
}

function collectAncestors({
  entityId,
  depth,
  currentGeneration,
  childOfRelations,
  spouseRelations,
  nodeIds,
  generationMap,
  includeSpouses
}) {
  if (depth <= 0) return;

  const parentIds = childOfRelations
    .filter((rel) => rel.source_id === entityId)
    .map((rel) => rel.target_id);

  parentIds.forEach((parentId) => {
    const parentGeneration = currentGeneration - 1;

    addNode(parentId, parentGeneration, nodeIds, generationMap);

    if (includeSpouses) {
      addSpousesOfEntity({
        entityId: parentId,
        generation: parentGeneration,
        spouseRelations,
        nodeIds,
        generationMap
      });
    }

    collectAncestors({
      entityId: parentId,
      depth: depth - 1,
      currentGeneration: parentGeneration,
      childOfRelations,
      spouseRelations,
      nodeIds,
      generationMap,
      includeSpouses
    });
  });
}

function collectDescendants({
  entityId,
  depth,
  currentGeneration,
  childOfRelations,
  spouseRelations,
  nodeIds,
  generationMap,
  includeSpouses
}) {
  if (depth <= 0) return;

  const childIds = childOfRelations
    .filter((rel) => rel.target_id === entityId)
    .map((rel) => rel.source_id);

  childIds.forEach((childId) => {
    const childGeneration = currentGeneration + 1;

    addNode(childId, childGeneration, nodeIds, generationMap);

    if (includeSpouses) {
      addSpousesOfEntity({
        entityId: childId,
        generation: childGeneration,
        spouseRelations,
        nodeIds,
        generationMap
      });
    }

    collectDescendants({
      entityId: childId,
      depth: depth - 1,
      currentGeneration: childGeneration,
      childOfRelations,
      spouseRelations,
      nodeIds,
      generationMap,
      includeSpouses
    });
  });
}

function addSpousesForAllNodes({ nodeIds, generationMap, spouseRelations }) {
  const currentIds = Array.from(nodeIds);

  currentIds.forEach((entityId) => {
    const generation = generationMap.get(entityId) || 0;

    addSpousesOfEntity({
      entityId,
      generation,
      spouseRelations,
      nodeIds,
      generationMap
    });
  });
}

function addSpousesOfEntity({
  entityId,
  generation,
  spouseRelations,
  nodeIds,
  generationMap
}) {
  const spouseIds = spouseRelations
    .filter((rel) => rel.source_id === entityId || rel.target_id === entityId)
    .map((rel) => {
      return rel.source_id === entityId ? rel.target_id : rel.source_id;
    });

  spouseIds.forEach((spouseId) => {
    addNode(spouseId, generation, nodeIds, generationMap);
  });
}

function buildNodes({ nodeIds, generationMap, entityMap, centerEntityId }) {
  return Array.from(nodeIds)
    .map((entityId) => {
      const entity = entityMap[entityId];

      if (!entity || entity.type !== "person") {
        return null;
      }

      const generation = generationMap.get(entityId) || 0;

      return {
        id: entity.id,
        label: entity.name || "Sem nome",
        type: entity.type,
        subtype: entity.subtype || "",
        generation,
        isCenter: entity.id === centerEntityId,
        entity
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.generation !== b.generation) {
        return a.generation - b.generation;
      }

      return String(a.label).localeCompare(String(b.label));
    });
}

function buildEdges({ nodeIds, childOfRelations, spouseRelations }) {
  const edges = [];

  childOfRelations.forEach((rel) => {
    const childId = rel.source_id;
    const parentId = rel.target_id;

    if (!nodeIds.has(childId) || !nodeIds.has(parentId)) return;

    edges.push({
      id: `edge_child_${rel.id}`,
      source: parentId,
      target: childId,
      relationId: rel.id,
      relationType: FAMILY_RELATION_TYPES.CHILD_OF,
      label: "pai/mãe de",
      kind: "parent_child"
    });
  });

  const spouseEdgeKeys = new Set();

  spouseRelations.forEach((rel) => {
    const sourceId = rel.source_id;
    const targetId = rel.target_id;

    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return;

    const sortedIds = [sourceId, targetId].sort();
    const edgeKey = sortedIds.join("__");

    if (spouseEdgeKeys.has(edgeKey)) return;
    spouseEdgeKeys.add(edgeKey);

    edges.push({
      id: `edge_spouse_${rel.id}`,
      source: sourceId,
      target: targetId,
      relationId: rel.id,
      relationType: FAMILY_RELATION_TYPES.SPOUSE_OF,
      label: "cônjuge de",
      kind: "spouse"
    });
  });

  return edges;
}

export function buildCytoscapeElements(nodes, edges) {
  const nodeElements = nodes.map((node) => {
    const classes = [
      "person-node",
      node.isCenter ? "center-node" : "",
      node.subtype === "male" ? "male-node" : "",
      node.subtype === "female" ? "female-node" : ""
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
        isCenter: node.isCenter
      },
      classes
    };
  });

  const edgeElements = edges.map((edge) => {
    const classes =
      edge.kind === "spouse"
        ? "spouse-edge"
        : "parent-child-edge";

    return {
      group: "edges",
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        relationId: edge.relationId,
        relationType: edge.relationType,
        kind: edge.kind
      },
      classes
    };
  });

  return [...nodeElements, ...edgeElements];
}