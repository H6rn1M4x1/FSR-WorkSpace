import React from "react";
import { motion, type Variants } from "motion/react";

/**
 * Primitivas de aparición reutilizables para "activar" una sección (grilla de tarjetas, fila de
 * KPIs, imagen) cuando se monta — el mismo patrón visual en toda la app en vez de reinventarlo
 * tarjeta por tarjeta. `RevealGroup` define el escalonado (stagger) entre hijos; cada `Reveal`
 * dentro sube y aparece con opacidad, listo para envolver una tarjeta, un número o una imagen.
 */

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function RevealGroup({
  children,
  className,
  stagger = 0.06,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  as = "div",
  ...rest
}: {
  children: React.ReactNode;
  as?: "div" | "li";
} & Omit<React.ComponentProps<typeof motion.div>, "variants">) {
  const Comp = motion[as as "div"];
  return (
    <Comp variants={itemVariants} {...rest}>
      {children}
    </Comp>
  );
}

// Para un único elemento fuera de un RevealGroup (no necesita escalonado con hermanos) —
// imágenes, un bloque de texto, una tarjeta suelta.
export function RevealOnce({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
