import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface SelectPopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: "top" | "bottom";
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  searchable?: boolean;
  /** Personaliza el contenido mostrado en el botón cerrado para la opción elegida — el resto
   * (búsqueda, lista desplegable) sigue usando `label` como texto plano. Opcional: si no se pasa,
   * se muestra `label` tal cual, como antes. */
  renderValue?: (option: { value: string; label: string }) => React.ReactNode;
}

// Select propio (no el <select> nativo del navegador) con el mismo estilo/animación que el resto
// de la app — popover en portal, posicionado contra el borde de la pantalla, con transición de
// framer-motion. Extraído de AcademicView.tsx (donde ya se usaba en varios formularios) para
// poder reusarlo en otros archivos sin crear una dependencia circular entre componentes.
export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "-- Seleccionar --",
  disabled = false,
  className = "",
  size = "md",
  icon,
  searchable = false,
  renderValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedOption = options.find((opt) => opt.value === value);

  const computePopoverPosition = (fixedPlacement?: "top" | "bottom"): SelectPopoverPosition | null => {
    if (!dropdownRef.current) return null;
    const rect = dropdownRef.current.getBoundingClientRect();
    const popoverWidth = rect.width;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const placement =
      fixedPlacement ||
      (spaceBelow < 180 && spaceAbove > spaceBelow ? "top" : "bottom");

    if (placement === "top") {
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

  React.useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      setPopoverPosition((currentPos) => {
        if (!currentPos) return computePopoverPosition();
        return computePopoverPosition(currentPos.placement);
      });
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, filteredOptions.length]);

  React.useEffect(() => {
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={`relative w-full text-left ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        className={`w-full flex items-center justify-between font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          size === "sm"
            ? "px-3 py-2.5 h-[42px] rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs md:text-sm font-semibold"
            : "px-3.5 py-2.5 h-[42px] rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-black dark:text-white text-xs md:text-sm focus:border-primary"
        }`}
      >
        <span className="flex items-center gap-2 truncate min-w-0 flex-1">
          {icon && (
            <span className="shrink-0 text-slate-400 dark:text-zinc-500">
              {icon}
            </span>
          )}
          <span
            data-custom-select-selected={!!selectedOption}
            className={`truncate ${selectedOption ? "font-bold text-black dark:text-white" : "text-slate-400 dark:text-zinc-500 font-normal"}`}
          >
            {selectedOption ? (renderValue ? renderValue(selectedOption) : selectedOption.label) : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${size === "sm" ? "w-3.5 h-3.5 ml-1.5" : "w-4 h-4 ml-2"}`}
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

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
                  ...(popoverPosition.top !== undefined
                    ? { top: `${popoverPosition.top}px` }
                    : {}),
                  ...(popoverPosition.bottom !== undefined
                    ? { bottom: `${popoverPosition.bottom}px` }
                    : {}),
                  left: `${popoverPosition.left}px`,
                  width: `${popoverPosition.width}px`,
                  zIndex: 99999,
                }}
                className="bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden p-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800"
              >
                {searchable && (
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none mb-1"
                  />
                )}
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400 dark:text-zinc-500 text-center">
                    No hay opciones
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                          setSearchTerm("");
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary text-white dark:text-blue-950 font-bold"
                            : "text-black dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
                        }`}
                      >
                        <span className="truncate pr-2">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default CustomSelect;
