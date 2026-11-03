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

/**
 * Nombre de archivo para el Comprobante de Pago / Factura Emitida de un pago: "<Mes> <Año> -
 * <descripción del pago>" en vez del nombre original que trae el archivo subido (algo tipo
 * "IMG_20261103.pdf", imposible de identificar después) — así, al descargarlo más adelante, ya
 * queda claro a qué pago corresponde sin tener que abrirlo. Usado tanto por FinanceView.tsx
 * (adjuntos vía Google Drive / base64) como por PaymentsTable.tsx (vía Supabase Storage).
 */
export function buildPaymentFileName(
  fechaVencimiento: string,
  descripcion: string,
  ext: string,
): string {
  const [y, m] = fechaVencimiento.split("-").map(Number);
  const mesAno = m >= 1 && m <= 12 ? `${MONTHS_ES[m - 1]} ${y}` : "";
  const titulo = (descripcion || "Pago").replace(/[\\/:*?"<>|]/g, "").trim();
  const base = mesAno ? `${mesAno} - ${titulo}` : titulo;
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
