// seed.js

import { addRecord, getAllRecords, STORES } from "./db.js";

const DEFAULT_RELATION_TYPES = [
  {
    key: "nasceu_em",
    label: "nasceu em",
    source_types: "person",
    target_types: "place",
    allow_time: false,
    category: "vida"
  },
  {
    key: "morreu_em",
    label: "morreu em",
    source_types: "person",
    target_types: "place",
    allow_time: false,
    category: "vida"
  },
  {
    key: "filho_de",
    label: "filho de",
    source_types: "person",
    target_types: "person",
    allow_time: false,
    category: "familia"
  },
  {
    key: "conjuge_de",
    label: "cônjuge de",
    source_types: "person",
    target_types: "person",
    allow_time: true,
    category: "familia"
  },
  {
    key: "participou_de",
    label: "participou de",
    source_types: "person|people_group",
    target_types: "event",
    allow_time: false,
    category: "evento"
  },
  {
    key: "ocorreu_em",
    label: "ocorreu em",
    source_types: "event",
    target_types: "place",
    allow_time: false,
    category: "evento"
  },
  {
    key: "aparece_em",
    label: "aparece em",
    source_types: "person|event|place",
    target_types: "book",
    allow_time: false,
    category: "texto"
  },
  {
    key: "exerceu_papel",
    label: "exerceu papel",
    source_types: "person",
    target_types: "role",
    allow_time: true,
    category: "funcao"
  },
  {
    key: "reinou_em",
    label: "reinou em",
    source_types: "person",
    target_types: "place|people_group",
    allow_time: true,
    category: "governo"
  },
  {
    key: "fica_em",
    label: "fica em",
    source_types: "place",
    target_types: "place",
    allow_time: false,
    category: "geografia"
  }
];

export async function seedRelationTypes() {
  const existing = await getAllRecords(STORES.relation_types, true);

  if (existing.length > 0) {
    return; // já foi populado
  }

  for (const rel of DEFAULT_RELATION_TYPES) {
    await addRecord(STORES.relation_types, {
      ...rel,
      active: true
    });
  }

  console.log("Relation types seeded");
}