import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  TextLayer,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Square,
  Loader2,
  AlertCircle,
  Highlighter,
  Underline,
  Strikethrough,
  Undo2,
  Redo2,
} from "lucide-react";
import { StudyPlanTreeAnnotation, StudyPlanTreeAnnotationType, StudyPlanTreeUnderlineStyle } from "../types";
import { uiSounds } from "../lib/sounds";

// El worker de pdf.js corre el parseo pesado fuera del hilo principal — `new URL(..., import.meta.url)`
// es el patrón que documenta Vite para empaquetar un archivo de un paquete instalado como asset y
// resolver su URL final en build, sin depender de los tipos ambientales de "vite/client" (que este
// proyecto no tiene configurados) ni de un import con sufijo "?url".
GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

// `baseline`/`ascent` (mismas unidades que `y`/`height`, normalizadas 0-1): línea base real y
// ascent medidos del font del texto seleccionado — ver `measureSpanFontMetrics`. Quedan `undefined`
// en un recuadro dibujado a mano (no hay texto del que medir nada).
type NormRect = { x: number; y: number; width: number; height: number; baseline?: number; ascent?: number };

const COLOR_PALETTE: { name: string; value: string }[] = [
  { name: "Amarillo", value: "#facc15" },
  { name: "Verde", value: "#4ade80" },
  { name: "Celeste", value: "#38bdf8" },
  { name: "Rosa", value: "#f472b6" },
  { name: "Naranja", value: "#fb923c" },
  { name: "Violeta", value: "#a78bfa" },
  { name: "Rojo", value: "#f87171" },
];

const UNDERLINE_STYLES: { value: StudyPlanTreeUnderlineStyle; label: string }[] = [
  { value: "solid", label: "Sólido" },
  { value: "dashed", label: "Discontinuo" },
  { value: "dotted", label: "Punteado" },
  { value: "double", label: "Doble" },
];

const TOOLS: { type: StudyPlanTreeAnnotationType; label: string; icon: typeof Highlighter }[] = [
  { type: "highlight", label: "Resaltar", icon: Highlighter },
  { type: "underline", label: "Subrayar", icon: Underline },
  { type: "strikethrough", label: "Tachar", icon: Strikethrough },
];

// Mismos paths que los íconos de lucide-react de arriba (Highlighter/Underline/Strikethrough),
// copiados acá para poder incrustarlos en un cursor SVG propio — el cursor nativo del sistema no
// puede referenciar un componente de React, necesita un data URI con el SVG ya armado.
const TOOL_CURSOR_PATHS: Record<StudyPlanTreeAnnotationType, string> = {
  highlight: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/>',
  strikethrough: '<path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/>',
};

// Cursor del mouse con el ícono de la herramienta activa (y su color elegido), para que quede
// claro qué se está por hacer sin tener que mirar la barra de herramientas. Sin ninguna forma de
// fondo (ni círculo ni cuadrado) — fondo 100% transparente, el ícono se dibuja dos veces, una
// como halo blanco grueso y semitransparente por detrás y otra con su color real encima, así
// queda legible sobre cualquier color de página (clara u oscura) sin necesitar un relleno sólido.
function toolCursor(type: StudyPlanTreeAnnotationType, color: string): string {
  const path = TOOL_CURSOR_PATHS[type];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'>` +
    `<g transform='translate(3,3)' fill='none' stroke-linecap='round' stroke-linejoin='round'>` +
    `<g stroke='white' stroke-opacity='0.9' stroke-width='4.5'>${path}</g>` +
    `<g stroke='${color}' stroke-width='2.1'>${path}</g>` +
    `</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 15 15, text`;
}

function rectToStyle(r: NormRect, containerWidth: number, containerHeight: number): React.CSSProperties {
  return {
    left: r.x * containerWidth,
    top: r.y * containerHeight,
    width: r.width * containerWidth,
    height: r.height * containerHeight,
  };
}

function newAnnotationId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

let measureCtx: CanvasRenderingContext2D | null = null;
const fontMetricsCache = new Map<string, { ascentPx: number; descentPx: number }>();

