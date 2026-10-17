import { useEffect, useState } from "react";

/**
 * Da a cada tabla/listado su propio "momento de carga" (esqueleto -> datos) al entrar a una
 * sección, aunque los datos ya estén en memoria (Firestore ya resolvió el listado antes de que
 * el usuario llegue a esta vista). Sin esto, el usuario nunca ve la animación de fila/columna
 * que pidió para las tablas, porque técnicamente no hay un "loading" real que mostrar.
 * Se reinicia cada vez que cambia algo en `deps` (p. ej. la sub-pestaña activa), así vuelve a
 * mostrarse al navegar de nuevo a esa tabla.
 */
export function useBriefLoading(deps: React.DependencyList, delay = 550): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return loading;
}

export default useBriefLoading;
