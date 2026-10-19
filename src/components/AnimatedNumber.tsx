import React, { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

/**
 * Cuenta de 0 (o del valor anterior) hasta `value` con una curva de desaceleración, en vez de
 * aparecer de golpe — mismo recurso que usan los dashboards de referencia para las cifras
 * principales (ingresos, totales, porcentajes). Arranca recién cuando el número entra en
 * pantalla (useInView) para no gastar la animación en algo que el usuario todavía no vio, y
 * respeta "prefers-reduced-motion" saltando directo al valor final.
 *
 * Duración y curva pensadas para que el conteo se note: easeOutExpo concentra casi todo el
 * cambio en el primer 10-20% del tiempo (el resto es una "cola" casi imperceptible), así que acá
 * se usa easeOutCubic, más gradual, y una duración más larga por default — más un pequeño delay
 * inicial (useDelay) para que el ojo llegue a enganchar el arranque del conteo en vez de verlo ya
 * a mitad de camino.
 */
export function AnimatedNumber({
  value,
  duration = 1.6,
  delay = 0.15,
  format,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
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
    const durationMs = duration * 1000;
    let raf: number;
    let start: number | null = null;

    const tick = (now: number) => {
      if (start === null) start = now;
      const elapsed = now - start;
      // El timestamp que entrega requestAnimationFrame puede, por un frame, quedar levemente
      // por detrás del momento en que se programó — sin el Math.max, ese primer "elapsed"
      // negativo hace que t (y luego eased) también se vuelvan negativos, y el número arranca de
      // golpe por debajo de cero antes de empezar a contar para arriba. Al fijar `start` recién
      // en el primer frame real (en vez de con performance.now() al armar el efecto) ese
      // desfasaje ya no puede darse.
      const t = Math.min(1, Math.max(0, elapsed / durationMs));
      // easeOutCubic: desacelera de forma pareja, no todo de golpe al principio como easeOutExpo.
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    const delayMs = Math.max(0, delay * 1000);
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, duration, delay]);

  const text = format ? format(display) : Math.round(display).toLocaleString("es-AR");

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

export default AnimatedNumber;
