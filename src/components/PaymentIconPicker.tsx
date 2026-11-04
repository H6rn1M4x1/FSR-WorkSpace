import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ImageOff } from "lucide-react";
import { PAYMENT_ICON_CATEGORIES, PAYMENT_ICON_COLORS, getPaymentIconDef } from "../utils/paymentIcons";
import { PaymentIconGlyph } from "./PaymentIconGlyph";
import type { SelectPopoverPosition } from "./CustomSelect";

// Botón que va al lado de "Descripción" para elegir un ícono representativo del pago (Netflix,
// Spotify, luz, obra social, etc.). Dos pasos dentro del mismo popover, igual que cualquier otro
// selector de la app (portal + posición calculada contra el botón):
//  1. Grilla de íconos por categoría — todos en el color de acento por defecto.
//  2. Al tocar uno, un preview chiquito de ESE MISMO ícono en varios colores para elegir con cuál
//     queda (o "Acento" para seguir el color general de la app).
export function PaymentIconPicker({
  iconId,
  colorId,
  onChange,
}: {
  iconId?: string | null;
  colorId?: string | null;
  onChange: (iconId: string | undefined, colorId: string | undefined) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(PAYMENT_ICON_CATEGORIES[0].id);
  const [pickingColorFor, setPickingColorFor] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const computePosition = (fixedPlacement?: "top" | "bottom"): SelectPopoverPosition | null => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 288;
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) left = window.innerWidth - popoverWidth - 8;
    if (left < 8) left = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placement = fixedPlacement || (spaceBelow < 320 && spaceAbove > spaceBelow ? "top" : "bottom");
    return placement === "top"
      ? { bottom: window.innerHeight - rect.top + 6, left, width: popoverWidth, placement: "top" }
      : { top: rect.bottom + 6, left, width: popoverWidth, placement: "bottom" };
  };

  const toggleOpen = () => {
    if (!isOpen) {
      setPopoverPosition(computePosition());
      setPickingColorFor(null);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setPickingColorFor(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    const update = () => setPopoverPosition((p) => (p ? computePosition(p.placement) : computePosition()));
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pickedDef = getPaymentIconDef(pickingColorFor);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        title="Elegir ícono"
        className="shrink-0 w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-primary hover:border-primary transition-all cursor-pointer"
      >
        {iconId ? (
          <PaymentIconGlyph iconId={iconId} colorId={colorId} className="w-5 h-5" />
        ) : (
          <ImageOff className="w-4 h-4 text-slate-400 dark:text-zinc-600" />
        )}
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && popoverPosition && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, scale: 0.97, y: popoverPosition.placement === "top" ? 4 : -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: popoverPosition.placement === "top" ? 4 : -4 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed",
                  ...(popoverPosition.top !== undefined ? { top: `${popoverPosition.top}px` } : {}),
                  ...(popoverPosition.bottom !== undefined ? { bottom: `${popoverPosition.bottom}px` } : {}),
                  left: `${popoverPosition.left}px`,
                  width: `${popoverPosition.width}px`,
                  zIndex: 99999,
                }}
                className="force-solid-bg border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
              >
                {pickingColorFor && pickedDef ? (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setPickingColorFor(null)}
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 cursor-pointer"
                        title="Volver"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 truncate">
                        {pickedDef.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 px-1 pb-1">
                      {PAYMENT_ICON_COLORS.map((c) => {
                        const isSelected = (colorId || "accent") === c.id && iconId === pickingColorFor;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            title={c.label}
                            onClick={() => {
                              onChange(pickingColorFor, c.id === "accent" ? undefined : c.id);
                              close();
                            }}
                            className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-slate-50 dark:bg-zinc-950/50 border ${
                              isSelected ? "border-primary ring-2 ring-primary/30" : "border-slate-200 dark:border-zinc-800 hover:border-primary/50"
                            }`}
                          >
                            <PaymentIconGlyph
                              iconId={pickingColorFor}
                              colorId={c.id}
                              className={`w-5 h-5 ${c.hex ? "" : "text-primary"}`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 px-2 pt-2 pb-1 overflow-x-auto no-scrollbar shrink-0">
                      {PAYMENT_ICON_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategory(cat.id)}
                          className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                            activeCategory === cat.id
                              ? "bg-primary text-white dark:text-blue-950"
                              : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-6 gap-1.5 p-2.5 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                      {iconId && (
                        <button
                          type="button"
                          title="Sin ícono"
                          onClick={() => {
                            onChange(undefined, undefined);
                            close();
                          }}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 dark:text-zinc-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <ImageOff className="w-4 h-4" />
                        </button>
                      )}
                      {PAYMENT_ICON_CATEGORIES.find((c) => c.id === activeCategory)?.icons.map((icon) => (
                        <button
                          key={icon.id}
                          type="button"
                          title={icon.label}
                          onClick={() => setPickingColorFor(icon.id)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-primary hover:bg-primary/10 ${
                            iconId === icon.id ? "bg-primary/10 ring-1 ring-primary/40" : ""
                          }`}
                        >
                          <PaymentIconGlyph iconId={icon.id} className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

export default PaymentIconPicker;
