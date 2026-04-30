// eventService.js

import { ensureEntity } from "./entityService.js";
import { ensureTimeSpan } from "./timeSpanService.js";
import { ensureRelation } from "./relationService.js";
import { createSource, listSources } from "./sourceService.js";
import { normalizeText } from "./utils/text.js";

export async function createOrUpdateEventFromWizard(data) {
  const title = String(data.title || "").trim();

  if (!title) {
    throw new Error("Informe o título do acontecimento.");
  }

const eventEntity = await ensureEntity({
  type: "event",
  subtype: data.subtype || "",
  name: title,
  summary: "",
  tags: "acontecimento"
});

  const startYear = data.start_year || "";
  const endYear = data.end_year || data.start_year || "";

  if (startYear) {
    await ensureTimeSpan({
      entity_id: eventEntity.id,
      kind: "occurrence",
      label: title,
      start_year: startYear,
      end_year: endYear,
      start_approx: false,
      end_approx: false
    });
  }

  if (data.place_id) {
    await ensureRelation({
      source_id: eventEntity.id,
      relation_type_key: "ocorreu_em",
      target_id: data.place_id,
      notes: ""
    });
  }

  const participantIds = Array.isArray(data.participant_ids)
    ? data.participant_ids
    : [];

  for (const participantId of participantIds) {
    await ensureRelation({
      source_id: participantId,
      relation_type_key: "participou_de",
      target_id: eventEntity.id,
      notes: ""
    });
  }

  if (data.citation || data.notes) {
    await ensureSource({
      source_type: "biblical",
      citation: data.citation || "",
      reference: title,
      notes: data.notes || "",
      related_entity_ids: eventEntity.id
    });
  }

  return eventEntity;
}


export async function ensureSource(data) {
  const sources = await listSources();

  const existing = sources.find((source) => {
    return (
      normalizeText(source.citation) === normalizeText(data.citation) &&
      String(source.related_entity_ids || "")
        .split("|")
        .includes(data.related_entity_ids)
    );
  });

  if (existing) return existing;

  return createSource(data);
}