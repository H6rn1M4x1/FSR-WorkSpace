import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Funnel,
  Landmark,
  HandCoins,
  Wifi,
  Cloud,
  HeartPulse,
  CreditCard,
  Zap,
  TrendingUp,
  TrendingDown,
  Pin,
  PercentCircle,
} from "lucide-react";
import { DetailedPayment } from "../types";
import { getArgentinaDateParts } from "../utils/date";
import { useInflacionData } from "../hooks/useInflacionData";
import { AnimatedNumber } from "./AnimatedNumber";
import { PillFilterBar } from "./PillFilterBar";
import { uiSounds } from "../lib/sounds";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Mismas 7 categorías del formulario de "Agregar Pago" (PaymentsTable.tsx) — una por cada tipo
// de gasto fijo/recurrente que registra la app.
const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Impuestos": Landmark,
  "Prestamos": HandCoins,
  "Telefonia e Internet": Wifi,
  "Servicios Digitales": Cloud,
  "Obra Social": HeartPulse,
  "Tarjeta de Credito": CreditCard,
  "Servicios Esenciales": Zap,
};
const CATEGORIES = Object.keys(CATEGORY_ICON);

function cleanDateParts(dateStr?: string): { year: number; month: number } | null {
  if (!dateStr) return null;
  const clean = dateStr.split("T")[0].split(" ")[0];
  const parts = clean.split("-");
  if (parts.length < 2) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  if (Number.isNaN(year) || Number.isNaN(month)) return null;
  return { year, month };
}

function sumByCategoryForMonth(
  payments: DetailedPayment[],
  year: number,
  month: number
): Record<string, number> {
  const totals: Record<string, number> = {};
  CATEGORIES.forEach((c) => { totals[c] = 0; });
  payments.forEach((p) => {
    const parts = cleanDateParts(p.fechaVencimiento);
    if (!parts || parts.year !== year || parts.month !== month) return;
    if (totals[p.categoria] === undefined) return;
    totals[p.categoria] += p.montoAPagar || 0;
  });
  return totals;
}

