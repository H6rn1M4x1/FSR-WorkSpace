import { useEffect } from "react";

/**
 * useScrollReveal:
 * Automatically applies smooth scroll reveal entrance animations to elements as
 * they enter the viewport during scrolling across all views and dynamic sections.
 */
export function useScrollReveal(activeTab?: string, activeSubTab?: string) {
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    // Check for user preference for reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            // Unobserve once animated so it doesn't re-trigger unnecessarily
            obs.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -40px 0px",
        threshold: 0.05,
      }
    );

    // Target major cards, tables, sections, and items that have .scroll-reveal or common card classes
    const applyObserver = () => {
      const targets = document.querySelectorAll(
        ".scroll-reveal:not(.is-visible), main section:not(.is-visible), main > div > div > .glass-card:not(.is-visible), main > div > div > .bg-surface-card:not(.is-visible)"
      );
      targets.forEach((el) => {
        el.classList.add("scroll-reveal");
        observer.observe(el);
      });
    };

    // Initial run
    applyObserver();

    // Re-run after small delays to catch dynamic data fetches and tab changes
    const timer1 = setTimeout(applyObserver, 150);
    const timer2 = setTimeout(applyObserver, 500);

    // Observe DOM mutations to hook newly rendered elements smoothly
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
