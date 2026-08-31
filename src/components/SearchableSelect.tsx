import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface SelectPopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: "top" | "bottom";
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const computePopoverPosition = (): SelectPopoverPosition | null => {
    if (!dropdownRef.current) return null;
    const rect = dropdownRef.current.getBoundingClientRect();
    const popoverWidth = Math.max(rect.width, 160);

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    const estimatedHeight = Math.min((filteredOptions.length || 1) * 36 + 60, 240);
    const popoverHeight = popoverRef.current?.offsetHeight || estimatedHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUpwards = spaceBelow < popoverHeight + 10 && spaceAbove > spaceBelow;

    if (shouldOpenUpwards) {
      return {
        bottom: window.innerHeight - rect.top + 4,
        left,
        width: popoverWidth,
        placement: "top",
      };
    } else {
      return {
        top: rect.bottom + 4,
        left,
        width: popoverWidth,
        placement: "bottom",
      };
    }
  };

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      const pos = computePopoverPosition();
      if (pos) setPopoverPosition(pos);
      setIsOpen(true);
      setSearchTerm("");
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const pos = computePopoverPosition();
      if (pos) setPopoverPosition(pos);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, filteredOptions.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={`w-full h-10 px-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-between cursor-pointer transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-slate-300 dark:hover:border-zinc-700"
        } ${isOpen ? "ring-2 ring-primary/50 border-primary" : ""}`}
        onClick={handleToggleOpen}
      >
        <span className={selectedOption ? "" : "text-zinc-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && popoverPosition && (
              <motion.div
                ref={popoverRef}
                initial={{
                  opacity: 0,
                  scale: 0.97,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed",
                  ...(popoverPosition.top !== undefined ? { top: `${popoverPosition.top}px` } : {}),
                  ...(popoverPosition.bottom !== undefined ? { bottom: `${popoverPosition.bottom}px` } : {}),
                  left: `${popoverPosition.left}px`,
                  width: `${popoverPosition.width}px`,
                  zIndex: 99999,
                }}
                className="bg-white dark:bg-zinc-900 force-solid-bg border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="p-2 border-b border-slate-100 dark:border-zinc-800">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary" />
                    <input
                      type="text"
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-950 force-solid-input-bg border border-slate-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-zinc-800 dark:text-zinc-200"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                
                <div className="max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => (
                      <div
                        key={opt.value}
                        className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-all border ${
                          opt.value === value
                            ? "bg-primary/10 text-primary font-bold border-primary"
                            : "text-zinc-700 dark:text-zinc-300 border-transparent hover:border-primary hover:bg-slate-50 dark:hover:bg-zinc-800"
                        }`}
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                          setSearchTerm("");
                        }}
                      >
                        {opt.label}
                        {opt.value === value && <Check className="w-3.5 h-3.5" />}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-zinc-500">
                      No se encontraron resultados
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
