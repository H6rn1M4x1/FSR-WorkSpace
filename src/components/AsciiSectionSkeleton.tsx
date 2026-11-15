import React from "react";
import { AsciiSkeleton } from "ascii-reveal";
import { AsciiCalendarGrid, AsciiStatCardsRow, AsciiCardWithList, AsciiChartBlock } from "./asciiSkeletonBlocks";

interface AsciiSectionSkeletonProps {
  tab: string;
  darkMode: boolean;
}

// Mismos contenedores (grid/flex/gaps/paddings) que PageSkeleton.tsx para que cada bloque ocupe
// exactamente el mismo lugar y tamaño que el bloque real — pero las placas sólidas se reemplazan
// por <AsciiSkeleton>, que es la que "decodifica" en ascii-reveal. Ver AsciiReveal/AsciiSkeleton
// en App.tsx: este componente se muestra mientras sectionLoading=true y, al pasar a false, el
// contenido real decodifica en su lugar.
export const AsciiSectionSkeleton: React.FC<AsciiSectionSkeletonProps> = ({ tab, darkMode }) => {
  const cardBg = darkMode ? "bg-zinc-900/40 border-zinc-800/80" : "bg-white border-zinc-200/90";
  let seed = 1;

  // Bloque rectangular (texto corto, barra, chip). h/w en rem o %, como en PageSkeleton.
  const B: React.FC<{ h: string; w: string; rows?: number; circle?: boolean; variant?: "dither" | "scan" | "braille" | "terminal"; className?: string }> = ({
    h,
    w,
    rows = 2,
    circle,
    variant = "scan",
    className = "",
  }) => (
    <AsciiSkeleton as="div" rows={rows} width={w} height={h} circle={circle} variant={variant} seed={seed++} className={className} />
  );

  // HomeView real: grid-cols-12, calendario lg:col-span-5 + "Agenda Central" lg:col-span-7
  // (sin fila de stat-cards — esa fila no existe en el componente real). Debajo, otra fila 5/7
  // con el widget del clima y el del equipo favorito.
  const renderHomeSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <AsciiCalendarGrid cardBg={cardBg} />
        </div>
        <div className={`lg:col-span-7 p-6 rounded-2xl border ${cardBg} space-y-4`}>
          <div className="flex justify-between items-center pb-4 border-b border-zinc-200/55 dark:border-zinc-800/50">
            <B h="1.25rem" w="10rem" rows={1} />
            <B h="2rem" w="6rem" rows={1} />
          </div>
          <div className="flex gap-2">
            <B h="1.5rem" w="4rem" rows={1} />
            <B h="1.5rem" w="4rem" rows={1} />
            <B h="1.5rem" w="4rem" rows={1} />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`event-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/20">
                <div className="flex items-center gap-3 w-3/4">
                  <B h="2.5rem" w="2.5rem" rows={4} circle />
                  <div className="space-y-2 w-full">
                    <B h="0.875rem" w="50%" rows={1} />
                    <B h="0.75rem" w="33%" rows={1} />
                  </div>
                </div>
                <B h="1.5rem" w="4rem" rows={1} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-5 p-6 rounded-2xl border ${cardBg} space-y-3`}>
          <B h="1.125rem" w="8rem" rows={1} />
          <B h="6rem" w="100%" rows={8} />
        </div>
        <div className={`lg:col-span-7 p-6 rounded-2xl border ${cardBg} space-y-3`}>
          <B h="1.125rem" w="10rem" rows={1} />
          <B h="6rem" w="100%" rows={8} />
        </div>
      </div>
    </div>
  );

  // AcademicView real ("Mis Estudios"): calendario 5 + agenda 7, luego tarjeta "Desempeño
  // Académico" (3 columnas: stats/gauge/radar), luego fila 2 columnas (pomodoro + materias).
  const renderAcademicSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <AsciiCalendarGrid cardBg={cardBg} />
        </div>
        <div className={`lg:col-span-7 p-6 rounded-2xl border ${cardBg} space-y-4`}>
          <B h="1.25rem" w="12rem" rows={1} />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`event-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/20">
                <B h="2rem" w="2rem" rows={3} circle />
                <B h="0.875rem" w="60%" rows={1} className="flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
        <B h="1.125rem" w="12rem" rows={1} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <B h="8rem" w="100%" rows={10} />
          <B h="8rem" w="100%" rows={10} />
          <B h="8rem" w="100%" rows={10} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-2xl border ${cardBg} space-y-3`}>
          <B h="1.125rem" w="8rem" rows={1} />
          <B h="5rem" w="100%" rows={6} />
        </div>
        <div className={`p-6 rounded-2xl border ${cardBg} space-y-3`}>
          <B h="1.125rem" w="10rem" rows={1} />
          <B h="5rem" w="100%" rows={6} />
        </div>
      </div>
    </div>
  );

  // MealsView real ("Mi Alimentación"): 3 columnas IGUALES (lg:col-span-4 de 12): calendario,
  // "Organización Semanal" (lista), "Checklist de Compras" (lista) — no una fila de 7 días.
  const renderMealsSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <AsciiCalendarGrid cardBg={cardBg} />
        </div>
        <div className="lg:col-span-4">
          <AsciiCardWithList count={4} cardBg={cardBg} />
        </div>
        <div className="lg:col-span-4">
          <AsciiCardWithList count={4} cardBg={cardBg} />
        </div>
      </div>
    </div>
  );

  // FinanceView real ("Mis Finanzas"): 3 tarjetas IGUALES (lg:col-span-4 de 12): Calendario de
  // Pagos, Facturas y Vencimientos, Historial de Pagos. Debajo, tarjeta "Resumen del Mes" con fila
  // de stats (2 + 1 ancha) y fila de gráficos (donut ancho + grilla 2x2 de charts).
  const renderFinanceSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <AsciiCalendarGrid cardBg={cardBg} />
        </div>
        <div className="lg:col-span-4">
          <AsciiCardWithList count={3} cardBg={cardBg} />
        </div>
        <div className="lg:col-span-4">
          <AsciiCardWithList count={3} cardBg={cardBg} />
        </div>
      </div>

      <div className={`p-6 rounded-2xl border ${cardBg} space-y-5`}>
        <div className="flex justify-between items-center">
          <B h="1.125rem" w="10rem" rows={1} />
          <div className="flex gap-1.5">
            <B h="1.75rem" w="1.75rem" rows={2} />
            <B h="1.75rem" w="1.75rem" rows={2} />
            <B h="1.75rem" w="1.75rem" rows={2} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <B h="4rem" w="100%" rows={3} />
          <B h="4rem" w="100%" rows={3} />
          <B h="4rem" w="100%" rows={3} className="lg:col-span-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <B h="14rem" w="100%" rows={16} />
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <B h="6.5rem" w="100%" rows={8} />
            <B h="6.5rem" w="100%" rows={8} />
            <B h="6.5rem" w="100%" rows={8} />
            <B h="6.5rem" w="100%" rows={8} />
          </div>
        </div>
      </div>
    </div>
  );

  // AppointmentsView real ("Mi Agenda"): calendario 5 + lista 7 (de 12), y un mapa a todo el
  // ancho debajo.
  const renderAppointmentsSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <AsciiCalendarGrid cardBg={cardBg} />
        </div>
        <div className={`lg:col-span-7 p-6 rounded-2xl border ${cardBg} space-y-4`}>
          <B h="1.25rem" w="10rem" rows={1} />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`appointment-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/20">
                <div className="flex items-center gap-3 w-3/4">
                  <B h="2.5rem" w="2.5rem" rows={4} circle />
                  <div className="space-y-2 w-full">
                    <B h="0.875rem" w="55%" rows={1} />
                    <B h="0.75rem" w="35%" rows={1} />
                  </div>
                </div>
                <B h="1.5rem" w="4rem" rows={1} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <B h="16rem" w="100%" rows={1} className="rounded-2xl" />
    </div>
  );

  // HealthView real ("Mi Salud") es largo y compuesto; se aproxima con sus bloques más grandes:
  // calendario 5 + lista 7 (medicamentos/turnos), fila de stats, y fila de 2 gráficos.
  const renderHealthSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <AsciiCalendarGrid cardBg={cardBg} />
        </div>
        <div className="lg:col-span-7">
          <AsciiCardWithList count={3} cardBg={cardBg} />
        </div>
      </div>

      <AsciiStatCardsRow count={4} cols="grid-cols-2 md:grid-cols-4" cardBg={cardBg} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AsciiChartBlock h="12rem" cardBg={cardBg} />
        <AsciiChartBlock h="12rem" cardBg={cardBg} />
      </div>
    </div>
  );

  const renderNotesSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="flex gap-2 border-b border-zinc-200/55 dark:border-zinc-800/50 pb-px overflow-x-auto scrollbar-none">
        {Array.from({ length: 3 }).map((_, i) => (
          <B key={`notes-tab-${i}`} h="2rem" w="7rem" rows={1} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`note-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-3 min-h-[160px]`}>
            <div className="flex justify-between items-start">
              <B h="1rem" w="66%" rows={1} />
              <B h="1.5rem" w="1.5rem" rows={2} />
            </div>
            <div className="space-y-2 pt-1">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={`note-line-${i}-${j}`} className="flex items-center gap-2">
                  <B h="0.875rem" w="0.875rem" rows={2} />
                  <B h="0.75rem" w={j % 2 === 0 ? "85%" : "60%"} rows={1} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabSkeleton = () => {
    switch (tab) {
      case "home":
        return renderHomeSkeleton();
      case "academic":
        return renderAcademicSkeleton();
      case "meals":
        return renderMealsSkeleton();
      case "finances":
        return renderFinanceSkeleton();
      case "appointments":
        return renderAppointmentsSkeleton();
      case "health":
        return renderHealthSkeleton();
      case "notes":
        return renderNotesSkeleton();
      default:
        return renderHomeSkeleton();
    }
  };

  return (
    <div className={`w-full min-h-screen ${darkMode ? "bg-zinc-950/20" : "bg-slate-50/50"} relative z-10 overflow-hidden`} data-ascii="skip">
      {renderTabSkeleton()}
    </div>
  );
};

export default AsciiSectionSkeleton;
