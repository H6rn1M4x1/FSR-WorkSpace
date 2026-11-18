import { useRef } from "react";
import { useMotionValue, animate, type DragControls, type PanInfo } from "motion/react";

interface UseDragToCollapseOptions {
  dragControls: DragControls;
  onClose: () => void;
  offsetThreshold?: number;
  velocityThreshold?: number;
}

// Arrastrar hacia abajo para cerrar un panel que crece dentro de la cápsula de TopNavbar (menú
// expandido, Avisos, Chat, Ajustes embebido). Versión anterior: el panel se desplazaba por
// transform (drag="y") dentro de un wrapper de alto fijo que lo recortaba — pero ESE wrapper no
// tiene fondo propio, así que en cuanto el contenido se corría, el wrapper dejaba ver un hueco
// (su propio "transparente", mostrando lo que sea que haya detrás) exactamente donde el
// contenido ya no llegaba. Se veía como "dos fondos" o como si la fila de íconos de abajo
// quedara separada por un hueco — pasaba en los 4 paneles por igual porque los 4 comparten esa
// misma estructura, no por ningún bug de navegador.
//
// Acá en cambio el arrastre encoge el ALTO REAL del panel (sin ningún transform): "drag" se usa
// solo para capturar el gesto (dragElastic en 0 lo deja sin ningún movimiento visual propio),
// y el alto medido se va restando en vivo. Como no hay transform ni segunda capa, nunca hay un
// wrapper de más mostrando un hueco — lo que se ve siempre es el panel real, un poco más bajo.
// Y como la cápsula está anclada por abajo (position:fixed + la fila de íconos es lo último del
// flex-col), que ESTE panel pierda alto real no mueve ni un píxel esa fila: la cápsula entera se
// achica por arriba exactamente lo mismo que el panel, así que el borde de abajo nunca se mueve.
export function useDragToCollapse({
  dragControls,
  onClose,
  offsetThreshold = 120,
  velocityThreshold = 500,
}: UseDragToCollapseOptions) {
  const outerRef = useRef<HTMLDivElement>(null);
  const naturalHeightRef = useRef<number | null>(null);
  // Arranca en 0 (no en "auto"): la animación de entrada de AnimatePresence (initial={{height:0}}
  // → animate={{height:"auto"}}) mide el alto natural internamente y anima este mismo motion
  // value desde 0 hasta ese número — nunca necesita contener literalmente el string "auto".
  const liveHeight = useMotionValue(0);

  const handleGripPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (outerRef.current) {
      naturalHeightRef.current = outerRef.current.getBoundingClientRect().height;
    }
    dragControls.start(e);
  };

  const onDrag = (_e: unknown, info: PanInfo) => {
    if (naturalHeightRef.current == null) return;
    liveHeight.set(Math.max(0, naturalHeightRef.current - Math.max(0, info.offset.y)));
  };

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    const shouldClose = info.offset.y > offsetThreshold || info.velocity.y > velocityThreshold;
    const natural = naturalHeightRef.current;
    naturalHeightRef.current = null;
    if (shouldClose) {
      onClose();
      return;
    }
    if (natural != null) {
      animate(liveHeight, natural, { type: "spring", stiffness: 500, damping: 45 });
    }
  };

  return { outerRef, liveHeight, handleGripPointerDown, onDrag, onDragEnd };
}
