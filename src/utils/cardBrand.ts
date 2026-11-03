import type { CardBrand } from "../types";

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
