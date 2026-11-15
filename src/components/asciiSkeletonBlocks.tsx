import React from "react";
import { AsciiSkeleton } from "ascii-reveal";

// Piezas reutilizables para armar esqueletos ascii por bloque en las sub-pestañas internas de
// cada vista (Finanzas, Salud, Universidad, Comidas, Turnos). Mismo criterio que
// AsciiSectionSkeleton.tsx: contenedores (grid/flex/padding) iguales a los reales, placas
// <AsciiSkeleton> en vez de color sólido.

let seedCounter = 1;

export const Block: React.FC<{ h: string; w: string; rows?: number; circle?: boolean; className?: string }> = ({
  h,
  w,
  rows = 2,
  circle,
  className = "",
}) => <AsciiSkeleton as="div" rows={rows} width={w} height={h} circle={circle} variant="scan" seed={seedCounter++} className={className} />;

// cols: clases Tailwind de grid-cols copiadas tal cual del bloque real (varían bastante:
// "grid-cols-2 lg:grid-cols-4", "grid-cols-1 sm:grid-cols-3", etc.) — no se infieren del count.
export const AsciiStatCardsRow: React.FC<{ count?: number; cols?: string; cardBg: string }> = ({
  count = 4,
  cols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  cardBg,
}) => (
  <div className={`grid ${cols} gap-3`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={`stat-${i}`} className={`p-4 rounded-2xl border ${cardBg} space-y-2`}>
        <Block h="0.75rem" w="4rem" rows={1} />
        <Block h="1.5rem" w="70%" rows={2} />
        <Block h="0.5rem" w="50%" rows={1} />
      </div>
    ))}
  </div>
);

// Tarjeta con encabezado + lista de ítems compactos (p. ej. "Facturas y Vencimientos",
// "Historial de Pagos"): más angosta que AsciiListRows, sin avatar circular.
export const AsciiCardWithList: React.FC<{ count?: number; cardBg: string; className?: string }> = ({
  count = 3,
  cardBg,
  className = "",
}) => (
  <div className={`p-6 rounded-3xl border ${cardBg} space-y-4 ${className}`}>
    <div className="flex items-center justify-between">
      <Block h="1rem" w="55%" rows={1} />
      <Block h="1.75rem" w="1.75rem" rows={2} />
    </div>
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`cardlist-${i}`} className="p-3 rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30 space-y-1.5">
          <Block h="0.625rem" w="30%" rows={1} />
          <Block h="0.875rem" w="70%" rows={1} />
        </div>
      ))}
    </div>
  </div>
);

// cols: cantidad de columnas visibles de la tabla real (sus <th>) — más columnas = fila más
// "densa" (más celdas angostas), para que una tabla de 5 columnas no se vea igual que una de 13.
export const AsciiTableRows: React.FC<{ rows?: number; cols?: number; cardBg: string }> = ({ rows = 6, cols = 6, cardBg }) => {
  const cellCount = Math.max(2, Math.min(cols, 12));
  return (
    <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
      <div className="hidden md:flex items-center gap-4 px-4 py-2.5 border-b border-zinc-200/40 dark:border-zinc-800/40">
        {Array.from({ length: cellCount }).map((_, i) => (
          <Block key={`th-${i}`} h="0.625rem" w={i === 0 ? "12%" : "8%"} rows={1} className={i === 0 ? "flex-1" : ""} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={`row-${i}`}
          className="flex items-center gap-4 px-4 py-3 border-b border-zinc-200/30 dark:border-zinc-800/30 last:border-b-0"
        >
          {Array.from({ length: cellCount }).map((_, j) => (
            <Block key={`cell-${i}-${j}`} h="0.875rem" w={j === 0 ? "16%" : "9%"} rows={1} className={j === 0 ? "flex-1" : ""} />
          ))}
        </div>
      ))}
    </div>
  );
};

