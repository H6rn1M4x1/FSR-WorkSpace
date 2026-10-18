import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  type Plugin,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { PolarArea, Bar, Line } from "react-chartjs-2";

ChartJS.register(
  RadialLinearScale,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

/**
 * Todo este archivo asume navegadores modernos (igual que el resto de la app, que ya usa
 * color-mix() en CSS normal) — acá se resuelve --color-primary UNA vez a un color literal
 * (getComputedStyle) porque el <canvas> de Chart.js no puede resolver var(...) por su cuenta
 * (fillStyle no tiene contexto de elemento/cascada), y ese color literal sí se puede seguir
 * combinando con color-mix() para el degradé de la paleta.
 */
function useAccentHex(): string {
  const [hex, setHex] = useState("#2563eb");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim();
      if (v) setHex(v);
    };
    read();
    // Reacciona si el usuario cambia el color de acento en Configuración mientras esta vista
    // sigue montada — se observa el atributo style del <html>, que es donde se setea la variable.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);
  return hex;
}

function buildPalette(accentHex: string, count: number, darkMode: boolean): string[] {
  const total = Math.max(count, 1);
  const mixBase = darkMode ? "#27272a" : "#cbd5e1";
  return Array.from({ length: total }, (_, index) => {
    const opacityPercent = Math.max(30, Math.round(100 - (index * 65) / Math.max(total - 1, 1)));
    return `color-mix(in srgb, ${accentHex} ${opacityPercent}%, ${mixBase})`;
  });
}

const GREEN = "#22c55e";
const RED = "#ef4444";

// Dibuja el total en el centro exacto del gráfico — polar area no tiene un "agujero" central
// como un donut, así que el texto se superpone sobre el centro de las cuñas (mismo recurso
// visual que ya tenía el donut de Recharts, adaptado a un plugin de Chart.js).
// Dibuja el texto central leyendo SIEMPRE chart.options.plugins.centerLabel en el momento del
// draw (no un closure capturado al construir el plugin): react-chartjs-2 reutiliza la misma
// instancia de Chart.js entre renders y solo reasigna `options`, así que si el texto quedara
// capturado por closure en la creación del plugin podría quedar desactualizado tras un cambio de
// props sin remount del canvas.
const centerLabelPlugin: Plugin<"polarArea"> = {
  id: "centerLabel",
  afterDraw(chart) {
    const cfg = (chart.options.plugins as any)?.centerLabel as
      | { topLine: string; bottomLine: string; darkMode: boolean; accentHex: string }
      | undefined;
    if (!cfg) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 9px system-ui, sans-serif";
    ctx.fillStyle = cfg.darkMode ? "#a1a1aa" : "#64748b";
    ctx.fillText(cfg.topLine, cx, cy - 7);
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.fillStyle = cfg.accentHex;
    ctx.fillText(cfg.bottomLine, cx, cy + 7);
    ctx.restore();
  },
};

export function PolarAreaCenterChart({
  data,
  total,
  darkMode,
  formatValue,
}: {
  data: { name: string; value: number }[];
  total: number;
  darkMode: boolean;
  formatValue: (n: number) => string;
}) {
  const accentHex = useAccentHex();
  const textColor = darkMode ? "#a1a1aa" : "#64748b";
  const gridColor = darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  const hasData = data.length > 0;
  const labels = hasData ? data.map((d) => d.name) : ["Sin datos"];
  const values = hasData ? data.map((d) => d.value) : [1];
  const palette = buildPalette(accentHex, labels.length, darkMode);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: hasData ? palette : [darkMode ? "#18181b" : "#e2e8f0"],
        borderColor: darkMode ? "#09090b" : "#f8fafc",
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<"polarArea"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 650, easing: "easeOutQuart" },
    elements: { arc: { borderRadius: 10 } },
    scales: {
      r: {
        ticks: { display: false },
        grid: { color: gridColor },
        angleLines: { color: gridColor },
        pointLabels: hasData
          ? {
              display: true,
              centerPointLabels: true,
              font: { size: 9, weight: "bold" },
              color: darkMode ? "#f4f4f5" : "#1e293b",
            }
          : { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: hasData,
        callbacks: {
          label: (ctx: TooltipItem<"polarArea">) => formatValue(ctx.raw as number),
        },
      },
      centerLabel: {
        topLine: "TOTAL",
        bottomLine: hasData ? formatValue(total) : formatValue(0),
        darkMode,
        accentHex: hasData ? accentHex : textColor,
      },
    } as ChartOptions<"polarArea">["plugins"],
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="h-60 w-full relative">
        <PolarArea data={chartData} options={options} plugins={[centerLabelPlugin]} />
      </div>
      {hasData ? (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mt-2 px-2 overflow-y-auto max-h-32">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{entry.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-xs text-zinc-500 font-medium italic mt-2">Sin datos</div>
      )}
    </div>
  );
}

