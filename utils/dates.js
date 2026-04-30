// utils/dates.js

export function formatYear(year) {
  if (year === null || year === undefined || year === "") return "?";

  const y = Number(year);

  if (Number.isNaN(y)) return "?";

  if (y === 0) {
    return "ano 0 inválido";
  }

  if (y < 0) {
    return `${Math.abs(y)} a.C.`;
  }

  return `${y} d.C.`;
}

export function formatPeriod(start, end) {
  const hasStart = start !== null && start !== undefined && start !== "";
  const hasEnd = end !== null && end !== undefined && end !== "";

  if (!hasStart && !hasEnd) return "Período não informado";

  if (hasStart && hasEnd) {
    return `${formatYear(start)} → ${formatYear(end)}`;
  }

  if (hasStart && !hasEnd) {
    return `desde ${formatYear(start)}`;
  }

  if (!hasStart && hasEnd) {
    return `até ${formatYear(end)}`;
  }

  return "Período não informado";
}

// O usuário registra anos históricos:
// -1000 = 1000 a.C.
//  1    = 1 d.C.
//
// Mas Date/vis-timeline trabalha melhor com contagem astronômica,
// onde ano 0 representa 1 a.C.
// Por isso, datas a.C. precisam ser ajustadas internamente.
export function historicalYearToJsYear(year) {
  const y = Number(year);

  if (Number.isNaN(y)) return null;

  if (y < 0) return y + 1;

  return y;
}

export function yearToVisDate(year) {
  const jsYear = historicalYearToJsYear(year);

  if (jsYear === null) return null;

  const date = new Date(0);
  date.setUTCFullYear(jsYear, 0, 1);
  date.setUTCHours(0, 0, 0, 0);

  return date;
}