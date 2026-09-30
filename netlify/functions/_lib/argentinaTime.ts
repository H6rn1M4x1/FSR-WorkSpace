// Las Netlify Functions corren siempre en huso UTC sin importar dónde esté el usuario final —
// confirmado en vivo más de una vez (ver refresh-sport-events.ts) con horarios/fechas mostrados
// varias horas adelantados. Este helper centraliza el cálculo de fecha/hora Argentina para TODAS
// las funciones que lo necesiten, usando Intl.DateTimeFormat con el nombre de zona IANA (en vez
// de un offset fijo a mano en cada archivo) — así queda explícito qué zona se pide y no depende
// de mantener "-3" sincronizado a mano en varios lugares si algún día cambiara.
const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

function argentinaParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  // Algunos motores ICU devuelven "24" para la medianoche con hour12:false en vez de "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { year: get("year"), month: get("month"), day: get("day"), hour, minute: get("minute") };
}

/** Fecha Argentina de un instante, como "YYYY-MM-DD". */
export function argentinaDateStr(d: Date): string {
  const p = argentinaParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora de reloj Argentina de un instante, como "HH:MM". */
export function argentinaTimeStr(d: Date): string {
  const p = argentinaParts(d);
  return `${p.hour}:${p.minute}`;
}

/**
 * Medianoche de "hoy" en Argentina, como el instante UTC real que le corresponde — para usar
 * como pivote de ventanas de días (ayer/hoy/mañana, etc.) sin que la función quede a merced del
 * huso en el que corra el runtime.
 */
export function argentinaTodayMidnightUtc(): Date {
  const p = argentinaParts(new Date());
  return new Date(`${p.year}-${p.month}-${p.day}T00:00:00-03:00`);
}