export function CategoryComparisonBarChart({
  categories,
  currentTotals,
  previousTotals,
  darkMode,
  formatValue,
}: {
  categories: string[];
  currentTotals: Record<string, number>;
  previousTotals: Record<string, number>;
  darkMode: boolean;
  formatValue: (n: number) => string;
}) {
  const accentHex = useAccentHex();
  const gridColor = darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
  const textColor = darkMode ? "#a1a1aa" : "#64748b";

  const rows = categories.map((cat) => {
    const current = currentTotals[cat] || 0;
    const previous = previousTotals[cat] || 0;
    const base = Math.min(current, previous);
    const delta = Math.abs(current - previous);
    const increased = current > previous;
    return { cat, current, previous, base, delta, increased };
  });

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 italic">
        Sin datos este mes
      </div>
    );
  }

  const data = {
    labels: rows.map((r) => r.cat),
    datasets: [
      {
        label: "Base",
        data: rows.map((r) => r.base),
        backgroundColor: accentHex,
        borderRadius: rows.map((r) =>
          r.delta === 0
            ? 8
            : { topLeft: 0, topRight: 0, bottomLeft: 8, bottomRight: 8 },
        ),
        borderSkipped: false,
        stack: "s",
      },
      {
        label: "Variación",
        data: rows.map((r) => r.delta),
        backgroundColor: rows.map((r) => (r.increased ? RED : GREEN)),
        borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: false,
        stack: "s",
      },
    ],
  };

  const truncateLabel = (label: string) =>
    label.length > 9 ? `${label.slice(0, 8)}…` : label;

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: textColor,
          font: { size: 9, weight: "bold" },
          maxRotation: 50,
          minRotation: 50,
          autoSkip: false,
          callback: (_value, index) => truncateLabel(rows[index].cat),
        },
      },
      y: {
        stacked: true,
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 9 }, callback: (v) => formatValue(Number(v)).replace("AR$ ", "") },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<"bar">[]) => rows[items[0].dataIndex].cat,
          label: (ctx: TooltipItem<"bar">) => {
            const row = rows[ctx.dataIndex];
            if (ctx.datasetIndex === 0) return `Mes pasado: ${formatValue(row.previous)}`;
            return `${row.increased ? "Aumento" : "Disminución"}: ${formatValue(row.delta)} (este mes: ${formatValue(row.current)})`;
          },
        },
      },
    },
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-end gap-3 mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentHex }} />
          <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">Mes pasado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RED }} />
          <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">Aumentó</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GREEN }} />
          <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">Bajó</span>
        </div>
      </div>
      <div className="flex-1 min-h-[160px]">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

export function MonthlyTrendChart({
  history,
  darkMode,
  formatValue,
}: {
  history: { month: string; total: number }[]; // month = "YYYY-MM", ordenado ascendente
  darkMode: boolean;
  formatValue: (n: number) => string;
}) {
  const accentHex = useAccentHex();
  const gridColor = darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
  const textColor = darkMode ? "#a1a1aa" : "#64748b";

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
  };

  if (history.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 italic">
        Todavía no hay historial suficiente
      </div>
    );
  }

  // Proyección lineal simple a partir del promedio de variación de los últimos meses — se marca
  // con línea punteada, como "expectativa", nunca como dato real.
  const PROJECTION_MONTHS = 2;
  const recent = history.slice(-4);
  const avgDelta =
    recent.length > 1
      ? (recent[recent.length - 1].total - recent[0].total) / (recent.length - 1)
      : 0;
  const lastReal = history[history.length - 1];
  const projected: { month: string; total: number }[] = [];
  let cursorY = lastReal.month.split("-").map(Number)[0];
  let cursorM = lastReal.month.split("-").map(Number)[1];
  let cursorVal = lastReal.total;
  for (let i = 0; i < PROJECTION_MONTHS; i++) {
    cursorM += 1;
    if (cursorM > 12) {
      cursorM = 1;
      cursorY += 1;
    }
    cursorVal = Math.max(0, cursorVal + avgDelta);
    projected.push({ month: `${cursorY}-${String(cursorM).padStart(2, "0")}`, total: cursorVal });
  }

  const allMonths = [...history.map((h) => h.month), ...projected.map((p) => p.month)];
  const realValues: (number | null)[] = [...history.map((h) => h.total), ...projected.map(() => null)];
  // El primer punto proyectado repite el último real, así la línea punteada arranca pegada a la
  // sólida en vez de dejar un salto en blanco entre las dos.
  const projValues: (number | null)[] = [
    ...history.map((_, i) => (i === history.length - 1 ? history[i].total : null)),
    ...projected.map((p) => p.total),
  ];

  const data = {
    labels: allMonths.map(monthLabel),
    datasets: [
      {
        label: "Gasto real",
        data: realValues,
        borderColor: accentHex,
        backgroundColor: accentHex,
        pointRadius: 3,
        pointBackgroundColor: accentHex,
        tension: 0.35,
        spanGaps: false,
      },
      {
        label: "Proyección",
        data: projValues,
        borderColor: accentHex,
        backgroundColor: "transparent",
        borderDash: [6, 5],
        pointRadius: (ctx: any) => (ctx.dataIndex >= history.length ? 3 : 0),
        pointBackgroundColor: accentHex,
        tension: 0.35,
        spanGaps: true,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: "easeOutQuart" },
    interaction: { intersect: false, mode: "index" },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 9 } } },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 9 }, callback: (v) => formatValue(Number(v)).replace("AR$ ", "") },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"line">) => {
            const isProjection = ctx.datasetIndex === 1 && (ctx.dataIndex ?? 0) >= history.length - 1;
            const val = ctx.raw as number | null;
            if (val === null) return "";
            return `${isProjection ? "Proyectado" : "Real"}: ${formatValue(val)}`;
          },
        },
      },
    },
  };

  return (
    <div className="flex-1 min-h-[180px]">
      <Line data={data} options={options} />
    </div>
  );
}

