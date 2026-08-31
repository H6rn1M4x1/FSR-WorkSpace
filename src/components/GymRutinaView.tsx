import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { createPortal } from "react-dom";
import {
  Dumbbell,
  Plus,
  Search,
  Trash2,
  Edit2,
  Play,
  CheckCircle2,
  Loader2,
  Activity,
  Flame,
  TrendingUp,
  BarChart2,
  Calendar,
  Zap,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock,
  Target,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Eye,
  BookOpen,
  Layers,
  Shield,
  Award,
  Trophy,
  ChevronDown,
  Filter,
  Footprints,
  HeartPulse,
  AlignJustify
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import {
  GrupoMuscular,
  EjercicioRutina,
  RutinaGimnasio,
  RegistroEntrenamiento,
  EjercicioRegistroLog,
  SetRegistro,
  DeporteActividad,
  PantryItem, MealPlan, ShoppingItem, MercaderiaItem, AlimentoItem, PlatoItem, OrganizacionSemanalItem
} from "../types";
import {
  saveItemToFirestore,
  deleteItemFromFirestore,
  getEffectiveUserId
} from "../lib/firestoreSyncService";
import { WorkoutBuilderModal } from "./WorkoutBuilderModal";
import { GYM_GIFS_DATABASE } from "../data/gymGifsDatabase";
import { SmartDateTimePicker } from "./SmartDateTimePicker";
import { ConfirmationModal } from "./ConfirmationModal";

interface GymRutinaViewProps {
  darkMode: boolean;
  userEmail?: string;
  token?: string | null;
  rutinasGimnasio?: RutinaGimnasio[];
  setRutinasGimnasio?: React.Dispatch<React.SetStateAction<RutinaGimnasio[]>>;
  registrosEntrenamiento?: RegistroEntrenamiento[];
  setRegistrosEntrenamiento?: React.Dispatch<React.SetStateAction<RegistroEntrenamiento[]>>;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  askConfirmation?: (title: string, message: string, onConfirm: () => void) => void;
  onOpenActividadModal?: () => void;
  deportesActividades?: DeporteActividad[];
  onDeleteActividad?: (id: string, skipConfirmation?: boolean) => void;
  onEditActividad?: (act: DeporteActividad) => void;
}

// Grupos musculares requeridos
export const GRUPOS_MUSCULARES: GrupoMuscular[] = [
  "Espalda",
  "Bíceps",
  "Tríceps",
  "Pecho",
  "Hombros",
  "Piernas",
  "Abdomen"
];

// Color badges por grupo muscular (unificados con color primario)
export const MUSCLE_COLORS: Record<GrupoMuscular, { bg: string; text: string; border: string; accent: string }> = {
  Espalda: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", accent: "currentColor" },
  Bíceps: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", accent: "currentColor" },
  Tríceps: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", accent: "currentColor" },
  Pecho: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", accent: "currentColor" },
  Hombros: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", accent: "currentColor" },
  Piernas: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", accent: "currentColor" },
  Abdomen: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", accent: "currentColor" }
};

// Ejercicios predeterminados en español con GIFs animados e instructivos técnicos (Base de datos de 1300+ Ejercicios de JahelCuadrado/ExerciseGymGifsDB)
export const DEFAULT_EJERCICIOS: EjercicioRutina[] = GYM_GIFS_DATABASE;

// Rutinas de muestra iniciales si el usuario no tiene ninguna
export const DEFAULT_RUTINAS: RutinaGimnasio[] = [
  {
    id: "rutina_1",
    nombre: "Fuerza e Hipertrofia Pecho & Tríceps",
    descripcion: "Enfocada en el empuje superior con ejercicios compuestos e hipertrofia.",
    grupoMuscularPrincipal: "Pecho",
    gruposMuscularesSecundarios: ["Tríceps", "Hombros"],
    duracionEstimadaMin: 60,
    ejercicios: DEFAULT_EJERCICIOS.filter(e => e.grupoMuscular === "Pecho" || e.grupoMuscular === "Tríceps").slice(0, 4)
  },
  {
    id: "rutina_2",
    nombre: "Espalda & Bíceps (Pull Day)",
    descripcion: "Tracción completa para amplitud de lats y densidad de brazos.",
    grupoMuscularPrincipal: "Espalda",
    gruposMuscularesSecundarios: ["Bíceps"],
    duracionEstimadaMin: 55,
    ejercicios: DEFAULT_EJERCICIOS.filter(e => e.grupoMuscular === "Espalda" || e.grupoMuscular === "Bíceps").slice(0, 4)
  },
  {
    id: "rutina_3",
    nombre: "Potencia Piernas & Core",
    descripcion: "Evolución de cuádriceps, isquios y fuerza estabilizadora de abdomen.",
    grupoMuscularPrincipal: "Piernas",
    gruposMuscularesSecundarios: ["Abdomen"],
    duracionEstimadaMin: 65,
    ejercicios: DEFAULT_EJERCICIOS.filter(e => e.grupoMuscular === "Piernas" || e.grupoMuscular === "Abdomen").slice(0, 4)
  }
];

// Fórmula de estimación de calorías quemadas
export function calculateExerciseCalories(sets: SetRegistro[], minutosPorEjercicio: number = 0): number {
  if (!sets || sets.length === 0) return 0;
  
  const caloriasBasales = minutosPorEjercicio * 1.2;
  let caloriasMecanicas = 0;
  
  // Excepción para Peso Corporal: Si el peso es 0 o está vacío en todos los sets
  const isBodyweight = sets.every(s => !s.pesoKg || Number(s.pesoKg) <= 0);
  if (isBodyweight) {
    const totalReps = sets.reduce((sum, s) => sum + (Number(s.repeticiones) || 0), 0);
    caloriasMecanicas = totalReps * 0.5;
  } else {
    // Lógica ponderada por TUT y Carga para cada set: (Peso * Reps * 0.01) + (Reps * 0.3)
    caloriasMecanicas = sets.reduce((sum, s) => {
      const peso = Number(s.pesoKg) || 0;
      const reps = Number(s.repeticiones) || 0;
      const esfuerzoCarga = peso * reps * 0.01;
      const esfuerzoRepeticion = reps * 0.3;
      return sum + esfuerzoCarga + esfuerzoRepeticion;
    }, 0);
  }
  
  return Math.round(caloriasMecanicas + caloriasBasales);
}

export function calcularCaloriasEjercicio(
  grupoMuscular: GrupoMuscular,
  series: number,
  repeticionesTotales: number,
  pesoPromedioKg: number
): number {
  if (series <= 0 || repeticionesTotales <= 0) return 0;
  const repsPerSet = Math.round(repeticionesTotales / Math.max(1, series));
  const mockSets: SetRegistro[] = Array.from({ length: series }).map((_, idx) => ({
    setNumero: idx + 1,
    repeticiones: repsPerSet,
    pesoKg: pesoPromedioKg,
    completado: true
  }));
  return calculateExerciseCalories(mockSets);
}

// Calcula la hora de fin basándose en una hora de inicio y la duración estimada en minutos
export function calculateAutoEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime || !startTime.includes(":")) {
    return startTime || "12:00";
  }
  const parts = startTime.split(":");
  if (parts.length < 2) return startTime;

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return startTime;

  // Sumar tiempo manejando desbordes correctamente (rollover de 24 horas)
  const startMinutes = h * 60 + m;
  const endMinutes = (startMinutes + durationMinutes) % (24 * 60);
  const finalH = Math.floor(endMinutes / 60);
  const finalM = endMinutes % 60;

  return `${String(finalH).padStart(2, "0")}:${String(finalM).padStart(2, "0")}`;
}

// Recalcula las calorías de cada ejercicio distribuyendo la TMB equitativamente, y el total acumulado
export function recalculateSessionCalories(
  ejerciciosLogs: EjercicioRegistroLog[],
  durationMin: number
): { logs: EjercicioRegistroLog[]; totalCals: number } {
  const count = ejerciciosLogs.length;
  const minsPerEx = count > 0 ? durationMin / count : 0;
  
  const updatedLogs = ejerciciosLogs.map(log => {
    const cals = calculateExerciseCalories(log.sets || [], minsPerEx);
    return {
      ...log,
      caloriasQuemadas: cals
    };
  });
  
  const totalCals = updatedLogs.reduce((acc, l) => acc + (l.caloriasQuemadas || 0), 0);
  return { logs: updatedLogs, totalCals };
}

// Calcula las calorías estimadas de una rutina completa basándose en la configuración de sus ejercicios
export function calculateRoutineEstimatedCalories(rutina: RutinaGimnasio): number {
  if (!rutina || !rutina.ejercicios || rutina.ejercicios.length === 0) return 0;
  
  const estimatedDur = rutina.duracionEstimadaMin || 45;
  const tempLogs: EjercicioRegistroLog[] = rutina.ejercicios.map((e) => {
    const seriesCount = e.seriesObjetivo || 3;
    const defaultReps = e.repeticionesObjetivo || 10;
    const defaultKg = e.pesoObjetivoKg || 20;

    const sets: SetRegistro[] = Array.from({ length: seriesCount }).map((_, sIdx) => ({
      setNumero: sIdx + 1,
      repeticiones: defaultReps,
      pesoKg: defaultKg,
      completado: true
    }));

    return {
      ejercicioId: e.id,
      ejercicioNombre: e.nombre,
      grupoMuscular: e.grupoMuscular,
      sets,
      seriesTotales: seriesCount,
      repeticionesTotales: seriesCount * defaultReps,
      pesoMaximoKg: defaultKg,
      volumenTotalKg: seriesCount * defaultReps * defaultKg,
      caloriasQuemadas: 0
    };
  });

  const { totalCals } = recalculateSessionCalories(tempLogs, estimatedDur);
  return totalCals;
}

// Componente de Entrada de Hora en Formato 24hs (HH:MM)
const Time24Input: React.FC<{
  value: string;
  onChange: (val: string) => void;
  darkMode?: boolean;
}> = ({ value, onChange, darkMode }) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d:]/g, "");
    if (raw.length === 2 && !raw.includes(":") && (value || "").length < raw.length) {
      raw = raw + ":";
    }
    if (raw.length > 5) raw = raw.slice(0, 5);
    onChange(raw);
  };

  const handleTextBlur = () => {
    if (!value || !value.includes(":")) {
      onChange("12:00");
      return;
    }
    const parts = value.split(":");
    let h = parseInt(parts[0] || "0", 10);
    let m = parseInt(parts[1] || "0", 10);
    if (isNaN(h) || h < 0) h = 0;
    if (h > 23) h = 23;
    if (isNaN(m) || m < 0) m = 0;
    if (m > 59) m = 59;
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  return (
    <div className={`flex items-center justify-between gap-2 w-full border rounded-xl px-3 py-1.5 text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all font-mono ${
      darkMode 
        ? "bg-zinc-900/50 border-zinc-700/50 text-zinc-200" 
        : "bg-white border-slate-200 text-slate-800"
    }`}>
      <input
        type="text"
        value={value}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        placeholder="18:30"
        maxLength={5}
        className={`w-full bg-transparent border-none outline-none font-black text-sm font-mono tracking-wider focus:text-primary ${
          darkMode ? "text-zinc-100" : "text-slate-800"
        }`}
      />
      <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
    </div>
  );
};

