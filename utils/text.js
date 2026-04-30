// utils/text.js

export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function capitalize(text) {
  const value = String(text || "");

  if (!value) return "";

  return value.charAt(0).toUpperCase() + value.slice(1);
}