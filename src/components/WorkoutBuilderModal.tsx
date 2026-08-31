import React, { useState, useMemo, useEffect } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Dumbbell,
  X,
  Search,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  Save,
  Loader2,
  Flame,
  Clock,
  Layers,
  Sparkles,
  Info,
  Check,
  Link2,
  ListPlus,
  Sliders,
  Filter,
  Eye,
  CheckCircle2
} from "lucide-react";
import { EjercicioRutina, GrupoMuscular, RutinaGimnasio } from "../types";
import {
  MALE_FRONT_MAP,
  MALE_BACK_MAP,
  FEMALE_FRONT_MAP,
  FEMALE_BACK_MAP,
} from "../data/muscleMapPaths";
import { MuscleCanvasMap } from "./MuscleCanvasMap";

export interface WorkoutBuilderModalProps {
  darkMode: boolean;
  editingRoutine: Partial<RutinaGimnasio>;
  initialExercises?: EjercicioRutina[];
  availableExercises: EjercicioRutina[];
  onSaveRoutine: (routine: Partial<RutinaGimnasio>, exercises: EjercicioRutina[]) => void;
  onClose: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

// Mapa de músculos secundarios e intensidad de impacto por ejercicio
const MUSCLE_TARGET_MAPPING: Record<string, { primary: GrupoMuscular; secondary?: GrupoMuscular[]; primarySetsMultiplier?: number }> = {
  "Pecho": { primary: "Pecho", secondary: ["Tríceps", "Hombros"] },
  "Espalda": { primary: "Espalda", secondary: ["Bíceps"] },
  "Hombros": { primary: "Hombros", secondary: ["Tríceps"] },
  "Bíceps": { primary: "Bíceps" },
  "Tríceps": { primary: "Tríceps" },
  "Piernas": { primary: "Piernas", secondary: ["Abdomen"] },
  "Abdomen": { primary: "Abdomen" },
};

const MUSCLE_FILTER_OPTIONS: { value: string; label: string; desc?: string }[] = [
  { value: "Todos", label: "Todos los grupos musculares", desc: "Catálogo completo de ejercicios" },
  { value: "Pecho", label: "Pecho", desc: "Pectoral Mayor & Menor" },
  { value: "Espalda", label: "Espalda", desc: "Dorsal Ancho, Trapecios & Lumbares" },
  { value: "Hombros", label: "Hombros", desc: "Deltoides (Anterior, Lateral, Posterior)" },
  { value: "Bíceps", label: "Bíceps", desc: "Bíceps Braquial & Antebrazos" },
  { value: "Tríceps", label: "Tríceps", desc: "Tríceps Braquial (3 Cabezas)" },
  { value: "Piernas", label: "Piernas", desc: "Cuádriceps, Isquios & Pantorrillas" },
  { value: "Abdomen", label: "Abdomen", desc: "Core, Recto Abdominal & Oblicuos" },
];

const PRINCIPAL_MUSCLE_OPTIONS: { value: GrupoMuscular; label: string; desc?: string }[] = [
  { value: "Pecho", label: "Pecho", desc: "Pectoral Mayor & Menor" },
  { value: "Espalda", label: "Espalda", desc: "Dorsal Ancho, Trapecios & Lumbares" },
  { value: "Hombros", label: "Hombros", desc: "Deltoides" },
  { value: "Bíceps", label: "Bíceps", desc: "Bíceps Braquial & Antebrazos" },
  { value: "Tríceps", label: "Tríceps", desc: "Tríceps Braquial" },
  { value: "Piernas", label: "Piernas", desc: "Cuádriceps, Isquios & Pantorrillas" },
  { value: "Abdomen", label: "Abdomen", desc: "Core & Zona abdominal" },
];

interface SelectPopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: "top" | "bottom";
}

interface CustomMuscleDropdownProps {
  darkMode: boolean;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; desc?: string }[];
  placeholder?: string;
}