export const AsciiCardsGrid: React.FC<{ count?: number; cols?: string; cardBg: string }> = ({
  count = 6,
  cols = "sm:grid-cols-2 lg:grid-cols-3",
  cardBg,
}) => (
  <div className={`grid grid-cols-1 ${cols} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={`card-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-3 min-h-[140px]`}>
        <div className="flex justify-between items-start">
          <Block h="1rem" w="66%" rows={1} />
          <Block h="1.5rem" w="1.5rem" rows={2} />
        </div>
        <Block h="0.75rem" w="90%" rows={1} />
        <Block h="0.75rem" w="60%" rows={1} />
      </div>
    ))}
  </div>
);

export const AsciiListRows: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={`list-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100/40 dark:bg-zinc-900/20">
        <Block h="2.25rem" w="2.25rem" rows={4} circle />
        <div className="space-y-2 flex-1">
          <Block h="0.875rem" w="50%" rows={1} />
          <Block h="0.75rem" w="33%" rows={1} />
        </div>
        <Block h="1.5rem" w="4rem" rows={1} />
      </div>
    ))}
  </div>
);

export const AsciiCalendarGrid: React.FC<{ cardBg: string }> = ({ cardBg }) => (
  <div className={`p-4 rounded-2xl border ${cardBg} space-y-3`}>
    <div className="flex justify-between items-center">
      <Block h="1.125rem" w="8rem" rows={1} />
      <div className="flex gap-2">
        <Block h="1.75rem" w="1.75rem" rows={2} />
        <Block h="1.75rem" w="1.75rem" rows={2} />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: 35 }).map((_, i) => (
        <Block key={`day-${i}`} h="2.25rem" w="100%" rows={1} />
      ))}
    </div>
  </div>
);

// Horario semanal (WeeklyScheduleGrid): columnas por día con franjas horarias angostas, NO un
// calendario mensual de 7 columnas — forma bien distinta, de ahí un bloque aparte.
export const AsciiWeeklyTimetable: React.FC<{ days?: number; cardBg: string }> = ({ days = 6, cardBg }) => (
  <div className={`p-4 rounded-2xl border ${cardBg} space-y-3`}>
    <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
      {Array.from({ length: days }).map((_, i) => (
        <Block key={`daylabel-${i}`} h="1.25rem" w="100%" rows={1} />
      ))}
    </div>
    <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
      {Array.from({ length: days }).map((_, col) => (
        <div key={`daycol-${col}`} className="space-y-1">
          {Array.from({ length: 10 }).map((_, row) => (
            <Block key={`slot-${col}-${row}`} h="1.1rem" w="100%" rows={1} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const AsciiChartBlock: React.FC<{ h?: string; cardBg: string }> = ({ h = "12rem", cardBg }) => (
  <div className={`p-5 rounded-2xl border ${cardBg} space-y-3`}>
    <Block h="1.125rem" w="10rem" rows={1} />
    <Block h={h} w="100%" rows={14} />
  </div>
);

// Fila de tarjetas de stats (opcional) + tabla — FinanceView/HealthView/MealsView/AcademicView
// usan esta forma para sus listados internos, pero no todas tienen fila de stats (ver statCount=0).
export const AsciiStatsPlusTable: React.FC<{
  statCount?: number;
  statCols?: string;
  tableRows?: number;
  tableCols?: number;
  cardBg: string;
}> = ({ statCount = 4, statCols, tableRows = 6, tableCols = 6, cardBg }) => (
  <div className="space-y-4">
    {statCount > 0 && <AsciiStatCardsRow count={statCount} cols={statCols} cardBg={cardBg} />}
    <AsciiTableRows rows={tableRows} cols={tableCols} cardBg={cardBg} />
  </div>
);

// Panel lateral de ancho fijo (ej. formulario) + calendario mensual a la derecha — patrón de
// Alimentación/Historial Diario en Salud.
export const AsciiSidebarPlusCalendar: React.FC<{ cardBg: string }> = ({ cardBg }) => (
  <div className="lg:flex lg:gap-6 lg:items-start">
    <div className={`w-full lg:w-[320px] shrink-0 mb-6 lg:mb-0 rounded-2xl border ${cardBg} p-4 space-y-3`}>
      <Block h="0.875rem" w="50%" rows={1} />
      <Block h="2rem" w="100%" rows={2} />
      <Block h="2rem" w="100%" rows={2} />
      <Block h="2.5rem" w="100%" rows={3} />
    </div>
    <div className="flex-1">
      <AsciiCalendarGrid cardBg={cardBg} />
    </div>
  </div>
);
