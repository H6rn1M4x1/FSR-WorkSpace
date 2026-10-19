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
  Filler,
  type Plugin,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { PolarArea, Bar, Line } from "react-chartjs-2";
import { AnimatedNumber } from "./AnimatedNumber";
import { getArgentinaDateString } from "../utils/date";

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
  Filler,
);

/**
 * Todo este archivo asume navegadores modernos (igual que el resto de la app, que ya usa
 * color-mix() en CSS normal) — acá se resuelve --color-primary UNA vez a un color literal
 * (getComputedStyle) porque el <canvas> de Chart.js no puede resolver var(...) por su cuenta
 * (fillStyle no tiene contexto de elemento/cascada), y ese color literal sí se puede seguir
 * combinando con color-mix() para el degradé de la paleta.
 */
export function useAccentHex(): string {
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

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

// Paleta para gráficos de torta/polar con categorías SIN relación de orden entre sí (a
// diferencia del ranking de BankRatesBarChart, donde la intensidad del mismo tono comunica
// "mejor a peor" y por eso usa buildPalette). Partir todas las porciones del mismo matiz con
// distinta OPACIDAD (como hacía antes) las volvía casi indistinguibles. La corrección NO es
// pasar a un arcoíris de matices random — eso deja de sentirse "del color de acento" apenas se
// aleja unos pocos grados — sino barrer la LUMINOSIDAD en un rango amplio dentro de ese mismo
// matiz (con apenas un jitter de pocos grados para separar porciones vecinas que calcularían la
// misma luminosidad): el resultado son tonos claramente distintos entre sí pero que se leen
// todos como variantes del mismo color de acento.
function buildCategoricalPalette(accentHex: string, count: number, darkMode: boolean): string[] {
  const total = Math.max(count, 1);
  const rgb = hexToRgb(accentHex);
  if (!rgb) return buildPalette(accentHex, count, darkMode);
  const [baseHue, rawSat] = rgbToHsl(...rgb);
  const saturation = Math.min(0.9, Math.max(0.55, rawSat));
  const lightMin = darkMode ? 0.32 : 0.3;
  const lightMax = darkMode ? 0.78 : 0.62;
  return Array.from({ length: total }, (_, index) => {
    const t = total > 1 ? index / (total - 1) : 0.5;
    const lightness = lightMin + t * (lightMax - lightMin);
    const hueJitter = total > 1 ? (index % 2 === 0 ? 4 : -4) : 0;
    const hue = (baseHue + hueJitter + 360) % 360;
    return `hsl(${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%)`;
  });
}

const GREEN = "#22c55e";
const RED = "#ef4444";

// Compacta un monto grande a notación corta (1,2mill / 500mil) para que no abrume los ejes de
// los gráficos — los valores de Finanzas suelen andar en cientos de miles/millones y el número
// completo con separadores de miles ocupa demasiado espacio horizontal en el eje.
export function formatCompactNumber(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const trim = (v: number) => {
    const rounded = Math.round(v * 10) / 10;
    return rounded % 1 === 0 ? String(rounded) : String(rounded).replace(".", ",");
  };
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}mill`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}mil`;
  return `${sign}${Math.round(abs)}`;
}

// DD-MM-YYYY — regla de formato de fecha de toda la app (nunca MM-DD ni YYYY-MM-DD crudo).
function formatDDMMYYYY(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
}

