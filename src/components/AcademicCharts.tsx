import React, { useMemo } from "react";
import { motion } from "motion/react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  LineElement,
  PointElement,
  Filler,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Radar, Doughnut } from "react-chartjs-2";
import { AnimatedNumber } from "./AnimatedNumber";
import { useAccentHex, formatCompactNumber, makeExternalTooltipHandler } from "./FinanceCharts";

ChartJS.register(
  RadialLinearScale,
  LineElement,
  PointElement,
  Filler,
  ArcElement,
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
 * Barrita de avance de estudio de UNA materia fijada (% de archivos principales marcados como
 * estudiados). Se usa una por fila, al lado de su tarjeta de carpeta en "Material de Estudio" —
 * por eso no es un chart.js con varias categorías: así el ancho y el centro vertical de cada
 * barra quedan atados por CSS Grid a la fila de su propia tarjeta en vez de aproximarlos a mano.
 * Siempre con puntas redondeadas (también a 0%, cuando todavía no hay nada marcado) y el
 * porcentaje escrito adentro — el nombre de la materia no hace falta, ya está a la izquierda.
 */
export function StudyFolderProgressBar({
  percent,
  darkMode,
}: {
  percent: number;
  darkMode: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const trackColor = darkMode ? "bg-zinc-800" : "bg-zinc-200";

  return (
    <div className="w-full h-full flex items-center">
      <div className={`relative w-full h-9 rounded-full overflow-hidden ${trackColor}`}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        <div
          className={`absolute inset-0 flex items-center justify-center text-[11px] font-bold ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          {pct}%
        </div>
      </div>
    </div>
  );
}
