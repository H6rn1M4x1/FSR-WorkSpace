import type { CardBrand } from "../types";

/**
 * Detecta la marca de una tarjeta a partir de su número completo, usando los prefijos (BIN)
 * estándar de cada red. Se usa SOLO para detectar la marca en el momento de cargarla — el
 * número completo nunca se guarda, solo estos 4 últimos dígitos (ver PaymentMethodCard).
 */
export function detectCardBrand(cardNumber: string): CardBrand | null {
  const digits = (cardNumber || "").replace(/\D/g, "");
  if (!digits) return null;

  if (/^4/.test(digits)) return "visa";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) return "mastercard";
  if (/^3(0[0-5]|[68])/.test(digits)) return "diners";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  // Redes locales (Argentina) — prefijos conocidos pero no exhaustivos; si no matchean acá, el
  // usuario puede elegir la marca a mano en el selector.
  if (/^(589657|603522|6042|6043)/.test(digits)) return "cabal";
  if (/^589562/.test(digits)) return "naranja";
  return null;
}

export const CARD_BRAND_META: Record<CardBrand, { label: string; gradient: string; textColor: string }> = {
  visa: { label: "Visa", gradient: "from-[#1a1f71] to-[#2b3690]", textColor: "text-white" },
  mastercard: { label: "Mastercard", gradient: "from-[#1a1a1a] to-[#3d3d3d]", textColor: "text-white" },
  amex: { label: "American Express", gradient: "from-[#006fcf] to-[#00a3e0]", textColor: "text-white" },
  diners: { label: "Diners Club", gradient: "from-[#0079be] to-[#004a77]", textColor: "text-white" },
  discover: { label: "Discover", gradient: "from-[#e87722] to-[#f58220]", textColor: "text-white" },
  cabal: { label: "Cabal", gradient: "from-[#004b93] to-[#0072bc]", textColor: "text-white" },
  naranja: { label: "Naranja", gradient: "from-[#ff6600] to-[#ff8c3f]", textColor: "text-white" },
  otra: { label: "Otra", gradient: "from-[#52525b] to-[#71717a]", textColor: "text-white" },
};
