import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Pencil, Trash2 } from "lucide-react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { uiSounds } from "../lib/sounds";

type Tone = "default" | "primary" | "success" | "danger" | "warning";

const TONE_DOT: Record<Tone, string> = {
  default: "bg-zinc-400 dark:bg-zinc-500",
  primary: "bg-primary",
  success: "bg-emerald-500",
  danger: "bg-red-500",
  warning: "bg-amber-500",
};

const TONE_TEXT: Record<Tone, string> = {
  default: "text-zinc-400 dark:text-zinc-500",
  primary: "text-primary",
  success: "text-emerald-600 dark:text-emerald-400",
  danger: "text-red-500",
  warning: "text-amber-600 dark:text-amber-400",
};

const TONE_VALUE_TEXT: Record<Tone, string> = {
  default: "text-zinc-900 dark:text-white",
  primary: "text-primary",
  success: "text-emerald-600 dark:text-emerald-400",
  danger: "text-red-500",
  warning: "text-amber-600 dark:text-amber-400",
};

/**
 * Modal flotante genérico para "ver toda la información detallada" de un ítem (turno, pago,
 * examen, medicamento, comida, nota, evento, etc.) en cualquier sección de la app — reemplaza el
 * patrón viejo de desplegar la info inline dentro de la misma tarjeta (acordeón), que empujaba
 * hacia abajo todo lo que estaba debajo. Mismo componente reutilizado en Inicio (Agenda Central
 * Integrada) y en cada sección propia (Turnos, Finanzas, Académico, Salud, Comidas, Eventos) —
 * por eso el scroll de fondo, el sonido de apertura/cierre, la hoja inferior en mobile y la
 * disposición de Editar/Eliminar se resuelven todos acá adentro, en un solo lugar.
 */
export function DetailModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  status,
  statusTone = "default",
  badge,
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
  // Línea chica debajo del título (p. ej. una categoría o un ID breve).
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  // Barra de estado opcional debajo del encabezado: punto animado + texto (p. ej. "Pagado",
  // "Turno Confirmado"). Si no se pasa `status`, la barra no se dibuja.
  status?: string;
  statusTone?: Tone;
  // Chip a la derecha de la barra de estado (p. ej. una categoría: "Categoría: Modesto").
  badge?: string;
  // Acción de editar: dibuja el botón sólido (con el color de acento) en la barra inferior.
  // Cierra este modal y espera a que termine su animación de salida antes de abrir el
  // formulario, para que se vea una transición de cierre/apertura en vez de que el otro
  // aparezca de golpe encima.
  onEdit?: () => void;
  // Acción de eliminar: dibuja un botón secundario en la barra inferior. A diferencia de
  // Editar, cierra y dispara la acción al toque — lo que sigue (normalmente un
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
          // En mobile se ancla abajo (hoja que sube desde el borde inferior); desde sm hacia
          // arriba queda centrada como un diálogo normal.
          className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
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
            initial={{ opacity: 0, scale: 0.97, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 force-solid-bg shadow-2xl"
          >
            {/* Agarre decorativo de la hoja inferior — solo en mobile. */}
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/15 mx-auto mt-3 mb-1 sm:hidden shrink-0" />

            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-3 sm:pt-6 pb-4 sm:pb-5 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                  <span className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
                    <Icon className="w-5 h-5" />
                  </span>
                )}
                <div className="min-w-0">
                  {title && (
                    <h3 className="font-extrabold text-[15px] sm:text-lg text-zinc-900 dark:text-white leading-snug truncate">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-[10px] sm:text-xs font-semibold text-zinc-400 dark:text-zinc-500 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                data-no-global-sound
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {status && (
              <div className="px-5 sm:px-6 pt-4 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${TONE_DOT[statusTone]}`} />
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${TONE_DOT[statusTone]}`} />
                    </span>
                    <span className="font-bold text-zinc-700 dark:text-zinc-200 truncate">{status}</span>
                  </div>
                  {badge && (
                    <span className="font-semibold tracking-wide text-zinc-500 dark:text-zinc-400 bg-white dark:bg-white/[0.04] px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/10 shrink-0">
                      {badge}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto no-scrollbar text-xs space-y-3">
              {children}
            </div>

            {(onEdit || onDelete) && (
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5 px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-black/20 shrink-0">
                {onEdit && (
                  <button
                    type="button"
                    data-no-global-sound
                    onClick={() => {
                      onClose();
                      window.setTimeout(() => onEdit(), 220);
                      uiSounds.edit();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-[12px] font-bold transition-all cursor-pointer active:scale-[0.98] shadow-sm"
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
                    className="flex-1 sm:flex-none sm:px-5 flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl bg-white dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-red-500 text-[12px] font-bold transition-all cursor-pointer active:scale-[0.98]"
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
// ícono + etiqueta chica en mayúsculas + el valor, en una tarjeta neutra (mismo fondo para
// todos, el color queda solo en el ícono/etiqueta/valor) — así cada dato se lee como una pieza
// independiente, prolija y uniforme, en vez de una lista de pares etiqueta/valor apilados.
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
  // Color de acento del ícono/etiqueta (y del valor si `emphasis` está activo) — "success"/
  // "danger" para resaltar estados positivos/negativos (pagado vs. vencido, ganancia vs.
  // pérdida, etc.), "warning" para alertas, "primary" para lo neutro-informativo importante.
  tone?: Tone;
  // Texto del valor más grande y más pesado — para 1 o 2 bloques por modal como mucho, los datos
  // que más importa que salten a la vista (un monto, una fecha límite, un estado crítico).
  emphasis?: boolean;
  // Ocupa las dos columnas del grid en vez de una sola (para valores largos: notas, direcciones,
  // listas de ingredientes, etc.).
  span?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-3.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/20 transition-colors ${span ? "col-span-2" : ""} ${className}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className={`w-3 h-3 shrink-0 ${TONE_TEXT[tone]}`} />}
        <span className={`text-[9px] font-extrabold uppercase tracking-wider ${TONE_TEXT[tone]}`}>
          {label}
        </span>
      </div>
      <div
        className={
          emphasis
            ? `text-base font-extrabold leading-tight break-words ${TONE_VALUE_TEXT[tone]}`
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
