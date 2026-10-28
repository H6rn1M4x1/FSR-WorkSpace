import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { uiSounds } from "../lib/sounds";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

function toastColorClass(type: ToastMessage["type"]): string {
  if (type === "success") return "bg-primary text-white border-primary/80 shadow-primary/25";
  if (type === "error") return "bg-rose-600 text-white border-rose-500 shadow-rose-900/20";
  return "bg-primary/90 text-white border-primary/80 shadow-primary/20";
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Apiladas y colapsadas por defecto (solo se ve la más nueva, con un par de "fichas" detrás
  // insinuando que hay más) — se expanden al pasar el mouse o, en mobile donde no hay hover, al
  // tocar el mazo. Mismo concepto de "auto expand/collapse" de las notificaciones que pidió el
  // usuario, reimplementado acá con motion/react (ya es dependencia del proyecto) en vez de sumar
  // una librería nueva.
  const [expanded, setExpanded] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message }]);
    if (type === "error") uiSounds.error();
    else uiSounds.success();

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const visibleToasts = expanded || toasts.length <= 1 ? toasts : toasts.slice(-1);
  const hiddenCount = toasts.length - visibleToasts.length;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[99999] max-w-sm w-full px-4 pointer-events-none"
        onMouseEnter={() => toasts.length > 1 && setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div
          className="relative pointer-events-auto"
          onClick={() => toasts.length > 1 && setExpanded((v) => !v)}
        >
          {!expanded && toasts.length > 1 && (
            <>
              <div className="absolute inset-x-2 top-1.5 h-12 rounded-2xl bg-zinc-400/60 dark:bg-zinc-600/60 opacity-60 scale-[0.94] pointer-events-none" />
              {toasts.length > 2 && (
                <div className="absolute inset-x-4 top-3 h-12 rounded-2xl bg-zinc-400/40 dark:bg-zinc-600/40 opacity-40 scale-[0.88] pointer-events-none" />
              )}
            </>
          )}
          {!expanded && hiddenCount > 0 && (
            <div className="absolute -top-2 -left-2 z-10 w-5 h-5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black flex items-center justify-center shadow-md pointer-events-none">
              {hiddenCount}
            </div>
          )}
          <AnimatePresence initial={false}>
            {visibleToasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 90) dismissToast(toast.id);
                }}
                initial={{ opacity: 0, y: 24, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 480, damping: 32, mass: 0.8 }}
                className={`relative mb-2 last:mb-0 flex items-center justify-between p-3.5 rounded-2xl shadow-xl border backdrop-blur-md cursor-grab active:cursor-grabbing ${toastColorClass(toast.type)}`}
              >
                <div className="flex items-center gap-2.5 text-sm font-semibold pr-2">
                  {toast.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                  {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
                  {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}
                  <span>{toast.message}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast(toast.id);
                  }}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
};
