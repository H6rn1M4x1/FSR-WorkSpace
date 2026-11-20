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

// "YYYY-MM-DD" (sin hora) se parsea a mano en vez de con `new Date(str)`: el constructor lo
// interpreta como medianoche UTC, que en husos con offset negativo (como Argentina, UTC-3) cae
// en el día anterior una vez convertido a hora local.
const toDateSafe = (input: string | number | Date): Date | null => {
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  const dateOnlyMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
};

// Formato de fecha estándar de toda la app: dd-mm-aaaa (regla de diseño — ver CLAUDE.md/pedido
// del usuario). Acepta "YYYY-MM-DD", un ISO datetime completo, un timestamp numérico o un Date.
export const formatDateAR = (input: string | number | Date | null | undefined): string => {
  if (input === null || input === undefined || input === "") return "";
  const d = toDateSafe(input);
  if (!d) return typeof input === "string" ? input : "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// Igual que formatDateAR pero agregando hora:minuto (24hs) — para timestamps donde la hora
// también importa (turnos, notificaciones, registros con hora de carga, etc.).
export const formatDateTimeAR = (input: string | number | Date | null | undefined): string => {
  if (input === null || input === undefined || input === "") return "";
  const d = toDateSafe(input);
  if (!d) return typeof input === "string" ? input : "";
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${formatDateAR(d)} ${hh}:${min}`;
};

// Alias histórico: ya devolvía dd/mm/aaaa con "/" — ahora delega en formatDateAR para que
// también respete el separador "-" de la regla de formato de fecha de toda la app.
export const formatLocalDate = (dateStr: string): string => formatDateAR(dateStr);
