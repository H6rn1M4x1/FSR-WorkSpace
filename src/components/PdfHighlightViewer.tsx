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
} from "lucide-react";
import { StudyPlanTreeAnnotation, StudyPlanTreeAnnotationType, StudyPlanTreeUnderlineStyle } from "../types";
import { uiSounds } from "../lib/sounds";

// El worker de pdf.js corre el parseo pesado fuera del hilo principal — `new URL(..., import.meta.url)`
// es el patrón que documenta Vite para empaquetar un archivo de un paquete instalado como asset y
// resolver su URL final en build, sin depender de los tipos ambientales de "vite/client" (que este
// proyecto no tiene configurados) ni de un import con sufijo "?url".
GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

type NormRect = { x: number; y: number; width: number; height: number };

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

// Devuelve, para una selección de texto (Range) dentro de la capa de texto de pdf.js, los rects
// "crudos" de cada span que la selección toca — recortados con un sub-rango al tramo exacto
// seleccionado DENTRO de ese span — en vez de pedirle los rects directo a `range` con
// `getClientRects()`: como pdf.js posiciona cada span de texto en absoluto (no en flujo normal),
// un Range que cruza VARIOS spans a veces devuelve menos rects de los que hacen falta (se "comía"
// el final de algunas líneas). Yendo span por span el resultado es consistente.
function getRawRectsForRange(range: Range, textLayerEl: HTMLElement): DOMRect[] {
  const spans = Array.from(textLayerEl.querySelectorAll("span"));
  const raw: DOMRect[] = [];
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
      raw.push(...Array.from(sub.getClientRects()).filter((r) => r.width > 0 && r.height > 0));
    } catch {
      // Un span cuya posición relativa al range no se puede acotar así (caso borde) se saltea —
      // mejor perder una marca puntual que romper toda la captura.
    }
  }
  return raw;
}

// Agrupa rects por línea visual (mismo "top" aproximado) en un único rectángulo de punta a punta
// por línea — varios rects angostos/superpuestos de una misma línea se ven como un resaltado
// prolijo en vez de manchado.
function mergeRectsByLine(rects: DOMRect[]): { top: number; bottom: number; left: number; right: number }[] {
  const lines: { top: number; bottom: number; left: number; right: number }[] = [];
  for (const r of rects) {
    const line = lines.find((l) => Math.abs(l.top - r.top) < 3);
    if (line) {
      line.left = Math.min(line.left, r.left);
      line.right = Math.max(line.right, r.right);
      line.top = Math.min(line.top, r.top);
      line.bottom = Math.max(line.bottom, r.bottom);
    } else {
      lines.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
    }
  }
  return lines;
}

// Texto seleccionable invisible superpuesto al canvas (pdf.js dibuja los glifos en el canvas; esta
// capa solo necesita estar ahí para que el navegador pueda seleccionar texto) — mínimo necesario,
// sin la hoja de estilos completa del visor oficial de pdf.js (esa trae estructura/chrome que acá
// no se usa, este componente arma su propia interfaz).
const TEXT_LAYER_STYLE = `
.fsr-pdf-text-layer { position: absolute; inset: 0; overflow: hidden; line-height: 1; opacity: 1; }
.fsr-pdf-text-layer span, .fsr-pdf-text-layer br { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
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
          if (ann.type === "underline") {
            const thickness = Math.max(2, h * 0.09);
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
                  top: (style.top as number) + h - thickness,
                  height: Math.max(thickness, 6),
                  borderBottom: `${thickness}px ${ann.underlineStyle || "solid"} ${ann.color}`,
                }}
              />
            );
          }
          // strikethrough
          const thickness = Math.max(2, h * 0.09);
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
                top: (style.top as number) + h / 2 - thickness / 2,
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

  const addPendingAnnotation = (rects: NormRect[], text?: string) => {
    uiSounds.click();
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
    setPendingAnnotations((prev) => prev.filter((a) => a.id !== id));
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
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            <canvas ref={canvasRef} className="block" />
            <div ref={textLayerRef} className="fsr-pdf-text-layer" onMouseUp={handleTextSelectionEnd} />
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
