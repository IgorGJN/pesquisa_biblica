// seed.js

import { putRecord, getAllRecords, STORES } from "./db.js";

const DEFAULT_RELATION_TYPES = [
  {
    key: "nasceu_em",
    label: "nasceu em",
    source_types: "person",
    target_types: "place",
    allow_time: false,
    category: "vida",
    active: true
  },
  {
    key: "morreu_em",
    label: "morreu em",
    source_types: "person",
    target_types: "place",
    allow_time: false,
    category: "vida",
    active: true
  },
  {
    key: "filho_de",
    label: "filho de",
    source_types: "person",
    target_types: "person",
    allow_time: false,
    category: "familia",
    active: true
  },
  {
    key: "conjuge_de",
    label: "cônjuge de",
    source_types: "person",
    target_types: "person",
    allow_time: true,
    category: "familia",
    active: true
  },
  {
    key: "participou_de",
    label: "participou de",
    source_types: "person|people_group",
    target_types: "event",
    allow_time: false,
    category: "evento",
    active: true
  },
  {
    key: "ocorreu_em",
    label: "ocorreu em",
    source_types: "event",
    target_types: "place",
    allow_time: false,
    category: "evento",
    active: true
  },
  {
    key: "aparece_em",
    label: "aparece em",
    source_types: "person|event|place|people_group",
    target_types: "book",
    allow_time: false,
    category: "texto",
    active: true
  },
  {
    key: "registrado_em",
    label: "registrado em",
    source_types: "event",
    target_types: "book",
    allow_time: false,
    category: "texto",
    active: true
  },
  {
    key: "escreveu",
    label: "escreveu",
    source_types: "person",
    target_types: "book",
    allow_time: true,
    category: "autoria",
    active: true
  },
  {
    key: "atribuido_a",
    label: "atribuído a",
    source_types: "book|text",
    target_types: "person",
    allow_time: false,
    category: "autoria",
    active: true
  },
  {
    key: "exerceu_papel",
    label: "exerceu papel",
    source_types: "person",
    target_types: "role",
    allow_time: true,
    category: "funcao",
    active: true
  },
  {
    key: "reinou_em",
    label: "reinou em",
    source_types: "person",
    target_types: "place|people_group",
    allow_time: true,
    category: "governo",
    active: true
  },
  {
    key: "fica_em",
    label: "fica em",
    source_types: "place",
    target_types: "place",
    allow_time: false,
    category: "geografia",
    active: true
  }
];

export async function seedRelationTypes() {
  const existing = await getAllRecords(STORES.relation_types, true);
  const existingMap = new Map(existing.map((item) => [item.key, item]));

  for (const rel of DEFAULT_RELATION_TYPES) {
    const current = existingMap.get(rel.key);

    if (!current) {
      await putRecord(STORES.relation_types, rel);
    }
  }
}