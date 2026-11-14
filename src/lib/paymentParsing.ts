/**
 * Parseo de texto de notificaciones de pago (bancos, billeteras, exchanges). Es,
 * necesariamente, "mejor esfuerzo": cada app redacta sus notificaciones distinto y puede
 * cambiar el formato sin aviso. En vez de un parser hardcodeado por app (24+ apps, imposible de
 * mantener), se usa un motor genérico multi-idioma que busca un monto con signo de moneda y,
 * si puede, a quién/dónde se le pagó — y descarta notificaciones que son un INGRESO (alguien te
 * transfirió, cobraste algo), para no auto-registrar dinero recibido como un gasto.
 */

export interface ParsedPayment {
  amount: number;
  merchant: string | null;
}

// Frases que indican que la notificación es sobre plata que ENTRA, no que sale — si aparece
// alguna, se descarta (no es un gasto).
const INCOMING_KEYWORDS = [
  "recibiste",
  "te transfirieron",
  "te enviaron",
  "te han transferido",
  "depósito recibido",
  "deposito recibido",
  "ingreso de",
  "ingreso recibido",
  "acreditado",
  "cobraste",
  "cobro acreditado",
  "fondos recibidos",
  "you received",
  "incoming transfer",
  "deposit received",
  "payment received",
  "money received",
];

// $, ARS, US$ o USD seguido de un número con separadores de miles/decimales en cualquier
// convención (1.234,56 o 1,234.56 o 1234).
const AMOUNT_PATTERN = /(?:ARS|USD|US\$|\$)\s*([\d][\d.,]*)/i;

// El comercio o destinatario suele venir después de "en/a/de" (es) o "at/to/from" (en).
const MERCHANT_PATTERN =
  /\b(?:en|a|de|at|to|from)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.,'&\- ]{1,40})/;

/**
 * Interpreta "1.234,56" / "1,234.56" / "1234" como el monto que es. La convención (qué
 * separador es el decimal) se infiere de cuántos dígitos quedan después del último separador:
 * 1 o 2 dígitos = son centavos (separador decimal); 3 = es de miles (se descarta).
 */
export function parseAmount(raw: string): number | null {
  const cleaned = (raw || "").replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const lastSepIndex = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  let integerPart = cleaned;
  let decimalPart = "";

  if (lastSepIndex !== -1) {
    const fractionDigits = cleaned.length - lastSepIndex - 1;
    if (fractionDigits === 1 || fractionDigits === 2) {
      integerPart = cleaned.slice(0, lastSepIndex);
      decimalPart = cleaned.slice(lastSepIndex + 1);
    }
  }

  integerPart = integerPart.replace(/[.,]/g, "") || "0";
  const value = parseFloat(decimalPart ? `${integerPart}.${decimalPart}` : integerPart);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Devuelve el pago detectado, o null si la notificación no parece un pago saliente (no tiene
 * monto reconocible, o es un ingreso de dinero).
 */
export function parsePaymentNotification(
  title: string,
  text: string,
  bigText: string
): ParsedPayment | null {
  const combined = [bigText, text, title].filter(Boolean).join(" \n ");
  if (!combined.trim()) return null;

  const lower = combined.toLowerCase();
  if (INCOMING_KEYWORDS.some((kw) => lower.includes(kw))) return null;

  const amountMatch = combined.match(AMOUNT_PATTERN);
  if (!amountMatch) return null;
  const amount = parseAmount(amountMatch[1]);
  if (amount === null) return null;

  const merchantMatch = combined.match(MERCHANT_PATTERN);
  const merchant = merchantMatch ? merchantMatch[1].trim().replace(/[.,]+$/, "") : null;

  return { amount, merchant };
}
