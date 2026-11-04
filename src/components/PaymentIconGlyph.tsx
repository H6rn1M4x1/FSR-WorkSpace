import React from "react";
import { getPaymentIconDef, PAYMENT_ICON_COLORS } from "../utils/paymentIcons";

// "accent" (o nada) no es un color propio: significa "seguí el color de acento de la app", así
// que no se guarda hex y el ícono se pinta con `currentColor`/`text-primary` como cualquier otro
// ícono de la UI — si el usuario después cambia el color de acento general, estos lo acompañan.
export function resolvePaymentIconHex(colorId?: string | null): string | undefined {
  if (!colorId || colorId === "accent") return undefined;
  return PAYMENT_ICON_COLORS.find((c) => c.id === colorId)?.hex || undefined;
}

export function PaymentIconGlyph({
  iconId,
  colorId,
  className = "w-4 h-4",
}: {
  iconId?: string | null;
  colorId?: string | null;
  className?: string;
}) {
  const def = getPaymentIconDef(iconId);
  if (!def) return null;
  const hex = resolvePaymentIconHex(colorId);
  if (def.source === "lucide") {
    const { Icon } = def;
    return <Icon className={className} style={hex ? { color: hex } : undefined} />;
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ fill: hex || "currentColor" }}>
      <path d={def.path} />
    </svg>
  );
}

export default PaymentIconGlyph;
