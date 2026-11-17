import React, { useRef, ReactNode } from "react";
import { motion } from "motion/react";
import { useEdgeFadeOpacity } from "../lib/useEdgeFadeOpacity";

interface ScrollFadeItemProps {
  containerRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  title?: string;
}

/**
 * Envoltorio genérico para tarjetas dentro de una lista con scroll propio (turnos, pagos,
 * exámenes, medicamentos, comidas, notas, etc.): a medida que la tarjeta entra o sale del
 * bloque visible de `containerRef`, su opacidad baja de a poco en vez de desaparecer de golpe.
 * Mismo mecanismo que AnimatedItem (useEdgeFadeOpacity) para que todas las listas de "agenda" de
 * la app compartan el mismo efecto, sin mask-image (bug de compositing ya conocido en este
 * WebView) y sin quedar pegado en opacidad 0 cuando la lista no necesita scrollear.
 */
export function ScrollFadeItem({ containerRef, children, className, onClick, onContextMenu, title }: ScrollFadeItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const opacity = useEdgeFadeOpacity(ref, containerRef);

  return (
    <motion.div ref={ref} className={className} style={{ opacity }} onClick={onClick} onContextMenu={onContextMenu} title={title}>
      {children}
    </motion.div>
  );
}

export default ScrollFadeItem;