export type InvestmentGranularity = "dia" | "semana" | "quincena" | "mes";

const GRANULARITY_OPTIONS: { id: InvestmentGranularity; label: string }[] = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Sem" },
  { id: "quincena", label: "Quinc" },
  { id: "mes", label: "Mes" },
];

export function GranularitySelector({
  value,
  onChange,
}: {
  value: InvestmentGranularity;
  onChange: (g: InvestmentGranularity) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-slate-200/60 dark:bg-zinc-800/60 shrink-0">
      {GRANULARITY_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide transition-colors cursor-pointer ${
            value === opt.id
              ? "bg-primary text-white dark:text-blue-950"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function aggregateSnapshots(
  points: { date: string; value: number }[],
  granularity: InvestmentGranularity,
): { label: string; value: number }[] {
  if (points.length === 0) return [];
  if (granularity === "dia") {
    return points.map((p) => ({ label: p.date.slice(5), value: p.value }));
  }
  const bucketKey = (dateStr: string): string => {
    const d = new Date(dateStr + "T00:00:00");
    if (granularity === "semana") {
      const onejan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
      return `${d.getFullYear()}-S${week}`;
    }
    if (granularity === "quincena") {
      const half = d.getDate() <= 15 ? "A" : "B";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${half}`;
    }
    // mes
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const buckets = new Map<string, number>();
  points.forEach((p) => {
    // Se queda con el último valor conocido de cada balde (no se suman ganancias entre sí).
    buckets.set(bucketKey(p.date), p.value);
  });
  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

export function InvestmentProgressionChart({
  snapshots,
  valueKey,
  darkMode,
  formatValue,
  granularity,
}: {
  snapshots: { date: string; cryptoGainARS: number; accionesGainARS: number }[];
  valueKey: "cryptoGainARS" | "accionesGainARS";
  darkMode: boolean;
  formatValue: (n: number) => string;
  granularity: InvestmentGranularity;
}) {
  const gridColor = darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
  const textColor = darkMode ? "#a1a1aa" : "#64748b";

  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const points = sorted.map((s) => ({ date: s.date, value: s[valueKey] }));
  const aggregated = aggregateSnapshots(points, granularity);

  if (aggregated.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center text-xs text-zinc-500 italic px-4">
        Sin historial todavía — se va a ir completando día a día a partir de hoy.
      </div>
    );
  }

  const lastValue = aggregated[aggregated.length - 1].value;
  const lineColor = lastValue >= 0 ? GREEN : RED;

  // Animación "progresiva": cada punto se dibuja en orden, no todos juntos — mismo recurso que
  // la muestra de Chart.js que pidió el usuario (animations/progressive-line), adaptado a la
  // cantidad real de puntos en vez de 1000.
  const totalDuration = 1800;
  const delayBetweenPoints = aggregated.length > 1 ? totalDuration / aggregated.length : 0;
  const previousY = (ctx: any) =>
    ctx.index === 0
      ? ctx.chart.scales.y.getPixelForValue(0)
      : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1]?.getProps(["y"], true).y;
  const animation = {
    x: { type: "number" as const, easing: "linear" as const, duration: delayBetweenPoints, from: NaN },
    y: {
      type: "number" as const,
      easing: "linear" as const,
      duration: delayBetweenPoints,
      from: previousY,
      delay(ctx: any) {
        if (ctx.type !== "data" || ctx.yStarted) return 0;
        ctx.yStarted = true;
        return ctx.index * delayBetweenPoints;
      },
    },
  };

  const data = {
    labels: aggregated.map((p) => p.label),
    datasets: [
      {
        data: aggregated.map((p) => p.value),
        borderColor: lineColor,
        backgroundColor: lineColor,
        pointRadius: aggregated.length > 20 ? 0 : 2.5,
        pointBackgroundColor: lineColor,
        borderWidth: 2,
        tension: 0.3,
        fill: { target: "origin", above: `${lineColor}1a`, below: `${lineColor}1a` },
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animation as any,
    interaction: { intersect: false, mode: "index" },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 8 }, maxTicksLimit: 8 } },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 9 }, callback: (v) => formatValue(Number(v)).replace("AR$ ", "") },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: TooltipItem<"line">) => formatValue(ctx.raw as number) } },
    },
  };

  return (
    <div className="flex-1 min-h-[160px]">
      <Line data={data} options={options} />
    </div>
  );
}
