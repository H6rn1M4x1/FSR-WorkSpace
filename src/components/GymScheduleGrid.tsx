import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Paintbrush, Eraser, Trash2, Clock, Check, X, CalendarDays, Pencil } from "lucide-react";
import { DeporteActividad } from "../types";
import { AnimatedNumber } from "./AnimatedNumber";
import { CustomSelect } from "./CustomSelect";
import { RouteDrawMap } from "./RouteDrawMap";
import { getLocalDateString } from "../utils/date";
import { estimateCaloriesByMET } from "../data/activityCatalog";
import {
  buildPalette,
  getAccentColorHex,
  getReadableTextColor,
  parseTimeMin,
  minToTime,
  formatHM,
} from "./WeeklyScheduleGrid";

// Misma mecánica de "pintar/borrar" que WeeklyScheduleGrid.tsx (Universidad > Horario), adaptada:
// en vez de "Materia" con pastillas de color, acá se elige con un desplegable una Rutina o
// Actividad (o se deja "Actividad libre" para solo marcar tiempo); en vez de Aula/Profesor, los
// campos del panel son las métricas de "Añadir Actividad" (calorías, pasos, distancia, etc.), que
// solo aparecen si hay una rutina/actividad elegida. Y en vez de un horario recurrente abstracto
// (día de la semana sin fecha), cada bloque pintado es la semana EN CURSO: los encabezados
// muestran la fecha real de cada día y lo pintado se guarda con esa fecha en deportes_actividades.