// Tooltip HTML propio en vez del que dibuja Chart.js directamente sobre el <canvas>: ese tooltip
// nativo es parte del mismo bitmap del gráfico, así que nunca puede salirse del rectángulo del
// canvas por más que el contenedor tenga overflow visible — por eso se veía cortado al pasar el
// mouse cerca del borde de la tarjeta. Este, al ser un <div> aparte con position:fixed anclado a
// document.body, queda siempre por encima y nunca se recorta. Las muestras de color de cada fila
// se dibujan redondas (border-radius:9999px) en vez del cuadrado que usa Chart.js por default.
export function makeExternalTooltipHandler(darkMode: boolean) {
  return (ctx: { chart: any; tooltip: any }) => {
    const { chart, tooltip } = ctx;
    let el = document.getElementById("finance-chart-tooltip") as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = "finance-chart-tooltip";
      el.style.position = "fixed";
      el.style.pointerEvents = "none";
      el.style.zIndex = "9999";
      el.style.transition = "opacity 0.1s ease";
      el.style.borderRadius = "12px";
      el.style.padding = "8px 10px";
      el.style.boxShadow = "0 10px 25px -5px rgba(0,0,0,0.25)";
      document.body.appendChild(el);
    }

    if (!tooltip || tooltip.opacity === 0) {
      el.style.opacity = "0";
      return;
    }

    el.style.background = darkMode ? "#18181b" : "#ffffff";
    el.style.border = `1px solid ${darkMode ? "#27272a" : "#e2e8f0"}`;
    el.style.color = darkMode ? "#f4f4f5" : "#0f172a";

    const titleLines: string[] = tooltip.title || [];
    const bodyLines: string[][] = tooltip.body ? tooltip.body.map((b: any) => b.lines) : [];

    let html = "";
    if (titleLines.length) {
      html += `<div style="font-weight:800;font-size:11px;margin-bottom:4px;white-space:nowrap;">${titleLines.join("<br>")}</div>`;
    }
    bodyLines.forEach((lines, i) => {
      const color = tooltip.labelColors?.[i]?.backgroundColor || "#64748b";
      lines.forEach((line: string) => {
        html += `<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;white-space:nowrap;">
          <span style="width:8px;height:8px;min-width:8px;border-radius:9999px;background:${color};display:inline-block;"></span>
          <span>${line}</span>
        </div>`;
      });
    });
    el.innerHTML = html;

    const canvasRect = chart.canvas.getBoundingClientRect();
    el.style.opacity = "1";
    const x = canvasRect.left + tooltip.caretX;
    const y = canvasRect.top + tooltip.caretY;
    const margin = 8;
    // El tooltip va centrado en el punto por default (translateX -50%), pero cerca de un borde
    // de la ventana eso lo sigue cortando aunque el "left" esté clampeado, porque lo que se sale
    // de pantalla es la MITAD del ancho real del tooltip, no su punto de anclaje. Se mide el
    // ancho ya renderizado (con el innerHTML ya puesto) y, si no entra centrado, se ancla por su
    // borde izquierdo o derecho según corresponda en vez de partirlo al medio.
    const tooltipWidth = el.offsetWidth;
    const halfWidth = tooltipWidth / 2;
    let left = x;
    let translateX = "-50%";
    if (x - halfWidth < margin) {
      left = Math.max(x, margin);
      translateX = "0%";
    } else if (x + halfWidth > window.innerWidth - margin) {
      left = Math.min(x, window.innerWidth - margin);
      translateX = "-100%";
    }
    el.style.left = `${left}px`;
    el.style.top = `${Math.max(y, margin)}px`;
    el.style.transform = `translate(${translateX}, -115%)`;
  };
}

