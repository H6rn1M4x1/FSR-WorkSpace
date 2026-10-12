import React from "react";

/**
 * Silueta estilizada de la provincia de San Juan, Argentina (forma simplificada, no un contorno
 * cartográfico exacto) — usada en vez de un pin de ubicación genérico para diferenciar los
 * eventos de "San Juan" de los de "Deportes" en Eventos del Día.
 */
export function SanJuanIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M10.2 1.3 13.6 1l1 2.4-1.3 2 2.8 1.2 1 2.8-1.9 1.7 2 2-1 2.8-2.7 1.6-1.3 2.9-2.4 1.6-1.9-1.4-.6-2.7-2.6-.9.7-2.6-1.8-1.7 1.9-1.8-.8-2.5 2.5-1 .3-2.4z" />
    </svg>
  );
}

export default SanJuanIcon;
