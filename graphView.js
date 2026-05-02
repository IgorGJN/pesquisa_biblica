// graphView.js

import { buildFamilyGraph } from "./graphService.js";

let familyGraphInstance = null;

export async function renderFamilyGraphView(options) {
  const {
    container,
    entityId,
    ancestorDepth = 3,
    descendantDepth = 3,
    includeSpouses = true,
    onNodeClick = async () => {}
  } = options;

  if (!container) return;

  if (!entityId) {
    container.innerHTML = `<p class="empty">Nenhuma pessoa selecionada.</p>`;
    return;
  }

  if (typeof cytoscape === "undefined") {
    container.innerHTML = `
      <p class="empty">
        Cytoscape.js não foi carregado. Verifique o script no index.html.
      </p>
    `;
    return;
  }

  const graph = await buildFamilyGraph(entityId, {
    ancestorDepth,
    descendantDepth,
    includeSpouses
  });

  destroyCurrentGraph();

  if (!graph.centerEntity) {
    container.innerHTML = `<p class="empty">Árvore disponível apenas para pessoas.</p>`;
    return;
  }

  if (!graph.elements.length) {
    container.innerHTML = `<p class="empty">Nenhum vínculo familiar para exibir.</p>`;
    return;
  }

  container.innerHTML = "";

  const elements = addPresetPositions(graph.elements);

  familyGraphInstance = cytoscape({
    container,
    elements,

    style: [
      {
        selector: ".person-node",
        style: {
          shape: "round-rectangle",
          width: 145,
          height: 58,
          "background-color": "#eee7dd",
          "border-width": 2,
          "border-color": "#c8bba8",
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "text-wrap": "wrap",
          "text-max-width": 125,
          "font-size": 12,
          "font-weight": 600,
          color: "#2f261e",
          padding: "8px"
        }
      },
      {
        selector: ".center-node",
        style: {
          "background-color": "#3b2f25",
          "border-color": "#3b2f25",
          color: "#ffffff"
        }
      },
      {
        selector: ".male-node",
        style: {
          "border-style": "solid"
        }
      },
      {
        selector: ".female-node",
        style: {
          "border-style": "double"
        }
      },
      {
        selector: ".warning-node",
        style: {
          "border-color": "#b3261e",
          "border-width": 4
        }
      },
      {
        selector: ".duplicate-node",
        style: {
          "border-color": "#8a5a00",
          "border-style": "dashed",
          "border-width": 4
        }
      },
      {
        selector: ".family-union-node",
        style: {
          shape: "ellipse",
          width: 14,
          height: 14,
          "background-color": "#6f6254",
          "border-width": 2,
          "border-color": "#3b2f25",
          label: ""
        }
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#9b8b77",
          "target-arrow-color": "#9b8b77",
          "curve-style": "taxi",
          "taxi-direction": "downward",
          "taxi-turn": 50,
          "font-size": 10,
          color: "#6f6254"
        }
      },
      {
        selector: ".partner-edge",
        style: {
          "line-color": "#6f6254",
          width: 3,
          "target-arrow-shape": "none",
          "curve-style": "straight"
        }
      },
      {
        selector: ".child-edge",
        style: {
          "target-arrow-shape": "triangle",
          "line-color": "#9b8b77",
          "target-arrow-color": "#9b8b77"
        }
      }
    ],

    layout: {
      name: "preset",
      fit: true,
      padding: 40
    },

    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,
    autoungrabify: false
  });

  familyGraphInstance.on("tap", ".person-node", async (event) => {
    const clickedEntityId = event.target.id();

    if (!clickedEntityId) return;

    await onNodeClick(clickedEntityId);
  });

  familyGraphInstance.fit(undefined, 40);
}

export function fitCurrentGraph() {
  if (!familyGraphInstance) return;

  try {
    familyGraphInstance.fit(undefined, 40);
  } catch (error) {
    console.warn("Erro ao centralizar gráfico:", error);
  }
}

export function destroyCurrentGraph() {
  if (familyGraphInstance) {
    familyGraphInstance.destroy();
    familyGraphInstance = null;
  }
}

function addPresetPositions(elements) {
  const nodeElements = elements.filter((el) => el.group === "nodes");
  const edgeElements = elements.filter((el) => el.group === "edges");

  const personNodes = nodeElements.filter((node) => node.data.type === "person");
  const unionNodes = nodeElements.filter((node) => node.data.type === "family_union");

  const generationGroups = new Map();

  personNodes.forEach((node) => {
    const generation = Number(node.data.generation || 0);

    if (!generationGroups.has(generation)) {
      generationGroups.set(generation, []);
    }

    generationGroups.get(generation).push(node);
  });

  const generations = Array.from(generationGroups.keys()).sort((a, b) => a - b);

  const horizontalSpacing = 230;
  const verticalSpacing = 190;
  const unionYOffset = 90;

  generations.forEach((generation) => {
    const nodes = generationGroups.get(generation) || [];

    nodes.sort((a, b) => {
      if (a.data.isCenter) return -1;
      if (b.data.isCenter) return 1;
      return String(a.data.label || "").localeCompare(String(b.data.label || ""));
    });

    const centerIndex = (nodes.length - 1) / 2;

    nodes.forEach((node, index) => {
      node.position = {
        x: (index - centerIndex) * horizontalSpacing,
        y: generation * verticalSpacing
      };
    });
  });

  positionUnionNodes({
    unionNodes,
    personNodes,
    edgeElements,
    unionYOffset
  });

  positionChildrenUnderUnions({
    unionNodes,
    personNodes,
    edgeElements,
    horizontalSpacing
  });

  return [...personNodes, ...unionNodes, ...edgeElements];
}

function positionUnionNodes({ unionNodes, personNodes, unionYOffset }) {
  const personMap = buildNodeMap(personNodes);

  unionNodes.forEach((union) => {
    const partnerA = personMap.get(union.data.partnerA);
    const partnerB = personMap.get(union.data.partnerB);

    if (partnerA && partnerB) {
      union.position = {
        x: (partnerA.position.x + partnerB.position.x) / 2,
        y: Math.max(partnerA.position.y, partnerB.position.y) + unionYOffset
      };

      return;
    }

    const singlePartner = partnerA || partnerB;

    if (singlePartner) {
      union.position = {
        x: singlePartner.position.x,
        y: singlePartner.position.y + unionYOffset
      };
    }
  });
}

function positionChildrenUnderUnions({
  unionNodes,
  personNodes,
  edgeElements,
  horizontalSpacing
}) {
  const personMap = buildNodeMap(personNodes);

  unionNodes.forEach((union) => {
    if (!union.position) return;

    const childIds = edgeElements
      .filter((edge) => edge.data.kind === "child" && edge.data.source === union.data.id)
      .map((edge) => edge.data.target);

    if (!childIds.length) return;

    const childNodes = childIds
      .map((id) => personMap.get(id))
      .filter(Boolean);

    childNodes.sort((a, b) =>
      String(a.data.label || "").localeCompare(String(b.data.label || ""))
    );

    const childSpacing = Math.min(horizontalSpacing, 190);
    const offset = (childNodes.length - 1) / 2;

    childNodes.forEach((childNode, index) => {
      childNode.position = {
        x: union.position.x + (index - offset) * childSpacing,
        y: union.position.y + 120
      };
    });
  });
}

function buildNodeMap(nodes) {
  const map = new Map();

  nodes.forEach((node) => {
    map.set(node.data.id, node);
  });

  return map;
}