export function PolarAreaCenterChart({
  data,
  total,
  darkMode,
  formatValue,
  totalAlreadySeen,
}: {
  data: { name: string; value: number }[];
  total: number;
  darkMode: boolean;
  formatValue: (n: number) => string;
  // true cuando este slide del donut ya se mostró antes en esta sesión (p.ej. el slider ya dio
  // una vuelta completa) — el TOTAL anima más rápido y sin delay en vez de repetir la animación
  // larga cada vez que vuelve a aparecer.
  totalAlreadySeen?: boolean;
}) {
  const accentHex = useAccentHex();
  const textColor = darkMode ? "#a1a1aa" : "#64748b";
  const gridColor = darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  const hasData = data.length > 0;
  const labels = hasData ? data.map((d) => d.name) : ["Sin datos"];
  const rawValues = hasData ? data.map((d) => d.value) : [1];
  // Polar area usa el VALOR directo como radio, así que el área (lo que el ojo percibe) crece
  // con el cuadrado del valor — una categoría grande termina tapando visualmente al resto. Se
  // aplica raíz cuadrada al radio para que el área vuelva a ser proporcional al valor real (como
  // en un donut normal), sin dejar de notarse cuál pondera más.
  const chartValues = rawValues.map((v) => Math.sqrt(Math.max(v, 0)));
  const palette = buildCategoricalPalette(accentHex, labels.length, darkMode);

  const chartData = {
    labels,
    datasets: [
      {
        data: chartValues,
        backgroundColor: hasData ? palette : [darkMode ? "#18181b" : "#e2e8f0"],
        borderColor: darkMode ? "#09090b" : "#f8fafc",
        borderWidth: 2,
        hoverOffset: hasData ? 14 : 0,
      },
    ],
  };

  // Sin point labels fijos (se mostraba siempre el nombre de cada categoría alrededor del
  // círculo, ocupando espacio): ahora el nombre aparece solo al pasar el mouse, vía el título
  // del tooltip nativo de Chart.js — y la cuña bajo el cursor "crece" con hoverOffset arriba.
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
        pointLabels: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        // enabled:false es obligatorio junto con external — si no, Chart.js sigue dibujando
        // además su propio tooltip nativo (cuadrado, recortado por el canvas) encima del
        // custom. hasData sigue controlando si se muestra algo: sin external, no hay nada que
        // dibujar.
        enabled: false,
        external: hasData ? makeExternalTooltipHandler(darkMode) : undefined,
        callbacks: {
          title: (items: TooltipItem<"polarArea">[]) => items[0]?.label ?? "",
          // El tooltip siempre muestra el valor REAL, no el valor comprimido con sqrt que
          // solo se usa para dibujar el radio de cada cuña.
          label: (ctx: TooltipItem<"polarArea">) => formatValue(rawValues[ctx.dataIndex]),
        },
      },
    },
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="h-72 w-full max-w-[320px] relative">
          <PolarArea data={chartData} options={options} />
        </div>
      </div>
      {!hasData && (
        <div className="text-center text-xs text-zinc-500 font-medium italic">Sin datos</div>
      )}
      <div className="mt-1 pt-2 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Total
        </span>
        <span className="text-sm font-black" style={{ color: hasData ? accentHex : textColor }}>
          <AnimatedNumber
            value={hasData ? total : 0}
            format={formatValue}
            duration={totalAlreadySeen ? 0.4 : undefined}
            delay={totalAlreadySeen ? 0 : undefined}
          />
        </span>
      </div>
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

  // formatValue llega como prop recreada en cada render del padre — se guarda en un ref para que
  // no invalide el memo de abajo y las barras no vuelvan a rebotar solo porque el padre
  // renderizó de nuevo sin que los datos reales cambiaran.
  const formatValueRef = useRef(formatValue);
  useEffect(() => {
    formatValueRef.current = formatValue;
  }, [formatValue]);

  const rows = useMemo(
    () =>
      categories.map((cat) => {
        const current = currentTotals[cat] || 0;
        const previous = previousTotals[cat] || 0;
        const base = Math.min(current, previous);
        const delta = Math.abs(current - previous);
        const increased = current > previous;
        return { cat, current, previous, base, delta, increased };
      }),
    [categories, currentTotals, previousTotals],
  );

  const chartConfig = useMemo(() => {
    if (rows.length === 0) return null;

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

    // Rebote al aparecer (easeOutBounce) y cada barra entra con un pequeño retraso respecto a la
    // anterior (delay por dataIndex), en vez de todas a la vez — mismo recurso de "aparición
    // escalonada" que las demás animaciones de Finanzas.
    const options: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: "easeOutBounce",
        delay: (ctx) => (ctx.type === "data" ? ctx.dataIndex * 90 : 0),
      },
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
          ticks: { color: textColor, font: { size: 9 }, callback: (v) => formatCompactNumber(Number(v)) },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          // enabled:false es obligatorio junto con external, si no Chart.js sigue dibujando
          // además su propio tooltip nativo (cuadrado, recortado por el canvas) encima del custom.
          enabled: false,
          external: makeExternalTooltipHandler(darkMode),
          callbacks: {
            title: (items: TooltipItem<"bar">[]) => rows[items[0].dataIndex].cat,
            label: (ctx: TooltipItem<"bar">) => {
              const row = rows[ctx.dataIndex];
              if (ctx.datasetIndex === 0) return `Mes pasado: ${formatValueRef.current(row.previous)}`;
              return `${row.increased ? "Aumento" : "Disminución"}: ${formatValueRef.current(row.delta)} (este mes: ${formatValueRef.current(row.current)})`;
            },
          },
        },
      },
    };

    return { data, options };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, accentHex, darkMode, gridColor, textColor]);

  if (!chartConfig) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 italic">
        Sin datos este mes
      </div>
    );
  }

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
        <Bar data={chartConfig.data} options={chartConfig.options} />
      </div>
    </div>
  );
}