const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const SLOT_MIN = 30;
const ROW_PX = 26;
const DEFAULT_START_MIN = 7 * 60;
const DEFAULT_END_MIN = 22 * 60;
const MIN_BLOCK_MIN = 30;
const DEFAULT_CLICK_DURATION_MIN = 60;
const CLICK_THRESHOLD_PX = 6;
const FREE_BLOCK_LABEL = "Actividad libre";

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatMinutesLabel(mins: number): string {
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

function splitFecha(fecha: string): { dateStr: string; time: string } {
  const [dateStr, time] = (fecha || "").split(" ");
  return { dateStr: dateStr || "", time: (time || "00:00").slice(0, 5) };
}

function formatFullDiaLabel(dayIdx: number, weekDates: Date[]): string {
  const d = weekDates[dayIdx];
  return `${DIAS_LARGO[dayIdx]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatPace(minutes: number, distanceKm: number): string {
  if (!distanceKm || distanceKm <= 0 || !minutes || minutes <= 0) return "";
  const paceMin = minutes / distanceKm;
  const m = Math.floor(paceMin);
  const s = Math.round((paceMin - m) * 60);
  return `${m}:${String(s).padStart(2, "0")} min/km`;
}

export type GymScheduleOptionKind = "rutina" | "deporte";

export interface GymScheduleOption {
  key: string;
  kind: GymScheduleOptionKind;
  label: string;
  estMinutes: number;
  estCalorias: number;
  isDistanceBased: boolean;
}

export interface GymScheduleCreatePayload {
  dateStr: string;
  horaInicio: string;
  horaFin: string;
  label: string;
  calorias: number;
  pasos: number;
  distancia: number;
  tiempoMovimiento: string;
  frecuencia: string;
  puntos: number;
}

export interface GymScheduleBatch {
  toDelete: string[];
  toUpsert: DeporteActividad[];
}

interface WeekActividad {
  raw: DeporteActividad;
  dayIdx: number;
  horaInicio: string;
  horaFin: string;
}

type DragState =
  | { type: "create" | "erase"; dayIdx: number; anchorMin: number; currentMin: number; startClientY: number; rectTop: number }
  | { type: "resize"; dayIdx: number; id: string; fixedStartMin: number; currentEndMin: number; rectTop: number };

interface GymScheduleGridProps {
  darkMode: boolean;
  actividades: DeporteActividad[];
  options: GymScheduleOption[];
  onDirectCreate: (payload: GymScheduleCreatePayload) => void;
  onConfirmEdit: (id: string, payload: GymScheduleCreatePayload) => void;
  onBatchUpdate: (batch: GymScheduleBatch) => void;
  onClearWeek: (ids: string[]) => void;
  generateId: (prefix: string) => string;
}

export function GymScheduleGrid({
  darkMode,
  actividades,
  options,
  onDirectCreate,
  onConfirmEdit,
  onBatchUpdate,
  onClearWeek,
  generateId,
}: GymScheduleGridProps) {
  const [mode, setMode] = useState<"pintar" | "borrar">("pintar");
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const weekDates = useMemo(() => {
    const monday = getMondayOfCurrentWeek();
    return Array.from({ length: 6 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  }, []);
  const weekDateStrs = useMemo(() => weekDates.map((d) => getLocalDateString(d)), [weekDates]);

  const weekActividades = useMemo<WeekActividad[]>(() => {
    return (actividades || [])
      .map((raw) => {
        const desde = splitFecha(raw.fechaDesde);
        const hasta = splitFecha(raw.fechaHasta);
        const dayIdx = weekDateStrs.indexOf(desde.dateStr);
        if (dayIdx === -1) return null;
        return { raw, dayIdx, horaInicio: desde.time, horaFin: hasta.time };
      })
      .filter((x): x is WeekActividad => x !== null);
  }, [actividades, weekDateStrs]);

  // Panel izquierdo: desplegable de Rutina/Actividad (o "Actividad libre") + Día/Hora Inicio/Fin
  // para el alta manual, que además se van completando en vivo mientras se pinta.
  const [selectedOptionKey, setSelectedOptionKey] = useState<string>("");
  const [panelDayIdx, setPanelDayIdx] = useState<number>(0);
  const [panelHoraInicio, setPanelHoraInicio] = useState("08:00");
  const [panelHoraFin, setPanelHoraFin] = useState("09:00");
  const [panelCalorias, setPanelCalorias] = useState<number | "">("");
  const [panelPasos, setPanelPasos] = useState<number | "">("");
  const [panelDistancia, setPanelDistancia] = useState<number | "">("");
  const [panelTiempoMovimiento, setPanelTiempoMovimiento] = useState("");
  const [panelFrecuencia, setPanelFrecuencia] = useState("");
  const [panelPuntos, setPanelPuntos] = useState<number | "">("");

  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.key === selectedOptionKey) || null,
    [options, selectedOptionKey]
  );

  const optionLabels = useMemo(() => options.map((o) => o.label), [options]);
  const accentPalette = buildPalette(getAccentColorHex(), optionLabels.length, darkMode);
  const colorForLabel = (label: string): string => {
    const idx = optionLabels.indexOf(label);
    if (idx === -1) return darkMode ? "#52525b" : "#cbd5e1";
    return accentPalette[idx % accentPalette.length];
  };

  const estimateForOption = (opt: GymScheduleOption | null, minutes: number) => {
    if (!opt) {
      return { calorias: 0, tiempoMovimiento: formatMinutesLabel(minutes), puntos: minutes };
    }
    const calorias =
      opt.kind === "deporte"
        ? estimateCaloriesByMET(opt.label, minutes)
        : Math.round(opt.estCalorias * (minutes / Math.max(opt.estMinutes, 1)));
    return { calorias, tiempoMovimiento: formatMinutesLabel(minutes), puntos: minutes };
  };

  const applyEstimate = (opt: GymScheduleOption | null, minutes: number) => {
    const est = estimateForOption(opt, minutes);
    setPanelCalorias(est.calorias || "");
    setPanelPasos("");
    setPanelDistancia("");
    setPanelTiempoMovimiento(est.tiempoMovimiento);
    setPanelFrecuencia("");
    setPanelPuntos(est.puntos);
  };

  const handleSelectOption = (key: string) => {
    setSelectedOptionKey(key);
    const opt = options.find((o) => o.key === key) || null;
    const minutes = Math.max(MIN_BLOCK_MIN, parseTimeMin(panelHoraFin) - parseTimeMin(panelHoraInicio));
    applyEstimate(opt, minutes);
  };

  // Al terminar de dibujar la ruta en el mapa (solo para deportes "isDistanceBased"), completa
  // Distancia y Pasos automáticamente, y además recalcula el ritmo (Frecuencia) con la duración
  // ya cargada en el panel — mismo cálculo que usaba "Añadir Actividad".
  const handleRouteComplete = (result: { distanceKm: number; steps: number }) => {
    setPanelDistancia(result.distanceKm);
    setPanelPasos(result.steps);
    const minutes = Math.max(0, parseTimeMin(panelHoraFin) - parseTimeMin(panelHoraInicio));
    setPanelFrecuencia(formatPace(minutes, result.distanceKm));
  };

  const gridStartMin = weekActividades.reduce(
    (min, a) => Math.min(min, Math.floor(parseTimeMin(a.horaInicio) / 60) * 60),
    DEFAULT_START_MIN,
  );
  const gridEndMin = weekActividades.reduce(
    (max, a) => Math.max(max, Math.ceil(parseTimeMin(a.horaFin) / 60) * 60),
    DEFAULT_END_MIN,
  );
  const totalRows = Math.max(1, (gridEndMin - gridStartMin) / SLOT_MIN);
  const totalHeight = totalRows * ROW_PX;

  const totalHoras = weekActividades.reduce(
    (sum, a) => sum + Math.max(0, parseTimeMin(a.horaFin) - parseTimeMin(a.horaInicio)) / 60,
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
    (dayIdx: number, anchorMin: number, currentMin: number, startClientY: number, lastClientY: number) => {
      const movedPx = Math.abs(lastClientY - startClientY);
      let lo = Math.min(anchorMin, currentMin);
      let hi = Math.max(anchorMin, currentMin);
      if (movedPx < CLICK_THRESHOLD_PX || hi - lo < MIN_BLOCK_MIN) {
        hi = Math.min(gridEndMin, lo + DEFAULT_CLICK_DURATION_MIN);
      }
      if (hi - lo < MIN_BLOCK_MIN) return;
      setPanelDayIdx(dayIdx);
      setPanelHoraInicio(minToTime(lo));
      setPanelHoraFin(minToTime(hi));
      applyEstimate(selectedOption, hi - lo);
      setHasPendingDraft(true);
    },
    [gridEndMin, selectedOption],
  );

  const commitErase = useCallback(
    (dayIdx: number, anchorMin: number, currentMin: number, startClientY: number, lastClientY: number) => {
      let lo = Math.min(anchorMin, currentMin);
      let hi = Math.max(anchorMin, currentMin);
      const movedPx = Math.abs(lastClientY - startClientY);
      const dayActs = weekActividades.filter((a) => a.dayIdx === dayIdx);

      if (movedPx < CLICK_THRESHOLD_PX) {
        const hit = dayActs.find((a) => parseTimeMin(a.horaInicio) <= lo && parseTimeMin(a.horaFin) > lo);
        if (!hit) return;
        onBatchUpdate({ toDelete: [hit.raw.id], toUpsert: [] });
        return;
      }
      if (hi - lo < 5) return;

      const toDelete: string[] = [];
      const toUpsert: DeporteActividad[] = [];
      const dateStr = weekDateStrs[dayIdx];

      dayActs.forEach((a) => {
        const hLo = parseTimeMin(a.horaInicio);
        const hHi = parseTimeMin(a.horaFin);
        if (hHi <= lo || hLo >= hi) return;

        if (lo <= hLo && hi >= hHi) {
          toDelete.push(a.raw.id);
          return;
        }
        if (lo > hLo && hi < hHi) {
          toUpsert.push({ ...a.raw, fechaHasta: `${dateStr} ${minToTime(lo)}` });
          toUpsert.push({ ...a.raw, id: generateId("act"), fechaDesde: `${dateStr} ${minToTime(hi)}` });
          return;
        }
        if (lo <= hLo) {
          toUpsert.push({ ...a.raw, fechaDesde: `${dateStr} ${minToTime(hi)}` });
          return;
        }
        toUpsert.push({ ...a.raw, fechaHasta: `${dateStr} ${minToTime(lo)}` });
      });

      if (toDelete.length === 0 && toUpsert.length === 0) return;
      onBatchUpdate({ toDelete, toUpsert });
    },
    [weekActividades, onBatchUpdate, generateId, weekDateStrs],
  );

  const commitResize = useCallback(
    (id: string, fixedStartMin: number, currentEndMin: number) => {
      const item = weekActividades.find((a) => a.raw.id === id);
      if (!item) return;
      const endMin = Math.max(fixedStartMin + MIN_BLOCK_MIN, currentEndMin);
      const newHoraFin = minToTime(endMin);
      if (newHoraFin === item.horaFin) return;
      const minutes = endMin - fixedStartMin;
      const opt = options.find((o) => o.label === item.raw.informacion) || null;
      const est = estimateForOption(opt, minutes);
      const dateStr = weekDateStrs[item.dayIdx];
      onBatchUpdate({
        toDelete: [],
        toUpsert: [
          {
            ...item.raw,
            fechaHasta: `${dateStr} ${newHoraFin}`,
            calorias: opt ? est.calorias : item.raw.calorias,
            tiempoMovimiento: opt ? est.tiempoMovimiento : item.raw.tiempoMovimiento,
            puntos: opt ? est.puntos : item.raw.puntos,
          },
        ],
      });
    },
    [weekActividades, onBatchUpdate, options, weekDateStrs],
  );

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
        if (current.type === "create") {
          const lo = Math.min(current.anchorMin, min);
          const hi = Math.max(current.anchorMin, min);
          setPanelDayIdx(current.dayIdx);
          setPanelHoraInicio(minToTime(lo));
          setPanelHoraFin(minToTime(Math.max(hi, lo + SLOT_MIN)));
        }
      }
    };

    const handleUp = (e: PointerEvent) => {
      const current = dragRef.current;
      setDrag(null);
      dragRef.current = null;
      if (!current) return;
      if (current.type === "create") {
        commitCreate(current.dayIdx, current.anchorMin, current.currentMin, current.startClientY, e.clientY);
      } else if (current.type === "erase") {
        commitErase(current.dayIdx, current.anchorMin, current.currentMin, current.startClientY, e.clientY);
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

  const startColumnDrag = (e: React.PointerEvent, dayIdx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const startMin = minutesFromClientY(e.clientY, rect.top);
    const next: DragState = {
      type: mode === "pintar" ? "create" : "erase",
      dayIdx,
      anchorMin: startMin,
      currentMin: startMin,
      startClientY: e.clientY,
      rectTop: rect.top,
    };
    dragRef.current = next;
    setDrag(next);
  };

  const startResizeDrag = (e: React.PointerEvent, dayIdx: number, item: WeekActividad) => {
    e.stopPropagation();
    const column = (e.currentTarget as HTMLElement).closest("[data-day-column]") as HTMLElement | null;
    const rect = column ? column.getBoundingClientRect() : (e.currentTarget as HTMLElement).getBoundingClientRect();
    const next: DragState = {
      type: "resize",
      dayIdx,
      id: item.raw.id,
      fixedStartMin: parseTimeMin(item.horaInicio),
      currentEndMin: parseTimeMin(item.horaFin),
      rectTop: rect.top,
    };
    dragRef.current = next;
    setDrag(next);
  };

  const hourMarks: number[] = [];
  for (let m = gridStartMin; m <= gridEndMin; m += 60) hourMarks.push(m);

  const canConfirmDraft = Boolean(panelHoraInicio && panelHoraFin && panelHoraFin > panelHoraInicio);

  const handleConfirmDraft = () => {
    if (!canConfirmDraft) return;
    const payload: GymScheduleCreatePayload = {
      dateStr: weekDateStrs[panelDayIdx],
      horaInicio: panelHoraInicio,
      horaFin: panelHoraFin,
      label: selectedOption ? selectedOption.label : FREE_BLOCK_LABEL,
      calorias: Number(panelCalorias) || 0,
      pasos: Number(panelPasos) || 0,
      distancia: Number(panelDistancia) || 0,
      tiempoMovimiento: panelTiempoMovimiento || "",
      frecuencia: panelFrecuencia || "",
      puntos: Number(panelPuntos) || 0,
    };
    if (editingDraftId) {
      onConfirmEdit(editingDraftId, payload);
    } else {
      onDirectCreate(payload);
    }
    setHasPendingDraft(false);
    setEditingDraftId(null);
  };

  const handleCancelDraft = () => {
    setHasPendingDraft(false);
    setEditingDraftId(null);
  };

  const startEditingBlock = (item: WeekActividad) => {
    setEditingDraftId(item.raw.id);
    setPanelDayIdx(item.dayIdx);
    setPanelHoraInicio(item.horaInicio);
    setPanelHoraFin(item.horaFin);
    setPanelCalorias(item.raw.calorias || "");
    setPanelPasos(item.raw.pasos || "");
    setPanelDistancia(item.raw.distancia || "");
    setPanelTiempoMovimiento(item.raw.tiempoMovimiento || "");
    setPanelFrecuencia(item.raw.frecuencia || "");
    setPanelPuntos(item.raw.puntos || "");
    const matched = options.find((o) => o.label === item.raw.informacion);
    setSelectedOptionKey(matched ? matched.key : "");
    setHasPendingDraft(true);
  };

  const dropdownOptions = [
    { value: "", label: `— ${FREE_BLOCK_LABEL} (solo tiempo) —` },
    ...options.map((o) => ({ value: o.key, label: `${o.kind === "rutina" ? "Rutina" : "Deporte"} · ${o.label}` })),
  ];
  const diaOptions = DIAS_LARGO.map((d, i) => ({ value: String(i), label: `${d} ${weekDates[i].getDate()}` }));

  return (
    <div
      className={`p-6 rounded-3xl border scroll-reveal ${
        darkMode ? "bg-black/85 backdrop-blur-md border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
      }`}
    >
      <div className="lg:flex lg:gap-6 lg:items-start">
        {/* Panel izquierdo */}
        <div
          className={`w-full lg:w-[280px] shrink-0 mb-6 lg:mb-0 rounded-2xl border p-4 space-y-3.5 ${
            darkMode ? "bg-zinc-950/40 border-zinc-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5 text-primary" />
            {editingDraftId ? "Editando Ejercicio" : "Registrar Ejercicio"}
          </h4>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Rutina o Actividad
            </label>
            <CustomSelect
              value={selectedOptionKey}
              onChange={handleSelectOption}
              options={dropdownOptions}
              size="sm"
              searchable
              className="w-full"
              renderValue={(opt) => {
                const parts = opt.label.split(" · ");
                if (parts.length < 2) return <span className="font-bold truncate">{opt.label}</span>;
                return (
                  <span className="truncate">
                    <span className="font-bold">{parts[0]}</span>{" "}
                    <span className="font-normal text-[13px] text-slate-500 dark:text-zinc-400">· {parts[1]}</span>
                  </span>
                );
              }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Día
            </label>
            {editingDraftId ? (
              <CustomSelect
                value={String(panelDayIdx)}
                onChange={(v) => setPanelDayIdx(Number(v))}
                options={diaOptions}
                size="sm"
                className="w-full"
              />
            ) : (
              <div className="w-full px-3 py-2.5 h-[42px] rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs md:text-sm font-semibold flex items-center truncate">
                {formatFullDiaLabel(panelDayIdx, weekDates)}
              </div>
            )}
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

          {selectedOption ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Calorías
                  </label>
                  <input
                    type="number"
                    value={panelCalorias}
                    onChange={(e) => setPanelCalorias(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none text-xs focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Puntos
                  </label>
                  <input
                    type="number"
                    value={panelPuntos}
                    onChange={(e) => setPanelPuntos(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none text-xs focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Pasos
                  </label>
                  <input
                    type="number"
                    value={panelPasos}
                    onChange={(e) => setPanelPasos(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={!selectedOption.isDistanceBased}
                    className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none text-xs focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Distancia (km)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={panelDistancia}
                    onChange={(e) => setPanelDistancia(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={!selectedOption.isDistanceBased}
                    className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none text-xs focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                  Tiempo Movimiento
                </label>
                <input
                  type="text"
                  placeholder="Ej: 1h 30m"
                  value={panelTiempoMovimiento}
                  onChange={(e) => setPanelTiempoMovimiento(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none text-xs focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                  Frecuencia / Ritmo
                </label>
                <input
                  type="text"
                  placeholder="Ej: 5:30 min/km"
                  value={panelFrecuencia}
                  onChange={(e) => setPanelFrecuencia(e.target.value)}
                  disabled={!selectedOption.isDistanceBased}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none text-xs focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>

              {selectedOption.isDistanceBased && (
                <RouteDrawMap darkMode={darkMode} onRouteComplete={handleRouteComplete} heightClass="h-44" />
              )}
            </>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900/60 rounded-xl px-3 py-2">
              <Clock className="w-3.5 h-3.5 shrink-0 text-primary" />
              Se va a registrar como tiempo libre ({formatMinutesLabel(Math.max(0, parseTimeMin(panelHoraFin) - parseTimeMin(panelHoraInicio)))}), sin calorías ni métricas.
            </p>
          )}

          <div className="flex items-center gap-2">
            {hasPendingDraft && (
              <button
                type="button"
                data-sound="click"
                onClick={handleCancelDraft}
                className="shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirmDraft}
              disabled={!canConfirmDraft}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingDraftId ? "Guardar Cambios" : "Registrar Ejercicio"}</span>
            </button>
          </div>
        </div>

        {/* Columna derecha: título + contador animado + modo pintar/borrar + rejilla */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span>Historial de Sesiones</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Elegí una rutina o deporte en el panel (o dejalo libre) y arrastrá sobre la rejilla para pintarla.
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
                  data-sound="click"
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
                  data-sound="click"
                  onClick={() => {
                    setMode("borrar");
                    setHasPendingDraft(false);
                  }}
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
                data-sound="delete"
                onClick={() => onClearWeek(weekActividades.map((a) => a.raw.id))}
                disabled={weekActividades.length === 0}
                title="Vaciar semana"
                className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-black/40">
            <div className="overflow-x-auto">
              <div className="flex min-w-[620px]">
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

                {DIAS_CORTO.map((diaCorto, dayIdx) => {
                  const dayActividades = weekActividades
                    .filter((a) => a.dayIdx === dayIdx)
                    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

                  return (
                    <div key={dayIdx} className="flex-1 min-w-[80px] pt-0">
                      <div className="h-8 flex items-center justify-center gap-1 sticky top-0 z-20 bg-slate-50/50 dark:bg-black/40">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                          {diaCorto} {weekDates[dayIdx].getDate()}
                        </span>
                      </div>

                      <div
                        data-day-column
                        onPointerDown={(e) => startColumnDrag(e, dayIdx)}
                        className={`relative border-l border-slate-200/70 dark:border-zinc-800/70 touch-none select-none ${
                          mode === "pintar" ? "cursor-cell" : "cursor-crosshair"
                        }`}
                        style={{
                          height: totalHeight,
                          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${ROW_PX * 2 - 1}px, ${
                            darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"
                          } ${ROW_PX * 2 - 1}px, ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.035)"} ${ROW_PX * 2}px)`,
                        }}
                      >
                        {dayActividades
                          .filter((a) => a.raw.id !== editingDraftId)
                          .map((item) => {
                            const isBeingResized = Boolean(drag && drag.type === "resize" && drag.id === item.raw.id);
                            const startMin = parseTimeMin(item.horaInicio);
                            let endMin = parseTimeMin(item.horaFin);
                            if (drag && drag.type === "resize" && drag.id === item.raw.id) {
                              endMin = drag.currentEndMin;
                            }
                            const top = ((startMin - gridStartMin) / SLOT_MIN) * ROW_PX;
                            const height = Math.max(ROW_PX, ((endMin - startMin) / SLOT_MIN) * ROW_PX);
                            const color = colorForLabel(item.raw.informacion);
                            const textColor = getReadableTextColor(color);

                            return (
                              <div
                                key={item.raw.id}
                                data-block
                                onPointerDown={(e) => {
                                  if (mode === "pintar") e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  if (mode !== "pintar") return;
                                  e.stopPropagation();
                                  startEditingBlock(item);
                                }}
                                className={`absolute left-0.5 right-0.5 rounded-lg overflow-hidden px-1.5 py-1 shadow-sm transition-all ${
                                  mode === "pintar" ? "cursor-pointer hover:shadow-md" : ""
                                }`}
                                style={{
                                  top,
                                  height,
                                  backgroundColor: color,
                                  opacity: isBeingResized ? 0.85 : 1,
                                  zIndex: isBeingResized ? 15 : 5,
                                }}
                                title={`${item.raw.informacion} · ${item.horaInicio} - ${item.horaFin}`}
                              >
                                <p className="text-[9px] font-extrabold leading-tight truncate" style={{ color: textColor }}>
                                  {item.raw.informacion}
                                </p>
                                <p className="text-[8px] leading-tight truncate" style={{ color: textColor, opacity: 0.85 }}>
                                  {item.horaInicio}–{item.horaFin}
                                </p>
                                {height > 42 && item.raw.calorias > 0 && (
                                  <p className="text-[8px] leading-tight truncate" style={{ color: textColor, opacity: 0.7 }}>
                                    {item.raw.calorias} kcal
                                  </p>
                                )}

                                {mode === "pintar" && (
                                  <div
                                    onPointerDown={(e) => startResizeDrag(e, dayIdx, item)}
                                    className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-6 h-1.5 rounded-full cursor-ns-resize"
                                    style={{ backgroundColor: textColor, opacity: 0.7 }}
                                    title="Arrastrá para cambiar la hora de fin"
                                  />
                                )}
                              </div>
                            );
                          })}

                        {drag && drag.dayIdx === dayIdx && drag.type !== "resize" && (
                          <div
                            className="absolute left-0.5 right-0.5 rounded-lg border-2 pointer-events-none z-10"
                            style={{
                              top: ((Math.min(drag.anchorMin, drag.currentMin) - gridStartMin) / SLOT_MIN) * ROW_PX,
                              height: Math.max(ROW_PX, (Math.abs(drag.currentMin - drag.anchorMin) / SLOT_MIN) * ROW_PX),
                              ...(drag.type === "create"
                                ? {
                                    backgroundColor: `color-mix(in srgb, ${colorForLabel(selectedOption ? selectedOption.label : FREE_BLOCK_LABEL)} 40%, transparent)`,
                                    borderColor: colorForLabel(selectedOption ? selectedOption.label : FREE_BLOCK_LABEL),
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

                        {!drag && hasPendingDraft && mode === "pintar" && panelDayIdx === dayIdx && (() => {
                          const draftLabel = selectedOption ? selectedOption.label : FREE_BLOCK_LABEL;
                          const draftColor = colorForLabel(draftLabel);
                          const draftTextColor = getReadableTextColor(draftColor);
                          return (
                            <div
                              onPointerDown={(e) => e.stopPropagation()}
                              className="absolute left-0.5 right-0.5 rounded-lg border-2 border-dashed animate-pulse z-10 overflow-hidden px-1.5 py-1"
                              style={{
                                top: ((parseTimeMin(panelHoraInicio) - gridStartMin) / SLOT_MIN) * ROW_PX,
                                height: Math.max(
                                  ROW_PX,
                                  ((parseTimeMin(panelHoraFin) - parseTimeMin(panelHoraInicio)) / SLOT_MIN) * ROW_PX,
                                ),
                                backgroundColor: `color-mix(in srgb, ${draftColor} 70%, transparent)`,
                                borderColor: draftColor,
                              }}
                            >
                              <button
                                type="button"
                                onClick={handleCancelDraft}
                                title="Cancelar"
                                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/30 hover:bg-black/50 text-white cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                              <p className="text-[9px] font-extrabold leading-tight truncate pr-3" style={{ color: draftTextColor }}>
                                {draftLabel}
                              </p>
                              <p className="text-[8px] leading-tight truncate" style={{ color: draftTextColor, opacity: 0.85 }}>
                                {panelHoraInicio}–{panelHoraFin}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {weekActividades.length === 0 && (
            <p className="mt-3 text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Arrastrá sobre la rejilla (o tocá una celda) para registrar tu primer ejercicio de la semana.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default GymScheduleGrid;
