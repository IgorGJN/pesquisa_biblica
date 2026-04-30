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
        selector: "node",
        style: {
          shape: "round-rectangle",
          width: 140,
          height: 56,
          "background-color": "#eee7dd",
          "border-width": 2,
          "border-color": "#c8bba8",
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "text-wrap": "wrap",
          "text-max-width": 120,
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
        selector: ".female-node",
        style: {
          "border-style": "double"
        }
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#9b8b77",
          "target-arrow-color": "#9b8b77",
          "curve-style": "bezier",
          "font-size": 10,
          color: "#6f6254",
          "text-background-opacity": 1,
          "text-background-color": "#f4f1ea",
          "text-background-padding": 3
        }
      },
      {
        selector: ".parent-child-edge",
        style: {
          "target-arrow-shape": "triangle",
          label: ""
        }
      },
      {
        selector: ".spouse-edge",
        style: {
          "line-style": "dashed",
          "target-arrow-shape": "none",
          label: "cônjuge"
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

  familyGraphInstance.on("tap", "node", async (event) => {
    const clickedEntityId = event.target.id();

    if (!clickedEntityId) return;

    await onNodeClick(clickedEntityId);
  });

  familyGraphInstance.fit(undefined, 40);
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

  const generationGroups = new Map();

  nodeElements.forEach((node) => {
    const generation = Number(node.data.generation || 0);

    if (!generationGroups.has(generation)) {
      generationGroups.set(generation, []);
    }

    generationGroups.get(generation).push(node);
  });

  const generations = Array.from(generationGroups.keys()).sort((a, b) => a - b);

  generations.forEach((generation, generationIndex) => {
    const nodes = generationGroups.get(generation);

    nodes.sort((a, b) =>
      String(a.data.label || "").localeCompare(String(b.data.label || ""))
    );

    const horizontalSpacing = 190;
    const verticalSpacing = 160;

    nodes.forEach((node, index) => {
      const offset = (nodes.length - 1) / 2;

      node.position = {
        x: (index - offset) * horizontalSpacing,
        y: generationIndex * verticalSpacing
      };
    });
  });

  return [...nodeElements, ...edgeElements];
}