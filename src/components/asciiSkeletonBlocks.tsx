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

export const AsciiStatCardsRow: React.FC<{ count?: number; cardBg: string }> = ({ count = 4, cardBg }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(count, 4)} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={`stat-${i}`} className={`p-4 rounded-2xl border ${cardBg} space-y-2`}>
        <Block h="0.75rem" w="4rem" rows={1} />
        <Block h="1.5rem" w="70%" rows={2} />
        <Block h="0.5rem" w="50%" rows={1} />
      </div>
    ))}
  </div>
);

export const AsciiTableRows: React.FC<{ rows?: number; cardBg: string }> = ({ rows = 6, cardBg }) => (
  <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={`row-${i}`}
        className="flex items-center justify-between gap-4 px-4 py-3 border-b border-zinc-200/30 dark:border-zinc-800/30 last:border-b-0"
      >
        <Block h="2rem" w="2rem" rows={3} circle />
        <Block h="0.875rem" w="30%" rows={1} className="flex-1" />
        <Block h="0.875rem" w="15%" rows={1} />
        <Block h="0.875rem" w="15%" rows={1} />
        <Block h="1.5rem" w="4rem" rows={1} />
      </div>
    ))}
  </div>
);

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

export const AsciiChartBlock: React.FC<{ h?: string; cardBg: string }> = ({ h = "12rem", cardBg }) => (
  <div className={`p-5 rounded-2xl border ${cardBg} space-y-3`}>
    <Block h="1.125rem" w="10rem" rows={1} />
    <Block h={h} w="100%" rows={14} />
  </div>
);

// Fila de dos sub-paneles tipo "tabla con tarjetas de stats arriba" — FinanceView/HealthView/
// MealsView/AcademicView usan todas esta misma forma para sus listados internos.
export const AsciiStatsPlusTable: React.FC<{ statCount?: number; tableRows?: number; cardBg: string }> = ({
  statCount = 4,
  tableRows = 6,
  cardBg,
}) => (
  <div className="space-y-4">
    <AsciiStatCardsRow count={statCount} cardBg={cardBg} />
    <AsciiTableRows rows={tableRows} cardBg={cardBg} />
  </div>
);
