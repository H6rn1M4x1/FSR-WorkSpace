import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Pencil, Trash2 } from "lucide-react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { uiSounds } from "../lib/sounds";

/**
 * Modal flotante genérico para "ver toda la información detallada" de un ítem (turno, pago,
 * examen, medicamento, comida, nota, evento, etc.) en cualquier sección de la app — reemplaza el
 * patrón viejo de desplegar la info inline dentro de la misma tarjeta (acordeón), que empujaba
 * hacia abajo todo lo que estaba debajo. Mismo componente reutilizado en Inicio (Agenda Central
 * Integrada) y en cada sección propia (Turnos, Finanzas, Académico, Salud, Comidas, Eventos) —
 * por eso el scroll de fondo, el sonido de apertura/cierre y la disposición de Editar/Eliminar se
 * resuelven todos acá adentro, en un solo lugar, en vez de repetirse en cada tabla.
 */
export function DetailModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  onEdit,
  onDelete,
  deleteLabel = "Eliminar",
  editLabel = "Editar",
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  // Título e ícono opcionales: se omiten en los tipos que ya muestran su propio título dentro
  // del contenido, para no duplicarlo.
  title?: string;
  // Línea chica debajo del título (p. ej. una categoría o un estado breve).
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  // Acción de editar: dibuja el botón "Editar" en la barra inferior. Cierra este modal y espera a
  // que termine su animación de salida antes de abrir el formulario, para que se vea una
  // transición de cierre/apertura en vez de que el otro aparezca de golpe encima.
  onEdit?: () => void;
  // Acción de eliminar: dibuja el botón "Eliminar" en la barra inferior, al lado de Editar. A
  // diferencia de Editar, cierra y dispara la acción al toque — lo que sigue (normalmente un
  // ConfirmationModal) ya trae su propia animación de entrada.
  onDelete?: () => void;
  deleteLabel?: string;
  editLabel?: string;
  children: React.ReactNode;
}) {
  // Bloquea el scroll del fondo mientras el modal está abierto (con contador global: si hay más
  // de uno abierto a la vez no se desbloquea hasta que se cierre el último).
  useLockBodyScroll(isOpen);

  // Sonido + vibración de abrir/cerrar — enganchado a la transición real de `isOpen` (no al click
  // que lo dispara) para que suene siempre, sin importar desde qué tabla o botón se abrió.
  const wasOpen = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      uiSounds.expand();
    } else if (!isOpen && wasOpen.current) {
      uiSounds.collapse();
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            // Este modal se renderiza por portal (createPortal) directamente en document.body,
            // pero React sigue burbujeando el evento sintético a través del árbol de React (no
            // del DOM real) — es decir, hacia el/los componentes padre en JSX que envuelven a
            // <DetailModal>, aunque en el DOM estén en otro lugar. Si ese padre tiene su propio
            // onClick (p. ej. una tarjeta que abre este mismo modal al hacer clic), el clic en el
            // fondo volvería a disparar ese onClick justo después de cerrar, reabriendo el modal
            // al instante. Cortamos la propagación acá para que cerrar "afuera" quede como clic
            // único, sin que vuelva a burbujear hacia esos padres.
            e.stopPropagation();
            onClose();
          }}
          onContextMenu={(e) => {
            // El clic derecho afuera también debe cerrar el modal, en vez de abrir el menú
            // contextual nativo del navegador sobre el fondo oscuro. Mismo motivo de
            // stopPropagation que el onClick de arriba.
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 force-solid-bg shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {Icon && (
                  <span className="p-2 rounded-2xl bg-primary/10 text-primary shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </span>
                )}
                <div className="min-w-0">
                  {title && (
                    <h3 className="font-extrabold text-[15px] text-zinc-900 dark:text-white leading-snug truncate">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                data-no-global-sound
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 cursor-pointer shrink-0"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 pb-5 overflow-y-auto no-scrollbar text-xs space-y-2.5">
              {children}
            </div>
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-black/20 shrink-0">
                {onEdit && (
                  <button
                    type="button"
                    data-no-global-sound
                    onClick={() => {
                      onClose();
                      window.setTimeout(() => onEdit(), 220);
                      uiSounds.edit();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold transition-all cursor-pointer active:scale-[0.97]"
                  >
                    <Pencil className="w-3.5 h-3.5" /> {editLabel}
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    data-no-global-sound
                    onClick={() => {
                      onClose();
                      onDelete();
                      uiSounds.delete();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[11px] font-bold transition-all cursor-pointer active:scale-[0.97]"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {deleteLabel}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Un "bloque" visual para un solo dato (una de las columnas de la tabla de origen): chip de
// ícono + etiqueta chica en mayúsculas + el valor, con una tarjeta propia (fondo, borde
// redondeado) en vez del viejo patrón de texto plano apilado — así cada dato se lee como una
// pieza independiente y no como una lista de pares etiqueta/valor.
export function DetailBlock({
  icon: Icon,
  label,
  children,
  tone = "default",
  emphasis = false,
  span = false,
  className = "",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  // Color de acento de la tarjeta — "primary" para lo neutro/informativo, "success"/"danger" para
  // resaltar estados positivos/negativos (pagado vs. vencido, ganancia vs. pérdida, etc.).
  tone?: "default" | "primary" | "success" | "danger" | "warning";
  // Texto del valor más grande y más pesado — para 1 o 2 bloques por modal como mucho, los datos
  // que más importa que salten a la vista (un monto, una fecha límite, un estado crítico).
  emphasis?: boolean;
  // Ocupa las dos columnas del grid en vez de una sola (para valores largos: notas, direcciones,
  // listas de ingredientes, etc.).
  span?: boolean;
  className?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-slate-50 dark:bg-white/[0.04] border-slate-200/70 dark:border-white/10",
    primary: "bg-primary/10 border-primary/20",
    success: "bg-emerald-500/10 border-emerald-500/20",
    danger: "bg-red-500/10 border-red-500/20",
    warning: "bg-amber-500/10 border-amber-500/20",
  };
  const labelToneClasses: Record<string, string> = {
    default: "text-zinc-400 dark:text-zinc-500",
    primary: "text-primary",
    success: "text-emerald-600 dark:text-emerald-400",
    danger: "text-red-500",
    warning: "text-amber-600 dark:text-amber-400",
  };
  return (
    <div
      className={`rounded-2xl border p-3 ${toneClasses[tone]} ${span ? "col-span-2" : ""} ${className}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className={`w-3 h-3 shrink-0 ${labelToneClasses[tone]}`} />}
        <span className={`text-[9px] font-extrabold uppercase tracking-wider ${labelToneClasses[tone]}`}>
          {label}
        </span>
      </div>
      <div
        className={
          emphasis
            ? "text-base font-extrabold text-zinc-900 dark:text-white leading-tight break-words"
            : "text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 leading-snug break-words"
        }
      >
        {children}
      </div>
    </div>
  );
}

// Grilla de 2 columnas para acomodar varios DetailBlock — cada bloque decide si ocupa 1 columna o
// las 2 (con `span`) según cuánto contenido tenga.
export function DetailBlockGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 gap-2.5 ${className}`}>{children}</div>;
}

export default DetailModal;
