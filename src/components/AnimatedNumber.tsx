import React, { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

/**
 * Cuenta de 0 (o del valor anterior) hasta `value` con una curva de desaceleración, en vez de
 * aparecer de golpe — mismo recurso que usan los dashboards de referencia para las cifras
 * principales (ingresos, totales, porcentajes). Arranca recién cuando el número entra en
 * pantalla (useInView) para no gastar la animación en algo que el usuario todavía no vio, y
 * respeta "prefers-reduced-motion" saltando directo al valor final.
 */
export function AnimatedNumber({
  value,
  duration = 0.8,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView) return;

    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const from = startedRef.current ? fromRef.current : 0;
    startedRef.current = true;
    const start = performance.now();
    const durationMs = duration * 1000;
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      // El timestamp que entrega requestAnimationFrame puede, por un frame, quedar levemente
      // por detrás del performance.now() tomado al armar el efecto (desfasaje de reloj del
      // propio navegador) — sin el Math.max, ese primer "elapsed" negativo hace que t (y luego
      // eased) también se vuelvan negativos, y el número arranca de golpe por debajo de cero
      // antes de empezar a contar para arriba.
      const t = Math.min(1, Math.max(0, elapsed / durationMs));
      // easeOutExpo: arranca rápido y frena suave, no es un conteo lineal mecánico.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, duration]);

  const text = format ? format(display) : Math.round(display).toLocaleString("es-AR");

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

export default AnimatedNumber;
