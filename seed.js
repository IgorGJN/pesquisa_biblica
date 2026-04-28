// seed.js

import { putRecord, getAllRecords, STORES } from "./db.js";

const DEFAULT_RELATION_TYPES = [
  {
    key: "filho_de",
    label: "filho de",
    inverse_label: "pai/mãe de",
    source_types: "person",
    target_types: "person",
    allow_time: false,
    category: "família",
    active: true
  },
  {
    key: "conjuge_de",
    label: "cônjuge de",
    inverse_label: "cônjuge de",
    source_types: "person",
    target_types: "person",
    allow_time: true,
    category: "família",
    active: true
  },
  {
    key: "nasceu_em",
    label: "nasceu em",
    inverse_label: "local de nascimento de",
    source_types: "person",
    target_types: "place",
    allow_time: false,
    category: "vida",
    active: true
  },
  {
    key: "morreu_em",
    label: "morreu em",
    inverse_label: "local de morte de",
    source_types: "person",
    target_types: "place",
    allow_time: false,
    category: "vida",
    active: true
  },
  {
    key: "participou_de",
    label: "participou de",
    inverse_label: "teve participação de",
    source_types: "person|people_group",
    target_types: "event",
    allow_time: false,
    category: "evento",
    active: true
  },
  {
    key: "ocorreu_em",
    label: "ocorreu em",
    inverse_label: "foi local de",
    source_types: "event",
    target_types: "place",
    allow_time: false,
    category: "evento",
    active: true
  },
  {
    key: "registrado_em",
    label: "registrado em",
    inverse_label: "registra",
    source_types: "event",
    target_types: "book",
    allow_time: false,
    category: "texto",
    active: true
  },
  {
    key: "aparece_em",
    label: "aparece em",
    inverse_label: "menciona",
    source_types: "person|event|place|people_group",
    target_types: "book",
    allow_time: false,
    category: "texto",
    active: true
  },
  {
    key: "escreveu",
    label: "escreveu",
    inverse_label: "escrito por",
    source_types: "person",
    target_types: "book",
    allow_time: true,
    category: "autoria",
    active: true
  },
  {
    key: "atribuido_a",
    label: "atribuído a",
    inverse_label: "tem autoria atribuída em",
    source_types: "book",
    target_types: "person",
    allow_time: false,
    category: "autoria",
    active: true
  },
  {
    key: "exerceu_papel",
    label: "exerceu papel",
    inverse_label: "foi papel exercido por",
    source_types: "person",
    target_types: "role",
    allow_time: true,
    category: "função",
    active: true
  },
  {
    key: "reinou_em",
    label: "reinou em",
    inverse_label: "teve como rei",
    source_types: "person",
    target_types: "place|people_group",
    allow_time: true,
    category: "governo",
    active: true
  },
  {
    key: "invadiu",
    label: "invadiu",
    inverse_label: "foi invadido por",
    source_types: "person|people_group",
    target_types: "place|people_group",
    allow_time: true,
    category: "guerra",
    active: true
  },
  {
    key: "liderou",
    label: "liderou",
    inverse_label: "foi liderado por",
    source_types: "person",
    target_types: "event|people_group",
    allow_time: true,
    category: "liderança",
    active: true
  },
  {
    key: "fica_em",
    label: "fica em",
    inverse_label: "contém",
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
    } else {
      await putRecord(STORES.relation_types, {
        ...current,
        inverse_label: current.inverse_label || rel.inverse_label,
        source_types: current.source_types || rel.source_types,
        target_types: current.target_types || rel.target_types,
        category: current.category || rel.category,
        active: current.active !== undefined ? current.active : true
      });
    }
  }
}