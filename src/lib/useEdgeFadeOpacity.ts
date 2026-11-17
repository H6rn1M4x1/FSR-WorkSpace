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
 *
 * La comparación siempre es tarjeta vs. SU PROPIO contenedor (nunca contra la ventana/página), así
 * que el desvanecido solo depende del scroll interno de la lista, no de dónde quedó esa lista
 * dentro de la página. Pero el recálculo necesita dispararse ante CUALQUIER scroll que pueda haber
 * movido a la tarjeta o al contenedor en la pantalla — el del propio contenedor, pero también el de
 * la página (el layout de esta app hace que la página entera scrollee, no <main> por su cuenta) —
 * por eso escucha en la fase de captura sobre window: los eventos de scroll no burbujean, pero en
 * captura sí llegan a un ancestro aunque el scroll haya ocurrido en un descendiente cualquiera.
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
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, margin]);

  return opacity;
}