const formatARS = (value: number): string => {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString("es-AR")}`;
};

type ViewMode = "current" | "previous" | "compare";

// Geometría del embudo (ver análisis fotograma a fotograma del video de referencia): cada etapa
// es un bloque de ancho constante (el "rect" sólido, color de acento pleno) que NO ocupa toda la
// altura de su fila — deja un hueco abajo antes del siguiente bloque, más angosto. Atrás de todos
// los bloques va un polígono de fondo que sí une el ancho de cada etapa con el de la siguiente en
// diagonal, así que en ese hueco se asoma la diagonal de fondo (en una sombra más tenue del mismo
// acento, en vez del magenta del original) — el mismo efecto de "alero/caída" que tiene el
// recurso, logrado con geometría simple en vez de las curvas bezier del original.
const FUNNEL_SEGMENT_H = 64;
const FUNNEL_RECT_H = 46;
const FUNNEL_HALF_W = 92;
const FUNNEL_MIN_HALF_W = 20;
const FUNNEL_CENTER_X = FUNNEL_HALF_W + 6;
const FUNNEL_SVG_WIDTH = FUNNEL_CENTER_X * 2;

/**
 * "Embudo de Gastos" — adaptación del recurso de referencia "Embudo de ventas" (Moxen) al
 * dominio de la app: en vez de etapas de un funnel de ventas, las "etapas" son las 7 categorías
 * de gasto de Finanzas (mismas que en Agregar Pago), ordenadas de mayor a menor gasto del mes —
 * mismo efecto visual de embudo (barras angostándose), con el color de acento de la app en vez
 * de la paleta azul/magenta original.
 *
 * Las dos tarjetas superiores de contexto también se adaptaron a algo útil en esta app en vez de
 * copiar literalmente el original (que no aplica: no hay "conversión" ni "etapas de venta" acá):
 * "Conversión total" → IPC/inflación real (INDEC, vía useInflacionData, ya usada en FinanceView);
 * "Mayor caída" → cuánta plata se gastó de más o de menos este mes contra el mes anterior.
 */
export function ExpenseFunnelWidget({
  detailedPayments,
  darkMode,
}: {
  detailedPayments: DetailedPayment[];
  darkMode: boolean;
}) {
  const inflacion = useInflacionData();
  const [viewMode, setViewMode] = useState<ViewMode>("current");
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null);

  const { year: curYear, month: curMonth } = useMemo(() => getArgentinaDateParts(), []);
  const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
  const prevYear = curMonth === 0 ? curYear - 1 : curYear;
  const currentMonthName = MONTH_NAMES[curMonth];
  const previousMonthName = MONTH_NAMES[prevMonth];

  const currentTotals = useMemo(
    () => sumByCategoryForMonth(detailedPayments, curYear, curMonth),
    [detailedPayments, curYear, curMonth]
  );
  const previousTotals = useMemo(
    () => sumByCategoryForMonth(detailedPayments, prevYear, prevMonth),
    [detailedPayments, prevYear, prevMonth]
  );

  const grandTotalCurrent = useMemo(
    () => Object.values(currentTotals).reduce((a, b) => a + b, 0),
    [currentTotals]
  );
  const grandTotalPrevious = useMemo(
    () => Object.values(previousTotals).reduce((a, b) => a + b, 0),
    [previousTotals]
  );

  const activeTotals = viewMode === "previous" ? previousTotals : currentTotals;
  const activeGrandTotal = viewMode === "previous" ? grandTotalPrevious : grandTotalCurrent;

  const rows = useMemo(() => {
    return CATEGORIES.map((categoria) => {
      const total = activeTotals[categoria] || 0;
      const prevTotal = previousTotals[categoria] || 0;
      const share = activeGrandTotal > 0 ? (total / activeGrandTotal) * 100 : 0;
      const deltaPct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : total > 0 ? 100 : 0;
      return { categoria, total, prevTotal, share, deltaPct };
    })
      .filter((r) => r.total > 0 || r.prevTotal > 0)
      .sort((a, b) => b.total - a.total);
  }, [activeTotals, previousTotals, activeGrandTotal]);

  const maxTotal = rows[0]?.total || 1;

  const funnelHalfWidths = useMemo(
    () => rows.map((r) => Math.max(FUNNEL_MIN_HALF_W, (r.total / maxTotal) * FUNNEL_HALF_W)),
    [rows, maxTotal]
  );

  const funnelBackgroundPoints = useMemo(() => {
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    rows.forEach((_, i) => {
      const yTop = i * FUNNEL_SEGMENT_H;
      const yBottom = i * FUNNEL_SEGMENT_H + FUNNEL_RECT_H;
      left.push([FUNNEL_CENTER_X - funnelHalfWidths[i], yTop]);
      left.push([FUNNEL_CENTER_X - funnelHalfWidths[i], yBottom]);
      right.push([FUNNEL_CENTER_X + funnelHalfWidths[i], yTop]);
      right.push([FUNNEL_CENTER_X + funnelHalfWidths[i], yBottom]);
    });
    return [...left, ...right.reverse()].map(([x, y]) => `${x},${y}`).join(" ");
  }, [rows, funnelHalfWidths]);

  const funnelSvgHeight = rows.length * FUNNEL_SEGMENT_H;

  const dropInfo = useMemo(() => {
    return rows.map((row, i) => {
      if (i === 0) return null;
      const prev = rows[i - 1];
      if (prev.total <= 0) return null;
      const dropPct = ((prev.total - row.total) / prev.total) * 100;
      return { dropPct, diff: prev.total - row.total };
    });
  }, [rows]);

  const selectedCategoria = pinnedCategory || hoveredCategory || rows[0]?.categoria || null;
  const selectedRow = rows.find((r) => r.categoria === selectedCategoria) || null;
  const selectedIndex = rows.findIndex((r) => r.categoria === selectedCategoria);

  const totalDiff = grandTotalCurrent - grandTotalPrevious;
  const totalDiffPct = grandTotalPrevious > 0 ? (totalDiff / grandTotalPrevious) * 100 : 0;
  const spentMore = totalDiff >= 0;

  const togglePin = (categoria: string) => {
    setPinnedCategory((prev) => (prev === categoria ? null : categoria));
    uiSounds.toggle();
  };

  return (
    <div
      className={`rounded-3xl p-5 border shadow-xs transition-all duration-300 scroll-reveal ${
        darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
      }`}
    >
      {/* Header: título + selector de mes/comparar, igual patrón que el resto de los widgets */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-full bg-primary/10 shrink-0 flex items-center justify-center">
            <Funnel className="w-4 h-4 text-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm truncate">Embudo de Gastos</h3>
            <p className="text-[10px] text-zinc-400 font-bold truncate">
              {viewMode === "previous" ? previousMonthName : currentMonthName}
              {viewMode === "compare" ? ` frente a ${previousMonthName}` : ""} · por categoría
            </p>
          </div>
        </div>
        <PillFilterBar
          options={[
            { id: "current", label: currentMonthName },
            { id: "previous", label: previousMonthName },
            { id: "compare", label: "Comparar" },
          ]}
          activeValue={viewMode}
          onChange={(v) => { setViewMode(v); uiSounds.navigate(); }}
          layoutIdPrefix="expenseFunnelView"
        />
      </div>

      {/* Dos tarjetas de contexto, adaptadas de "Conversión total" / "Mayor caída" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className={`rounded-2xl border p-3 ${darkMode ? "bg-black/30 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
          <span className="flex items-center gap-1 text-[9.5px] font-bold text-zinc-400 uppercase tracking-widest">
            <PercentCircle className="w-3 h-3" />
            Inflación (IPC)
          </span>
          <div className="text-xl font-black mt-0.5">
            {inflacion.loading ? (
              <span className="inline-block h-6 w-16 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            ) : (
              <AnimatedNumber value={inflacion.valorMensual} format={(n) => `${n.toFixed(1)}%`} />
            )}
          </div>
          <p className="text-[10px] text-zinc-400 font-medium mt-0.5 truncate">
            {inflacion.loading ? "Cargando dato oficial..." : `IPC de ${inflacion.periodoNombre}`}
          </p>
        </div>

        <div className={`rounded-2xl border p-3 ${darkMode ? "bg-black/30 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
          <span className="flex items-center gap-1 text-[9.5px] font-bold text-zinc-400 uppercase tracking-widest">
            {spentMore ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            vs. {previousMonthName}
          </span>
          <div className={`text-xl font-black mt-0.5 ${totalDiff === 0 ? "" : spentMore ? "text-red-500" : "text-emerald-500"}`}>
            <AnimatedNumber value={totalDiff} format={(n) => `${n > 0 ? "+" : n < 0 ? "-" : ""}$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`} />
          </div>
          <p className="text-[10px] text-zinc-400 font-medium mt-0.5 truncate">
            {grandTotalPrevious === 0
              ? "Sin datos del mes anterior todavía"
              : `Gastaste ${spentMore ? "de más" : "de menos"} (${Math.abs(totalDiffPct).toFixed(1)}%)`}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-xs text-zinc-500 font-medium">
          No hay gastos registrados en {viewMode === "previous" ? previousMonthName : currentMonthName} todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 items-start">
          {/* Embudo: forma real de embudo (no barras), angostándose de mayor a menor gasto -- */}
          <div className="overflow-x-auto scroll-reveal">
            <div className="flex items-stretch gap-1.5 min-w-[380px]">
              {/* Columna de etiquetas (categoría + monto) */}
              <div className="shrink-0 flex flex-col" style={{ width: 128 }}>
                {rows.map((row) => {
                  const Icon = CATEGORY_ICON[row.categoria];
                  const isSelected = row.categoria === selectedCategoria;
                  const isPinned = row.categoria === pinnedCategory;
                  return (
                    <button
                      key={row.categoria}
                      type="button"
                      data-sound="expand"
                      onMouseEnter={() => setHoveredCategory(row.categoria)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => togglePin(row.categoria)}
                      style={{ height: FUNNEL_SEGMENT_H }}
                      className="flex flex-col justify-center items-start text-left cursor-pointer group"
                    >
                      <span className={`flex items-center gap-1 text-[10px] font-bold truncate w-full ${isSelected ? "text-primary" : "text-zinc-500 dark:text-zinc-400"}`}>
                        {Icon && <Icon className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{row.categoria}</span>
                        {isPinned && <Pin className="w-2.5 h-2.5 shrink-0 fill-current" />}
                      </span>
                      <span className="text-[13px] font-extrabold mt-0.5">
                        <AnimatedNumber value={row.total} format={formatARS} />
                      </span>
                      {viewMode === "compare" && (
                        <span className={`flex items-center gap-0.5 text-[8.5px] font-bold mt-0.5 ${row.deltaPct > 0 ? "text-red-500" : row.deltaPct < 0 ? "text-emerald-500" : "text-zinc-400"}`}>
                          {row.deltaPct > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : row.deltaPct < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                          {row.deltaPct === 0 ? "Sin cambios" : `${row.deltaPct > 0 ? "+" : ""}${row.deltaPct.toFixed(1)}%`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* El embudo propiamente dicho */}
              <div className="flex-1 flex justify-center">
                <svg
                  viewBox={`0 0 ${FUNNEL_SVG_WIDTH} ${funnelSvgHeight}`}
                  width="100%"
                  style={{ maxWidth: FUNNEL_SVG_WIDTH * 1.5, height: funnelSvgHeight }}
                >
                  <polygon
                    points={funnelBackgroundPoints}
                    style={{ fill: "color-mix(in srgb, var(--color-primary) 28%, transparent)" }}
                  />
                  {rows.map((row, i) => {
                    const isSelected = row.categoria === selectedCategoria;
                    const hasSelection = Boolean(selectedCategoria);
                    return (
                      <rect
                        key={row.categoria}
                        x={FUNNEL_CENTER_X - funnelHalfWidths[i]}
                        y={i * FUNNEL_SEGMENT_H}
                        width={funnelHalfWidths[i] * 2}
                        height={FUNNEL_RECT_H}
                        rx={8}
                        data-sound="expand"
                        onMouseEnter={() => setHoveredCategory(row.categoria)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => togglePin(row.categoria)}
                        style={{
                          fill: "var(--color-primary)",
                          opacity: !hasSelection || isSelected ? 1 : 0.5,
                          cursor: "pointer",
                          transition: "opacity 0.2s",
                        }}
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Columna de estadísticas (% del total + caída vs. la categoría anterior) */}
              <div className="shrink-0 flex flex-col items-end" style={{ width: 96 }}>
                {rows.map((row, i) => {
                  const drop = dropInfo[i];
                  return (
                    <div key={row.categoria} style={{ height: FUNNEL_SEGMENT_H }} className="flex flex-col justify-center items-end">
                      <span className="text-[13px] font-extrabold">
                        <AnimatedNumber value={row.share} format={(n) => `${n.toFixed(1)}%`} />
                      </span>
                      <span className="text-[8.5px] text-zinc-400 font-medium whitespace-nowrap">del gasto total</span>
                      {drop && (
                        <span className="mt-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold bg-primary/10 text-primary whitespace-nowrap">
                          ↓ {drop.dropPct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detalle de la categoría seleccionada (hover para previsualizar, clic para fijar) */}
          <div className={`rounded-2xl border p-4 ${darkMode ? "bg-black/30 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
            <AnimatePresence mode="wait">
              {selectedRow && (
                <motion.div
                  key={selectedRow.categoria}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-widest">
                    Categoría {selectedIndex + 1} de {rows.length}
                  </span>
                  <h4 className="text-base font-extrabold mt-0.5">{selectedRow.categoria}</h4>
                  <div className="text-2xl font-black text-primary mt-1">
                    <AnimatedNumber value={selectedRow.total} format={formatARS} />
                  </div>
                  <p className="text-[10.5px] text-zinc-400 font-medium mt-0.5">
                    <AnimatedNumber value={selectedRow.share} format={(n) => `${n.toFixed(1)}%`} /> del gasto de{" "}
                    {viewMode === "previous" ? previousMonthName : currentMonthName}
                  </p>

                  <div className={`relative h-2.5 rounded-full overflow-hidden mt-3 ${darkMode ? "bg-zinc-800" : "bg-slate-200"}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedRow.share}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] font-semibold mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-zinc-400">Resto de categorías</span>
                    <span>{formatARS(activeGrandTotal - selectedRow.total)}</span>
                  </div>

                  {viewMode !== "compare" && selectedRow.prevTotal > 0 && (
                    <div className="flex items-center justify-between text-[10.5px] font-semibold mt-1.5">
                      <span className="text-zinc-400">{previousMonthName}</span>
                      <span>{formatARS(selectedRow.prevTotal)}</span>
                    </div>
                  )}

                  {!pinnedCategory && (
                    <p className="text-[9.5px] text-zinc-400 font-medium mt-3">
                      Pasá el cursor por una categoría · clic para fijarla
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseFunnelWidget;