interface SelectPopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: "top" | "bottom";
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  searchable?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "-- Seleccionar --",
  disabled = false,
  className = "",
  size = "md",
  icon,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const computePopoverPosition = (): SelectPopoverPosition | null => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = rect.width;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    const popoverHeight = popoverRef.current?.offsetHeight || 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUpwards = spaceBelow < popoverHeight + 10 && spaceAbove > spaceBelow;

    if (shouldOpenUpwards) {
      return {
        bottom: window.innerHeight - rect.top + 4,
        left,
        width: popoverWidth,
        placement: "top",
      };
    } else {
      return {
        top: rect.bottom + 4,
        left,
        width: popoverWidth,
        placement: "bottom",
      };
    }
  };

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      const pos = computePopoverPosition();
      if (pos) setPopoverPosition(pos);
      setSearchTerm("");
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const pos = computePopoverPosition();
      if (pos) setPopoverPosition(pos);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block text-left ${className}`}
    >
      <motion.button
        whileTap={{ scale: 0.96 }}
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        className={`w-full flex items-center justify-between font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          size === "sm"
            ? "px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold"
            : "px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-black dark:text-white text-xs md:text-sm focus:border-primary"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {icon && (
            <span className="shrink-0 text-slate-400 dark:text-zinc-500">
              {icon}
            </span>
          )}
          <span
            data-custom-select-selected={!!selectedOption}
            className={`whitespace-nowrap ${selectedOption ? "font-bold text-black dark:text-white" : "text-slate-400 dark:text-zinc-500 font-normal"}`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${size === "sm" ? "w-3.5 h-3.5 ml-1.5" : "w-4 h-4 ml-2"}`}
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </motion.button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && popoverPosition && (
              <motion.div
                ref={popoverRef}
                initial={{
                  opacity: 0,
                  scale: 0.96,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed",
                  ...(popoverPosition.top !== undefined
                    ? { top: `${popoverPosition.top}px` }
                    : {}),
                  ...(popoverPosition.bottom !== undefined
                    ? { bottom: `${popoverPosition.bottom}px` }
                    : {}),
                  left: `${popoverPosition.left}px`,
                  width: `${popoverPosition.width}px`,
                  zIndex: 99999,
                }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden p-1 scrollbar-none opacity-100 backdrop-blur-none"
              >
                {searchable && (
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none mb-1"
                  />
                )}
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400 dark:text-zinc-500 text-center">
                    No hay opciones
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                          setSearchTerm("");
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl text-left transition-colors cursor-pointer my-0.5 ${
                          isSelected
                            ? "bg-primary text-white"
                            : "text-slate-900 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="whitespace-normal leading-tight pr-2">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-auto" />}
                      </button>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

interface MealsViewProps {
  darkMode: boolean;
  userEmail?: string;
  pantry: PantryItem[];
  setPantry: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  meals: MealPlan[];
  setMeals: React.Dispatch<React.SetStateAction<MealPlan[]>>;
  shoppingList: ShoppingItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  mercaderia: MercaderiaItem[];
  setMercaderia: React.Dispatch<React.SetStateAction<MercaderiaItem[]>>;
  alimentos: AlimentoItem[];
  setAlimentos: React.Dispatch<React.SetStateAction<AlimentoItem[]>>;
  platos: PlatoItem[];
  setPlatos: React.Dispatch<React.SetStateAction<PlatoItem[]>>;
  organizacionSemanal: OrganizacionSemanalItem[];
  setOrganizacionSemanal: React.Dispatch<
    React.SetStateAction<OrganizacionSemanalItem[]>
  >;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

// Helper para normalizar cadenas eliminando acentos/diacríticos
const normalizeSearchText = (str: string): string => {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const GymRutinaView: React.FC<GymRutinaViewProps> = ({
  darkMode,
  userEmail,
  rutinasGimnasio = [],
  setRutinasGimnasio,
  registrosEntrenamiento = [],
  setRegistrosEntrenamiento,
  showToast = () => {},
  askConfirmation,
  onOpenActividadModal,
  deportesActividades = [],
  onDeleteActividad,
  onEditActividad
}) => {
  const userId = getEffectiveUserId(userEmail);

  // Modal de confirmación interno si no se pasa askConfirmation
  const [internalConfirmModal, setInternalConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const requestConfirmation = (
    title: string,
    message: string,
    onConfirm: () => Promise<void> | void
  ) => {
    if (askConfirmation) {
      askConfirmation(title, message, onConfirm);
    } else {
      setInternalConfirmModal({ title, message, onConfirm });
    }
  };

  // Sub-secciones de la pestaña Rutina
  const [activeTab, setActiveTab] = useState<"rutinas" | "logger" | "tecnica" | "progreso" | "historial">("rutinas");
  const [selectedFilterDate, setSelectedFilterDate] = useState<Date | null>(null);

  // Filtro de Grupo Muscular activo
  const [selectedGrupoFilter, setSelectedGrupoFilter] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Motor de búsqueda y filtro para el Historial de Sesiones
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<"todos" | "gym" | "actividad">("todos");

  // Estado para rutina activa en el Logger
  const [activeWorkoutRoutine, setActiveWorkoutRoutine] = useState<RutinaGimnasio | null>(null);
  const [activeWorkoutLogs, setActiveWorkoutLogs] = useState<EjercicioRegistroLog[]>([]);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [generalFeeling, setGeneralFeeling] = useState<"Excelente" | "Bueno" | "Normal" | "Exigente" | "Agotador">("Excelente");
  const [workoutNotes, setWorkoutNotes] = useState<string>("");

  // Estado de fecha y tiempos manuales de la sesión
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [sessionStartTime, setSessionStartTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [sessionEndTime, setSessionEndTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  // Cálculo automático de la duración en minutos basándose en horas o tiempo transcurrido
  const calculatedDurationMin = useMemo(() => {
    if (sessionStartTime && sessionEndTime) {
      const [sh, sm] = sessionStartTime.split(":").map(Number);
      const [eh, em] = sessionEndTime.split(":").map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;
        if (endMins < startMins) endMins += 24 * 60; // Cruce de medianoche
        const diff = endMins - startMins;
        if (diff > 0) return diff;
      }
    }
    return Math.max(1, Math.round(elapsedSeconds / 60));
  }, [sessionStartTime, sessionEndTime, elapsedSeconds]);

  const computedActiveWorkoutLogs = useMemo(() => {
    const totalExercises = activeWorkoutLogs.length;
    const minutosPorEjercicio = totalExercises > 0 ? (calculatedDurationMin / totalExercises) : 0;
    return activeWorkoutLogs.map(log => {
      const cals = calculateExerciseCalories(log.sets, minutosPorEjercicio);
      return {
        ...log,
        caloriasQuemadas: cals
      };
    });
  }, [activeWorkoutLogs, calculatedDurationMin]);

  const liveTotalCalories = useMemo(() => {
    return computedActiveWorkoutLogs.reduce((acc, l) => acc + (l.caloriasQuemadas || 0), 0);
  }, [computedActiveWorkoutLogs]);

  // Función helper para calcular la progresión histórica (%) por set en la sesión activa
  const getSetProgression = useCallback(
    (exerciseId: string, exerciseNombre: string, setIndex: number, currentWeight: number) => {
      if (!registrosEntrenamiento || registrosEntrenamiento.length === 0) return null;
      if (currentWeight === undefined || currentWeight === null || isNaN(currentWeight) || currentWeight <= 0) {
        return null;
      }

      // Ordenar sesiones pasadas por fecha descendente
      const sortedSessions = [...registrosEntrenamiento].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );

      for (const session of sortedSessions) {
        const matchingLog = session.ejerciciosLogs?.find(
          (log) =>
            (exerciseId && log.ejercicioId === exerciseId) ||
            (exerciseNombre && log.ejercicioNombre?.toLowerCase() === exerciseNombre.toLowerCase())
        );

        if (matchingLog && matchingLog.sets && matchingLog.sets.length > setIndex) {
          const prevSet = matchingLog.sets[setIndex];
          if (prevSet && typeof prevSet.pesoKg === "number" && prevSet.pesoKg > 0) {
            const prevWeight = prevSet.pesoKg;
            const diff = currentWeight - prevWeight;
            const pct = Math.round(((currentWeight - prevWeight) / prevWeight) * 100);

            return {
              pct,
              diff: Math.round(diff * 10) / 10,
              prevWeight,
              prevReps: prevSet.repeticiones
            };
          }
        }
      }

      return null;
    },
    [registrosEntrenamiento]
  );

  // Modal para Crear/Editar Rutina
  const [showRoutineModal, setShowRoutineModal] = useState<boolean>(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState<boolean>(false);
  const [editingRoutine, setEditingRoutine] = useState<Partial<RutinaGimnasio> | null>(null);
  const [routineFormExercises, setRoutineFormExercises] = useState<EjercicioRutina[]>([]);

  // Modal para Técnica / Demostración en GIF
  const [selectedExerciseForTechnique, setSelectedExerciseForTechnique] = useState<EjercicioRutina | null>(null);

  // Modal para Editar/Registrar Sesión Histórica
  const [editingSession, setEditingSession] = useState<RegistroEntrenamiento | null>(null);
  const [sessionExerciseSearch, setSessionExerciseSearch] = useState<string>("");
  const [showLogRoutineDropdown, setShowLogRoutineDropdown] = useState<boolean>(false);
  const [isFinishingWorkout, setIsFinishingWorkout] = useState<boolean>(false);
  const [isSavingSession, setIsSavingSession] = useState<boolean>(false);

  useLockBodyScroll(
    Boolean(
      showRoutineModal ||
        showAddExerciseModal ||
        editingSession ||
        selectedExerciseForTechnique
    )
  );

  const isNewSession = useMemo(() => {
    if (!editingSession) return false;
    return !(registrosEntrenamiento || []).some(r => r.id === editingSession.id);
  }, [editingSession, registrosEntrenamiento]);

  const handleEditSessionLog = (reg: RegistroEntrenamiento) => {
    const sessionCopy = JSON.parse(JSON.stringify(reg)) as RegistroEntrenamiento;
    if (!sessionCopy.horaInicio) {
      try {
        const dateObj = new Date(sessionCopy.fecha);
        const hours = String(dateObj.getHours()).padStart(2, "0");
        const mins = String(dateObj.getMinutes()).padStart(2, "0");
        sessionCopy.horaInicio = `${hours}:${mins}`;
      } catch (e) {
        sessionCopy.horaInicio = "12:00";
      }
    }
    if (!sessionCopy.horaFin) {
      try {
        const dateObj = new Date(sessionCopy.fecha);
        const duration = sessionCopy.duracionMinutos || 45;
        const endDateObj = new Date(dateObj.getTime() + duration * 60 * 1000);
        const hours = String(endDateObj.getHours()).padStart(2, "0");
        const mins = String(endDateObj.getMinutes()).padStart(2, "0");
        sessionCopy.horaFin = `${hours}:${mins}`;
      } catch (e) {
        sessionCopy.horaFin = "13:00";
      }
    }
    setEditingSession(sessionCopy);
  };

  const handleLogRoutineSession = (rutina: RutinaGimnasio) => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const nowHH = String(now.getHours()).padStart(2, "0");
    const nowMM = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${nowHH}:${nowMM}`;

    const estimatedDur = rutina.duracionEstimadaMin || 45;
    const endTimeStr = calculateAutoEndTime(timeStr, estimatedDur);

    // Pre-cargar los ejercicios de la rutina con sus series iniciales
    const initialLogs: EjercicioRegistroLog[] = (rutina.ejercicios || []).map(e => {
      const seriesCount = e.seriesObjetivo || 3;
      const defaultReps = e.repeticionesObjetivo || 10;
      const defaultKg = e.pesoObjetivoKg || 20;

      const sets: SetRegistro[] = Array.from({ length: seriesCount }).map((_, idx) => ({
        setNumero: idx + 1,
        repeticiones: defaultReps,
        pesoKg: defaultKg,
        completado: true
      }));

      const repsTotales = sets.reduce((acc, s) => acc + (s.repeticiones || 0), 0);
      const pesoMax = Math.max(...sets.map(s => s.pesoKg || 0), 0);
      const volumen = sets.reduce((acc, s) => acc + ((s.repeticiones || 0) * (s.pesoKg || 0)), 0);

      return {
        ejercicioId: e.id,
        ejercicioNombre: e.nombre,
        grupoMuscular: e.grupoMuscular,
        sets,
        seriesTotales: seriesCount,
        repeticionesTotales: repsTotales,
        pesoMaximoKg: pesoMax,
        volumenTotalKg: volumen,
        caloriasQuemadas: 0
      };
    });

    const { logs, totalCals } = recalculateSessionCalories(initialLogs, estimatedDur);
    const volumenTotalSesionKg = logs.reduce((acc, e) => acc + e.volumenTotalKg, 0);

    const newSession: RegistroEntrenamiento = {
      id: `registro_${Date.now()}`,
      rutinaId: rutina.id,
      rutinaNombre: rutina.nombre,
      fecha: `${dateStr}T${timeStr}:00.000Z`,
      duracionMinutos: estimatedDur,
      horaInicio: timeStr,
      horaFin: endTimeStr,
      ejerciciosLogs: logs,
      volumenTotalSesionKg,
      caloriasTotalesSesion: totalCals,
      notas: "",
      sensacionGral: "Excelente"
    };

    setEditingSession(newSession);
    setShowLogRoutineDropdown(false);
  };

  const handleUpdateSessionTimeField = (field: "horaInicio" | "horaFin", value: string) => {
    if (!editingSession) return;
    let updated = { ...editingSession, [field]: value };
    
    // Auto-calcula horaFin si se modifica horaInicio y es un string de hora completo y válido (HH:MM)
    if (field === "horaInicio" && value && value.length === 5 && value.includes(":")) {
      let duration = 45;
      if (editingSession.rutinaId) {
        const r = (rutinasGimnasio || []).find(x => x.id === editingSession.rutinaId);
        if (r && r.duracionEstimadaMin) {
          duration = r.duracionEstimadaMin;
        } else if (editingSession.duracionMinutos) {
          duration = editingSession.duracionMinutos;
        }
      } else if (editingSession.duracionMinutos) {
        duration = editingSession.duracionMinutos;
      }
      
      const newEndTime = calculateAutoEndTime(value, duration);
      updated.horaFin = newEndTime;
      updated.duracionMinutos = duration;
    }

    const start = updated.horaInicio;
    const end = updated.horaFin;
    if (start && end && start.length === 5 && end.length === 5) {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;
        if (endMins < startMins) endMins += 24 * 60; // Cruce de medianoche
        const diff = endMins - startMins;
        if (diff > 0) {
          updated.duracionMinutos = diff;
        }
      }
    }

    const { logs, totalCals } = recalculateSessionCalories(
      updated.ejerciciosLogs || [],
      updated.duracionMinutos || 45
    );
    updated.ejerciciosLogs = logs;
    updated.caloriasTotalesSesion = totalCals;

    setEditingSession(updated);
  };

  const handleUpdateSessionField = (field: keyof RegistroEntrenamiento, value: any) => {
    if (!editingSession) return;
    let nextSession = { ...editingSession, [field]: value };
    if (field === "duracionMinutos") {
      const durationMin = Number(value) || 0;
      const { logs, totalCals } = recalculateSessionCalories(
        nextSession.ejerciciosLogs || [],
        durationMin
      );
      nextSession.ejerciciosLogs = logs;
      nextSession.caloriasTotalesSesion = totalCals;
    }
    setEditingSession(nextSession);
  };

  const handleUpdateExerciseLogSet = (
    exIdx: number,
    setIdx: number,
    field: keyof SetRegistro,
    value: any
  ) => {
    if (!editingSession) return;
    const updated = [...(editingSession.ejerciciosLogs || [])];
    const targetEx = { ...updated[exIdx] };
    const sets = [...(targetEx.sets || [])];
    sets[setIdx] = { ...sets[setIdx], [field]: value };
    targetEx.sets = sets;

    targetEx.seriesTotales = sets.length;
    targetEx.repeticionesTotales = sets.reduce((acc, s) => acc + (Number(s.repeticiones) || 0), 0);
    targetEx.pesoMaximoKg = sets.reduce((max, s) => Math.max(max, Number(s.pesoKg) || 0), 0);
    targetEx.volumenTotalKg = sets.reduce((acc, s) => acc + ((Number(s.repeticiones) || 0) * (Number(s.pesoKg) || 0)), 0);

    updated[exIdx] = targetEx;

    const durationMin = editingSession.duracionMinutos || 45;
    const { logs, totalCals } = recalculateSessionCalories(updated, durationMin);

    setEditingSession({ 
      ...editingSession, 
      ejerciciosLogs: logs,
      caloriasTotalesSesion: totalCals
    });
  };

  const handleAddSetToExerciseLog = (exIdx: number) => {
    if (!editingSession) return;
    const updated = [...(editingSession.ejerciciosLogs || [])];
    const targetEx = { ...updated[exIdx] };
    const sets = [...(targetEx.sets || [])];
    const lastSet = sets[sets.length - 1];
    const newSetNumber = sets.length + 1;
    sets.push({
      setNumero: newSetNumber,
      repeticiones: lastSet ? lastSet.repeticiones : 10,
      pesoKg: lastSet ? lastSet.pesoKg : 20,
      completado: true
    });
    targetEx.sets = sets;

    targetEx.seriesTotales = sets.length;
    targetEx.repeticionesTotales = sets.reduce((acc, s) => acc + (Number(s.repeticiones) || 0), 0);
    targetEx.pesoMaximoKg = sets.reduce((max, s) => Math.max(max, Number(s.pesoKg) || 0), 0);
    targetEx.volumenTotalKg = sets.reduce((acc, s) => acc + ((Number(s.repeticiones) || 0) * (Number(s.pesoKg) || 0)), 0);

    updated[exIdx] = targetEx;

    const durationMin = editingSession.duracionMinutos || 45;
    const { logs, totalCals } = recalculateSessionCalories(updated, durationMin);

    setEditingSession({ 
      ...editingSession, 
      ejerciciosLogs: logs,
      caloriasTotalesSesion: totalCals
    });
  };

  const handleRemoveSetFromExerciseLog = (exIdx: number, setIdx: number) => {
    if (!editingSession) return;
    const updated = [...(editingSession.ejerciciosLogs || [])];
    const targetEx = { ...updated[exIdx] };
    const sets = (targetEx.sets || []).filter((_, idx) => idx !== setIdx);
    targetEx.sets = sets.map((s, idx) => ({ ...s, setNumero: idx + 1 }));

    targetEx.seriesTotales = sets.length;
    targetEx.repeticionesTotales = sets.reduce((acc, s) => acc + (Number(s.repeticiones) || 0), 0);
    targetEx.pesoMaximoKg = sets.reduce((max, s) => Math.max(max, Number(s.pesoKg) || 0), 0);
    targetEx.volumenTotalKg = sets.reduce((acc, s) => acc + ((Number(s.repeticiones) || 0) * (Number(s.pesoKg) || 0)), 0);

    updated[exIdx] = targetEx;

    const durationMin = editingSession.duracionMinutos || 45;
    const { logs, totalCals } = recalculateSessionCalories(updated, durationMin);

    setEditingSession({ 
      ...editingSession, 
      ejerciciosLogs: logs,
      caloriasTotalesSesion: totalCals
    });
  };

  const handleRemoveExerciseFromLog = (exIdx: number) => {
    if (!editingSession) return;
    const updated = (editingSession.ejerciciosLogs || []).filter((_, idx) => idx !== exIdx);

    const durationMin = editingSession.duracionMinutos || 45;
    const { logs, totalCals } = recalculateSessionCalories(updated, durationMin);

    setEditingSession({ 
      ...editingSession, 
      ejerciciosLogs: logs,
      caloriasTotalesSesion: totalCals
    });
  };

  const handleAddExerciseToLog = (exerciseObj: EjercicioRutina) => {
    if (!editingSession) return;
    const initialSets = [
      {
        setNumero: 1,
        repeticiones: exerciseObj.repeticionesObjetivo || 10,
        pesoKg: exerciseObj.pesoObjetivoKg || 20,
        completado: true
      }
    ];
    const newLog: EjercicioRegistroLog = {
      ejercicioId: exerciseObj.id,
      ejercicioNombre: exerciseObj.nombre,
      grupoMuscular: exerciseObj.grupoMuscular,
      seriesTotales: 1,
      repeticionesTotales: exerciseObj.repeticionesObjetivo || 10,
      pesoMaximoKg: exerciseObj.pesoObjetivoKg || 20,
      volumenTotalKg: (exerciseObj.repeticionesObjetivo || 10) * (exerciseObj.pesoObjetivoKg || 20),
      caloriasQuemadas: 0,
      sets: initialSets
    };
    const updated = [...(editingSession.ejerciciosLogs || []), newLog];

    const durationMin = editingSession.duracionMinutos || 45;
    const { logs, totalCals } = recalculateSessionCalories(updated, durationMin);

    setEditingSession({
      ...editingSession,
      ejerciciosLogs: logs,
      caloriasTotalesSesion: totalCals
    });
  };

  const handleSaveEditedSession = async () => {
    if (!editingSession) return;
    if (!editingSession.rutinaNombre.trim()) {
      showToast("Ingresa un nombre para la sesión", "error");
      return;
    }

    const durationMin = editingSession.duracionMinutos || 45;
    const { logs, totalCals } = recalculateSessionCalories(
      editingSession.ejerciciosLogs || [],
      durationMin
    );

    const updatedEjerciciosLogs = logs.map((eLog) => {
      const sets = eLog.sets || [];
      const seriesTotales = sets.length;
      const repeticionesTotales = sets.reduce((acc, s) => acc + (Number(s.repeticiones) || 0), 0);
      const pesoMaximoKg = sets.reduce((max, s) => Math.max(max, Number(s.pesoKg) || 0), 0);
      const volumenTotalKg = sets.reduce((acc, s) => acc + ((Number(s.repeticiones) || 0) * (Number(s.pesoKg) || 0)), 0);

      return {
        ...eLog,
        sets: sets.map((s, idx) => ({ ...s, setNumero: idx + 1 })),
        seriesTotales,
        repeticionesTotales,
        pesoMaximoKg,
        volumenTotalKg
      };
    });

    const volumenTotalSesionKg = updatedEjerciciosLogs.reduce((acc, e) => acc + e.volumenTotalKg, 0);

    // Actualizar fecha con la hora de inicio editada
    let finalFecha = editingSession.fecha;
    if (editingSession.horaInicio) {
      try {
        const baseDate = editingSession.fecha.split("T")[0];
        const timeMatch = editingSession.horaInicio.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
        if (timeMatch) {
          finalFecha = new Date(`${baseDate}T${editingSession.horaInicio}:00`).toISOString();
        }
      } catch (e) {
        // Fallback
      }
    }

    const finalUpdatedSession: RegistroEntrenamiento = {
      ...editingSession,
      fecha: finalFecha,
      ejerciciosLogs: updatedEjerciciosLogs,
      volumenTotalSesionKg,
      caloriasTotalesSesion: totalCals
    };

    setIsSavingSession(true);
    try {
      if (userId) {
        await saveItemToFirestore(userId, "registros_entrenamiento", finalUpdatedSession);
      }
      const isNew = !(registrosEntrenamiento || []).some((r) => r.id === finalUpdatedSession.id);
      setRegistrosEntrenamiento?.((prev) => {
        const filtered = (prev || []).filter((r) => r.id !== finalUpdatedSession.id);
        return [finalUpdatedSession, ...filtered];
      });
      showToast(
        isNew
          ? "Sesión de entrenamiento registrada correctamente"
          : "Sesión de entrenamiento actualizada correctamente",
        "success"
      );
      setEditingSession(null);
    } catch (err) {
      showToast("Error al guardar la sesión", "error");
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleDeleteSessionLog = (id: string) => {
    const doDelete = async () => {
      try {
        if (userId) {
          await deleteItemFromFirestore(userId, "registros_entrenamiento", id);
        }
        setRegistrosEntrenamiento?.((prev) => (prev || []).filter((r) => r.id !== id));
        showToast("Sesión eliminada del historial", "success");
      } catch (err) {
        showToast("Error al eliminar la sesión", "error");
      }
    };

    requestConfirmation(
      "Eliminar Sesión",
      "¿Estás seguro de que deseas eliminar este registro de entrenamiento?",
      doDelete
    );
  };

  // Modal para Agregar Ejercicio Personalizado
  const [customExerciseForm, setCustomExerciseForm] = useState<Partial<EjercicioRutina>>({
    nombre: "",
    grupoMuscular: "Pecho",
    seriesObjetivo: 4,
    repeticionesObjetivo: 10,
    pesoObjetivoKg: 20,
    gifUrl: "",
    notasTecnica: ""
  });

  // Estado del gráfico de progreso
  const [chartMetric, setChartMetric] = useState<"pesoMax" | "volumen" | "calorias">("pesoMax");
  const [chartExerciseFilter, setChartExerciseFilter] = useState<string>("Todos");

  // Estado para la búsqueda de ejercicios en el gráfico
  const [exerciseDropdownSearch, setExerciseDropdownSearch] = useState("");

  
  // Ref y funciones para desplazamiento de las pestañas superiores de navegación
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const scrollTabsLeft = () => {
    const tabs = ["rutinas","historial","tecnica","progreso"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1] as any);
      if (tabsScrollRef.current) {
        const buttons = tabsScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };
  const scrollTabsRight = () => {
    const tabs = ["rutinas","historial","tecnica","progreso"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1] as any);
      if (tabsScrollRef.current) {
        const buttons = tabsScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  // Usar las rutinas registradas en el estado directamente
  const listRutinas = useMemo(() => {
    return rutinasGimnasio || [];
  }, [rutinasGimnasio]);

  // Inicialización de muestra únicamente una sola vez para nuevos usuarios
  useEffect(() => {
    if (typeof window !== "undefined" && userId) {
      const initialized = localStorage.getItem(`gym_routines_init_${userId}`);
      if (!initialized) {
        localStorage.setItem(`gym_routines_init_${userId}`, "true");
        if ((!rutinasGimnasio || rutinasGimnasio.length === 0) && setRutinasGimnasio) {
          DEFAULT_RUTINAS.forEach(r => {
            saveItemToFirestore(userId, "rutinas_gimnasio", r).catch(() => {});
          });
          setRutinasGimnasio(DEFAULT_RUTINAS);
        }
      }
    }
  }, [userId]);

  // Cronómetro del entrenamiento activo
  useEffect(() => {
    let interval: any = null;
    if (workoutStartTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [workoutStartTime]);

  // Filtrado de rutinas
  const filteredRutinas = useMemo(() => {
    const normSearch = normalizeSearchText(searchTerm);
    return listRutinas.filter(r => {
      const matchGrupo = selectedGrupoFilter === "Todos" || r.grupoMuscularPrincipal === selectedGrupoFilter || r.gruposMuscularesSecundarios?.includes(selectedGrupoFilter as GrupoMuscular);
      const matchSearch = !normSearch || normalizeSearchText(r.nombre).includes(normSearch) || normalizeSearchText(r.descripcion || "").includes(normSearch);
      return matchGrupo && matchSearch;
    });
  }, [listRutinas, selectedGrupoFilter, searchTerm]);

  // Filtrado de biblioteca de ejercicios
  const allExercises = useMemo(() => {
    // Combinar ejercicios predeterminados con los creados en rutinas
    const map = new Map<string, EjercicioRutina>();
    DEFAULT_EJERCICIOS.forEach(e => map.set(e.nombre.toLowerCase(), e));
    listRutinas.forEach(r => {
      r.ejercicios?.forEach(e => {
        if (!map.has(e.nombre.toLowerCase())) {
          map.set(e.nombre.toLowerCase(), e);
        }
      });
    });
    return Array.from(map.values());
  }, [listRutinas]);

  const filteredExercises = useMemo(() => {
    const normSearch = normalizeSearchText(searchTerm);
    return allExercises.filter(e => {
      const matchGrupo = selectedGrupoFilter === "Todos" || e.grupoMuscular === selectedGrupoFilter;
      const matchSearch = !normSearch ||
        normalizeSearchText(e.nombre).includes(normSearch) ||
        normalizeSearchText(e.notasTecnica || "").includes(normSearch) ||
        normalizeSearchText(e.grupoMuscular).includes(normSearch);
      return matchGrupo && matchSearch;
    });
  }, [allExercises, selectedGrupoFilter, searchTerm]);

  // Estado de búsqueda en modal de selección rápida de ejercicios
  const [modalPickerSearch, setModalPickerSearch] = useState("");

  // Paginación de la biblioteca de ejercicios (15 por página)
  const EXERCISES_PAGE_SIZE = 15;
  const [techniquePage, setTechniquePage] = useState(1);

  // Reset automático de página al cambiar filtro por grupo muscular o búsqueda
  useEffect(() => {
    setTechniquePage(1);
  }, [selectedGrupoFilter, searchTerm]);

  const totalTechniquePages = Math.ceil(filteredExercises.length / EXERCISES_PAGE_SIZE) || 1;
  const validTechniquePage = Math.min(techniquePage, totalTechniquePages);

  const displayedTechniqueExercises = useMemo(() => {
    const start = (validTechniquePage - 1) * EXERCISES_PAGE_SIZE;
    return filteredExercises.slice(start, start + EXERCISES_PAGE_SIZE);
  }, [filteredExercises, validTechniquePage]);

  // Formatear segundos en MM:SS o HH:MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours}h ${mins % 60}m ${remainingSecs < 10 ? "0" : ""}${remainingSecs}s`;
    }
    return `${mins}m ${remainingSecs < 10 ? "0" : ""}${remainingSecs}s`;
  };

  // --- ACCIONES DE RUTINA ---
  const handleOpenNewRoutineModal = () => {
    setEditingRoutine({
      nombre: "",
      descripcion: "",
      grupoMuscularPrincipal: "Pecho",
      duracionEstimadaMin: 60
    });
    setRoutineFormExercises([]);
    setShowRoutineModal(true);
  };

  const handleEditRoutine = (rutina: RutinaGimnasio) => {
    setEditingRoutine(rutina);
    setRoutineFormExercises(rutina.ejercicios || []);
    setShowRoutineModal(true);
  };

  const handleSaveRoutine = async () => {
    if (!editingRoutine?.nombre?.trim()) {
      showToast("Por favor ingrese el nombre de la rutina", "error");
      return;
    }
    if (routineFormExercises.length === 0) {
      showToast("Agregue al menos un ejercicio a la rutina", "error");
      return;
    }

    const nuevaRutina: RutinaGimnasio = {
      id: editingRoutine.id || `rutina_${Date.now()}`,
      nombre: editingRoutine.nombre.trim(),
      descripcion: editingRoutine.descripcion || "",
      grupoMuscularPrincipal: editingRoutine.grupoMuscularPrincipal || "Pecho",
      gruposMuscularesSecundarios: editingRoutine.gruposMuscularesSecundarios || [],
      duracionEstimadaMin: editingRoutine.duracionEstimadaMin || 60,
      ejercicios: routineFormExercises,
      ultimaEdicion: new Date().toISOString()
    };

    try {
      if (userId) {
        await saveItemToFirestore(userId, "rutinas_gimnasio", nuevaRutina);
      }
      setRutinasGimnasio?.(prev => {
        const exists = prev.some(r => r.id === nuevaRutina.id);
        if (exists) return prev.map(r => r.id === nuevaRutina.id ? nuevaRutina : r);
        return [nuevaRutina, ...prev];
      });
      showToast("Rutina guardada exitosamente", "success");
      setShowRoutineModal(false);
      setEditingRoutine(null);
      setRoutineFormExercises([]);
    } catch (err) {
      showToast("Error al guardar la rutina", "error");
    }
  };

  const handleDeleteRoutine = (id: string) => {
    const doDelete = async () => {
      try {
        if (userId) {
          await deleteItemFromFirestore(userId, "rutinas_gimnasio", id);
        }
        setRutinasGimnasio?.(prev => prev.filter(r => r.id !== id));
        showToast("Rutina eliminada", "success");
      } catch (err) {
        showToast("Error al eliminar la rutina", "error");
      }
    };

    requestConfirmation("Eliminar Rutina", "¿Deseas eliminar esta rutina de gimnasio?", doDelete);
  };

  // --- INICIAR Y REGISTRAR ENTRENAMIENTO ---
  const handleStartWorkout = (rutina?: RutinaGimnasio) => {
    setActiveWorkoutRoutine(rutina || null);
    const now = new Date();
    setWorkoutStartTime(now.getTime());
    setWorkoutNotes("");
    setGeneralFeeling("Excelente");

    const dateStr = now.toISOString().split("T")[0];
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hh}:${mm}`;

    setSessionDate(dateStr);
    setSessionStartTime(timeStr);
    
    const estimatedDur = rutina?.duracionEstimadaMin || 45;
    const endTimeStr = calculateAutoEndTime(timeStr, estimatedDur);
    setSessionEndTime(endTimeStr);

    // Pre-cargar los ejercicios de la rutina con sus series iniciales
    const initialLogs: EjercicioRegistroLog[] = (rutina?.ejercicios || DEFAULT_EJERCICIOS.slice(0, 3)).map(e => {
      const seriesCount = e.seriesObjetivo || 3;
      const defaultReps = e.repeticionesObjetivo || 10;
      const defaultKg = e.pesoObjetivoKg || 20;

      const sets: SetRegistro[] = Array.from({ length: seriesCount }).map((_, idx) => ({
        setNumero: idx + 1,
        repeticiones: defaultReps,
        pesoKg: defaultKg,
        completado: true
      }));

      const repsTotales = sets.reduce((acc, s) => acc + (s.repeticiones || 0), 0);
      const pesoMax = Math.max(...sets.map(s => s.pesoKg || 0), 0);
      const volumen = sets.reduce((acc, s) => acc + ((s.repeticiones || 0) * (s.pesoKg || 0)), 0);
      const cals = calculateExerciseCalories(sets);

      return {
        ejercicioId: e.id,
        ejercicioNombre: e.nombre,
        grupoMuscular: e.grupoMuscular,
        sets,
        seriesTotales: seriesCount,
        repeticionesTotales: repsTotales,
        pesoMaximoKg: pesoMax,
        volumenTotalKg: volumen,
        caloriasQuemadas: cals
      };
    });

    setActiveWorkoutLogs(initialLogs);
    setActiveTab("logger");
  };

  const handleStartTimeChange = (val: string) => {
    setSessionStartTime(val);
    if (val && val.length === 5 && val.includes(":")) {
      const estimatedDur = activeWorkoutRoutine?.duracionEstimadaMin || 45;
      const endTime = calculateAutoEndTime(val, estimatedDur);
      setSessionEndTime(endTime);
    }
  };

  // Cambiar valores de un set en el entrenamiento activo
  const handleSetChange = (exerciseIdx: number, setIdx: number, field: "repeticiones" | "pesoKg", value: number) => {
    setActiveWorkoutLogs(prev => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIdx] };
      const newSets = [...ex.sets];
      newSets[setIdx] = { ...newSets[setIdx], [field]: Math.max(0, value) };

      const seriesCount = newSets.length;
      const repsTotales = newSets.reduce((acc, s) => acc + (s.repeticiones || 0), 0);
      const pesoMax = Math.max(...newSets.map(s => s.pesoKg || 0), 0);
      const volumen = newSets.reduce((acc, s) => acc + ((s.repeticiones || 0) * (s.pesoKg || 0)), 0);
      const cals = calculateExerciseCalories(newSets);

      ex.sets = newSets;
      ex.seriesTotales = seriesCount;
      ex.repeticionesTotales = repsTotales;
      ex.pesoMaximoKg = pesoMax;
      ex.volumenTotalKg = volumen;
      ex.caloriasQuemadas = cals;

      updated[exerciseIdx] = ex;
      return updated;
    });
  };

  const handleAddSetToExercise = (exerciseIdx: number) => {
    setActiveWorkoutLogs(prev => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIdx] };
      const lastSet = ex.sets[ex.sets.length - 1] || { repeticiones: 10, pesoKg: 20 };
      const newSets = [...ex.sets, { setNumero: ex.sets.length + 1, repeticiones: lastSet.repeticiones, pesoKg: lastSet.pesoKg, completado: true }];

      const seriesCount = newSets.length;
      const repsTotales = newSets.reduce((acc, s) => acc + (s.repeticiones || 0), 0);
      const pesoMax = Math.max(...newSets.map(s => s.pesoKg || 0), 0);
      const volumen = newSets.reduce((acc, s) => acc + ((s.repeticiones || 0) * (s.pesoKg || 0)), 0);
      const cals = calculateExerciseCalories(newSets);

      ex.sets = newSets;
      ex.seriesTotales = seriesCount;
      ex.repeticionesTotales = repsTotales;
      ex.pesoMaximoKg = pesoMax;
      ex.volumenTotalKg = volumen;
      ex.caloriasQuemadas = cals;

      updated[exerciseIdx] = ex;
      return updated;
    });
  };

  const handleRemoveSetFromExercise = (exerciseIdx: number, setIdx: number) => {
    setActiveWorkoutLogs(prev => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIdx] };
      if (ex.sets.length <= 1) return prev; // Mantener al menos 1 set

      const newSets = ex.sets.filter((_, idx) => idx !== setIdx).map((s, i) => ({ ...s, setNumero: i + 1 }));

      const seriesCount = newSets.length;
      const repsTotales = newSets.reduce((acc, s) => acc + (s.repeticiones || 0), 0);
      const pesoMax = Math.max(...newSets.map(s => s.pesoKg || 0), 0);
      const volumen = newSets.reduce((acc, s) => acc + ((s.repeticiones || 0) * (s.pesoKg || 0)), 0);
      const cals = calculateExerciseCalories(newSets);

      ex.sets = newSets;
      ex.seriesTotales = seriesCount;
      ex.repeticionesTotales = repsTotales;
      ex.pesoMaximoKg = pesoMax;
      ex.volumenTotalKg = volumen;
      ex.caloriasQuemadas = cals;

      updated[exerciseIdx] = ex;
      return updated;
    });
  };

  // Guardar el registro de entrenamiento finalizado en Firestore
  const handleFinishWorkout = async () => {
    if (activeWorkoutLogs.length === 0) {
      showToast("No hay ejercicios registrados en esta sesión", "error");
      return;
    }

    setIsFinishingWorkout(true);
    try {
      const durationMin = calculatedDurationMin;
      const totalVolumen = computedActiveWorkoutLogs.reduce((acc, l) => acc + l.volumenTotalKg, 0);
      const totalCals = liveTotalCalories;

      const fechaStr = sessionDate ? `${sessionDate}T${sessionStartTime || "12:00"}:00` : new Date().toISOString();

      const uniqueId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nuevoRegistro: RegistroEntrenamiento = {
        id: uniqueId,
        rutinaId: activeWorkoutRoutine?.id || "custom",
        rutinaNombre: activeWorkoutRoutine?.nombre || "Entrenamiento Libre Gimnasio",
        fecha: new Date(fechaStr).toISOString(),
        duracionMinutos: durationMin,
        horaInicio: sessionStartTime || undefined,
        horaFin: sessionEndTime || undefined,
        ejerciciosLogs: computedActiveWorkoutLogs,
        volumenTotalSesionKg: totalVolumen,
        caloriasTotalesSesion: totalCals,
        notas: workoutNotes,
        sensacionGral: generalFeeling
      };

      if (userId) {
        await saveItemToFirestore(userId, "registros_entrenamiento", nuevoRegistro);
      }
      setRegistrosEntrenamiento?.(prev => {
        const filtered = (prev || []).filter(r => r.id !== nuevoRegistro.id);
        return [nuevoRegistro, ...filtered];
      });
      showToast(`¡Entrenamiento registrado! ${totalCals} kcal quemadas 🔥`, "success");

      // Resetear estado del workout
      setWorkoutStartTime(null);
      setActiveWorkoutRoutine(null);
      setActiveWorkoutLogs([]);
      setActiveTab("historial");
    } catch (err) {
      showToast("Error al guardar el registro de entrenamiento", "error");
    } finally {
      setIsFinishingWorkout(false);
    }
  };

  // Guardar Ejercicio Personalizado
  const handleSaveCustomExercise = () => {
    if (!customExerciseForm.nombre?.trim()) {
      showToast("Ingresa el nombre del ejercicio", "error");
      return;
    }
    const newEx: EjercicioRutina = {
      id: `ej_custom_${Date.now()}`,
      nombre: customExerciseForm.nombre.trim(),
      grupoMuscular: customExerciseForm.grupoMuscular || "Pecho",
      seriesObjetivo: Number(customExerciseForm.seriesObjetivo) || 4,
      repeticionesObjetivo: Number(customExerciseForm.repeticionesObjetivo) || 10,
      pesoObjetivoKg: Number(customExerciseForm.pesoObjetivoKg) || 20,
      gifUrl: customExerciseForm.gifUrl || "",
      notasTecnica: customExerciseForm.notasTecnica || ""
    };

    setRoutineFormExercises(prev => [...prev, newEx]);
    setShowAddExerciseModal(false);
    showToast("Ejercicio añadido a la rutina", "success");
  };

  // Deduplicar registros por ID
  const uniqueRegistros = useMemo(() => {
    const seen = new Set<string>();
    const result: RegistroEntrenamiento[] = [];
    (registrosEntrenamiento || []).forEach((reg, index) => {
      const idKey = reg.id || `reg_${index}`;
      if (!seen.has(idKey)) {
        seen.add(idKey);
        result.push(reg);
      }
    });
    return result;
  }, [registrosEntrenamiento]);

  // Historial combinado (Gym + Deportes/Actividades)
  const combinedHistory = useMemo(() => {
    const gymItems = uniqueRegistros.map((reg) => ({
      id: reg.id,
      fecha: reg.fecha,
      tipo: "gym" as const,
      gym: reg,
    }));

    const activityItems = (deportesActividades || []).map((act) => ({
      id: act.id,
      fecha: act.fechaDesde,
      tipo: "actividad" as const,
      actividad: act,
    }));

    const combined = [...gymItems, ...activityItems];
    combined.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return combined;
  }, [uniqueRegistros, deportesActividades]);

  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0: Sunday, 1: Monday, ...
    const distToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMonday);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const weekData = useMemo(() => {
    const daysShort = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    return weekDays.map((day, idx) => {
      let calories = 0;
      let hasActivity = false;

      combinedHistory.forEach((item) => {
        if (!item.fecha) return;
        const dateStr = item.fecha.replace(" ", "T");
        const itemDate = new Date(dateStr);
        if (
          !isNaN(itemDate.getTime()) &&
          itemDate.getFullYear() === day.getFullYear() &&
          itemDate.getMonth() === day.getMonth() &&
          itemDate.getDate() === day.getDate()
        ) {
          hasActivity = true;
          if (item.tipo === "gym" && item.gym) {
            calories += Number(item.gym.caloriasTotalesSesion) || 0;
          } else if (item.tipo === "actividad" && item.actividad) {
            calories += Number(item.actividad.calorias) || 0;
          }
        }
      });

      return {
        dateObj: day,
        dayLabel: daysShort[idx],
        dayNumber: day.getDate(),
        calories,
        hasActivity,
      };
    });
  }, [weekDays, combinedHistory]);

  const activeDaysCount = useMemo(() => {
    return weekData.filter(d => d.hasActivity).length;
  }, [weekData]);

  // --- LISTADO DE EJERCICIOS DISPONIBLES PARA FILTRAR EN GRÁFICOS (CARGADOS EN MIS RUTINAS Y/O HISTORIAL) ---
  const availableExerciseNames = useMemo(() => {
    const set = new Set<string>();

    // 1. Ejercicios cargados en Mis Rutinas
    listRutinas.forEach(rutina => {
      rutina.ejercicios?.forEach(e => {
        if (e.nombre) set.add(e.nombre);
      });
    });

    // 2. Ejercicios registrados en Historial de Sesiones
    uniqueRegistros.forEach(r => {
      r.ejerciciosLogs?.forEach(el => {
        if (el.ejercicioNombre) set.add(el.ejercicioNombre);
      });
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [listRutinas, uniqueRegistros]);

  // Helper para determinar el grupo muscular e icono específico de un ejercicio
  const getExerciseMuscleGroup = (exName: string): string => {
    if (exName === "Todos") return "General";

    const matchInAll = allExercises.find(e => e.nombre.toLowerCase() === exName.toLowerCase());
    if (matchInAll?.grupoMuscular) return matchInAll.grupoMuscular;

    for (const r of listRutinas) {
      const found = r.ejercicios?.find(e => e.nombre.toLowerCase() === exName.toLowerCase());
      if (found?.grupoMuscular) return found.grupoMuscular;
    }

    const name = exName.toLowerCase();
    if (
      name.includes("pierna") || name.includes("squat") || name.includes("sentadilla") ||
      name.includes("prensa") || name.includes("cadera") || name.includes("cuadriceps") ||
      name.includes("isquios") || name.includes("gemelo") || name.includes("zancada") ||
      name.includes("hack") || name.includes("gluteo") || name.includes("abducc") ||
      name.includes("aducc") || name.includes("pantorrilla") || name.includes("tibial")
    ) {
      return "Piernas";
    }
    if (name.includes("biceps") || name.includes("bicep") || name.includes("curl") || name.includes("martillo") || name.includes("concentrado")) {
      return "Bíceps";
    }
    if (name.includes("triceps") || name.includes("tricep") || name.includes("copa") || name.includes("patada") || name.includes("frances") || name.includes("fondos") || name.includes("fondo")) {
      return "Tríceps";
    }
    if (name.includes("pecho") || name.includes("bench") || name.includes("press de banca") || name.includes("apertura") || name.includes("flexi") || name.includes("pushup") || name.includes("pectoral")) {
      return "Pecho";
    }
    if (name.includes("espalda") || name.includes("remo") || name.includes("jalon") || name.includes("dominada") || name.includes("pullup") || name.includes("pulldown") || name.includes("peso muerto") || name.includes("dorsal")) {
      return "Espalda";
    }
    if (name.includes("hombro") || name.includes("militar") || name.includes("elevacion") || name.includes("deltoid") || name.includes("vuelo")) {
      return "Hombros";
    }
    if (name.includes("abdomin") || name.includes("crunch") || name.includes("plancha") || name.includes("abs") || name.includes("core") || name.includes("rollout") || name.includes("oblicuo")) {
      return "Abdomen";
    }

    return "General";
  };

  const renderMuscleGroupLucideIcon = (group: string, className: string = "w-4 h-4 shrink-0 text-primary") => {
    switch (group) {
      case "Piernas":
      case "Glúteos":
      case "Gemelos":
        return <Footprints className={className} />;
      case "Bíceps":
      case "Tríceps":
      case "Brazos":
        return <Dumbbell className={className} />;
      case "Pecho":
        return <Target className={className} />;
      case "Espalda":
        return <Layers className={className} />;
      case "Hombros":
        return <Shield className={className} />;
      case "Abdomen":
        return <Flame className={className} />;
      case "General":
      default:
        return <BarChart2 className={className} />;
    }
  };

  const getMuscleGroupSymbol = (group: string): string => {
    switch (group) {
      case "Piernas":
        return "⚡";
      case "Bíceps":
        return "💪";
      case "Tríceps":
        return "🎯";
      case "Pecho":
        return "🛡️";
      case "Espalda":
        return "📊";
      case "Hombros":
        return "🔥";
      case "Abdomen":
        return "✨";
      default:
        return "📊";
    }
  };

  // --- DATOS Y PROCESAMIENTO PARA GRÁFICOS DE PROGRESO POR EJERCICIO (RECHARTS) ---
  const chartData = useMemo(() => {
    const isAll = chartExerciseFilter === "Todos";

    if (isAll) {
      if (!uniqueRegistros || uniqueRegistros.length === 0) {
        // Datos de demostración interactivos para resumen general
        return [
          { fecha: "01/08", pesoMax: 60, volumen: 2400, calorias: 280, rutina: "Pecho & Tríceps" },
          { fecha: "03/08", pesoMax: 65, volumen: 2800, calorias: 310, rutina: "Espalda & Bíceps" },
          { fecha: "05/08", pesoMax: 70, volumen: 3200, calorias: 340, rutina: "Piernas & Core" },
          { fecha: "07/08", pesoMax: 72.5, volumen: 3500, calorias: 360, rutina: "Pecho & Tríceps" },
          { fecha: "09/08", pesoMax: 75, volumen: 3850, calorias: 390, rutina: "Espalda & Bíceps" }
        ];
      }

      const sorted = [...uniqueRegistros].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      return sorted.map(reg => {
        const dateFormatted = new Date(reg.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
        const pesoMax = Math.max(...(reg.ejerciciosLogs || []).map(e => e.pesoMaximoKg || 0), 0);
        return {
          fecha: dateFormatted,
          pesoMax,
          volumen: reg.volumenTotalSesionKg || 0,
          calorias: reg.caloriasTotalesSesion || 0,
          rutina: reg.rutinaNombre
        };
      });
    } else {
      // Ejercicio específico seleccionado
      const matchingSessions = uniqueRegistros.filter(reg =>
        reg.ejerciciosLogs?.some(e => e.ejercicioNombre.toLowerCase() === chartExerciseFilter.toLowerCase())
      );

      if (matchingSessions.length > 0) {
        const sorted = [...matchingSessions].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        return sorted.map(reg => {
          const dateFormatted = new Date(reg.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
          const filteredExLogs = reg.ejerciciosLogs.filter(e => e.ejercicioNombre.toLowerCase() === chartExerciseFilter.toLowerCase());
          const pesoMax = Math.max(...filteredExLogs.map(e => e.pesoMaximoKg || 0), 0);
          const volumen = filteredExLogs.reduce((acc, e) => acc + (e.volumenTotalKg || 0), 0);
          const repsTotal = filteredExLogs.reduce((acc, e) => acc + (e.seriesTotales || 4) * 10, 0);

          return {
            fecha: dateFormatted,
            pesoMax,
            volumen,
            calorias: repsTotal * 2,
            rutina: reg.rutinaNombre
          };
        });
      } else {
        // Curva de demostración específica para el ejercicio seleccionado
        const exObj = allExercises.find(e => e.nombre.toLowerCase() === chartExerciseFilter.toLowerCase());
        const baseWeight = exObj?.pesoObjetivoKg || 40;
        const targetReps = exObj?.repeticionesObjetivo || 10;
        const targetSets = exObj?.seriesObjetivo || 4;

        return [
          {
            fecha: "01/08",
            pesoMax: Math.round(baseWeight * 0.8),
            volumen: Math.round(baseWeight * 0.8 * targetReps * targetSets),
            calorias: targetReps * targetSets * 2,
            rutina: exObj?.grupoMuscular ? `Fase 1: ${exObj.grupoMuscular}` : "Inicio"
          },
          {
            fecha: "05/08",
            pesoMax: Math.round(baseWeight * 0.88),
            volumen: Math.round(baseWeight * 0.88 * targetReps * targetSets),
            calorias: targetReps * targetSets * 2.1,
            rutina: "Adaptación de Carga"
          },
          {
            fecha: "10/08",
            pesoMax: Math.round(baseWeight * 0.94),
            volumen: Math.round(baseWeight * 0.94 * targetReps * targetSets),
            calorias: targetReps * targetSets * 2.2,
            rutina: "Sobrecarga Progresiva"
          },
          {
            fecha: "15/08",
            pesoMax: baseWeight,
            volumen: Math.round(baseWeight * targetReps * targetSets),
            calorias: targetReps * targetSets * 2.3,
            rutina: "Pico de Intensidad"
          },
          {
            fecha: "20/08",
            pesoMax: Math.round(baseWeight * 1.08),
            volumen: Math.round(baseWeight * 1.08 * targetReps * targetSets),
            calorias: targetReps * targetSets * 2.5,
            rutina: "Récord Personal"
          }
        ];
      }
    }
  }, [uniqueRegistros, chartExerciseFilter, allExercises]);

  // Métricas avanzadas para el ejercicio seleccionado
  const selectedExerciseMetrics = useMemo(() => {
    const isAll = chartExerciseFilter === "Todos";

    const maxWeight = chartData.length > 0 ? Math.max(...chartData.map(d => d.pesoMax)) : 0;
    const totalVolume = chartData.reduce((acc, d) => acc + d.volumen, 0);
    const totalSessions = chartData.length;

    const initialWeight = chartData.length > 0 ? chartData[0].pesoMax : 0;
    const currentWeight = chartData.length > 0 ? chartData[chartData.length - 1].pesoMax : 0;
    const weightDiff = currentWeight - initialWeight;
    const percentageGain = initialWeight > 0 ? ((weightDiff / initialWeight) * 100).toFixed(1) : "0";

    const exerciseDetails = !isAll ? allExercises.find(e => e.nombre.toLowerCase() === chartExerciseFilter.toLowerCase()) : null;

    return {
      isAll,
      maxWeight,
      totalVolume,
      totalSessions,
      initialWeight,
      currentWeight,
      weightDiff,
      percentageGain,
      exerciseDetails
    };
  }, [chartData, chartExerciseFilter, allExercises]);

  // Totales de resumen
  const statsSummary = useMemo(() => {
    const totalEntrenamientos = uniqueRegistros.length || 3;
    const maxPesoRécord = uniqueRegistros.length > 0
      ? Math.max(...uniqueRegistros.flatMap(r => r.ejerciciosLogs.map(e => e.pesoMaximoKg)), 0)
      : 75;
    const totalVolumenAcumulado = uniqueRegistros.length > 0
      ? uniqueRegistros.reduce((acc, r) => acc + r.volumenTotalSesionKg, 0)
      : 15750;
    const totalCaloriasAcumuladas = uniqueRegistros.length > 0
      ? uniqueRegistros.reduce((acc, r) => acc + r.caloriasTotalesSesion, 0)
      : 1680;

    return {
      totalEntrenamientos,
      maxPesoRécord,
      totalVolumenAcumulado,
      totalCaloriasAcumuladas
    };
  }, [uniqueRegistros]);

  return (
    <>
      {/* 1. SECCIÓN SUPERIOR: NAVEGACIÓN PRINCIPAL DE PESTAÑAS (TARJETA INDEPENDIENTE CON FLECHAS EN MÓVIL) */}
      <div className="flex items-center justify-center gap-2 mb-4 mt-2 w-full max-w-full px-2 mx-auto">
        <button
          onClick={scrollTabsLeft}
          className={`pointer-events-auto p-1.5 rounded-full bg-white/90 dark:bg-zinc-900/95 border border-zinc-200/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-md hover:text-primary dark:hover:text-white transition-all cursor-pointer flex md:hidden items-center justify-center shrink-0 w-8 h-8 ${["rutinas", "historial", "tecnica", "progreso"].indexOf(activeTab) === 0 ? "opacity-30 pointer-events-none" : ""}`}
          aria-label="Desplazar izquierda"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
        </button>

        <div className="relative min-w-0 max-w-full">
          <div
            ref={tabsScrollRef}
            className="flex items-center justify-start md:justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-md w-full max-w-full md:max-w-max overflow-x-auto scroll-smooth scrollbar-none whitespace-nowrap"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <button
              onClick={(e) => { setActiveTab("rutinas"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                activeTab === "rutinas"
                  ? "text-white dark:text-zinc-950 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span className="font-bold whitespace-nowrap">Mis Rutinas ({listRutinas.length})</span>
              {activeTab === "rutinas" && (
                <motion.div
                  layoutId="activeGymRutinaTabIndicator"
                  className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/20 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
   
            <button
              onClick={(e) => { setActiveTab("historial"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                activeTab === "historial"
                  ? "text-white dark:text-zinc-950 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span className="font-bold whitespace-nowrap">Historial de Sesiones</span>
              {activeTab === "historial" && (
                <motion.div
                  layoutId="activeGymRutinaTabIndicator"
                  className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/20 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
   
            <button
              onClick={(e) => { setActiveTab("tecnica"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                activeTab === "tecnica"
                  ? "text-white dark:text-zinc-950 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="font-bold whitespace-nowrap">Biblioteca de Ejercicios</span>
              {activeTab === "tecnica" && (
                <motion.div
                  layoutId="activeGymRutinaTabIndicator"
                  className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/20 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
   
            <button
              onClick={(e) => { setActiveTab("progreso"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                activeTab === "progreso"
                  ? "text-white dark:text-zinc-950 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
              }`}
            >
              <BarChart2 className="w-4 h-4 shrink-0" />
              <span className="font-bold whitespace-nowrap">Progreso y Métricas</span>
              {activeTab === "progreso" && (
                <motion.div
                  layoutId="activeGymRutinaTabIndicator"
                  className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/20 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          </div>
        </div>

        <button
          onClick={scrollTabsRight}
          className={`pointer-events-auto p-1.5 rounded-full bg-white/90 dark:bg-zinc-900/95 border border-zinc-200/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-md hover:text-primary dark:hover:text-white transition-all cursor-pointer flex md:hidden items-center justify-center shrink-0 w-8 h-8 ${["rutinas", "historial", "tecnica", "progreso"].indexOf(activeTab) === 3 ? "opacity-30 pointer-events-none" : ""}`}
          aria-label="Desplazar derecha"
        >
          <ChevronRight className="w-4 h-4 shrink-0" />
        </button>
      </div>

      {/* ESPACIADO ENTRE LAS DOS PARTES */}
      <div className="h-2" />

      {/* 2. CONTENEDOR PRINCIPAL DEL CUERPO (TARJETA INDEPENDIENTE) */}
      <div
        className={`p-4 sm:p-6 rounded-3xl border backdrop-blur-xl shadow-2xl space-y-6 ${
          darkMode
            ? "bg-zinc-900/60 border-zinc-800/80 text-white"
            : "bg-white/80 border-slate-200/80 text-slate-800"
        }`}
      >

      {/* 2. SECCIÓN MEDIA: HEADER DE BIENVENIDA Y RESUMEN DE MÉTRICAS */}
      {activeTab === "rutinas" && (
        <div className="p-0 space-y-5 bg-transparent border-none text-slate-800 dark:text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/40 dark:border-zinc-800/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <Dumbbell className="w-6 h-6 stroke-[2.25px]" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  Gestión e Historial de Entrenamiento Gym
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Organiza rutinas por grupo muscular, sigue demostraciones técnicas en GIF, registra series, reps y peso con cálculo calórico automático.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                onClick={handleOpenNewRoutineModal}
                className="w-full sm:w-auto justify-center px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-full flex items-center gap-2 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
                <span>Crear Nueva Rutina</span>
              </button>
            </div>
          </div>

          {/* METRICAS RESUMEN ARRIBA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1 flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5 text-primary" /> Rutinas Activas
              </span>
              <span className="text-xl font-black">{listRutinas.length}</span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Sesiones Registradas
              </span>
              <span className="text-xl font-black">{statsSummary.totalEntrenamientos}</span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-primary" /> Calorías Quemadas
              </span>
              <span className="text-xl font-black text-primary">{statsSummary.totalCaloriasAcumuladas.toLocaleString("es-AR")} <span className="text-xs font-normal">kcal</span></span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Carga Récord
              </span>
              <span className="text-xl font-black text-primary">{statsSummary.maxPesoRécord} <span className="text-xs font-normal">kg</span></span>
            </div>
          </div>
        </div>
      )}

      {/* --- VISTA 1: MIS RUTINAS --- */}
      {activeTab === "rutinas" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listRutinas.map(rutina => {
              const mainConf = MUSCLE_COLORS[rutina.grupoMuscularPrincipal] || MUSCLE_COLORS.Pecho;
              return (
                <div
                  key={rutina.id}
                  className={`p-5 rounded-3xl border flex flex-col justify-between transition-all hover:scale-[1.01] shadow-sm ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border uppercase ${mainConf.bg} ${mainConf.text} ${mainConf.border}`}>
                        {rutina.grupoMuscularPrincipal}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditRoutine(rutina)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          title="Editar Rutina"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoutine(rutina.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          title="Eliminar Rutina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold">{rutina.nombre}</h3>
                      {rutina.descripcion && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                          {rutina.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5 text-primary" /> {rutina.ejercicios?.length || 0} Ejercicios
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" /> ~{rutina.duracionEstimadaMin || 60} min
                      </span>
                      <span className="flex items-center gap-1" title="Calorías Estimadas">
                        <Flame className="w-3.5 h-3.5 text-primary fill-primary/20" /> ~{calculateRoutineEstimatedCalories(rutina)} kcal
                      </span>
                    </div>

                    {/* Lista rápida de ejercicios */}
                    <div className={`p-3 rounded-2xl border space-y-1.5 ${darkMode ? "bg-zinc-900/40 border-zinc-800/60" : "bg-zinc-50 border-zinc-200/60"}`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ejercicios Incluidos:</span>
                      <ul className="space-y-1">
                        {rutina.ejercicios?.slice(0, 4).map((ej, idx) => (
                          <li key={idx} className="text-xs flex items-center justify-between">
                            <span className="font-semibold text-slate-700 dark:text-zinc-200 truncate pr-2">
                              • {ej.nombre}
                            </span>
                            <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                              {ej.seriesObjetivo || 4}x{ej.repeticionesObjetivo || 10} ({ej.pesoObjetivoKg || 0}kg)
                            </span>
                          </li>
                        ))}
                        {(rutina.ejercicios?.length || 0) > 4 && (
                          <li className="text-[10px] font-bold text-primary pt-0.5">
                            + {(rutina.ejercicios?.length || 0) - 4} ejercicios más
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100 dark:border-zinc-800/60 flex items-center gap-2">
                    <button
                      onClick={() => handleStartWorkout(rutina)}
                      className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-md shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Iniciar Este Entrenamiento</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {listRutinas.length === 0 && (
            <div className={`p-12 text-center rounded-3xl border ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-white border-slate-200 text-slate-500"}`}>
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary stroke-1" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">No se encontraron rutinas</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                No hay rutinas registradas aún. ¡Crea tu primera rutina personalizada!
              </p>
              <button
                onClick={handleOpenNewRoutineModal}
                className="mt-4 px-4 py-2 bg-primary text-white dark:text-blue-950 font-bold text-xs rounded-full inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Crear Rutina
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- VISTA 2: BIBLIOTECA DE EJERCICIOS Y TÉCNICA (CON GIFS ANIMADOS INTERACTIVOS) --- */}
      {activeTab === "tecnica" && (
        <div className="space-y-4">
          {/* BARRA INTEGRADA DE FILTROS POR GRUPO MUSCULAR Y BÚSQUEDA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/40 dark:border-zinc-800/60 w-full">
            {/* Búsqueda (Izquierda) */}
            <div className="relative w-full sm:flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar ejercicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none transition-colors ${
                  darkMode
                    ? "bg-zinc-950/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus:border-primary"
                    : "bg-slate-50/70 border-slate-200/80 text-slate-800 placeholder:text-slate-400 focus:border-primary"
                }`}
              />
            </div>
            
            {/* Selector de Grupos Musculares (Derecha) */}
            <div className="flex items-center gap-2">
              <CustomSelect
                value={selectedGrupoFilter}
                onChange={(val) => setSelectedGrupoFilter(val as string)}
                options={[
                  { value: "Todos", label: `Todos (${GRUPOS_MUSCULARES.length})` },
                  ...GRUPOS_MUSCULARES.map(g => ({ value: g, label: g }))
                ]}
                icon={<Filter className="w-3.5 h-3.5" />}
                className="w-full sm:w-48"
                size="sm"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Guía de Ejercicios en Español con Demostración GIF Técnica
            </h3>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Mostrando <strong className="text-slate-800 dark:text-zinc-200">{(validTechniquePage - 1) * EXERCISES_PAGE_SIZE + 1}–{Math.min(validTechniquePage * EXERCISES_PAGE_SIZE, filteredExercises.length)}</strong> de <strong className="text-slate-800 dark:text-zinc-200">{filteredExercises.length}</strong> ejercicios
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTechniqueExercises.map(ej => {
              const conf = MUSCLE_COLORS[ej.grupoMuscular] || MUSCLE_COLORS.Pecho;
              const calsEst = calcularCaloriasEjercicio(ej.grupoMuscular, ej.seriesObjetivo || 4, (ej.seriesObjetivo || 4) * (ej.repeticionesObjetivo || 10), ej.pesoObjetivoKg || 20);

              return (
                <div
                  key={ej.id}
                  className={`p-4 rounded-3xl border flex flex-col justify-between transition-all hover:border-primary/40 shadow-xs ${
                    darkMode
                      ? "bg-zinc-900/40 hover:bg-zinc-800/50 border-zinc-800/60 text-white"
                      : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/60 text-slate-800"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Visual GIF / Placeholder interactivo */}
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-950 border border-zinc-800 flex items-center justify-center group">
                      {ej.gifUrl ? (
                        <img
                          src={ej.gifUrl}
                          alt={ej.nombre}
                          loading="lazy"
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                          <div className={`p-3 rounded-full ${conf.bg} ${conf.text}`}>
                            <Dumbbell className="w-8 h-8" />
                          </div>
                          <span className="text-xs font-bold text-zinc-300">Técnica para {ej.grupoMuscular}</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border uppercase backdrop-blur-md ${conf.bg} ${conf.text} ${conf.border}`}>
                          {ej.grupoMuscular}
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-primary backdrop-blur-md flex items-center gap-1 border border-primary/20">
                          <Flame className="w-3 h-3 text-primary fill-primary" /> ~{calsEst} kcal
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold">{ej.nombre}</h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                        {ej.notasTecnica || "Mantén la postura alineada y realiza una contracción muscular sostenida durante todo el rango de movimiento."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-600 dark:text-zinc-300">
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                        {ej.seriesObjetivo || 4} Series
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                        {ej.repeticionesObjetivo || 10} Reps
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                        {ej.pesoObjetivoKg || 0} kg
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setChartExerciseFilter(ej.nombre);
                        setActiveTab("progreso");
                      }}
                      className="w-full py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Ver Gráfico de Progreso</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedExerciseForTechnique(ej)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>Ver Demostración & Tips</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CONTROLES DE PAGINACIÓN DE TÉCNICA */}
          {filteredExercises.length > 0 && (
            <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}>
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                Mostrando <strong className="text-slate-800 dark:text-zinc-200">{(validTechniquePage - 1) * EXERCISES_PAGE_SIZE + 1}–{Math.min(validTechniquePage * EXERCISES_PAGE_SIZE, filteredExercises.length)}</strong> de <strong className="text-slate-800 dark:text-zinc-200">{filteredExercises.length}</strong> ejercicios
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTechniquePage(prev => Math.max(1, prev - 1))}
                  disabled={validTechniquePage <= 1}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                    validTechniquePage <= 1
                      ? "opacity-30 cursor-not-allowed border-zinc-300 dark:border-zinc-800 text-slate-400 dark:text-zinc-500"
                      : "hover:bg-primary/10 hover:border-primary/50 text-slate-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-800"
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <div className="flex items-center gap-1 mx-1 overflow-x-auto scroll-smooth max-w-[200px] sm:max-w-none py-0.5">
                  {(() => {
                    const pages: (number | string)[] = [];
                    if (totalTechniquePages <= 5) {
                      for (let i = 1; i <= totalTechniquePages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (validTechniquePage > 3) pages.push("...");
                      const start = Math.max(2, validTechniquePage - 1);
                      const end = Math.min(totalTechniquePages - 1, validTechniquePage + 1);
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (validTechniquePage < totalTechniquePages - 2) pages.push("...");
                      pages.push(totalTechniquePages);
                    }
                    return pages.map((p, idx) => {
                      if (p === "...") {
                        return <span key={`dots-${idx}`} className="px-1.5 text-xs text-slate-400 font-mono">...</span>;
                      }
                      const isCurrent = p === validTechniquePage;
                      return (
                        <button
                          key={`tp-${p}`}
                          type="button"
                          onClick={() => setTechniquePage(p as number)}
                          className={`w-7 h-7 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? "bg-primary text-white shadow-xs border border-primary"
                              : "bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}
                </div>

                <button
                  type="button"
                  onClick={() => setTechniquePage(prev => Math.min(totalTechniquePages, prev + 1))}
                  disabled={validTechniquePage >= totalTechniquePages}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                    validTechniquePage >= totalTechniquePages
                      ? "opacity-30 cursor-not-allowed border-zinc-300 dark:border-zinc-800 text-slate-400 dark:text-zinc-500"
                      : "hover:bg-primary/10 hover:border-primary/50 text-slate-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-800"
                  }`}
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- VISTA 3: REGISTRO DE ENTRENAMIENTO ACTIVO (LOGGER) --- */}
      {activeTab === "logger" && (
        <div className={`p-6 rounded-3xl border ${darkMode ? "bg-zinc-900/40 border-zinc-800/60 text-white" : "bg-slate-50/60 border-slate-200/60 text-slate-800"} space-y-6 shadow-sm`}>
          <div className="flex flex-col gap-4 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-5">
            {/* CABECERA CON TÍTULO Y BOTONES DE ACCIÓN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary">Sesión en Curso</span>
                <h3 className="text-xl font-black">
                  {activeWorkoutRoutine?.nombre || "Entrenamiento Personalizado"}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={isFinishingWorkout}
                  onClick={handleFinishWorkout}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-black rounded-full flex items-center gap-2 shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
                >
                  {isFinishingWorkout ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finalizar y Guardar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SECCIÓN DE INGRESO MANUAL DE FECHA Y TIEMPOS */}
            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-900/60 border-zinc-800/80" : "bg-white border-slate-200"} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end`}>
              <div>
                <label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 block mb-1">
                  Fecha de la Sesión
                </label>
                <SmartDateTimePicker
                  value={sessionDate}
                  onChange={(val) => setSessionDate(val ? val.split("T")[0] : "")}
                  showTimeOption={false}
                  size="sm"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 block mb-1">
                  Hora de Inicio (24hs)
                </label>
                <Time24Input
                  value={sessionStartTime}
                  onChange={handleStartTimeChange}
                  darkMode={darkMode}
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 block mb-1">
                  Hora de Finalización (24hs)
                </label>
                <Time24Input
                  value={sessionEndTime}
                  onChange={setSessionEndTime}
                  darkMode={darkMode}
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 block mb-1">
                  Duración Calculada
                </label>
                <div className="w-full bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-sm font-black text-primary flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>{calculatedDurationMin} min</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 block mb-1">
                  Calorías Estimadas
                </label>
                <div className="w-full bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-sm font-black text-primary flex items-center gap-2">
                  <Flame className="w-4 h-4 shrink-0 text-primary animate-pulse" />
                  <span>{liveTotalCalories} kcal</span>
                </div>
              </div>
            </div>
          </div>

          {/* EJERCICIOS Y REGISTRO DE SETS - GRID CONDENSADA DE 4 COLUMNAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {computedActiveWorkoutLogs.map((exLog, exIdx) => {
              const conf = MUSCLE_COLORS[exLog.grupoMuscular] || MUSCLE_COLORS.Pecho;
              return (
                <div
                  key={exIdx}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-3 ${
                    darkMode ? "bg-zinc-950/80 border-zinc-800" : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  {/* ENCABEZADO CONDENSADO DEL EJERCICIO */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase border ${conf.bg} ${conf.text} ${conf.border}`}>
                        {exLog.grupoMuscular}
                      </span>
                      <div className="flex flex-col items-end text-[10px] font-mono text-slate-500 dark:text-zinc-400 shrink-0">
                        <span className="font-black text-slate-700 dark:text-zinc-300">
                          Vol: {exLog.volumenTotalKg} kg
                        </span>
                        <span className="text-[11px] text-primary/80 font-black flex items-center gap-0.5 mt-0.5">
                          <Flame className="w-3 h-3 text-primary shrink-0 fill-primary/20" /> {exLog.caloriasQuemadas} kcal
                        </span>
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold truncate text-slate-800 dark:text-zinc-100" title={exLog.ejercicioNombre}>
                      {exLog.ejercicioNombre}
                    </h4>
                  </div>

                  {/* FILAS DE SERIES (SETS) CON MARGEN NEGATIVO Y PADDING COMPENSATORIO */}
                  <div className="space-y-1 px-1">
                    <div className="grid grid-cols-12 gap-1 px-2 pb-1 border-b border-zinc-200/60 dark:border-zinc-800/80 text-slate-400 dark:text-zinc-500 text-[9px] uppercase font-bold text-center">
                      <span className="col-span-3 text-left">Serie</span>
                      <span className="col-span-2">Reps</span>
                      <span className="col-span-3">Peso</span>
                      <span className="col-span-4 text-right pr-1">Progreso / Acción</span>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      {exLog.sets.map((s, sIdx) => {
                        const prog = getSetProgression(exLog.ejercicioId, exLog.ejercicioNombre, sIdx, s.pesoKg);
                        return (
                          <div
                            key={sIdx}
                            className={`w-full grid grid-cols-12 gap-1 items-center -mx-2 px-2 py-1.5 rounded-md hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700/50 transition-all`}
                          >
                            <div className="col-span-3 text-[11px] font-black text-slate-700 dark:text-zinc-300 truncate">
                              SET {s.setNumero}
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <input
                                type="number"
                                min="1"
                                value={s.repeticiones}
                                onChange={(e) => handleSetChange(exIdx, sIdx, "repeticiones", Number(e.target.value))}
                                className={`w-full px-1 py-0.5 text-xs rounded-md border text-center font-bold outline-none focus:border-primary ${
                                  darkMode ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-slate-300 text-slate-800"
                                }`}
                              />
                            </div>
                            <div className="col-span-3 flex justify-center items-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={s.pesoKg}
                                onChange={(e) => handleSetChange(exIdx, sIdx, "pesoKg", Number(e.target.value))}
                                className={`w-full px-1 py-0.5 text-xs rounded-md border text-center font-bold outline-none focus:border-primary ${
                                  darkMode ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-slate-300 text-slate-800"
                                }`}
                              />
                              <span className="text-[9px] font-sans font-bold text-slate-400">kg</span>
                            </div>
                            <div className="col-span-4 flex items-center justify-end gap-1.5">
                              {prog === null ? (
                                <span className="text-[10px] font-mono text-zinc-500 font-medium px-1" title="Sin historial previo en este set">
                                  -
                                </span>
                              ) : prog.pct > 0 ? (
                                <span
                                  className="inline-flex items-center text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0"
                                  title={`Anterior: ${prog.prevWeight} kg (+${prog.diff} kg)`}
                                >
                                  +{prog.pct}% ↗
                                </span>
                              ) : prog.pct < 0 ? (
                                <span
                                  className="inline-flex items-center text-[10px] font-mono font-bold text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/60 shrink-0"
                                  title={`Anterior: ${prog.prevWeight} kg (${prog.diff} kg)`}
                                >
                                  {prog.pct}% ↘
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center text-[10px] font-mono font-bold text-zinc-500 bg-zinc-800/40 px-1.5 py-0.5 rounded border border-zinc-800/60 shrink-0"
                                  title={`Anterior: ${prog.prevWeight} kg (mismo peso)`}
                                >
                                  = 0%
                                </span>
                              )}
                              <button
                                onClick={() => handleRemoveSetFromExercise(exIdx, sIdx)}
                                className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors cursor-pointer shrink-0"
                                title="Eliminar Serie"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOTÓN AGREGAR SERIE */}
                  <button
                    onClick={() => handleAddSetToExercise(exIdx)}
                    className="w-full py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 hover:border-primary text-slate-600 dark:text-zinc-300 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer hover:bg-primary/5"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" /> Agregar Serie +
                  </button>
                </div>
              );
            })}
          </div>

          {/* SENSACIÓN Y NOTAS GENERALES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <div>
              <label className="text-xs font-extrabold block mb-1.5">Sensación General del Entrenamiento</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["Excelente", "Bueno", "Normal", "Exigente", "Agotador"] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setGeneralFeeling(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${generalFeeling === s ? "bg-primary text-white dark:text-blue-950 border-primary" : "bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold block mb-1.5">Notas / RPE / Observaciones</label>
              <input
                type="text"
                placeholder="Ej. Buen bombeo en pecho, aumentar 2kg en banco plano la próxima semana..."
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-primary" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-primary"}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- VISTA 4: GRÁFICO DE PROGRESO Y MÉTRICAS POR EJERCICIO (RECHARTS) --- */}
      {activeTab === "progreso" && (
        <div className="space-y-6 text-slate-800 dark:text-zinc-100">
          {/* CONTROL Y FILTROS DE EJERCICIO */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-5">
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-primary" />
                Gráfico de Progreso & Métricas por Ejercicio
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Evalúa la curva de evolución, sobrecarga progresiva y récords personales para cada ejercicio.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* SELECTOR DE MÉTRICA */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Métrica a Graficar:
                </label>
                <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setChartMetric("pesoMax")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      chartMetric === "pesoMax"
                        ? "bg-primary text-white shadow-xs"
                        : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Carga Máx (kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("volumen")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      chartMetric === "volumen"
                        ? "bg-primary text-white shadow-xs"
                        : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Volumen (kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("calorias")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      chartMetric === "calorias"
                        ? "bg-primary text-white shadow-xs"
                        : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Calorías (kcal)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BARRA INTEGRADA DE BÚSQUEDA Y SELECCIÓN DE EJERCICIO PARA EL GRÁFICO */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 pt-2 w-full">
            {/* Búsqueda (Izquierda) */}
            <div className="relative w-full flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar ejercicio..."
                value={exerciseDropdownSearch}
                onChange={(e) => setExerciseDropdownSearch(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none transition-colors ${
                  darkMode
                    ? "bg-zinc-950/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus:border-primary"
                    : "bg-slate-50/70 border-slate-200/80 text-slate-800 placeholder:text-slate-400 focus:border-primary"
                }`}
              />
            </div>
            
            {/* Selector de Ejercicio (Derecha) */}
            <div className="flex items-center gap-2">
              <CustomSelect
                value={chartExerciseFilter}
                onChange={(val) => setChartExerciseFilter(val as string)}
                options={[
                  { value: "Todos", label: `Todos los Ejercicios` },
                  ...availableExerciseNames
                      .filter(ex => ex.toLowerCase().includes(exerciseDropdownSearch.toLowerCase()))
                      .map(ex => ({ value: ex, label: ex }))
                ]}
                icon={<Filter className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto min-w-[200px]"
                size="sm"
              />
            </div>
          </div>

          {/* TARJETAS RESUMEN DE MÉTRICAS DEL EJERCICIO SELECCIONADO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Carga Máxima (PR)</span>
                <Trophy className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {selectedExerciseMetrics.maxWeight} <span className="text-xs font-normal text-slate-400">kg</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Récord personal registrado</span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Volumen Acumulado</span>
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {selectedExerciseMetrics.totalVolume.toLocaleString("es-AR")} <span className="text-xs font-normal text-slate-400">kg</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Peso total levantado</span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Evolución Carga</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xl font-black text-primary font-mono">
                {Number(selectedExerciseMetrics.weightDiff) >= 0 ? `+${selectedExerciseMetrics.weightDiff}` : selectedExerciseMetrics.weightDiff} <span className="text-xs font-normal text-primary/80">kg</span>
              </div>
              <span className="text-[10px] text-primary font-extrabold block mt-0.5">
                {Number(selectedExerciseMetrics.percentageGain) >= 0 ? `+${selectedExerciseMetrics.percentageGain}%` : `${selectedExerciseMetrics.percentageGain}%`} vs sesión inicial
              </span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Sesiones Evaluadas</span>
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {selectedExerciseMetrics.totalSessions}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Puntos de registro</span>
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-3xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
          {/* TÍTULO DINÁMICO DE LA GRÁFICA */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                {chartExerciseFilter === "Todos"
                  ? "Progreso General de Entrenamiento"
                  : `Curva de Progreso: ${chartExerciseFilter}`}
              </h4>
            </div>
            {selectedExerciseMetrics.exerciseDetails && (
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {selectedExerciseMetrics.exerciseDetails.grupoMuscular}
              </span>
            )}
          </div>

          {/* GRÁFICO RECHARTS INTERACTIVO */}
          <div className="w-full h-80 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gymChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary, #1a73e8)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--color-primary, #1a73e8)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#27272a" : "#e2e8f0"} vertical={false} />
                <XAxis dataKey="fecha" stroke={darkMode ? "#71717a" : "#64748b"} fontSize={11} tickLine={false} />
                <YAxis stroke={darkMode ? "#71717a" : "#64748b"} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#09090b" : "#ffffff",
                    borderColor: darkMode ? "#27272a" : "#e2e8f0",
                    borderRadius: "1rem",
                    fontSize: "12px",
                    fontWeight: "bold",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke="var(--color-primary, #1a73e8)"
                  strokeWidth={3.5}
                  fillOpacity={1}
                  fill="url(#gymChartGrad)"
                  name={
                    chartMetric === "pesoMax"
                      ? "Carga Máx (kg)"
                      : chartMetric === "volumen"
                      ? "Volumen Total (kg)"
                      : "Calorías Est. (kcal)"
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          </div>
        </div>
      )}

      {/* --- VISTA 5: HISTORIAL DE SESIONES --- */}
      {activeTab === "historial" && (
        <div className="space-y-4">
          {/* Header de Historial de Sesiones */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/40 dark:border-zinc-800/50 pb-3">
            <h3 className="text-sm font-extrabold flex items-center gap-2 text-slate-900 dark:text-white shrink-0">
              <Activity className="w-4 h-4 text-primary" />
              Historial de Sesiones de Entrenamiento Guardadas
            </h3>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto justify-end">
              {/* Botón "+ Registrar Rutina" */}
              <div className="relative w-full sm:w-64">
                <button
                  type="button"
                  onClick={() => setShowLogRoutineDropdown(!showLogRoutineDropdown)}
                  className={`relative w-full flex items-center justify-center gap-2 px-8 py-2.5 border rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                    darkMode
                      ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-primary"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary"
                  }`}
                >
                  <Dumbbell className="w-3.5 h-3.5 text-primary" />
                  <span>+ Registrar Rutina</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 transition-transform duration-200 ${showLogRoutineDropdown ? "rotate-180 text-primary" : ""}`} />
                </button>

                {showLogRoutineDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setShowLogRoutineDropdown(false)}
                    />
                    <div
                      className={`absolute left-0 right-0 mt-2 w-full rounded-2xl border p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-100 ${
                        darkMode
                          ? "bg-zinc-900 border-zinc-800/80 text-white"
                          : "bg-white border-slate-150 text-slate-800"
                      }`}
                    >
                      <div className="px-3 py-2 border-b border-zinc-200/40 dark:border-zinc-800/50">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                          Selecciona una Rutina
                        </span>
                      </div>
                      <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                        {listRutinas.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-slate-400 dark:text-zinc-500 italic">
                            No hay rutinas creadas
                          </div>
                        ) : (
                          listRutinas.map((rutina) => (
                            <button
                              key={rutina.id}
                              type="button"
                              onClick={() => handleLogRoutineSession(rutina)}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-primary transition-all flex items-center justify-between cursor-pointer"
                            >
                              <span className="truncate">{rutina.nombre}</span>
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal shrink-0 ml-2">
                                {rutina.ejercicios?.length || 0} ej.
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {onOpenActividadModal && (
                <button
                  type="button"
                  onClick={onOpenActividadModal}
                  className="w-full sm:w-auto px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-full flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3px]" />
                  <span>Añadir Actividad</span>
                </button>
              )}
            </div>
          </div>

          {/* Motor de Búsqueda y Filtros de Historial */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Buscar sesión por rutina, ejercicio, deporte, grupo muscular, fecha o notas..."
                className={`w-full pl-9.5 pr-8 py-2.5 rounded-2xl text-xs border transition-all outline-none ${
                  darkMode
                    ? "bg-zinc-900/60 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-primary focus:ring-1 focus:ring-primary"
                    : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                }`}
              />
              {historySearchQuery && (
                <button
                  type="button"
                  onClick={() => setHistorySearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 rounded-full cursor-pointer"
                  title="Borrar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selector de Tipo (Todos / GYM / Actividades) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => setHistoryTypeFilter("todos")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  historyTypeFilter === "todos"
                    ? "bg-primary text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Todos ({combinedHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter("gym")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  historyTypeFilter === "gym"
                    ? "bg-primary text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Dumbbell className="w-3 h-3" /> GYM ({combinedHistory.filter(i => i.tipo === "gym").length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter("actividad")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  historyTypeFilter === "actividad"
                    ? "bg-primary text-white shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Activity className="w-3 h-3" /> Deportes ({combinedHistory.filter(i => i.tipo === "actividad").length})
              </button>
            </div>
          </div>

          {/* Mini Calendario Semanal y Contador de Racha */}
          <div className={`p-4 sm:p-6 rounded-3xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"} space-y-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                Resumen de Actividad Semanal
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/30 shadow-xs self-start sm:self-auto">
                <Flame className="w-4 h-4 shrink-0 text-primary fill-primary/20" /> Racha semanal: <span className="font-extrabold">{activeDaysCount}/7 días</span>
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekData.map((day, dIdx) => {
                const isToday = new Date().toDateString() === day.dateObj.toDateString();
                const isSelected = selectedFilterDate && selectedFilterDate.toDateString() === day.dateObj.toDateString();
                return (
                  <div
                    key={dIdx}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFilterDate(null);
                      } else {
                        setSelectedFilterDate(day.dateObj);
                      }
                    }}
                    className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
                      isSelected
                        ? "bg-primary text-white shadow-md ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 border-transparent"
                        : day.hasActivity
                        ? darkMode
                          ? "bg-zinc-900/50 border border-primary/50 text-zinc-100 shadow-xs hover:bg-zinc-800/80"
                          : "bg-primary/5 border border-primary/30 text-slate-800 shadow-xs hover:bg-primary/10"
                        : darkMode
                        ? "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800"
                        : "bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100"
                    } ${isToday && !isSelected ? "ring-2 ring-primary/60 dark:ring-primary/40" : ""}`}
                  >
                    <span className={`text-[9px] font-extrabold tracking-wider ${isSelected ? "text-white/80" : isToday ? "text-primary dark:text-primary-light" : "text-slate-400 dark:text-zinc-500"}`}>
                      {day.dayLabel}
                    </span>
                    <span className="text-sm font-extrabold mt-0.5">
                      {day.dayNumber}
                    </span>
                    <span className={`text-[8px] font-mono font-bold mt-1.5 ${isSelected ? "text-white/90" : day.calories > 0 ? "text-primary dark:text-primary-light" : "text-slate-400 dark:text-zinc-600"}`}>
                      {day.calories} kcal
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estado de Filtros y Búsqueda Activa */}
          {(selectedFilterDate || historySearchQuery.trim() || historyTypeFilter !== "todos") && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-zinc-800 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-500 dark:text-zinc-400">Filtros activos:</span>
                {selectedFilterDate && (
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {selectedFilterDate.toLocaleDateString("es-AR", { weekday: 'short', day: 'numeric', month: 'short' })}
                    <button
                      type="button"
                      onClick={() => setSelectedFilterDate(null)}
                      className="hover:text-red-500 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {historyTypeFilter !== "todos" && (
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold flex items-center gap-1.5">
                    {historyTypeFilter === "gym" ? <Dumbbell className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                    {historyTypeFilter === "gym" ? "Sólo GYM" : "Sólo Deportes"}
                    <button
                      type="button"
                      onClick={() => setHistoryTypeFilter("todos")}
                      className="hover:text-red-500 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {historySearchQuery.trim() && (
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold flex items-center gap-1.5">
                    <Search className="w-3 h-3" />
                    "{historySearchQuery}"
                    <button
                      type="button"
                      onClick={() => setHistorySearchQuery("")}
                      className="hover:text-red-500 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedFilterDate(null);
                  setHistoryTypeFilter("todos");
                  setHistorySearchQuery("");
                }}
                className="text-xs font-extrabold text-primary hover:underline uppercase tracking-wider cursor-pointer"
              >
                Limpiar todos los filtros
              </button>
            </div>
          )}

          <div className="space-y-3">
            {(() => {
              const filteredHistory = combinedHistory.filter(item => {
                // 1. Filtro por fecha seleccionada
                if (selectedFilterDate) {
                  const dateStr = item.fecha;
                  const d = new Date(dateStr);
                  if (d.toDateString() !== selectedFilterDate.toDateString()) {
                    return false;
                  }
                }

                // 2. Filtro por tipo de actividad
                if (historyTypeFilter === "gym" && item.tipo !== "gym") return false;
                if (historyTypeFilter === "actividad" && item.tipo !== "actividad") return false;

                // 3. Motor de búsqueda inteligente
                if (historySearchQuery.trim()) {
                  const q = historySearchQuery.toLowerCase().trim();
                  
                  if (item.tipo === "gym" && item.gym) {
                    const matchRoutine = (item.gym.rutinaNombre || "").toLowerCase().includes(q);
                    const matchNotes = (item.gym.notas || "").toLowerCase().includes(q);
                    const matchDate = (new Date(item.gym.fecha).toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })).toLowerCase().includes(q);
                    const matchExercises = (item.gym.ejerciciosLogs || []).some(el => 
                      (el.ejercicioNombre || "").toLowerCase().includes(q) ||
                      (el.grupoMuscular || "").toLowerCase().includes(q)
                    );
                    return matchRoutine || matchNotes || matchDate || matchExercises;
                  }

                  if (item.tipo === "actividad" && item.actividad) {
                    const matchInfo = (item.actividad.informacion || "").toLowerCase().includes(q);
                    const matchDate = (new Date(item.actividad.fechaDesde).toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })).toLowerCase().includes(q);
                    const matchFreq = (item.actividad.frecuencia || "").toLowerCase().includes(q);
                    return matchInfo || matchDate || matchFreq;
                  }

                  return false;
                }

                return true;
              });

              if (filteredHistory.length === 0) {
                return (
                  <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center space-y-2">
                    <Search className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-1" />
                    <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                      No se encontraron sesiones registradas
                    </p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm">
                      {historySearchQuery.trim()
                        ? `No hay coincidencias para "${historySearchQuery}". Intenta buscar por nombre de rutina, ejercicio o deporte.`
                        : selectedFilterDate
                        ? "No hay actividades registradas en el día seleccionado."
                        : "No hay actividades registradas con los filtros actuales."}
                    </p>
                    {(selectedFilterDate || historySearchQuery.trim() || historyTypeFilter !== "todos") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFilterDate(null);
                          setHistoryTypeFilter("todos");
                          setHistorySearchQuery("");
                        }}
                        className="mt-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-bold transition-all cursor-pointer"
                      >
                        Restablecer búsqueda y filtros
                      </button>
                    )}
                  </div>
                );
              }

              return filteredHistory.map((item, idx) => {
              if (item.tipo === "gym") {
                const reg = item.gym;
                return (
                  <div
                    key={reg.id ? `${reg.id}-${idx}` : `reg_${idx}`}
                    className={`p-5 rounded-3xl border transition-all ${
                      darkMode
                        ? "bg-zinc-900/40 hover:bg-zinc-800/50 border-zinc-700/50 text-white"
                        : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/60 text-slate-800"
                    } space-y-3 shadow-xs`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/60 pb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            {new Date(reg.fecha).toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0">
                            <Dumbbell className="w-2.5 h-2.5" /> GYM
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold">{reg.rutinaNombre}</h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono font-bold flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 fill-current" /> {reg.caloriasTotalesSesion} kcal
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                            Volumen: {reg.volumenTotalSesionKg} kg
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {reg.duracionMinutos || 45} min
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 fill-current text-primary" /> {Math.round((reg.duracionMinutos || 45) * 1.5)} pts
                          </span>
                        </div>

                        <div className="flex items-center gap-1 ml-2 border-l border-zinc-200/60 dark:border-zinc-800/80 pl-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditSessionLog(reg)}
                            className="p-1.5 text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                            title="Modificar sesión"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSessionLog(reg.id)}
                            className="p-1.5 text-slate-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                            title="Eliminar sesión"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {reg.ejerciciosLogs?.map((eLog, eIdx) => (
                        <div key={eIdx} className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}`}>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold block truncate text-slate-800 dark:text-zinc-200">{eLog.ejercicioNombre}</span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 block mt-0.5">
                              {eLog.seriesTotales} series • Vol: {eLog.volumenTotalKg || 0} kg
                            </span>
                            <span className="text-xs text-primary/80 font-black block mt-1 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" /> {eLog.caloriasQuemadas || 0} kcal
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setChartExerciseFilter(eLog.ejercicioNombre);
                              setActiveTab("progreso");
                            }}
                            className="p-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all shrink-0 cursor-pointer"
                            title="Ver gráfico de progreso para este ejercicio"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {reg.notas && (
                      <p className="text-xs italic text-slate-500 dark:text-zinc-400 pt-1">
                        "{reg.notas}"
                      </p>
                    )}
                  </div>
                );
              } else {
                const act = item.actividad;
                return (
                  <div
                    key={act.id ? `${act.id}-${idx}` : `act_${idx}`}
                    className={`p-5 rounded-3xl border transition-all ${
                      darkMode
                        ? "bg-zinc-900/40 hover:bg-zinc-800/50 border-zinc-700/50 text-white"
                        : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/60 text-slate-800"
                    } space-y-3 shadow-xs`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/60 pb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            {new Date(act.fechaDesde).toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0">
                            <Activity className="w-2.5 h-2.5" /> ACTIVIDAD
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{act.informacion}</h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono font-bold flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {act.calorias > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 fill-current" /> {act.calorias} kcal
                            </span>
                          )}
                          {act.distancia > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {act.distancia} km
                            </span>
                          )}
                          {act.pasos > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                              <Footprints className="w-3.5 h-3.5" /> {act.pasos} pasos
                            </span>
                          )}
                          {act.tiempoMovimiento && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {act.tiempoMovimiento}
                            </span>
                          )}
                          {act.puntos > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 fill-current text-primary" /> {act.puntos} pts
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 ml-2 border-l border-zinc-200/60 dark:border-zinc-800/80 pl-2 shrink-0">
                          {onEditActividad && (
                            <button
                              type="button"
                              onClick={() => onEditActividad(act)}
                              className="p-1.5 text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                              title="Editar actividad"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (onDeleteActividad) {
                                requestConfirmation(
                                  "Eliminar Actividad",
                                  `¿Estás seguro de que deseas eliminar el registro de "${act.informacion}"?`,
                                  () => onDeleteActividad(act.id, true)
                                );
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                            title="Eliminar actividad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {act.frecuencia && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        <span className="font-semibold text-slate-600 dark:text-zinc-300">Ritmo / Frecuencia:</span> {act.frecuencia}
                      </p>
                    )}
                  </div>
                );
              }
            }); })()}

            {combinedHistory.length === 0 && (
              <div className={`p-8 text-center rounded-3xl border ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-white border-slate-200 text-slate-500"}`}>
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-30 text-primary" />
                <p className="text-xs font-bold">Aún no has guardado ninguna sesión de entrenamiento o actividad.</p>
                <p className="text-[11px] text-slate-400 mt-1">Inicia un entrenamiento libre, ejecuta una rutina o añade una actividad deportiva.</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* --- MODAL WORKOUT BUILDER ESTILO MUSCLEWIKI --- */}
      {showRoutineModal && editingRoutine && (
        <WorkoutBuilderModal
          darkMode={darkMode}
          editingRoutine={editingRoutine}
          initialExercises={routineFormExercises}
          availableExercises={DEFAULT_EJERCICIOS}
          onSaveRoutine={async (routineData, exercises) => {
            const nuevaRutina: RutinaGimnasio = {
              id: routineData.id || `rutina_${Date.now()}`,
              nombre: routineData.nombre || "Rutina de Gimnasio",
              descripcion: routineData.descripcion || "",
              grupoMuscularPrincipal: routineData.grupoMuscularPrincipal || "Pecho",
              gruposMuscularesSecundarios: routineData.gruposMuscularesSecundarios || [],
              duracionEstimadaMin: routineData.duracionEstimadaMin || 60,
              ejercicios: exercises,
              ultimaEdicion: new Date().toISOString(),
            };

            try {
              if (userId) {
                await saveItemToFirestore(userId, "rutinas_gimnasio", nuevaRutina);
              }
              setRutinasGimnasio?.((prev) => {
                const exists = prev.some((r) => r.id === nuevaRutina.id);
                if (exists) return prev.map((r) => (r.id === nuevaRutina.id ? nuevaRutina : r));
                return [nuevaRutina, ...prev];
              });
              showToast("Rutina guardada exitosamente 🎉", "success");
              setShowRoutineModal(false);
              setEditingRoutine(null);
              setRoutineFormExercises([]);
            } catch (err) {
              console.error("Error guardando rutina:", err);
              showToast("Error al guardar la rutina", "error");
            }
          }}
          onClose={() => {
            setShowRoutineModal(false);
            setEditingRoutine(null);
            setRoutineFormExercises([]);
          }}
          showToast={showToast}
        />
      )}

      {/* --- MODAL PARA AÑADIR EJERCICIO PERSONALIZADO A RUTINA --- */}
      {showAddExerciseModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={() => setShowAddExerciseModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 cursor-default ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}
            >
              <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <h4 className="text-sm font-extrabold">Seleccionar o Crear Ejercicio</h4>
                <button onClick={() => setShowAddExerciseModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SELECCIONAR DE LA BIBLIOTECA EXISTENTE */}
              <div className="space-y-2">
                <label className="text-xs font-bold block">Seleccionar de Ejercicios Preexistentes:</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre o grupo..."
                    value={modalPickerSearch}
                    onChange={(e) => setModalPickerSearch(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-none ${
                      darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-zinc-800 rounded-2xl p-2 bg-slate-50 dark:bg-zinc-950/50">
                  {DEFAULT_EJERCICIOS.filter(defEj => {
                    const norm = normalizeSearchText(modalPickerSearch);
                    return !norm ||
                      normalizeSearchText(defEj.nombre).includes(norm) ||
                      normalizeSearchText(defEj.grupoMuscular).includes(norm);
                  }).slice(0, 15).map(defEj => (
                    <button
                      key={defEj.id}
                      type="button"
                      onClick={() => {
                        setRoutineFormExercises(prev => [...prev, defEj]);
                        setShowAddExerciseModal(false);
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>{defEj.nombre}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{defEj.grupoMuscular}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative border-t border-zinc-200/60 dark:border-zinc-800/60 my-2 pt-2">
                <span className="text-[10px] font-bold text-slate-400 block mb-2">O crea un ejercicio nuevo desde cero:</span>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nombre del Ejercicio (en español)"
                    value={customExerciseForm.nombre || ""}
                    onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, nombre: e.target.value }))}
                    className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={customExerciseForm.grupoMuscular || "Pecho"}
                      onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, grupoMuscular: e.target.value as GrupoMuscular }))}
                      className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}
                    >
                      {GRUPOS_MUSCULARES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="Series Obj (4)"
                      value={customExerciseForm.seriesObjetivo || 4}
                      onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, seriesObjetivo: Number(e.target.value) }))}
                      className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Reps Obj (10)"
                      value={customExerciseForm.repeticionesObjetivo || 10}
                      onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, repeticionesObjetivo: Number(e.target.value) }))}
                      className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}
                    />

                    <input
                      type="number"
                      placeholder="Peso Obj kg (20)"
                      value={customExerciseForm.pesoObjetivoKg || 20}
                      onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, pesoObjetivoKg: Number(e.target.value) }))}
                      className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none ${darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveCustomExercise}
                    className="w-full py-2 text-xs font-bold rounded-xl bg-primary text-white dark:text-blue-950 shadow-xs cursor-pointer"
                  >
                    Guardar y Agregar Ejercicio
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* --- MODAL DEMOSTRACIÓN TÉCNICA EN GIF & FORM TIPS --- */}
      {selectedExerciseForTechnique &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto cursor-pointer"
            onClick={() => setSelectedExerciseForTechnique(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4 my-8 cursor-default ${darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}
            >
              <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-3">
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${MUSCLE_COLORS[selectedExerciseForTechnique.grupoMuscular]?.bg} ${MUSCLE_COLORS[selectedExerciseForTechnique.grupoMuscular]?.text} ${MUSCLE_COLORS[selectedExerciseForTechnique.grupoMuscular]?.border}`}>
                    {selectedExerciseForTechnique.grupoMuscular}
                  </span>
                  <h3 className="text-base font-black mt-1">{selectedExerciseForTechnique.nombre}</h3>
                </div>
                <button
                  onClick={() => setSelectedExerciseForTechnique(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* REPRODUCTOR GIF ANIMADO */}
              <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                {selectedExerciseForTechnique.gifUrl ? (
                  <img
                    src={selectedExerciseForTechnique.gifUrl}
                    alt={selectedExerciseForTechnique.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-6 text-center space-y-2">
                    <Dumbbell className="w-12 h-12 text-primary mx-auto" />
                    <span className="text-xs font-bold text-zinc-300 block">Demostración Anatómica</span>
                  </div>
                )}
              </div>

              {/* CONSEJOS TÉCNICOS Y SEGURIDAD */}
              <div className="space-y-3">
                <div className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-950/60 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Instrucciones de Ejecución Correcta
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {selectedExerciseForTechnique.notasTecnica || "Asegúrate de inhalar durante la fase excéntrica y exhalar al aplicar la fuerza en la fase concéntrica. Mantén el rango de movimiento completo sin impulso."}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <span className="text-[10px] text-slate-400 block">Series</span>
                    <span className="font-extrabold">{selectedExerciseForTechnique.seriesObjetivo || 4}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <span className="text-[10px] text-slate-400 block">Repeticiones</span>
                    <span className="font-extrabold">{selectedExerciseForTechnique.repeticionesObjetivo || 10}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    <span className="text-[10px] text-slate-400 block">Carga Base</span>
                    <span className="font-extrabold">{selectedExerciseForTechnique.pesoObjetivoKg || 20} kg</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const exName = selectedExerciseForTechnique.nombre;
                    setSelectedExerciseForTechnique(null);
                    setChartExerciseFilter(exName);
                    setActiveTab("progreso");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-extrabold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Ver Gráfico de Progreso</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedExerciseForTechnique(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-extrabold cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* --- MODAL PARA EDITAR SESIÓN HISTÓRICA --- */}
      {editingSession &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto cursor-pointer"
            onClick={() => setEditingSession(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl p-6 rounded-3xl border shadow-2xl space-y-4 my-8 cursor-default max-h-[90vh] overflow-y-auto ${
                darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-base font-black">
                      {isNewSession ? "Registrar Sesión de Entrenamiento" : "Modificar Sesión Guardada"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isNewSession
                        ? "Registra y ajusta los detalles de la rutina antes de guardarla en tu historial."
                        : "Edita los detalles, series y repeticiones de esta sesión de entrenamiento."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingSession(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CAMPOS GENERALES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nombre del Entrenamiento</label>
                  <input
                    type="text"
                    value={editingSession.rutinaNombre}
                    onChange={(e) => handleUpdateSessionField("rutinaNombre", e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                      darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fecha del Registro</label>
                  <SmartDateTimePicker
                    value={editingSession.fecha || ""}
                    onChange={(val) => {
                      handleUpdateSessionField("fecha", val);
                    }}
                    showTimeOption={false}
                    size="sm"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Hora Inicio (24hs)</label>
                  <Time24Input
                    value={editingSession.horaInicio || ""}
                    onChange={(val) => handleUpdateSessionTimeField("horaInicio", val)}
                    darkMode={darkMode}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Hora Fin (24hs)</label>
                  <Time24Input
                    value={editingSession.horaFin || ""}
                    onChange={(val) => handleUpdateSessionTimeField("horaFin", val)}
                    darkMode={darkMode}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Duración (minutos)</label>
                  <input
                    type="number"
                    value={editingSession.duracionMinutos || ""}
                    onChange={(e) => handleUpdateSessionField("duracionMinutos", Number(e.target.value))}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                      darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Calorías Totales (kcal)</label>
                  <input
                    type="number"
                    value={editingSession.caloriasTotalesSesion || ""}
                    onChange={(e) => handleUpdateSessionField("caloriasTotalesSesion", Number(e.target.value))}
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                      darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Notas de la sesión</label>
                  <input
                    type="text"
                    value={editingSession.notas || ""}
                    onChange={(e) => handleUpdateSessionField("notas", e.target.value)}
                    placeholder="Ej. Me sentí fuerte, subí peso en pecho"
                    className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                      darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />
                </div>
              </div>

              {/* LISTA DE EJERCICIOS Y SUS SERIES */}
              <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary">Ejercicios en esta Sesión</h4>
                  <span className="text-[10px] font-mono text-slate-400">Elimina, agrega o edita series y cargas</span>
                </div>

                {/* BUSCADOR DE EJERCICIOS PARA AGREGAR */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar ejercicio para añadir a la sesión..."
                      value={sessionExerciseSearch}
                      onChange={(e) => setSessionExerciseSearch(e.target.value)}
                      className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-none ${
                        darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  {sessionExerciseSearch.trim().length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-zinc-800 rounded-2xl p-1.5 bg-slate-50 dark:bg-zinc-950/50">
                      {DEFAULT_EJERCICIOS.filter((defEj) => {
                        const norm = normalizeSearchText(sessionExerciseSearch);
                        return !norm ||
                          normalizeSearchText(defEj.nombre).includes(norm) ||
                          normalizeSearchText(defEj.grupoMuscular).includes(norm);
                      })
                        .slice(0, 10)
                        .map((defEj) => (
                          <button
                            key={defEj.id}
                            type="button"
                            onClick={() => {
                              handleAddExerciseToLog(defEj);
                              setSessionExerciseSearch("");
                            }}
                            className="w-full text-left p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center justify-between cursor-pointer"
                          >
                            <span>{defEj.nombre}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                              {defEj.grupoMuscular}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* LISTADO DE EJERCICIOS CON SERIES */}
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {(editingSession.ejerciciosLogs || []).map((eLog, exIdx) => (
                    <div
                      key={exIdx}
                      className={`p-3.5 rounded-2xl border ${
                        darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-slate-50 border-slate-200"
                      } space-y-2`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 flex-wrap">
                            {eLog.ejercicioNombre}
                            <span className="text-[10px] font-black text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded-full border border-primary/10 shrink-0 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-primary shrink-0 fill-primary/20" /> {eLog.caloriasQuemadas || 0} kcal
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 block">{eLog.grupoMuscular}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExerciseFromLog(exIdx)}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer text-[11px] font-bold"
                        >
                          Quitar Ejercicio
                        </button>
                      </div>

                      {/* SERIES */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-4 gap-2 text-[10px] font-black uppercase text-slate-400 text-center">
                          <span>Set</span>
                          <span>Peso (kg)</span>
                          <span>Reps</span>
                          <span>Acción</span>
                        </div>

                        {(eLog.sets || []).map((setObj, setIdx) => (
                          <div key={setIdx} className="grid grid-cols-4 gap-2 items-center text-center">
                            <span className="text-xs font-mono font-bold text-slate-500">#{setObj.setNumero}</span>
                            <input
                              type="number"
                              value={setObj.pesoKg}
                              onChange={(e) =>
                                handleUpdateExerciseLogSet(exIdx, setIdx, "pesoKg", Number(e.target.value))
                              }
                              className={`w-full px-2 py-1 text-xs rounded-lg border outline-none text-center font-mono font-bold ${
                                darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                              }`}
                            />
                            <input
                              type="number"
                              value={setObj.repeticiones}
                              onChange={(e) =>
                                handleUpdateExerciseLogSet(exIdx, setIdx, "repeticiones", Number(e.target.value))
                              }
                              className={`w-full px-2 py-1 text-xs rounded-lg border outline-none text-center font-mono font-bold ${
                                darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSetFromExerciseLog(exIdx, setIdx)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer text-[10px] font-bold"
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddSetToExerciseLog(exIdx)}
                          className="mt-1 w-full py-1 text-[10px] font-black uppercase text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/20 transition-all cursor-pointer"
                        >
                          + Añadir Serie
                        </button>
                      </div>
                    </div>
                  ))}

                  {(editingSession.ejerciciosLogs || []).length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No hay ejercicios registrados en esta sesión. Usa el buscador de arriba para agregar uno.
                    </div>
                  )}
                </div>
              </div>

              {/* BOTONES DE GUARDAR O CANCELAR */}
              <div className="flex items-center gap-2 border-t border-zinc-200/60 dark:border-zinc-800/60 pt-3">
                <button
                  type="button"
                  disabled={isSavingSession}
                  onClick={handleSaveEditedSession}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-extrabold cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingSession ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    isNewSession ? "Registrar Entrenamiento" : "Guardar Cambios"
                  )}
                </button>
                <button
                  type="button"
                  disabled={isSavingSession}
                  onClick={() => {
                    if (!isSavingSession) setEditingSession(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-extrabold cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Internal Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!internalConfirmModal}
        title={internalConfirmModal?.title || "Confirmar Eliminación"}
        message={internalConfirmModal?.message || "¿Estás seguro de que deseas eliminar este elemento?"}
        onConfirm={async () => {
          if (internalConfirmModal) {
            await internalConfirmModal.onConfirm();
          }
        }}
        onClose={() => setInternalConfirmModal(null)}
        darkMode={darkMode}
      />
    </>
  );
};

export default GymRutinaView;