// Ranking de tasas de interés por banco: igual estilo de barra redondeada que
// CategoryComparisonBarChart (border-radius.html), pero sin apilar — una barra por banco. El
// top 3 se destaca en una escala del color de acento (el top 1 con el acento puro); el resto
// queda en gris oscuro para no competir visualmente con los mejores.
export function BankRatesBarChart({
  banks,
  darkMode,
}: {
  banks: { name: string; tna: number }[];
  darkMode: boolean;
}) {
  const accentHex = useAccentHex();
  const gridColor = darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
  const textColor = darkMode ? "#a1a1aa" : "#64748b";
  const dimGray = darkMode ? "#3f3f46" : "#94a3b8";

  const chartConfig = useMemo(() => {
    if (banks.length === 0) return null;

    // El color (top 3 en escala de acento, resto en gris) sigue el RANKING real por TNA, pero el
    // eje se muestra en orden alfabético — son dos cosas independientes.
    const rankedByTna = [...banks].sort((a, b) => b.tna - a.tna);
    const rankByName = new Map(rankedByTna.map((b, index) => [b.name, index]));
    const sorted = [...banks].sort((a, b) => a.name.localeCompare(b.name, "es"));

    const topScale = buildPalette(accentHex, 3, darkMode);
    const barColors = sorted.map((b) => {
      const rank = rankByName.get(b.name) ?? 99;
      return rank < 3 ? topScale[rank] : dimGray;
    });

    const truncateLabel = (label: string) => (label.length > 9 ? `${label.slice(0, 8)}…` : label);

    const data = {
      labels: sorted.map((b) => b.name),
      datasets: [
        {
          data: sorted.map((b) => b.tna),
          backgroundColor: barColors,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    };

    // Rebote al aparecer (easeOutBounce) con cada barra entrando un poco después de la anterior —
    // mismo recurso que CategoryComparisonBarChart.
    const options: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: "easeOutBounce",
        delay: (ctx) => (ctx.type === "data" ? ctx.dataIndex * 90 : 0),
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { size: 9, weight: "bold" },
            maxRotation: 50,
            minRotation: 50,
            autoSkip: false,
            callback: (_value, index) => truncateLabel(sorted[index].name),
          },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 9 }, callback: (v) => `${v}%` },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          // enabled:false es obligatorio junto con external, si no Chart.js sigue dibujando
          // además su propio tooltip nativo (cuadrado, recortado por el canvas) encima del custom.
          enabled: false,
          external: makeExternalTooltipHandler(darkMode),
          callbacks: {
            title: (items: TooltipItem<"bar">[]) => sorted[items[0].dataIndex].name,
            label: (ctx: TooltipItem<"bar">) => `TNA: ${ctx.raw}%`,
          },
        },
      },
    };

    return { data, options };
  }, [banks, accentHex, darkMode, dimGray, gridColor, textColor]);

  if (!chartConfig) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 italic">
        Sin datos
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[160px]">
      <Bar data={chartConfig.data} options={chartConfig.options} />
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

  // formatValue llega como prop recreada en cada render del padre — se guarda en un ref para que
  // no invalide el memo de abajo y la línea no vuelva a dibujarse solo porque el padre renderizó
  // de nuevo sin que los datos reales cambiaran.
  const formatValueRef = useRef(formatValue);
  useEffect(() => {
    formatValueRef.current = formatValue;
  }, [formatValue]);

  const chartConfig = useMemo(() => {
    if (history.length === 0) return null;

    const monthLabel = (ym: string) => {
      const [y, m] = ym.split("-").map(Number);
      return new Date(y, (m || 1) - 1, 1).toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
    };

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

    // Animación "progresiva": la línea se va dibujando de izquierda a derecha, un punto después
    // del otro, igual que en el gráfico de progresión de Cripto/Acciones, en vez de aparecer toda
    // junta de una.
    const totalPoints = allMonths.length;
    const totalDuration = 1800;
    const delayBetweenPoints = totalPoints > 1 ? totalDuration / totalPoints : 0;
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

    const options: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: animation as any,
      interaction: { intersect: false, mode: "index" },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, font: { size: 9 } } },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 9 }, callback: (v) => formatCompactNumber(Number(v)) },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          // enabled:false es obligatorio junto con external, si no Chart.js sigue dibujando
          // además su propio tooltip nativo (cuadrado, recortado por el canvas) encima del custom.
          enabled: false,
          external: makeExternalTooltipHandler(darkMode),
          callbacks: {
            label: (ctx: TooltipItem<"line">) => {
              const isProjection = ctx.datasetIndex === 1 && (ctx.dataIndex ?? 0) >= history.length - 1;
              const val = ctx.raw as number | null;
              if (val === null) return "";
              return `${isProjection ? "Proyectado" : "Real"}: ${formatValueRef.current(val)}`;
            },
          },
        },
      },
    };

    return { data, options };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, accentHex, darkMode, gridColor, textColor]);

  if (!chartConfig) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 italic">
        Todavía no hay historial suficiente
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[180px]">
      <Line data={chartConfig.data} options={chartConfig.options} />
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

