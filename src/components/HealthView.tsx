import { SubNav } from "./SubNav";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { UserProfileData } from "./UserSettingsModal";
import { generateUniqueId } from "../utils/id";
import { getLocalDateString } from "../utils/date";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { subscribeToCategory, saveItemToFirestore, deleteItemFromFirestore } from "../lib/firestoreSyncService";
import { addDeletedId, getDeletedIds } from "../lib/storage";
import { auth } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "../context/ToastContext";
import AnimatedList from "./AnimatedList";
import { PillFilterBar } from "./PillFilterBar";
import { ConfirmationModal } from "./ConfirmationModal";
import { calculateIngredientCalories, calcularNutricionPlato, getIngredientWeight, getIngredientNutriVal, getCalorieDensity } from "../lib/calories";
import { createPortal } from "react-dom";
import {
  Heart,
  Activity,
  Plus,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Pill,
  FileText,
  Clock,
  TrendingUp,
  Award,
  CheckCircle,
  HelpCircle,
  Search,
  Filter,
  Upload,
  Image as ImageIcon,
  Edit,
  ChevronDown,
  Calendar,
  Check,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  RefreshCw,
  Settings,
  Tag,
  Sparkles,
  Package,
  Flame,
  Footprints,
  Compass,
  FileCheck,
  Info,
  CalendarDays,
  CheckCircle2,
  Scale,
  Utensils,
  Loader2,
  Dumbbell,
  Droplets,
  Target,
  Zap,
} from "lucide-react";
import {
  Medication,
  BloodPressureLog,
  DoctorCard,
  MedicamentoDetallado,
  DisponibilidadMedicamento,
  MedicalRecord,
  DeporteActividad,
  RutinaGimnasio,
  RegistroEntrenamiento,
  AlimentacionLog,
  PlatoItem,
  OrganizacionSemanalItem,
  AlimentoItem,
  MercaderiaItem,
  TurnoCompromiso,
} from "../types";
import { SmartDateTimePicker } from "./SmartDateTimePicker";
import { StorageService } from "../lib/storage";
import { GymRutinaView } from "./GymRutinaView";
import { subscribeToSectionLinks, getLinkedPartnerInfo } from "../lib/sectionSharingService";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const activityMETs: Record<string, number> = {
  Caminata: 3.5,
  Correr: 9.8,
  Ciclismo: 7.5,
  "Ciclismo indoor / Spinning": 8.5,
  "Ciclismo de montaña": 8.5,
  Natación: 7.0,
  "Levantamiento de pesas": 3.0,
  "Gimnasio / Musculación": 3.5,
  Yoga: 2.5,
  Pilates: 3.0,
  Fútbol: 7.0,
  Básquetbol: 6.5,
  Tenis: 7.3,
  Pádel: 6.0,
  Voleibol: 4.0,
  "Danza / Baile": 5.0,
  Zumba: 6.8,
  CrossFit: 8.0,
  "Entrenamiento funcional": 7.0,
  Boxeo: 7.8,
  "Artes Marciales": 7.5,
  Escalada: 8.0,
  Remo: 7.0,
  "Saltar la cuerda": 11.0,
  Gimnasia: 4.0,
  Elíptica: 5.0,
  "Cinta de correr": 9.0,
  Aeróbicos: 7.3,
  Bádminton: 5.5,
  Béisbol: 5.0,
  Buceo: 7.0,
  Esquí: 7.0,
  "Esquí alpino": 5.0,
  Golf: 4.5,
  Hockey: 8.0,
  Judo: 10.0,
  Karate: 10.0,
  Kickboxing: 10.0,
  Patinaje: 7.0,
  Rugby: 8.3,
  Skateboarding: 5.0,
  Snowboard: 5.3,
  Surf: 3.0,
  "Tenis de mesa": 4.0,
  Trekking: 7.0,
  Senderismo: 6.0,
  "Patinaje en línea": 7.5,
  "Estiramiento / Stretching": 2.5,
  Otro: 5.0,
};

