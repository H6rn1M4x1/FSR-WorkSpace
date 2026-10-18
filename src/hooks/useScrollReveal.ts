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
 *   vuelve a ocultar — solo se oculta un bloque cuando vuelve a quedar por DEBAJO del viewport,
 *   así la próxima vez que se baje hasta él se repite la animación.
 *
 * El IntersectionObserver es la fuente principal, pero su callback es asíncrono y puede perderse
 * o llegar con el layout todavía sin asentar justo después de cambiar de pestaña (el bloque queda
 * pegado en opacity:0 para siempre, porque antes solo lo chequeábamos una vez). Por eso cada
 * pasada de applyObserver() vuelve a verificar la visibilidad real de TODOS los bloques ya
 * conocidos, no solo de los nuevos — así cualquiera que haya quedado mal marcado se corrige solo
 * en la siguiente pasada en vez de quedar invisible para siempre.
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

    // Elementos ya suscriptos al observer — evita volver a llamar observer.observe() sobre el
    // mismo nodo del DOM en cada re-escaneo (el WeakSet no retiene nada una vez que el nodo se
    // desmonta). NO controla si se re-chequea la visibilidad: eso se hace siempre, para todos.
    const observed = new WeakSet<Element>();

    const syncVisibility = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const inViewport =
        rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
      if (inViewport) {
        el.classList.add("is-visible");
      } else if (rect.top > 0) {
        el.classList.remove("is-visible");
      }
    };

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
        syncVisibility(el);
      });
    };

    // Primera pasada
    applyObserver();

    // Reintentos periódicos durante toda la vida del hook (no solo al montar la app): cubren
    // tanto la carga inicial como cada cambio de pestaña/sub-pestaña posterior, y contenido que
    // tarda en llegar (datos async de Firestore). El costo es despreciable.
    const interval = setInterval(applyObserver, 250);

    // Nuevos nodos que React monta después (cambiar de pestaña, abrir un acordeón, etc.) se
    // detectan acá en vez de esperar al próximo tick del interval.
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
      clearInterval(interval);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [activeTab, activeSubTab]);
}