// Ascent/descent REALES (en px) del font que pdf.js le puso a este span puntual — vía el Canvas 2D
// TextMetrics del mismo font-size/family, no una fracción adivinada de la caja. Cacheado por
// string de font: dentro de una misma selección, decenas de spans suelen compartir exactamente el
// mismo font/tamaño.
function measureSpanFontMetrics(span: HTMLElement): { ascentPx: number; descentPx: number } {
  const computed = window.getComputedStyle(span);
  const fontKey = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
  const cached = fontMetricsCache.get(fontKey);
  if (cached) return cached;
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  let result: { ascentPx: number; descentPx: number };
  if (measureCtx) {
    measureCtx.font = fontKey;
    const m = measureCtx.measureText("Mgjpqy");
    const sizePx = parseFloat(computed.fontSize) || 12;
    result = {
      ascentPx: m.fontBoundingBoxAscent || sizePx * 0.8,
      descentPx: m.fontBoundingBoxDescent || sizePx * 0.2,
    };
  } else {
    const sizePx = parseFloat(computed.fontSize) || 12;
    result = { ascentPx: sizePx * 0.8, descentPx: sizePx * 0.2 };
  }
  fontMetricsCache.set(fontKey, result);
  return result;
}

type RawRect = { rect: DOMRect; ascentPx: number };

// Devuelve, para una selección de texto (Range) dentro de la capa de texto de pdf.js, los rects
// "crudos" de cada span que la selección toca (recortados con un sub-rango al tramo exacto
// seleccionado DENTRO de ese span, en vez de pedirle los rects directo a `range` con
// `getClientRects()`: como pdf.js posiciona cada span de texto en absoluto —no en flujo normal—,
// un Range que cruza VARIOS spans a veces devuelve menos rects de los que hacen falta), junto con
// el ascent real medido de CADA span (para ubicar después el subrayado/tachado en su línea base
// real, no en una fracción adivinada de una caja que puede incluir interlineado de más).
function getRawRectsForRange(range: Range, textLayerEl: HTMLElement): RawRect[] {
  const spans = Array.from(textLayerEl.querySelectorAll("span"));
  const raw: RawRect[] = [];
  for (const span of spans) {
    const textNode = span.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !textNode.textContent) continue;
    if (!range.intersectsNode(span)) continue;
    try {
      const sub = document.createRange();
      sub.selectNodeContents(textNode);
      if (range.compareBoundaryPoints(Range.START_TO_START, sub) > 0) {
        sub.setStart(range.startContainer, range.startOffset);
      }
      if (range.compareBoundaryPoints(Range.END_TO_END, sub) < 0) {
        sub.setEnd(range.endContainer, range.endOffset);
      }
      if (sub.collapsed) continue;
      const { ascentPx } = measureSpanFontMetrics(span);
      for (const rect of Array.from(sub.getClientRects())) {
        if (rect.width > 0 && rect.height > 0) raw.push({ rect, ascentPx });
      }
    } catch {
      // Un span cuya posición relativa al range no se puede acotar así (caso borde) se saltea —
      // mejor perder una marca puntual que romper toda la captura.
    }
  }
  return raw;
}

type MergedLine = { top: number; bottom: number; left: number; right: number; baselinePx: number; ascentPx: number };

// Agrupa rects por línea visual (mismo "top" aproximado) en un único rectángulo de punta a punta
// por línea — varios rects angostos/superpuestos de una misma línea se ven como una marca prolija
// en vez de manchada. De paso calcula la línea base real de la línea (top del span más "alto" de
// esa línea + su ascent medido).
function mergeRectsByLine(rawRects: RawRect[]): MergedLine[] {
  const lines: MergedLine[] = [];
  for (const { rect: r, ascentPx } of rawRects) {
    const line = lines.find((l) => Math.abs(l.top - r.top) < 3);
    if (line) {
      line.left = Math.min(line.left, r.left);
      line.right = Math.max(line.right, r.right);
      if (r.top <= line.top) {
        line.baselinePx = r.top + ascentPx;
        line.ascentPx = ascentPx;
      }
      line.top = Math.min(line.top, r.top);
      line.bottom = Math.max(line.bottom, r.bottom);
    } else {
      lines.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, baselinePx: r.top + ascentPx, ascentPx });
    }
  }
  return lines;
}

