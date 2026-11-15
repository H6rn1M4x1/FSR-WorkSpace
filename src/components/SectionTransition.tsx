import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { AsciiReveal } from "ascii-reveal";

interface SectionTransitionProps {
  /** Cambia cada vez que el bloque que se muestra adentro cambia (pestaña, sub-pestaña, etc). */
  transitionKey: string;
  /** Lo que se ve mientras dura la transición — debe tener aprox. el mismo tamaño que children. */
  skeleton: ReactNode;
  children: ReactNode;
  /** Cuánto se muestra el esqueleto antes de decodificar el contenido real. */
  durationMs?: number;
}

// Dispara el efecto "decode" de ascii-reveal de forma explícita (prop loading), sin depender de
// que AsciiReveal se remonte solo: eso no se notaba en los cambios de pestaña reales (se mezclaba
// con fades propios y con la lógica "lazy" de la librería). El cambio a loading=true se hace
// DURANTE el render (comparando contra un ref), no en un useEffect, para que el esqueleto ya esté
// activo en el primer pintado del bloque nuevo — si se hiciera en un efecto, se vería el contenido
// anterior un instante antes de recién ahí esconderlo.
export function SectionTransition({ transitionKey, skeleton, children, durationMs = 600 }: SectionTransitionProps) {
  const [loading, setLoading] = useState(true);
  const prevKeyRef = useRef(transitionKey);
  if (prevKeyRef.current !== transitionKey) {
    prevKeyRef.current = transitionKey;
    if (!loading) setLoading(true);
  }
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), durationMs);
    return () => clearTimeout(t);
  }, [loading, transitionKey, durationMs]);

  return (
    <AsciiReveal preset="decode" duration="fast" loading={loading}>
      {loading ? skeleton : children}
    </AsciiReveal>
  );
}

export default SectionTransition;
