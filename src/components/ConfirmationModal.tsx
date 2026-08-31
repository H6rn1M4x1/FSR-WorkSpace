import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  darkMode?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onClose,
  darkMode = true,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
    } catch (error) {
      console.error("Error during deletion confirmation:", error);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop Animado Ultra Fluido */}
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => {
              if (!isDeleting) onClose();
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Animado Suave con Curva Spring Premium */}
          <motion.div
            key="confirm-card"
            initial={{ opacity: 0, scale: 0.93, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 30,
              mass: 0.7,
            }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-sm rounded-3xl border p-6 shadow-2xl transition-colors cursor-default z-10 ${
              darkMode
                ? "bg-zinc-950/95 border-zinc-800 text-white shadow-red-500/10 backdrop-blur-md"
                : "bg-white/95 border-zinc-200 text-zinc-800 shadow-slate-200 backdrop-blur-md"
            }`}
          >
            <div className="space-y-4">
              {/* Badge Atención */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold w-fit border border-red-500/20">
                <AlertTriangle className="w-4 h-4" />
                <span>Atención</span>
              </div>

              {/* Título de Confirmación */}
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                {title}
              </h3>

              {/* Mensaje Informativo */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                {message}
              </p>

              {/* Botones de Acción */}
              <div className="pt-2 flex justify-end gap-2.5 text-xs font-bold">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    if (!isDeleting) onClose();
                  }}
                  className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cancelText}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirm}
                  className="px-4 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 transition-all cursor-pointer disabled:opacity-75 flex items-center gap-2"
                >
                  {isDeleting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>{isDeleting ? "Eliminando..." : confirmText}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
export default ConfirmationModal;
