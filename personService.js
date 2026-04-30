// personService.js

import { ensureEntity } from "./entityService.js";
import { ensureTimeSpan } from "./timeSpanService.js";
import { ensureRelation } from "./relationService.js";
import { ensureSource } from "./sourceService.js";

export async function createOrUpdatePersonFromWizard(data) {
  const name = String(data.name || "").trim();

  if (!name) {
    throw new Error("Informe o nome da pessoa.");
  }

  const person = await ensureEntity({
    type: "person",
    subtype: data.gender || "",
    name,
    summary: data.summary || "",
    tags: data.tags || ""
  });

  const birthYear = data.birth_year || "";
  const deathYear = data.death_year || "";

  const birthDateText = data.birth_date_text || "";
  const deathDateText = data.death_date_text || "";

  const hasBirth = Boolean(birthYear || birthDateText);
  const hasDeath = Boolean(deathYear || deathDateText);

  // Regra:
  // - se tem nascimento e morte, cria apenas "life"
  // - se tem só nascimento, cria "birth"
  // - se tem só morte, cria "death"
  if (hasBirth && hasDeath) {
    await ensureTimeSpan({
      entity_id: person.id,
      kind: "life",
      label: `Vida de ${person.name}`,
      start_year: birthYear,
      end_year: deathYear,
      start_approx: Boolean(data.birth_approx),
      end_approx: Boolean(data.death_approx),
      date_text: buildLifeDateText(birthDateText, deathDateText)
    });
  } else if (hasBirth) {
    await ensureTimeSpan({
      entity_id: person.id,
      kind: "birth",
      label: `Nascimento de ${person.name}`,
      start_year: birthYear,
      end_year: birthYear,
      start_approx: Boolean(data.birth_approx),
      end_approx: Boolean(data.birth_approx),
      date_text: birthDateText
    });
  } else if (hasDeath) {
    await ensureTimeSpan({
      entity_id: person.id,
      kind: "death",
      label: `Morte de ${person.name}`,
      start_year: deathYear,
      end_year: deathYear,
      start_approx: Boolean(data.death_approx),
      end_approx: Boolean(data.death_approx),
      date_text: deathDateText
    });
  }

  const birthPlace = await ensureOptionalPlace(data.birth_place_name);
  const deathPlace = await ensureOptionalPlace(data.death_place_name);

  if (birthPlace) {
    await ensureRelation({
      source_id: person.id,
      relation_type_key: "nasceu_em",
      target_id: birthPlace.id,
      notes: ""
    });
  }

  if (deathPlace) {
    await ensureRelation({
      source_id: person.id,
      relation_type_key: "morreu_em",
      target_id: deathPlace.id,
      notes: ""
    });
  }

  if (data.father_id) {
    await ensureRelation({
      source_id: person.id,
      relation_type_key: "filho_de",
      target_id: data.father_id,
      notes: ""
    });
  }

  if (data.mother_id) {
    await ensureRelation({
      source_id: person.id,
      relation_type_key: "filho_de",
      target_id: data.mother_id,
      notes: ""
    });
  }

  if (data.spouse_id) {
    await ensureRelation({
      source_id: person.id,
      relation_type_key: "conjuge_de",
      target_id: data.spouse_id,
      notes: ""
    });
  }

  if (data.citation || data.source_notes) {
    await ensureSource({
      source_type: "biblical",
      citation: data.citation || "",
      reference: person.name,
      notes: data.source_notes || "",
      related_entity_ids: person.id
    });
  }

  return person;
}

async function ensureOptionalPlace(placeName) {
  const name = String(placeName || "").trim();

  if (!name) return null;

  return ensureEntity({
    type: "place",
    subtype: "",
    name,
    summary: "",
    tags: "lugar"
  });
}

function buildLifeDateText(birthDateText, deathDateText) {
  const parts = [];

  if (birthDateText) {
    parts.push(`Nascimento: ${birthDateText}`);
  }

  if (deathDateText) {
    parts.push(`Morte: ${deathDateText}`);
  }

  return parts.join(" | ");
}