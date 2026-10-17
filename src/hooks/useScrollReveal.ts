import { useEffect } from "react";

/**
 * useScrollReveal:
 * Aplica la animación de entrada/salida (ver .scroll-reveal / .is-visible en index.css) a cada
 * "bloque" de la app — cualquier tarjeta marcada con la clase scroll-reveal, más las secciones y
 * tarjetas genéricas (<section>, .glass-card, .bg-surface-card) que ya traían su propio fondo.
 *
 * El efecto es intencionalmente asimétrico, no una revelación de una sola vez ni un toggle
 * simétrico en los dos sentidos:
 * - Al BAJAR: el bloque aparece con la animación apenas entra en pantalla desde abajo.
 * - Al SUBIR: el bloque que ya se mostró (porque se bajó más allá de él) queda cargado, no se
 *   vuelve a ocultar — solo se oculta un bloque cuando vuelve a quedar por DEBAJO del viewport
 *   (es decir, cuando se sube lo suficiente como para "perderlo de vista hacia abajo"), así la
 *   próxima vez que se baje hasta él se repite la animación.
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
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else if (entry.boundingClientRect.top > 0) {
            // Salió por ABAJO del viewport -> se oculta, para que al volver a bajar hasta acá
            // se repita la animación.
            entry.target.classList.remove("is-visible");
          }
          // Si salió por ARRIBA (ya se pasó de largo bajando) se deja tal cual: queda visible,
          // así al subir ya está cargado y no "parpadea".
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -40px 0px",
        threshold: [0, 0.08],
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
          // Red de seguridad: si el elemento ya está dentro del viewport en el momento en que se
          // empieza a observar (carga inicial, cambio de pestaña), se marca visible de entrada en
          // vez de esperar el callback asíncrono del IntersectionObserver — evita bloques que
          // quedan pegados en opacity:0 por una carrera entre el mount de React y el observer.
          const rect = el.getBoundingClientRect();
          const alreadyInViewport =
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top < window.innerHeight &&
            rect.bottom > 0;
          if (alreadyInViewport) {
            el.classList.add("is-visible");
          }
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
