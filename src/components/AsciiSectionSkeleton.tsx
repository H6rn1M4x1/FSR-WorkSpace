import React from "react";
import { AsciiSkeleton } from "ascii-reveal";

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

  const renderHomeSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className={`p-6 rounded-2xl border ${cardBg} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
        <div className="space-y-2 w-full md:w-auto">
          <B h="1.5rem" w="12rem" rows={2} />
          <B h="0.875rem" w="16rem" rows={1} />
        </div>
        <div className="flex gap-2">
          <B h="2rem" w="6rem" rows={1} />
          <B h="2rem" w="6rem" rows={1} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`stat-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-3`}>
            <div className="flex justify-between items-center">
              <B h="2rem" w="2rem" rows={3} />
              <B h="0.75rem" w="4rem" rows={1} />
            </div>
            <B h="1.5rem" w="75%" rows={2} />
            <B h="0.75rem" w="50%" rows={1} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} space-y-4`}>
          <div className="flex justify-between items-center pb-4 border-b border-zinc-200/55 dark:border-zinc-800/50">
            <B h="1.25rem" w="10rem" rows={1} />
            <B h="2rem" w="6rem" rows={1} />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
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

        <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
          <div className="pb-4 border-b border-zinc-200/55 dark:border-zinc-800/50">
            <B h="1.25rem" w="8rem" rows={1} />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`side-${i}`} className="space-y-2">
                <div className="flex justify-between">
                  <B h="0.875rem" w="50%" rows={1} />
                  <B h="0.75rem" w="3rem" rows={1} />
                </div>
                <B h="0.625rem" w="100%" rows={1} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAcademicSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="flex gap-2 border-b border-zinc-200/55 dark:border-zinc-800/50 pb-px overflow-x-auto scrollbar-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <B key={`tab-${i}`} h="2rem" w="6rem" rows={1} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`subject-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-4`}>
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-3/4">
                <B h="1.25rem" w="90%" rows={1} />
                <B h="0.75rem" w="50%" rows={1} />
              </div>
              <B h="2rem" w="2rem" rows={3} />
            </div>
            <div className="flex gap-3 pt-2">
              <B h="1.5rem" w="5rem" rows={1} />
              <B h="1.5rem" w="5rem" rows={1} />
            </div>
            <div className="space-y-2 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3">
              <div className="flex justify-between text-xs">
                <B h="0.75rem" w="5rem" rows={1} />
                <B h="0.75rem" w="2.5rem" rows={1} />
              </div>
              <B h="0.5rem" w="100%" rows={1} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMealsSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="flex justify-between items-center">
        <B h="1.75rem" w="12rem" rows={2} />
        <B h="2.25rem" w="7rem" rows={1} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`day-${i}`} className={`p-4 rounded-2xl border ${cardBg} space-y-3 flex flex-col justify-between min-h-[180px]`}>
            <div className="space-y-2">
              <B h="1rem" w="3rem" rows={1} />
              <B h="0.75rem" w="100%" rows={1} />
              <B h="0.75rem" w="80%" rows={1} />
            </div>
            <div className="space-y-1 pt-3 border-t border-zinc-200/30 dark:border-zinc-800/30">
              <B h="0.625rem" w="100%" rows={1} />
              <B h="0.625rem" w="66%" rows={1} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`list-col-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-4`}>
            <B h="1.25rem" w="8rem" rows={1} />
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={`item-${i}-${j}`} className="flex items-center gap-3 justify-between py-1.5">
                  <div className="flex items-center gap-2 w-3/4">
                    <B h="1rem" w="1rem" rows={2} />
                    <B h="0.75rem" w="85%" rows={1} />
                  </div>
                  <B h="1rem" w="2rem" rows={1} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFinanceSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`kpi-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-3`}>
            <B h="0.875rem" w="7rem" rows={1} />
            <B h="2rem" w="11rem" rows={2} />
            <div className="flex items-center gap-1.5 pt-1">
              <B h="0.875rem" w="0.875rem" rows={2} circle />
              <B h="0.75rem" w="8rem" rows={1} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} space-y-4`}>
          <div className="flex justify-between items-center pb-3 border-b border-zinc-200/55 dark:border-zinc-800/50">
            <B h="1.25rem" w="11rem" rows={1} />
            <div className="flex gap-2">
              <B h="1.75rem" w="5rem" rows={1} />
              <B h="1.75rem" w="5rem" rows={1} />
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`txn-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/30 dark:bg-zinc-900/10">
                <div className="flex items-center gap-3">
                  <B h="2.25rem" w="2.25rem" rows={4} circle />
                  <div className="space-y-1">
                    <B h="0.875rem" w="9rem" rows={1} />
                    <B h="0.625rem" w="6rem" rows={1} />
                  </div>
                </div>
                <B h="1rem" w="4rem" rows={1} />
              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
          <B h="1.25rem" w="8rem" rows={1} />
          <div className="space-y-4 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`budget-${i}`} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <B h="0.75rem" w="6rem" rows={1} />
                  <B h="0.75rem" w="4rem" rows={1} />
                </div>
                <B h="0.625rem" w="100%" rows={1} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppointmentsSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <B h="1.75rem" w="12rem" rows={2} />
          <B h="0.75rem" w="16rem" rows={1} />
        </div>
        <B h="2.25rem" w="8rem" rows={1} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`appointment-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-4`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <B h="2.75rem" w="2.75rem" rows={4} circle />
                <div className="space-y-1.5">
                  <B h="1.125rem" w="10rem" rows={1} />
                  <B h="0.75rem" w="7rem" rows={1} />
                </div>
              </div>
              <B h="1.5rem" w="4rem" rows={1} />
            </div>
            <div className="space-y-2 pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
              <div className="flex items-center gap-2">
                <B h="1rem" w="1rem" rows={2} circle />
                <B h="0.75rem" w="12rem" rows={1} />
              </div>
              <div className="flex items-center gap-2">
                <B h="1rem" w="1rem" rows={2} circle />
                <B h="0.75rem" w="9rem" rows={1} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHealthSkeleton = () => (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`health-metric-${i}`} className={`p-4 rounded-2xl border ${cardBg} space-y-2`}>
            <B h="0.75rem" w="4rem" rows={1} />
            <B h="1.5rem" w="6rem" rows={2} />
            <B h="0.5rem" w="3rem" rows={1} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} space-y-4`}>
          <B h="1.25rem" w="12rem" rows={1} />
          <B h="12rem" w="100%" rows={16} />
        </div>

        <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
          <B h="1.25rem" w="9rem" rows={1} />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`med-${i}`} className="flex items-center justify-between py-2 border-b border-zinc-200/20 dark:border-zinc-800/20">
                <div className="space-y-1.5">
                  <B h="0.875rem" w="6rem" rows={1} />
                  <B h="0.625rem" w="4rem" rows={1} />
                </div>
                <B h="1.5rem" w="3rem" rows={1} />
              </div>
            ))}
          </div>
        </div>
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
