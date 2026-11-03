const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const FIELD_LABELS = {
  facturaEmitida: "Factura Emitida",
  comprobantePago: "Comprobante de Pago",
} as const;

function sanitize(s: string): string {
  return (s || "").replace(/[\\/:*?"<>|]/g, "").trim();
}

/**
 * Nombre de archivo para el Comprobante de Pago / Factura Emitida de un pago: "<descripción> -
 * <categoría> - <Mes Año> (<Comprobante de Pago|Factura Emitida>)" (ej. "Ualá - Prestamos -
 * Noviembre 2026 (Comprobante de Pago)") en vez del nombre original que trae el archivo subido
 * (algo tipo "IMG_20261103.pdf", imposible de identificar después). Usado tanto por
 * FinanceView.tsx (adjuntos vía Google Drive / base64) como por PaymentsTable.tsx (vía Supabase
 * Storage).
 */
export function buildPaymentFileName(
  descripcion: string,
  categoria: string,
  fechaVencimiento: string,
  field: keyof typeof FIELD_LABELS,
  ext: string,
): string {
  const [y, m] = fechaVencimiento.split("-").map(Number);
  const mesAno = m >= 1 && m <= 12 ? `${MONTHS_ES[m - 1]} ${y}` : "";
  const parts = [sanitize(descripcion) || "Pago", sanitize(categoria), mesAno].filter(Boolean);
  const base = `${parts.join(" - ")} (${FIELD_LABELS[field]})`;
  return ext ? `${base}.${ext}` : base;
}

/** Adivina la extensión de archivo a partir del mime type de un data URL (data:<mime>;base64,...)
 * — se usa cuando no hay nombre de archivo original guardado (caso sin Google Drive). */
export function guessExtFromDataUrl(url: string): string {
  const match = /^data:[^/]+\/([a-zA-Z0-9.+-]+);/.exec(url);
  if (!match) return "";
  const sub = match[1].toLowerCase();
  if (sub === "jpeg") return "jpg";
  if (sub.includes("+")) return sub.split("+")[0];
  return sub;
}
