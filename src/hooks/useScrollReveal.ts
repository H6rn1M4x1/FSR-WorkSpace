import { useEffect } from "react";

/**
 * useScrollReveal:
 * Aplica la animación de entrada/salida (ver .scroll-reveal / .is-visible en index.css) a cada
 * "bloque" de la app — cualquier tarjeta marcada con la clase scroll-reveal, más las secciones y
 * tarjetas genéricas (<section>, .glass-card, .bg-surface-card) que ya traían su propio fondo.
 * A diferencia de una revelación de una sola vez, acá se alterna la clase is-visible en los DOS
 * sentidos (entra y sale de pantalla), así el bloque reaparece cada vez que se vuelve a cruzar el
 * borde del viewport en vez de quedarse fijo después de la primera vez.
 */
export function useScrollReveal(activeTab?: string, activeSubTab?: string) {
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    // Respeta la preferencia de reducir movimiento del sistema operativo — ahí ni se observan
    // los elementos, quedan siempre visibles (el CSS también tiene su propio guard por las
    // dudas de que algo llegue a marcarse is-visible por otro lado).
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -60px 0px",
        threshold: 0.08,
      }
    );

    // Elementos ya observados — evita volver a llamar observer.observe() sobre el mismo nodo del
    // DOM en cada re-escaneo (el WeakSet no retiene nada una vez que el nodo se desmonta).
    const observed = new WeakSet<Element>();

    const applyObserver = () => {
      const targets = document.querySelectorAll(
        ".scroll-reveal, main section, main > div > div > .glass-card, main > div > div > .bg-surface-card"
      );
      targets.forEach((el) => {
        el.classList.add("scroll-reveal");
        if (!observed.has(el)) {
          observed.add(el);
          observer.observe(el);
        }
      });
    };

    // Primera pasada
    applyObserver();

    // Reintentos cortos para agarrar contenido que llega después (fetch de datos, cambio de
    // pestaña) sin depender solo del MutationObserver.
    const timer1 = setTimeout(applyObserver, 150);
    const timer2 = setTimeout(applyObserver, 500);

    // Nuevos nodos que React monta después (cambiar de pestaña, abrir un acordeón, etc.) se
    // detectan acá en vez de perderse sin observar.
    const mutationObserver = new MutationObserver(() => {
      applyObserver();
    });

    const mainEl = document.querySelector("main");
    if (mainEl) {
      mutationObserver.observe(mainEl, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [activeTab, activeSubTab]);
}
