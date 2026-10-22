import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  TextLayer,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Plus, Minus, Square, Loader2, AlertCircle } from "lucide-react";
import { StudyPlanTreeHighlight } from "../types";
import { uiSounds } from "../lib/sounds";

// El worker de pdf.js corre el parseo pesado fuera del hilo principal — `new URL(..., import.meta.url)`
// es el patrón que documenta Vite para empaquetar un archivo de un paquete instalado como asset y
// resolver su URL final en build, sin depender de los tipos ambientales de "vite/client" (que este
// proyecto no tiene configurados) ni de un import con sufijo "?url".
GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

type NormRect = { x: number; y: number; width: number; height: number };

function rectToStyle(r: NormRect, containerWidth: number, containerHeight: number): React.CSSProperties {
  return {
    left: r.x * containerWidth,
    top: r.y * containerHeight,
    width: r.width * containerWidth,
    height: r.height * containerHeight,
  };
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

export function PdfHighlightViewer({
  fileId,
  accessToken,
  darkMode,
  mode,
  highlight,
  onSave,
  onSkip,
}: {
  fileId: string;
  accessToken: string | null;
  darkMode: boolean;
  // "view": solo muestra el archivo, saltando a `highlight` si viene uno. "select": deja elegir
  // una porción (texto o recuadro libre) y confirmarla con `onSave`, o saltear con `onSkip`.
  mode: "view" | "select";
  highlight?: StudyPlanTreeHighlight;
  onSave?: (highlight: StudyPlanTreeHighlight) => void;
  onSkip?: () => void;
}) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(highlight?.page || 1);
  const [scale, setScale] = useState(1.1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [drawMode, setDrawMode] = useState(false);
  const [drawingRect, setDrawingRect] = useState<NormRect | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ rects: NormRect[]; text?: string } | null>(null);

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
      // no tira error pero no dibuja nada, dejando el canvas transparente (se ve negro por el
      // fondo oscuro del contenedor detrás). Solo `canvas`, que es además la forma recomendada.
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

  // Modo "view": si hay un resaltado guardado, ya arrancó en su página (useState inicial) — esto
  // cubre el caso de volver a abrir el mismo visor con un highlight distinto sin remontar.
  useEffect(() => {
    if (mode === "view" && highlight) setCurrentPage(highlight.page);
  }, [mode, highlight]);

  const goToPage = (p: number) => {
    uiSounds.navigate();
    setCurrentPage(Math.min(Math.max(1, p), numPages || 1));
    setPendingSelection(null);
    setDrawingRect(null);
  };

  const handleTextSelectionEnd = () => {
    if (mode !== "select" || drawMode) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textLayerRef.current || !pageContainerRef.current) return;
    const range = selection.getRangeAt(0);
    if (!textLayerRef.current.contains(range.commonAncestorContainer)) return;
    const clientRects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
    if (clientRects.length === 0) return;
    const containerRect = pageContainerRef.current.getBoundingClientRect();
    const rects: NormRect[] = clientRects.map((r) => ({
      x: (r.left - containerRect.left) / containerRect.width,
      y: (r.top - containerRect.top) / containerRect.height,
      width: r.width / containerRect.width,
      height: r.height / containerRect.height,
    }));
    setPendingSelection({ rects, text: selection.toString().trim() });
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
      setPendingSelection({ rects: [drawingRect] });
    }
    drawStartRef.current = null;
    setDrawingRect(null);
  };

  const handleSaveHighlight = () => {
    if (!pendingSelection) return;
    uiSounds.success();
    onSave?.({ page: currentPage, rects: pendingSelection.rects, text: pendingSelection.text || undefined });
  };

  const displayRects: NormRect[] = useMemo(() => {
    if (mode === "select") return pendingSelection?.rects || [];
    if (mode === "view" && highlight && highlight.page === currentPage) return highlight.rects;
    return [];
  }, [mode, pendingSelection, highlight, currentPage]);

  const btnClass = `p-1.5 rounded-full transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
    darkMode ? "text-zinc-300 hover:bg-zinc-700" : "text-zinc-600 hover:bg-zinc-200"
  }`;

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <style>{TEXT_LAYER_STYLE}</style>

      {/* Barra superior: navegación de páginas + zoom + modo recuadro */}
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border-b shrink-0 ${
          darkMode ? "border-zinc-800" : "border-zinc-150"
        }`}
      >
        <div className="flex items-center gap-0.5">
          <button type="button" className={btnClass} disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className={`text-[10px] font-bold px-1 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
            Página {currentPage} de {numPages || "…"}
          </span>
          <button
            type="button"
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
              title="Dibujar un recuadro (para resaltar algo sin texto, como una imagen)"
              onClick={() => {
                setDrawMode((v) => !v);
                setPendingSelection(null);
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
            {displayRects.map((r, i) => (
              <div
                key={i}
                className="absolute bg-yellow-300/40 border-2 border-yellow-500 pointer-events-none rounded-sm"
                style={rectToStyle(r, canvasSize.width, canvasSize.height)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmación de resaltado (solo en modo "select") */}
      {mode === "select" && (
        <div
          className={`flex items-center justify-between gap-2 px-3 py-2 border-t shrink-0 ${
            darkMode ? "border-zinc-800" : "border-zinc-150"
          }`}
        >
          <span className={`text-[10px] font-semibold ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
            {pendingSelection
              ? "Resaltado listo para guardar"
              : drawMode
                ? "Dibujá un recuadro sobre la parte que querés vincular"
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
              Guardar sin resaltar
            </button>
            <button
              type="button"
              disabled={!pendingSelection}
              onClick={handleSaveHighlight}
              className="px-2.5 py-1.5 rounded-full text-[11px] font-bold bg-primary text-white dark:text-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Guardar resaltado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PdfHighlightViewer;
