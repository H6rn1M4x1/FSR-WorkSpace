import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  LineElement,
  PointElement,
  Filler,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Radar, Doughnut, Bar } from "react-chartjs-2";
import { AnimatedNumber } from "./AnimatedNumber";
import { useAccentHex, formatCompactNumber, makeExternalTooltipHandler } from "./FinanceCharts";

ChartJS.register(
  RadialLinearScale,
  LineElement,
  PointElement,
  Filler,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
);

/**
 * Radar/spider de "qué tan cerca estoy de terminar cada año de la carrera" — un eje por año
 * (Primero a Quinto), el valor es el % de materias de ese año ya aprobadas. Más cerca del borde
 * = año más avanzado/completo.
 */
export function AcademicRadarChart({
  yearStats,
  darkMode,
}: {
  yearStats: { year: string; percent: number }[];
  darkMode: boolean;
}) {
  const accentHex = useAccentHex();
  const textColor = darkMode ? "#a1a1aa" : "#64748b";
  const gridColor = darkMode ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)";

  const chartConfig = useMemo(() => {
    // Nombres cortos para no saturar el radar (las etiquetas largas se solapan alrededor del
    // círculo) — el nombre completo sigue apareciendo en el tooltip.
    const shortLabel = (year: string) => year.replace(" Año", "");

    const data = {
      labels: yearStats.map((y) => shortLabel(y.year)),
      datasets: [
        {
          label: "Avance",
          data: yearStats.map((y) => y.percent),
          backgroundColor: `${accentHex}33`,
          borderColor: accentHex,
          borderWidth: 2,
          pointBackgroundColor: accentHex,
          pointBorderColor: darkMode ? "#09090b" : "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
        },
      ],
    };

    const options: ChartOptions<"radar"> = {
      responsive: true,
      maintainAspectRatio: false,
      // "animateScale": el radar crece desde el centro hacia afuera, como aparición — más
      // acorde a un gráfico radial que una línea que se va dibujando punto por punto.
      animation: { duration: 1100, easing: "easeOutQuart" } as any,
      elements: { line: { tension: 0.1 } },
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: { display: false, stepSize: 25 },
          grid: { color: gridColor },
          angleLines: { color: gridColor },
          pointLabels: { color: textColor, font: { size: 11, weight: "bold" } },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: makeExternalTooltipHandler(darkMode),
          callbacks: {
            title: (items: TooltipItem<"radar">[]) => yearStats[items[0].dataIndex]?.year ?? "",
            label: (ctx: TooltipItem<"radar">) => `${Math.round(ctx.raw as number)}% completado`,
          },
        },
      },
    };

    return { data, options };
  }, [yearStats, accentHex, darkMode, textColor, gridColor]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[220px]">
      <div className="h-64 w-full max-w-[320px]">
        <Radar data={chartConfig.data} options={chartConfig.options} />
      </div>
    </div>
  );
}

/**
 * Gauge de media vuelta (half-circle) con el % de avance total de la carrera — un doughnut de
 * 180° con dos segmentos (aprobado / falta) y puntas redondeadas, con el número grande centrado
 * en el hueco inferior del semicírculo.
 */
export function AcademicGaugeChart({
  percent,
  subtitle,
  darkMode,
}: {
  percent: number;
  subtitle: string;
  darkMode: boolean;
}) {
  const accentHex = useAccentHex();
  const trackColor = darkMode ? "#27272a" : "#e2e8f0";
  const clamped = Math.max(0, Math.min(100, percent));

  const chartConfig = useMemo(() => {
    const data = {
      labels: ["Aprobado", "Falta"],
      datasets: [
        {
          data: [clamped, 100 - clamped],
          backgroundColor: [accentHex, trackColor],
          borderWidth: 0,
          borderRadius: 14,
          spacing: 2,
        },
      ],
    };

    const options: ChartOptions<"doughnut"> = {
      responsive: true,
      maintainAspectRatio: false,
      circumference: 180,
      rotation: -90,
      cutout: "75%",
      animation: { duration: 1100, easing: "easeOutQuart", animateRotate: true } as any,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    };

    return { data, options };
  }, [clamped, accentHex, trackColor]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] gap-1">
      <div className="relative h-48 w-72 max-w-full">
        <Doughnut data={chartConfig.data} options={chartConfig.options} />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-3xl font-black" style={{ color: accentHex }}>
            <AnimatedNumber value={clamped} format={(n) => `${Math.round(n)}%`} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-center px-2">
            {subtitle}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Barras de avance de estudio por materia fijada: acento = % de archivos marcados como
 * estudiados, gris = lo que falta — mismo estilo apilado/redondeado que CategoryComparisonBarChart
 * en Finanzas, con rebote y entrada escalonada.
 */
export function StudyProgressBarChart({
  rows,
  darkMode,
}: {
  rows: { materia: string; donePercent: number }[];
  darkMode: boolean;
}) {
  const accentHex = useAccentHex();
  const gridColor = darkMode ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
  const textColor = darkMode ? "#a1a1aa" : "#64748b";
  const trackColor = darkMode ? "#27272a" : "#e2e8f0";

  const chartConfig = useMemo(() => {
    if (rows.length === 0) return null;

    const truncateLabel = (label: string) => (label.length > 10 ? `${label.slice(0, 9)}…` : label);

    const data = {
      labels: rows.map((r) => r.materia),
      datasets: [
        {
          label: "Avanzado",
          data: rows.map((r) => Math.round(r.donePercent)),
          backgroundColor: accentHex,
          borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 8, bottomRight: 8 },
          borderSkipped: false,
          stack: "s",
        },
        {
          label: "Falta",
          data: rows.map((r) => 100 - Math.round(r.donePercent)),
          backgroundColor: trackColor,
          borderRadius: 0,
          borderSkipped: false,
          stack: "s",
        },
      ],
    };

    const options: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y" as const,
      animation: {
        duration: 900,
        easing: "easeOutBounce",
        delay: (ctx) => (ctx.type === "data" ? ctx.dataIndex * 90 : 0),
      },
      scales: {
        x: {
          stacked: true,
          min: 0,
          max: 100,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 9 }, callback: (v) => `${v}%` },
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { size: 9, weight: "bold" },
            autoSkip: false,
            callback: (_value, index) => truncateLabel(rows[index].materia),
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: makeExternalTooltipHandler(darkMode),
          callbacks: {
            title: (items: TooltipItem<"bar">[]) => rows[items[0].dataIndex].materia,
            label: (ctx: TooltipItem<"bar">) =>
              ctx.datasetIndex === 0
                ? `Avanzado: ${ctx.raw}%`
                : `Falta: ${ctx.raw}%`,
          },
        },
      },
    };

    return { data, options };
  }, [rows, accentHex, trackColor, darkMode, gridColor, textColor]);

  if (!chartConfig) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 italic px-4 text-center">
        Fijá una materia para ver su avance acá.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[220px]">
      <Bar data={chartConfig.data} options={chartConfig.options} />
    </div>
  );
}
