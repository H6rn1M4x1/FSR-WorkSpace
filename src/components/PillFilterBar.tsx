import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

export interface PillOption<T extends string> {
  id: T;
  label: string;
}

interface PillFilterBarProps<T extends string> {
  options: PillOption<T>[];
  activeValue: T;
  onChange: (value: T) => void;
  layoutIdPrefix?: string;
  className?: string;
  resetButton?: React.ReactNode;
}

export function PillFilterBar<T extends string>({
  options,
  activeValue,
  onChange,
  layoutIdPrefix = "pillFilter",
  className = "",
  resetButton,
}: PillFilterBarProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = options.findIndex((opt) => opt.id === activeValue);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (options.length === 0) return;
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    const nextVal = options[prevIndex].id;
    onChange(nextVal);
    scrollToItem(prevIndex);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (options.length === 0) return;
    const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    const nextVal = options[nextIndex].id;
    onChange(nextVal);
    scrollToItem(nextIndex);
  };

  const scrollToItem = (index: number) => {
    if (!containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll("button");
    if (buttons[index]) {
      buttons[index].scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  };

  return (
    <div
      className={`flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-900/80 p-1 rounded-xl max-w-full relative ${className}`}
    >
      {/* Left arrow button (Mobile only) */}
      <button
        type="button"
        onClick={handlePrev}
        className="flex sm:hidden items-center justify-center p-1 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        title="Anterior filtro"
        aria-label="Anterior filtro"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Pill Container */}
      <div
        ref={containerRef}
        className="flex items-center gap-1 overflow-x-auto scroll-smooth scrollbar-none py-0.5 px-0.5 relative flex-1 min-w-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {options.map((opt) => {
          const isActive = activeValue === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                const idx = options.findIndex((o) => o.id === opt.id);
                scrollToItem(idx);
              }}
              className={`relative px-2.5 py-1 rounded-lg text-[10px] font-extrabold capitalize transition-colors cursor-pointer whitespace-nowrap shrink-0 z-10 ${
                isActive
                  ? "text-white dark:text-blue-950 font-black"
                  : "text-slate-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              }`}
            >
              {/* Sliding Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId={`${layoutIdPrefix}-activeBg`}
                  className="absolute inset-0 rounded-lg bg-primary shadow-xs -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span>{opt.label}</span>
            </button>
          );
        })}
        {resetButton}
      </div>

      {/* Right arrow button (Mobile only) */}
      <button
        type="button"
        onClick={handleNext}
        className="flex sm:hidden items-center justify-center p-1 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        title="Siguiente filtro"
        aria-label="Siguiente filtro"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
