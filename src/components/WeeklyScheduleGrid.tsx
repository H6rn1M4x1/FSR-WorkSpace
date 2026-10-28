import React, { useRef, useState, useCallback, useEffect } from "react";
import { Paintbrush, Eraser, Copy, Trash2, Clock, Check } from "lucide-react";
import { HorarioItem } from "../types";
import { AnimatedNumber } from "./AnimatedNumber";
import { CustomSelect } from "./CustomSelect";

const DIAS: HorarioItem["dia"][] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const DIAS_CORTO: Record<string, string> = {
  Lunes: "Lun",
  Martes: "Mar",
  Miércoles: "Mié",
  Jueves: "Jue",
  Viernes: "Vie",
  Sábado: "Sáb",
};

const SLOT_MIN = 30;
const ROW_PX = 22;
const DEFAULT_START_MIN = 7 * 60;
const DEFAULT_END_MIN = 22 * 60;
const MIN_BLOCK_MIN = 30;
const DEFAULT_CLICK_DURATION_MIN = 60;
const CLICK_THRESHOLD_PX = 6;

// Misma paleta de colores de acento que usan los gráficos de la app (ver chartColors en
// FinanceView.tsx), para que los bloques pintados se sientan parte del mismo sistema visual.
const MATERIA_PALETTE = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#EF4444", // red
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
];

function colorForMateria(materia: string): string {
  if (!materia) return MATERIA_PALETTE[0];
  let h = 0;
  for (let i = 0; i < materia.length; i++) h = (h * 31 + materia.charCodeAt(i)) >>> 0;
  return MATERIA_PALETTE[h % MATERIA_PALETTE.length];
}

