import React, { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface SubNavTab {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

interface SubNavProps {
  tabs: SubNavTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  title?: string;
}

export function SubNav({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: SubNavProps) {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const scrollToButton = (buttonEl: HTMLElement | null) => {
    if (!buttonEl || !tabsContainerRef.current) return;
    const container = tabsContainerRef.current;
    const buttonLeft = buttonEl.offsetLeft;
    const buttonWidth = buttonEl.offsetWidth;
    const containerWidth = container.clientWidth;
    const maxScroll = container.scrollWidth - containerWidth;

    const currentScroll = container.scrollLeft;
    const paddingRight = 8;
    const paddingLeft = 8;

    let targetScrollLeft = currentScroll;

    // If the button's right edge is beyond or near the container's visible right edge
    if (buttonLeft + buttonWidth + paddingRight > currentScroll + containerWidth) {
      targetScrollLeft = buttonLeft + buttonWidth - containerWidth + paddingRight;
    } 
    // If the button's left edge is before or near the container's visible left edge
    else if (buttonLeft - paddingLeft < currentScroll) {
      targetScrollLeft = buttonLeft - paddingLeft;
    }

    container.scrollTo({
      left: Math.max(0, Math.min(maxScroll, targetScrollLeft)),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (activeTab && buttonRefs.current[activeTab]) {
      const timer = setTimeout(() => {
        scrollToButton(buttonRefs.current[activeTab]);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const scrollTabs = (direction: "left" | "right") => {
    if (!tabs || tabs.length === 0) return;
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    
    if (direction === "left" && currentIndex > 0) {
      const prevTab = tabs[currentIndex - 1];
      onTabChange(prevTab.id);
      scrollToButton(buttonRefs.current[prevTab.id]);
    } else if (direction === "right" && currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1];
      onTabChange(nextTab.id);
      scrollToButton(buttonRefs.current[nextTab.id]);
    } else {
      if (tabsContainerRef.current) {
        const scrollAmount = 220;
        tabsContainerRef.current.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabs.map((t) => t.id).join("-")}
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`sticky top-16 sm:top-20 z-40 w-full max-w-7xl mx-auto px-1 sm:px-2 ${className}`}
      >
        <div className="w-full p-1.5 rounded-full border backdrop-blur-md transition-all duration-300 shadow-md flex items-center justify-between gap-1.5 bg-white/80 dark:bg-zinc-900/80 border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100">
          {/* Scroll Left Arrow */}
          <button
            onClick={() => scrollTabs("left")}
            className={`p-1.5 rounded-full hover:bg-zinc-200/60 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 transition-all cursor-pointer shrink-0 ${tabs.findIndex(t => t.id === activeTab) === 0 ? "opacity-30 pointer-events-none" : ""}`}
            title="Desplazar a la izquierda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Sub-menu Pills Container */}
          <div
            ref={tabsContainerRef}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth scrollbar-none px-2 py-0.5 relative"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    buttonRefs.current[tab.id] = el;
                  }}
                  onClick={() => {
                    onTabChange(tab.id);
                    scrollToButton(buttonRefs.current[tab.id]);
                  }}
                  className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 z-10 ${
                    isActive
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  {/* Sliding Animated Active Background Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeSubTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
 
                  {Icon && (
                    <Icon
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isActive
                          ? "scale-110 text-white stroke-[2.2]"
                          : "text-slate-600 dark:text-zinc-400 stroke-[1.8]"
                      }`}
                    />
                  )}
                  <span className="font-bold">{tab.label}</span>

                  {tab.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
            {/* Compact trailing spacer for close alignment with right arrow */}
            <div className="shrink-0 w-2.5 h-2 pointer-events-none" aria-hidden="true" />
          </div>

          {/* Scroll Right Arrow */}
          <button
            onClick={() => scrollTabs("right")}
            className={`p-1.5 rounded-full hover:bg-zinc-200/60 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 transition-all cursor-pointer shrink-0 ${tabs.findIndex(t => t.id === activeTab) === tabs.length - 1 ? "opacity-30 pointer-events-none" : ""}`}
            title="Desplazar a la derecha"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
