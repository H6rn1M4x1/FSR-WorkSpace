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
  Bitcoin,
  LineChart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DetailedPayment, InvestmentSnapshot } from "../types";
import { getArgentinaDateParts, formatLocalDate } from "../utils/date";
import { useInflacionData } from "../hooks/useInflacionData";
import { AnimatedNumber } from "./AnimatedNumber";
import { uiSounds } from "../lib/sounds";
import { getAccentColorHex, hexToRgb, rgbToHex } from "./WeeklyScheduleGrid";

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

// Mini-sparkline para el slider de inversiones: normaliza una serie de valores (pueden ser
// negativos) a puntos dentro de un viewBox width x height, con un margen chico arriba/abajo para
// que el trazo no quede pegado al borde.
function buildSparklinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) return "";
  if (values.length === 1) return `0,${height / 2} ${width},${height / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const margin = height * 0.12;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - margin - ((v - min) / range) * (height - margin * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = Math.max(0, Math.min(100, s)) / 100;
  const lN = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = lN - c / 2;
  return rgbToHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

/**
 * "Embudo de Gastos" — las "etapas" son las 7 categorías de gasto de Finanzas (mismas que en
 * Agregar Pago), ordenadas de mayor a menor gasto del mes, mostradas como barras 2D horizontales
 * cuyo largo es proporcional al monto de cada categoría, con el color de acento de la app.
 *
 * Las dos tarjetas superiores de contexto también se adaptaron a algo útil en esta app en vez de
 * copiar literalmente el original (que no aplica: no hay "conversión" ni "etapas de venta" acá):
 * "Conversión total" → IPC/inflación real (INDEC, vía useInflacionData, ya usada en FinanceView);
 * "Mayor caída" → cuánta plata se gastó de más o de menos este mes contra el mes anterior.
 */
export function ExpenseFunnelWidget({
  detailedPayments,
  darkMode,
  investmentSnapshots = [],
}: {
  detailedPayments: DetailedPayment[];
  darkMode: boolean;
  investmentSnapshots?: InvestmentSnapshot[];
}) {
  const inflacion = useInflacionData();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null);
  const [investmentSlide, setInvestmentSlide] = useState(0);

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

  const rows = useMemo(() => {
    return CATEGORIES.map((categoria) => {
      const total = currentTotals[categoria] || 0;
      const prevTotal = previousTotals[categoria] || 0;
      const share = grandTotalCurrent > 0 ? (total / grandTotalCurrent) * 100 : 0;
      const deltaPct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : total > 0 ? 100 : 0;
      return { categoria, total, prevTotal, share, deltaPct };
    })
      .filter((r) => r.total > 0 || r.prevTotal > 0)
      .sort((a, b) => b.total - a.total);
  }, [currentTotals, previousTotals, grandTotalCurrent]);

  const maxTotal = rows[0]?.total || 1;

  // Una tonalidad distinta del acento por etapa: varía la LUMINOSIDAD en HSL (no una mezcla con
  // blanco/gris en RGB) para que cada categoría se vea como un tono vivo y saturado propio —
  // mezclar hacia blanco "lavaba" el color hacia un beige apagado y las categorías chicas
  // terminaban casi indistinguibles entre sí. La saturación baja apenas un poco hacia las
  // categorías más chicas, nunca a cero, así ninguna deja de leerse como parte de la familia del
  // acento.
  const funnelPalette = useMemo(() => {
    const [baseH, baseS, baseL] = hexToHsl(getAccentColorHex());
    const n = Math.max(rows.length, 1);
    return rows.map((_, i) => {
      const t = n > 1 ? i / (n - 1) : 0;
      const targetL = darkMode ? baseL + t * (86 - baseL) : baseL - t * baseL * 0.58;
      const targetS = Math.max(baseS * 0.55, baseS - t * 18);
      return hslToHex(baseH, targetS, targetL);
    });
  }, [rows.length, darkMode]);

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

  // Mini-slider "Resultado de Inversiones" — ocupaba el espacio vacío que quedaba abajo del todo
  // en el panel de detalle, a la derecha. Reusa los snapshots diarios que Finanzas ya calcula y
  // guarda (InvestmentSnapshot: una fila por día con la ganancia acumulada de cripto/acciones en
  // ARS), sin recalcular nada — solo ordena por fecha y arma una mini serie para el sparkline.
  const sortedSnapshots = useMemo(
    () => [...(investmentSnapshots || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [investmentSnapshots]
  );
  const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1] || null;
  const recentSnapshots = sortedSnapshots.slice(-14);
  const investmentSlides = [
    {
      key: "crypto" as const,
      label: "Criptomonedas",
      icon: Bitcoin,
      value: latestSnapshot?.cryptoGainARS ?? 0,
      series: recentSnapshots.map((s) => s.cryptoGainARS),
    },
    {
      key: "acciones" as const,
      label: "Acciones",
      icon: LineChart,
      value: latestSnapshot?.accionesGainARS ?? 0,
      series: recentSnapshots.map((s) => s.accionesGainARS),
    },
  ];
  const activeInvestmentSlide = investmentSlides[investmentSlide];

  return (
    <div
      className={`rounded-3xl p-5 border shadow-xs transition-all duration-300 scroll-reveal ${
        darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
      }`}
    >
      {/* Header: título, siempre comparando el mes actual contra el anterior */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-full bg-primary/10 shrink-0 flex items-center justify-center">
            <Funnel className="w-4 h-4 text-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm truncate">Embudo de Gastos</h3>
            <p className="text-[10px] text-zinc-400 font-bold truncate">
              {currentMonthName} frente a {previousMonthName} · por categoría
            </p>
          </div>
        </div>
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
          No hay gastos registrados en {currentMonthName} todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 items-start">
          {/* Barras 2D animadas, ordenadas de mayor a menor gasto, con bounce al aparecer */}
          <div className="flex flex-col gap-3">
            {rows.map((row, i) => {
              const Icon = CATEGORY_ICON[row.categoria];
              const isSelected = row.categoria === selectedCategoria;
              const isPinned = row.categoria === pinnedCategory;
              const hasSelection = Boolean(selectedCategoria);
              const widthPct = Math.max(3, (row.total / maxTotal) * 100);
              const color = funnelPalette[i];
              const drop = dropInfo[i];
              return (
                <button
                  key={row.categoria}
                  type="button"
                  data-sound="expand"
                  onMouseEnter={() => setHoveredCategory(row.categoria)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => togglePin(row.categoria)}
                  className="w-full text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold truncate ${isSelected ? "text-primary" : "text-zinc-500 dark:text-zinc-400"}`}>
                      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{row.categoria}</span>
                      {isPinned && <Pin className="w-2.5 h-2.5 shrink-0 fill-current" />}
                    </span>
                    <span className="flex items-baseline gap-1.5 shrink-0">
                      {drop && (
                        <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-bold bg-primary/10 text-primary whitespace-nowrap">
                          ↓ {drop.dropPct.toFixed(1)}%
                        </span>
                      )}
                      <span className="text-[13px] font-extrabold">
                        <AnimatedNumber value={row.total} format={formatARS} />
                      </span>
                      <span className="text-[9.5px] text-zinc-400 font-bold">
                        <AnimatedNumber value={row.share} format={(n) => `${n.toFixed(1)}%`} />
                      </span>
                    </span>
                  </div>
                  <div className={`relative h-6 rounded-full overflow-hidden ${darkMode ? "bg-zinc-800" : "bg-slate-100"}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%`, opacity: !hasSelection || isSelected ? 1 : 0.45 }}
                      transition={{
                        width: { type: "spring", bounce: 0.5, duration: 0.9, delay: i * 0.08 },
                        opacity: { duration: 0.2 },
                      }}
                      style={{ backgroundColor: color }}
                      className={`h-full rounded-full ${isSelected ? "ring-2 ring-primary/50 shadow-md" : "group-hover:brightness-110"}`}
                    />
                    {/* Comparación vs. el mes anterior, superpuesta dentro de la barra */}
                    <span
                      className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                        darkMode ? "bg-black/40" : "bg-white/55"
                      } ${row.deltaPct > 0 ? "text-red-500" : row.deltaPct < 0 ? "text-emerald-500" : "text-zinc-500 dark:text-zinc-300"}`}
                    >
                      {row.deltaPct > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : row.deltaPct < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                      {row.deltaPct === 0 ? "Sin cambios" : `${row.deltaPct > 0 ? "+" : ""}${row.deltaPct.toFixed(1)}%`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
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
                      {currentMonthName}
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
                      <span>{formatARS(grandTotalCurrent - selectedRow.total)}</span>
                    </div>

                    {selectedRow.prevTotal > 0 && (
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

            {/* Slider "Resultado de Inversiones" — bloque separado, debajo del detalle. Reusa los
                snapshots diarios que ya calcula Finanzas, sin recalcular nada. */}
            <div className={`rounded-2xl border p-4 ${darkMode ? "bg-black/30 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-widest">
                  Resultado de Inversiones
                </span>
                {latestSnapshot && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-sound="click"
                      onClick={() => setInvestmentSlide((i) => (i - 1 + investmentSlides.length) % investmentSlides.length)}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-sound="click"
                      onClick={() => setInvestmentSlide((i) => (i + 1) % investmentSlides.length)}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {!latestSnapshot ? (
                <p className="text-[10.5px] text-zinc-400 font-medium">
                  Todavía no hay datos de inversiones en Finanzas &gt; Inversiones.
                </p>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeInvestmentSlide.key}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
                          <activeInvestmentSlide.icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-bold">{activeInvestmentSlide.label}</span>
                      </div>
                      <div
                        className={`text-xl font-black ${
                          activeInvestmentSlide.value === 0
                            ? ""
                            : activeInvestmentSlide.value > 0
                            ? "text-emerald-500"
                            : "text-red-500"
                        }`}
                      >
                        <AnimatedNumber
                          value={activeInvestmentSlide.value}
                          format={(n) => `${n > 0 ? "+" : n < 0 ? "-" : ""}$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                        Ganancia acumulada al {formatLocalDate(latestSnapshot.date)}
                      </p>

                      {activeInvestmentSlide.series.length > 1 && (
                        <svg viewBox="0 0 120 30" width="100%" height="30" className="mt-2" preserveAspectRatio="none">
                          <polyline
                            points={buildSparklinePoints(activeInvestmentSlide.series, 120, 30)}
                            fill="none"
                            stroke={activeInvestmentSlide.value >= 0 ? "#10b981" : "#ef4444"}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center justify-center gap-1.5 mt-2.5">
                    {investmentSlides.map((s, i) => (
                      <button
                        key={s.key}
                        type="button"
                        data-sound="click"
                        onClick={() => setInvestmentSlide(i)}
                        title={s.label}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === investmentSlide ? "w-4 bg-primary" : "w-1.5 bg-slate-300 dark:bg-zinc-700"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseFunnelWidget;