const distanceBasedActivities = [
  "Caminata",
  "Correr",
  "Ciclismo",
  "Natación",
  "Remo",
  "Cinta de correr",
  "Elíptica",
  "Ciclismo de montaña",
  "Esquí",
  "Patinaje",
  "Senderismo",
  "Trekking",
  "Patinaje en línea",
];

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
  darkMode?: boolean;
  previewTransform?: (label: string) => string;
  allowCustom?: boolean;
  onAddCustom?: (newValue: string) => void;
  customPlaceholder?: string;
  onRemoveOption?: (optionValue: string) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "-- Seleccionar --",
  disabled = false,
  className = "w-full",
  size = "md",
  icon,
  searchable = false,
  darkMode,
  previewTransform,
  allowCustom = false,
  onAddCustom,
  customPlaceholder,
  onRemoveOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    placeAbove: false,
  });

  const isDark =
    darkMode ??
    (typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  const updatePosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < 250 && rect.top > 250;
      const menuWidth = rect.width;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
      setCoords({
        top: placeAbove ? rect.top - 6 : rect.bottom + 6,
        left,
        width: menuWidth,
        placeAbove,
      });
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize, true);

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const clickedInsideTrigger = dropdownRef.current && dropdownRef.current.contains(target);
        const clickedInsideMenu = menuRef.current && menuRef.current.contains(target);
        if (!clickedInsideTrigger && !clickedInsideMenu) {
          setIsOpen(false);
          setIsCreatingCustom(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize, true);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const showSearch = searchable || allowCustom;

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedOption = options.find((opt) => opt.value === value);

  const exactMatchExists = options.some(
    (opt) =>
      opt.value.toLowerCase() === searchTerm.trim().toLowerCase() ||
      opt.label.toLowerCase() === searchTerm.trim().toLowerCase()
  );

  const handleCreateAndSelect = (valToCreate: string) => {
    const trimmed = valToCreate.trim();
    if (!trimmed) return;
    if (onAddCustom) {
      onAddCustom(trimmed);
    }
    onChange(trimmed);
    setIsOpen(false);
    setSearchTerm("");
    setIsCreatingCustom(false);
    setCustomInputValue("");
  };

  const displayLabel = selectedOption
    ? (previewTransform ? previewTransform(selectedOption.label) : selectedOption.label)
    : (value ? value : placeholder);

  return (
    <div ref={dropdownRef} className={`relative text-left min-w-0 max-w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
          setIsCreatingCustom(false);
        }}
        className={`w-full flex items-center justify-between font-medium transition-all focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-0 ${
          size === "sm"
            ? "px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold focus:border-primary"
            : "px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-zinc-800 text-black dark:text-white text-sm focus:border-primary"
        }`}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap min-w-0 overflow-hidden">
          {icon && (
            <span className="shrink-0 text-slate-400 dark:text-zinc-500">
              {icon}
            </span>
          )}
          <span
            data-custom-select-selected={!!selectedOption || !!value}
            className={`whitespace-nowrap truncate block ${
              selectedOption || value
                ? "font-bold text-black dark:text-white"
                : "text-slate-400 dark:text-zinc-500 font-normal"
            }`}
          >
            {displayLabel}
          </span>
        </span>
        <ChevronDown
          className={`shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${
            size === "sm" ? "w-3.5 h-3.5 ml-1" : "w-4 h-4 ml-2"
          }`}
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.placeAbove ? undefined : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-80 animate-fade-in"
          >
            {showSearch && (
              <div className="p-2 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md shrink-0 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder={customPlaceholder || (allowCustom ? "Buscar o escribir nuevo..." : "Buscar...")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-100/80 dark:bg-black/60 border border-slate-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-primary focus:bg-white dark:focus:bg-zinc-950 transition-all"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            <div className="overflow-y-auto overflow-x-hidden p-1.5 flex-1 max-h-[132px]">
              {allowCustom && searchTerm.trim() !== "" && !exactMatchExists && (
                <button
                  type="button"
                  onClick={() => handleCreateAndSelect(searchTerm)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors border border-dashed border-primary/40 my-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Añadir "{searchTerm.trim()}" como opción</span>
                </button>
              )}

              {filteredOptions.length === 0 && (!allowCustom || searchTerm.trim() === "") ? (
                <div className="px-3 py-3 text-xs text-slate-400 dark:text-zinc-500 text-center">
                  No hay opciones
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  const canRemove = onRemoveOption && opt.value !== "Todos";

                  return (
                    <div
                      key={opt.value}
                      className={`group relative flex items-center justify-between w-full font-semibold rounded-xl transition-colors border my-0.5 ${
                        isSelected
                          ? "bg-primary text-white dark:text-blue-950 font-bold shadow-xs border-primary"
                          : "text-black dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/80 border-transparent hover:border-primary/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                          setSearchTerm("");
                          setIsCreatingCustom(false);
                        }}
                        className="flex-1 flex items-center justify-between px-3 py-2 text-xs text-left cursor-pointer min-w-0"
                        style={!isSelected && !isDark ? { color: "#000000" } : undefined}
                      >
                        <span
                          className="truncate pr-2"
                          style={!isSelected && !isDark ? { color: "#000000" } : undefined}
                        >
                          {opt.label}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1.5" />}
                      </button>

                      {canRemove && (
                        <button
                          type="button"
                          title="Eliminar opción"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRemoveOption) {
                              onRemoveOption(opt.value);
                            }
                            if (opt.value === value) {
                              onChange("");
                            }
                          }}
                          className={`p-1.5 mr-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            isSelected
                              ? "text-white/80 hover:text-white hover:bg-white/20 dark:text-blue-950/80 dark:hover:bg-blue-950/20"
                              : "text-slate-400 hover:text-red-500 hover:bg-red-50 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-red-950/30"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              {allowCustom && (
                <div className="border-t border-slate-100 dark:border-zinc-800/60 mt-1 pt-1">
                  {!isCreatingCustom ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCreatingCustom(true);
                        setCustomInputValue("");
                      }}
                      className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>Escribir nueva opción manualmente...</span>
                    </button>
                  ) : (
                    <div className="p-2 flex flex-col gap-1.5 bg-slate-50 dark:bg-black/60 rounded-xl" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                        <span>Nueva opción</span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingCustom(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          value={customInputValue}
                          onChange={(e) => setCustomInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (customInputValue.trim()) {
                                handleCreateAndSelect(customInputValue);
                              }
                            }
                          }}
                          placeholder="Escribir nombre..."
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customInputValue.trim()) {
                              handleCreateAndSelect(customInputValue);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-primary text-white dark:text-blue-950 rounded-lg text-xs font-bold hover:bg-primary/90 shrink-0 cursor-pointer"
                        >
                          Añadir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

interface HealthViewProps {
  darkMode: boolean;
  token?: string;
  userEmail?: string;
  medications: Medication[];
  setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
  bpLogs: BloodPressureLog[];
  setBpLogs: React.Dispatch<React.SetStateAction<BloodPressureLog[]>>;
  doctors: DoctorCard[];
  setDoctors: React.Dispatch<React.SetStateAction<DoctorCard[]>>;
  medicamentosDetallados: MedicamentoDetallado[];
  setMedicamentosDetallados: React.Dispatch<
    React.SetStateAction<MedicamentoDetallado[]>
  >;
  disponibilidadMedicamentos?: DisponibilidadMedicamento[];
  setDisponibilidadMedicamentos?: React.Dispatch<
    React.SetStateAction<DisponibilidadMedicamento[]>
  >;
  deportesActividades?: DeporteActividad[];
  setDeportesActividades?: React.Dispatch<
    React.SetStateAction<DeporteActividad[]>
  >;
  rutinasGimnasio?: RutinaGimnasio[];
  setRutinasGimnasio?: React.Dispatch<
    React.SetStateAction<RutinaGimnasio[]>
  >;
  registrosEntrenamiento?: RegistroEntrenamiento[];
  setRegistrosEntrenamiento?: React.Dispatch<
    React.SetStateAction<RegistroEntrenamiento[]>
  >;
  medicalRecords?: MedicalRecord[];
  setMedicalRecords?: React.Dispatch<React.SetStateAction<MedicalRecord[]>>;
  alimentacionLogs?: AlimentacionLog[];
  setAlimentacionLogs?: React.Dispatch<React.SetStateAction<AlimentacionLog[]>>;
  alimentos?: AlimentoItem[];
  mercaderia?: MercaderiaItem[];
  platos?: PlatoItem[];
  organizacionSemanal?: OrganizacionSemanalItem[];
  turnosCompromisos?: TurnoCompromiso[];
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  userProfile?: UserProfileData | null;
  onUpdateUserProfile?: (updated: UserProfileData) => void;
  onOpenSettings?: () => void;
}

const compressImageIfNeeded = async (base64Str: string, maxSizeBytes = 600 * 1024): Promise<string> => {
  if (!base64Str || !base64Str.startsWith("data:image") || base64Str.length <= maxSizeBytes) {
    return base64Str;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const maxDim = 800;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.7;
      let compressed = canvas.toDataURL("image/jpeg", quality);
      while (compressed.length > maxSizeBytes && quality > 0.2) {
        quality -= 0.15;
        compressed = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(compressed);
    };
    img.onerror = () => resolve(base64Str);
  });
};

export default function HealthView({
  darkMode,
  token,
  userEmail,
  medications,
  setMedications,
  bpLogs,
  setBpLogs,
  doctors,
  setDoctors,
  medicamentosDetallados = [],
  setMedicamentosDetallados,
  disponibilidadMedicamentos = [],
  setDisponibilidadMedicamentos,
  deportesActividades = [],
  setDeportesActividades,
  rutinasGimnasio = [],
  setRutinasGimnasio,
  registrosEntrenamiento = [],
  setRegistrosEntrenamiento,
  medicalRecords = [],
  setMedicalRecords,
  alimentacionLogs = [],
  setAlimentacionLogs,
  alimentos = [],
  mercaderia = [],
  platos = [],
  organizacionSemanal = [],
  turnosCompromisos = [],
  activeSubTab: propActiveSubTab,
  onSubTabChange,
  userProfile,
  onUpdateUserProfile,
  onOpenSettings,
}: HealthViewProps) {
  const { showToast } = useToast();
  const [expandedDispId, setExpandedDispId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Scroll references and helpers for tab selection (Medicamentos)
  const medsScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollMedsTabsLeft = () => {
    const tabs = ["historial","stock"];
    const currentIndex = tabs.indexOf(medsActiveTab);
    if (currentIndex > 0) {
      setMedsActiveTab(tabs[currentIndex - 1] as any);
      if (medsScrollRef.current) {
        const buttons = medsScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const scrollMedsTabsRight = () => {
    const tabs = ["historial","stock"];
    const currentIndex = tabs.indexOf(medsActiveTab);
    if (currentIndex < tabs.length - 1) {
      setMedsActiveTab(tabs[currentIndex + 1] as any);
      if (medsScrollRef.current) {
        const buttons = medsScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  // Scroll references and helpers for tab selection (Control Clinico)
  const clinicoScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollClinicoTabsLeft = () => {
    const tabs = ["doctores","presion","estudios","medicamentos"];
    const currentIndex = tabs.indexOf(clinicoActiveTab);
    if (currentIndex > 0) {
      setClinicoActiveTab(tabs[currentIndex - 1] as any);
      if (clinicoScrollRef.current) {
        const buttons = clinicoScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const scrollClinicoTabsRight = () => {
    const tabs = ["doctores","presion","estudios","medicamentos"];
    const currentIndex = tabs.indexOf(clinicoActiveTab);
    if (currentIndex < tabs.length - 1) {
      setClinicoActiveTab(tabs[currentIndex + 1] as any);
      if (clinicoScrollRef.current) {
        const buttons = clinicoScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };
  const userId = (userEmail || auth.currentUser?.email || auth.currentUser?.uid || "hernanmaximiliano10@gmail.com").toLowerCase().trim();

  // --- ESTADOS Y HELPERS PARA CALENDARIO MÉDICO Y MEDICAMENTOS ---
  const [medicalCalendarDate, setMedicalCalendarDate] = useState<Date>(new Date());
  const [selectedMedicalDate, setSelectedMedicalDate] = useState<string | null>(null);
  const [medControlFilter, setMedControlFilter] = useState<"todos" | "comprar" | "receta" | "turnos">("todos");

  const MONTHS_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const WEEKDAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return "";
    const cleanDateStr = dateStr.split("T")[0].split(" ")[0];
    const parts = cleanDateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const dateObj = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2])
    );
    const dayOfWeekNames = [
      "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
    ];
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const dayOfWeek = dayOfWeekNames[dateObj.getDay()];
    const dayNum = parts[2];
    const monthName = monthNames[dateObj.getMonth()];
    const yearNum = parts[0];
    return `${dayOfWeek}, ${dayNum} de ${monthName} de ${yearNum}`;
  };

  // --- NUEVOS ESTADOS PARA SALUD METABÓLICA ---
  const [selectedActivityFactor, setSelectedActivityFactor] = useState<number>(1.2);
  const [selectedAlimDate, setSelectedAlimDate] = useState<Date | null>(null);
  const [selectedDiarioDate, setSelectedDiarioDate] = useState<Date | null>(null);

  

  

  


  const [metabolicProfile, setMetabolicProfile] = useState<{
    id: string;
    edad: number;
    altura: number;
    pesoActual: number;
    genero: "Masculino" | "Femenino";
    objetivo: "Bajar de Peso (Déficit)" | "Mantenimiento" | "Ganar Masa Muscular (Superávit)";
    cintura: number;
    cadera: number;
    cuello: number;
    factorActividad?: number;
  }>({
    id: "profile",
    edad: 28,
    altura: 175,
    pesoActual: 70,
    genero: "Masculino",
    objetivo: "Mantenimiento",
    cintura: 82,
    cadera: 94,
    cuello: 38,
    factorActividad: 1.2
  });

  const [hydrationLogs, setHydrationLogs] = useState<{ id: string; fecha: string; cantidadVasos: number }[]>([]);
  const [medidasHistory, setMedidasHistory] = useState<{ id: string; fecha: string; peso: number; cintura?: number; cadera?: number; cuello?: number; timestamp?: number; createdAt?: string }[]>([]);
  
  // Helper para ordenar por timestamp/fecha descendente (más reciente primero)
  const sortMedidasDesc = <T extends { fecha: string; timestamp?: number; createdAt?: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.fecha).getTime());
      const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.fecha).getTime());
      if (timeB !== timeA) return timeB - timeA;
      return b.fecha.localeCompare(a.fecha);
    });
  };

  const weekDaysCurrent = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
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

  const alimWeekData = useMemo(() => {
    const daysShort = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    return weekDaysCurrent.map((day, idx) => {
      let calories = 0;
      let hasActivity = false;
      
      const targetStr = day.getFullYear() + "-" + String(day.getMonth() + 1).padStart(2, "0") + "-" + String(day.getDate()).padStart(2, "0");

      alimentacionLogs.forEach((log) => {
        if (!log.fecha) return;
        if (log.fecha === targetStr) {
          hasActivity = true;
          calories += Number(log.calorias) || 0;
        }
      });
      
      return {
        dateObj: day,
        dayLabel: daysShort[idx],
        dayNumber: day.getDate(),
        calories,
        hasActivity
      };
    });
  }, [weekDaysCurrent, alimentacionLogs]);

  const diarioWeekData = useMemo(() => {
    const daysShort = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    return weekDaysCurrent.map((day, idx) => {
      let balanceNeto = 0;
      let hasActivity = false;
      const diaStr = day.getFullYear() + "-" + String(day.getMonth() + 1).padStart(2, "0") + "-" + String(day.getDate()).padStart(2, "0");

      const medidaDia = medidasHistory.find(m => m.fecha === diaStr);
      let consumo = 0;
      let gasto = 0;

      alimentacionLogs.forEach((l) => {
        if (l.fecha === diaStr) consumo += Number(l.calorias) || 0;
      });

      const deporteDia = (deportesActividades || [])
        .filter(a => a.fechaDesde.startsWith(diaStr))
        .reduce((acc, curr) => acc + (curr.calorias || 0), 0);
        
      const gymDia = (registrosEntrenamiento || [])
        .filter(r => r.fecha === diaStr)
        .reduce((acc, curr) => acc + (curr.caloriasTotalesSesion || 0), 0);
        
      let bmr = 0;
      const currentWeight = medidaDia?.peso || metabolicProfile.pesoActual;
      if (currentWeight > 0) {
        bmr = metabolicProfile.genero === "Masculino"
          ? 10 * currentWeight + 6.25 * metabolicProfile.altura - 5 * metabolicProfile.edad + 5
          : 10 * currentWeight + 6.25 * metabolicProfile.altura - 5 * metabolicProfile.edad - 161;
      }
      
      const tdee = bmr * selectedActivityFactor;
      gasto = tdee + deporteDia + gymDia;

      balanceNeto = consumo - gasto;
      if (consumo > 0 || deporteDia > 0 || gymDia > 0) hasActivity = true;

      return {
        dateObj: day,
        dayLabel: daysShort[idx],
        dayNumber: day.getDate(),
        balance: balanceNeto,
        hasActivity
      };
    });
  }, [weekDaysCurrent, alimentacionLogs, medidasHistory, metabolicProfile, selectedActivityFactor, deportesActividades, registrosEntrenamiento]);

  // Estado y datos semanales para Registro de Hidratación
  const [selectedHydrationDate, setSelectedHydrationDate] = useState<string>(getLocalDateString(new Date()));

  const hydrationWeekData = useMemo(() => {
    const daysShort = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
    const META_VASOS = 10;
    const todayStr = getLocalDateString(new Date());

    return weekDaysCurrent.map((day, idx) => {
      const targetStr = getLocalDateString(day);
      const log = hydrationLogs.find((l) => l.fecha === targetStr);
      const cantidad = log ? log.cantidadVasos : 0;
      const isCompleted = cantidad >= META_VASOS;
      const isToday = targetStr === todayStr;
      const pct = Math.min(100, Math.round((cantidad / META_VASOS) * 100));

      return {
        dateObj: day,
        dateStr: targetStr,
        dayLabel: daysShort[idx],
        dayNumber: day.getDate(),
        cantidad,
        meta: META_VASOS,
        isCompleted,
        isToday,
        pct,
      };
    });
  }, [weekDaysCurrent, hydrationLogs]);

  const completedHydrationDaysCount = useMemo(() => {
    return hydrationWeekData.filter((d) => d.isCompleted).length;
  }, [hydrationWeekData]);

  // 3. Estado Global REAL (Ajustes & Configuración de Usuario > Salud y Datos Físicos)
  const realProfileData = userProfile || (typeof window !== "undefined" ? (() => {
    try {
      const saved = localStorage.getItem("liquid_user_profile");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })() : null) || {};

  const edad = realProfileData.age !== undefined && realProfileData.age !== "" 
    ? Number(realProfileData.age) 
    : (metabolicProfile.edad || 28);

  const altura = realProfileData.heightCm !== undefined && realProfileData.heightCm !== "" 
    ? Number(realProfileData.heightCm) 
    : (metabolicProfile.altura || 175);

  const genero = realProfileData.gender || metabolicProfile.genero || "Masculino";

  const pesoConfiguracion = realProfileData.weightKg !== undefined && realProfileData.weightKg !== "" 
    ? Number(realProfileData.weightKg) 
    : (metabolicProfile.pesoActual || 70);

  // 4. Lógica Estricta para el Peso (currentWeight) - Registro más reciente por timestamp/fecha
  const currentWeight = (medidasHistory && medidasHistory.length > 0)
    ? sortMedidasDesc(medidasHistory)[0].peso
    : pesoConfiguracion;
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMedidasModal, setShowMedidasModal] = useState(false);
  const [editingMedidaId, setEditingMedidaId] = useState<string | null>(null);
  const [medidasPage, setMedidasPage] = useState(1);

  // Form states for profile editing
  const [profEdad, setProfEdad] = useState(28);
  const [profAltura, setProfAltura] = useState(175);
  const [profPeso, setProfPeso] = useState(70);
  const [profGenero, setProfGenero] = useState<"Masculino" | "Femenino">("Masculino");
  const [profObjetivo, setProfObjetivo] = useState<"Bajar de Peso (Déficit)" | "Mantenimiento" | "Ganar Masa Muscular (Superávit)">("Mantenimiento");

  // Form states for measurements
  const [medFecha, setMedFecha] = useState("");
  const [medPeso, setMedPeso] = useState(70);
  const [medCintura, setMedCintura] = useState<number | "">("");
  const [medCadera, setMedCadera] = useState<number | "">("");
  const [medCuello, setMedCuello] = useState<number | "">("");

  // Cargar de LocalStorage al iniciar (como fallback/inicializador rápido)
  useEffect(() => {
    const cachedProfile = localStorage.getItem(`metabolic_profile_${userId}`);
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        setMetabolicProfile(parsed);
        if (parsed && parsed.factorActividad) {
          setSelectedActivityFactor(parsed.factorActividad);
        }
      } catch (_) {}
    }
    const cachedHydration = localStorage.getItem(`hydration_logs_${userId}`);
    if (cachedHydration) {
      try { setHydrationLogs(JSON.parse(cachedHydration)); } catch (_) {}
    }
    const cachedMedidas = localStorage.getItem(`medidas_history_${userId}`);
    if (cachedMedidas) {
      try { setMedidasHistory(JSON.parse(cachedMedidas)); } catch (_) {}
    }
  }, [userId]);

  // Seeding inicial si está vacío, para una experiencia "Show working application instantly"
  const seededRef = useRef(false);
  useEffect(() => {
    if (userId && !seededRef.current) {
      seededRef.current = true;
      const seedKey = `medidas_history_seeded_${userId}`;
      const isAlreadySeeded = localStorage.getItem(seedKey);
      if (!isAlreadySeeded) {
        setTimeout(() => {
          // Inicializar peso/medidas si están vacíos
          const localMedidasStr = localStorage.getItem(`medidas_history_${userId}`);
          const localMedidas = localMedidasStr ? JSON.parse(localMedidasStr) : [];
          if (localMedidas.length === 0) {
            const hoy = new Date();
            const seedEntries = [
              { id: "seed_1", fecha: new Date(hoy.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), peso: 71.5, cintura: 83, cadera: 95, cuello: 38, timestamp: hoy.getTime() - 4 * 24 * 60 * 60 * 1000 },
              { id: "seed_2", fecha: new Date(hoy.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), peso: 71.1, cintura: 82.5, cadera: 94.5, cuello: 38, timestamp: hoy.getTime() - 3 * 24 * 60 * 60 * 1000 },
              { id: "seed_3", fecha: new Date(hoy.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), peso: 70.7, cintura: 82, cadera: 94, cuello: 38, timestamp: hoy.getTime() - 2 * 24 * 60 * 60 * 1000 },
              { id: "seed_4", fecha: new Date(hoy.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), peso: 70.3, cintura: 82, cadera: 94, cuello: 38, timestamp: hoy.getTime() - 1 * 24 * 60 * 60 * 1000 },
              { id: "seed_5", fecha: new Date().toISOString().substring(0, 10), peso: 70.0, cintura: 82, cadera: 94, cuello: 38, timestamp: hoy.getTime() },
            ];
            seedEntries.forEach(entry => {
              saveItemToFirestore(userId, "medidas_history", entry).catch(() => {});
            });
            setMedidasHistory(sortMedidasDesc(seedEntries));
            localStorage.setItem(`medidas_history_${userId}`, JSON.stringify(seedEntries));
          }
          localStorage.setItem(seedKey, "true");

          const localHydStr = localStorage.getItem(`hydration_logs_${userId}`);
          const localHyd = localHydStr ? JSON.parse(localHydStr) : [];
          if (localHyd.length === 0) {
            const hoy = new Date();
            const ayerStr = getLocalDateString(new Date(hoy.getTime() - 1 * 24 * 60 * 60 * 1000));
            const anteAyerStr = getLocalDateString(new Date(hoy.getTime() - 2 * 24 * 60 * 60 * 1000));
            const seedHydLogs = [
              { id: `hydration_${anteAyerStr}`, fecha: anteAyerStr, cantidadVasos: 10 },
              { id: `hydration_${ayerStr}`, fecha: ayerStr, cantidadVasos: 10 }
            ];
            seedHydLogs.forEach(entry => {
              saveItemToFirestore(userId, "hydration_logs", entry).catch(() => {});
            });
            setHydrationLogs(seedHydLogs);
            localStorage.setItem(`hydration_logs_${userId}`, JSON.stringify(seedHydLogs));
          }
        }, 1500);
      }
    }
  }, [userId]);

  // Section sharing info state for Control Clínico
  const [clinicoPartnerInfo, setClinicoPartnerInfo] = useState<{ isLinked: boolean; partnerEmail: string | null; isOwner: boolean }>({
    isLinked: false,
    partnerEmail: null,
    isOwner: false,
  });

  useEffect(() => {
    const activeUserId = (userEmail || auth.currentUser?.email || auth.currentUser?.uid || "hernanmaximiliano10@gmail.com").toLowerCase().trim();
    const unsub = subscribeToSectionLinks(activeUserId, (data) => {
      setClinicoPartnerInfo(getLinkedPartnerInfo(activeUserId, "control_clinico", data.active));
    });
    return () => {
      try { unsub(); } catch (_) {}
    };
  }, [userEmail]);

  // Real-time local subscription for HealthView categories with strict unmount cleanup
  useEffect(() => {
    const activeUserId = (userEmail || auth.currentUser?.email || auth.currentUser?.uid || "hernanmaximiliano10@gmail.com").toLowerCase().trim();
    const unsubs = [
      subscribeToCategory(activeUserId, "medications", (items) => setMedications?.(items)),
      subscribeToCategory(activeUserId, "blood_pressure", (items) => setBpLogs?.(items)),
      subscribeToCategory(activeUserId, "doctors", (items) => setDoctors?.(items)),
      subscribeToCategory(activeUserId, "medicamentos_detallados", (items) => setMedicamentosDetallados?.(items)),
      subscribeToCategory(activeUserId, "disponibilidad_medicamentos", (items) => setDisponibilidadMedicamentos?.(items)),
      subscribeToCategory(activeUserId, "deportes_actividades", (items) => setDeportesActividades?.(items)),
      subscribeToCategory(activeUserId, "rutinas_gimnasio", (items) => setRutinasGimnasio?.(items)),
      subscribeToCategory(activeUserId, "registros_entrenamiento", (items) => setRegistrosEntrenamiento?.(items)),
      subscribeToCategory(activeUserId, "medical_records", (items) => setMedicalRecords?.(items)),
      subscribeToCategory(activeUserId, "alimentacion_logs", (items) => setAlimentacionLogs?.(items)),
      subscribeToCategory(activeUserId, "metabolic_profile", (items) => {
        if (items && items.length > 0) {
          const p = items.find(i => i.id === "profile") || items[0];
          if (p) {
            setMetabolicProfile(p as any);
            if (p.factorActividad) {
              setSelectedActivityFactor(p.factorActividad);
            }
            localStorage.setItem(`metabolic_profile_${activeUserId}`, JSON.stringify(p));
          }
        }
      }),
      subscribeToCategory(activeUserId, "hydration_logs", (items) => {
        if (items) {
          setHydrationLogs(items);
          localStorage.setItem(`hydration_logs_${activeUserId}`, JSON.stringify(items));
        }
      }),
      subscribeToCategory(activeUserId, "medidas_history", (items) => {
        if (items) {
          const deleted = getDeletedIds();
          const valid = (items as typeof medidasHistory).filter(m => !deleted.has(String(m.id)));
          const sorted = sortMedidasDesc(valid);
          setMedidasHistory(sorted);
          localStorage.setItem(`medidas_history_${activeUserId}`, JSON.stringify(sorted));
        }
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => {
        try { unsub(); } catch (_) {}
      });
    };
  }, [userEmail]);

  // --- MÉTODOS SALUD METABÓLICA ---
  const handleSaveMetabolicProfile = async (newProfile: typeof metabolicProfile) => {
    try {
      await saveItemToFirestore(userId, "metabolic_profile", newProfile);
      setMetabolicProfile(newProfile);
      if (newProfile.factorActividad) {
        setSelectedActivityFactor(newProfile.factorActividad);
      }
      localStorage.setItem(`metabolic_profile_${userId}`, JSON.stringify(newProfile));
      showToast("Perfil metabólico guardado con éxito", "success");
    } catch (e: any) {
      console.error(e);
      setMetabolicProfile(newProfile);
      if (newProfile.factorActividad) {
        setSelectedActivityFactor(newProfile.factorActividad);
      }
      localStorage.setItem(`metabolic_profile_${userId}`, JSON.stringify(newProfile));
      showToast("Perfil guardado localmente", "success");
    }
  };

  const handleSaveHydrationLog = async (fecha: string, cantidadVasos: number) => {
    const id = `hydration_${fecha}`;
    const log = { id, fecha, cantidadVasos };
    try {
      await saveItemToFirestore(userId, "hydration_logs", log);
      setHydrationLogs(prev => {
        const exists = prev.some(l => l.id === id);
        const updated = exists ? prev.map(l => l.id === id ? log : l) : [log, ...prev];
        localStorage.setItem(`hydration_logs_${userId}`, JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error(e);
      setHydrationLogs(prev => {
        const exists = prev.some(l => l.id === id);
        const updated = exists ? prev.map(l => l.id === id ? log : l) : [log, ...prev];
        localStorage.setItem(`hydration_logs_${userId}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleSaveMedidas = async (nuevaMedida: typeof medidasHistory[0]) => {
    try {
      await saveItemToFirestore(userId, "medidas_history", nuevaMedida);
      
      let updatedHistory: typeof medidasHistory = [];
      setMedidasHistory(prev => {
        const exists = prev.some(m => m.id === nuevaMedida.id);
        const updated = exists ? prev.map(m => m.id === nuevaMedida.id ? nuevaMedida : m) : [nuevaMedida, ...prev];
        updatedHistory = sortMedidasDesc(updated);
        localStorage.setItem(`medidas_history_${userId}`, JSON.stringify(updatedHistory));
        return updatedHistory;
      });

      // Si es la medición más reciente en el historial ordenado
      const isMostRecent = updatedHistory.length > 0 && updatedHistory[0].id === nuevaMedida.id;

      if (isMostRecent) {
        const updatedProfile = {
          ...metabolicProfile,
          pesoActual: nuevaMedida.peso,
          cintura: nuevaMedida.cintura || metabolicProfile.cintura,
          cadera: nuevaMedida.cadera || metabolicProfile.cadera,
          cuello: nuevaMedida.cuello || metabolicProfile.cuello,
        };
        await saveItemToFirestore(userId, "metabolic_profile", updatedProfile);
        setMetabolicProfile(updatedProfile);
        localStorage.setItem(`metabolic_profile_${userId}`, JSON.stringify(updatedProfile));
      }

      showToast("Medición corporal guardada con éxito", "success");
    } catch (e: any) {
      console.error(e);
      showToast("Error al guardar la medición", "error");
    }
  };

  const handleDeleteMedida = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro de peso y medidas corporales?",
      async () => {
        try {
          addDeletedId(id);
          await deleteItemFromFirestore(userId, "medidas_history", id);
          
          let updatedList: typeof medidasHistory = [];
          setMedidasHistory((prev) => {
            const updated = prev.filter((m) => String(m.id) !== String(id));
            updatedList = sortMedidasDesc(updated);
            localStorage.setItem(`medidas_history_${userId}`, JSON.stringify(updatedList));
            return updatedList;
          });

          // Actualizar el perfil metabólico con la medición más reciente restante
          if (updatedList.length > 0) {
            const nextRecent = updatedList[0];
            const updatedProfile = {
              ...metabolicProfile,
              pesoActual: nextRecent.peso,
              cintura: nextRecent.cintura || metabolicProfile.cintura,
              cadera: nextRecent.cadera || metabolicProfile.cadera,
              cuello: nextRecent.cuello || metabolicProfile.cuello,
            };
            await saveItemToFirestore(userId, "metabolic_profile", updatedProfile).catch(() => {});
            setMetabolicProfile(updatedProfile);
            localStorage.setItem(`metabolic_profile_${userId}`, JSON.stringify(updatedProfile));
          } else {
            const updatedProfile = {
              ...metabolicProfile,
              pesoActual: pesoConfiguracion,
            };
            await saveItemToFirestore(userId, "metabolic_profile", updatedProfile).catch(() => {});
            setMetabolicProfile(updatedProfile);
            localStorage.setItem(`metabolic_profile_${userId}`, JSON.stringify(updatedProfile));
          }

          showToast("Medición eliminada con éxito", "success");
        } catch (error: any) {
          console.error(error);
          showToast("Error al eliminar medición", "error");
        }
      }
    );
  };

  const handleEditMedida = (m: typeof medidasHistory[0]) => {
    setEditingMedidaId(m.id);
    setMedFecha(m.fecha);
    setMedPeso(m.peso);
    setMedCintura(m.cintura ?? "");
    setMedCadera(m.cadera ?? "");
    setMedCuello(m.cuello ?? "");
    setShowMedidasModal(true);
  };
  // Helper to calculate Disponibilidad details and status
  const calculateDispDetails = (disp: DisponibilidadMedicamento) => {
    const med = medicamentosDetallados.find((m) => m.id === disp.medicamentoId);
    if (!med) {
      return {
        marca: "Medicamento no encontrado",
        droga: "",
        consumoDiario: 0,
        cantidad: 0,
        funcionTratamiento: "Sin Informacion",
        diasPasados: 0,
        cantidadDisponible: 0,
        disponibleParaDias: 0,
        disponibleHasta: disp.fechaRegistro,
        estado: "Sin Informacion",
      };
    }

    const cd = med.consumoDiario || 1; // avoid division by zero
    const cant = med.cantidad || 0;
    const cantReg = disp.cantidadRegistrada || 0;

    // Parse date safely in local time without UTC offset day shifts
    const parseLocalDate = (dateStr: string) => {
      if (!dateStr) return new Date();
      const clean = dateStr.split("T")[0];
      const parts = clean.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
      }
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Days transcurridos since registration
    const regDate = parseLocalDate(disp.fechaRegistro);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - regDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const diasPasados = diffDays < 0 ? 0 : diffDays;

    // Formula: "Cantidad Disponible": "Cantidad Registrada" - (Consumo Diario * Días transcurridos desde el registro)
    let cantidadDisponible = cantReg - cd * diasPasados;
    if (cantidadDisponible < 0) {
      cantidadDisponible = 0;
    }

    // Disponible Para: "Cantidad Disponible" / "Consumo Diario" in Days
    const disponibleParaDias = cd > 0 ? cantidadDisponible / cd : 0;

    // Disponible Hasta: baseDate + disponibleParaDias (days)
    // If today is before registration date, start counting from registration date. Otherwise from today.
    const baseDate = today.getTime() > regDate.getTime() ? new Date(today) : new Date(regDate);
    baseDate.setDate(baseDate.getDate() + Math.max(0, Math.floor(disponibleParaDias)));
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, "0");
    const day = String(baseDate.getDate()).padStart(2, "0");
    const disponibleHasta = `${y}-${m}-${day}`;

    // Estado logic
    let estado = "Sin Informacion";
    if (disp.receta) {
      estado = "Con Receta";
    } else {
      if (disponibleParaDias > 14) {
        estado = "Con Medicacion";
      } else if (disponibleParaDias <= 14 && disponibleParaDias >= 7) {
        estado = "Pedir Receta";
      } else if (disponibleParaDias < 7) {
        estado = "Comprar Medicamento";
      }
    }

    return {
      marca: med.marca,
      droga: med.droga,
      consumoDiario: cd,
      cantidad: cant,
      funcionTratamiento: med.funcionTratamiento || "Quimioterapia",
      diasPasados,
      cantidadDisponible,
      disponibleParaDias,
      disponibleHasta,
      estado,
    };
  };

  // Add Medication State
  const [showAddMed, setShowAddMed] = useState(false);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFreq, setMedFreq] = useState("");
  const [medTime, setMedTime] = useState("");

  // Add BP Log State
  const [showAddBp, setShowAddBp] = useState(false);
  const [bpSys, setBpSys] = useState<number>(120);
  const [bpDia, setBpDia] = useState<number>(80);
  const [bpPulse, setBpPulse] = useState<number>(72);
  const [bpNotes, setBpNotes] = useState("");
  const [bpDate, setBpDate] = useState<string>("");

  // Add Doctor State
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docName, setDocName] = useState("");
  const [docSpecialty, setDocSpecialty] = useState("");
  const [docPhone, setDocPhone] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docAddress, setDocAddress] = useState("");

  // Submenu Tab State
  const [localActiveSubTab, setLocalActiveSubTab] = useState<
    | "resumen"
    | "medicamentos"
    | "disponibilidad"
    | "doctores"
    | "presion"
    | "estudios"
    | "deportes"
    | "alimentacion"
    | "control_clinico"
    | "deporte_alimentacion"
  >("resumen");
  const rawActiveSubTab = (propActiveSubTab as any) || localActiveSubTab;
  const activeSubTab = (rawActiveSubTab === "disponibilidad" || rawActiveSubTab === "medicamentos")
    ? "control_clinico"
    : (rawActiveSubTab === "deportes" || rawActiveSubTab === "alimentacion")
      ? "deporte_alimentacion"
      : rawActiveSubTab;
  const setActiveSubTab = (tab: any) => {
    const targetTab = tab === "disponibilidad"
      ? "medicamentos"
      : (tab === "deportes" || tab === "alimentacion")
        ? "deporte_alimentacion"
        : tab;
    if (onSubTabChange) onSubTabChange(targetTab);
    setLocalActiveSubTab(targetTab);
  };

  const [clinicoActiveTab, setClinicoActiveTab] = useState<"doctores" | "estudios" | "presion" | "medicamentos">("doctores");

  const [medsActiveTab, setMedsActiveTab] = useState<"historial" | "stock">("historial");
  const [deporteAlimActiveTab, setDeporteAlimActiveTab] = useState<"rutina" | "alimentacion" | "registro_diario">("rutina");

  const deporteAlimScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollDeporteAlimTabsLeft = () => {
    const tabs = ["rutina","alimentacion","registro_diario"];
    const currentIndex = tabs.indexOf(deporteAlimActiveTab);
    if (currentIndex > 0) {
      setDeporteAlimActiveTab(tabs[currentIndex - 1] as any);
      if (deporteAlimScrollRef.current) {
        const buttons = deporteAlimScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const scrollDeporteAlimTabsRight = () => {
    const tabs = ["rutina","alimentacion","registro_diario"];
    const currentIndex = tabs.indexOf(deporteAlimActiveTab);
    if (currentIndex < tabs.length - 1) {
      setDeporteAlimActiveTab(tabs[currentIndex + 1] as any);
      if (deporteAlimScrollRef.current) {
        const buttons = deporteAlimScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const lastSubTabRef = useRef<string | null>(null);

  useEffect(() => {
    if (rawActiveSubTab !== lastSubTabRef.current) {
      if (rawActiveSubTab === "disponibilidad") {
        setClinicoActiveTab("medicamentos");
        setMedsActiveTab("stock");
      } else if (rawActiveSubTab === "medicamentos") {
        setClinicoActiveTab("medicamentos");
        setMedsActiveTab("historial");
      } else if (rawActiveSubTab === "doctores") {
        setClinicoActiveTab("doctores");
      } else if (rawActiveSubTab === "presion") {
        setClinicoActiveTab("presion");
      } else if (rawActiveSubTab === "estudios") {
        setClinicoActiveTab("estudios");
      } else if (rawActiveSubTab === "deportes") {
        setDeporteAlimActiveTab("rutina");
      } else if (rawActiveSubTab === "alimentacion") {
        setDeporteAlimActiveTab("alimentacion");
      }
      lastSubTabRef.current = rawActiveSubTab;
    }
  }, [rawActiveSubTab]);

  useEffect(() => {
    if (propActiveSubTab) {
      setLocalActiveSubTab(propActiveSubTab as any);
    }
  }, [propActiveSubTab]);

  const [activeDetailItem, setActiveDetailItem] = useState<{
    disp: DisponibilidadMedicamento;
    details: any;
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmModal({ title, message, onConfirm });
  };

  // Alimentacion States
  const [showAlimModal, setShowAlimModal] = useState(false);
  const [editingAlimLog, setEditingAlimLog] = useState<AlimentacionLog | null>(
    null,
  );
  const [alimFecha, setAlimFecha] = useState("");
  const [alimEstado, setAlimEstado] = useState<
    "Desayuno" | "Almuerzo" | "Merienda" | "Cena"
  >("Desayuno");
  const [alimPlatoId, setAlimPlatoId] = useState("");
  // alim logic inserted here
  const [alimCalorias, setAlimCalorias] = useState<number | "">("");
  const [alimCantidades, setAlimCantidades] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    if (alimPlatoId && platos && alimentos && !editingAlimLog) {
      const plato = platos.find((p) => p.id === alimPlatoId);
      if (plato) {
        const initialCantidades: Record<string, number> = {};
        const addAlimentoIngredients = (alimentoId?: string) => {
          if (!alimentoId) return;
          const ali = alimentos.find((a) => a.id === alimentoId);
          if (!ali) return;
          if (ali.ingrediente1 && ali.cantidad1 !== undefined) {
            const unit = mercaderia?.find((m) => m.ingredientes === ali.ingrediente1)?.unidadMedida || ali.unidad1 || "Gr.";
            initialCantidades[ali.ingrediente1] = getIngredientWeight(ali.ingrediente1, ali.cantidad1, unit);
          }
          if (ali.ingrediente2 && ali.cantidad2 !== undefined) {
            const unit = mercaderia?.find((m) => m.ingredientes === ali.ingrediente2)?.unidadMedida || ali.unidad2 || "Gr.";
            initialCantidades[ali.ingrediente2] = getIngredientWeight(ali.ingrediente2, ali.cantidad2, unit);
          }
          if (ali.ingrediente3 && ali.cantidad3 !== undefined) {
            const unit = mercaderia?.find((m) => m.ingredientes === ali.ingrediente3)?.unidadMedida || ali.unidad3 || "Gr.";
            initialCantidades[ali.ingrediente3] = getIngredientWeight(ali.ingrediente3, ali.cantidad3, unit);
          }
        };
        addAlimentoIngredients(plato.alimentoId1);
        addAlimentoIngredients(plato.alimentoId2);
        addAlimentoIngredients(plato.alimentoId3);
        setAlimCantidades(initialCantidades);
      } else {
        setAlimCantidades({});
      }
    }
  }, [alimPlatoId, platos, alimentos, editingAlimLog, mercaderia]);

  useEffect(() => {
    if (mercaderia && Object.keys(alimCantidades).length > 0) {
      let total = 0;
      Object.entries(alimCantidades).forEach(
        ([ingrediente, cantidad]: [string, any]) => {
          const item = mercaderia.find((m) => m.ingredientes === ingrediente);
          const baseCal = item ? (item.calorias !== undefined && item.calorias !== null ? item.calorias : getCalorieDensity(item.ingredientes, item.categoria, item.sector)) : 0;
          total += (cantidad / 100) * baseCal;
        },
      );
      setAlimCalorias(Math.round(total));
    } else {
      setAlimCalorias("");
    }
  }, [alimCantidades, mercaderia]);

  // Internaciones, Consultas y Estudios States
  // Auto-fill plato del dia
  useEffect(() => {
    if (alimFecha && organizacionSemanal) {
      const todayPlatoId = organizacionSemanal.find(
        (o) => o.fecha === alimFecha.split("T")[0],
      )?.platoId;
      if (todayPlatoId) {
        if (alimEstado === "Almuerzo" || alimEstado === "Cena") {
          setAlimPlatoId(todayPlatoId);
        } else {
          const alreadyLoaded = alimentacionLogs?.find(
            (l) => l.fecha === alimFecha && l.platoId === todayPlatoId,
          );
          if (!alreadyLoaded) {
            setAlimPlatoId(todayPlatoId);
          }
        }
      } else {
        setAlimPlatoId("");
      }
    }
  }, [alimFecha, alimEstado, organizacionSemanal, alimentacionLogs]);

  const handleOpenAlimModal = () => {
    setEditingAlimLog(null);
    setAlimFecha(new Date().toISOString().substring(0, 10));
    setAlimEstado("Desayuno");
    setAlimPlatoId("");
    setAlimCantidades({});
    setShowAlimModal(true);
  };

  const handleEditAlimLog = (log: AlimentacionLog) => {
    setEditingAlimLog(log);
    setAlimFecha(log.fecha);
    setAlimEstado(log.estado);
    setAlimPlatoId(log.platoId);
    if (log.ingredientesConsumidos) {
      const cants: Record<string, number> = {};
      log.ingredientesConsumidos.forEach((i) => {
        cants[i.ingrediente] = i.cantidad;
      });
      setAlimCantidades(cants);
    } else {
      setAlimCantidades({});
    }
    setAlimCalorias(log.calorias);
    setShowAlimModal(true);
  };

  const handleSaveAlimLog = async () => {
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }

      if (!alimFecha || !alimEstado || !alimPlatoId) {
        alert("Por favor completa los campos requeridos.");
        return;
      }

      const ingredientesConsumidos: {
        ingrediente: string;
        cantidad: number;
        unidad: string;
        calorias: number;
      }[] = [];

      const valoresNutricionales = {
        proteinas: 0,
        carbohidratos: 0,
        grasas: 0,
        azucares: 0,
        fibra: 0,
        sodio: 0,
      };

      const plato = platos?.find((p) => p.id === alimPlatoId);
      if (plato) {
        const extract = (aId?: string) => {
          if (!aId) return;
          const ali = alimentos?.find((a) => a.id === aId);
          if (!ali) return;
          
          const processIngredient = (ingrediente: string | undefined, defaultUnit: string) => {
            if (!ingrediente) return;
            const item = mercaderia?.find(m => m.ingredientes === ingrediente);
            const baseCal = item ? (item.calorias !== undefined && item.calorias !== null ? item.calorias : getCalorieDensity(item.ingredientes, item.categoria, item.sector)) : 0;
            const grams = alimCantidades[ingrediente] || 0;
            const calorias = Math.round((grams / 100) * baseCal);
            
            ingredientesConsumidos.push({
              ingrediente,
              cantidad: grams,
              unidad: "Gr.",
              calorias,
            });

            // Recalculate macros
            const baseNutri = getIngredientNutriVal(ingrediente, mercaderia || []);
            const factor = grams / 100;
            valoresNutricionales.proteinas += baseNutri.proteinas * factor;
            valoresNutricionales.carbohidratos += baseNutri.carbohidratos * factor;
            valoresNutricionales.grasas += baseNutri.grasas * factor;
            valoresNutricionales.azucares += baseNutri.azucares * factor;
            valoresNutricionales.fibra += baseNutri.fibra * factor;
            valoresNutricionales.sodio += baseNutri.sodio * factor;
          };

          processIngredient(ali.ingrediente1, ali.unidad1 || "Gr.");
          processIngredient(ali.ingrediente2, ali.unidad2 || "Gr.");
          processIngredient(ali.ingrediente3, ali.unidad3 || "Gr.");
        };
        
        extract(plato.alimentoId1);
        extract(plato.alimentoId2);
        extract(plato.alimentoId3);
      }

      // Round the final values
      valoresNutricionales.proteinas = Math.round(valoresNutricionales.proteinas * 10) / 10;
      valoresNutricionales.carbohidratos = Math.round(valoresNutricionales.carbohidratos * 10) / 10;
      valoresNutricionales.grasas = Math.round(valoresNutricionales.grasas * 10) / 10;
      valoresNutricionales.azucares = Math.round(valoresNutricionales.azucares * 10) / 10;
      valoresNutricionales.fibra = Math.round(valoresNutricionales.fibra * 10) / 10;
      valoresNutricionales.sodio = Math.round(valoresNutricionales.sodio);

      let totalCal = 0;
      ingredientesConsumidos.forEach((ing) => {
        totalCal += ing.calorias;
      });
      const finalCalorias = Math.round(totalCal);

      const newLog: AlimentacionLog = {
        id: editingAlimLog?.id || generateUniqueId("alim"),
        fecha: alimFecha || new Date().toISOString().substring(0, 10),
        estado: alimEstado || "Almuerzo",
        platoId: alimPlatoId || "",
        calorias: finalCalorias,
        ingredientesConsumidos,
        valoresNutricionales,
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...newLog });
      await saveItemToFirestore(userId, "alimentacion_logs", newLog);
      setAlimentacionLogs((prev) => {
        const exists = prev.some((l) => l.id === newLog.id);
        if (exists) return prev.map((l) => (l.id === newLog.id ? newLog : l));
        return [newLog, ...prev];
      });
      showToast("Alimentación guardada", "success");
      setShowAlimModal(false);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAlimLog = (id: string) => {
    if (!userId) {
      alert("Error: Usuario no identificado");
      return;
    }
    askConfirmation(
      "Confirmar Eliminación",
      "¿Seguro que desea eliminar este registro de alimentación?",
      async () => {
        setIsDeleting(true);
        try {
          await deleteItemFromFirestore(userId, "alimentacion_logs", id);
          setAlimentacionLogs((prev) => prev.filter((l) => l.id !== id));
          showToast("Registro de alimentación eliminado", "success");
        } catch (error: any) {
          alert("Error de Firebase: " + (error?.message || error));
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const [showEstudioModal, setShowEstudioModal] = useState(false);
  const [editingEstudio, setEditingEstudio] = useState<MedicalRecord | null>(
    null,
  );

  // Form fields
  const [estudioPatient, setEstudioPatient] = useState<
    "Hernan" | "Modesto" | "Jessica" | "Gladys"
  >("Hernan");
  const [estudioInfo, setEstudioInfo] = useState("");
  const [estudioType, setEstudioType] = useState<
    "Internacion" | "Cirugia" | "Radioterapia" | "Estudio y/o Analisis"
  >("Estudio y/o Analisis");
  const [estudioLocation, setEstudioLocation] = useState<
    "Sanatorio San Juan" | "CIMAC" | "Pilar del Oeste"
  >("Sanatorio San Juan");
  const [estudioDoctorId, setEstudioDoctorId] = useState("");
  const [estudioFileName, setEstudioFileName] = useState("");
  const [estudioFileData, setEstudioFileData] = useState("");
  const [estudioStudyDate, setEstudioStudyDate] = useState("");
  const [estudioEntryDate, setEstudioEntryDate] = useState("");
  const [estudioExitDate, setEstudioExitDate] = useState("");
  const [estudioReport, setEstudioReport] = useState("");

  // Search & Filters
  const [estudioSearchQuery, setEstudioSearchQuery] = useState("");
  const [estudioFilterPatient, setEstudioFilterPatient] = useState("Todos");
  const [estudioFilterType, setEstudioFilterType] = useState("Todos");

  const [dragActive, setDragActive] = useState(false);

  // Handlers for Internaciones, Consultas y Estudios
  const handleOpenAddEstudio = () => {
    setEditingEstudio(null);
    setEstudioPatient("Hernan");
    setEstudioInfo("");
    setEstudioType("Estudio y/o Analisis");
    setEstudioLocation("Sanatorio San Juan");
    setEstudioDoctorId(doctors[0]?.id || "");
    setEstudioFileName("");
    setEstudioFileData("");
    setEstudioStudyDate(new Date().toISOString().split("T")[0]);
    setEstudioEntryDate("");
    setEstudioExitDate("");
    setEstudioReport("");
    setShowEstudioModal(true);
  };

  const handleOpenEditEstudio = (record: MedicalRecord) => {
    setEditingEstudio(record);
    setEstudioPatient(record.patient);
    setEstudioInfo(record.info);
    setEstudioType(record.type);
    setEstudioLocation(record.location);
    setEstudioDoctorId(record.doctorId);
    setEstudioFileName(record.fileName || "");
    setEstudioFileData(record.fileData || "");
    setEstudioStudyDate(record.studyDate);
    setEstudioEntryDate(record.entryDate || "");
    setEstudioExitDate(record.exitDate || "");
    setEstudioReport(record.report);
    setShowEstudioModal(true);
  };

  const handleSaveEstudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }

      // Calculate days count if it's "Internacion"
      let daysCount: number | null = null;
      if (estudioType === "Internacion" && estudioEntryDate && estudioExitDate) {
        const start = new Date(estudioEntryDate);
        const end = new Date(estudioExitDate);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysCount = diffDays >= 0 ? diffDays : 0;
      }

      let finalFileData = estudioFileData || "";
      if (finalFileData && finalFileData.startsWith("data:image")) {
        finalFileData = await compressImageIfNeeded(finalFileData, 600 * 1024);
        if (finalFileData.length > 900000) {
          alert("La imagen es muy pesada");
          return;
        }
      } else if (finalFileData && finalFileData.length > 900000) {
        alert("El archivo es muy pesado");
        return;
      }

      const newRecord: MedicalRecord = {
        id: editingEstudio ? editingEstudio.id : generateUniqueId("medrec"),
        patient: estudioPatient || "Hernan",
        info: estudioInfo || "",
        type: estudioType || "Estudio y/o Analisis",
        location: estudioLocation || "Sanatorio San Juan",
        doctorId: estudioDoctorId || "",
        fileName: estudioFileName || "",
        fileData: finalFileData || "",
        studyDate: estudioStudyDate || new Date().toISOString().substring(0, 10),
        entryDate: estudioType === "Internacion" ? (estudioEntryDate || "") : "",
        exitDate: estudioType === "Internacion" ? (estudioExitDate || "") : "",
        daysCount: estudioType === "Internacion" ? (daysCount ?? 0) : 0,
        report: estudioReport || "",
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...newRecord });
      await saveItemToFirestore(userId, "medical_records", newRecord);
      setMedicalRecords((prev) => {
        const exists = prev.some((r) => r.id === newRecord.id);
        if (exists) return prev.map((r) => (r.id === newRecord.id ? newRecord : r));
        return [newRecord, ...prev];
      });
      showToast("Estudio guardado", "success");
      setShowEstudioModal(false);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEstudio = (id: string) => {
    if (!userId) {
      alert("Error: Usuario no identificado");
      return;
    }
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro de salud? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        try {
          await deleteItemFromFirestore(userId, "medical_records", id);
          setMedicalRecords((prev) => prev.filter((r) => r.id !== id));
          showToast("Registro eliminado", "success");
        } catch (error: any) {
          alert("Error de Firebase: " + (error?.message || error));
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setEstudioFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEstudioFileData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEstudioFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEstudioFileData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Tab container ref for horizontal scrolling of submenus
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Doctors Table States
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [docFilterSpecialty, setDocFilterSpecialty] = useState("Todos");
  const [docFilterConsultorio, setDocFilterConsultorio] = useState("Todos");

  // Persistent Custom Specialties and Consultorios
  const [customSpecialties, setCustomSpecialties] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("health_custom_specialties");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customConsultorios, setCustomConsultorios] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("health_custom_consultorios");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Removed Specialties and Consultorios
  const [removedSpecialties, setRemovedSpecialties] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("health_removed_specialties");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [removedConsultorios, setRemovedConsultorios] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("health_removed_consultorios");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleAddCustomSpecialty = (newVal: string) => {
    const trimmed = newVal.trim();
    if (!trimmed) return;

    setRemovedSpecialties((prev) => {
      const updated = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      try {
        localStorage.setItem("health_removed_specialties", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    setCustomSpecialties((prev) => {
      if (
        prev.some((s) => s.toLowerCase() === trimmed.toLowerCase()) ||
        ["Neurocirujano", "Oncologo", "Cardiologa", "Medica General y de Familia", "Neurologo"].some(
          (s) => s.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        return prev;
      }
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem("health_custom_specialties", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleRemoveSpecialty = (valToRemove: string) => {
    const trimmed = valToRemove.trim();
    if (!trimmed) return;

    setCustomSpecialties((prev) => {
      const updated = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      try {
        localStorage.setItem("health_custom_specialties", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    setRemovedSpecialties((prev) => {
      if (prev.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem("health_removed_specialties", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (docFilterSpecialty.toLowerCase() === trimmed.toLowerCase()) {
      setDocFilterSpecialty("Todos");
    }
  };

  const handleAddCustomConsultorio = (newVal: string) => {
    const trimmed = newVal.trim();
    if (!trimmed) return;

    setRemovedConsultorios((prev) => {
      const updated = prev.filter((c) => c.toLowerCase() !== trimmed.toLowerCase());
      try {
        localStorage.setItem("health_removed_consultorios", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    setCustomConsultorios((prev) => {
      if (
        prev.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ||
        ["Sanatorio San Juan", "COE", "Consultorios Externos Sanatorio San Juan", "CIMAC"].some(
          (c) => c.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        return prev;
      }
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem("health_custom_consultorios", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleRemoveConsultorio = (valToRemove: string) => {
    const trimmed = valToRemove.trim();
    if (!trimmed) return;

    setCustomConsultorios((prev) => {
      const updated = prev.filter((c) => c.toLowerCase() !== trimmed.toLowerCase());
      try {
        localStorage.setItem("health_custom_consultorios", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    setRemovedConsultorios((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem("health_removed_consultorios", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (docFilterConsultorio.toLowerCase() === trimmed.toLowerCase()) {
      setDocFilterConsultorio("Todos");
    }
  };

  // Doctors Modal State
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DoctorCard | null>(null);
  const [formDocName, setFormDocName] = useState("");
  const [formDocSpecialty, setFormDocSpecialty] = useState("Neurocirujano");
  const [formDocConsultorio, setFormDocConsultorio] =
    useState("Sanatorio San Juan");
  const [formDocPhone, setFormDocPhone] = useState("");

  // Dynamic Options for Specialties
  const specialtyOptions = useMemo(() => {
    const set = new Set<string>();
    ["Neurocirujano", "Oncologo", "Cardiologa", "Medica General y de Familia", "Neurologo"].forEach((s) => set.add(s));
    customSpecialties.forEach((s) => set.add(s));
    (doctors || []).forEach((d) => {
      if (d.specialty) set.add(d.specialty);
    });
    if (formDocSpecialty) set.add(formDocSpecialty);

    return Array.from(set)
      .filter((s) => !removedSpecialties.some((r) => r.toLowerCase() === s.toLowerCase()))
      .map((s) => {
        let label = s;
        if (s === "Oncologo") label = "Oncólogo";
        else if (s === "Cardiologa") label = "Cardióloga";
        else if (s === "Medica General y de Familia") label = "Médica General y de Familia";
        else if (s === "Neurologo") label = "Neurólogo";
        return { value: s, label };
      });
  }, [customSpecialties, doctors, formDocSpecialty, removedSpecialties]);

  // Dynamic Options for Consultorios
  const consultorioOptions = useMemo(() => {
    const set = new Set<string>();
    ["Sanatorio San Juan", "COE", "Consultorios Externos Sanatorio San Juan", "CIMAC"].forEach((c) => set.add(c));
    customConsultorios.forEach((c) => set.add(c));
    (doctors || []).forEach((d) => {
      if (d.address) set.add(d.address);
    });
    if (formDocConsultorio) set.add(formDocConsultorio);

    return Array.from(set)
      .filter((c) => !removedConsultorios.some((r) => r.toLowerCase() === c.toLowerCase()))
      .map((c) => ({ value: c, label: c }));
  }, [customConsultorios, doctors, formDocConsultorio, removedConsultorios]);

  const filterSpecialtyOptions = useMemo(() => {
    return [
      { value: "Todos", label: "Todas las Especialidades" },
      ...specialtyOptions,
    ];
  }, [specialtyOptions]);

  const filterConsultorioOptions = useMemo(() => {
    return [
      { value: "Todos", label: "Todos los Consultorios" },
      ...consultorioOptions,
    ];
  }, [consultorioOptions]);

  // Datos de Presión Table States
  const [bpSearchQuery, setBpSearchQuery] = useState("");
  const [bpFilterPatient, setBpFilterPatient] = useState("Todos");
  const [bpTrendFilterPatient, setBpTrendFilterPatient] = useState("Todos");
  const [bpTrendPage, setBpTrendPage] = useState(1);

  // Datos de Presión Modal State
  const [showBpTableModal, setShowBpTableModal] = useState(false);
  const [editingBpLogItem, setEditingBpLogItem] =
    useState<BloodPressureLog | null>(null);
  const [formBpPatient, setFormBpPatient] = useState<
    "Hernan" | "Modesto" | "Jessica" | "Gladys"
  >("Hernan");
  const [formBpDate, setFormBpDate] = useState("");
  const [formBpSys, setFormBpSys] = useState("120");
  const [formBpDia, setFormBpDia] = useState("80");
  const [formBpTemp, setFormBpTemp] = useState("36.5");
  const [formBpO2, setFormBpO2] = useState("98");

  // Detailed Medications Table State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [filterUnidad, setFilterUnidad] = useState("Todos");
  const [filterFuncionTratamiento, setFilterFuncionTratamiento] =
    useState("Todos");

  // Modal State for Detailed Medications
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicamentoDetallado | null>(
    null,
  );

  // Form Fields for Detailed Medications
  const [detMarca, setDetMarca] = useState("");
  const [detDroga, setDetDroga] = useState("");
  const [detMg, setDetMg] = useState<number | "">("");
  const [detUnidadMedida, setDetUnidadMedida] = useState<
    "Comprimidos" | "Capsulas"
  >("Comprimidos");
  const [detConsumoDiario, setDetConsumoDiario] = useState<number | "">("");
  const [detCantidad, setDetCantidad] = useState<number | "">("");
  const [detImagen, setDetImagen] = useState<string>("");
  const [detEstado, setDetEstado] = useState<
    "Sin Determinacion de Consumo" | "Consumiendo" | "Dejo de Consumir"
  >("Sin Determinacion de Consumo");
  const [detFuncionTratamiento, setDetFuncionTratamiento] =
    useState<string>("Quimioterapia");
  const [detFechaInicio, setDetFechaInicio] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deportes y Actividades States
  const [deporteSearchQuery, setDeporteSearchQuery] = useState("");
  const [showActividadModal, setShowActividadModal] = useState(false);
  const [editingActividadId, setEditingActividadId] = useState<string | null>(null);

  // Actividad Form States
  const [actFechaDesde, setActFechaDesde] = useState("");
  const [actFechaHasta, setActFechaHasta] = useState("");
  const [actInformacion, setActInformacion] = useState("");
  const [actCalorias, setActCalorias] = useState<number | "">("");
  const [actPasos, setActPasos] = useState<number | "">("");
  const [actDistancia, setActDistancia] = useState<number | "">("");
  const [actTiempoMovimiento, setActTiempoMovimiento] = useState("");
  const [actFrecuencia, setActFrecuencia] = useState("");
  const [actPuntos, setActPuntos] = useState<number | "">("");
  const [actDurationMinutes, setActDurationMinutes] = useState(0);

  // Auto-calculate Distance from Steps (1 step ~ 0.762 meters)
  useEffect(() => {
    if (typeof actPasos === "number" && actPasos > 0) {
      const km = (actPasos * 0.000762).toFixed(2);
      setActDistancia(Number(km));
    }
  }, [actPasos]);

  // Auto-calculate Duration from Dates
  useEffect(() => {
    if (actFechaDesde && actFechaHasta) {
      const d1 = new Date(actFechaDesde.replace(" ", "T"));
      const d2 = new Date(actFechaHasta.replace(" ", "T"));
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diffMs = d2.getTime() - d1.getTime();
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000);
          setActDurationMinutes(diffMins);
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          setActTiempoMovimiento(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
          setActPuntos(diffMins); // 1 point per minute approx
        } else {
          setActDurationMinutes(0);
          setActTiempoMovimiento("0m");
          setActPuntos(0);
        }
      }
    }
  }, [actFechaDesde, actFechaHasta]);

  // Auto-calculate Pace (Frecuencia) from Time and Distancia as requested
  useEffect(() => {
    const d = Number(actDistancia);
    if (d > 0 && actDurationMinutes > 0) {
      const paceMinutes = actDurationMinutes / d;
      const pMin = Math.floor(paceMinutes);
      const pSec = Math.round((paceMinutes - pMin) * 60);
      setActFrecuencia(`${pMin}:${pSec.toString().padStart(2, "0")} min/km`);
    } else {
      setActFrecuencia("");
    }
  }, [actDurationMinutes, actDistancia]);

  const handleOpenActividadModal = () => {
    setEditingActividadId(null);
    setActFechaDesde(new Date().toISOString().substring(0, 16));
    setActFechaHasta(new Date().toISOString().substring(0, 16));
    setActInformacion("");
    setActCalorias("");
    setActPasos("");
    setActDistancia("");
    setActTiempoMovimiento("");
    setActFrecuencia("");
    setActPuntos("");
    setShowActividadModal(true);
  };

  const handleEditActividad = (act: DeporteActividad) => {
    setEditingActividadId(act.id);
    setActFechaDesde((act.fechaDesde || "").replace(" ", "T"));
    setActFechaHasta((act.fechaHasta || "").replace(" ", "T"));
    setActInformacion(act.informacion || "");
    setActCalorias(act.calorias || "");
    setActPasos(act.pasos || "");
    setActDistancia(act.distancia || "");
    setActTiempoMovimiento(act.tiempoMovimiento || "");
    setActFrecuencia(act.frecuencia || "");
    setActPuntos(act.puntos || "");
    setShowActividadModal(true);
  };

  const handleSaveActividad = async () => {
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }
      if (!actFechaDesde || !actFechaHasta || !actInformacion) {
        alert("Por favor completa los campos requeridos de la actividad.");
        return;
      }

      const nuevaActividad: DeporteActividad = {
        id: editingActividadId || generateUniqueId("act"),
        fechaDesde: (actFechaDesde || "").replace("T", " "),
        fechaHasta: (actFechaHasta || "").replace("T", " "),
        informacion: actInformacion || "",
        calorias: Number(actCalorias) || 0,
        pasos: Number(actPasos) || 0,
        distancia: Number(actDistancia) || 0,
        tiempoMovimiento: actTiempoMovimiento || "",
        frecuencia: actFrecuencia || "",
        puntos: Number(actPuntos) || 0,
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...nuevaActividad });
      await saveItemToFirestore(userId, "deportes_actividades", nuevaActividad);
      setDeportesActividades((prev) => {
        const exists = prev.some((a) => a.id === nuevaActividad.id);
        if (exists) return prev.map((a) => (a.id === nuevaActividad.id ? nuevaActividad : a));
        return [nuevaActividad, ...prev];
      });
      showToast(editingActividadId ? "Actividad actualizada" : "Actividad guardada", "success");
      setShowActividadModal(false);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteActividad = (id: string, skipConfirmation = false) => {
    if (!userId) {
      alert("Error: Usuario no identificado");
      return;
    }
    const performDelete = async () => {
      setIsDeleting(true);
      try {
        await deleteItemFromFirestore(userId, "deportes_actividades", id);
        setDeportesActividades((prev) => prev.filter((a) => a.id !== id));
        showToast("Actividad eliminada", "success");
      } catch (error: any) {
        alert("Error de Firebase: " + (error?.message || error));
      } finally {
        setIsDeleting(false);
      }
    };

    if (skipConfirmation) {
      performDelete();
    } else {
      const act = deportesActividades.find((a) => a.id === id);
      const name = act?.informacion ? `"${act.informacion}"` : "esta actividad";
      askConfirmation(
        "Confirmar Eliminación",
        `¿Desea eliminar el registro de ${name}?`,
        performDelete
      );
    }
  };

  // Disponibilidad de Medicamentos States
  const [showDispModal, setShowDispModal] = useState(false);
  const [editingDisp, setEditingDisp] =
    useState<DisponibilidadMedicamento | null>(null);

  useLockBodyScroll(
    Boolean(
      showProfileModal ||
        showMedidasModal ||
        showAddMed ||
        showAddBp ||
        showAddDoc ||
        showAlimModal ||
        showEstudioModal ||
        showDocModal ||
        showBpTableModal ||
        showDetailedModal ||
        showActividadModal ||
        showDispModal
    )
  );
  const [dispReceta, setDispReceta] = useState(false);
  const [dispMedicamentoId, setDispMedicamentoId] = useState("");
  const [dispFechaRegistro, setDispFechaRegistro] = useState("");
  const [dispCantidadRegistrada, setDispCantidadRegistrada] = useState<
    number | ""
  >("");

  // Disponibilidad Search / Filters State
  const [dispSearchQuery, setDispSearchQuery] = useState("");
  const [dispFilterEstado, setDispFilterEstado] = useState("Todos");
  const [dispFilterFuncion, setDispFilterFuncion] = useState("Todos");

  // File Upload Helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert("La imagen es muy pesada");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        try {
          const compressed = await compressImageIfNeeded(rawBase64);
          if (compressed.length > 900000) {
            alert("La imagen es muy pesada");
            return;
          }
          setDetImagen(compressed);
        } catch (_) {
          if (rawBase64.length > 900000) {
            alert("La imagen es muy pesada");
            return;
          }
          setDetImagen(rawBase64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingMed(null);
    setDetMarca("");
    setDetDroga("");
    setDetMg("");
    setDetUnidadMedida("Comprimidos");
    setDetConsumoDiario("");
    setDetCantidad("");
    setDetImagen("");
    setDetEstado("Sin Determinacion de Consumo");
    setDetFuncionTratamiento("Quimioterapia");
    setDetFechaInicio(new Date().toISOString().split("T")[0]);
    setShowDetailedModal(true);
  };

  // Open Edit Modal
  const openEditModal = (med: MedicamentoDetallado) => {
    setEditingMed(med);
    setDetMarca(med.marca);
    setDetDroga(med.droga);
    setDetMg(med.mg);
    setDetUnidadMedida(med.unidadMedida);
    setDetConsumoDiario(med.consumoDiario);
    setDetCantidad(med.cantidad || 0);
    setDetImagen(med.imagen || "");
    setDetEstado(med.estado);
    setDetFuncionTratamiento(med.funcionTratamiento || "Quimioterapia");
    setDetFechaInicio(med.fechaInicio || new Date().toISOString().split("T")[0]);
    setShowDetailedModal(true);
  };

  // Save Detailed Medication
  const handleSaveDetailedMed = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }
      if (!detMarca || !detDroga) {
        alert("Por favor completa Marca y Droga.");
        return;
      }

      let finalImg = detImagen || "";
      if (finalImg && finalImg.startsWith("data:image")) {
        finalImg = await compressImageIfNeeded(finalImg, 600 * 1024);
        if (finalImg.length > 900000) {
          alert("La imagen es muy pesada");
          return;
        }
      }

      const medItem: MedicamentoDetallado = {
        id: editingMed ? editingMed.id : generateUniqueId("det-med"),
        marca: detMarca || "",
        droga: detDroga || "",
        mg: Number(detMg) || 0,
        unidadMedida: detUnidadMedida || "Comprimidos",
        consumoDiario: Number(detConsumoDiario) || 0,
        cantidad: Number(detCantidad) || 0,
        imagen: finalImg || "",
        estado: detEstado || "Sin Determinacion de Consumo",
        funcionTratamiento: detFuncionTratamiento || "Quimioterapia",
        fechaInicio: detFechaInicio || new Date().toISOString().split("T")[0],
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...medItem });
      await saveItemToFirestore(userId, "medicamentos_detallados", medItem);
      setMedicamentosDetallados((prev) => {
        const exists = prev.some((m) => m.id === medItem.id);
        if (exists) return prev.map((m) => (m.id === medItem.id ? medItem : m));
        return [medItem, ...prev];
      });
      showToast(editingMed ? "Medicamento actualizado con éxito" : "Medicamento guardado con éxito", "success");
      setShowDetailedModal(false);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Detailed Medication
  const handleDeleteDetailedMed = (id: string) => {
    if (!userId) {
      alert("Error: Usuario no identificado");
      return;
    }
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este medicamento de la lista detallada? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        try {
          await deleteItemFromFirestore(userId, "medicamentos_detallados", id);
          setMedicamentosDetallados((prev) => prev.filter((m) => m.id !== id));
          showToast("Medicamento eliminado con éxito", "success");
        } catch (error: any) {
          alert("Error de Firebase: " + (error?.message || error));
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  // Disponibilidad de Medicamentos handlers
  const handleOpenAddDisp = () => {
    setEditingDisp(null);
    setDispReceta(false);
    const sorted = [...(medicamentosDetallados || [])].sort((a, b) => {
      const labelA = `${a.marca || ""} - ${a.droga || ""}`.trim().toLowerCase();
      const labelB = `${b.marca || ""} - ${b.droga || ""}`.trim().toLowerCase();
      return labelA.localeCompare(labelB, "es", { sensitivity: "base" });
    });
    setDispMedicamentoId(sorted[0]?.id || "");
    setDispFechaRegistro(new Date().toISOString().split("T")[0]);
    setDispCantidadRegistrada("");
    setShowDispModal(true);
  };

  const handleOpenEditDisp = (disp: DisponibilidadMedicamento) => {
    setEditingDoc(null); // Clear doctor editing context if any
    setEditingDisp(disp);
    setDispReceta(disp.receta);
    setDispMedicamentoId(disp.medicamentoId);
    setDispFechaRegistro(disp.fechaRegistro);
    setDispCantidadRegistrada(disp.cantidadRegistrada);
    setShowDispModal(true);
  };

  const handleSaveDisp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }
      if (!dispMedicamentoId) {
        alert("Por favor selecciona un medicamento.");
        return;
      }

      const dispItem: DisponibilidadMedicamento = {
        id: editingDisp ? editingDisp.id : generateUniqueId("disp"),
        receta: Boolean(dispReceta),
        medicamentoId: dispMedicamentoId || "",
        fechaRegistro: dispFechaRegistro || new Date().toISOString().split("T")[0],
        cantidadRegistrada: Number(dispCantidadRegistrada) || 0,
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...dispItem });
      await saveItemToFirestore(userId, "disponibilidad_medicamentos", dispItem);
      setDisponibilidadMedicamentos((prev) => {
        const exists = prev.some((d) => d.id === dispItem.id);
        if (exists) return prev.map((d) => (d.id === dispItem.id ? dispItem : d));
        return [dispItem, ...prev];
      });
      showToast(editingDisp ? "Registro de disponibilidad actualizado" : "Registro de disponibilidad guardado", "success");
      setShowDispModal(false);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDisp = (id: string) => {
    if (!userId) {
      alert("Error: Usuario no identificado");
      return;
    }
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro de disponibilidad? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        try {
          await deleteItemFromFirestore(userId, "disponibilidad_medicamentos", id);
          setDisponibilidadMedicamentos((prev) => prev.filter((d) => d.id !== id));
          showToast("Registro de disponibilidad eliminado", "success");
        } catch (error: any) {
          alert("Error de Firebase: " + (error?.message || error));
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  // Handlers
  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }
      if (!medName) {
        alert("Por favor ingresa el nombre del medicamento.");
        return;
      }

      const nMed: Medication = {
        id: generateUniqueId("med"),
        name: medName || "",
        dosage: medDosage || "1 comprimido",
        frequency: medFreq || "Diario",
        time: medTime || "08:00",
        takenToday: false,
        history: {},
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...nMed });
      await saveItemToFirestore(userId, "medications", nMed);
      setMedications((prev) => [nMed, ...prev]);
      showToast("Medicamento en rutina guardado", "success");
      setMedName("");
      setMedDosage("");
      setMedFreq("");
      setMedTime("");
      setShowAddMed(false);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMedToday = async (id: string) => {
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }
      const med = medications.find((m) => m.id === id);
      if (!med) return;
      const todayStr = new Date().toISOString().split("T")[0];
      const taken = !med.takenToday;
      const newHistory = { ...(med.history || {}), [todayStr]: taken };
      const updated = {
        ...med,
        takenToday: taken,
        history: newHistory,
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...updated });
      await saveItemToFirestore(userId, "medications", updated);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMed = (id: string) => {
    if (!userId) {
      alert("Error: Usuario no identificado");
      return;
    }
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este medicamento de la rutina diaria? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        try {
          await deleteItemFromFirestore(userId, "medications", id);
          setMedications((prev) => prev.filter((m) => m.id !== id));
          showToast("Medicamento eliminado de la rutina", "success");
        } catch (error: any) {
          alert("Error de Firebase: " + (error?.message || error));
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const handleAddBpLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }
      if (bpSys <= 0 || bpDia <= 0) {
        alert("Por favor ingresa valores válidos de presión arterial.");
        return;
      }

      const nLog: BloodPressureLog = {
        id: generateUniqueId("bp"),
        date: bpDate || new Date().toISOString(),
        systolic: Number(bpSys) || 120,
        diastolic: Number(bpDia) || 80,
        pulse: Number(bpPulse) || 72,
        notes: bpNotes || "",
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...nLog });
      await saveItemToFirestore(userId, "blood_pressure", nLog);
      setBpLogs((prev) => [nLog, ...prev]);
      showToast("Registro de presión arterial guardado", "success");
      setBpSys(120);
      setBpDia(80);
      setBpPulse(72);
      setBpNotes("");
      setBpDate("");
      setShowAddBp(false);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBpLog = (id: string) => {
    if (!userId) {
      alert("Error: Usuario no identificado");
      return;
    }
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro de presión arterial? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        try {
          await deleteItemFromFirestore(userId, "blood_pressure", id);
          setBpLogs((prev) => prev.filter((b) => b.id !== id));
          showToast("Registro de presión arterial eliminado", "success");
        } catch (error: any) {
          alert("Error de Firebase: " + (error?.message || error));
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }
      if (!docName || !docSpecialty) {
        alert("Por favor completa el nombre y la especialidad.");
        return;
      }

      const nDoc: DoctorCard = {
        id: generateUniqueId("doc"),
        name: docName || "",
        specialty: docSpecialty || "",
        phone: docPhone || "",
        email: docEmail || "",
        address: docAddress || "",
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...nDoc });
      await saveItemToFirestore(userId, "doctors", nDoc);
      setDoctors((prev) => [nDoc, ...prev]);
      showToast("Profesional médico guardado", "success");
      setDocName("");
      setDocSpecialty("");
      setDocPhone("");
      setDocEmail("");
      setDocAddress("");
      setShowAddDoc(false);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDoctor = (id: string) => {
    if (!userId) {
      alert("Error: Usuario no identificado");
      return;
    }
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este profesional médico de tu lista? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        try {
          await deleteItemFromFirestore(userId, "doctors", id);
          setDoctors((prev) => prev.filter((d) => d.id !== id));
          showToast("Profesional médico eliminado", "success");
        } catch (error: any) {
          alert("Error de Firebase: " + (error?.message || error));
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const handleOpenAddDoctorModal = () => {
    setEditingDoc(null);
    setFormDocName("");
    setFormDocSpecialty("Neurocirujano");
    setFormDocConsultorio("Sanatorio San Juan");
    setFormDocPhone("");
    setShowDocModal(true);
  };

  const handleOpenEditDoctorModal = (doc: DoctorCard) => {
    setEditingDoc(doc);
    setFormDocName(doc.name);
    setFormDocSpecialty(doc.specialty);
    setFormDocConsultorio(doc.address || "Sanatorio San Juan");
    setFormDocPhone(doc.phone);
    setShowDocModal(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }
      if (!formDocName.trim()) {
        alert("Por favor ingresa el nombre del médico.");
        return;
      }

      if (formDocSpecialty) handleAddCustomSpecialty(formDocSpecialty);
      if (formDocConsultorio) handleAddCustomConsultorio(formDocConsultorio);

      const docItem: DoctorCard = {
        id: editingDoc ? editingDoc.id : generateUniqueId("doc"),
        name: formDocName || "",
        specialty: formDocSpecialty || "General",
        address: formDocConsultorio || "",
        phone: formDocPhone || "",
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...docItem });
      await saveItemToFirestore(userId, "doctors", docItem);
      showToast(editingDoc ? "Profesional médico actualizado" : "Profesional médico guardado", "success");
      setShowDocModal(false);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddBpTableModal = () => {
    setEditingBpLogItem(null);
    setFormBpPatient("Hernan");
    setFormBpDate(new Date().toISOString().split("T")[0]);
    setFormBpSys("120");
    setFormBpDia("80");
    setFormBpTemp("36.5");
    setFormBpO2("98");
    setShowBpTableModal(true);
  };

  const handleOpenEditBpTableModal = (log: BloodPressureLog) => {
    setEditingBpLogItem(log);
    setFormBpPatient(log.patient || "Hernan");
    setFormBpDate(log.date);
    setFormBpSys(String(log.systolic));
    setFormBpDia(String(log.diastolic));
    setFormBpTemp(
      log.temperature !== undefined ? String(log.temperature) : "36.5",
    );
    setFormBpO2(log.oxygen !== undefined ? String(log.oxygen) : "98");
    setShowBpTableModal(true);
  };

  const handleSaveBpTableLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log('1. Iniciando guardado, userId:', userId);
      if (!userId) {
        alert("Error: Usuario no identificado");
        return;
      }
      const sys = Number(formBpSys) || 120;
      const dia = Number(formBpDia) || 80;
      const temp = Number(formBpTemp) || 36.5;
      const o2 = Number(formBpO2) || 98;

      const logItem: BloodPressureLog = {
        id: editingBpLogItem ? editingBpLogItem.id : generateUniqueId("bp"),
        patient: formBpPatient || "Hernan",
        date: formBpDate || new Date().toISOString().split("T")[0],
        systolic: sys,
        diastolic: dia,
        pulse: 72,
        temperature: temp,
        oxygen: o2,
      };

      console.log('2. Intentando guardar en Firestore los datos:', { ...logItem });
      await saveItemToFirestore(userId, "blood_pressure", logItem);
      showToast("Registro guardado", "success");
      setShowBpTableModal(false);
    } catch (error: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', error);
      alert("Error de Firebase: " + (error?.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  // Filter detailed medications
  const filteredMeds = (medicamentosDetallados || []).filter((med) => {
    const matchesSearch =
      med.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.droga.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEstado =
      filterEstado === "Todos" || med.estado === filterEstado;
    const matchesUnidad =
      filterUnidad === "Todos" || med.unidadMedida === filterUnidad;
    const matchesFuncion =
      filterFuncionTratamiento === "Todos" ||
      (med.funcionTratamiento || "Quimioterapia") === filterFuncionTratamiento;
    return matchesSearch && matchesEstado && matchesUnidad && matchesFuncion;
  });

  // Filtered and Sorted Disponibilidad de Medicamentos by "Disponible Para" ascending
  const filteredDisp = (disponibilidadMedicamentos || [])
    .filter((disp) => {
      const details = calculateDispDetails(disp);
      const matchesSearch =
        details.marca.toLowerCase().includes(dispSearchQuery.toLowerCase()) ||
        details.droga.toLowerCase().includes(dispSearchQuery.toLowerCase());
      const matchesEstado =
        dispFilterEstado === "Todos" || details.estado === dispFilterEstado;
      const matchesFuncion =
        dispFilterFuncion === "Todos" ||
        details.funcionTratamiento === dispFilterFuncion;
      return matchesSearch && matchesEstado && matchesFuncion;
    })
    .sort((a, b) => {
      const detailsA = calculateDispDetails(a);
      const detailsB = calculateDispDetails(b);
      return detailsA.disponibleParaDias - detailsB.disponibleParaDias;
    });

  // Filtered Doctors
  const filteredDoctors = (doctors || []).filter((doc) => {
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(docSearchQuery.toLowerCase());
    const matchesSpecialty =
      docFilterSpecialty === "Todos" || doc.specialty === docFilterSpecialty;
    const matchesConsultorio =
      docFilterConsultorio === "Todos" ||
      (doc.address || "") === docFilterConsultorio;
    return matchesSearch && matchesSpecialty && matchesConsultorio;
  });

  // Filtered Blood Pressure / Health Logs
  const filteredBpLogs = (bpLogs || []).filter((log) => {
    const patientName = log.patient || "Hernan";
    const matchesSearch = patientName
      .toLowerCase()
      .includes(bpSearchQuery.toLowerCase());
    const matchesPatient =
      bpFilterPatient === "Todos" || patientName === bpFilterPatient;
    return matchesSearch && matchesPatient;
  });

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6 font-sans">
      {/* Submenu Navigation */}
      {!propActiveSubTab && (
        <SubNav
          activeTab={activeSubTab}
          onTabChange={(id) => setActiveSubTab(id as any)}
          className="mb-6"
          tabs={[
            { id: "resumen", label: "Mi Salud", icon: Activity },
            { id: "deporte_alimentacion", label: "Deporte y Alimentación", icon: Activity },
            { id: "control_clinico", label: "Control Clínico", icon: Stethoscope },
          ]}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {activeSubTab === "resumen" && (
            <>
          {/* Top Grid: Calendario Médico, Control de Medicamentos & Tendencia Presión Arterial (3 Columnas) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Columna 1: Calendario Médico */}
            <div
              className={`p-4 sm:p-5 rounded-3xl border flex flex-col h-full overflow-hidden min-h-0 max-h-[600px] ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
              }`}
            >
              <div className="flex flex-col h-full min-h-0 justify-between gap-3">
                <div className="flex flex-col flex-1 min-h-0 gap-3">
                  {/* Header */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-md">Calendario Médico</h3>
                    </div>
                    <button
                      onClick={() => {
                        setMedicalCalendarDate(new Date());
                        setSelectedMedicalDate(getLocalDateString());
                      }}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer bg-primary/10 px-2.5 py-1 rounded-xl transition-all"
                      title="Ir a fecha de hoy"
                    >
                      Hoy
                    </button>
                  </div>

                  {/* Month Selector */}
                  <div className="flex items-center justify-between px-1 shrink-0">
                    <button
                      onClick={() =>
                        setMedicalCalendarDate(
                          new Date(
                            medicalCalendarDate.getFullYear(),
                            medicalCalendarDate.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                      title="Mes Anterior"
                    >
                      <ChevronLeft className="w-4 h-4 text-zinc-500" />
                    </button>
                    <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                      {MONTHS_ES[medicalCalendarDate.getMonth()]}{" "}
                      {medicalCalendarDate.getFullYear()}
                    </span>
                    <button
                      onClick={() =>
                        setMedicalCalendarDate(
                          new Date(
                            medicalCalendarDate.getFullYear(),
                            medicalCalendarDate.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                      title="Mes Siguiente"
                    >
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </button>
                  </div>

                  {/* Calendar Grid Box */}
                  <div
                    className={`p-3 rounded-2xl flex-1 flex flex-col justify-between min-h-0 ${
                      darkMode
                        ? "bg-zinc-950/60 border border-zinc-800/60"
                        : "bg-slate-50 border border-slate-200/80"
                    }`}
                  >
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 shrink-0">
                      {WEEKDAYS_ES.map((wd) => (
                        <div key={wd} className="py-0.5">
                          {wd}
                        </div>
                      ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-1 flex-1 min-h-0 items-stretch">
                      {getDaysInMonth(medicalCalendarDate).map((day, idx) => {
                        if (day === null) {
                          return <div key={`empty-${idx}`} className="p-1 h-full min-h-[2.25rem]" />;
                        }

                        const dateStr = `${medicalCalendarDate.getFullYear()}-${String(
                          medicalCalendarDate.getMonth() + 1
                        ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                        const hasMeds = (disponibilidadMedicamentos || []).some((disp) => {
                          const details = calculateDispDetails(disp);
                          return (
                            details.disponibleHasta === dateStr ||
                            disp.fechaRegistro === dateStr
                          );
                        });

                        const hasHernan = (turnosCompromisos || []).some((tc) => {
                          if (tc.categoria !== "Turno - Hernan") return false;
                          const tcDate = (tc.fecha || "").split("T")[0];
                          return tcDate === dateStr;
                        });

                        const hasModesto = (turnosCompromisos || []).some((tc) => {
                          if (tc.categoria !== "Turno - Modesto") return false;
                          const tcDate = (tc.fecha || "").split("T")[0];
                          return tcDate === dateStr;
                        });

                        const isSelected = selectedMedicalDate === dateStr;
                        const isToday = getLocalDateString() === dateStr;

                        return (
                          <button
                            key={`day-${day}`}
                            onClick={() => {
                              setSelectedMedicalDate(
                                selectedMedicalDate === dateStr ? null : dateStr
                              );
                            }}
                            className={`p-1 rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all h-full min-h-[2.25rem] w-full font-bold text-xs ${
                              isSelected
                                ? "border-2 border-primary text-primary dark:text-primary bg-primary/15 scale-105 shadow-xs"
                                : isToday
                                ? "bg-primary text-white dark:text-blue-950 shadow-md font-extrabold"
                                : "hover:bg-primary/10 text-slate-700 dark:text-zinc-300"
                            }`}
                          >
                            <span>{day}</span>
                            {(hasMeds || hasHernan || hasModesto) && (
                              <div className="flex items-center justify-center gap-0.5 absolute bottom-1">
                                {hasMeds && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-primary"
                                    title="Medicamento"
                                  />
                                )}
                                {hasHernan && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-primary/75 ring-1 ring-primary/40"
                                    title="Turno - Hernan"
                                  />
                                )}
                                {hasModesto && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-primary/45"
                                    title="Turno - Modesto"
                                  />
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Calendar Legend & Action Footer */}
                <div className="pt-3 border-t border-slate-200 dark:border-zinc-800/80 space-y-2 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-xs" />
                      <span>Medicamentos</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary/75 ring-1 ring-primary/40" />
                      <span>Hernan</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary/45" />
                      <span>Modesto</span>
                    </span>
                    <button
                      onClick={() => {
                        const now = new Date();
                        setMedicalCalendarDate(now);
                        const y = now.getFullYear();
                        const m = String(now.getMonth() + 1).padStart(2, "0");
                        const d = String(now.getDate()).padStart(2, "0");
                        setSelectedMedicalDate(`${y}-${m}-${d}`);
                      }}
                      className="text-primary hover:underline cursor-pointer font-bold capitalize"
                    >
                      Ir a Hoy
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                        Día Seleccionado
                      </p>
                      <p className="font-extrabold text-slate-900 dark:text-white mt-0.5 text-xs">
                        {formatDateFriendly(selectedMedicalDate || getLocalDateString())}
                      </p>
                    </div>
                    {selectedMedicalDate && (
                      <button
                        onClick={() => setSelectedMedicalDate(null)}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer bg-primary/10 px-2.5 py-1 rounded-lg"
                      >
                        Ver Todos
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 2: Control de Medicamentos */}
            <div
              className={`p-4 sm:p-5 rounded-3xl border flex flex-col h-full overflow-hidden min-h-0 max-h-[600px] ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
              }`}
            >
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pill className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-md">
                      Control de Medicamentos
                    </h3>
                  </div>
                </div>

                {/* Selected Date Header & Filter Pills */}
                <div className="flex flex-col gap-2 py-2.5 px-3.5 bg-slate-50 dark:bg-black/40 border border-slate-150 dark:border-zinc-800/50 rounded-2xl mb-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                        Día Seleccionado
                      </p>
                      <p className="text-xs font-extrabold text-black dark:text-zinc-200 mt-0.5">
                        {formatDateFriendly(selectedMedicalDate || getLocalDateString())}
                      </p>
                    </div>
                    {selectedMedicalDate && (
                      <button
                        onClick={() => setSelectedMedicalDate(null)}
                        className="px-2 py-1 text-[10px] text-primary font-bold hover:underline cursor-pointer whitespace-nowrap bg-primary/10 rounded-lg"
                        title="Ver todas las fechas"
                      >
                        Ver Todos
                      </button>
                    )}
                  </div>

                  {/* Filter Pills below date */}
                  <PillFilterBar
                    options={[
                      { id: "todos", label: "Todos" },
                      { id: "comprar", label: "Comprar" },
                      { id: "receta", label: "Recetas" },
                      { id: "turnos", label: "Turnos" },
                    ]}
                    activeValue={medControlFilter}
                    onChange={(val) => setMedControlFilter(val as any)}
                    layoutIdPrefix="medControlFilter"
                    className="self-start w-fit"
                  />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={medControlFilter}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2.5 flex-1 flex flex-col min-h-0"
                  >
                  {(() => {
                    type ControlItem =
                      | {
                          itemType: "medication";
                          id: string;
                          disp: DisponibilidadMedicamento;
                          details: ReturnType<typeof calculateDispDetails>;
                          dateSort: string;
                        }
                      | {
                          itemType: "turno";
                          id: string;
                          turno: TurnoCompromiso;
                          dateSort: string;
                        };

                    const medAlerts: ControlItem[] = (disponibilidadMedicamentos || [])
                      .map((disp) => {
                        const details = calculateDispDetails(disp);
                        return {
                          itemType: "medication" as const,
                          id: disp.id,
                          disp,
                          details,
                          dateSort: details.disponibleHasta || disp.fechaRegistro || "",
                        };
                      })
                      .filter(({ details, disp }) => {
                        const matchesDate =
                          !selectedMedicalDate ||
                          details.disponibleHasta === selectedMedicalDate ||
                          disp.fechaRegistro === selectedMedicalDate ||
                          details.estado === "Comprar Medicamento" ||
                          details.estado === "Pedir Receta";

                        if (!matchesDate) return false;

                        if (medControlFilter === "comprar") {
                          return details.estado === "Comprar Medicamento";
                        }
                        if (medControlFilter === "receta") {
                          return details.estado === "Pedir Receta";
                        }
                        if (medControlFilter === "turnos") {
                          return false;
                        }
                        return (
                          details.estado === "Comprar Medicamento" ||
                          details.estado === "Pedir Receta"
                        );
                      });

                    const medicalTurnos: ControlItem[] = (turnosCompromisos || [])
                      .filter(
                        (tc) =>
                          tc.categoria === "Turno - Hernan" || tc.categoria === "Turno - Modesto"
                      )
                      .map((tc) => {
                        const tcDate = (tc.fecha || "").split("T")[0];
                        return {
                          itemType: "turno" as const,
                          id: tc.id,
                          turno: tc,
                          dateSort: tcDate,
                        };
                      })
                      .filter(({ dateSort }) => {
                        const matchesDate =
                          !selectedMedicalDate || dateSort === selectedMedicalDate;
                        if (!matchesDate) return false;

                        if (medControlFilter === "comprar" || medControlFilter === "receta") {
                          return false;
                        }
                        return true;
                      });

                    const combinedItems = [...medAlerts, ...medicalTurnos].sort((a, b) =>
                      a.dateSort.localeCompare(b.dateSort)
                    );

                    if (combinedItems.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-10 text-center px-2 my-auto">
                          <Pill className="w-8 h-8 text-zinc-400 mb-2 opacity-50" />
                          <p className="text-zinc-500 text-xs font-medium">
                            {selectedMedicalDate ? (
                              <>
                                Sin alertas o turnos específicos para el{" "}
                                <span className="font-bold text-slate-800 dark:text-zinc-200">
                                  {formatDateFriendly(selectedMedicalDate)}
                                </span>.
                              </>
                            ) : (
                              "No hay alertas de disponibilidad ni turnos médicos."
                            )}
                          </p>
                          {selectedMedicalDate && (
                            <button
                              onClick={() => setSelectedMedicalDate(null)}
                              className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
                            >
                              Mostrar todos los elementos
                            </button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <AnimatedList<ControlItem>
                        items={combinedItems}
                        showGradients={false}
                        enableArrowNavigation={true}
                        className="flex-1 min-h-0 pr-1"
                        renderItem={(item, itemIdx) => {
                          if (item.itemType === "medication") {
                            const { disp, details } = item;
                            const isExpanded = expandedDispId === disp.id;
                            return (
                              <div
                                key={`disp-${disp.id}-${itemIdx}`}
                                onClick={() => setExpandedDispId(isExpanded ? null : disp.id)}
                                className={`flex flex-col gap-2 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer group relative overflow-hidden ${
                                  isExpanded
                                    ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                                    : details.estado === "Comprar Medicamento"
                                    ? "bg-white dark:bg-black/85 backdrop-blur-md border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    : "bg-white dark:bg-black/85 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-primary hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                }`}
                                title="Haga clic para ver toda la información desplegada"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-extrabold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                                      <Pill className="w-3.5 h-3.5 text-primary shrink-0 self-center" />
                                       <span className="self-center translate-y-[0.5px]">{details.marca}</span>
                                      <ChevronDown
                                        className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                          isExpanded ? "rotate-180" : ""
                                        }`}
                                      />
                                    </span>
                                    {details.droga && (
                                      <span className="text-[10px] text-zinc-500 font-medium truncate">
                                        {details.droga}
                                      </span>
                                    )}
                                    <span
                                      className={`text-[9px] uppercase font-extrabold tracking-wider mt-1 px-1.5 py-0.5 rounded-md inline-block w-fit ${
                                        details.estado === "Comprar Medicamento"
                                          ? "bg-red-500/10 text-red-500"
                                          : "bg-primary/10 text-primary"
                                      }`}
                                    >
                                      {details.estado}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="block text-[9px] uppercase font-bold text-zinc-500">
                                      Disponible Hasta
                                    </span>
                                    <span className="font-extrabold font-mono text-[11px] text-slate-900 dark:text-white">
                                      {details.disponibleHasta}
                                    </span>
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="pt-2 border-t border-primary/20 space-y-2 mt-1 text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Droga / Fármaco
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {details.droga || "No especificada"}
                                          </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Función / Tratamiento
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {details.funcionTratamiento || "General"}
                                          </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Disponibilidad
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {details.disponibleHasta} ({details.disponibleParaDias.toFixed(1)} días)
                                          </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Stock (Inicial / Restante)
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {disp.cantidadRegistrada} registradas / {details.cantidadDisponible.toFixed(1)} restantes
                                          </span>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          }

                          // Render Turno item
                          const { turno } = item;
                          const isExpanded = expandedDispId === turno.id;
                          const isHernan = turno.categoria === "Turno - Hernan";

                          return (
                            <div
                              key={`turno-${turno.id}-${itemIdx}`}
                              onClick={() => setExpandedDispId(isExpanded ? null : turno.id)}
                              className={`flex flex-col gap-2 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer group relative overflow-hidden ${
                                isExpanded
                                  ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                                  : "bg-white dark:bg-black/85 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-primary hover:bg-zinc-50 dark:hover:bg-zinc-900"
                              }`}
                              title="Haga clic para ver toda la información desplegada"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="font-extrabold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                                    <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0 self-center" />
                                     <span className="self-center translate-y-[0.5px]">{turno.descripcion || "Turno Médico"}</span>
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-primary transition-transform duration-200 shrink-0 ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  </span>

                                  {turno.doctor && (
                                    <span className="text-[10px] text-zinc-500 font-medium truncate">
                                      {turno.doctor} {turno.lugar ? `• ${turno.lugar}` : ""}
                                    </span>
                                  )}

                                  <span
                                    className={`text-[9px] uppercase font-extrabold tracking-wider mt-1 px-1.5 py-0.5 rounded-md inline-block w-fit ${
                                      isHernan
                                        ? "bg-primary/25 text-primary dark:text-primary font-black"
                                        : "bg-primary/15 text-primary/90 dark:text-primary/90 font-bold"
                                    }`}
                                  >
                                    {turno.categoria}
                                  </span>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="block text-[9px] uppercase font-bold text-zinc-500">
                                    Fecha Turno
                                  </span>
                                  <span className="font-extrabold font-mono text-[11px] text-slate-900 dark:text-white">
                                    {turno.fecha ? turno.fecha.split("T")[0] : ""}
                                  </span>
                                </div>
                              </div>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="pt-2 border-t border-primary/20 space-y-2 mt-1 text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                        <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                          Categoría / Paciente
                                        </span>
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                          {turno.categoria}
                                        </span>
                                      </div>

                                      {turno.doctor && (
                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Médico / Especialista
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {turno.doctor}
                                          </span>
                                        </div>
                                      )}

                                      {turno.lugar && (
                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30 sm:col-span-2">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Lugar / Centro Médico
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                            {turno.lugar}
                                          </span>
                                        </div>
                                      )}

                                      {turno.informacionPersonalizada && (
                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30 sm:col-span-2">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Notas / Información Adicional
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {turno.informacionPersonalizada}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        }}
                      />
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
              </div>
            </div>

            {/* Blood Pressure Trends & SVG Chart */}
            <div
              className={`p-6 rounded-3xl border flex flex-col gap-4 h-full overflow-hidden min-h-0 max-h-[600px] ${
                darkMode
                  ? "bg-zinc-900/40 border-white/10 backdrop-blur-md"
                  : "bg-white/40 border-slate-200 backdrop-blur-md"
              }`}
            >
              <div
                className={`p-4 sm:p-4 rounded-3xl border flex flex-col shrink-0 ${
                  darkMode
                    ? "bg-zinc-950 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                {/* Title */}
                <div className="flex items-center gap-2 mb-3 shrink-0">
                  <Activity className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-md">
                    Tendencia Presión Arterial
                  </h3>
                </div>

                {/* Button first, then Filter, using full width */}
                <div className="flex items-center gap-2.5 w-full mb-3 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setShowAddBp(!showAddBp);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Registrar</span>
                  </motion.button>

                  <CustomSelect
                    value={bpTrendFilterPatient}
                    onChange={(val) => setBpTrendFilterPatient(val)}
                    size="sm"
                    darkMode={darkMode}
                    className="flex-1 w-full"
                    options={[
                      { value: "Todos", label: "Todos" },
                      { value: "Hernan", label: "Hernan" },
                      { value: "Modesto", label: "Modesto" },
                      { value: "Jessica", label: "Jessica" },
                      { value: "Gladys", label: "Gladys" },
                    ]}
                  />
                </div>

                {/* Custom SVG Line graph for Blood Pressure */}
                <div className="flex justify-center my-2 relative">
                  {(() => {
                    const trendBpLogs = (bpLogs || []).filter((log) => {
                      const patientName = log.patient || "Hernan";
                      return (
                        bpTrendFilterPatient === "Todos" ||
                        patientName === bpTrendFilterPatient
                      );
                    });

                    if (trendBpLogs.length < 2) {
                      return (
                        <div className="w-full h-32 flex items-center justify-center border border-dashed border-zinc-500/20 rounded-2xl text-xs text-zinc-500 px-4 text-center">
                          Registra al menos 2 mediciones{" "}
                          {bpTrendFilterPatient !== "Todos"
                            ? `para ${bpTrendFilterPatient}`
                            : ""}{" "}
                          para ver el gráfico de tendencia.
                        </div>
                      );
                    }

                    const reversedLogs = trendBpLogs.slice().reverse().map((log) => {
                      const fechaLimpia = (log.date || "").split("T")[0].split(" ")[0] || "Hoy";
                      return {
                        ...log,
                        fechaLimpia,
                      };
                    });

                    return (
                      <div className="w-full space-y-1.5 mt-1 shrink-0">
                        <div className="h-[150px] min-h-[150px] w-full text-xs shrink-0">
                          <ResponsiveContainer width="100%" height={150}>
                            <LineChart
                              data={reversedLogs}
                              margin={{ top: 5, right: 10, bottom: 0, left: -20 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke={darkMode ? "#27272a" : "#f1f5f9"}
                                vertical={false}
                              />
                              <XAxis
                                dataKey="fechaLimpia"
                                stroke={darkMode ? "#71717a" : "#94a3b8"}
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) =>
                                  typeof val === "string" ? val.split("T")[0] : val
                                }
                              />
                              <YAxis
                                stroke={darkMode ? "#71717a" : "#94a3b8"}
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: darkMode ? "#18181b" : "#fff",
                                  border: darkMode ? "1px solid #27272a" : "1px solid #e2e8f0",
                                  borderRadius: "12px",
                                }}
                                itemStyle={{
                                  color: darkMode ? "#f4f4f5" : "#18181b",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="systolic"
                                name="Sistólica (MAX)"
                                stroke="var(--color-primary)"
                                strokeWidth={3}
                                dot={{ r: 4, fill: "var(--color-primary)", stroke: darkMode ? "#18181b" : "#ffffff", strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="diastolic"
                                name="Diastólica (MIN)"
                                stroke="color-mix(in srgb, var(--color-primary) 50%, #a1a1aa 50%)"
                                strokeWidth={3}
                                dot={{ r: 4, fill: "color-mix(in srgb, var(--color-primary) 50%, #a1a1aa 50%)", stroke: darkMode ? "#18181b" : "#ffffff", strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-zinc-500 uppercase mt-1">
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: "var(--color-primary)" }}
                            ></span>
                            Sistólica (MAX)
                          </span>
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 50%, #a1a1aa 50%)" }}
                            ></span>
                            Diastólica (MIN)
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
              
              {/* List of past logs */}
              <div
                className={`p-4 sm:p-4 rounded-3xl border flex-1 flex flex-col min-h-[220px] overflow-hidden ${
                  darkMode
                    ? "bg-zinc-950 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                <div className="flex-1 flex flex-col h-full min-h-0">
                  {(() => {
                    const trendBpLogs = (bpLogs || []).filter((log) => {
                      const patientName = log.patient || "Hernan";
                      return (
                        bpTrendFilterPatient === "Todos" ||
                        patientName === bpTrendFilterPatient
                      );
                    });

                    if (trendBpLogs.length === 0) {
                      return (
                        <p className="text-zinc-500 text-xs text-center py-2">
                          Sin registros para{" "}
                          {bpTrendFilterPatient === "Todos"
                            ? "ningún paciente"
                            : bpTrendFilterPatient}
                          .
                        </p>
                      );
                    }

                    const itemsPerPage = 4;
                    const totalPages = Math.ceil(trendBpLogs.length / itemsPerPage);
                    const safePage = Math.min(bpTrendPage, Math.max(totalPages, 1));
                    const startIndex = (safePage - 1) * itemsPerPage;
                    const paginatedLogs = trendBpLogs.slice(startIndex, startIndex + itemsPerPage);

                    return (
                      <div className="flex flex-col h-full min-h-0">
                        <AnimatedList<BloodPressureLog>
                          items={paginatedLogs}
                          showGradients={true}
                          enableArrowNavigation={true}
                          className="flex-1 min-h-0 pr-1"
                          style={{
                            '--gradient-color': darkMode ? '#18181b' : '#ffffff',
                          } as React.CSSProperties}
                          renderItem={(log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-xs p-2 rounded-xl bg-zinc-500/5 border border-zinc-800/10"
                            >
                              {(() => {
                                const rawDate = log.date || "";
                                let datePart = rawDate;
                                let timePart = "";
                                if (rawDate.includes("T")) {
                                  [datePart, timePart] = rawDate.split("T");
                                } else if (rawDate.includes(" ")) {
                                  [datePart, timePart] = rawDate.split(" ");
                                }
                                timePart = timePart.replace("Z", "").split(":").slice(0, 2).join(":");

                                return (
                                  <span className="text-zinc-600 dark:text-zinc-400 font-normal text-sm">
                                    {datePart}
                                    {timePart && <span className="text-xs italic text-zinc-400 dark:text-zinc-500 ml-1.5">{timePart}</span>}
                                    {bpTrendFilterPatient === "Todos" && (
                                      <span className="text-[11px] italic text-zinc-400 ml-1.5">
                                        ({log.patient || "Hernan"})
                                      </span>
                                    )}
                                  </span>
                                );
                              })()}
                              <span className="font-extrabold font-mono">
                                {log.systolic}/{log.diastolic} mmHg (Pulso:{" "}
                                {log.pulse})
                              </span>
                              <button
                                onClick={() => handleDeleteBpLog(log.id)}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        />
                        {trendBpLogs.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-2 px-1 text-[10px] text-zinc-500 font-medium shrink-0">
                            <span>
                              Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, trendBpLogs.length)} de {trendBpLogs.length} registros
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setBpTrendPage(p => Math.max(p - 1, 1))}
                                disabled={safePage <= 1}
                                className="p-1 rounded border border-slate-200 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Página Anterior"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-1.5 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                {safePage} / {totalPages}
                              </span>
                              <button
                                onClick={() => setBpTrendPage(p => Math.min(p + 1, totalPages))}
                                disabled={safePage >= totalPages}
                                className="p-1 rounded border border-slate-200 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Página Siguiente"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN AVANZADA: SALUD METABÓLICA Y NUTRICIÓN */}
          <div className={`p-6 rounded-3xl border ${darkMode ? "bg-zinc-900/40 border-white/10 backdrop-blur-md" : "bg-white/40 border-slate-200 backdrop-blur-md"}`}>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <h2 className="text-xl font-extrabold tracking-tight">
                Salud Metabólica y Planificación Nutricional
              </h2>
            </div>
            
            <div className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. Perfil Metabólico & Peso Ideal */}
              <div
                className={`p-6 rounded-3xl border flex flex-col justify-between lg:col-span-1 ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-md">Perfil Metabólico</h3>
                    </div>
                  </div>

                  {(() => {
                    const bmr = edad > 0 && altura > 0 && currentWeight > 0
                      ? (genero === "Masculino" || genero === "Hombre" || genero === "male"
                          ? 10 * currentWeight + 6.25 * altura - 5 * edad + 5
                          : 10 * currentWeight + 6.25 * altura - 5 * edad - 161)
                      : 0;

                    const factAct = selectedActivityFactor;
                    let descAct = "Sedentario";
                    if (factAct === 1.375) descAct = "Ligero";
                    else if (factAct === 1.55) descAct = "Moderado";
                    else if (factAct === 1.725) descAct = "Activo";
                    else if (factAct === 1.9) descAct = "Muy Activo";

                    const tdee = Math.round(bmr * factAct);
                    let metaCalorias = tdee;
                    if (metabolicProfile.objetivo === "Bajar de Peso (Déficit)") {
                      metaCalorias -= 500;
                    } else if (metabolicProfile.objetivo === "Ganar Masa Muscular (Superávit)") {
                      metaCalorias += 400;
                    }

                    const hM = altura > 0 ? altura / 100 : 1.75;
                    const minPeso = Math.round(18.5 * hM * hM * 10) / 10;
                    const maxPeso = Math.round(24.9 * hM * hM * 10) / 10;

                    let feedBackPeso = "";
                    let isIdeal = false;
                    if (currentWeight === 0) {
                      feedBackPeso = "Configura tu peso y altura en el perfil para ver tu análisis.";
                    } else if (currentWeight < minPeso) {
                      feedBackPeso = `Bajo del ideal. Falta ganar ${(minPeso - currentWeight).toFixed(1)} kg para llegar al rango ideal.`;
                    } else if (currentWeight > maxPeso) {
                      feedBackPeso = `Sobre el ideal. Faltan bajar ${(currentWeight - maxPeso).toFixed(1)} kg para llegar al rango ideal.`;
                    } else {
                      isIdeal = true;
                      feedBackPeso = "¡Felicidades! Peso ideal óptimo para tu estatura.";
                    }

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-50 dark:bg-black/40 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-bold mb-0.5">Edad / Altura</span>
                            <span className="font-extrabold text-sm">{edad > 0 ? `${edad} años` : "-- años"} / {altura > 0 ? `${altura} cm` : "-- cm"}</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-black/40 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-bold mb-0.5">Género / Peso</span>
                            <span className="font-extrabold text-sm">{genero} / {currentWeight > 0 ? `${currentWeight} kg` : "-- kg"}</span>
                          </div>
                        </div>

                        {/* Nuevo bloque para mostrar el OBJETIVO actual del usuario */}
                        <div className="bg-slate-50 dark:bg-black/40 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-bold mb-0.5">Objetivo Actual</span>
                          <span className="font-extrabold text-sm text-primary">{metabolicProfile.objetivo || "Mantenimiento"}</span>
                        </div>

                        {(!edad || !altura || !currentWeight) && (
                          <div className="text-center p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <button
                              onClick={() => {
                                if (onOpenSettings) onOpenSettings();
                                else setShowProfileModal(true);
                              }}
                              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              ⚙️ Configurar Perfil Físico (Edad, Altura, Peso)
                            </button>
                          </div>
                        )}

                        <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-100 dark:border-zinc-800/30 pb-2">
                            <span className="text-zinc-500">Metabolismo Basal (BMR)</span>
                            <span className="font-mono text-slate-800 dark:text-zinc-200">{Math.round(bmr)} kcal</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-100 dark:border-zinc-800/30 pb-2">
                            <span className="text-zinc-500">Mantenimiento (TDEE)</span>
                            <span className="font-mono text-primary">{tdee} kcal</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold gap-2 min-w-0">
                            <span className="text-zinc-500 shrink-0">Nivel de Actividad</span>
                            <CustomSelect
                              value={String(selectedActivityFactor)}
                              onChange={async (val) => {
                                const newFactor = Number(val);
                                setSelectedActivityFactor(newFactor);
                                const updated = {
                                  ...metabolicProfile,
                                  factorActividad: newFactor,
                                };
                                await handleSaveMetabolicProfile(updated);
                              }}
                              size="sm"
                              darkMode={darkMode}
                              previewTransform={(lbl) => lbl.split(" (")[0]}
                              options={[
                                { value: "1.2", label: "Sedentario (Poco o ningún ejercicio)" },
                                { value: "1.375", label: "Ligero (Ejercicio 1-3 días/sem)" },
                                { value: "1.55", label: "Moderado (Ejercicio 3-5 días/sem)" },
                                { value: "1.725", label: "Activo (Ejercicio 6-7 días/sem)" },
                                { value: "1.9", label: "Muy Activo (Ejercicio intenso físico)" }
                              ]}
                              className="min-w-0 flex-1 max-w-[180px] xs:max-w-[200px] sm:max-w-[240px]"
                            />
                          </div>
                        </div>

                        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-4 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Rango Peso Saludable</span>
                            <span className="font-black text-xs font-mono text-primary">{minPeso} - {maxPeso} kg</span>
                          </div>
                          <p className="text-[11px] font-semibold leading-snug text-primary">
                            {feedBackPeso}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 2. Balance Calórico Diario & Macros */}
              <div
                className={`p-6 rounded-3xl border flex flex-col justify-between lg:col-span-2 ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                {(() => {
                  const hoy = new Date().toISOString().substring(0, 10);
                  const comidaDia = (alimentacionLogs || [])
                    .filter(l => l.fecha === hoy)
                    .reduce((acc, curr) => acc + (curr.calorias || 0), 0);

                  const deporteDia = (deportesActividades || [])
                    .filter(a => a.fechaDesde.startsWith(hoy))
                    .reduce((acc, curr) => acc + (curr.calorias || 0), 0);

                  const gymDia = (registrosEntrenamiento || [])
                    .filter(r => r.fecha === hoy)
                    .reduce((acc, curr) => acc + (curr.caloriasTotalesSesion || 0), 0);

                  const gastadasTotal = deporteDia + gymDia;

                  const bmr = edad > 0 && altura > 0 && currentWeight > 0
                    ? (genero === "Masculino" || genero === "Hombre" || genero === "male"
                        ? 10 * currentWeight + 6.25 * altura - 5 * edad + 5
                        : 10 * currentWeight + 6.25 * altura - 5 * edad - 161)
                    : 0;

                  const factAct = selectedActivityFactor;

                  const tdee = bmr * factAct;
                  let metaCalorias = tdee;
                  if (metabolicProfile.objetivo === "Bajar de Peso (Déficit)") {
                    metaCalorias -= 500;
                  } else if (metabolicProfile.objetivo === "Ganar Masa Muscular (Superávit)") {
                    metaCalorias += 400;
                  }
                  metaCalorias = Math.round(metaCalorias);

                  const calRestantes = metaCalorias - comidaDia + gastadasTotal;

                  const ratioPro = metabolicProfile.objetivo === "Ganar Masa Muscular (Superávit)" ? 2.2 : metabolicProfile.objetivo === "Bajar de Peso (Déficit)" ? 2.0 : 1.6;
                  const gramosProMeta = Math.round(currentWeight * ratioPro);
                  const gramosGrasaMeta = Math.round(currentWeight * 0.9);
                  const calProMeta = gramosProMeta * 4;
                  const calGrasaMeta = gramosGrasaMeta * 9;
                  const calCarbMeta = Math.max(0, metaCalorias - (calProMeta + calGrasaMeta));
                  const gramosCarbMeta = Math.round(calCarbMeta / 4);

                  const gramosProCons = Math.round((comidaDia * 0.25) / 4);
                  const gramosCarbCons = Math.round((comidaDia * 0.50) / 4);
                  const gramosGrasaCons = Math.round((comidaDia * 0.25) / 9);

                  const pctPro = Math.min(100, Math.round((gramosProCons / gramosProMeta) * 100));
                  const pctCarb = Math.min(100, Math.round((gramosCarbCons / gramosCarbMeta) * 100));
                  const pctGrasa = Math.min(100, Math.round((gramosGrasaCons / gramosGrasaMeta) * 100));

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/50">
                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Meta Calórica</span>
                          <span className="text-md font-black text-slate-800 dark:text-zinc-200">{metaCalorias} <span className="text-[10px] font-normal opacity-60">kcal</span></span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/20">
                          <span className="text-[9px] uppercase tracking-wider text-primary font-bold mb-1">Consumido</span>
                          <span className="text-md font-black text-primary">{comidaDia} <span className="text-[10px] font-normal opacity-60">kcal</span></span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/20">
                          <span className="text-[9px] uppercase tracking-wider text-primary font-bold mb-1">Quemado</span>
                          <span className="text-md font-black text-primary">{gastadasTotal} <span className="text-[10px] font-normal opacity-60">kcal</span></span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/20">
                          <span className="text-[9px] uppercase tracking-wider text-primary font-bold mb-1">Restantes</span>
                          <span className="text-md font-black text-primary">{calRestantes} <span className="text-[10px] font-normal opacity-60">kcal</span></span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Distribución de Macronutrientes (Estimación Hoy)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                                Proteínas
                              </span>
                              <span className="text-zinc-500">{gramosProCons}g / {gramosProMeta}g</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pctPro}%` }}></div>
                            </div>
                            <span className="text-[9px] text-zinc-400 block font-medium">Meta: {ratioPro}g/kg para {metabolicProfile.objetivo === "Bajar de Peso (Déficit)" ? "déficit" : "músculo"}</span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                                Carbohidratos
                              </span>
                              <span className="text-zinc-500">{gramosCarbCons}g / {gramosCarbMeta}g</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pctCarb}%` }}></div>
                            </div>
                            <span className="text-[9px] text-zinc-400 block font-medium">Energía y rendimiento muscular</span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                                Grasas
                              </span>
                              <span className="text-zinc-500">{gramosGrasaCons}g / {gramosGrasaMeta}g</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pctGrasa}%` }}></div>
                            </div>
                            <span className="text-[9px] text-zinc-400 block font-medium">Soporte hormonal (~0.9g/kg)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* 3. Hydration Tracker */}
              <div
                className={`p-6 rounded-3xl border flex flex-col justify-between lg:col-span-1 ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-md">Registro de Hidratación</h3>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                      Vasos de Agua
                    </span>
                  </div>

                  {(() => {
                    const todayStr = getLocalDateString(new Date());
                    const activeFecha = selectedHydrationDate || todayStr;
                    const isViewingToday = activeFecha === todayStr;
                    const logActivo = hydrationLogs.find(l => l.fecha === activeFecha);
                    const cantidadHoy = logActivo ? logActivo.cantidadVasos : 0;
                    const metaVasos = 10;
                    const pctHid = Math.min(100, Math.round((cantidadHoy / metaVasos) * 100));
                    const isCompleted = cantidadHoy >= metaVasos;

                    return (
                      <div className="space-y-4">
                        {/* Selector de día si no es hoy */}
                        {!isViewingToday && (
                          <div className="flex items-center justify-between bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 text-xs">
                            <span className="text-primary font-bold">
                              Viendo: {activeFecha}
                            </span>
                            <button
                              onClick={() => setSelectedHydrationDate(todayStr)}
                              className="text-[11px] font-extrabold text-primary hover:underline cursor-pointer"
                            >
                              Volver a Hoy
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-primary">
                                {cantidadHoy} <span className="text-xs font-bold opacity-60">vasos</span>
                              </span>
                              {isCompleted && (
                                <span className="text-[10px] font-extrabold bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  ¡Cumplido!
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400 block mt-0.5">
                              Equivale a {(cantidadHoy * 0.25).toFixed(1)}L (Meta: 2.5L)
                            </span>
                          </div>
                          <div className={`h-12 w-12 rounded-full border flex items-center justify-center font-mono text-xs font-extrabold transition-colors ${
                            isCompleted 
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 shadow-sm"
                              : "border-primary/20 bg-primary/10 text-primary"
                          }`}>
                            {pctHid}%
                          </div>
                        </div>

                        {/* Interactive Glasses */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                              Toca un vaso para registrar consumo
                            </label>
                            {cantidadHoy > 0 && (
                              <button
                                onClick={() => {
                                  handleSaveHydrationLog(activeFecha, 0);
                                  showToast("Registro de agua reiniciado a 0 vasos", "info");
                                }}
                                className="text-[10px] font-bold text-zinc-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Reiniciar vasos del día a 0"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reiniciar</span>
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 justify-start">
                            {Array.from({ length: 10 }).map((_, i) => {
                              const active = i < cantidadHoy;
                              return (
                                <motion.button
                                  key={i}
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    const nuevaCantidad = (active && cantidadHoy === i + 1) ? i : i + 1;
                                    handleSaveHydrationLog(activeFecha, nuevaCantidad);
                                    if (nuevaCantidad >= 10) {
                                      showToast("🎉 ¡Meta de hidratación completada! Has alcanzado los 2.5L de agua diarios.", "success");
                                    } else if (nuevaCantidad > cantidadHoy) {
                                      showToast("¡Vasos de agua registrados! 💧", "success");
                                    } else {
                                      showToast("Registro de agua actualizado", "info");
                                    }
                                  }}
                                  className={`w-7 h-9 rounded-b-xl rounded-t-sm border transition-all relative flex items-center justify-center cursor-pointer ${
                                    active
                                      ? "bg-primary/20 border-primary text-primary shadow-sm"
                                      : "bg-transparent border-slate-300 dark:border-zinc-700 text-slate-400 dark:text-zinc-600 hover:border-primary/50"
                                  }`}
                                >
                                  <span className="text-[8px] font-black">{i + 1}</span>
                                  {active && (
                                    <div className="absolute inset-x-0 bottom-0 bg-primary/30 h-[70%] rounded-b-lg"></div>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Banner de Felicitaciones si cumple la meta */}
                        {isCompleted && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5"
                          >
                            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-extrabold text-xs block leading-tight">
                                ¡Meta Diaria Cumplida! 🎉
                              </span>
                              <span className="text-[10px] opacity-80 block leading-tight mt-0.5">
                                Lograste los 10 vasos (2.5L) para este día.
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* Calendario Semanal de Cumplimiento */}
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-500 dark:text-zinc-400">
                              <CalendarDays className="w-3.5 h-3.5 text-primary" />
                              <span className="uppercase text-[10px] tracking-wider">Cumplimiento Semanal</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {completedHydrationDaysCount}/7 días cumplidos
                            </span>
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {hydrationWeekData.map((d, idx) => {
                              const isSelected = selectedHydrationDate === d.dateStr;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedHydrationDate(d.dateStr)}
                                  className={`p-1.5 sm:p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-primary text-white shadow-md ring-2 ring-primary ring-offset-1 dark:ring-offset-zinc-900"
                                      : d.isCompleted
                                      ? darkMode
                                        ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                                        : "bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                      : d.cantidad > 0
                                      ? darkMode
                                        ? "bg-primary/10 border border-primary/30 text-zinc-200 hover:bg-primary/20"
                                        : "bg-primary/5 border border-primary/20 text-zinc-700 hover:bg-primary/10"
                                      : darkMode
                                      ? "bg-zinc-800/40 border border-zinc-800 text-zinc-500 hover:bg-zinc-800"
                                      : "bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100"
                                  } ${d.isToday && !isSelected ? "ring-1 ring-primary/60" : ""}`}
                                >
                                  <span className={`text-[8px] font-extrabold uppercase ${isSelected ? "text-white/80" : "opacity-70"}`}>
                                    {d.dayLabel}
                                  </span>
                                  <span className={`text-[11px] font-black my-0.5 ${isSelected ? "text-white" : ""}`}>
                                    {d.dayNumber}
                                  </span>
                                  <div className="h-3 flex items-center justify-center">
                                    {d.isCompleted ? (
                                      <Check className={`w-3 h-3 ${isSelected ? "text-white" : "text-emerald-500 font-black"}`} />
                                    ) : d.cantidad > 0 ? (
                                      <span className={`text-[8px] font-bold ${isSelected ? "text-white/90" : "text-primary"}`}>
                                        {d.cantidad}v
                                      </span>
                                    ) : (
                                      <span className="text-[9px] opacity-40">-</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <p className="text-[10px] font-medium text-zinc-500 leading-relaxed bg-primary/5 p-2.5 rounded-2xl border border-primary/10">
                          💧 Mantenerse hidratado optimiza el transporte de macronutrientes, acelera la recuperación y cuida tus riñones.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 4. Body Evolution Graph & Body Measurements List */}
              <div
                className={`p-6 rounded-3xl border flex flex-col justify-between lg:col-span-2 ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-md">Evolución Corporal & Peso</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingMedidaId(null);
                          setMedFecha(new Date().toISOString().substring(0, 10));
                          setMedPeso(currentWeight);
                          setMedCintura(metabolicProfile.cintura || "");
                          setMedCadera(metabolicProfile.cadera || "");
                          setMedCuello(metabolicProfile.cuello || "");
                          setShowMedidasModal(true);
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-primary/10 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Scale className="w-4 h-4" />
                        <span>Registrar Peso / Medidas</span>
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const chartData = [...medidasHistory]
                      .sort((a, b) => {
                        const timeA = a.timestamp || (a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.fecha).getTime());
                        const timeB = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.fecha).getTime());
                        return timeA - timeB;
                      })
                      .slice(-10)
                      .map((m) => {
                        const comidaDia = (alimentacionLogs || [])
                          .filter(l => l.fecha === m.fecha)
                          .reduce((acc, curr) => acc + (curr.calorias || 0), 0);

                        const deporteDia = (deportesActividades || [])
                          .filter(a => a.fechaDesde.startsWith(m.fecha))
                          .reduce((acc, curr) => acc + (curr.calorias || 0), 0);

                        const gymDia = (registrosEntrenamiento || [])
                          .filter(r => r.fecha === m.fecha)
                          .reduce((acc, curr) => acc + (curr.caloriasTotalesSesion || 0), 0);

                        const gastadas = deporteDia + gymDia;
                        const netCalories = comidaDia > 0 || gastadas > 0 ? comidaDia - gastadas : undefined;

                        return {
                          fecha: m.fecha.slice(5),
                          peso: m.peso,
                          netCalories: netCalories,
                        };
                      });

                    const itemsPerPage = 4;
                    const totalPages = Math.max(1, Math.ceil(medidasHistory.length / itemsPerPage));
                    const safePage = Math.min(medidasPage, totalPages);
                    const startIndex = (safePage - 1) * itemsPerPage;
                    const paginatedMedidas = medidasHistory.slice(startIndex, startIndex + itemsPerPage);

                    return (
                      <div className="space-y-4">
                        {chartData.length >= 2 ? (
                          <div className="h-40 w-full text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#27272a" : "#f1f5f9"} vertical={false} />
                                <XAxis dataKey="fecha" stroke={darkMode ? "#71717a" : "#94a3b8"} fontSize={9} tickLine={false} axisLine={false} />
                                <YAxis stroke={darkMode ? "#71717a" : "#94a3b8"} fontSize={9} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: darkMode ? "#18181b" : "#fff",
                                    border: darkMode ? "1px solid #27272a" : "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                  }}
                                  itemStyle={{
                                    color: darkMode ? "#f4f4f5" : "#18181b",
                                  }}
                                />
                                <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="var(--color-primary, #1a73e8)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-32 w-full flex flex-col items-center justify-center border border-dashed border-zinc-500/20 rounded-2xl text-xs text-zinc-500 px-4 text-center space-y-1">
                            <span>Registra al menos 2 mediciones corporales para visualizar el gráfico de tendencia.</span>
                            {medidasHistory.length === 0 && (
                              <span className="text-[10px] text-zinc-400">Actualmente usando el peso de configuración: <strong className="text-primary font-mono">{pesoConfiguracion} kg</strong></span>
                            )}
                          </div>
                        )}

                        <div>
                          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-black/20">
                            <table className="w-full text-left text-[11px] border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase bg-slate-50 dark:bg-black">
                                  <th className="p-2 whitespace-nowrap">Fecha</th>
                                  <th className="p-2 whitespace-nowrap">Peso</th>
                                  <th className="p-2 whitespace-nowrap">Cintura</th>
                                  <th className="p-2 whitespace-nowrap">Cadera</th>
                                  <th className="p-2 whitespace-nowrap">Cuello</th>
                                  <th className="p-2 text-right whitespace-nowrap">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedMedidas.length > 0 ? (
                                  paginatedMedidas.map((m) => (
                                    <tr key={m.id} className="border-b border-slate-100/40 dark:border-zinc-800/20 hover:bg-slate-100/20 dark:hover:bg-zinc-900/30">
                                      <td className="p-2 font-bold whitespace-nowrap">{m.fecha}</td>
                                      <td className="p-2 font-mono text-primary font-bold whitespace-nowrap">{m.peso} kg</td>
                                      <td className="p-2 font-mono whitespace-nowrap">{m.cintura ? `${m.cintura} cm` : "-"}</td>
                                      <td className="p-2 font-mono whitespace-nowrap">{m.cadera ? `${m.cadera} cm` : "-"}</td>
                                      <td className="p-2 font-mono whitespace-nowrap">{m.cuello ? `${m.cuello} cm` : "-"}</td>
                                      <td className="p-2 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            onClick={() => handleEditMedida(m)}
                                            title="Editar"
                                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-primary transition-colors cursor-pointer"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteMedida(m.id)}
                                            title="Eliminar"
                                            className="p-1 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={6} className="p-4 text-center text-zinc-500 text-xs">
                                      No hay registros de mediciones guardados. Se está utilizando el peso base configurado en <span className="font-semibold text-primary">Ajustes &gt; Salud y Datos Físicos ({pesoConfiguracion} kg)</span>.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {medidasHistory.length > itemsPerPage && (
                            <div className="flex items-center justify-between pt-3 px-1 text-xs text-zinc-500 font-medium">
                              <span>
                                Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, medidasHistory.length)} de {medidasHistory.length} registros
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setMedidasPage(p => Math.max(p - 1, 1))}
                                  disabled={safePage <= 1}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                  title="Página Anterior"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-2 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                  {safePage} / {totalPages}
                                </span>
                                <button
                                  onClick={() => setMedidasPage(p => Math.min(p + 1, totalPages))}
                                  disabled={safePage >= totalPages}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                  title="Página Siguiente"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            {/* Activities Summary Charts */}
            <div
              className={`p-6 rounded-3xl border w-full space-y-6 ${
                darkMode
                  ? "bg-zinc-900/60 border-zinc-800/80 text-white shadow-lg backdrop-blur-md"
                  : "bg-white/80 border-slate-200/80 text-slate-800 shadow-sm backdrop-blur-md"
              }`}
            >
              {(() => {
                // 1. Sincronización combinada con Historial de Sesiones (Deportes + Gym)
                const allSessionItems = [
                  ...(deportesActividades || []).map((act) => {
                    const cal = Number(act.calorias) || 0;
                    const pts = Number(act.puntos) || (cal > 0 ? Math.round(cal / 10) : 10);
                    let dur = 30;
                    if (act.tiempoMovimiento) {
                      const hMatch = act.tiempoMovimiento.match(/(\d+)\s*h/i);
                      const mMatch = act.tiempoMovimiento.match(/(\d+)\s*m/i);
                      const h = hMatch ? parseInt(hMatch[1], 10) : 0;
                      const m = mMatch ? parseInt(mMatch[1], 10) : 0;
                      if (h > 0 || m > 0) dur = h * 60 + m;
                    }
                    const fechaRaw = act.fechaDesde || new Date().toISOString();
                    const rawClean = fechaRaw.split("T")[0].split(" ")[0];
                    const parts = rawClean.split("-");
                    const fechaShort = parts.length === 3 ? `${parts[1]}/${parts[2]}` : rawClean;
                    return {
                      id: act.id,
                      nombre: act.informacion || "Actividad Física",
                      puntos: pts,
                      calorias: cal,
                      duracionMin: dur,
                      fechaRaw,
                      fechaCorta: fechaShort,
                    };
                  }),
                  ...(registrosEntrenamiento || []).map((reg) => {
                    const cal = Number(reg.caloriasTotalesSesion) || 0;
                    const dur = Number(reg.duracionMinutos) || 45;
                    const pts = (reg as any).puntos || (cal > 0 ? Math.round(cal / 10) : Math.round(dur * 2));
                    const fechaRaw = reg.fecha || new Date().toISOString();
                    const rawClean = fechaRaw.split("T")[0].split(" ")[0];
                    const parts = rawClean.split("-");
                    const fechaShort = parts.length === 3 ? `${parts[1]}/${parts[2]}` : rawClean;
                    return {
                      id: reg.id,
                      nombre: reg.rutinaNombre || "Gimnasio",
                      puntos: pts,
                      calorias: cal,
                      duracionMin: dur,
                      fechaRaw,
                      fechaCorta: fechaShort,
                    };
                  }),
                ];

                // Totales globales para tarjetas de métricas
                const totalPts = allSessionItems.reduce((acc, curr) => acc + curr.puntos, 0);
                const totalCal = allSessionItems.reduce((acc, curr) => acc + curr.calorias, 0);
                const totalDur = allSessionItems.reduce((acc, curr) => acc + curr.duracionMin, 0);
                const totalCount = allSessionItems.length;

                // Agrupación para gráfico de Donut (Puntos por actividad)
                const pointsMap: Record<string, number> = {};
                allSessionItems.forEach((item) => {
                  pointsMap[item.nombre] = (pointsMap[item.nombre] || 0) + item.puntos;
                });
                const pieData = Object.entries(pointsMap)
                  .map(([name, value]) => ({ name, value }))
                  .filter((d) => d.value > 0)
                  .sort((a, b) => b.value - a.value);

                // Agrupación para gráfico de Líneas (Calorías gastadas en el tiempo)
                const caloriesMap: Record<string, { fecha: string; calorias: number; dateObj: Date }> = {};
                allSessionItems.forEach((item) => {
                  const dateStr = item.fechaRaw.replace(" ", "T");
                  const dObj = new Date(dateStr);
                  const fechaLimpia = (item.fechaRaw || '').split('T')[0].split(' ')[0] || 'Hoy';
                  if (!caloriesMap[fechaLimpia]) {
                    caloriesMap[fechaLimpia] = {
                      fecha: fechaLimpia,
                      calorias: 0,
                      dateObj: isNaN(dObj.getTime()) ? new Date() : dObj,
                    };
                  }
                  caloriesMap[fechaLimpia].calorias += item.calorias;
                });
                const lineData = Object.values(caloriesMap).sort(
                  (a, b) => a.dateObj.getTime() - b.dateObj.getTime()
                );

                // Escala de color dinámica basada en el color de acento principal (var(--color-primary))
                const totalPieEntries = Math.max(pieData.length, 1);
                const primaryPalette = pieData.map((_, index) => {
                  const opacityPercent = Math.max(
                    30,
                    Math.round(100 - (index * 65) / Math.max(totalPieEntries - 1, 1))
                  );
                  return `color-mix(in srgb, var(--color-primary) ${opacityPercent}%, ${darkMode ? "#27272a" : "#cbd5e1"})`;
                });

                return (
                  <>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <h3 className="font-bold text-md">Resumen de Actividades</h3>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                            Sincronizado dinámicamente con tu historial de sesiones y deportes
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleOpenActividadModal}
                        className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-full flex items-center gap-2 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[3px]" />
                        <span>Añadir Actividad</span>
                      </button>
                    </div>

                    {/* Tarjetas de Métricas Clave Sincronizadas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                          <Zap className="w-4 h-4 fill-primary" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                            Puntos
                          </span>
                          <span className="text-base font-black text-primary">
                            {totalPts} <span className="text-[10px] font-bold">pts</span>
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                          <Flame className="w-4 h-4 fill-primary" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                            Calorías
                          </span>
                          <span className="text-base font-black text-primary">
                            {totalCal} <span className="text-[10px] font-bold">kcal</span>
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                            Duración
                          </span>
                          <span className="text-base font-black text-primary">
                            {totalDur >= 60 ? `${Math.floor(totalDur / 60)}h ${totalDur % 60}m` : `${totalDur}m`}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                          <Activity className="w-3.5 h-3.5 flex-shrink-0" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                            Sesiones
                          </span>
                          <span className="text-base font-black text-primary">
                            {totalCount} <span className="text-[10px] font-bold">reg.</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Puntos Pie Chart */}
                      <div
                        className={`p-4 rounded-2xl border ${
                          darkMode
                            ? "bg-zinc-950/40 border-zinc-800/80 shadow-inner"
                            : "bg-slate-50/70 border-slate-200/80 shadow-inner"
                        }`}
                      >
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-4 text-center flex items-center justify-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-primary fill-primary/30" />
                          Puntos Ganados por Actividad
                        </h4>
                        {pieData.length > 0 ? (
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={78}
                                  paddingAngle={4}
                                  cornerRadius={8}
                                  dataKey="value"
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={primaryPalette[index % primaryPalette.length]}
                                      stroke={darkMode ? "#18181b" : "#ffffff"}
                                      strokeWidth={2}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: darkMode ? "#18181b" : "#ffffff",
                                    border: "1px solid var(--color-primary)",
                                    borderRadius: "14px",
                                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                  }}
                                  itemStyle={{
                                    color: "var(--color-primary)",
                                  }}
                                />
                                <Legend
                                  iconType="circle"
                                  formatter={(value) => (
                                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                      {value}
                                    </span>
                                  )}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-64 w-full flex items-center justify-center text-xs text-zinc-500 font-medium italic">
                            No hay registros de puntos en el historial
                          </div>
                        )}
                      </div>

                      {/* Calorias Line Chart */}
                      <div
                        className={`p-4 rounded-2xl border ${
                          darkMode
                            ? "bg-zinc-950/40 border-zinc-800/80 shadow-inner"
                            : "bg-slate-50/70 border-slate-200/80 shadow-inner"
                        }`}
                      >
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-4 text-center flex items-center justify-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-primary fill-primary/30" />
                          Calorías Gastadas en el Tiempo
                        </h4>
                        <div className="h-64 min-h-[220px] w-full text-xs">
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart
                              data={lineData.length > 0 ? lineData : [{ fecha: 'Sin datos', calorias: 0, dateObj: new Date() }]}
                              margin={{ top: 10, right: 10, bottom: 5, left: -20 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke={darkMode ? "#27272a" : "#f1f5f9"}
                                vertical={false}
                              />
                              <XAxis
                                dataKey="fecha"
                                stroke={darkMode ? "#71717a" : "#94a3b8"}
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => (typeof val === 'string' ? val.split('T')[0] : val)}
                              />
                              <YAxis
                                stroke={darkMode ? "#71717a" : "#94a3b8"}
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: darkMode ? "#18181b" : "#fff",
                                  border: darkMode ? "1px solid #27272a" : "1px solid #e2e8f0",
                                  borderRadius: "12px",
                                }}
                                itemStyle={{
                                  color: darkMode ? "#f4f4f5" : "#18181b",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="calorias"
                                name="Calorías (kcal)"
                                stroke="var(--color-primary, #1a73e8)"
                                strokeWidth={3}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            </div>
          </div>
        </>
      )}



      {activeSubTab === "deporte_alimentacion" && (
        <div className="space-y-6">
          {/* Selector de Pestañas style matching Inversiones */}
          {/* Selector de Pestañas internas (Deportes, Rutina, Alimentación) */}
          <div className="flex items-center justify-center gap-2 mb-8 w-full max-w-full px-2 mx-auto">
            <button
              onClick={scrollDeporteAlimTabsLeft}
              className={`pointer-events-auto p-1.5 rounded-full bg-white/90 dark:bg-black/95 border border-zinc-200/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-md hover:text-primary dark:hover:text-white transition-all cursor-pointer flex sm:hidden items-center justify-center shrink-0 w-8 h-8 ${["rutina","alimentacion","registro_diario"].indexOf(deporteAlimActiveTab) === 0 ? "opacity-30 pointer-events-none" : ""}`}
              aria-label="Desplazar izquierda"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
            </button>

            <div className="relative min-w-0 max-w-full">
              <div
                ref={deporteAlimScrollRef}
                className="flex items-center justify-start sm:justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-md w-full max-w-full overflow-x-auto scroll-smooth scrollbar-none whitespace-nowrap"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <button
                  onClick={(e) => { setDeporteAlimActiveTab("rutina"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                    deporteAlimActiveTab === "rutina"
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  <Dumbbell className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap shrink-0 font-bold">Rutina</span>
                  {deporteAlimActiveTab === "rutina" && (
                    <motion.div
                      layoutId="activeDeporteAlimTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>

                <button
                  onClick={(e) => { setDeporteAlimActiveTab("alimentacion"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                    deporteAlimActiveTab === "alimentacion"
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  <Utensils className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap shrink-0 font-bold">Alimentación</span>
                  {deporteAlimActiveTab === "alimentacion" && (
                    <motion.div
                      layoutId="activeDeporteAlimTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>

                <button
                  onClick={(e) => { setDeporteAlimActiveTab("registro_diario"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                    deporteAlimActiveTab === "registro_diario"
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap shrink-0 font-bold">Historial Diario</span>
                  {deporteAlimActiveTab === "registro_diario" && (
                    <motion.div
                      layoutId="activeDeporteAlimTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={scrollDeporteAlimTabsRight}
              className={`pointer-events-auto p-1.5 rounded-full bg-white/90 dark:bg-black/95 border border-zinc-200/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-md hover:text-primary dark:hover:text-white transition-all cursor-pointer flex sm:hidden items-center justify-center shrink-0 w-8 h-8 ${["rutina","alimentacion","registro_diario"].indexOf(deporteAlimActiveTab) === 2 ? "opacity-30 pointer-events-none" : ""}`}
              aria-label="Desplazar derecha"
            >
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {deporteAlimActiveTab === "rutina" && (
              <motion.div
                key="rutina"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <GymRutinaView
                  darkMode={darkMode}
                  userEmail={userEmail}
                  token={token}
                  rutinasGimnasio={rutinasGimnasio}
                  setRutinasGimnasio={setRutinasGimnasio}
                  registrosEntrenamiento={registrosEntrenamiento}
                  setRegistrosEntrenamiento={setRegistrosEntrenamiento}
                  showToast={showToast}
                  askConfirmation={askConfirmation}
                  onOpenActividadModal={handleOpenActividadModal}
                  deportesActividades={deportesActividades}
                  onDeleteActividad={handleDeleteActividad}
                  onEditActividad={handleEditActividad}
                />
              </motion.div>
            )}

            {deporteAlimActiveTab === "alimentacion" && (
              <motion.div
                key="alimentacion"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
                } space-y-6 shadow-xs`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Activity className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-extrabold tracking-tight">
                        Registro de Alimentación
                      </h2>
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                      Lleva un control de tus comidas y calorías.
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={handleOpenAlimModal}
                    className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-primary/10"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Registro</span>
                  </motion.button>
                </div>

                {/* Mini Calendario Semanal - Alimentación */}
                <div className={`p-4 sm:p-6 rounded-3xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"} space-y-3`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Resumen de Alimentación Semanal
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {alimWeekData.map((day, dIdx) => {
                      const isToday = new Date().toDateString() === day.dateObj.toDateString();
                      const isSelected = selectedAlimDate && selectedAlimDate.toDateString() === day.dateObj.toDateString();
                      return (
                        <div
                          key={dIdx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAlimDate(null);
                            } else {
                              setSelectedAlimDate(day.dateObj);
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
                            {Math.round(day.calories)} kcal
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Filter Status */}
                {selectedAlimDate && (
                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                      Mostrando comidas del: <span className="font-extrabold text-slate-800 dark:text-zinc-200">{selectedAlimDate.toLocaleDateString("es-AR", { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </span>
                    <button
                      onClick={() => setSelectedAlimDate(null)}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                    >
                      Limpiar filtro
                    </button>
                  </div>
                )}
                
                
                
                
                {/* List Table */}
                <div className="space-y-3">
                  {(() => {
                    let filteredLogs = alimentacionLogs.filter(log => {
                      if (!selectedAlimDate) return true;
                      if (!log.fecha) return false;
                      const [y, m, d] = log.fecha.split('-').map(Number);
                      const dObj = new Date(y, m - 1, d);
                      return dObj.toDateString() === selectedAlimDate.toDateString();
                    });
                    
                    filteredLogs.sort(
                          (a, b) =>
                            new Date(b.fecha).getTime() -
                            new Date(a.fecha).getTime()
                    );
                    
                    if (!selectedAlimDate) {
                        filteredLogs = filteredLogs.slice(0, 5);
                    }

                    if (filteredLogs.length === 0) {
                      return (
                        <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                          <Utensils className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-3" />
                          <p className="text-sm font-bold text-slate-400 dark:text-zinc-500">No hay comidas registradas para este día.</p>
                        </div>
                      );
                    }

                    return filteredLogs.map((log) => {
                          const platoInfo = platos?.find(
                            (p) => p.id === log.platoId,
                          );
                          const portions = log.cantidad || 1;
                          
                          let p = 0, c = 0, g = 0;
                          const hasCustomValores = log.valoresNutricionales && (
                            (log.valoresNutricionales.proteinas || 0) > 0 ||
                            (log.valoresNutricionales.carbohidratos || 0) > 0 ||
                            (log.valoresNutricionales.grasas || 0) > 0
                          );

                          if (hasCustomValores || platoInfo) {
                            try {
                              const vnBase = log.valoresNutricionales || (platoInfo ? calcularNutricionPlato(platoInfo, alimentos || [], mercaderia || []) : null);
                              if (vnBase) {
                                const factor = log.valoresNutricionales ? 1 : portions;
                                p = Math.round((vnBase.proteinas || 0) * factor);
                                c = Math.round((vnBase.carbohidratos || 0) * factor);
                                g = Math.round((vnBase.grasas || 0) * factor);
                              }
                            } catch (e) {
                              console.error("[HealthView] Error calculating nutrition log:", e);
                            }
                          }
                          
                          let fechaDate = new Date(log.fecha + "T12:00:00");

                          return (
                            <div
                              key={log.id}
                              className={`p-5 rounded-3xl border transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"} space-y-3`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/60 pb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                      {log.fecha ? fechaDate.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "FECHA DESCONOCIDA"}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0">
                                      <Utensils className="w-2.5 h-2.5" /> COMIDAS
                                    </span>
                                  </div>
                                  <h4 className="text-base font-extrabold">{log.estado} {platoInfo ? `- ${platoInfo.nombrePlato}` : ""}</h4>
                                </div>
                                
                                <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono font-bold w-full sm:w-auto">
                                  <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full">
                                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0 whitespace-nowrap text-[11px] sm:text-xs">
                                      <Flame className="w-3.5 h-3.5 fill-current" /> {log.calorias} kcal
                                    </span>
                                    {(p > 0 || c > 0 || g > 0) && (
                                      <>
                                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0 whitespace-nowrap text-[11px] sm:text-xs">
                                          P: {p}g
                                        </span>
                                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0 whitespace-nowrap text-[11px] sm:text-xs">
                                          C: {c}g
                                        </span>
                                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0 whitespace-nowrap text-[11px] sm:text-xs">
                                          G: {g}g
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-1 ml-1 sm:ml-2 border-l border-zinc-200/60 dark:border-zinc-800/80 pl-1.5 sm:pl-2 shrink-0">
                                    <button
                                      onClick={() => handleDeleteAlimLog(log.id)}
                                      className="p-1.5 text-slate-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-1.5">
                                {log.ingredientesConsumidos && log.ingredientesConsumidos.length > 0 ? (
                                  log.ingredientesConsumidos.map((ing, iIdx) => (
                                    (() => {
                                      const baseNutri = getIngredientNutriVal(ing.ingrediente, mercaderia || []);
                                      const factor = ing.cantidad / 100;
                                      const p = Math.round(baseNutri.proteinas * factor);
                                      const c = Math.round(baseNutri.carbohidratos * factor);
                                      const g = Math.round(baseNutri.grasas * factor);
                                      
                                      return (
                                        <div key={iIdx} className={`py-1.5 px-3 rounded-xl border flex flex-col justify-center ${darkMode ? "bg-zinc-900/40 border-zinc-800/60" : "bg-zinc-50 border-zinc-200/60"}`}>
                                          <div className="flex items-baseline gap-1.5">
                                            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">{ing.ingrediente}</span>
                                            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">{ing.cantidad} {ing.unidad}</span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-primary font-black flex items-center gap-1 whitespace-nowrap">
                                              <Flame className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" /> {Math.round(ing.calorias)} kcal
                                            </span>
                                            {(p > 0 || c > 0 || g > 0) && (
                                              <>
                                                <div className="h-3.5 w-px bg-slate-200 dark:bg-zinc-700/60"></div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-primary whitespace-nowrap">
                                                    <span>P: {p}g</span>
                                                    <span>C: {c}g</span>
                                                    <span>G: {g}g</span>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()
                                  ))
                                ) : platoInfo ? (
                                  <div className={`py-1.5 px-3 rounded-xl border flex flex-col justify-center ${darkMode ? "bg-zinc-900/40 border-zinc-800/60" : "bg-zinc-50 border-zinc-200/60"}`}>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">{platoInfo.nombrePlato}</span>
                                      <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">{log.cantidad || 1} porción(es)</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs text-primary font-black flex items-center gap-1 whitespace-nowrap">
                                        <Flame className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" /> {log.calorias} kcal
                                      </span>
                                      {(p > 0 || c > 0 || g > 0) && (
                                          <>
                                            <div className="h-3.5 w-px bg-slate-200 dark:bg-zinc-700/60"></div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-primary whitespace-nowrap">
                                                <span>P: {p}g</span>
                                                <span>C: {c}g</span>
                                                <span>G: {g}g</span>
                                            </div>
                                          </>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">Resumen general. No hay detalles de ingredientes.</p>
                                )}
                              </div>
                            </div>
                          );
                        });
                  })()}
                </div>
              </motion.div>
            )}

            {deporteAlimActiveTab === "registro_diario" && (
              <motion.div
                key="registro_diario"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
                } space-y-6 shadow-xs`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-zinc-100">
                        Historial Diario
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                      Resumen metabólico día a día.
                    </p>
                  </div>
                </div>

                {/* Resumen Semanal Mini Calendario */}
                <div className={`p-4 sm:p-6 rounded-3xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Resumen Semanal de Actividad
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {diarioWeekData.map((day, dIdx) => {
                      const isToday = new Date().toDateString() === day.dateObj.toDateString();
                      const isSelected = selectedDiarioDate && selectedDiarioDate.toDateString() === day.dateObj.toDateString();
                      return (
                        <div
                          key={dIdx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDiarioDate(null);
                            } else {
                              setSelectedDiarioDate(day.dateObj);
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
                          <span className={`text-[8px] font-mono font-bold mt-1.5 ${isSelected ? "text-white/90" : day.balance !== 0 || day.hasActivity ? "text-primary font-black" : "text-slate-400 dark:text-zinc-600"}`}>
                            {Math.round(day.balance)} kcal
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                    Últimos 14 días
                  </span>
                  {selectedDiarioDate && (
                    <button
                      onClick={() => setSelectedDiarioDate(null)}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                    >
                      Limpiar filtro
                    </button>
                  )}
                </div>

                {/* List Table */}
                <div className="space-y-3">
                  {(() => {
                        const dias = [];
                        const hoy = new Date();
                        for (let i = 0; i < 14; i++) {
                          const d = new Date(hoy.getTime() - i * 24 * 60 * 60 * 1000);
                          const fechaStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
                          dias.push(fechaStr);
                        }
                        
                        let filteredDias = dias.filter(diaStr => {
                          if (selectedDiarioDate) {
                              const [y, m, d] = diaStr.split('-').map(Number);
                              const dateObj = new Date(y, m - 1, d);
                              return dateObj.toDateString() === selectedDiarioDate.toDateString();
                          }
                          
                          const comidaDia = (alimentacionLogs || []).filter(l => l.fecha === diaStr).reduce((acc, curr) => acc + (curr.calorias || 0), 0);
                          const deporteDia = (deportesActividades || []).filter(a => a.fechaDesde.startsWith(diaStr)).reduce((acc, curr) => acc + (curr.calorias || 0), 0);
                          const gymDia = (registrosEntrenamiento || []).filter(r => r.fecha === diaStr).reduce((acc, curr) => acc + (curr.caloriasTotalesSesion || 0), 0);
                          
                          return comidaDia > 0 || deporteDia > 0 || gymDia > 0;
                        });
                        
                        if (!selectedDiarioDate) {
                            filteredDias = filteredDias.slice(0, 5);
                        }

                        if (filteredDias.length === 0) {
                          return (
                            <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                              <Activity className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-3" />
                              <p className="text-sm font-bold text-slate-400 dark:text-zinc-500">No hay historial registrado para este día.</p>
                            </div>
                          );
                        }

                        return filteredDias.map((diaStr) => {
                          const dateObj = new Date(diaStr + "T12:00:00");
                          const medidaDia = medidasHistory.find(m => m.fecha === diaStr);
                          const pesoDia = medidaDia ? `${medidaDia.peso} kg` : "-";

                          const comidaDia = (alimentacionLogs || [])
                            .filter(l => l.fecha === diaStr)
                            .reduce((acc, curr) => acc + (curr.calorias || 0), 0);
                            
                          const deporteDia = (deportesActividades || [])
                            .filter(a => a.fechaDesde.startsWith(diaStr))
                            .reduce((acc, curr) => acc + (curr.calorias || 0), 0);
                            
                          const gymDia = (registrosEntrenamiento || [])
                            .filter(r => r.fecha === diaStr)
                            .reduce((acc, curr) => acc + (curr.caloriasTotalesSesion || 0), 0);
                            
                          const gastadasTotal = deporteDia + gymDia;
                          const balanceNeto = comidaDia - gastadasTotal;

                          const currentWeight = medidaDia?.peso || metabolicProfile.pesoActual;
                          const bmr = metabolicProfile.genero === "Masculino"
                            ? 10 * currentWeight + 6.25 * metabolicProfile.altura - 5 * metabolicProfile.edad + 5
                            : 10 * currentWeight + 6.25 * metabolicProfile.altura - 5 * metabolicProfile.edad - 161;
                            
                          const factAct = selectedActivityFactor;
                          const tdee = bmr * factAct;
                          
                          let metaCalorias = tdee;
                          if (metabolicProfile.objetivo === "Bajar de Peso (Déficit)") {
                            metaCalorias -= 500;
                          } else if (metabolicProfile.objetivo === "Ganar Masa Muscular (Superávit)") {
                            metaCalorias += 400;
                          }
                          
                          let cumplio = false;
                          if (comidaDia > 0) {
                            if (metabolicProfile.objetivo === "Bajar de Peso (Déficit)") {
                              cumplio = comidaDia <= metaCalorias + 100;
                            } else if (metabolicProfile.objetivo === "Ganar Masa Muscular (Superávit)") {
                              cumplio = comidaDia >= metaCalorias - 150;
                            } else {
                              cumplio = Math.abs(comidaDia - metaCalorias) <= 200;
                            }
                          }
                          
                          const isToday = diaStr === new Date().toISOString().substring(0, 10);

                          return (
                            <div
                              key={diaStr}
                              className={`p-5 rounded-3xl border transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"} space-y-3 ${isToday ? "ring-2 ring-primary/30" : ""}`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/60 pb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                      {dateObj.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0">
                                      <Activity className="w-2.5 h-2.5" /> RESUMEN DIARIO
                                    </span>
                                  </div>
                                  <h4 className="text-base font-extrabold text-slate-800 dark:text-zinc-100">Balance Neto: <span className="text-primary">{balanceNeto > 0 ? `+${balanceNeto}` : balanceNeto} kcal</span></h4>
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs font-mono font-bold flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {comidaDia > 0 ? (
                                      cumplio ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Objetivo Cumplido
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                                          <Info className="w-3.5 h-3.5" /> Fuera de Rango
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-zinc-400 text-xs">Sin registros calóricos</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-1.5">
                                <div className={`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 ${darkMode ? "bg-zinc-900/40 border-zinc-800/60" : "bg-zinc-50 border-zinc-200/60"}`}>
                                   <span className="font-bold block truncate text-slate-800 dark:text-zinc-200 flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-primary" /> Alimentación</span>
                                   <div className="flex items-center justify-between mt-1">
                                     <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">Total Consumido</span>
                                     <span className="text-xs text-primary font-black flex items-center gap-1">
                                       {comidaDia} kcal
                                     </span>
                                   </div>
                                </div>
                                
                                <div className={`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 ${darkMode ? "bg-zinc-900/40 border-zinc-800/60" : "bg-zinc-50 border-zinc-200/60"}`}>
                                   <span className="font-bold block truncate text-slate-800 dark:text-zinc-200 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-primary" /> Gasto Activo</span>
                                   <div className="flex items-center justify-between mt-1">
                                     <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">Gym + Deporte</span>
                                     <span className="text-xs text-primary font-black flex items-center gap-1">
                                       {gastadasTotal} kcal
                                     </span>
                                   </div>
                                </div>
                                
                                <div className={`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 ${darkMode ? "bg-zinc-900/40 border-zinc-800/60" : "bg-zinc-50 border-zinc-200/60"}`}>
                                   <span className="font-bold block truncate text-slate-800 dark:text-zinc-200 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-primary" /> Peso Corporal</span>
                                   <div className="flex items-center justify-between mt-1">
                                     <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">Registrado / Actual</span>
                                     <span className="text-xs text-primary font-black flex items-center gap-1">
                                       {pesoDia}
                                     </span>
                                   </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                  })()}
                </div>
              </motion.div>
            )}
</AnimatePresence>

        </div>
      )}

      {activeSubTab === "control_clinico" && (
        <div className="space-y-6">
          {clinicoPartnerInfo.isLinked && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 px-4 rounded-2xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary dark:text-blue-200 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>
                  Base de datos de Control Clínico vinculada con: <strong className="text-zinc-900 dark:text-white">{clinicoPartnerInfo.partnerEmail}</strong>
                </span>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-primary/20 px-2.5 py-0.5 rounded-full">
                Sincronización en Vivo
              </span>
            </div>
          )}

          {/* Selector de Pestañas Control Clínico */}
          <div className="flex items-center justify-center gap-2 mb-8 w-full max-w-full px-2 mx-auto">
            <button
              onClick={scrollClinicoTabsLeft}
              className={`pointer-events-auto p-1.5 rounded-full bg-white/90 dark:bg-black/95 border border-zinc-200/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-md hover:text-primary dark:hover:text-white transition-all cursor-pointer flex sm:hidden items-center justify-center shrink-0 w-8 h-8 ${["doctores","presion","estudios","medicamentos"].indexOf(clinicoActiveTab) === 0 ? "opacity-30 pointer-events-none" : ""}`}
              aria-label="Desplazar izquierda"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
            </button>

            <div className="relative min-w-0 max-w-full">
              <div
                ref={clinicoScrollRef}
                className="flex items-center justify-start sm:justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-md w-full max-w-full overflow-x-auto scroll-smooth scrollbar-none whitespace-nowrap"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <button
                  onClick={(e) => { setClinicoActiveTab("doctores"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                    clinicoActiveTab === "doctores"
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  <Stethoscope className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap font-bold">Doctores</span>
                  {clinicoActiveTab === "doctores" && (
                    <motion.div
                      layoutId="activeClinicoTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>

                <button
                  onClick={(e) => { setClinicoActiveTab("presion"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                    clinicoActiveTab === "presion"
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  <Heart className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap font-bold">Presión Arterial</span>
                  {clinicoActiveTab === "presion" && (
                    <motion.div
                      layoutId="activeClinicoTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>

                <button
                  onClick={(e) => { setClinicoActiveTab("estudios"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                    clinicoActiveTab === "estudios"
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap font-bold">Estudios e Informes</span>
                  {clinicoActiveTab === "estudios" && (
                    <motion.div
                      layoutId="activeClinicoTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>

                <button
                  onClick={(e) => { setClinicoActiveTab("medicamentos"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                    clinicoActiveTab === "medicamentos"
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  <Pill className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap font-bold">Medicamentos</span>
                  {clinicoActiveTab === "medicamentos" && (
                    <motion.div
                      layoutId="activeClinicoTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={scrollClinicoTabsRight}
              className={`pointer-events-auto p-1.5 rounded-full bg-white/90 dark:bg-black/95 border border-zinc-200/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-md hover:text-primary dark:hover:text-white transition-all cursor-pointer flex sm:hidden items-center justify-center shrink-0 w-8 h-8 ${["doctores","presion","estudios","medicamentos"].indexOf(clinicoActiveTab) === 3 ? "opacity-30 pointer-events-none" : ""}`}
              aria-label="Desplazar derecha"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={clinicoActiveTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {clinicoActiveTab === "doctores" && (
                <div
                  className={`p-6 rounded-3xl border ${
                    darkMode
                      ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                      : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
                  } space-y-6 shadow-xs`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-extrabold flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-primary" />
                        Listado de Doctores
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Administración y visualización de profesionales médicos, sus
                        especialidades y consultorios.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenAddDoctorModal}
                      className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-primary/10 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Registrar Doctor/a</span>
                    </button>
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input
                        type="text"
                        placeholder="Buscar doctor..."
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
                      />
                    </div>

                    <CustomSelect
                      value={docFilterSpecialty}
                      onChange={(val) => setDocFilterSpecialty(val)}
                      size="sm"
                      darkMode={darkMode}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                      options={filterSpecialtyOptions}
                      searchable={true}
                      allowCustom={true}
                      onAddCustom={handleAddCustomSpecialty}
                      onRemoveOption={handleRemoveSpecialty}
                    />

                    <CustomSelect
                      value={docFilterConsultorio}
                      onChange={(val) => setDocFilterConsultorio(val)}
                      size="sm"
                      darkMode={darkMode}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                      options={filterConsultorioOptions}
                      searchable={true}
                      allowCustom={true}
                      onAddCustom={handleAddCustomConsultorio}
                      onRemoveOption={handleRemoveConsultorio}
                    />
                  </div>

                  {/* Interactive Table */}
                  <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead className="sticky top-0 z-20">
                        <tr
                          className={`text-[11px] font-extrabold uppercase tracking-wider ${ darkMode ?"bg-zinc-900/50 text-zinc-400"
                              : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          <th className="px-4 py-4 whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[220px] sm:min-w-[260px] max-w-[300px]">
                            <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Médico</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Especialidad</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Lugar</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Contacto</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="">
                        {filteredDoctors.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-12 text-center text-slate-500 dark:text-zinc-500"
                            >
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Stethoscope className="w-8 h-8 text-slate-300 dark:text-zinc-700 animate-pulse" />
                                <p className="font-semibold text-slate-700 dark:text-zinc-300">
                                  No se encontraron doctores registrados
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-zinc-600">
                                  Comienza registrando a tus profesionales médicos para
                                  tenerlos a mano.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredDoctors.map((doc) => (
                            <tr
                              key={doc.id}
                              className="group hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 transition-all cursor-pointer"
                            >
                              <td className="px-4 py-4 whitespace-nowrap md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[220px] sm:min-w-[260px] max-w-[300px]">
                                <div className="font-bold text-slate-900 dark:text-zinc-100 truncate block" title={doc.name}>
                                  {doc.name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className="inline-flex items-center px-1.5 py-[0px] rounded-full text-[7px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20"
                                >
                                  {doc.specialty}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-750 dark:text-zinc-200">
                                {doc.address || "No asignado"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-medium font-mono text-slate-500 dark:text-zinc-400">
                                {doc.phone || "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditDoctorModal(doc)}
                                    className="p-1.5 text-zinc-500 hover:text-primary hover:bg-primary-container dark:hover:bg-primary-container rounded-full transition-all cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDoctor(doc.id)}
                                    className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                    <span>Total de registros: {filteredDoctors.length}</span>
                  </div>
                </div>
              )}

              {clinicoActiveTab === "medicamentos" && (
                <div className="space-y-6">
                  {/* Selector de Pestañas Medicamentos */}
                  <div className="flex items-center justify-center gap-2 mb-8 w-full max-w-full px-2 mx-auto">
                    <button
                      onClick={scrollMedsTabsLeft}
                      className={`pointer-events-auto p-1.5 rounded-full bg-white/90 dark:bg-black/95 border border-zinc-200/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-md hover:text-primary dark:hover:text-white transition-all cursor-pointer flex sm:hidden items-center justify-center shrink-0 w-8 h-8 ${["historial","stock"].indexOf(medsActiveTab) === 0 ? "opacity-30 pointer-events-none" : ""}`}
                      aria-label="Desplazar izquierda"
                    >
                      <ChevronLeft className="w-4 h-4 shrink-0" />
                    </button>

                    <div className="relative min-w-0 max-w-full">
                      <div
                        ref={medsScrollRef}
                        className="flex items-center justify-start sm:justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-md w-full max-w-full overflow-x-auto scroll-smooth scrollbar-none whitespace-nowrap"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                      >
                        <button
                          onClick={(e) => { setMedsActiveTab("historial"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                          className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                            medsActiveTab === "historial"
                              ? "text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                          }`}
                        >
                          <Pill className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap shrink-0 font-bold">Historial de Consumo</span>
                          {medsActiveTab === "historial" && (
                            <motion.div
                              layoutId="activeMedsTabIndicator"
                              className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                        </button>

                        <button
                          onClick={(e) => { setMedsActiveTab("stock"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                          className={`relative md:!flex-1 shrink-0 py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                            medsActiveTab === "stock"
                              ? "text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                          }`}
                        >
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap shrink-0 font-bold">Stock y Disponibilidad</span>
                          {medsActiveTab === "stock" && (
                            <motion.div
                              layoutId="activeMedsTabIndicator"
                              className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={scrollMedsTabsRight}
                      className={`pointer-events-auto p-1.5 rounded-full bg-white/90 dark:bg-black/95 border border-zinc-200/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-md hover:text-primary dark:hover:text-white transition-all cursor-pointer flex sm:hidden items-center justify-center shrink-0 w-8 h-8 ${["historial","stock"].indexOf(medsActiveTab) === 1 ? "opacity-30 pointer-events-none" : ""}`}
                      aria-label="Desplazar derecha"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Secondary container (card) */}
                  <div
                    className={`p-6 rounded-3xl border ${
                      darkMode
                        ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"
                        : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                          {medsActiveTab === "historial" ? (
                            <Pill className="w-3.5 h-3.5 flex-shrink-0" />
                          ) : (
                            <Clock className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight">
                            {medsActiveTab === "historial"
                              ? "Historial y Control de Medicamentos"
                              : "Disponibilidad de Medicamentos"}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            {medsActiveTab === "historial"
                              ? "Consulta y gestiona de manera detallada todos tus medicamentos activos, dosificaciones y estados de consumo."
                              : "Control automático del remanente y proyección de compra para cada tratamiento."}
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={medsActiveTab === "historial" ? openAddModal : handleOpenAddDisp}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-xs w-full sm:w-auto mt-2 sm:mt-0 sm:self-center"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          {medsActiveTab === "historial" ? "Agregar Medicamento" : "Registrar Disponibilidad"}
                        </span>
                      </motion.button>
                    </div>

                  <AnimatePresence mode="wait">
                    {medsActiveTab === "historial" ? (
                      <motion.div
                        key="historial"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                        {/* Filters Bar */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
                    {/* Search query */}
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input
                        type="text"
                        placeholder="Buscar por marca o droga..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
                      />
                    </div>

                    {/* Filter by Estado */}
                    <CustomSelect
                      value={filterEstado}
                      onChange={(val) => setFilterEstado(val)}
                      size="sm"
                      darkMode={darkMode}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Todos", label: "Todos los Estados" },
                        {
                          value: "Sin Determinacion de Consumo",
                          label: "Sin Determinación",
                        },
                        { value: "Consumiendo", label: "Consumiendo" },
                        { value: "Dejo de Consumir", label: "Dejó de Consumir" },
                      ]}
                    />

                    {/* Filter by Unidad */}
                    <CustomSelect
                      value={filterUnidad}
                      onChange={(val) => setFilterUnidad(val)}
                      size="sm"
                      darkMode={darkMode}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Todos", label: "Todas las Unidades" },
                        { value: "Comprimidos", label: "Comprimidos" },
                        { value: "Capsulas", label: "Cápsulas" },
                      ]}
                    />

                    {/* Filter by Funcion / Tratamiento */}
                    <CustomSelect
                      value={filterFuncionTratamiento}
                      onChange={(val) => setFilterFuncionTratamiento(val)}
                      size="sm"
                      darkMode={darkMode}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Todos", label: "Todos los Tratamientos" },
                        { value: "Quimioterapia", label: "Quimioterapia" },
                        { value: "Hipo", label: "Hipo" },
                        { value: "Cardiologico", label: "Cardiológico" },
                        { value: "Psicofarmaco", label: "Psicofármaco" },
                        { value: "Corticoide", label: "Corticoide" },
                        { value: "Convulsiones", label: "Convulsiones" },
                        { value: "Protector Gastrico", label: "Protector Gástrico" },
                      ]}
                    />
                  </div>

                  {/* Interactive Table */}
                  <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead className="sticky top-0 z-20">
                        <tr
                          className={`text-xs font-bold uppercase tracking-wider ${ darkMode ?"bg-zinc-950/40 text-zinc-400"
                              : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          <th className="px-4 py-4 whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[70px] w-[70px] max-w-[70px]">
                            <span className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Foto</span>
                          </th>
                          <th className="px-4 py-4 whitespace-nowrap md:sticky md:left-[70px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[160px] w-[160px] max-w-[160px]">
                            <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Marca</span>
                          </th>
                          <th className="px-4 py-4 whitespace-nowrap md:sticky md:left-[230px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[200px] w-[200px] max-w-[200px]">
                            <span className="flex items-center gap-1.5"><Pill className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Droga</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Función</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Activity className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Dosis</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> U.M.</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Package className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cant.</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Clock className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Diario</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Estado</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="flex items-center justify-end gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="">
                        {filteredMeds.length === 0 ? (
                          <tr>
                            <td
                              colSpan={10}
                              className="px-6 py-12 text-center text-slate-500 dark:text-zinc-500"
                            >
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Pill className="w-8 h-8 text-slate-300 dark:text-zinc-700 animate-pulse" />
                                <p className="font-semibold text-slate-700 dark:text-zinc-300">
                                  No se encontraron medicamentos
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-zinc-600">
                                  Prueba ajustando los filtros o agrega un medicamento
                                  nuevo.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredMeds.map((med) => (
                            <tr
                              key={med.id}
                              className="group hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 transition-colors"
                            >
                              <td className="px-4 py-4 whitespace-nowrap md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[70px] w-[70px] max-w-[70px]">
                                {med.imagen ? (
                                  <img
                                    src={med.imagen}
                                    alt={med.marca}
                                    className="w-10 h-10 object-cover rounded-lg border border-slate-200/60 dark:border-zinc-800/60 shadow-xs"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center border border-slate-200/50 dark:border-zinc-700/50">
                                    <ImageIcon className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap font-bold text-slate-900 dark:text-zinc-100 md:sticky md:left-[70px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[160px] w-[160px] max-w-[160px]">
                                <span className="truncate block" title={med.marca}>{med.marca}</span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-slate-600 dark:text-zinc-300 font-medium md:sticky md:left-[230px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[200px] w-[200px] max-w-[200px]">
                                <span className="truncate block" title={med.droga}>{med.droga}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                                    darkMode
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : "bg-primary-container text-primary border border-primary"
                                  }`}
                                >
                                  {med.funcionTratamiento || "Quimioterapia"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center font-mono font-bold text-slate-700 dark:text-zinc-400">
                                {med.mg} mg
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-zinc-400 font-medium">
                                {med.unidadMedida}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-slate-700 dark:text-zinc-300 font-mono">
                                {med.cantidad ?? 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-primary dark:text-primary font-mono">
                                {med.consumoDiario}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-1.5 py-[0px] rounded-full text-[7px] font-black uppercase tracking-wider ${
                                    med.estado === "Consumiendo"
                                      ? darkMode
                                        ? "bg-primary/10 text-primary"
                                        : "bg-primary-container text-primary"
                                      : med.estado === "Dejo de Consumir"
                                      ? darkMode
                                        ? "bg-red-500/10 text-red-400"
                                        : "bg-red-50 text-red-600"
                                      : darkMode
                                        ? "bg-zinc-800/80 text-zinc-400"
                                        : "bg-zinc-100 text-zinc-500"
                                  }`}
                                >
                                  {med.estado}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditModal(med)}
                                    className="p-1.5 text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDetailedMed(med.id)}
                                    className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                          <span>Total de registros: {filteredMeds.length}</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="stock"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                        {/* Filters Row */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input
                        type="text"
                        placeholder="Buscar por marca o droga..."
                        value={dispSearchQuery}
                        onChange={(e) => setDispSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
                      />
                    </div>

                    <CustomSelect
                      value={dispFilterEstado}
                      onChange={(val) => setDispFilterEstado(val)}
                      size="sm"
                      darkMode={darkMode}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Todos", label: "Todos los Estados" },
                        { value: "Con Receta", label: "Con Receta" },
                        { value: "Con Medicacion", label: "Con Medicación" },
                        { value: "Pedir Receta", label: "Pedir Receta" },
                        { value: "Comprar Medicamento", label: "Comprar Medicamento" },
                        { value: "Sin Informacion", label: "Sin Información" },
                      ]}
                    />

                    <CustomSelect
                      value={dispFilterFuncion}
                      onChange={(val) => setDispFilterFuncion(val)}
                      size="sm"
                      darkMode={darkMode}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Todos", label: "Todas las Funciones" },
                        { value: "Quimioterapia", label: "Quimioterapia" },
                        { value: "Hipo", label: "Hipo" },
                        { value: "Cardiologico", label: "Cardiológico" },
                        { value: "Psicofarmaco", label: "Psicofármaco" },
                        { value: "Corticoide", label: "Corticoide" },
                        { value: "Convulsiones", label: "Convulsiones" },
                        { value: "Protector Gastrico", label: "Protector Gástrico" },
                      ]}
                    />
                  </div>

                  {/* Interactive Table */}
                  <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black border border-slate-100 dark:border-zinc-800/80">
                    <table className="w-full text-left border-collapse min-w-[1050px]">
                      <thead className="sticky top-0 z-20">
                        <tr
                          className={`text-[11px] font-extrabold uppercase tracking-wider ${ darkMode ?"bg-zinc-950 text-zinc-400"
                              : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          <th className="px-3 py-4 text-center whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[70px] w-[70px] max-w-[70px]">
                            <span className="flex items-center justify-center gap-1"><FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Receta</span>
                          </th>
                          <th className="px-3 py-4 whitespace-nowrap md:sticky md:left-[70px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[180px] w-[180px] max-w-[180px]">
                            <span className="flex items-center gap-1.5"><Pill className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Medicamento</span>
                          </th>
                          <th className="px-3 py-4 whitespace-nowrap text-center md:sticky md:left-[250px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[140px] w-[140px] max-w-[140px]">
                            <span className="flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Estado</span>
                          </th>
                          <th className="px-4 py-4 whitespace-nowrap min-w-[125px]">
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> F. Reg.</span>
                          </th>
                          <th className="px-4 py-4 whitespace-nowrap min-w-[125px]">
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Límite</span>
                          </th>
                          <th className="px-4 py-4 text-center whitespace-nowrap min-w-[90px]">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Package className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Reg.</span>
                          </th>
                          <th className="px-4 py-4 text-center whitespace-nowrap min-w-[90px]">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Check className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Disp.</span>
                          </th>
                          <th className="px-4 py-4 text-center whitespace-nowrap min-w-[110px]">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Sparkles className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Duración</span>
                          </th>
                          <th className="px-4 py-4 whitespace-nowrap min-w-[140px]">
                            <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Tratamiento</span>
                          </th>
                          <th className="px-4 py-4 text-center whitespace-nowrap min-w-[90px]">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="">
                        {filteredDisp.length === 0 ? (
                          <tr>
                            <td
                              colSpan={10}
                              className="px-6 py-12 text-center text-slate-500 dark:text-zinc-500"
                            >
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Clock className="w-8 h-8 text-slate-300 dark:text-zinc-700 animate-pulse" />
                                <p className="font-semibold text-slate-700 dark:text-zinc-300">
                                  No se encontraron registros de disponibilidad
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-zinc-600">
                                  Comienza registrando la disponibilidad de tus
                                  medicamentos detallados.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredDisp.map((disp) => {
                            const d = calculateDispDetails(disp);
                            return (
                              <tr
                                key={disp.id}
                                className="group hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 transition-all cursor-pointer"
                              >
                                <td className="px-3 py-4 text-center md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[70px] w-[70px] max-w-[70px]">
                                  <input
                                    type="checkbox"
                                    checked={disp.receta}
                                    onChange={() => {
                                      setDisponibilidadMedicamentos?.((prev) =>
                                        prev.map((item) =>
                                          item.id === disp.id
                                            ? { ...item, receta: !item.receta }
                                            : item,
                                        ),
                                      );
                                    }}
                                    className="w-4 h-4 text-primary border-slate-300 dark:border-zinc-700 rounded-sm focus:ring-primary focus:ring-2 cursor-pointer"
                                  />
                                </td>
                                <td className="px-3 py-4 md:sticky md:left-[70px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[180px] w-[180px] max-w-[180px]">
                                  <div className="font-bold text-slate-900 dark:text-zinc-100">
                                    {d.marca}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                                    {d.droga}
                                  </div>
                                </td>
                                <td className="px-3 py-4 text-center md:sticky md:left-[250px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[140px] w-[140px] max-w-[140px]">
                                  <span
                                    className={`inline-flex items-center px-1.5 py-[0px] rounded-full text-[7px] font-black uppercase tracking-wider ${
                                      d.estado === "Con Receta"
                                        ? darkMode
                                          ? "bg-primary/10 text-primary border border-primary/20"
                                          : "bg-primary-container text-primary border border-primary"
                                        : d.estado === "Con Medicacion"
                                          ? darkMode
                                            ? "bg-primary-container text-primary border border-primary/30"
                                            : "bg-blue-50 text-primary border border-primary"
                                          : d.estado === "Pedir Receta"
                                            ? darkMode
                                              ? "bg-primary/10 text-primary border border-primary/20"
                                              : "bg-primary-container text-primary border border-primary"
                                            : d.estado === "Comprar Medicamento"
                                              ? darkMode
                                                ? "bg-red-500/15 text-red-400 border border-red-500/10"
                                                : "bg-red-50 text-red-600 border border-red-100"
                                              : darkMode
                                                ? "bg-zinc-500/15 text-zinc-400 border border-zinc-500/10"
                                                : "bg-zinc-50 text-zinc-500 border border-zinc-100"
                                    }`}
                                  >
                                    {d.estado}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-slate-500 dark:text-zinc-400 font-medium font-mono whitespace-nowrap min-w-[125px]">
                                  {disp.fechaRegistro}
                                </td>
                                <td className="px-4 py-4 text-slate-950 dark:text-zinc-100 font-extrabold font-mono whitespace-nowrap min-w-[125px]">
                                  {d.disponibleHasta}
                                </td>
                                <td className="px-4 py-4 text-center font-bold text-slate-700 dark:text-zinc-300 font-mono whitespace-nowrap min-w-[90px]">
                                  {disp.cantidadRegistrada}
                                </td>
                                <td className="px-4 py-4 text-center font-bold text-slate-900 dark:text-white font-mono whitespace-nowrap min-w-[90px]">
                                  {Number(d.cantidadDisponible.toFixed(1))}
                                </td>
                                <td className="px-4 py-4 text-center font-extrabold text-slate-700 dark:text-zinc-300 font-mono whitespace-nowrap min-w-[110px]">
                                  {Number(d.disponibleParaDias.toFixed(1))} días
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap min-w-[140px]">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                                      darkMode
                                        ? "bg-primary/10 text-primary border border-primary/20"
                                        : "bg-primary-container text-primary border border-primary"
                                    }`}
                                  >
                                    {d.funcionTratamiento}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenEditDisp(disp)}
                                      className="p-1.5 text-zinc-500 hover:text-primary hover:bg-primary-container dark:hover:bg-primary-container rounded-full transition-all cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDisp(disp.id)}
                                      className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                          <span>Total de registros: {filteredDisp.length}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </div>
                </div>
              )}

              {clinicoActiveTab === "presion" && (
                <div
                  className={`p-6 rounded-3xl border ${
                    darkMode
                      ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                      : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
                  } space-y-6 shadow-xs`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-extrabold flex items-center gap-2">
                        <Heart className="w-5 h-5 text-primary" />
                        Datos de Presión y Signos Vitales
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Historial de mediciones de presión arterial, temperatura y
                        oxígeno en sangre por paciente.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenAddBpTableModal}
                      className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-primary/10 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Registrar Presión / Signos</span>
                    </button>
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">
                        <Search className="w-4 h-4 text-primary dark:text-primary stroke-[2.25px] opacity-100" />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar paciente..."
                        value={bpSearchQuery}
                        onChange={(e) => setBpSearchQuery(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium outline-none transition-all ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                            : "bg-slate-50 border-slate-200 text-zinc-800 placeholder:text-zinc-700 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        }`}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                      <CustomSelect
                      value={bpFilterPatient}
                      onChange={(val) => setBpFilterPatient(val)}
                      size="sm"
                      darkMode={darkMode}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Todos", label: "Todos los Pacientes" },
                        { value: "Hernan", label: "Hernan" },
                        { value: "Modesto", label: "Modesto" },
                        { value: "Jessica", label: "Jessica" },
                        { value: "Gladys", label: "Gladys" },
                      ]}
                      />
                    </div>
                  </div>

                  {/* Interactive Table */}
                  <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead className="sticky top-0 z-20">
                        <tr
                          className={`text-[11px] font-extrabold uppercase tracking-wider ${ darkMode ?"bg-zinc-900/50 text-zinc-400"
                              : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          <th className="px-3 py-4 whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[95px] w-[95px] max-w-[95px]">
                            <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Paciente</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Fecha</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> P. Alta</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> P. Baja</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Temp.</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Oxígeno</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="">
                        {filteredBpLogs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-6 py-12 text-center text-slate-500 dark:text-zinc-500"
                            >
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <Heart className="w-8 h-8 text-slate-300 dark:text-zinc-700 animate-pulse" />
                                <p className="font-semibold text-slate-700 dark:text-zinc-300">
                                  No se encontraron registros de presión
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-zinc-600">
                                  Comienza registrando las mediciones de presión y
                                  signos vitales.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredBpLogs.map((log) => {
                            const patientName = log.patient || "Hernan";
                            return (
                              <tr
                                key={log.id}
                                className="group hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 transition-all cursor-pointer"
                              >
                                <td className="px-3 py-4 whitespace-nowrap md:sticky md:left-0 z-10 bg-white dark:bg-zinc-900 group-hover:bg-slate-100 dark:group-hover:bg-zinc-800/80 transition-colors min-w-[95px] w-[95px] max-w-[95px]">
                                  <span
                                    className="inline-flex items-center px-1.5 py-[0px] rounded-full text-[7px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20"
                                  >
                                    {patientName}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-750 dark:text-zinc-200 whitespace-nowrap min-w-[140px]">
                                  {log.date ? log.date.replace('T', ' ').replace('Z', '').split(':').slice(0, 2).join(':') : ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="font-extrabold font-mono text-primary">
                                    {log.systolic}{" "}
                                    <span className="text-[10px] text-zinc-500 font-normal">
                                      mmHg
                                    </span>
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="font-extrabold font-mono text-primary">
                                    {log.diastolic}{" "}
                                    <span className="text-[10px] text-zinc-500 font-normal">
                                      mmHg
                                    </span>
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700 dark:text-zinc-300">
                                  {log.temperature !== undefined
                                    ? `${log.temperature} °C`
                                    : "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {log.oxygen !== undefined ? (
                                    <span className="font-extrabold font-mono text-primary">
                                      {log.oxygen}%
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenEditBpTableModal(log)}
                                      className="p-1.5 text-zinc-500 hover:text-primary hover:bg-primary-container dark:hover:bg-primary-container rounded-full transition-all cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBpLog(log.id)}
                                      className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                    <span>Total de registros: {filteredBpLogs.length}</span>
                  </div>
                </div>
              )}

              {clinicoActiveTab === "estudios" && (
                <div
                  className={`p-6 rounded-3xl border ${
                    darkMode
                      ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                      : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
                  } space-y-6 shadow-xs`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-extrabold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Internaciones, Consultas y Estudios
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Historial clínico, cirugías, radioterapias, estudios y análisis
                        por paciente.
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={handleOpenAddEstudio}
                      className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-primary/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Registrar Registro Médico</span>
                    </motion.button>
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">
                        <Search className="w-4 h-4 text-primary dark:text-primary stroke-[2.25px] opacity-100" />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar por información o informe..."
                        value={estudioSearchQuery}
                        onChange={(e) => setEstudioSearchQuery(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium outline-none transition-all ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                            : "bg-slate-50 border-slate-200 text-zinc-800 placeholder:text-zinc-700 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        }`}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                      <CustomSelect
                      value={estudioFilterPatient}
                      onChange={(val) => setEstudioFilterPatient(val)}
                      size="sm"
                      darkMode={darkMode}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Todos", label: "Todos los Pacientes" },
                        { value: "Hernan", label: "Hernan" },
                        { value: "Modesto", label: "Modesto" },
                        { value: "Jessica", label: "Jessica" },
                        { value: "Gladys", label: "Gladys" },
                      ]}
                      />
                      <CustomSelect
                      value={estudioFilterType}
                      onChange={(val) => setEstudioFilterType(val)}
                      size="sm"
                      darkMode={darkMode}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Todos", label: "Todos los Tipos" },
                        { value: "Internacion", label: "Internación" },
                        { value: "Cirugia", label: "Cirugía" },
                        { value: "Radioterapia", label: "Radioterapia" },
                        {
                          value: "Estudio y/o Analisis",
                          label: "Estudio y/o Análisis",
                        },
                      ]}
                      />
                    </div>
                  </div>

                  {/* Interactive Table */}
                  <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
                    <table className="w-full text-left border-collapse min-w-[1250px]">
                      <thead className="sticky top-0 z-20">
                        <tr
                          className={`text-[11px] font-extrabold uppercase tracking-wider ${ darkMode ?"bg-zinc-900/50 text-zinc-400"
                              : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          <th className="px-2 py-3.5 whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[90px] w-[90px]">
                            <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Paciente</span>
                          </th>
                          <th className="px-2 py-3.5 whitespace-nowrap md:sticky md:left-[90px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[175px] w-[175px]">
                            <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Tipo</span>
                          </th>
                          <th className="px-3 py-3.5 whitespace-nowrap md:sticky md:left-[265px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[200px] w-[200px]">
                            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Info.</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Lugar</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Doctor</span>
                          </th>
                          <th className="px-6 py-4 text-center whitespace-nowrap min-w-[130px]">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Fecha</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Internación</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Adjunto</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Informe</span>
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="flex items-center justify-center gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="">
                        {medicalRecords.filter((record) => {
                          const matchesSearch =
                            record.info
                              .toLowerCase()
                              .includes(estudioSearchQuery.toLowerCase()) ||
                            record.report
                              .toLowerCase()
                              .includes(estudioSearchQuery.toLowerCase());
                          const matchesPatient =
                            estudioFilterPatient === "Todos" ||
                            record.patient === estudioFilterPatient;
                          const matchesType =
                            estudioFilterType === "Todos" ||
                            record.type === estudioFilterType;
                          return matchesSearch && matchesPatient && matchesType;
                        }).length === 0 ? (
                          <tr>
                            <td
                              colSpan={10}
                              className="px-6 py-12 text-center text-slate-500 dark:text-zinc-500"
                            >
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <FileText className="w-8 h-8 text-slate-300 dark:text-zinc-700 animate-pulse" />
                                <p className="font-semibold text-slate-700 dark:text-zinc-300">
                                  No se encontraron registros clínicos
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-zinc-600">
                                  Registra estudios, análisis, cirugías e internaciones
                                  de los pacientes.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          medicalRecords
                            .filter((record) => {
                              const matchesSearch =
                                record.info
                                  .toLowerCase()
                                  .includes(estudioSearchQuery.toLowerCase()) ||
                                record.report
                                  .toLowerCase()
                                  .includes(estudioSearchQuery.toLowerCase());
                              const matchesPatient =
                                estudioFilterPatient === "Todos" ||
                                record.patient === estudioFilterPatient;
                              const matchesType =
                                estudioFilterType === "Todos" ||
                                record.type === estudioFilterType;
                              return matchesSearch && matchesPatient && matchesType;
                            })
                            .map((record) => {
                              const patientName = record.patient || "Hernan";
                              const doc = doctors.find((d) => d.id === record.doctorId);
                              const docDisplay = doc
                                ? `${doc.name} (${doc.specialty})`
                                : "No especificado";

                              return (
                                <tr
                                  key={record.id}
                                  className="group hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 transition-all cursor-pointer"
                                >
                                  <td className="px-2 py-3.5 md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[90px] w-[90px]">
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 whitespace-nowrap"
                                    >
                                      {patientName}
                                    </span>
                                  </td>
                                  <td className="px-2 py-3.5 md:sticky md:left-[90px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[175px] w-[175px]">
                                    <span
                                      className="inline-flex items-center self-start px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 whitespace-nowrap"
                                    >
                                      {record.type}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3.5 md:sticky md:left-[265px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[200px] w-[200px]">
                                    <span
                                      className="font-semibold text-slate-800 dark:text-zinc-200 text-xs whitespace-nowrap truncate block"
                                      title={record.info}
                                    >
                                      {record.info || "-"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 dark:text-zinc-300">
                                    {record.location}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-zinc-400 font-medium">
                                    {docDisplay}
                                  </td>
                                  <td className="px-6 py-4 text-center font-semibold text-slate-600 dark:text-zinc-400 whitespace-nowrap min-w-[130px]">
                                    {record.studyDate}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {record.type === "Internacion" ? (
                                      <div className="flex flex-col space-y-0.5 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                                        <span>Ingreso: {record.entryDate}</span>
                                        <span>Egreso: {record.exitDate}</span>
                                        <span className="font-extrabold text-primary dark:text-primary font-mono">
                                          Días: {record.daysCount}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 dark:text-zinc-600 font-medium">
                                        -
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {record.fileName ? (
                                      <div className="flex items-center gap-1 text-xs text-primary dark:text-primary font-semibold hover:underline">
                                        <FileText className="w-3.5 h-3.5" />
                                        <a
                                          href={record.fileData || "#"}
                                          download={record.fileName}
                                          onClick={(e) => {
                                            if (!record.fileData) e.preventDefault();
                                          }}
                                          className="truncate max-w-[120px]"
                                          title={record.fileName}
                                        >
                                          {record.fileName}
                                        </a>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 dark:text-zinc-600 font-medium">
                                        Sin archivo
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <p
                                      className="text-slate-600 dark:text-zinc-400 line-clamp-2 italic font-medium max-w-[180px]"
                                      title={record.report}
                                    >
                                      {record.report || "Sin informe"}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleOpenEditEstudio(record)}
                                        className="p-1.5 text-zinc-500 hover:text-primary hover:bg-primary-container dark:hover:bg-primary-container rounded-full transition-all cursor-pointer"
                                        title="Editar"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEstudio(record.id)}
                                        className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                    <span>
                      Total de registros:{" "}
                      {
                        medicalRecords.filter((record) => {
                          const matchesSearch =
                            record.info
                              .toLowerCase()
                              .includes(estudioSearchQuery.toLowerCase()) ||
                            record.report
                              .toLowerCase()
                              .includes(estudioSearchQuery.toLowerCase());
                          const matchesPatient =
                            estudioFilterPatient === "Todos" ||
                            record.patient === estudioFilterPatient;
                          const matchesType =
                            estudioFilterType === "Todos" ||
                            record.type === estudioFilterType;
                          return matchesSearch && matchesPatient && matchesType;
                        }).length
                      }
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

        </motion.div>
      </AnimatePresence>

      {/* Add/Edit Datos de Presión Modal */}
      {createPortal(
        <AnimatePresence>
          {showBpTableModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowBpTableModal(false);
                setEditingBpLogItem(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  {editingBpLogItem
                    ? "Editar Datos de Presión"
                    : "Registrar Datos de Presión"}
                </h3>
                <button
                  onClick={() => {
                    setShowBpTableModal(false);
                    setEditingBpLogItem(null);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleSaveBpTableLog} className="space-y-4 pb-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Paciente
                    </label>
                    <CustomSelect
                      value={formBpPatient}
                      onChange={(val: any) => setFormBpPatient(val)}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Hernan", label: "Hernan" },
                        { value: "Modesto", label: "Modesto" },
                        { value: "Jessica", label: "Jessica" },
                        { value: "Gladys", label: "Gladys" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Fecha
                    </label>
                    <SmartDateTimePicker
                      value={formBpDate}
                      onChange={(val) => setFormBpDate(val)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Presión Alta (Sistólica)
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Ej. 120"
                        value={formBpSys}
                        onChange={(e) => setFormBpSys(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Presión Baja (Diastólica)
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Ej. 80"
                        value={formBpDia}
                        onChange={(e) => setFormBpDia(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Temperatura (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ej. 36.5"
                        value={formBpTemp}
                        onChange={(e) => setFormBpTemp(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Oxígeno en Sangre (%)
                      </label>
                      <input
                        type="number"
                        placeholder="Ej. 98"
                        value={formBpO2}
                        onChange={(e) => setFormBpO2(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => { if (!isSaving) setShowBpTableModal(false); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/10 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{editingBpLogItem ? "Guardar Cambios" : "Guardar"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Add/Edit Internaciones, Consultas y Estudios Modal */}
      {createPortal(
        <AnimatePresence>
          {showEstudioModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowEstudioModal(false);
                setEditingEstudio(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {editingEstudio
                    ? "Editar Registro de Salud"
                    : "Registrar Registro de Salud"}
                </h3>
                <button
                  onClick={() => {
                    setShowEstudioModal(false);
                    setEditingEstudio(null);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleSaveEstudio} className="space-y-4 pb-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Paciente
                    </label>
                    <CustomSelect
                      value={estudioPatient}
                      onChange={(val: any) => setEstudioPatient(val)}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Hernan", label: "Hernan" },
                        { value: "Modesto", label: "Modesto" },
                        { value: "Jessica", label: "Jessica" },
                        { value: "Gladys", label: "Gladys" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Tipo de Registro
                    </label>
                    <CustomSelect
                      value={estudioType}
                      onChange={(val: any) => setEstudioType(val)}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Internacion", label: "Internación" },
                        { value: "Cirugia", label: "Cirugía" },
                        { value: "Radioterapia", label: "Radioterapia" },
                        {
                          value: "Estudio y/o Analisis",
                          label: "Estudio y/o Análisis",
                        },
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-black dark:text-zinc-500 uppercase tracking-widest mb-1 record-info-label">
                    Información / Diagnóstico Corto
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Chequeo anual de sangre, Operación de hernia"
                    value={estudioInfo}
                    onChange={(e) => setEstudioInfo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Lugar
                    </label>
                    <CustomSelect
                      value={estudioLocation}
                      onChange={(val: any) => setEstudioLocation(val)}
                      className="w-full sm:w-auto"
                      options={[
                        {
                          value: "Sanatorio San Juan",
                          label: "Sanatorio San Juan",
                        },
                        { value: "CIMAC", label: "CIMAC" },
                        { value: "Pilar del Oeste", label: "Pilar del Oeste" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Doctor / Profesional
                    </label>
                    <CustomSelect
                      value={estudioDoctorId}
                      onChange={(val: any) => setEstudioDoctorId(val)}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "", label: "No especificado / Sin Doctor" },
                        ...doctors.map((d) => ({
                          value: d.id,
                          label: `${d.name} (${d.specialty})`,
                        })),
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Fecha del Estudio / Evento
                  </label>
                  <SmartDateTimePicker
                    value={estudioStudyDate}
                    onChange={(val) => setEstudioStudyDate(val)}
                    required
                  />
                </div>

                {/* Conditional Internación Fields */}
                {estudioType === "Internacion" && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-800/40 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                      Detalles de la Internación
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                          Fecha de Ingreso
                        </label>
                        <SmartDateTimePicker
                          value={estudioEntryDate}
                          onChange={(val) => setEstudioEntryDate(val)}
                          required={estudioType === "Internacion"}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                          Fecha de Egreso
                        </label>
                        <SmartDateTimePicker
                          value={estudioExitDate}
                          onChange={(val) => setEstudioExitDate(val)}
                          required={estudioType === "Internacion"}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Cantidad de Días (Cálculo Automático)
                      </label>
                      <div className="px-3 py-2.5 rounded-xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 text-primary text-xs font-bold font-mono">
                        {estudioEntryDate && estudioExitDate
                          ? `${Math.max(0, Math.ceil((new Date(estudioExitDate).getTime() - new Date(estudioEntryDate).getTime()) / (1000 * 60 * 60 * 24)))} días`
                          : "Ingrese las fechas de ingreso y egreso"}
                      </div>
                    </div>
                  </div>
                )}

                {/* File upload drag and drop */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Archivo / Documento Adjunto
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-slate-300 dark:border-zinc-700 hover:border-primary/50 dark:hover:border-primary/50 bg-slate-50 dark:bg-black/20"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
                      {estudioFileName ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-primary dark:text-primary">
                            {estudioFileName}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Haz clic o arrastra otro archivo para reemplazarlo
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                            Sube un archivo aquí
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Arrastra y suelta tu estudio/informe en PDF, imagen
                            o documento, o haz clic para buscar
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Informe / Observaciones Detalladas
                  </label>
                  <textarea
                    placeholder="Ej. Resultados del análisis de sangre normales, se recomienda control de tiroides en 6 meses..."
                    value={estudioReport}
                    onChange={(e) => setEstudioReport(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm resize-none focus:border-primary"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (!isSaving) {
                        setShowEstudioModal(false);
                        setEditingEstudio(null);
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/10 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{editingEstudio ? "Guardar Cambios" : "Guardar"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Add/Edit Doctor Modal */}
      {createPortal(
        <AnimatePresence>
          {showDocModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowDocModal(false);
                setEditingDoc(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingDoc ? "Editar Profesional" : "Registrar Profesional"}
                </h3>
                <button
                  onClick={() => {
                    setShowDocModal(false);
                    setEditingDoc(null);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleSaveDoctor} className="space-y-4 pb-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Doctor/a
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Dra. Silvia de la Vega"
                      value={formDocName}
                      onChange={(e) => setFormDocName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Especialidad
                    </label>
                    <CustomSelect
                      value={formDocSpecialty}
                      onChange={(val) => setFormDocSpecialty(val)}
                      className="w-full sm:w-auto"
                      options={specialtyOptions}
                      allowCustom={true}
                      onAddCustom={handleAddCustomSpecialty}
                      onRemoveOption={handleRemoveSpecialty}
                      customPlaceholder="Buscar o ingresar nueva especialidad..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Consultorio
                    </label>
                    <CustomSelect
                      value={formDocConsultorio}
                      onChange={(val) => setFormDocConsultorio(val)}
                      className="w-full sm:w-auto"
                      options={consultorioOptions}
                      allowCustom={true}
                      onAddCustom={handleAddCustomConsultorio}
                      onRemoveOption={handleRemoveConsultorio}
                      customPlaceholder="Buscar o ingresar nuevo consultorio..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Contacto (Teléfono)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. +54 9 264 456-7890"
                      value={formDocPhone}
                      onChange={(e) => setFormDocPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        if (!isSaving) {
                          setShowDocModal(false);
                          setEditingDoc(null);
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/10 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{editingDoc ? "Guardar Cambios" : "Guardar"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Add Actividad Modal */}
      {/* Add/Edit Disponibilidad Modal */}

      {/* Add/Edit Disponibilidad Modal */}
      {createPortal(
        <AnimatePresence>
          {showDispModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowDispModal(false);
                setEditingDisp(null);
              }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  {editingDisp ? "Editar Registro" : "Añadir Registro"}
                </h3>
                <button
                  onClick={() => {
                    setShowDispModal(false);
                    setEditingDisp(null);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleSaveDisp} className="space-y-4 pb-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Medicamento
                    </label>
                    <CustomSelect
                      value={dispMedicamentoId}
                      onChange={(val: string) => setDispMedicamentoId(val)}
                      options={[...(medicamentosDetallados || [])]
                        .map((m) => {
                          const marca = (m.marca || "").trim().replace(/^\((.*)\)$/, "$1");
                          const droga = (m.droga || "").trim().replace(/^\((.*)\)$/, "$1");
                          const label = marca && droga ? `${marca} - ${droga}` : marca || droga || "Medicamento";
                          return {
                            value: m.id,
                            label,
                          };
                        })
                        .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }))}
                      searchable={true}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      ¿Requiere Receta?
                    </label>
                    <button
                      type="button"
                      onClick={() => setDispReceta(!dispReceta)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        dispReceta ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          dispReceta ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Fecha de Registro
                      </label>
                      <SmartDateTimePicker
                        value={dispFechaRegistro}
                        onChange={(val) => setDispFechaRegistro(val)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Ej. 2"
                        value={dispCantidadRegistrada}
                        onChange={(e) =>
                          setDispCantidadRegistrada(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        className="w-full px-3.5 h-[42px] rounded-2xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none text-xs font-semibold focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        if (!isSaving) {
                          setShowDispModal(false);
                          setEditingDisp(null);
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/10 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{editingDisp ? "Guardar Cambios" : "Añadir Registro"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Alimentacion Modal */}
      {createPortal(
        <AnimatePresence>
          {showAlimModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowAlimModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  {editingAlimLog ? "Editar Registro" : "Añadir Registro"}
                </h3>
                <button
                  onClick={() => setShowAlimModal(false)}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <div className="space-y-4 pb-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Fecha
                      </label>
                      <SmartDateTimePicker
                        value={alimFecha}
                        onChange={(val) => setAlimFecha(val)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Estado
                      </label>
                      <CustomSelect
                        value={alimEstado}
                        onChange={(val: string) => setAlimEstado(val as any)}
                        options={[
                          { value: "Desayuno", label: "Desayuno" },
                          { value: "Almuerzo", label: "Almuerzo" },
                          { value: "Merienda", label: "Merienda" },
                          { value: "Cena", label: "Cena" },
                        ]}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Plato
                    </label>
                    <CustomSelect
                      value={alimPlatoId}
                      onChange={(val: string) => setAlimPlatoId(val)}
                      searchable={true}
                      options={(platos || []).map((p) => ({
                        value: p.id,
                        label: p.nombrePlato,
                      }))}
                    />
                  </div>

                  {alimPlatoId && (
                    <div className="space-y-3 pt-2">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Ingredientes y Cantidades
                      </label>
                      <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                        {(() => {
                          const plato = platos?.find((p) => p.id === alimPlatoId);
                          if (!plato) return null;
                          const ingList: {
                            nombre: string;
                            defaultUnidad: string;
                          }[] = [];
                          const extract = (aId?: string) => {
                            if (!aId) return;
                            const ali = alimentos?.find((a) => a.id === aId);
                            if (!ali) return;
                            if (ali.ingrediente1)
                              ingList.push({
                                nombre: ali.ingrediente1,
                                defaultUnidad: ali.unidad1 || "",
                              });
                            if (ali.ingrediente2)
                              ingList.push({
                                nombre: ali.ingrediente2,
                                defaultUnidad: ali.unidad2 || "",
                              });
                            if (ali.ingrediente3)
                              ingList.push({
                                nombre: ali.ingrediente3,
                                defaultUnidad: ali.unidad3 || "",
                              });
                          };
                          extract(plato.alimentoId1);
                          extract(plato.alimentoId2);
                          extract(plato.alimentoId3);

                          if (ingList.length === 0)
                            return (
                              <div className="text-xs text-zinc-500">
                                Sin ingredientes asociados.
                              </div>
                            );

                          return ingList.map((ing, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-black/50 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800"
                            >
                              <div className="flex-1 min-w-0">
                                <span
                                  className="text-xs font-semibold block truncate text-slate-900 dark:text-white"
                                  title={ing.nombre}
                                >
                                  {ing.nombre}
                                </span>
                                {(() => {
                                  const grams = alimCantidades[ing.nombre] || 0;
                                  const item = mercaderia?.find(m => m.ingredientes === ing.nombre);
                                  const baseCal = item ? (item.calorias !== undefined && item.calorias !== null ? item.calorias : getCalorieDensity(item.ingredientes, item.categoria, item.sector)) : 0;
                                  const cal = Math.round((grams / 100) * baseCal);

                                  const baseNutri = getIngredientNutriVal(ing.nombre, mercaderia || []);
                                  const p = Math.round((grams / 100) * (baseNutri.proteinas || 0) * 10) / 10;
                                  const c = Math.round((grams / 100) * (baseNutri.carbohidratos || 0) * 10) / 10;
                                  const g = Math.round((grams / 100) * (baseNutri.grasas || 0) * 10) / 10;

                                  return (
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5">
                                      {cal} kcal | P: {p}g | C: {c}g | G: {g}g
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={alimCantidades[ing.nombre] !== undefined ? alimCantidades[ing.nombre] : ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                    setAlimCantidades((prev) => ({
                                      ...prev,
                                      [ing.nombre]: val,
                                    }));
                                  }}
                                  className="w-20 px-2 py-1.5 rounded-lg text-xs font-mono bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-right"
                                  placeholder="Gramos"
                                />
                                <span className="text-[10px] text-zinc-500 font-mono w-6 text-left shrink-0">
                                  g
                                </span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {alimPlatoId && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                          Total del Registro
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans">
                          Val. Nutri. (Total)
                        </span>
                      </div>
                      
                      {(() => {
                        const totalNutri = {
                          proteinas: 0,
                          carbohidratos: 0,
                          grasas: 0,
                          azucares: 0,
                          fibra: 0,
                          sodio: 0,
                        };

                        Object.entries(alimCantidades).forEach(([ingrediente, grams]) => {
                          const baseNutri = getIngredientNutriVal(ingrediente, mercaderia || []);
                          const factor = grams / 100;
                          totalNutri.proteinas += (baseNutri.proteinas || 0) * factor;
                          totalNutri.carbohidratos += (baseNutri.carbohidratos || 0) * factor;
                          totalNutri.grasas += (baseNutri.grasas || 0) * factor;
                          totalNutri.azucares += (baseNutri.azucares || 0) * factor;
                          totalNutri.fibra += (baseNutri.fibra || 0) * factor;
                          totalNutri.sodio += (baseNutri.sodio || 0) * factor;
                        });

                        const p = Math.round(totalNutri.proteinas * 10) / 10;
                        const c = Math.round(totalNutri.carbohidratos * 10) / 10;
                        const g = Math.round(totalNutri.grasas * 10) / 10;
                        const az = Math.round(totalNutri.azucares * 10) / 10;
                        const fb = Math.round(totalNutri.fibra * 10) / 10;
                        const sd = Math.round(totalNutri.sodio);

                        return (
                          <div className="bg-slate-50 dark:bg-black p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2">
                            <div className="flex items-center justify-between text-slate-900 dark:text-white">
                              <span className="text-xs font-bold">Calorías Totales:</span>
                              <span className="font-mono text-sm font-bold text-primary">
                                {alimCalorias} kcal
                              </span>
                            </div>
                            <div className="pt-2 border-t border-slate-200/50 dark:border-zinc-800/50 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                              <span><strong>P:</strong> {p}g</span>
                              <span>|</span>
                              <span><strong>C:</strong> {c}g <span className="text-zinc-400 dark:text-zinc-500">(Az: {az}g)</span></span>
                              <span>|</span>
                              <span><strong>G:</strong> {g}g</span>
                              <span>|</span>
                              <span><strong>Fibra:</strong> {fb}g</span>
                              <span>|</span>
                              <span><strong>Sodio:</strong> {sd}mg</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => { if (!isSaving) setShowAlimModal(false); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAlimLog}
                      disabled={isSaving || !alimFecha || !alimEstado || !alimPlatoId}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Guardar Registro</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Add Actividad Modal */}
      {createPortal(
        <AnimatePresence>
          {showActividadModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowActividadModal(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md/95 dark:backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white/95 dark:bg-black/95 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  {editingActividadId ? "Editar Actividad" : "Añadir Actividad"}
                </h3>
                <button
                  onClick={() => setShowActividadModal(false)}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <div className="space-y-4 pb-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Fecha Desde
                      </label>
                      <SmartDateTimePicker
                        value={actFechaDesde}
                        onChange={(val) => setActFechaDesde(val)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Fecha Hasta
                      </label>
                      <SmartDateTimePicker
                        value={actFechaHasta}
                        onChange={(val) => setActFechaHasta(val)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Tipo de Entrenamiento
                    </label>
                    <CustomSelect
                      value={actInformacion}
                      onChange={(val: string) => setActInformacion(val)}
                      searchable={true}
                      className="w-full sm:w-auto"
                      options={Object.keys(activityMETs)
                        .sort((a, b) => a.localeCompare(b))
                        .map((act) => ({ value: act, label: act }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Calorías
                      </label>
                      <input
                        type="number"
                        value={actCalorias}
                        onChange={(e) =>
                          setActCalorias(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Pasos
                      </label>
                      <input
                        type="number"
                        value={actPasos}
                        onChange={(e) =>
                          setActPasos(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        disabled={
                          actInformacion
                            ? !distanceBasedActivities.includes(actInformacion)
                            : false
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Distancia (km)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={actDistancia}
                        onChange={(e) =>
                          setActDistancia(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        disabled={
                          actInformacion
                            ? !distanceBasedActivities.includes(actInformacion)
                            : false
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Puntos (Cardio)
                      </label>
                      <input
                        type="number"
                        value={actPuntos}
                        onChange={(e) =>
                          setActPuntos(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Tiempo Movimiento
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 1h 30m"
                        value={actTiempoMovimiento}
                        onChange={(e) => setActTiempoMovimiento(e.target.value)}
                        disabled={
                          actInformacion
                            ? !distanceBasedActivities.includes(actInformacion)
                            : false
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Frecuencia / Ritmo
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 5:30 min/km"
                        value={actFrecuencia}
                        onChange={(e) => setActFrecuencia(e.target.value)}
                        disabled={
                          actInformacion
                            ? !distanceBasedActivities.includes(actInformacion)
                            : false
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => { if (!isSaving) setShowActividadModal(false); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveActividad}
                      disabled={isSaving || !actFechaDesde || !actFechaHasta || !actInformacion}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{editingActividadId ? "Guardar Cambios" : "Guardar Actividad"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Add/Edit Detailed Medication Modal */}
      {createPortal(
        <AnimatePresence>
          {showDetailedModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowDetailedModal(false);
                setEditingMed(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  {editingMed ? "Editar Medicamento" : "Agregar Medicamento"}
                </h3>
                <button
                  onClick={() => {
                    setShowDetailedModal(false);
                    setEditingMed(null);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleSaveDetailedMed} className="space-y-4 pb-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={detMarca}
                        onChange={(e) => setDetMarca(e.target.value)}
                        placeholder="Ej: Ibupirac"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Droga
                      </label>
                      <input
                        type="text"
                        value={detDroga}
                        onChange={(e) => setDetDroga(e.target.value)}
                        placeholder="Ej: Ibuprofeno"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Miligramos (Mg)
                      </label>
                      <input
                        type="number"
                        value={detMg}
                        onChange={(e) =>
                          setDetMg(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="Ej: 400"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Unidad de Medida
                      </label>
                      <CustomSelect
                        value={detUnidadMedida}
                        onChange={(val) =>
                          setDetUnidadMedida(val as "Comprimidos" | "Capsulas")
                        }
                        className="w-full sm:w-auto"
                        options={[
                          { value: "Comprimidos", label: "Comprimidos" },
                          { value: "Capsulas", label: "Cápsulas" },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        value={detCantidad}
                        onChange={(e) =>
                          setDetCantidad(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="Ej: 30"
                        className="w-full px-3.5 h-[42px] rounded-2xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none text-xs font-semibold focus:border-primary transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Consumo Diario
                      </label>
                      <input
                        type="number"
                        value={detConsumoDiario}
                        onChange={(e) =>
                          setDetConsumoDiario(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="Ej: 1"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Estado de Consumo
                      </label>
                      <CustomSelect
                        value={detEstado}
                        onChange={(val) => setDetEstado(val as any)}
                        className="w-full sm:w-auto"
                        options={[
                          {
                            value: "Sin Determinacion de Consumo",
                            label: "Sin Determinación",
                          },
                          { value: "Consumiendo", label: "Consumiendo" },
                          {
                            value: "Dejo de Consumir",
                            label: "Dejó de Consumir",
                          },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Función / Tratamiento
                      </label>
                      <CustomSelect
                        value={detFuncionTratamiento}
                        onChange={(val) => setDetFuncionTratamiento(val as any)}
                        className="w-full sm:w-auto"
                        options={[
                          { value: "Quimioterapia", label: "Quimioterapia" },
                          { value: "Hipo", label: "Hipo" },
                          { value: "Cardiologico", label: "Cardiológico" },
                          { value: "Psicofarmaco", label: "Psicofármaco" },
                          { value: "Corticoide", label: "Corticoide" },
                          { value: "Convulsiones", label: "Convulsiones" },
                          {
                            value: "Protector Gastrico",
                            label: "Protector Gástrico",
                          },
                        ]}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Fecha de Inicio
                    </label>
                    <SmartDateTimePicker
                      value={detFechaInicio}
                      onChange={(val) => setDetFechaInicio(val)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Imagen del Medicamento
                    </label>
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800/40">
                      {detImagen ? (
                        <img
                          src={detImagen}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded-xl border border-slate-200/60 dark:border-zinc-800/60 shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-slate-200/50 dark:border-zinc-700/50">
                          <ImageIcon className="w-6 h-6 text-slate-400 dark:text-zinc-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-xs font-bold text-slate-700 dark:text-zinc-300 transition-all cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                          Cargar Imagen
                        </button>
                        {detImagen && (
                          <button
                            type="button"
                            onClick={() => setDetImagen("")}
                            className="text-[10px] text-red-500 font-bold hover:underline mt-1.5 block cursor-pointer"
                          >
                            Eliminar imagen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        if (!isSaving) {
                          setShowDetailedModal(false);
                          setEditingMed(null);
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{editingMed ? "Guardar Cambios" : "Agregar Medicamento"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Add Medication Modal */}
      {createPortal(
        <AnimatePresence>
          {showAddMed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAddMed(false)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 cursor-default ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white"
                    : "bg-white border-zinc-200 text-zinc-800"
                }`}
              >
              <h3 className="font-extrabold text-lg">Agregar Medicamento</h3>
              <form onSubmit={handleAddMedication} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans">
                    Nombre del Medicamento
                  </label>
                  <input
                    type="text"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="Ej: Ibupirac 400mg"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans">
                      Dosis / Medida
                    </label>
                    <input
                      type="text"
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      placeholder="Ej: 1 comprimido"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans">
                      Frecuencia
                    </label>
                    <input
                      type="text"
                      value={medFreq}
                      onChange={(e) => setMedFreq(e.target.value)}
                      placeholder="Ej: Cada 12 horas"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans">
                    Horario de Toma
                  </label>
                  <input
                    type="text"
                    value={medTime}
                    onChange={(e) => setMedTime(e.target.value)}
                    placeholder="Ej: 09:00, 21:00"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => { if (!isSaving) setShowAddMed(false); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Add Blood Pressure Modal */}
      {createPortal(
        <AnimatePresence>
          {showAddBp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowAddBp(false);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Registrar Medición</h3>
                <button
                  onClick={() => setShowAddBp(false)}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleAddBpLog} className="space-y-4 pb-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Fecha y Hora
                    </label>
                    <SmartDateTimePicker
                      value={bpDate}
                      onChange={setBpDate}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Sistólica (MAX)
                      </label>
                      <input
                        type="number"
                        value={bpSys}
                        onChange={(e) => setBpSys(parseInt(e.target.value) || 0)}
                        placeholder="120"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm font-mono font-bold text-center focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Diastólica (MIN)
                      </label>
                      <input
                        type="number"
                        value={bpDia}
                        onChange={(e) => setBpDia(parseInt(e.target.value) || 0)}
                        placeholder="80"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm font-mono font-bold text-center focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Pulso (LPM)
                      </label>
                      <input
                        type="number"
                        value={bpPulse}
                        onChange={(e) =>
                          setBpPulse(parseInt(e.target.value) || 0)
                        }
                        placeholder="72"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm font-mono font-bold text-center focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Notas o Síntomas
                    </label>
                    <textarea
                      value={bpNotes}
                      onChange={(e) => setBpNotes(e.target.value)}
                      placeholder="Ej: Tomado en reposo tras levantarse..."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm resize-none h-20 focus:border-primary"
                    ></textarea>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => { if (!isSaving) setShowAddBp(false); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Guardar Medición</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Add Doctor Modal */}
      {createPortal(
        <AnimatePresence>
          {showAddDoc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAddDoc(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Agregar Profesional</h3>
                <button
                  onClick={() => setShowAddDoc(false)}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleAddDoctor} className="space-y-4 pb-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="Ej: Dra. Julia Giménez"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Especialidad
                    </label>
                    <input
                      type="text"
                      value={docSpecialty}
                      onChange={(e) => setDocSpecialty(e.target.value)}
                      placeholder="Ej: Dermatología / Cardiología"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Teléfono
                      </label>
                      <input
                        type="text"
                        value={docPhone}
                        onChange={(e) => setDocPhone(e.target.value)}
                        placeholder="Ej: +54 11 5555"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Correo
                      </label>
                      <input
                        type="email"
                        value={docEmail}
                        onChange={(e) => setDocEmail(e.target.value)}
                        placeholder="Ej: drgimenez@correo.com"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Dirección de Consultorio
                    </label>
                    <input
                      type="text"
                      value={docAddress}
                      onChange={(e) => setDocAddress(e.target.value)}
                      placeholder="Ej: Av. Córdoba 1200, Piso 3"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => { if (!isSaving) setShowAddDoc(false); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Guardar Contacto</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* DETAILED MODAL POPUP (Mini Menu Desplegado) */}
      {activeDetailItem &&
        createPortal(
          (() => {
            const item = activeDetailItem;
            const matchedMed = medicamentosDetallados.find(
              (m) => m.id === item.disp.medicamentoId,
            );
            const unidad = matchedMed?.unidadMedida || "unidades";

            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in cursor-pointer"
                onClick={() => setActiveDetailItem(null)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl relative transition-all cursor-default ${
                    darkMode
                      ? "bg-zinc-950 border-zinc-800 text-white shadow-primary/20"
                      : "bg-white border-zinc-200 text-zinc-800 shadow-slate-200"
                  }`}
                >
                  {/* Close button */}
                  <button
                    onClick={() => setActiveDetailItem(null)}
                    className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-zinc-500/10 text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold w-fit">
                      <Pill className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Control de Medicamentos / Alerta</span>
                    </div>

                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 pr-8">
                        {item.details.marca}
                      </h3>
                      {item.details.droga && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                          Droga: {item.details.droga}
                        </p>
                      )}
                    </div>

                    {/* State Badge */}
                    <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                      <div className="text-xs text-zinc-400 font-bold">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Estado de Disponibilidad
                        </p>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                            item.details.estado === "Comprar Medicamento"
                              ? "bg-red-500/20 text-red-600 dark:text-red-400"
                              : "bg-primary/10 text-primary dark:text-primary"
                          }`}
                        >
                          {item.details.estado}
                        </span>
                      </div>
                      <div className="text-right text-xs text-zinc-400 font-bold">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Disponible Hasta
                        </p>
                        <p className="text-slate-800 dark:text-zinc-200 font-extrabold mt-1 text-sm font-mono">
                          {item.details.disponibleHasta}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400 font-bold">
                      <div className="bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Stock Disponible Estimado
                        </p>
                        <p className="text-primary font-black text-lg mt-0.5 font-mono">
                          {item.details.cantidadDisponible.toFixed(1)}{" "}
                          <span className="text-xs font-normal">{unidad}</span>
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Alcanza Para
                        </p>
                        <p className="text-slate-800 dark:text-zinc-200 font-black text-lg mt-0.5 font-mono">
                          {item.details.disponibleParaDias.toFixed(1)}{" "}
                          <span className="text-xs font-normal">días</span>
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 space-y-2 text-xs text-slate-600 dark:text-zinc-400 font-medium">
                      <p className="font-extrabold text-slate-800 dark:text-zinc-200 uppercase text-[9px] tracking-widest">
                        Detalles del Tratamiento y Consumo:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <p className="text-zinc-400 text-[9px]">
                            Función / Tratamiento
                          </p>
                          <p className="font-bold text-slate-800 dark:text-zinc-200">
                            {item.details.funcionTratamiento}
                          </p>
                        </div>
                        <div>
                          <p className="text-zinc-400 text-[9px]">
                            Consumo Diario
                          </p>
                          <p className="font-bold text-slate-800 dark:text-zinc-200">
                            {item.details.consumoDiario} {unidad} / día
                          </p>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-zinc-800/50 mt-1 flex justify-between">
                          <span className="text-zinc-400 text-[9px]">
                            Registrado el:
                          </span>
                          <span className="font-bold font-mono">
                            {item.disp.fechaRegistro}
                          </span>
                        </div>
                        <div className="col-span-2 flex justify-between">
                          <span className="text-zinc-400 text-[9px]">
                            Cantidad Registrada Inicial:
                          </span>
                          <span className="font-bold font-mono">
                            {item.disp.cantidadRegistrada} {unidad}
                          </span>
                        </div>
                        <div className="col-span-2 flex justify-between">
                          <span className="text-zinc-400 text-[9px]">
                            Días Transcurridos:
                          </span>
                          <span className="font-bold font-mono">
                            {item.details.diasPasados} días
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setActiveDetailItem(null)}
                        className="px-5 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-bold cursor-pointer text-primary transition-colors"
                      >
                        Entendido / Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })(),
          document.body,
        )}

      {/* PORTAL: EDIT METABOLIC PROFILE MODAL */}
      {showProfileModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl relative transition-all cursor-default ${
                darkMode
                  ? "bg-zinc-950 border-zinc-800 text-white shadow-primary/5"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-slate-200"
              }`}
            >
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-zinc-500/10 text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-200 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-2.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold w-fit">
                  <Target className="w-4 h-4" />
                  <span>Perfil Metabólico</span>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                  Editar Perfil Metabólico
                </h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Edad
                      </label>
                      <input
                        type="number"
                        value={profEdad}
                        onChange={(e) => setProfEdad(Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl text-xs border ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-white focus:border-primary"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-primary"
                        } outline-none font-bold`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Altura (cm)
                      </label>
                      <input
                        type="number"
                        value={profAltura}
                        onChange={(e) => setProfAltura(Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl text-xs border ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-white focus:border-primary"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-primary"
                        } outline-none font-bold`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Peso (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={profPeso}
                        onChange={(e) => setProfPeso(Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl text-xs border ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-white focus:border-primary"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-primary"
                        } outline-none font-bold`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Género
                      </label>
                      <CustomSelect
                        value={profGenero}
                        onChange={(val) => setProfGenero(val as any)}
                        darkMode={darkMode}
                        className="w-full sm:w-auto"
                        options={[
                          { value: "Masculino", label: "Masculino" },
                          { value: "Femenino", label: "Femenino" },
                        ]}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Objetivo Principal
                    </label>
                    <CustomSelect
                      value={profObjetivo}
                      onChange={(val) => setProfObjetivo(val as any)}
                      darkMode={darkMode}
                      className="w-full sm:w-auto"
                      options={[
                        { value: "Bajar de Peso (Déficit)", label: "Bajar de Peso (Déficit)" },
                        { value: "Mantenimiento", label: "Mantenimiento" },
                        { value: "Ganar Masa Muscular (Superávit)", label: "Ganar Masa Muscular (Superávit)" },
                      ]}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => { if (!isSaving) setShowProfileModal(false); }}
                    className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        const updated = {
                          ...metabolicProfile,
                          edad: profEdad,
                          altura: profAltura,
                          pesoActual: profPeso,
                          genero: profGenero,
                          objetivo: profObjetivo,
                        };
                        await handleSaveMetabolicProfile(updated);
                        setShowProfileModal(false);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="px-4 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-zinc-950 transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}

      {/* PORTAL: BODY MEASUREMENTS & MEDIDAS MODAL */}
      {showMedidasModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setShowMedidasModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl relative transition-all cursor-default ${
                darkMode
                  ? "bg-zinc-950 border-zinc-800 text-white shadow-primary/5"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-slate-200"
              }`}
            >
              <button
                onClick={() => setShowMedidasModal(false)}
                className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-zinc-500/10 text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-200 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-2.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold w-fit">
                  <Scale className="w-4 h-4" />
                  <span>Mediciones</span>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                  Registrar Mediciones Corporales
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Fecha de Medición
                    </label>
                    <SmartDateTimePicker
                      value={medFecha}
                      onChange={(val) => setMedFecha(val ? val.split("T")[0] : "")}
                      showTimeOption={false}
                      size="sm"
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Peso (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={medPeso}
                        onChange={(e) => setMedPeso(Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl text-xs border ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-white focus:border-primary"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-primary"
                        } outline-none font-bold`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Cintura (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Opcional"
                        value={medCintura}
                        onChange={(e) => setMedCintura(e.target.value === "" ? "" : Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl text-xs border ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-white focus:border-primary"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-primary"
                        } outline-none font-bold`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Cadera (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Opcional"
                        value={medCadera}
                        onChange={(e) => setMedCadera(e.target.value === "" ? "" : Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl text-xs border ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-white focus:border-primary"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-primary"
                        } outline-none font-bold`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Cuello (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Opcional"
                        value={medCuello}
                        onChange={(e) => setMedCuello(e.target.value === "" ? "" : Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl text-xs border ${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-white focus:border-primary"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-primary"
                        } outline-none font-bold`}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => { if (!isSaving) setShowMedidasModal(false); }}
                    className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        const now = new Date();
                        const todayStr = now.toISOString().substring(0, 10);
                        const selectedFecha = medFecha || todayStr;
                        
                        let entryTimestamp: number;
                        if (selectedFecha === todayStr) {
                          entryTimestamp = now.getTime();
                        } else {
                          const timePart = now.toTimeString().split(" ")[0];
                          entryTimestamp = new Date(`${selectedFecha}T${timePart}`).getTime();
                        }

                        const existingMedida = editingMedidaId ? medidasHistory.find(m => m.id === editingMedidaId) : null;
                        const timestamp = existingMedida?.timestamp || entryTimestamp;
                        const createdAt = existingMedida?.createdAt || now.toISOString();

                        const id = editingMedidaId || `medida_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                        const entry = {
                          id,
                          fecha: selectedFecha,
                          peso: medPeso,
                          cintura: medCintura === "" ? undefined : medCintura,
                          cadera: medCadera === "" ? undefined : medCadera,
                          cuello: medCuello === "" ? undefined : medCuello,
                          timestamp,
                          createdAt,
                        };
                        await handleSaveMedidas(entry);
                        setMedidasPage(1);
                        setShowMedidasModal(false);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="px-4 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-zinc-950 transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL CON ANIMACIÓN & ESTADO ELIMINANDO */}
      <ConfirmationModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || "Confirmar Eliminación"}
        message={confirmModal?.message || "¿Estás seguro de que deseas eliminar este elemento?"}
        onConfirm={async () => {
          if (confirmModal) {
            await confirmModal.onConfirm();
          }
        }}
        onClose={() => setConfirmModal(null)}
        darkMode={darkMode}
      />
    </div>
  );
}
