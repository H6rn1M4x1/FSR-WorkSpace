import { useState, useEffect } from "react";

// Mismo corte que el breakpoint "md" de Tailwind (768px) que ya se usa en todo el layout mobile
// vs. desktop (navbar, modales, etc.) — así un componente puede elegir en JS qué estructura
// montar (no solo qué clase CSS aplicar) sin arriesgarse a un criterio distinto al del resto.
const MOBILE_QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
