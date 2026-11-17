import { useEffect } from "react";
import { useMotionValue, MotionValue } from "motion/react";

/**
 * Opacidad que baja de a poco cuando una tarjeta se acerca al borde superior o inferior de su
 * contenedor con scroll propio (`containerRef`), en vez de desaparecer de golpe. Arranca en 1
 * (visible) por default — importante: si el contenedor NO necesita scrollear porque el contenido
 * entra entero (el caso más común en listas cortas), nunca se recalcula a un valor más chico, así
 * que la tarjeta queda visible siempre. No usa useScroll/useTransform de framer-motion porque esas
 * dos, atadas a offsets "start end"/"end start", se quedan pegadas en opacidad 0 justamente cuando
 * el contenedor no tiene rango de scroll real para recorrer — rompía TODAS las listas cortas.
 */
export function useEdgeFadeOpacity(
  itemRef: React.RefObject<HTMLElement | null>,
  containerRef: React.RefObject<HTMLElement | null> | undefined,
  margin = 32
): MotionValue<number> {
  const opacity = useMotionValue(1);

  useEffect(() => {
    const container = containerRef?.current;
    const el = itemRef.current;
    if (!container || !el) return;

    const update = () => {
      const itemRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const topFactor = Math.max(0, Math.min(1, (itemRect.bottom - containerRect.top) / margin));
      const bottomFactor = Math.max(0, Math.min(1, (containerRect.bottom - itemRect.top) / margin));
      opacity.set(topFactor * bottomFactor);
    };

    update();
    container.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, margin]);

  return opacity;
}