// Ventana relativa a HOY (huso de Argentina) que cada granularidad muestra — siempre termina en
// el día de hoy, nunca en lo que sea que haya sido el último snapshot guardado.
const GRANULARITY_WINDOW_DAYS: Record<"dia" | "semana" | "quincena" | "mes", number> = {
  dia: 30,
  semana: 16 * 7,
  quincena: 12 * 15,
  mes: 365,
};

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
  todayStr: string,
): { label: string; value: number }[] {
  if (points.length === 0) return [];

  // Ventana relativa a HOY (huso de Argentina) — nunca "lo que haya hasta el último snapshot
  // guardado" sino siempre hasta la fecha real de hoy, recortando lo más viejo que ya no entra.
  const windowed = points.filter((p) => {
    const days = Math.round(
      (new Date(todayStr + "T00:00:00").getTime() - new Date(p.date + "T00:00:00").getTime()) /
        86400000,
    );
    return days >= 0 && days <= GRANULARITY_WINDOW_DAYS[granularity];
  });

  if (granularity === "dia") {
    return windowed.map((p) => ({ label: formatDDMMYYYY(p.date), value: p.value }));
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
  windowed.forEach((p) => {
    // Cada balde suma los valores diarios que caen dentro de su ventana (p.ej. "quincena" suma
    // los valores de los 15 días que agrupa) — no se queda con el último, todos los días aportan.
    const key = bucketKey(p.date);
    buckets.set(key, (buckets.get(key) || 0) + p.value);
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
  const accentHex = useAccentHex();
  const gridColor = darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
  const textColor = darkMode ? "#a1a1aa" : "#64748b";
  const negativeColor = darkMode ? "#71717a" : "#94a3b8";
  const today = getArgentinaDateString();

  // formatValue llega como prop recreada en cada render del padre (no está envuelta en
  // useCallback) — guardarla en un ref evita que eso invalide el memo de abajo y el gráfico se
  // reanime solo porque el padre volvió a renderizar, sin que los datos reales cambiaran.
  const formatValueRef = useRef(formatValue);
  useEffect(() => {
    formatValueRef.current = formatValue;
  }, [formatValue]);

  const aggregated = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const points = sorted.map((s) => ({ date: s.date, value: s[valueKey] }));
    return aggregateSnapshots(points, granularity, today);
  }, [snapshots, valueKey, granularity, today]);

  // data/options de Chart.js se memorizan: si se recrean como objetos nuevos en cada render del
  // padre (aunque los datos no hayan cambiado), react-chartjs-2 vuelve a llamar chart.update() y
  // reinicia la animación de entrada una y otra vez — eso es lo que se veía como el gráfico
  // "desapareciendo y volviendo a aparecer" en vez de animarse una sola vez al cargar.
  const chartConfig = useMemo(() => {
    if (aggregated.length < 2) return null;

    const lastValue = aggregated[aggregated.length - 1].value;
    // Acento cuando la progresión va positiva, gris cuando va negativa — a diferencia del resto
    // de los gráficos de Finanzas (que sí usan rojo/verde semántico), esta línea pidió seguir la
    // paleta de la app en vez de un semáforo.
    const lineColor = lastValue >= 0 ? accentHex : negativeColor;

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
          ticks: { color: textColor, font: { size: 9 }, callback: (v) => formatCompactNumber(Number(v)) },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          // enabled:false es obligatorio junto con external, si no Chart.js sigue dibujando
          // además su propio tooltip nativo (cuadrado, recortado por el canvas) encima del custom.
          enabled: false,
          external: makeExternalTooltipHandler(darkMode),
          callbacks: { label: (ctx: TooltipItem<"line">) => formatValueRef.current(ctx.raw as number) },
        },
      },
    };

    return { data, options };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregated, accentHex, negativeColor, darkMode, gridColor, textColor]);

  // Con un solo punto Chart.js no puede dibujar una línea (no hay "progresión" que mostrar
  // todavía) — se deja el mismo mensaje de "se va completando" en vez de un punto suelto que
  // parece un gráfico roto.
  if (!chartConfig) {
    return (
      <div className="flex-1 flex items-center justify-center text-center text-xs text-zinc-500 italic px-4">
        Sin historial todavía — se va a ir completando día a día a partir de hoy.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[160px]">
      <Line data={chartConfig.data} options={chartConfig.options} />
    </div>
  );
}
