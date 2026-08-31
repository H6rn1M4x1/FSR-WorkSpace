/**
 * Reusable utility to enable butter-smooth click-and-drag scrolling on any horizontally
 * scrollable container with the `.overflow-x-auto` class.
 *
 * Designed with elegant event delegation, automatic grab-cursor indications only when
 * content actually overflows, and click-hijacking prevention on actual drags.
 */
export function initDragToScroll() {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let activeContainer: HTMLElement | null = null;
  let hasMoved = false;

  // Set up global styles for grab/grabbing cursor affordance
  const style = document.createElement("style");
  style.id = "drag-to-scroll-styles";
  style.innerHTML = `
    .grab-scroll-enabled {
      cursor: grab !important;
    }
    .grab-scroll-enabled:active {
      cursor: grabbing !important;
    }
    /* Ensure child buttons/interactive controls still have default cursor */
    .grab-scroll-enabled button,
    .grab-scroll-enabled input,
    .grab-scroll-enabled select,
    .grab-scroll-enabled textarea,
    .grab-scroll-enabled a,
    .grab-scroll-enabled [role="button"] {
      cursor: auto;
    }
  `;
  if (!document.getElementById("drag-to-scroll-styles")) {
    document.head.appendChild(style);
  }

  // Mouseover to check if the hovered container actually overflows.
  // This dynamically adds the grab cursor only when there is horizontal content to scroll!
  window.addEventListener("mouseover", (e) => {
    const target = e.target as HTMLElement;
    const container = target.closest(".overflow-x-auto") as HTMLElement | null;
    if (container) {
      // If scrollWidth > clientWidth, there is overflow
      if (container.scrollWidth > container.clientWidth) {
        container.classList.add("grab-scroll-enabled");
      } else {
        container.classList.remove("grab-scroll-enabled");
      }
    }
  });

  // Mouse Down
  window.addEventListener("mousedown", (e) => {
    // Left-click only
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const container = target.closest(".overflow-x-auto") as HTMLElement | null;
    if (!container) return;

    // Check if container has actual horizontal overflow
    if (container.scrollWidth <= container.clientWidth) return;

    // Ignore if clicking directly on a button, input, select, textarea, or anchor link
    if (
      target.tagName === "BUTTON" ||
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "A" ||
      target.closest("button, input, select, textarea, a, [role='button']")
    ) {
      return;
    }

    isDown = true;
    activeContainer = container;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    hasMoved = false;

    // Temporarily set grabbing cursor globally during active drag
    container.classList.add("grab-scroll-enabled");
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  });

  // Mouse Move
  window.addEventListener("mousemove", (e) => {
    if (!isDown || !activeContainer) return;

    const x = e.pageX - activeContainer.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag sensitivity multiplier

    if (Math.abs(walk) > 4) {
      hasMoved = true;
      activeContainer.scrollLeft = scrollLeft - walk;
      e.preventDefault();
    }
  });

  // Mouse Up / Finish Drag
  const handleMouseUp = () => {
    if (!isDown) return;

    isDown = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    // If the user actually dragged, block any click event immediately following the drag
    if (hasMoved && activeContainer) {
      const preventClick = (clickEvent: MouseEvent) => {
        clickEvent.stopPropagation();
        clickEvent.preventDefault();
        window.removeEventListener("click", preventClick, true);
      };
      window.addEventListener("click", preventClick, true);

      // Safe fallback to cleanup in case window focus is lost or event doesn't fire
      setTimeout(() => {
        window.removeEventListener("click", preventClick, true);
      }, 50);
    }

    activeContainer = null;
    hasMoved = false;
  };

  window.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("mouseleave", handleMouseUp);
}