// Texto seleccionable invisible superpuesto al canvas (pdf.js dibuja los glifos en el canvas; esta
// capa solo necesita estar ahí para que el navegador pueda seleccionar texto) — sin la estructura
// completa del visor oficial de pdf.js (ese trae chrome que acá no se usa, este componente arma su
// propia interfaz), PERO las reglas de abajo (--font-height/--scale-x/--text-scale-factor y cómo
// se consumen) SÍ son una copia fiel de las de pdf.js (web/pdf_viewer.css, regla ".textLayer"):
// el propio JS de `TextLayer` pone esas variables como custom properties inline en cada span
// esperando que ALGUNA hoja de estilos las consuma así — sin esto, el font-size y el escalado
// horizontal de cada span quedan en un `calc()` inválido y el texto se renderiza con un tamaño/
// ancho que no corresponde al zoom real (se detectó porque una selección de texto terminaba
// desbordando bien afuera de su línea).
const TEXT_LAYER_STYLE = `
.fsr-pdf-text-layer {
  position: absolute; inset: 0; overflow: hidden; line-height: 1; opacity: 1; cursor: text;
  --min-font-size: 1;
  --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
  --min-font-size-inv: calc(1 / var(--min-font-size));
}
/* Sin cursor propio: así el cursor dinámico (ícono de la herramienta activa) que se pone inline
   en el contenedor .fsr-pdf-text-layer se hereda también sobre los spans, en vez de que cada span
   lo tape con su propio "cursor: text" fijo. */
.fsr-pdf-text-layer span, .fsr-pdf-text-layer br { color: transparent; position: absolute; white-space: pre; transform-origin: 0% 0%; }
.fsr-pdf-text-layer > span {
  --font-height: 0;
  font-size: calc(var(--text-scale-factor) * var(--font-height));
  --scale-x: 1;
  --rotate: 0deg;
  transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
}
.fsr-pdf-text-layer ::selection { background: rgba(var(--color-primary-rgb, 26, 115, 232), 0.35); }
`;

function AnnotationMarks({
  annotations,
  containerWidth,
  containerHeight,
  removable,
  onRemove,
}: {
  annotations: StudyPlanTreeAnnotation[];
  containerWidth: number;
  containerHeight: number;
  removable?: boolean;
  onRemove?: (id: string) => void;
}) {
  return (
    <>
      {annotations.map((ann) =>
        ann.rects.map((r, i) => {
          const style = rectToStyle(r, containerWidth, containerHeight);
          const h = (style.height as number) || 0;
          const common: React.CSSProperties = removable ? { cursor: "pointer" } : { pointerEvents: "none" };
          const key = `${ann.id}-${i}`;
          const handleClick = removable ? () => onRemove?.(ann.id) : undefined;
          if (ann.type === "highlight") {
            return (
              <div
                key={key}
                data-mark-id={ann.id}
                data-mark-type={ann.type}
                title={removable ? "Clic para quitar esta marca" : undefined}
                onClick={handleClick}
                className="absolute rounded-sm"
                style={{ ...style, ...common, backgroundColor: ann.color, opacity: 0.38 }}
              />
            );
          }
          // Línea base real del texto (ya medida al marcar) si está disponible; para un recuadro
          // dibujado a mano (sin `baseline`) se aproxima con una fracción fija de la caja, lo
          // mejor que se puede hacer sin texto del que medir nada.
          const baselinePx = r.baseline != null ? r.baseline * containerHeight : (style.top as number) + h * 0.85;
          const ascentPx = r.ascent != null ? r.ascent * containerHeight : h * 0.7;
          if (ann.type === "underline") {
            const thickness = Math.max(1.5, ascentPx * 0.07);
            return (
              <div
                key={key}
                data-mark-id={ann.id}
                data-mark-type={ann.type}
                title={removable ? "Clic para quitar esta marca" : undefined}
                onClick={handleClick}
                className="absolute"
                style={{
                  ...common,
                  left: style.left,
                  width: style.width,
                  top: baselinePx,
                  height: Math.max(thickness, 2),
                  borderBottom: `${thickness}px ${ann.underlineStyle || "solid"} ${ann.color}`,
                }}
              />
            );
          }
          // strikethrough: cruza por donde suele estar el cuerpo de las minúsculas (más o menos
          // a un tercio del ascent por encima de la línea base), no por el medio de toda la caja
          // (que incluye el espacio de las mayúsculas/ascendentes y el interlineado de pdf.js).
          const thickness = Math.max(1.5, ascentPx * 0.07);
          const strikeTop = baselinePx - ascentPx * 0.33;
          return (
            <div
              key={key}
              data-mark-id={ann.id}
              data-mark-type={ann.type}
              title={removable ? "Clic para quitar esta marca" : undefined}
              onClick={handleClick}
              className="absolute"
              style={{
                ...common,
                left: style.left,
                width: style.width,
                top: strikeTop - thickness / 2,
                height: thickness,
                backgroundColor: ann.color,
              }}
            />
          );
        }),
      )}
    </>
  );
}

