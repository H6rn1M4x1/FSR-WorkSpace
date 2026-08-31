import React from "react";
import { Loader2 } from "lucide-react";

interface PageSkeletonProps {
  tab: string;
  darkMode: boolean;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ tab, darkMode }) => {
  const containerBg = darkMode ? "bg-zinc-950/20" : "bg-slate-50/50";
  const cardBg = darkMode ? "bg-zinc-900/40 border-zinc-800/80" : "bg-white border-zinc-200/90";
  const skeletonMuted = darkMode ? "bg-zinc-800/40" : "bg-zinc-200/50";
  const skeletonBright = darkMode ? "bg-zinc-700/30" : "bg-zinc-300/40";
  const textMuted = darkMode ? "text-zinc-500" : "text-slate-400";

  // Helper for generating lines
  const renderLines = (count: number, widths: string[]) => {
    return Array.from({ length: count }).map((_, i) => (
      <div
        key={`line-${i}`}
        className={`h-3.5 rounded-lg ${skeletonMuted}`}
        style={{ width: widths[i % widths.length] }}
      />
    ));
  };

  const renderHomeSkeleton = () => {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
        {/* Welcome Header */}
        <div className={`p-6 rounded-2xl border ${cardBg} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
          <div className="space-y-2 w-full md:w-auto">
            <div className={`h-6 w-48 rounded-xl ${skeletonBright}`} />
            <div className={`h-3.5 w-64 rounded-lg ${skeletonMuted}`} />
          </div>
          <div className="flex gap-2">
            <div className={`h-8 w-24 rounded-full ${skeletonBright}`} />
            <div className={`h-8 w-24 rounded-full ${skeletonMuted}`} />
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-center gap-3 p-3.5 px-4 rounded-xl border border-primary/20 bg-primary/[0.03] text-primary/90 text-xs font-semibold shadow-sm">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          <span>Sincronizando y cargando apuntes de Google Drive...</span>
        </div>

        {/* 4 Stat/Alert Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`stat-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-3`}>
              <div className="flex justify-between items-center">
                <div className={`w-8 h-8 rounded-xl ${skeletonMuted}`} />
                <div className={`w-16 h-3 rounded-lg ${skeletonMuted}`} />
              </div>
              <div className={`h-6 w-3/4 rounded-xl ${skeletonBright}`} />
              <div className={`h-3 w-1/2 rounded-lg ${skeletonMuted}`} />
            </div>
          ))}
        </div>

        {/* Two Columns: Left main events, Right secondary logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} space-y-4`}>
            <div className="flex justify-between items-center pb-4 border-b border-zinc-200/55 dark:border-zinc-800/50">
              <div className={`h-5 w-40 rounded-lg ${skeletonBright}`} />
              <div className={`h-8 w-24 rounded-full ${skeletonMuted}`} />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`event-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/20 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800">
                  <div className="flex items-center gap-3 w-3/4">
                    <div className={`w-10 h-10 rounded-xl ${skeletonMuted} shrink-0`} />
                    <div className="space-y-2 w-full">
                      <div className={`h-3.5 w-1/2 rounded ${skeletonBright}`} />
                      <div className={`h-3 w-1/3 rounded ${skeletonMuted}`} />
                    </div>
                  </div>
                  <div className={`h-6 w-16 rounded-full ${skeletonMuted}`} />
                </div>
              ))}
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
            <div className="pb-4 border-b border-zinc-200/55 dark:border-zinc-800/50">
              <div className={`h-5 w-32 rounded-lg ${skeletonBright}`} />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`side-${i}`} className="space-y-2">
                  <div className="flex justify-between">
                    <div className={`h-3.5 w-1/2 rounded ${skeletonBright}`} />
                    <div className={`h-3 w-12 rounded ${skeletonMuted}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-full rounded bg-zinc-200/30 dark:bg-zinc-800/30 overflow-hidden`}>
                      <div className={`h-full w-2/3 rounded ${skeletonBright}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAcademicSkeleton = () => {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
        {/* Navigation Tabs Mock */}
        <div className="flex gap-2 border-b border-zinc-200/55 dark:border-zinc-800/50 pb-px overflow-x-auto scrollbar-none">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`tab-${i}`} className={`h-8 w-24 rounded-t-xl ${i === 0 ? skeletonBright : skeletonMuted} shrink-0`} />
          ))}
        </div>

        {/* Info Banner */}
        <div className="flex items-center gap-3 p-3.5 px-4 rounded-xl border border-primary/20 bg-primary/[0.03] text-primary/90 text-xs font-semibold shadow-sm animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          <span>Cargando plan académico y apuntes...</span>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`subject-${i}`} className={`p-5 rounded-2xl border ${cardBg} relative overflow-hidden space-y-4`}>
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-3/4">
                  <div className={`h-5 w-11/12 rounded-lg ${skeletonBright}`} />
                  <div className={`h-3 w-1/2 rounded-lg ${skeletonMuted}`} />
                </div>
                <div className={`w-8 h-8 rounded-xl ${skeletonMuted}`} />
              </div>
              <div className="flex gap-3 pt-2">
                <div className={`h-6 w-20 rounded-full ${skeletonMuted}`} />
                <div className={`h-6 w-20 rounded-full ${skeletonMuted}`} />
              </div>
              <div className="space-y-2 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3">
                <div className="flex justify-between text-xs">
                  <div className={`h-3 w-20 rounded ${skeletonMuted}`} />
                  <div className={`h-3 w-10 rounded ${skeletonMuted}`} />
                </div>
                <div className="w-full bg-zinc-200/30 dark:bg-zinc-800/30 h-2 rounded-full overflow-hidden">
                  <div className={`h-full w-3/4 rounded ${skeletonBright}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMealsSkeleton = () => {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
        <div className="flex justify-between items-center">
          <div className={`h-7 w-48 rounded-xl ${skeletonBright}`} />
          <div className={`h-9 w-28 rounded-full ${skeletonMuted}`} />
        </div>

        {/* Weekly schedule layout */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`day-${i}`} className={`p-4 rounded-2xl border ${cardBg} space-y-3 flex flex-col justify-between min-h-[180px]`}>
              <div>
                <div className={`h-4 w-12 rounded-md ${skeletonBright} mb-3`} />
                <div className="space-y-2">
                  <div className={`h-3 w-full rounded ${skeletonMuted}`} />
                  <div className={`h-3 w-4/5 rounded ${skeletonMuted}`} />
                </div>
              </div>
              <div className="space-y-1 pt-3 border-t border-zinc-200/30 dark:border-zinc-800/30">
                <div className={`h-2.5 w-full rounded bg-zinc-200/20 dark:bg-zinc-800/20`} />
                <div className={`h-2.5 w-2/3 rounded bg-zinc-200/20 dark:bg-zinc-800/20`} />
              </div>
            </div>
          ))}
        </div>

        {/* Pantry lists and purchases skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`list-col-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-4`}>
              <div className={`h-5 w-32 rounded-lg ${skeletonBright}`} />
              <div className="space-y-2.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={`item-${i}-${j}`} className="flex items-center gap-3 justify-between py-1.5">
                    <div className="flex items-center gap-2 w-3/4">
                      <div className={`w-4 h-4 rounded ${skeletonMuted} shrink-0`} />
                      <div className={`h-3 w-5/6 rounded ${skeletonMuted}`} />
                    </div>
                    <div className={`h-4 w-8 rounded ${skeletonMuted}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFinanceSkeleton = () => {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`kpi-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-3`}>
              <div className={`h-3.5 w-28 rounded ${skeletonMuted}`} />
              <div className={`h-8 w-44 rounded-xl ${skeletonBright}`} />
              <div className="flex items-center gap-1.5 pt-1">
                <div className={`w-3.5 h-3.5 rounded-full ${skeletonMuted}`} />
                <div className={`h-3 w-32 rounded ${skeletonMuted}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Finances Main Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} space-y-4`}>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200/55 dark:border-zinc-800/50">
              <div className={`h-5 w-44 rounded-lg ${skeletonBright}`} />
              <div className="flex gap-2">
                <div className={`h-7 w-20 rounded-full ${skeletonMuted}`} />
                <div className={`h-7 w-20 rounded-full ${skeletonMuted}`} />
              </div>
            </div>

            {/* List representing transactions */}
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`txn-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/30 dark:bg-zinc-900/10 border border-transparent">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${skeletonMuted}`} />
                    <div>
                      <div className={`h-3.5 w-36 rounded ${skeletonBright} mb-1`} />
                      <div className={`h-2.5 w-24 rounded ${skeletonMuted}`} />
                    </div>
                  </div>
                  <div className={`h-4 w-16 rounded ${skeletonBright}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Budget Categories */}
          <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
            <div className={`h-5 w-32 rounded-lg ${skeletonBright} pb-2`} />
            <div className="space-y-4 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`budget-${i}`} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <div className={`h-3 w-24 rounded ${skeletonMuted}`} />
                    <div className={`h-3 w-16 rounded ${skeletonMuted}`} />
                  </div>
                  <div className="w-full bg-zinc-200/30 dark:bg-zinc-800/30 h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full w-2/3 rounded-full ${skeletonBright}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAppointmentsSkeleton = () => {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className={`h-7 w-48 rounded-xl ${skeletonBright}`} />
            <div className={`h-3 w-64 rounded ${skeletonMuted}`} />
          </div>
          <div className={`h-9 w-32 rounded-full ${skeletonBright}`} />
        </div>

        {/* Large visual list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`appointment-${i}`} className={`p-5 rounded-2xl border ${cardBg} space-y-4`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full ${skeletonMuted}`} />
                  <div>
                    <div className={`h-4.5 w-40 rounded ${skeletonBright} mb-1.5`} />
                    <div className={`h-3 w-28 rounded ${skeletonMuted}`} />
                  </div>
                </div>
                <div className={`h-6 w-16 rounded-full ${skeletonMuted}`} />
              </div>
              <div className="space-y-2 pt-2 border-t border-zinc-200/30 dark:border-zinc-800/30">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${skeletonMuted}`} />
                  <div className={`h-3 w-48 rounded ${skeletonMuted}`} />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${skeletonMuted}`} />
                  <div className={`h-3 w-36 rounded ${skeletonMuted}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHealthSkeleton = () => {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 md:py-6">
        {/* Row with medical metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`health-metric-${i}`} className={`p-4 rounded-2xl border ${cardBg} space-y-2`}>
              <div className={`h-3 w-16 rounded ${skeletonMuted}`} />
              <div className={`h-6 w-24 rounded-lg ${skeletonBright}`} />
              <div className={`h-2 w-12 rounded ${skeletonMuted}`} />
            </div>
          ))}
        </div>

        {/* Mock Chart & Med List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} space-y-4`}>
            <div className={`h-5 w-48 rounded-lg ${skeletonBright}`} />
            <div className={`h-48 w-full rounded-2xl ${skeletonMuted} flex items-center justify-center`}>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${textMuted}`}>Cargando Gráfica de Presión y Pulsaciones...</span>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
            <div className={`h-5 w-36 rounded-lg ${skeletonBright}`} />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`med-${i}`} className="flex items-center justify-between py-2 border-b border-zinc-200/20 dark:border-zinc-800/20">
                  <div className="space-y-1.5">
                    <div className={`h-3.5 w-24 rounded ${skeletonBright}`} />
                    <div className={`h-2.5 w-16 rounded ${skeletonMuted}`} />
                  </div>
                  <div className={`h-6 w-12 rounded-full ${skeletonMuted}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAISkeleton = () => {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 h-[calc(100vh-140px)] flex flex-col justify-between">
        {/* Chat window mock */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-2">
          {/* AI bubble */}
          <div className="flex gap-3 max-w-[80%]">
            <div className={`w-8 h-8 rounded-full ${skeletonBright} shrink-0`} />
            <div className={`p-4 rounded-2xl rounded-tl-none ${cardBg} space-y-2 w-full`}>
              <div className={`h-3.5 w-5/6 rounded ${skeletonBright}`} />
              <div className={`h-3.5 w-3/4 rounded ${skeletonBright}`} />
              <div className={`h-3 w-1/2 rounded ${skeletonMuted}`} />
            </div>
          </div>

          {/* User bubble */}
          <div className="flex gap-3 max-w-[80%] ml-auto justify-end">
            <div className={`p-4 rounded-2xl rounded-tr-none bg-primary/10 border border-primary/20 space-y-2 w-full`}>
              <div className={`h-3.5 w-4/5 rounded bg-primary/20 ml-auto`} />
              <div className={`h-3.5 w-2/3 rounded bg-primary/20 ml-auto`} />
            </div>
            <div className={`w-8 h-8 rounded-full bg-primary/30 shrink-0`} />
          </div>

          {/* AI bubble loading */}
          <div className="flex gap-3 max-w-[70%]">
            <div className={`w-8 h-8 rounded-full ${skeletonBright} shrink-0`} />
            <div className={`p-4 rounded-2xl rounded-tl-none ${cardBg} space-y-2 w-full`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${skeletonBright} animate-bounce`} style={{ animationDelay: "0ms" }} />
                <div className={`w-2 h-2 rounded-full ${skeletonBright} animate-bounce`} style={{ animationDelay: "150ms" }} />
                <div className={`w-2 h-2 rounded-full ${skeletonBright} animate-bounce`} style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Prompt Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`prompt-${i}`} className={`p-3 rounded-xl border ${cardBg} space-y-1.5 cursor-wait`}>
              <div className={`h-3 w-5/6 rounded ${skeletonBright}`} />
              <div className={`h-2 w-2/3 rounded ${skeletonMuted}`} />
            </div>
          ))}
        </div>

        {/* Input mock */}
        <div className={`p-3 rounded-2xl border ${cardBg} flex items-center justify-between gap-3`}>
          <div className={`h-5 w-40 rounded-lg ${skeletonMuted} ml-2`} />
          <div className={`w-9 h-9 rounded-xl ${skeletonBright} shrink-0`} />
        </div>
      </div>
    );
  };

  // Dispatch Tab Skeleton View
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
      case "ai":
        return renderAISkeleton();
      default:
        return renderHomeSkeleton();
    }
  };

  return (
    <div className={`w-full min-h-screen ${containerBg} animate-pulse relative z-10 overflow-hidden`}>
      {renderTabSkeleton()}
    </div>
  );
};

export default PageSkeleton;
