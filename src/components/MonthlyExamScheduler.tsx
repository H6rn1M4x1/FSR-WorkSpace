import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Check, Pencil, Trash2, BookOpen, Clock, MapPin } from "lucide-react";
import { ExamenItem } from "../types";
import { CustomSelect } from "./CustomSelect";
import { DetailModal, DetailBlock, DetailBlockGrid } from "./DetailModal";

const ESTADOS = ["Parcial", "Recuperatorio", "Extraordinario", "Examen Final"];
const INSTANCIAS = ["Primero", "Segundo", "Tercero", "Primero/Segundo", "Trabajo Practico"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const pad2 = (n: number) => String(n).padStart(2, "0");
const toDateStr = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

// Mismo armado que AppointmentsView: domingo primero, relleno con null antes del día 1.
function getDaysInMonth(date: Date): (number | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export interface MonthlyExamSchedulerProps {
  examenes: ExamenItem[];
  darkMode: boolean;
  // Opciones de Materia según Estado — "Examen Final" pulls de lo que se puede rendir, el resto
  // de las materias que ya tienen horario cargado (mismo criterio que el modal "Nuevo Examen").
  materiaOptionsFinal: string[];
  materiaOptionsOtros: string[];
  onDirectCreate: (
    fecha: string,
    estado: string,
    instancia: string | undefined,
    materia: string,
    aula: string,
  ) => void;
  onConfirmEdit: (
    id: string,
    fecha: string,
    estado: string,
    instancia: string | undefined,
    materia: string,
    aula: string,
  ) => void;
  onDeleteExamen: (id: string) => void;
}

// Equivalente mensual y de único registro al "pintar" semanal de Horario: a la izquierda se arma
// el dato (Estado, Instancia, Materia, Hora, Aula) y a la derecha se elige UN día del mes
// tocándolo — nunca arrastrando, porque acá cada confirmación es un solo registro, no un rango.
// El resultado final se guarda con el mismo mecanismo que el modal "Nuevo Examen/Trabajo" (mismo
// `ExamenItem`, misma colección de Firestore), así que ambos caminos terminan en la misma tabla de
// "Parciales, Finales y Trabajos" de más abajo.
export function MonthlyExamScheduler({
  examenes,
  darkMode,
  materiaOptionsFinal,
  materiaOptionsOtros,
  onDirectCreate,
  onConfirmEdit,
  onDeleteExamen,
}: MonthlyExamSchedulerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailDayId, setDetailDayId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [estado, setEstado] = useState("Parcial");
  const [instancia, setInstancia] = useState("Primero");
  const [materia, setMateria] = useState("");
  const [hora, setHora] = useState("08:00");
  const [aula, setAula] = useState("");

  const materiaOptions = estado === "Examen Final" ? materiaOptionsFinal : materiaOptionsOtros;

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const examsForDate = (dateStr: string) => examenes.filter((ex) => ex.fecha.startsWith(dateStr));

  const resetDraft = () => {
    setEditingId(null);
    setEstado("Parcial");
    setInstancia("Primero");
    setMateria("");
    setHora("08:00");
    setAula("");
  };

  // Un solo click deja el día como destino del panel (para cargar o editar), sin tocar los datos
  // que ya se hayan cargado — así arma el registro en cualquier orden (elegir día y después
  // completar datos, o completar datos y después elegir día) sin perder nada en el camino. Doble
  // click abre el menú con toda la información del día.
  const selectDay = (dateStr: string) => {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  };

  const openDayDetail = (dateStr: string) => {
    if (examsForDate(dateStr).length > 0) setDetailDayId(dateStr);
  };

  // Distingue un click de un doble click a mano (en vez de onClick + onDoubleClick nativos, que
  // con un botón disparan dos clicks de por medio y terminarían des-seleccionando el día en cada
  // doble click): si el segundo click llega dentro de la ventana, es doble click.
  const dayClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (dayClickTimer.current) clearTimeout(dayClickTimer.current);
    };
  }, []);
  const handleDayClick = (dateStr: string) => {
    if (dayClickTimer.current) {
      clearTimeout(dayClickTimer.current);
      dayClickTimer.current = null;
      openDayDetail(dateStr);
      return;
    }
    dayClickTimer.current = setTimeout(() => {
      selectDay(dateStr);
      dayClickTimer.current = null;
    }, 250);
  };

  const startEditing = (ex: ExamenItem) => {
    setSelectedDate(ex.fecha.split("T")[0]);
    setEditingId(ex.id);
    setEstado(ex.estado);
    setInstancia(ex.instancia || "Primero");
    setMateria(ex.materia);
    setHora(ex.fecha.includes("T") ? ex.fecha.split("T")[1].slice(0, 5) : "08:00");
    setAula(ex.aula);
  };

  const handleCancel = () => {
    resetDraft();
    setSelectedDate(null);
  };

  const canConfirm = Boolean(selectedDate && materia && estado);

  const handleConfirm = () => {
    if (!selectedDate || !materia || !estado) return;
    const fecha = `${selectedDate}T${hora}`;
    const finalInstancia = estado !== "Examen Final" ? instancia : undefined;
    if (editingId) {
      onConfirmEdit(editingId, fecha, estado, finalInstancia, materia, aula);
    } else {
      onDirectCreate(fecha, estado, finalInstancia, materia, aula);
    }
    resetDraft();
  };

  const days = getDaysInMonth(currentMonth);
  const selectedDayExams = selectedDate ? examsForDate(selectedDate) : [];

  return (
    <div
      className={`p-6 rounded-3xl border scroll-reveal mb-6 ${
        darkMode ? "bg-black/85 backdrop-blur-md border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
      }`}
    >
      <div className="lg:flex lg:gap-6 lg:items-start">
        {/* Panel izquierdo: mismo rol que el panel de "Nuevo Horario" — arma el dato que después
            queda pegado al día que se toque en el calendario de la derecha. */}
        <div
          className={`w-full lg:w-[280px] shrink-0 mb-6 lg:mb-0 rounded-2xl border p-4 space-y-3.5 ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}
        >
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5 text-primary" />
            {editingId ? "Editando Examen/Trabajo" : "Nuevo Examen/Trabajo"}
          </h4>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Estado
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ESTADOS.map((es) => {
                const isActive = estado === es;
                return (
                  <button
                    key={es}
                    type="button"
                    onClick={() => setEstado(es)}
                    className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold border-2 transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary border-primary text-white dark:text-blue-950 shadow-sm"
                        : "bg-transparent border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {es}
                  </button>
                );
              })}
            </div>
          </div>

          {estado !== "Examen Final" && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                Instancia
              </label>
              <CustomSelect
                value={instancia}
                onChange={(val) => setInstancia(val)}
                options={INSTANCIAS.map((i) => ({ value: i, label: i }))}
                size="sm"
                className="w-full"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Materia
            </label>
            <CustomSelect
              value={materia}
              onChange={(val) => setMateria(val)}
              options={materiaOptions.map((m) => ({ value: m, label: m }))}
              placeholder="Seleccionar Materia"
              size="sm"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Hora
            </label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none text-xs focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Aula
            </label>
            <input
              type="text"
              value={aula}
              onChange={(e) => setAula(e.target.value)}
              placeholder="Ej: Aula 10, Laboratorio..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none text-xs focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            {(selectedDate || editingId) && (
              <button
                type="button"
                onClick={handleCancel}
                className="shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingId ? "Guardar Cambios" : "Agregar"}</span>
            </button>
          </div>

          {!selectedDate && (
            <p className="text-[10px] text-amber-500 font-semibold">
              Elegí un día en el calendario para agendar.
            </p>
          )}

          {selectedDate && selectedDayExams.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                Ya agendado este día
              </span>
              {selectedDayExams.map((ex) => (
                <div
                  key={ex.id}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-colors ${
                    editingId === ex.id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-white dark:bg-black/40 border border-slate-200 dark:border-zinc-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => startEditing(ex)}
                    className="flex-1 min-w-0 text-left truncate cursor-pointer"
                    title="Editar"
                  >
                    {ex.materia} · {ex.estado}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteExamen(ex.id)}
                    className="shrink-0 p-1 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha: calendario mensual — un solo click sobre un día lo marca como el
            destino del registro que se está armando en el panel. */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Calendario de Exámenes y Trabajos</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Completá los datos del panel y tocá un día para agendarlo. Doble click para ver el detalle.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold uppercase tracking-wide min-w-[110px] text-center">
                {MESES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-3 sm:p-4 ${
              darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
            }`}
          >
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (day === null) return <div key={`pad-${idx}`} />;
              const dateStr = toDateStr(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const dayExams = examsForDate(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  data-sound="selectDate"
                  onClick={() => handleDayClick(dateStr)}
                  className={`relative min-h-[64px] sm:min-h-[76px] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-start gap-1 pt-1.5 pb-1.5 px-0.5 ${
                    isSelected
                      ? "border-2 border-primary text-primary bg-primary/10 scale-[1.02] shadow-sm"
                      : isToday
                        ? "bg-primary text-white dark:text-blue-950 shadow-md"
                        : "hover:bg-primary/10 text-slate-700 dark:text-zinc-300"
                  }`}
                >
                  <span>{day}</span>
                  {dayExams.length > 0 && (
                    <span
                      className={`w-[92%] px-1 py-0.5 rounded-md text-[8px] sm:text-[9px] font-extrabold truncate leading-tight ${
                        isSelected || isToday ? "bg-white/20 text-current" : "bg-primary/15 text-primary"
                      }`}
                      title={dayExams[0].materia}
                    >
                      {dayExams[0].materia}
                    </span>
                  )}
                  {dayExams.length > 1 && (
                    <span className={`text-[7px] sm:text-[8px] font-bold ${isSelected || isToday ? "text-current opacity-80" : "text-primary/70"}`}>
                      +{dayExams.length - 1} más
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          </div>
        </div>
      </div>

      {(() => {
        if (!detailDayId) return null;
        const items = examsForDate(detailDayId);
        const dateObj = new Date(`${detailDayId}T12:00:00`);
        return (
          <DetailModal
            isOpen={!!detailDayId}
            onClose={() => setDetailDayId(null)}
            title={dateObj.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            subtitle={`${items.length} ${items.length === 1 ? "registro" : "registros"}`}
            icon={Calendar}
          >
            <DetailBlockGrid>
              {items.map((ex) => {
                const horaTxt = ex.fecha.includes("T") ? ex.fecha.split("T")[1].slice(0, 5) : "";
                return (
                  <DetailBlock
                    key={ex.id}
                    icon={BookOpen}
                    label={ex.instancia ? `${ex.estado} · ${ex.instancia}` : ex.estado}
                    tone="primary"
                    span
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{ex.materia}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => { setDetailDayId(null); startEditing(ex); }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-primary hover:bg-primary/10 cursor-pointer transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExamen(ex.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                        {horaTxt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {horaTxt}
                          </span>
                        )}
                        {ex.aula && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {ex.aula}
                          </span>
                        )}
                      </div>
                    </div>
                  </DetailBlock>
                );
              })}
            </DetailBlockGrid>
          </DetailModal>
        );
      })()}
    </div>
  );
}
