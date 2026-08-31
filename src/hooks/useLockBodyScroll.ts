import { useEffect } from "react";

// Global modal counter to handle nested or simultaneous modals safely
let activeModalCount = 0;

export function useLockBodyScroll(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return;

    activeModalCount++;
    if (activeModalCount === 1) {
      document.body.classList.add("overflow-hidden");
    }

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.classList.remove("overflow-hidden");
      }
    };
  }, [isLocked]);
}
