import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Search, RotateCcw } from "lucide-react";
import {
  PAYMENT_ICON_CATEGORIES,
  PAYMENT_ICON_COLORS,
  getPaymentIconDef,
  getEffectivePaymentIconId,
  type PaymentIconDef,
} from "../utils/paymentIcons";
import { PaymentIconGlyph } from "./PaymentIconGlyph";
import { uiSounds } from "../lib/sounds";
import type { DetailedPayment } from "../types";
import type { SelectPopoverPosition } from "./CustomSelect";

const feedback = () => {
  uiSounds.toggle();
  if (navigator.vibrate) navigator.vibrate(8);
};

// Botón que va al lado de "Descripción" para elegir un ícono representativo del pago (Netflix,
// Spotify, luz, obra social, etc.). Dos pasos dentro del mismo popover, igual que cualquier otro
// selector de la app (portal + posición calculada contra el botón):
//  1. Buscador + categorías (con flechas para desplazarse, igual que la barra de sub-secciones de
//     la app) y una grilla de íconos por categoría — todos en el color de acento por defecto.
//  2. Al tocar uno, un preview chiquito de ESE MISMO ícono en varios colores para elegir con cuál
//     queda (o "Acento" para seguir el color general de la app).
// Mientras no se elija nada a mano, se muestra (acá y en cualquier otro lado de la app) el ícono
// por defecto de la categoría del pago — nunca queda un pago sin ícono.
export function PaymentIconPicker({
  iconId,
  colorId,
  categoria,
  onChange,
}: {
  iconId?: string | null;
  colorId?: string | null;
  categoria: DetailedPayment["categoria"];
  onChange: (iconId: string | undefined, colorId: string | undefined) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(PAYMENT_ICON_CATEGORIES[0].id);
  const [pickingColorFor, setPickingColorFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const effectiveIconId = iconId || getEffectivePaymentIconId({ icono: iconId || undefined, categoria });

  const computePosition = (fixedPlacement?: "top" | "bottom"): SelectPopoverPosition | null => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 304;
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) left = window.innerWidth - popoverWidth - 8;
    if (left < 8) left = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placement = fixedPlacement || (spaceBelow < 420 && spaceAbove > spaceBelow ? "top" : "bottom");
    return placement === "top"
      ? { bottom: window.innerHeight - rect.top + 6, left, width: popoverWidth, placement: "top" }
      : { top: rect.bottom + 6, left, width: popoverWidth, placement: "bottom" };
  };

  const toggleOpen = () => {
    feedback();
    if (!isOpen) {
      setPopoverPosition(computePosition());
      setPickingColorFor(null);
      setSearch("");
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

  const scrollCategories = (direction: "left" | "right") => {
    feedback();
    const idx = PAYMENT_ICON_CATEGORIES.findIndex((c) => c.id === activeCategory);
    const nextIdx = direction === "left" ? Math.max(0, idx - 1) : Math.min(PAYMENT_ICON_CATEGORIES.length - 1, idx + 1);
    const next = PAYMENT_ICON_CATEGORIES[nextIdx];
    if (next) {
      setActiveCategory(next.id);
      const btn = categoryButtonRefs.current[next.id];
      btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  const searchQuery = search.trim().toLowerCase();
  const searchResults: PaymentIconDef[] = useMemo(() => {
    if (!searchQuery) return [];
    return PAYMENT_ICON_CATEGORIES.flatMap((c) => c.icons).filter((i) => i.label.toLowerCase().includes(searchQuery));
  }, [searchQuery]);

  const pickedDef = getPaymentIconDef(pickingColorFor);
  const visibleIcons = searchQuery ? searchResults : PAYMENT_ICON_CATEGORIES.find((c) => c.id === activeCategory)?.icons || [];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        title="Elegir ícono"
        className="shrink-0 w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-primary hover:border-primary transition-all cursor-pointer"
      >
        <PaymentIconGlyph iconId={effectiveIconId} colorId={colorId} className={`w-5 h-5 ${colorId ? "" : "text-primary"}`} />
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
                <AnimatePresence mode="wait">
                  {pickingColorFor && pickedDef ? (
                    <motion.div
                      key="colors"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.15 }}
                      className="p-3"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            feedback();
                            setPickingColorFor(null);
                          }}
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
                            <motion.button
                              key={c.id}
                              type="button"
                              title={c.label}
                              whileTap={{ scale: 0.9 }}
                              whileHover={{ scale: 1.05 }}
                              onClick={() => {
                                feedback();
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
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col"
                    >
                      <div className="p-2 pb-1 shrink-0">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-600" />
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar ícono..."
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      {!searchQuery && (
                        <div className="flex items-center gap-1 px-1.5 pb-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => scrollCategories("left")}
                            disabled={PAYMENT_ICON_CATEGORIES.findIndex((c) => c.id === activeCategory) === 0}
                            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <div
                            ref={categoryScrollRef}
                            className="flex-1 flex items-center gap-1 overflow-x-auto scroll-smooth scrollbar-none"
                            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                          >
                            {PAYMENT_ICON_CATEGORIES.map((cat) => (
                              <button
                                key={cat.id}
                                ref={(el) => {
                                  categoryButtonRefs.current[cat.id] = el;
                                }}
                                type="button"
                                onClick={() => {
                                  feedback();
                                  setActiveCategory(cat.id);
                                }}
                                className={`relative shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                                  activeCategory === cat.id
                                    ? "text-white dark:text-blue-950"
                                    : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                }`}
                              >
                                {activeCategory === cat.id && (
                                  <motion.span
                                    layoutId="paymentIconCategoryPill"
                                    className="absolute inset-0 rounded-full bg-primary -z-10"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                  />
                                )}
                                {cat.label}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => scrollCategories("right")}
                            disabled={PAYMENT_ICON_CATEGORIES.findIndex((c) => c.id === activeCategory) === PAYMENT_ICON_CATEGORIES.length - 1}
                            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-6 gap-1.5 p-2.5 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                        {!searchQuery && iconId && (
                          <motion.button
                            type="button"
                            title="Usar el de la categoría"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              feedback();
                              onChange(undefined, undefined);
                              close();
                            }}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 dark:text-zinc-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </motion.button>
                        )}
                        {visibleIcons.length === 0 ? (
                          <div className="col-span-6 py-6 text-center text-[11px] text-slate-400 dark:text-zinc-600">
                            Sin resultados
                          </div>
                        ) : (
                          visibleIcons.map((icon) => (
                            <motion.button
                              key={icon.id}
                              type="button"
                              title={icon.label}
                              whileTap={{ scale: 0.85 }}
                              whileHover={{ scale: 1.08 }}
                              onClick={() => {
                                feedback();
                                setPickingColorFor(icon.id);
                              }}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-primary hover:bg-primary/10 ${
                                iconId === icon.id ? "bg-primary/10 ring-1 ring-primary/40" : ""
                              }`}
                            >
                              <PaymentIconGlyph iconId={icon.id} className="w-4 h-4" />
                            </motion.button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

export default PaymentIconPicker;
