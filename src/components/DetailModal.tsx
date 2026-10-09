import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Pencil } from "lucide-react";

/**
 * Modal flotante genérico para "ver toda la información detallada" de un ítem (turno, pago,
 * examen, medicamento, comida, nota, evento, etc.) en cualquier sección de la app — reemplaza el
 * patrón viejo de desplegar la info inline dentro de la misma tarjeta (acordeón), que empujaba
 * hacia abajo todo lo que estaba debajo. Mismo componente reutilizado en Inicio (Agenda Central
 * Integrada) y en cada sección propia (Turnos, Finanzas, Académico, Salud, Comidas, Eventos).
 */
export function DetailModal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  onEdit,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  // Título e ícono opcionales: se omiten en los tipos que ya muestran su propio título dentro
  // del contenido, para no duplicarlo.
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  // Botón de editar opcional: lo pasa el llamador cuando ese ítem tiene una acción de edición
  // directa a la que navegar.
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto no-scrollbar rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 force-solid-bg shadow-2xl p-5 space-y-2 text-xs"
          >
            <div className="flex justify-end items-center gap-1 -mt-1 -mr-1 mb-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {title && (
              <div className="flex items-center gap-2 pb-2 -mt-2 mb-1 border-b border-slate-200 dark:border-zinc-800">
                {Icon && (
                  <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                )}
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white leading-snug">
                  {title}
                </h3>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default DetailModal;
