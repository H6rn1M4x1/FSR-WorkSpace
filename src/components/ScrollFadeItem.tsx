import React, { useRef, ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";

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
 * Mismo mecanismo que AnimatedItem (useScroll/useTransform de framer-motion atado al scroll del
 * contenedor) para que todas las listas de "agenda" de la app compartan el mismo efecto, sin
 * usar mask-image (bug de compositing ya conocido en este WebView).
 */
export function ScrollFadeItem({ containerRef, children, className, onClick, onContextMenu, title }: ScrollFadeItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    container: containerRef,
    offset: ["start end", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

  return (
    <motion.div ref={ref} className={className} style={{ opacity }} onClick={onClick} onContextMenu={onContextMenu} title={title}>
      {children}
    </motion.div>
  );
}

export default ScrollFadeItem;