const CustomMuscleDropdown: React.FC<CustomMuscleDropdownProps> = ({
  darkMode,
  value,
  onChange,
  options,
  placeholder = "Seleccionar Músculo",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const computePopoverPosition = (): SelectPopoverPosition | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
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
    if (!isOpen) {
      const pos = computePopoverPosition();
      if (pos) setPopoverPosition(pos);
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
        containerRef.current &&
        !containerRef.current.contains(target) &&
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

  const selectedOpt = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-extrabold flex items-center justify-between gap-2 transition-all cursor-pointer ${
          darkMode
            ? "bg-zinc-950 border-zinc-800 text-white hover:border-primary/50 focus:border-primary"
            : "bg-slate-50 border-slate-200 text-slate-800 hover:border-primary/50 focus:border-primary"
        } ${isOpen ? "ring-2 ring-primary/20 border-primary" : ""}`}
      >
        <div className="flex items-center gap-2 truncate">
          <div className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
          <span className="truncate">{selectedOpt?.label || placeholder}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

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
                  backgroundColor: darkMode ? "#18181b" : "#ffffff",
                }}
                className={`p-1.5 rounded-2xl border shadow-2xl space-y-1 max-h-64 overflow-y-auto custom-scrollbar opacity-100 backdrop-blur-none ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-black/80"
                    : "bg-white border-slate-200 text-slate-900 shadow-slate-400/40"
                }`}
              >
                {options.map((opt) => {
                  const isSelected = value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white shadow-sm"
                          : darkMode
                          ? "text-white hover:bg-zinc-800/80"
                          : "text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isSelected ? "bg-white animate-pulse" : "bg-primary/50"
                          }`}
                        />
                        <div className="truncate">
                          <span className="truncate block font-bold">{opt.label}</span>
                          {opt.desc && (
                            <span
                              className={`text-[10px] font-normal block truncate ${
                                isSelected
                                  ? "text-white/90"
                                  : darkMode
                                  ? "text-white/80"
                                  : "text-slate-900"
                              }`}
                            >
                              {opt.desc}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

// SVG Anatomical Muscle Map Component (Male / Female Front & Back) inspired by MuscleMapJS & MuscleWiki
interface LiveMuscleMapProps {
  activeMuscles: Set<GrupoMuscular>;
  darkMode: boolean;
  onSelectMuscleGroup?: (muscle: GrupoMuscular) => void;
  selectedMuscleFilter?: string;
  muscleSetsMap?: Record<string, number>;
}

interface MuscleDetailInfo {
  name: string;
  latinName: string;
  group: GrupoMuscular;
  functionText: string;
}

const MUSCLE_ANATOMY_DETAILS: Record<string, MuscleDetailInfo> = {
  "Pecho": {
    name: "Pectoral Mayor & Menor",
    latinName: "Pectoralis major / minor",
    group: "Pecho",
    functionText: "Empuje horizontal, aducción y rotación interna de brazo",
  },
  "Espalda": {
    name: "Dorsal Ancho, Trapecio & Lumbares",
    latinName: "Latissimus dorsi & Trapezius",
    group: "Espalda",
    functionText: "Tracción vertical/horizontal, aducción de escápula y extensión de columna",
  },
  "Hombros": {
    name: "Deltoides (Anterior, Lateral, Posterior)",
    latinName: "Deltoideus (clavicularis, acromialis, spinata)",
    group: "Hombros",
    functionText: "Abducción, elevación y estabilización de la articulación glenohumeral",
  },
  "Bíceps": {
    name: "Bíceps Braquial & Antebrazos",
    latinName: "Biceps brachii & Brachioradialis",
    group: "Bíceps",
    functionText: "Flexión de codo, supinación de antebrazo y agarre",
  },
  "Tríceps": {
    name: "Tríceps Braquial (3 Cabezas)",
    latinName: "Triceps brachii (longum, laterale, mediale)",
    group: "Tríceps",
    functionText: "Extensión de codo y extensión de la articulación del hombro",
  },
  "Piernas": {
    name: "Cuádriceps, Isquiotibiales & Pantorrillas",
    latinName: "Quadriceps femoris, Hamstrings & Gastrocnemius",
    group: "Piernas",
    functionText: "Extensión y flexión de rodilla, flexión de cadera y plantarflexión",
  },
  "Abdomen": {
    name: "Recto Abdominal, Oblicuos & Serrato",
    latinName: "Rectus abdominis & Obliquus externus",
    group: "Abdomen",
    functionText: "Flexión de columna, rotación de tronco y estabilización core",
  },
};

const LiveMuscleMap: React.FC<LiveMuscleMapProps> = ({
  activeMuscles,
  darkMode,
  onSelectMuscleGroup,
  selectedMuscleFilter,
  muscleSetsMap = {},
}) => {
  return (
    <div className={`p-4 rounded-3xl border shadow-2xl space-y-3 relative select-none transition-colors ${
      darkMode ? "bg-[#0a0a0d] border-zinc-800/90 text-white" : "bg-white border-slate-200 text-slate-900"
    }`}>
      {/* HEADER BAR CON TÍTULO */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Mapa Muscular Interactivo
          </span>
        </div>
      </div>

      {/* RENDERIZADOR CANVAS2D MOTOR MUSCLEMAPJS */}
      <MuscleCanvasMap
        activeMuscles={activeMuscles}
        darkMode={darkMode}
        selectedMuscleFilter={selectedMuscleFilter}
        muscleSetsMap={muscleSetsMap}
        onSelectMuscleGroup={onSelectMuscleGroup}
      />

      {/* CHIPS INTERACTIVOS DE MÚSCULOS TRABAJADOS */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {Array.from(activeMuscles).map((m) => {
          const setsCount = muscleSetsMap[m] || 0;
          return (
            <button
              type="button"
              key={m}
              onClick={() => onSelectMuscleGroup?.(m)}
              className="px-2.5 py-1 text-[10px] font-black rounded-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all cursor-pointer flex items-center gap-1.5 group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse group-hover:bg-white" />
              <span>{m}</span>
              {setsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-slate-100 dark:bg-white/10 group-hover:bg-white/20 text-primary group-hover:text-white">
                  {setsCount} sets
                </span>
              )}
            </button>
          );
        })}
        {activeMuscles.size === 0 && (
          <span className="text-[11px] text-slate-900 dark:text-white italic">
            Selecciona o añade ejercicios para iluminar los músculos objetivo en el Canvas
          </span>
        )}
      </div>
    </div>
  );
};

// Helper para normalizar cadenas eliminando acentos/diacríticos y espacios superfluos
const normalizeSearchText = (str: string): string => {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const WorkoutBuilderModal: React.FC<WorkoutBuilderModalProps> = ({
  darkMode,
  editingRoutine,
  initialExercises = [],
  availableExercises,
  onSaveRoutine,
  onClose,
  showToast,
}) => {
  useLockBodyScroll(true);
  // Estado local de la rutina en construcción
  const [nombreRutina, setNombreRutina] = useState<string>(
    editingRoutine.nombre || "Rutina Personalizada"
  );
  const [grupoPrincipal, setGrupoPrincipal] = useState<GrupoMuscular>(
    editingRoutine.grupoMuscularPrincipal || "Pecho"
  );
  const [duracionMin, setDuracionMin] = useState<number>(
    editingRoutine.duracionEstimadaMin || 45
  );
  const [descripcion, setDescripcion] = useState<string>(
    editingRoutine.descripcion || ""
  );
  const [isSaving, setIsSaving] = useState(false);

  // Lista de ejercicios agregados al canvas de la rutina
  const [selectedExercises, setSelectedExercises] = useState<
    Array<EjercicioRutina & { setsList?: Array<{ reps: number; weight: number }> }>
  >(() => {
    if (initialExercises && initialExercises.length > 0) {
      return initialExercises.map((e) => ({
        ...e,
        setsList: Array.from({ length: e.seriesObjetivo || 3 }).map(() => ({
          reps: e.repeticionesObjetivo || 10,
          weight: e.pesoObjetivoKg || 20,
        })),
      }));
    }
    return [];
  });

  // Filtros de la biblioteca de ejercicios (Columna izquierda)
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>("Todos");
  const [selectedEquipFilter, setSelectedEquipFilter] = useState<string>("Todos");

  // Unidad de peso global para el constructor (kg / lb)
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");

  // Estado para el modal de video/demostración técnica
  const [videoDemoExercise, setVideoDemoExercise] = useState<EjercicioRutina | null>(null);

  // Vista activa en pantallas pequeñas (Mobile tabs: 'library', 'canvas', 'summary')
  const [mobileTab, setMobileTab] = useState<"library" | "canvas" | "summary">("canvas");

  // Manejo de la tecla Escape para cerrar el modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (videoDemoExercise) {
          setVideoDemoExercise(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, videoDemoExercise]);

  // Ref para el contenedor de la lista de ejercicios de la biblioteca
  const libraryListRef = React.useRef<HTMLDivElement>(null);

  // Filtrado dinámico de la biblioteca (con soporte para búsqueda insensible a acentos)
  const filteredLibrary = useMemo(() => {
    const normSearch = normalizeSearchText(searchTerm);
    return availableExercises.filter((ej) => {
      const normNombre = normalizeSearchText(ej.nombre);
      const normNotas = normalizeSearchText(ej.notasTecnica || "");
      const normGrupo = normalizeSearchText(ej.grupoMuscular || "");
      const normEquip = normalizeSearchText(ej.equipamiento || "");

      const matchSearch =
        !normSearch ||
        normNombre.includes(normSearch) ||
        normNotas.includes(normSearch) ||
        normGrupo.includes(normSearch) ||
        normEquip.includes(normSearch);

      const matchMuscle =
        selectedMuscleFilter === "Todos" ||
        normalizeSearchText(ej.grupoMuscular) === normalizeSearchText(selectedMuscleFilter);

      const matchEquip =
        selectedEquipFilter === "Todos" ||
        normEquip.includes(normalizeSearchText(selectedEquipFilter));

      return matchSearch && matchMuscle && matchEquip;
    });
  }, [availableExercises, searchTerm, selectedMuscleFilter, selectedEquipFilter]);

  // Paginación de la biblioteca de ejercicios (15 por página)
  const PAGE_SIZE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset automático de página al cambiar cualquier filtro o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMuscleFilter, selectedEquipFilter]);

  const totalPages = Math.ceil(filteredLibrary.length / PAGE_SIZE) || 1;
  const validPage = Math.min(currentPage, totalPages);

  // Desplazar automáticamente al inicio de la lista de ejercicios al cambiar de página
  useEffect(() => {
    if (libraryListRef.current) {
      libraryListRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [validPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (libraryListRef.current) {
      libraryListRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const displayedLibrary = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return filteredLibrary.slice(start, start + PAGE_SIZE);
  }, [filteredLibrary, validPage]);

  // Músculos activos en vivo para el mapa anatómico
  const activeMusclesSet = useMemo(() => {
    const set = new Set<GrupoMuscular>();
    selectedExercises.forEach((ex) => {
      set.add(ex.grupoMuscular);
      const mapping = MUSCLE_TARGET_MAPPING[ex.grupoMuscular];
      if (mapping?.secondary) {
        mapping.secondary.forEach((s) => set.add(s));
      }
    });
    return set;
  }, [selectedExercises]);

  // Métrica de volumen y series acumuladas por músculo
  const muscleVolumeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedExercises.forEach((ex) => {
      const numSets = ex.setsList ? ex.setsList.length : ex.seriesObjetivo || 3;
      counts[ex.grupoMuscular] = (counts[ex.grupoMuscular] || 0) + numSets;
      const mapping = MUSCLE_TARGET_MAPPING[ex.grupoMuscular];
      if (mapping?.secondary) {
        mapping.secondary.forEach((sec) => {
          counts[sec] = (counts[sec] || 0) + Math.round(numSets * 0.5 * 10) / 10;
        });
      }
    });
    return counts;
  }, [selectedExercises]);

  // Resumen total del entrenamiento
  const totalSetsCount = useMemo(() => {
    return selectedExercises.reduce(
      (acc, ex) => acc + (ex.setsList ? ex.setsList.length : ex.seriesObjetivo || 3),
      0
    );
  }, [selectedExercises]);

  const estimatedMinutes = useMemo(() => {
    // Estimación ~3 min por serie (incluye descanso y ejecución)
    return Math.max(20, Math.round(totalSetsCount * 3.2));
  }, [totalSetsCount]);

  // Manejo de agregar un ejercicio desde la biblioteca al canvas
  const handleAddExerciseToCanvas = (ejercicio: EjercicioRutina) => {
    const defaultSetsCount = ejercicio.seriesObjetivo || 3;
    const defaultReps = ejercicio.repeticionesObjetivo || 10;
    const defaultWeight = ejercicio.pesoObjetivoKg || 20;

    const newEntry = {
      ...ejercicio,
      setsList: Array.from({ length: defaultSetsCount }).map(() => ({
        reps: defaultReps,
        weight: defaultWeight,
      })),
    };

    setSelectedExercises((prev) => [...prev, newEntry]);
    showToast(`"${ejercicio.nombre}" añadido a la rutina`, "success");
  };

  // Remover ejercicio del canvas
  const handleRemoveExercise = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  // Mover posición del ejercicio
  const handleMoveExercise = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === selectedExercises.length - 1) return;

    const targetIdx = direction === "up" ? index - 1 : index + 1;
    setSelectedExercises((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Modificar set individual de un ejercicio
  const handleUpdateSet = (
    exIndex: number,
    setIndex: number,
    field: "reps" | "weight",
    delta: number
  ) => {
    setSelectedExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exIndex] };
      if (!ex.setsList) return prev;

      const newSets = [...ex.setsList];
      const currentVal = newSets[setIndex][field];
      const step = field === "reps" ? 1 : weightUnit === "lb" ? 5 : 2.5;
      const updatedVal = Math.max(0, currentVal + delta * step);

      newSets[setIndex] = { ...newSets[setIndex], [field]: updatedVal };
      ex.setsList = newSets;
      copy[exIndex] = ex;
      return copy;
    });
  };

  // Añadir una serie a un ejercicio
  const handleAddSetToExercise = (exIndex: number) => {
    setSelectedExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exIndex] };
      const currentSets = ex.setsList || [];
      const lastSet = currentSets[currentSets.length - 1] || { reps: 10, weight: 20 };

      ex.setsList = [...currentSets, { reps: lastSet.reps, weight: lastSet.weight }];
      copy[exIndex] = ex;
      return copy;
    });
  };

  // Eliminar una serie de un ejercicio
  const handleRemoveSetFromExercise = (exIndex: number, setIndex: number) => {
    setSelectedExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exIndex] };
      if (!ex.setsList || ex.setsList.length <= 1) {
        showToast("Cada ejercicio debe mantener al menos 1 serie", "info");
        return prev;
      }
      ex.setsList = ex.setsList.filter((_, i) => i !== setIndex);
      copy[exIndex] = ex;
      return copy;
    });
  };

  // Guardar la rutina construida
  const handleSave = async () => {
    if (!nombreRutina.trim()) {
      showToast("Ingresa un nombre para la rutina", "error");
      return;
    }

    if (selectedExercises.length === 0) {
      showToast("Agrega al menos un ejercicio a la rutina", "error");
      return;
    }

    setIsSaving(true);
    try {
      // Convertir selectedExercises a formato final de EjercicioRutina
      const finalExercises: EjercicioRutina[] = selectedExercises.map((ex) => ({
        id: ex.id || `ej_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        nombre: ex.nombre,
        grupoMuscular: ex.grupoMuscular,
        seriesObjetivo: ex.setsList ? ex.setsList.length : ex.seriesObjetivo || 3,
        repeticionesObjetivo: ex.setsList && ex.setsList[0] ? ex.setsList[0].reps : ex.repeticionesObjetivo || 10,
        pesoObjetivoKg: ex.setsList && ex.setsList[0] ? ex.setsList[0].weight : ex.pesoObjetivoKg || 20,
        gifUrl: ex.gifUrl,
        notasTecnica: ex.notasTecnica,
        equipamiento: ex.equipamiento,
      }));

      const updatedRoutine: Partial<RutinaGimnasio> = {
        ...editingRoutine,
        nombre: nombreRutina.trim(),
        grupoMuscularPrincipal: grupoPrincipal,
        duracionEstimadaMin: estimatedMinutes,
        descripcion: descripcion.trim() || `Rutina enfocada en ${grupoPrincipal} (${finalExercises.length} ejercicios)`,
      };

      await onSaveRoutine(updatedRoutine, finalExercises);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden cursor-pointer"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-7xl h-[94vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden cursor-default ${
          darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* --- HEADER PRINCIPAL MUSCLEWIKI STYLE --- */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  WORKOUT BUILDER
                </span>
                <span className="text-[10px] text-slate-900 dark:text-white font-mono hidden sm:inline">
                  ✓ Borrador guardado automáticamente
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight">
                Constructor de Rutinas
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-4 py-2 text-xs font-black rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Rutina</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                if (!isSaving) onClose();
              }}
              className="p-2 text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white rounded-full hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLES MOBILE TAB BAR (pantallas chicas) */}
        <div className="lg:hidden flex border-b border-zinc-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-xs font-bold shrink-0">
          <button
            onClick={(e) => { setMobileTab("library"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 ${
              mobileTab === "library"
                ? "border-b-2 border-primary text-primary font-black bg-white dark:bg-zinc-900"
                : "text-slate-900 dark:text-white"
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Biblioteca
          </button>
          <button
            onClick={(e) => { setMobileTab("canvas"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 ${
              mobileTab === "canvas"
                ? "border-b-2 border-primary text-primary font-black bg-white dark:bg-zinc-900"
                : "text-slate-900 dark:text-white"
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" /> Rutina ({selectedExercises.length})
          </button>
          <button
            onClick={(e) => { setMobileTab("summary"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 ${
              mobileTab === "summary"
                ? "border-b-2 border-primary text-primary font-black bg-white dark:bg-zinc-900"
                : "text-slate-900 dark:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Mapa & Stats
          </button>
        </div>

        {/* --- CUERPO PRINCIPAL 3 COLUMNAS --- */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-zinc-800">
          {/* ========================================================= */}
          {/* COLUMNA IZQUIERDA: BIBLIOTECA DE EJERCICIOS (3 cols)      */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-3 flex flex-col h-full overflow-hidden p-4 space-y-3 ${
              mobileTab !== "library" ? "hidden lg:flex" : "flex"
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" /> Biblioteca de Ejercicios
              </h3>
            </div>

            {/* BUSCADOR */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-zinc-300" />
              <input
                type="text"
                placeholder="Buscar por nombre o técnica..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                  darkMode
                    ? "bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-400 focus:border-primary"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500 focus:border-primary"
                }`}
              />
            </div>

            {/* FILTROS POR MÚSCULO & EQUIPAMIENTO */}
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white block mb-1">
                  Músculo Objetivo
                </label>
                <CustomMuscleDropdown
                  darkMode={darkMode}
                  value={selectedMuscleFilter}
                  onChange={setSelectedMuscleFilter}
                  options={MUSCLE_FILTER_OPTIONS}
                  placeholder="Filtrar por grupo muscular"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white block mb-1">
                  Equipamiento
                </label>
                <div className="flex flex-wrap gap-1">
                  {["Todos", "Barra", "Mancuernas", "Polea", "Máquina", "Peso Corporal"].map((eq) => (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => setSelectedEquipFilter(eq)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        selectedEquipFilter === eq
                          ? "bg-primary text-white shadow-xs"
                          : "bg-slate-200/60 dark:bg-zinc-800 text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary"
                      }`}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* LISTA DE TARJETAS DE EJERCICIOS CON VÍDEO Y BOTÓN AÑADIR */}
            <div
              ref={libraryListRef}
              className="flex-1 overflow-y-auto space-y-2 pr-1 pt-1 scroll-smooth custom-scrollbar"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={validPage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-2"
                >
                  {displayedLibrary.map((ej) => {
                    const isAdded = selectedExercises.some((se) => se.nombre === ej.nombre);

                    return (
                      <div
                        key={ej.id}
                        className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 group ${
                          darkMode
                            ? "bg-zinc-950/60 border-zinc-800/80 hover:border-primary/50"
                            : "bg-white border-slate-200 hover:border-primary/50 shadow-xs"
                        }`}
                      >
                        {/* THUMBNAIL / VÍDEO PREVIEW CON BOTÓN PLAY */}
                        <button
                          type="button"
                          onClick={() => setVideoDemoExercise(ej)}
                          className="relative w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-zinc-700/50 cursor-pointer group-hover:scale-105 transition-transform"
                          title="Ver demostración técnica en vídeo"
                        >
                          {ej.gifUrl ? (
                            <img
                              src={ej.gifUrl}
                              alt={ej.nombre}
                              loading="lazy"
                              className="w-full h-full object-cover opacity-80"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-primary">
                              <Dumbbell className="w-5 h-5" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="p-1 rounded-full bg-primary/90 text-white shadow-md">
                              <Play className="w-3 h-3 fill-current ml-0.5" />
                            </div>
                          </div>
                        </button>

                        {/* DATOS DEL EJERCICIO */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black truncate text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                            {ej.nombre}
                          </h4>
                          <p className="text-[10px] text-slate-900 dark:text-white truncate font-medium">
                            {ej.equipamiento || "Gimnasio"} • {ej.grupoMuscular}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white">
                              {ej.seriesObjetivo || 3}x{ej.repeticionesObjetivo || 10}
                            </span>
                          </div>
                        </div>

                        {/* BOTÓN MÚSCULO WIKI "+" AÑADIR */}
                        <button
                          type="button"
                          onClick={() => handleAddExerciseToCanvas(ej)}
                          className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                            isAdded
                              ? darkMode
                                ? "bg-primary/20 hover:bg-primary/30 border-primary/50 text-primary"
                                : "bg-primary/10 hover:bg-primary/20 border-primary/40 text-primary"
                              : darkMode
                              ? "bg-zinc-900/50 hover:bg-zinc-800 border-zinc-700/50 text-white hover:text-primary hover:border-primary/50"
                              : "bg-white border-slate-200 text-slate-900 hover:bg-slate-100 hover:text-primary hover:border-primary/50 shadow-xs"
                          }`}
                          title={isAdded ? "Añadir otra serie / duplicar" : "Añadir a la rutina"}
                        >
                          <Plus className="w-4 h-4 text-primary" />
                        </button>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>

              {filteredLibrary.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-900 dark:text-white space-y-1">
                  <p className="font-bold">No se encontraron ejercicios</p>
                  <p className="text-[11px]">Prueba con otra búsqueda o grupo muscular.</p>
                </div>
              )}
            </div>

            {/* CONTROLES DE PAGINACIÓN */}
            {filteredLibrary.length > 0 && (
              <div className="pt-2 pb-1 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between text-[10px] text-slate-900 dark:text-white font-medium">
                  <span>
                    Mostrando <strong className="text-slate-900 dark:text-white">{(validPage - 1) * PAGE_SIZE + 1}–{Math.min(validPage * PAGE_SIZE, filteredLibrary.length)}</strong> de <strong className="text-slate-900 dark:text-white">{filteredLibrary.length}</strong>
                  </span>
                  <span className="font-mono font-bold text-primary">Pág {validPage} / {totalPages}</span>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.max(1, validPage - 1))}
                    disabled={validPage <= 1}
                    className={`px-2 py-1 text-[11px] font-extrabold rounded-lg border transition-all flex items-center gap-0.5 cursor-pointer ${
                      validPage <= 1
                        ? "opacity-30 cursor-not-allowed border-zinc-300 dark:border-zinc-800 text-slate-400 dark:text-zinc-500"
                        : "hover:bg-primary/10 hover:border-primary/50 text-slate-900 dark:text-white border-zinc-300 dark:border-zinc-800"
                    }`}
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Ant.</span>
                  </button>

                  <div className="flex items-center gap-1 overflow-x-auto scroll-smooth max-w-[150px] scrollbar-none py-0.5">
                    {(() => {
                      const pages: (number | string)[] = [];
                      if (totalPages <= 5) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (validPage > 3) pages.push("...");
                        const start = Math.max(2, validPage - 1);
                        const end = Math.min(totalPages - 1, validPage + 1);
                        for (let i = start; i <= end; i++) pages.push(i);
                        if (validPage < totalPages - 2) pages.push("...");
                        pages.push(totalPages);
                      }
                      return pages.map((p, idx) => {
                        if (p === "...") {
                          return <span key={`dots-${idx}`} className="px-0.5 text-[9px] text-slate-900 dark:text-white font-mono">...</span>;
                        }
                        const isCurrent = p === validPage;
                        return (
                          <button
                            key={`p-${p}`}
                            type="button"
                            onClick={() => handlePageChange(p as number)}
                            className={`w-5 h-5 text-[10px] font-black rounded transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                              isCurrent
                                ? "bg-primary text-white shadow-xs border border-primary"
                                : "bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 hover:border-primary/40 hover:text-primary"
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
                    onClick={() => handlePageChange(Math.min(totalPages, validPage + 1))}
                    disabled={validPage >= totalPages}
                    className={`px-2 py-1 text-[11px] font-extrabold rounded-lg border transition-all flex items-center gap-0.5 cursor-pointer ${
                      validPage >= totalPages
                        ? "opacity-30 cursor-not-allowed border-zinc-300 dark:border-zinc-800 text-slate-400 dark:text-zinc-500"
                        : "hover:bg-primary/10 hover:border-primary/50 text-slate-900 dark:text-white border-zinc-300 dark:border-zinc-800"
                    }`}
                  >
                    <span>Sig.</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* COLUMNA CENTRAL: CANVAS / LISTA DE RUTINA (5 cols)         */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-5 flex flex-col h-full overflow-hidden p-4 space-y-4 ${
              mobileTab !== "canvas" ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* ENCABEZADO DE LA RUTINA & INPUTS */}
            <div className={`p-4 rounded-3xl border ${darkMode ? "bg-zinc-950/80 border-zinc-800" : "bg-slate-50 border-slate-200"} space-y-3`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white block mb-0.5">
                    Nombre de la Rutina
                  </label>
                  <input
                    type="text"
                    value={nombreRutina}
                    onChange={(e) => setNombreRutina(e.target.value)}
                    placeholder="Ej. Pecho & Tríceps Hipertrofia"
                    className="w-full text-base sm:text-lg font-black bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-primary outline-none pb-0.5 text-slate-900 dark:text-white"
                  />
                </div>

                {/* TOGGLE UNIDAD KG / LB */}
                <div className="flex items-center gap-1 self-end sm:self-center bg-slate-200 dark:bg-zinc-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setWeightUnit("kg")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      weightUnit === "kg"
                        ? "bg-primary text-white shadow-xs"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightUnit("lb")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      weightUnit === "lb"
                        ? "bg-primary text-white shadow-xs"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    lb
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-900 dark:text-white block mb-0.5">
                    Músculo Principal
                  </label>
                  <CustomMuscleDropdown
                    darkMode={darkMode}
                    value={grupoPrincipal}
                    onChange={(val) => setGrupoPrincipal(val as GrupoMuscular)}
                    options={PRINCIPAL_MUSCLE_OPTIONS}
                    placeholder="Músculo Principal"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-900 dark:text-white block mb-0.5">
                    Duración Est.
                  </label>
                  <div className={`px-3 py-1.5 rounded-xl border font-mono font-bold flex items-center justify-between text-xs ${
                    darkMode ? "bg-zinc-900 border-zinc-800 text-primary" : "bg-white border-slate-200 text-primary"
                  }`}>
                    <span>~{estimatedMinutes} min</span>
                    <Clock className="w-3.5 h-3.5 text-primary" />
                  </div>
                </div>
              </div>
            </div>

            {/* LISTA DE EJERCICIOS CON TABLA DE SERIES MUSCLEWIKI STYLE */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {selectedExercises.map((ex, exIdx) => (
                <div
                  key={exIdx}
                  className={`p-4 rounded-3xl border transition-all ${
                    darkMode ? "bg-zinc-950/90 border-zinc-800" : "bg-white border-slate-200 shadow-xs"
                  } space-y-3`}
                >
                  {/* CABECERA DEL EJERCICIO */}
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-primary/15 text-primary font-black text-xs inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                        {exIdx + 1}
                      </span>

                      {ex.gifUrl && (
                        <button
                          type="button"
                          onClick={() => setVideoDemoExercise(ex)}
                          className="w-8 h-8 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-700/50"
                          title="Ver vídeo demostración"
                        >
                          <img src={ex.gifUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                      )}

                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black truncate text-slate-900 dark:text-white">
                          {ex.nombre}
                        </h4>
                        <span className="text-[10px] text-slate-900 dark:text-white block font-medium">
                          {ex.grupoMuscular} • {ex.setsList?.length || 3} series
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveExercise(exIdx, "up")}
                        disabled={exIdx === 0}
                        className="p-1 text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Subir posición"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveExercise(exIdx, "down")}
                        disabled={exIdx === selectedExercises.length - 1}
                        className="p-1 text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Bajar posición"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exIdx)}
                        className="p-1.5 text-slate-500 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400 rounded-lg cursor-pointer"
                        title="Eliminar ejercicio de la rutina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* TABLA DE SERIES MUSCLEWIKI INTERACTIVA */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-12 gap-1 text-[10px] font-black uppercase text-slate-900 dark:text-white px-1">
                      <span className="col-span-2 text-center">Serie</span>
                      <span className="col-span-5 text-center">Repeticiones</span>
                      <span className="col-span-4 text-center">Peso ({weightUnit})</span>
                      <span className="col-span-1 text-center"></span>
                    </div>

                    {ex.setsList?.map((s, sIdx) => (
                      <div
                        key={sIdx}
                        className={`grid grid-cols-12 gap-1.5 items-center p-1.5 rounded-2xl border text-xs font-mono ${
                          darkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        {/* NÚMERO DE SERIE */}
                        <span className="col-span-2 text-center font-bold text-slate-900 dark:text-white">
                          #{sIdx + 1}
                        </span>

                        {/* REPETICIONES CONTROLES (- / val / +) */}
                        <div className="col-span-5 flex items-center justify-center gap-1 bg-white dark:bg-zinc-950 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateSet(exIdx, sIdx, "reps", -1)}
                            className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-primary hover:text-white text-slate-900 dark:text-white flex items-center justify-center font-black cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-black text-xs min-w-[24px] text-center text-slate-900 dark:text-white">
                            {s.reps}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSet(exIdx, sIdx, "reps", 1)}
                            className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-primary hover:text-white text-slate-900 dark:text-white flex items-center justify-center font-black cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* PESO CONTROLES (- / val / +) */}
                        <div className="col-span-4 flex items-center justify-center gap-1 bg-white dark:bg-zinc-950 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateSet(exIdx, sIdx, "weight", -1)}
                            className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-primary hover:text-white text-slate-900 dark:text-white flex items-center justify-center font-black cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-black text-xs min-w-[28px] text-center text-slate-900 dark:text-white">
                            {s.weight}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSet(exIdx, sIdx, "weight", 1)}
                            className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-primary hover:text-white text-slate-900 dark:text-white flex items-center justify-center font-black cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* BOTÓN BORRAR SERIE */}
                        <div className="col-span-1 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveSetFromExercise(exIdx, sIdx)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Eliminar serie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* BOTÓN AÑADIR SERIE */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleAddSetToExercise(exIdx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        darkMode
                          ? "bg-zinc-900/50 hover:bg-zinc-800 border-zinc-700/50 text-white hover:text-primary hover:border-primary/50"
                          : "bg-white border-slate-200 text-slate-900 hover:bg-slate-100 hover:text-primary hover:border-primary/50 shadow-xs"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      <span>Agregar Serie</span>
                    </button>
                  </div>
                </div>
              ))}

              {selectedExercises.length === 0 && (
                <div className="p-8 text-center rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 space-y-3 my-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Tu lienzo de rutina está vacío
                    </h4>
                    <p className="text-xs text-slate-900 dark:text-white max-w-xs mx-auto mt-1">
                      Haz clic en el botón <span className="font-bold text-primary">+</span> de los ejercicios de la biblioteca para agregarlos aquí.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMNA DERECHA: MAPA MUSCULAR Y ESTADÍSTICAS (4 cols)   */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-4 flex flex-col h-full overflow-y-auto p-4 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 ${
              mobileTab !== "summary" ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* MAPA ANATÓMICO MUSCULAR EN VIVO */}
            <LiveMuscleMap
              activeMuscles={activeMusclesSet}
              darkMode={darkMode}
              selectedMuscleFilter={selectedMuscleFilter}
              muscleSetsMap={muscleVolumeStats}
              onSelectMuscleGroup={(muscle) => {
                setSelectedMuscleFilter(muscle);
                setMobileTab("library");
              }}
            />

            {/* RESUMEN DE ENTRENAMIENTO MUSCLEWIKI METRICS */}
            <div className={`p-4 rounded-3xl border ${darkMode ? "bg-zinc-950/80 border-zinc-800" : "bg-slate-50 border-slate-200"} space-y-3`}>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-primary" /> Resumen del Entrenamiento
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`p-2.5 rounded-2xl border ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
                  <span className="text-[10px] font-extrabold text-slate-900 dark:text-white block uppercase">Ejercicios</span>
                  <span className="text-base font-black text-primary">{selectedExercises.length}</span>
                </div>
                <div className={`p-2.5 rounded-2xl border ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
                  <span className="text-[10px] font-extrabold text-slate-900 dark:text-white block uppercase">Total Series</span>
                  <span className="text-base font-black text-primary">{totalSetsCount}</span>
                </div>
                <div className={`p-2.5 rounded-2xl border ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
                  <span className="text-[10px] font-extrabold text-slate-900 dark:text-white block uppercase">Duración</span>
                  <span className="text-base font-black text-primary">~{estimatedMinutes} m</span>
                </div>
              </div>

              {/* BARRA DE DISTRIBUCIÓN DE VOLUMEN POR MÚSCULO */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white block">
                  Volumen por Músculo (Series)
                </span>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {Object.entries(muscleVolumeStats).map(([muscle, count]) => {
                    const maxVal = Math.max(...Object.values(muscleVolumeStats), 1);
                    const pct = Math.min(100, Math.round((count / maxVal) * 100));

                    return (
                      <div key={muscle} className="space-y-0.5 text-xs">
                        <div className="flex items-center justify-between font-bold text-[11px]">
                          <span className="text-slate-900 dark:text-white">{muscle}</span>
                          <span className="font-mono text-primary">{count} series</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {Object.keys(muscleVolumeStats).length === 0 && (
                    <p className="text-[11px] text-slate-900 dark:text-white italic text-center py-2">
                      Agrega ejercicios para ver el desglose de volumen.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL DE DEMOSTRACIÓN TÉCNICA EN VÍDEO / GIF ANIMADO     */}
      {/* ========================================================= */}
      {videoDemoExercise && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          onClick={() => setVideoDemoExercise(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4 cursor-default ${
              darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  {videoDemoExercise.grupoMuscular}
                </span>
                <h3 className="text-base font-black mt-1">{videoDemoExercise.nombre}</h3>
              </div>
              <button
                type="button"
                onClick={() => setVideoDemoExercise(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* REPRODUCTOR TIPO MUSCLEWIKI VIDEO */}
            <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
              {videoDemoExercise.gifUrl ? (
                <img
                  src={videoDemoExercise.gifUrl}
                  alt={videoDemoExercise.nombre}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Dumbbell className="w-10 h-10 text-primary mx-auto" />
                  <p className="text-xs font-bold text-zinc-300">Demostración en Vivo</p>
                </div>
              )}
            </div>

            {/* INDICACIONES TÉCNICAS */}
            <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
              darkMode ? "bg-zinc-950/80 border-zinc-800 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700"
            }`}>
              <span className="font-extrabold uppercase tracking-wider text-primary block">
                Instrucciones de Ejecución
              </span>
              <p className="leading-relaxed">
                {videoDemoExercise.notasTecnica ||
                  "Mantén el control postural en todo el rango de movimiento. Inhala en la fase excéntrica y exhala durante la fase de máximo esfuerzo."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                handleAddExerciseToCanvas(videoDemoExercise);
                setVideoDemoExercise(null);
              }}
              className="w-full py-2.5 text-xs font-black rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Ejercicio a la Rutina</span>
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
