import { useEffect } from "react";

// Global modal counter to handle nested or simultaneous modals safely
let activeModalCount = 0;
let savedScrollY = 0;

// Solo "overflow-hidden" en body alcanza para bloquear la rueda del mouse, pero no el gesto de
// touch/trackpad en mobile (Safari/Chrome siguen "rebotando" el scroll de fondo por detrás del
// modal) — el truco que sí lo bloquea en todos lados es fijar el body en su posición actual
// (position:fixed + top negativo) mientras el modal está abierto, y restaurar el scroll real al
// cerrarlo.
export function useLockBodyScroll(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return;

    activeModalCount++;
    if (activeModalCount === 1) {
      savedScrollY = window.scrollY;
      document.body.classList.add("overflow-hidden");
      document.body.style.position = "fixed";
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
    }

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.classList.remove("overflow-hidden");
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [isLocked]);
}