export function PdfHighlightViewer({
  fileId,
  accessToken,
  darkMode,
  mode,
  annotations,
  onSave,
  onSkip,
}: {
  fileId: string;
  accessToken: string | null;
  darkMode: boolean;
  // "view": solo muestra el archivo con sus marcas guardadas (si tiene). "select": deja crear
  // marcas nuevas (una o varias, de los 3 tipos) y confirmarlas con `onSave`, o saltear con `onSkip`.
  mode: "view" | "select";
  annotations?: StudyPlanTreeAnnotation[];
  onSave?: (annotations: StudyPlanTreeAnnotation[]) => void;
  onSkip?: () => void;
}) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(() =>
    annotations && annotations.length > 0 ? Math.min(...annotations.map((a) => a.page)) : 1,
  );
  const [scale, setScale] = useState(1.1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [drawMode, setDrawMode] = useState(false);
  const [drawingRect, setDrawingRect] = useState<NormRect | null>(null);
  // Si se abre en modo "select" para EDITAR un adjunto que ya tenía marcas (clic derecho →
  // "Resaltar una parte" sobre uno existente), arranca con esas precargadas en vez de vacío — así
  // se pueden agregar o sacar marcas sin perder las que ya había.
  const [pendingAnnotations, setPendingAnnotations] = useState<StudyPlanTreeAnnotation[]>(() =>
    annotations ? [...annotations] : [],
  );
  // Deshacer/rehacer de los cambios a `pendingAnnotations` dentro de esta sesión de marcado (se
  // pierde al cerrar el visor, como el resto del estado "select" no guardado) — cada agregado o
  // quitado de marca empuja el estado ANTERIOR acá antes de aplicarse.
  const [past, setPast] = useState<StudyPlanTreeAnnotation[][]>([]);
  const [future, setFuture] = useState<StudyPlanTreeAnnotation[][]>([]);
  const [activeTool, setActiveTool] = useState<{
    type: StudyPlanTreeAnnotationType;
    color: string;
    underlineStyle: StudyPlanTreeUnderlineStyle;
  }>({ type: "highlight", color: COLOR_PALETTE[0].value, underlineStyle: "solid" });
  const [openPopover, setOpenPopover] = useState<StudyPlanTreeAnnotationType | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);

  // Descarga el PDF una sola vez (bytes crudos, no base64 — acá no hace falta mandárselo a nadie,
  // pdf.js lo lee directo desde el ArrayBuffer).
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`No se pudo descargar el archivo (${res.status}).`);
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        const doc = await getDocument({ data: buffer }).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "No se pudo abrir el PDF.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileId, accessToken]);

  // Renderiza la página actual (canvas) + su capa de texto seleccionable, cada vez que cambia la
  // página o el zoom.
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    (async () => {
      const safePage = Math.min(Math.max(1, currentPage), pdfDoc.numPages);
      const page = await pdfDoc.getPage(safePage);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setCanvasSize({ width: viewport.width, height: viewport.height });
      // Pasar `canvas` y `canvasContext` a la vez no es válido en pdf.js v6 (la propia doc del
      // tipo dice que si se usa `canvasContext`, `canvas` debe ir en null) — con los dos puestos
      // no tira error pero no dibuja nada, dejando el canvas transparente. Solo `canvas`.
      await page.render({ canvas, viewport }).promise;
      if (cancelled || !textLayerRef.current) return;
      textLayerRef.current.innerHTML = "";
      const textContent = await page.getTextContent();
      if (cancelled || !textLayerRef.current) return;
      const textLayer = new TextLayer({ textContentSource: textContent, container: textLayerRef.current, viewport });
      await textLayer.render();
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, scale]);

  // Modo "view": si hay marcas guardadas, arranca en la página de la primera (ya lo hace el
  // useState inicial) — esto cubre el caso de volver a abrir el mismo visor con otro adjunto
  // distinto sin remontar el componente.
  useEffect(() => {
    if (mode === "view" && annotations && annotations.length > 0) {
      setCurrentPage(Math.min(...annotations.map((a) => a.page)));
    }
  }, [mode, annotations]);

  const goToPage = (p: number) => {
    uiSounds.navigate();
    setCurrentPage(Math.min(Math.max(1, p), numPages || 1));
    setDrawingRect(null);
    window.getSelection()?.removeAllRanges();
  };

  // Registra el estado ANTES de un cambio en el historial de deshacer, y vacía "rehacer" (un
  // cambio nuevo invalida cualquier camino de rehacer que hubiera quedado de un deshacer previo).
  const pushHistory = () => {
    setPast((p) => [...p, pendingAnnotations]);
    setFuture([]);
  };

  const addPendingAnnotation = (rects: NormRect[], text?: string) => {
    uiSounds.click();
    pushHistory();
    setPendingAnnotations((prev) => [
      ...prev,
      {
        id: newAnnotationId(),
        type: activeTool.type,
        color: activeTool.color,
        underlineStyle: activeTool.type === "underline" ? activeTool.underlineStyle : undefined,
        page: currentPage,
        rects,
        text: text || undefined,
      },
    ]);
  };

  const removePendingAnnotation = (id: string) => {
    uiSounds.click();
    pushHistory();
    setPendingAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    uiSounds.click();
    const prevState = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, pendingAnnotations]);
    setPendingAnnotations(prevState);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    uiSounds.click();
    const nextState = future[future.length - 1];
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, pendingAnnotations]);
    setPendingAnnotations(nextState);
  };

  const handleTextSelectionEnd = () => {
    if (mode !== "select" || drawMode) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textLayerRef.current || !pageContainerRef.current) return;
    const range = selection.getRangeAt(0);
    if (!textLayerRef.current.contains(range.commonAncestorContainer)) return;
    const rawRects = getRawRectsForRange(range, textLayerRef.current);
    if (rawRects.length === 0) return;
    const lines = mergeRectsByLine(rawRects);
    const containerRect = pageContainerRef.current.getBoundingClientRect();
    const rects: NormRect[] = lines.map((l) => ({
      x: (l.left - containerRect.left) / containerRect.width,
      y: (l.top - containerRect.top) / containerRect.height,
      width: (l.right - l.left) / containerRect.width,
      height: (l.bottom - l.top) / containerRect.height,
      baseline: (l.baselinePx - containerRect.top) / containerRect.height,
      ascent: l.ascentPx / containerRect.height,
    }));
    const text = selection.toString().trim();
    selection.removeAllRanges();
    addPendingAnnotation(rects, text);
  };

  const toNormPoint = (e: React.MouseEvent) => {
    const containerRect = pageContainerRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - containerRect.left) / containerRect.width,
      y: (e.clientY - containerRect.top) / containerRect.height,
    };
  };

  const handleDrawStart = (e: React.MouseEvent) => {
    if (!pageContainerRef.current) return;
    const p = toNormPoint(e);
    drawStartRef.current = p;
    setDrawingRect({ x: p.x, y: p.y, width: 0, height: 0 });
  };

  const handleDrawMove = (e: React.MouseEvent) => {
    if (!drawStartRef.current || !pageContainerRef.current) return;
    const p = toNormPoint(e);
    const start = drawStartRef.current;
    setDrawingRect({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      width: Math.abs(p.x - start.x),
      height: Math.abs(p.y - start.y),
    });
  };

  const handleDrawEnd = () => {
    if (drawingRect && drawingRect.width > 0.01 && drawingRect.height > 0.01) {
      addPendingAnnotation([drawingRect]);
    }
    drawStartRef.current = null;
    setDrawingRect(null);
  };

  const handleSaveAnnotations = () => {
    if (pendingAnnotations.length === 0) return;
    uiSounds.success();
    onSave?.(pendingAnnotations);
  };

  const handleToolClick = (type: StudyPlanTreeAnnotationType) => {
    setActiveTool((t) => ({ ...t, type }));
    setOpenPopover((p) => (p === type ? null : type));
  };

  const visibleAnnotations: StudyPlanTreeAnnotation[] = useMemo(() => {
    if (mode === "select") return pendingAnnotations.filter((a) => a.page === currentPage);
    if (mode === "view" && annotations) return annotations.filter((a) => a.page === currentPage);
    return [];
  }, [mode, pendingAnnotations, annotations, currentPage]);

  // Solo tiene sentido mostrar "qué se va a marcar" mientras se puede marcar algo con un clic de
  // texto — en modo dibujo ya hay un cursor de cruz propio (más claro para esa acción puntual), y
  // en modo "view" no hay ninguna herramienta activa.
  const textLayerCursor = useMemo(() => {
    if (mode !== "select" || drawMode) return undefined;
    return toolCursor(activeTool.type, activeTool.color);
  }, [mode, drawMode, activeTool.type, activeTool.color]);

  const btnClass = `p-1.5 rounded-full transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
    darkMode ? "text-zinc-300 hover:bg-zinc-700" : "text-zinc-600 hover:bg-zinc-200"
  }`;

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <style>{TEXT_LAYER_STYLE}</style>

      {/* Fila 1: navegación de páginas + modo recuadro + zoom */}
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border-b shrink-0 ${
          darkMode ? "border-zinc-800" : "border-zinc-150"
        }`}
      >
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Página anterior"
            className={btnClass}
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className={`text-[10px] font-bold px-1 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
            Página {currentPage} de {numPages || "…"}
          </span>
          <button
            type="button"
            title="Página siguiente"
            className={btnClass}
            disabled={currentPage >= numPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          {mode === "select" && (
            <button
              type="button"
              title="Dibujar un recuadro (para marcar algo sin texto, como una imagen)"
              onClick={() => {
                setDrawMode((v) => !v);
                setOpenPopover(null);
              }}
              className={`${btnClass} ${drawMode ? "bg-primary text-white dark:text-black" : ""}`}
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" className={btnClass} onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}>
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={btnClass} onClick={() => setScale((s) => Math.min(3, s + 0.15))}>
            <Plus className="w-3.5 h-3.5" />
          </button>
          {mode === "select" && (
            <>
              <span className={`w-px h-4 mx-0.5 ${darkMode ? "bg-zinc-700" : "bg-zinc-200"}`} />
              <button
                type="button"
                title="Deshacer"
                disabled={past.length === 0}
                onClick={handleUndo}
                className={btnClass}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Rehacer"
                disabled={future.length === 0}
                onClick={handleRedo}
                className={btnClass}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fila 2: selector de herramienta de marcado (resaltar / subrayar / tachar), con popover de
          color (y estilo, para subrayar) — solo en modo "select". */}
      {mode === "select" && (
        <div className={`border-b shrink-0 ${darkMode ? "border-zinc-800" : "border-zinc-150"}`}>
          <div className="flex items-center gap-1 px-2.5 py-1.5">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const active = activeTool.type === tool.type;
              return (
                <button
                  key={tool.type}
                  type="button"
                  onClick={() => handleToolClick(tool.type)}
                  title={tool.label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-primary/15 text-primary"
                      : darkMode
                        ? "text-zinc-400 hover:bg-zinc-800"
                        : "text-zinc-500 hover:bg-zinc-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tool.label}</span>
                  {active && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                      style={{ backgroundColor: activeTool.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {openPopover && (
            <div
              className={`flex items-center gap-3 px-2.5 py-2 border-t flex-wrap ${
                darkMode ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-150 bg-slate-50"
              }`}
            >
              {openPopover === "underline" && (
                <div className="flex items-center gap-1">
                  {UNDERLINE_STYLES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setActiveTool((t) => ({ ...t, underlineStyle: s.value }))}
                      className={`px-2 py-1 rounded-md text-[9px] font-bold cursor-pointer transition-all ${
                        activeTool.underlineStyle === s.value
                          ? "bg-primary text-white dark:text-black"
                          : darkMode
                            ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => {
                      setActiveTool((t) => ({ ...t, color: c.value }));
                      setOpenPopover(null);
                    }}
                    className="w-5 h-5 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.value,
                      outline: activeTool.color === c.value ? `2px solid ${darkMode ? "#fff" : "#18181b"}` : "none",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Página */}
      <div className={`flex-1 min-h-0 overflow-auto flex items-start justify-center p-4 ${darkMode ? "bg-zinc-950" : "bg-zinc-200"}`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <p className="text-xs text-red-500 font-semibold">{error}</p>
          </div>
        ) : (
          <div
            ref={pageContainerRef}
            className="relative shadow-lg shrink-0"
            // pdf.js calcula el font-size (y otras medidas) de cada span de texto con
            // `calc(Npx * var(--total-scale-factor))` — esa variable la define la hoja de
            // estilos OFICIAL de pdf.js (que acá no se usa a propósito, ver comentario arriba de
            // TEXT_LAYER_STYLE), así que sin esto el calc() queda inválido y el texto se renderiza
            // con un tamaño de fuente que no corresponde al zoom real, desbordando su recuadro.
            style={{ width: canvasSize.width, height: canvasSize.height, ["--total-scale-factor" as any]: scale }}
          >
            <canvas ref={canvasRef} className="block" />
            <div
              ref={textLayerRef}
              className="fsr-pdf-text-layer"
              style={textLayerCursor ? { cursor: textLayerCursor } : undefined}
              onMouseUp={handleTextSelectionEnd}
            />
            {mode === "select" && drawMode && (
              <div
                className="absolute inset-0 cursor-crosshair"
                onMouseDown={handleDrawStart}
                onMouseMove={handleDrawMove}
                onMouseUp={handleDrawEnd}
              />
            )}
            {drawingRect && (
              <div
                className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
                style={rectToStyle(drawingRect, canvasSize.width, canvasSize.height)}
              />
            )}
            <AnnotationMarks
              annotations={visibleAnnotations}
              containerWidth={canvasSize.width}
              containerHeight={canvasSize.height}
              removable={mode === "select"}
              onRemove={removePendingAnnotation}
            />
          </div>
        )}
      </div>

      {/* Confirmación (solo en modo "select") */}
      {mode === "select" && (
        <div
          className={`flex items-center justify-between gap-2 px-3 py-2 border-t shrink-0 ${
            darkMode ? "border-zinc-800" : "border-zinc-150"
          }`}
        >
          <span className={`text-[10px] font-semibold ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
            {pendingAnnotations.length > 0
              ? `${pendingAnnotations.length} ${pendingAnnotations.length === 1 ? "marca lista" : "marcas listas"} para guardar`
              : drawMode
                ? "Dibujá un recuadro sobre la parte que querés marcar"
                : "Seleccioná texto, o activá el modo recuadro para marcar una imagen"}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onSkip}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                darkMode ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Guardar sin marcar
            </button>
            <button
              type="button"
              disabled={pendingAnnotations.length === 0}
              onClick={handleSaveAnnotations}
              className="px-2.5 py-1.5 rounded-full text-[11px] font-bold bg-primary text-white dark:text-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PdfHighlightViewer;