const parseTimeMin = (t: string): number => {
  const [h, m] = (t || "0:0").split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
};
const minToTime = (min: number): string => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, min));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
const formatHM = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, "0")}`;
};

type DragState =
  | { type: "create" | "erase"; dia: string; anchorMin: number; currentMin: number; startClientY: number; rectTop: number }
  | { type: "resize"; dia: string; id: string; fixedStartMin: number; currentEndMin: number; rectTop: number };

export interface WeeklyScheduleGridBatch {
  toDelete: string[];
  toUpsert: HorarioItem[];
}

interface WeeklyScheduleGridProps {
  horarios: HorarioItem[];
  darkMode: boolean;
  /** Materias disponibles para el pincel, ya ordenadas — se eligen con un clic, nunca abriendo un menú. */
  materiaOptions: string[];
  /** Materia actualmente activa en el pincel; "" si no hay ninguna (no se puede pintar). */
  selectedMateria: string;
  onSelectMateria: (materia: string) => void;
  /** Pintar (o el botón "Agregar Horario" del panel) crea el horario directo con la materia
   * activa y los datos del panel — no pasa por ningún modal. */
  onDirectCreate: (
    dia: string,
    horaInicio: string,
    horaFin: string,
    materia: string,
    aulas: string,
    profesores: string,
  ) => void;
  onEditBlock: (horario: HorarioItem) => void;
  onBatchUpdate: (batch: WeeklyScheduleGridBatch) => void;
  onClearWeek: () => void;
  onCopyDayToOthers: (dia: string) => void;
  generateId: (prefix: string) => string;
}

export function WeeklyScheduleGrid({
  horarios,
  darkMode,
  materiaOptions,
  selectedMateria,
  onSelectMateria,
  onDirectCreate,
  onEditBlock,
  onBatchUpdate,
  onClearWeek,
  onCopyDayToOthers,
  generateId,
}: WeeklyScheduleGridProps) {
  const [mode, setMode] = useState<"pintar" | "borrar">("pintar");
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Panel izquierdo: mismos campos que tenía el modal "Nuevo Horario" (Día/Hora Inicio/Hora
  // Fin para el alta manual, Aula/s y Profesor/es que además viajan con cada trazo pintado).
  const [panelDia, setPanelDia] = useState<string>(DIAS[0]);
  const [panelHoraInicio, setPanelHoraInicio] = useState("08:00");
  const [panelHoraFin, setPanelHoraFin] = useState("10:00");
  const [panelAulas, setPanelAulas] = useState("");
  const [panelProfesores, setPanelProfesores] = useState("");

  const gridStartMin = horarios.reduce(
    (min, h) => Math.min(min, Math.floor(parseTimeMin(h.horaInicio) / 60) * 60),
    DEFAULT_START_MIN,
  );
  const gridEndMin = horarios.reduce(
    (max, h) => Math.max(max, Math.ceil(parseTimeMin(h.horaFin) / 60) * 60),
    DEFAULT_END_MIN,
  );
  const totalRows = Math.max(1, (gridEndMin - gridStartMin) / SLOT_MIN);
  const totalHeight = totalRows * ROW_PX;

  const totalHoras = horarios.reduce(
    (sum, h) => sum + Math.max(0, parseTimeMin(h.horaFin) - parseTimeMin(h.horaInicio)) / 60,
    0,
  );

  const minutesFromClientY = useCallback(
    (clientY: number, rectTop: number) => {
      const offsetY = clientY - rectTop;
      const rawMin = gridStartMin + (offsetY / ROW_PX) * SLOT_MIN;
      const snapped = Math.round(rawMin / SLOT_MIN) * SLOT_MIN;
      return Math.max(gridStartMin, Math.min(gridEndMin, snapped));
    },
    [gridStartMin, gridEndMin],
  );

  const commitCreate = useCallback(
    (dia: string, anchorMin: number, currentMin: number, startClientY: number, lastClientY: number) => {
      if (!selectedMateria) return;
      const movedPx = Math.abs(lastClientY - startClientY);
      let lo = Math.min(anchorMin, currentMin);
      let hi = Math.max(anchorMin, currentMin);
      if (movedPx < CLICK_THRESHOLD_PX || hi - lo < MIN_BLOCK_MIN) {
        hi = Math.min(gridEndMin, lo + DEFAULT_CLICK_DURATION_MIN);
      }
      if (hi - lo < MIN_BLOCK_MIN) return;
      onDirectCreate(dia, minToTime(lo), minToTime(hi), selectedMateria, panelAulas, panelProfesores);
    },
    [gridEndMin, onDirectCreate, selectedMateria, panelAulas, panelProfesores],
  );

  const commitErase = useCallback(
    (dia: string, anchorMin: number, currentMin: number, startClientY: number, lastClientY: number) => {
      let lo = Math.min(anchorMin, currentMin);
      let hi = Math.max(anchorMin, currentMin);
      const movedPx = Math.abs(lastClientY - startClientY);
      if (movedPx < CLICK_THRESHOLD_PX) {
        // Clic simple (sin arrastre): si cayó sobre un bloque existente, lo borra entero.
        const hit = horarios.find(
          (h) => h.dia === dia && parseTimeMin(h.horaInicio) <= lo && parseTimeMin(h.horaFin) > lo,
        );
        if (!hit) return;
        onBatchUpdate({ toDelete: [hit.id], toUpsert: [] });
        return;
      }
      if (hi - lo < 5) return;

      const dayHorarios = horarios.filter((h) => h.dia === dia);
      const toDelete: string[] = [];
      const toUpsert: HorarioItem[] = [];

      dayHorarios.forEach((h) => {
        const hLo = parseTimeMin(h.horaInicio);
        const hHi = parseTimeMin(h.horaFin);
        if (hHi <= lo || hLo >= hi) return; // sin superposición

        if (lo <= hLo && hi >= hHi) {
          toDelete.push(h.id); // cubierto por completo
          return;
        }
        if (lo > hLo && hi < hHi) {
          // el borrado cae en el medio: parte el bloque en dos
          toUpsert.push({ ...h, horaFin: minToTime(lo) });
          toUpsert.push({ ...h, id: generateId("hor"), horaInicio: minToTime(hi) });
          return;
        }
        if (lo <= hLo) {
          toUpsert.push({ ...h, horaInicio: minToTime(hi) }); // recorta el inicio
          return;
        }
        toUpsert.push({ ...h, horaFin: minToTime(lo) }); // recorta el final
      });

      if (toDelete.length === 0 && toUpsert.length === 0) return;
      onBatchUpdate({ toDelete, toUpsert });
    },
    [horarios, onBatchUpdate, generateId],
  );

  const commitResize = useCallback(
    (id: string, fixedStartMin: number, currentEndMin: number) => {
      const original = horarios.find((h) => h.id === id);
      if (!original) return;
      const endMin = Math.max(fixedStartMin + MIN_BLOCK_MIN, currentEndMin);
      if (minToTime(endMin) === original.horaFin) return;
      onBatchUpdate({ toDelete: [], toUpsert: [{ ...original, horaFin: minToTime(endMin) }] });
    },
    [horarios, onBatchUpdate],
  );

  // Pointer move/up a nivel de window mientras se arrastra — así el gesto sigue funcionando
  // aunque el cursor salga del límite exacto de la columna del día.
  useEffect(() => {
    if (!drag) return;

    const handleMove = (e: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      if (current.type === "resize") {
        const min = minutesFromClientY(e.clientY, current.rectTop);
        setDrag({ ...current, currentEndMin: Math.max(current.fixedStartMin + MIN_BLOCK_MIN, min) });
      } else {
        const min = minutesFromClientY(e.clientY, current.rectTop);
        setDrag({ ...current, currentMin: min });
      }
    };

    const handleUp = (e: PointerEvent) => {
      const current = dragRef.current;
      setDrag(null);
      dragRef.current = null;
      if (!current) return;
      if (current.type === "create") {
        commitCreate(current.dia, current.anchorMin, current.currentMin, current.startClientY, e.clientY);
      } else if (current.type === "erase") {
        commitErase(current.dia, current.anchorMin, current.currentMin, current.startClientY, e.clientY);
      } else if (current.type === "resize") {
        commitResize(current.id, current.fixedStartMin, current.currentEndMin);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, minutesFromClientY, commitCreate, commitErase, commitResize]);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const startColumnDrag = (e: React.PointerEvent, dia: string) => {
    if (mode === "pintar" && !selectedMateria) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const startMin = minutesFromClientY(e.clientY, rect.top);
    const next: DragState = {
      type: mode === "pintar" ? "create" : "erase",
      dia,
      anchorMin: startMin,
      currentMin: startMin,
      startClientY: e.clientY,
      rectTop: rect.top,
    };
    dragRef.current = next;
    setDrag(next);
  };

  const startResizeDrag = (e: React.PointerEvent, dia: string, h: HorarioItem) => {
    e.stopPropagation();
    const column = (e.currentTarget as HTMLElement).closest("[data-day-column]") as HTMLElement | null;
    const rect = column ? column.getBoundingClientRect() : (e.currentTarget as HTMLElement).getBoundingClientRect();
    const next: DragState = {
      type: "resize",
      dia,
      id: h.id,
      fixedStartMin: parseTimeMin(h.horaInicio),
      currentEndMin: parseTimeMin(h.horaFin),
      rectTop: rect.top,
    };
    dragRef.current = next;
    setDrag(next);
  };

  const hourMarks: number[] = [];
  for (let m = gridStartMin; m <= gridEndMin; m += 60) hourMarks.push(m);

  const canManualAdd = Boolean(selectedMateria && panelHoraInicio && panelHoraFin && panelHoraFin > panelHoraInicio);

  const handleManualAdd = () => {
    if (!canManualAdd) return;
    onDirectCreate(panelDia, panelHoraInicio, panelHoraFin, selectedMateria, panelAulas, panelProfesores);
  };

  return (
    <div
      className={`p-6 rounded-3xl border scroll-reveal ${
        darkMode ? "bg-black/85 backdrop-blur-md border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
      }`}
    >
      <div className="lg:flex lg:gap-6 lg:items-start">
        {/* Panel izquierdo: mismas funciones que tenía el modal "Nuevo Horario" (materia, día,
            horas, aula, profesor) pero siempre visible — el pincel se elige acá, nunca en un
            menú, y también alimenta lo que se pinta arrastrando sobre la rejilla. */}
        <div
          className={`w-full lg:w-[280px] shrink-0 mb-6 lg:mb-0 rounded-2xl border p-4 space-y-3.5 ${
            darkMode ? "bg-zinc-950/40 border-zinc-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Paintbrush className="w-3.5 h-3.5 text-primary" />
            Pincel / Nuevo Horario
          </h4>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Materia
            </label>
            <div className="flex flex-wrap gap-1.5">
              {materiaOptions.length === 0 ? (
                <span className="text-[11px] text-zinc-500 italic">Sin materias para cursar</span>
              ) : (
                materiaOptions.map((m) => {
                  const color = colorForMateria(m);
                  const isActive = selectedMateria === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onSelectMateria(m)}
                      title={m}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold border-2 transition-all cursor-pointer ${
                        isActive ? "text-white shadow-sm" : "bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                      }`}
                      style={isActive ? { backgroundColor: color, borderColor: color } : { borderColor: `${color}55`, color }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: isActive ? "#ffffff" : color }}
                      />
                      <span className="truncate max-w-[130px]">{m}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Día
            </label>
            <CustomSelect
              value={panelDia}
              onChange={(val) => setPanelDia(val)}
              options={DIAS.map((d) => ({ value: d, label: d }))}
              size="sm"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                Hora Inicio
              </label>
              <input
                type="time"
                value={panelHoraInicio}
                onChange={(e) => setPanelHoraInicio(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none text-xs focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                Hora Fin
              </label>
              <input
                type="time"
                value={panelHoraFin}
                onChange={(e) => setPanelHoraFin(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none text-xs focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Aula/s
            </label>
            <input
              type="text"
              value={panelAulas}
              onChange={(e) => setPanelAulas(e.target.value)}
              placeholder="Ej: Aula 5, Laboratorio B"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none text-xs focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Profesor/es
            </label>
            <input
              type="text"
              value={panelProfesores}
              onChange={(e) => setPanelProfesores(e.target.value)}
              placeholder="Ej: Ing. Gómez, Lic. Pérez"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none text-xs focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={handleManualAdd}
            disabled={!canManualAdd}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Agregar Horario</span>
          </button>

          {!selectedMateria && (
            <p className="text-[10px] text-amber-500 font-semibold">
              Elegí una materia para poder agregar o pintar horarios.
            </p>
          )}
        </div>

        {/* Columna derecha: título + contador animado + modo pintar/borrar + rejilla */}
        <div className="flex-1 min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <Paintbrush className="w-4 h-4 text-primary" />
              <span>Horario Semanal a Pinceladas</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Elegí una materia en el panel y arrastrá sobre la rejilla para pintarla.
            </p>
          </div>
          <div className="pl-4 border-l border-slate-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-baseline gap-1 font-extrabold text-2xl text-primary leading-none">
              <AnimatedNumber
                value={totalHoras}
                format={(n) => n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
              />
              <span className="text-xs font-bold text-zinc-400">h</span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">semanales</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setMode("pintar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                mode === "pintar"
                  ? "bg-primary text-white dark:text-blue-950 shadow-sm"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Pintar</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("borrar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                mode === "borrar"
                  ? "bg-primary text-white dark:text-blue-950 shadow-sm"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Borrar</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClearWeek}
            disabled={horarios.length === 0}
            title="Vaciar semana"
            className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {mode === "pintar" && !selectedMateria && materiaOptions.length > 0 && (
        <p className="text-[11px] text-amber-500 font-semibold mb-3">
          Elegí una materia en el panel de la izquierda para empezar a pintar.
        </p>
      )}

      {/* Rejilla */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-black/40">
        <div className="flex min-w-[620px]">
          {/* Columna de horas */}
          <div className="shrink-0 w-12 pt-8 relative" style={{ height: totalHeight + 32 }}>
            {hourMarks.map((m) => (
              <div
                key={m}
                className="absolute right-1.5 -translate-y-1/2 text-[9px] font-bold text-zinc-400 dark:text-zinc-600"
                style={{ top: 32 + ((m - gridStartMin) / SLOT_MIN) * ROW_PX }}
              >
                {formatHM(m)}
              </div>
            ))}
          </div>

          {DIAS.map((dia) => {
            const dayHorarios = horarios
              .filter((h) => h.dia === dia)
              .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

            return (
              <div key={dia} className="flex-1 min-w-[80px] pt-0">
                {/* Encabezado del día */}
                <div className="h-8 flex items-center justify-center gap-1 sticky top-0 z-20 bg-slate-50/50 dark:bg-black/40">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    {DIAS_CORTO[dia]}
                  </span>
                  {dayHorarios.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onCopyDayToOthers(dia)}
                      title={`Copiar ${dia} a los demás días`}
                      className="p-0.5 rounded-md text-zinc-400 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Columna del día — área de pintado/borrado */}
                <div
                  data-day-column
                  onPointerDown={(e) => startColumnDrag(e, dia)}
                  className={`relative border-l border-slate-200/70 dark:border-zinc-800/70 touch-none select-none ${
                    mode === "pintar" ? (selectedMateria ? "cursor-cell" : "cursor-not-allowed") : "cursor-crosshair"
                  }`}
                  style={{
                    height: totalHeight,
                    backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${ROW_PX * 2 - 1}px, ${
                      darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"
                    } ${ROW_PX * 2 - 1}px, ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"} ${ROW_PX * 2}px)`,
                  }}
                >
                  {dayHorarios.map((h) => {
                    const isBeingResized = Boolean(drag && drag.type === "resize" && drag.id === h.id);
                    const startMin = parseTimeMin(h.horaInicio);
                    let endMin = parseTimeMin(h.horaFin);
                    if (drag && drag.type === "resize" && drag.id === h.id) {
                      endMin = drag.currentEndMin;
                    }
                    const top = ((startMin - gridStartMin) / SLOT_MIN) * ROW_PX;
                    const height = Math.max(ROW_PX, ((endMin - startMin) / SLOT_MIN) * ROW_PX);
                    const color = colorForMateria(h.materia);

                    return (
                      <div
                        key={h.id}
                        data-block
                        onPointerDown={(e) => {
                          if (mode === "pintar") e.stopPropagation();
                        }}
                        onClick={(e) => {
                          if (mode !== "pintar") return;
                          e.stopPropagation();
                          onEditBlock(h);
                        }}
                        className={`absolute left-0.5 right-0.5 rounded-lg overflow-hidden px-1.5 py-1 shadow-sm transition-shadow ${
                          mode === "pintar" ? "cursor-pointer hover:shadow-md" : ""
                        }`}
                        style={{
                          top,
                          height,
                          backgroundColor: color,
                          opacity: isBeingResized ? 0.85 : 1,
                          zIndex: isBeingResized ? 15 : 5,
                        }}
                        title={`${h.materia} · ${h.horaInicio} - ${h.horaFin}${h.aulas ? ` · ${h.aulas}` : ""}`}
                      >
                        <p className="text-[9px] font-extrabold text-white leading-tight truncate">{h.materia}</p>
                        <p className="text-[8px] text-white/85 leading-tight truncate">
                          {h.horaInicio}–{h.horaFin}
                        </p>
                        {height > 42 && h.aulas && (
                          <p className="text-[8px] text-white/70 leading-tight truncate">{h.aulas}</p>
                        )}

                        {mode === "pintar" && (
                          <div
                            onPointerDown={(e) => startResizeDrag(e, dia, h)}
                            className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-6 h-1.5 rounded-full bg-white/70 cursor-ns-resize"
                            title="Arrastrá para cambiar la hora de fin"
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Previsualización del trazo mientras se arrastra */}
                  {drag && drag.dia === dia && drag.type !== "resize" && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded-lg border-2 pointer-events-none z-10"
                      style={{
                        top: ((Math.min(drag.anchorMin, drag.currentMin) - gridStartMin) / SLOT_MIN) * ROW_PX,
                        height: Math.max(
                          ROW_PX,
                          ((Math.abs(drag.currentMin - drag.anchorMin)) / SLOT_MIN) * ROW_PX,
                        ),
                        ...(drag.type === "create"
                          ? {
                              backgroundColor: `${colorForMateria(selectedMateria)}40`,
                              borderColor: colorForMateria(selectedMateria),
                              borderStyle: "dashed",
                            }
                          : {
                              backgroundColor: "rgba(239,68,68,0.18)",
                              borderColor: "rgba(239,68,68,0.6)",
                              borderStyle: "dashed",
                              backgroundImage:
                                "repeating-linear-gradient(135deg, rgba(239,68,68,0.25) 0, rgba(239,68,68,0.25) 4px, transparent 4px, transparent 9px)",
                            }),
                      }}
                    >
                      <span className="absolute -top-5 left-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                        {drag.type === "create" ? "Pinta" : "Borra"}: {formatHM(Math.min(drag.anchorMin, drag.currentMin))}–
                        {formatHM(Math.max(drag.anchorMin, drag.currentMin))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {horarios.length === 0 && (
        <p className="mt-3 text-[11px] text-zinc-500 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Arrastrá sobre la rejilla (o tocá una celda) para pintar tu primera clase.
        </p>
      )}
        </div>
      </div>
    </div>
  );
}

export default WeeklyScheduleGrid;
