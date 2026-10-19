/**
 * Utility functions for local date formatting and calculations without timezone skew.
 */

export const getLocalDateString = (d: Date = new Date()): string => {
  const offset = d.getTimezoneOffset();
  const withOffset = new Date(d.getTime() - offset * 60 * 1000);
  return withOffset.toISOString().split("T")[0];
};

// Fecha/hora "de hoy" SIEMPRE en huso horario de Argentina (America/Argentina/Buenos_Aires,
// UTC-3 fijo, sin horario de verano) — independiente del huso del dispositivo/navegador del
// usuario, a diferencia de `new Date()` o `getLocalDateString()`. Se usa para todo lo que
// compara "hoy"/"mes actual" en Finanzas (snapshot diario de inversiones, mes en curso vs. mes
// pasado), para que no varíe si alguien abre la app desde otro huso horario.
const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

export const getArgentinaDateParts = (d: Date = new Date()): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month") - 1, day: get("day") };
};

export const getArgentinaDateString = (d: Date = new Date()): string => {
  const { year, month, day } = getArgentinaDateParts(d);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const formatLocalDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};
