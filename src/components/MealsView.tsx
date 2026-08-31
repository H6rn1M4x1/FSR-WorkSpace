import { SubNav } from "./SubNav";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { generateUniqueId } from "../utils/id";
import { getLocalDateString } from "../utils/date";
import React, { useState, useEffect } from "react";
import { subscribeToCategory, saveItemToFirestore, deleteItemFromFirestore } from "../lib/firestoreSyncService";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { useToast } from "../context/ToastContext";
import AnimatedList from "./AnimatedList";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  Loader2,
  UtensilsCrossed,
  ChefHat,
  Package,
  CalendarDays,
  ShoppingBag,
  Plus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ClipboardList,
  Check,
  Database,
  Edit3,
  Search,
  Filter,
  Tag,
  MapPin,
  Scale,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
  X,
  Settings,
  DollarSign,
  Flame,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import {
  PantryItem,
  MealPlan,
  ShoppingItem,
  MercaderiaItem,
  AlimentoItem,
  PlatoItem,
  OrganizacionSemanalItem,
} from "../types";
import {
  calculateIngredientCalories,
  generarNutricionEstimada,
  getIngredientNutriVal,
  calcularNutricionAlimento,
  calcularNutricionPlato,
  getCalorieDensity
} from "../lib/calories";
import { SmartDateTimePicker } from "./SmartDateTimePicker";
import { subscribeToSectionLinks, getLinkedPartnerInfo } from "../lib/sectionSharingService";

// Constant select options, sorted alphabetically
const CATEGORIAS = [
  "Carne",
  "Cerdo",
  "Fruta",
  "Mercaderia",
  "Panificacion",
  "Pescado",
  "Pollo",
  "Verdura",
];

const SECTORES = [
  "Carniceria",
  "Condimientos",
  "Cuidado del Hogar",
  "Cuidado Personal",
  "Dispensa",
  "Dulces",
  "Electronica",
  "Fiambres",
  "Frutas y Verduas",
  "Granos",
  "Harinas",
  "Heladera",
  "Infusiones",
  "Limpieza",
  "Otros",
  "Panificacion",
  "Ultra Porcesador",
];

const COMERCIOS = [
  "Avicola",
  "Cafe America",
  "Chinos",
  "Lenic",
  "Panaderia",
  "Verduleria",
];

const UNIDADES_MEDIDA = ["Atado/s", "Gr.", "Kg.", "Lts.", "Uni."];

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
  const [visibleCount, setVisibleCount] = useState(4);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const computePopoverPosition = (fixedPlacement?: "top" | "bottom"): SelectPopoverPosition | null => {
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

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const placement =
      fixedPlacement ||
      (spaceBelow < 180 && spaceAbove > spaceBelow ? "top" : "bottom");

    if (placement === "top") {
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
      setVisibleCount(4);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      setPopoverPosition((currentPos) => {
        if (!currentPos) return computePopoverPosition();
        return computePopoverPosition(currentPos.placement);
      });
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 35) {
      setVisibleCount((prev) => Math.min(prev + 5, filteredOptions.length));
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY > 0 && visibleCount < filteredOptions.length) {
      setVisibleCount((prev) => Math.min(prev + 5, filteredOptions.length));
    }
  };

    const isDefaultOrPlaceholder = !value || !selectedOption || value === "" || selectedOption.value === "";

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
          className={`w-full h-[42px] flex items-center justify-between font-normal transition-all focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            size === "sm"
              ? "px-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px]"
              : "px-3.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-black dark:text-white text-xs focus:border-primary"
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            {icon && (
              <span className="shrink-0 text-slate-400 dark:text-zinc-500">
                {icon}
              </span>
            )}
            <span
              data-custom-select-selected={!isDefaultOrPlaceholder}
              className={`whitespace-nowrap ${
                isDefaultOrPlaceholder
                  ? "font-normal text-[11px] sm:text-xs text-slate-400 dark:text-zinc-500 tracking-wide"
                  : "font-medium text-xs sm:text-xs text-black dark:text-white"
              }`}
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
                  y: popoverPosition.placement === "top" ? 6 : -6,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  y: popoverPosition.placement === "top" ? 6 : -6,
                }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  top: popoverPosition.top !== undefined ? `${popoverPosition.top}px` : undefined,
                  bottom: popoverPosition.bottom !== undefined ? `${popoverPosition.bottom}px` : undefined,
                  left: `${popoverPosition.left}px`,
                  width: `${popoverPosition.width}px`,
                  zIndex: 99999,
                }}
                className="bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-1.5 ring-1 ring-black/5 dark:ring-white/10"
              >
                {searchable && (
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setVisibleCount(4);
                    }}
                    autoFocus
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none mb-1.5"
                  />
                )}
                <div
                  onScroll={handleScroll}
                  onWheel={handleWheel}
                  className="max-h-[115px] overflow-y-auto overflow-x-hidden pr-1 space-y-0.5 [scrollbar-width:thin] [scrollbar-color:#a1a1aa_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-zinc-800/50 [&::-webkit-scrollbar-thumb]:bg-zinc-400 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-500 [&::-webkit-scrollbar-thumb]:rounded-full"
                >
                  {filteredOptions.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400 dark:text-zinc-500 text-center">
                      No hay opciones
                    </div>
                  ) : (
                    filteredOptions.slice(0, visibleCount).map((opt) => {
                      const isSelected = opt.value === value;
                      const isNoneOption = opt.value === "" || opt.label.startsWith("--");
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onChange(opt.value);
                            setIsOpen(false);
                            setSearchTerm("");
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-[11px] sm:text-xs rounded-xl text-left transition-colors cursor-pointer border ${
                            isSelected
                              ? "bg-primary text-white font-semibold border-primary"
                              : isNoneOption
                                ? "font-normal text-slate-400 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 border-transparent hover:border-primary"
                                : "font-medium text-slate-900 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60 border-transparent hover:border-primary"
                          }`}
                        >
                          <span
                            className={`whitespace-normal leading-tight pr-2 ${
                              isNoneOption ? "font-normal" : ""
                            }`}
                          >
                            {opt.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-auto" />}
                        </button>
                      );
                    })
                  )}
                </div>
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

export default function MealsView({
  darkMode,
  userEmail,
  pantry,
  setPantry,
  meals,
  setMeals,
  shoppingList,
  setShoppingList,
  mercaderia,
  setMercaderia,
  alimentos,
  setAlimentos,
  platos,
  setPlatos,
  organizacionSemanal,
  setOrganizacionSemanal,
  activeSubTab: propActiveSubTab,
  onSubTabChange,
}: MealsViewProps) {
  // Subtab navigation
  const [localActiveSubTab, setLocalActiveSubTab] = useState<
    | "planificador"
    | "creacion_comidas"
    | "mercaderia"
    | "alimentos"
    | "platos"
    | "organizacion_semanal"
    | "lista_compras"
  >("planificador");

  const [creacionComidasActiveTab, setCreacionComidasActiveTab] = useState<
    "mercaderia" | "alimentos" | "platos"
  >("mercaderia");

  const creacionComidasScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollCreacionComidasTabsLeft = () => {
    const tabs = ["mercaderia","alimentos","platos"];
    const currentIndex = tabs.indexOf(creacionComidasActiveTab);
    if (currentIndex > 0) {
      setCreacionComidasActiveTab(tabs[currentIndex - 1] as any);
      if (creacionComidasScrollRef.current) {
        const buttons = creacionComidasScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };
  const scrollCreacionComidasTabsRight = () => {
    const tabs = ["mercaderia","alimentos","platos"];
    const currentIndex = tabs.indexOf(creacionComidasActiveTab);
    if (currentIndex < tabs.length - 1) {
      setCreacionComidasActiveTab(tabs[currentIndex + 1] as any);
      if (creacionComidasScrollRef.current) {
        const buttons = creacionComidasScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const userId = (userEmail || "hernanmaximiliano10@gmail.com").toLowerCase().trim();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Section sharing info state
  const [partnerInfo, setPartnerInfo] = useState<{ isLinked: boolean; partnerEmail: string | null; isOwner: boolean }>({
    isLinked: false,
    partnerEmail: null,
    isOwner: false,
  });

  useEffect(() => {
    const unsub = subscribeToSectionLinks(userEmail, (data) => {
      setPartnerInfo(getLinkedPartnerInfo(userEmail, "comidas", data.active));
    });
    return () => {
      try { unsub(); } catch (_) {}
    };
  }, [userEmail]);

  // Real-time local subscription for MealsView categories with strict unmount cleanup
  useEffect(() => {
    const unsubs = [
      subscribeToCategory(userId, "pantry", (items) => setPantry?.(items)),
      subscribeToCategory(userId, "meals", (items) => setMeals?.(items)),
      subscribeToCategory(userId, "shopping", (items) => setShoppingList?.(items)),
      subscribeToCategory(userId, "mercaderia", (items) => setMercaderia?.(items)),
      subscribeToCategory(userId, "alimentos", (items) => setAlimentos?.(items)),
      subscribeToCategory(userId, "platos", (items) => setPlatos?.(items)),
      subscribeToCategory(userId, "organizacion_semanal", (items) => setOrganizacionSemanal?.(items)),
    ];

    return () => {
      unsubs.forEach((unsub) => {
        try { unsub(); } catch (_) {}
      });
    };
  }, [userId]);

  const rawActiveSubTab = (propActiveSubTab as any) || localActiveSubTab;
  const normalizedActiveSubTab = React.useMemo(() => {
    if (rawActiveSubTab === "mercaderia" || rawActiveSubTab === "alimentos" || rawActiveSubTab === "platos" || rawActiveSubTab === "creacion_comidas") {
      return "creacion_comidas";
    }
    return rawActiveSubTab;
  }, [rawActiveSubTab]);

  const activeSubTab = normalizedActiveSubTab;

  const { showToast } = useToast();
  const setActiveSubTab = (tab: any) => {
    if (onSubTabChange) onSubTabChange(tab);
    setLocalActiveSubTab(tab);
  };

  React.useEffect(() => {
    if (propActiveSubTab) {
      setLocalActiveSubTab(propActiveSubTab as any);
      if (propActiveSubTab === "mercaderia" || propActiveSubTab === "alimentos" || propActiveSubTab === "platos") {
        setCreacionComidasActiveTab(propActiveSubTab);
      }
    }
  }, [propActiveSubTab]);

  const [activeDetailItem, setActiveDetailItem] =
    useState<OrganizacionSemanalItem | null>(null);

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

  const [priceLoadingIds, setPriceLoadingIds] = useState<
    Record<string, boolean>
  >({});

  const updatePrice = async (item: MercaderiaItem) => {
    setPriceLoadingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await fetch(
        `/api/prices/search?q=${encodeURIComponent(item.ingredientes)}&category=${encodeURIComponent(item.categoria)}`,
      );
      const data = await res.json();
      if (data && data.price !== null) {
        setMercaderia((prev) =>
          prev.map((m) =>
            m.id === item.id ? { ...m, precio: data.price } : m,
          ),
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPriceLoadingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const updateAllPrices = async () => {
    for (const item of mercaderia) {
      await updatePrice(item);
    }
  };

  // Alimentos form / view state
  const [showAddAlimento, setShowAddAlimento] = useState(false);
  const [editingAlimentoId, setEditingAlimentoId] = useState<string | null>(
    null,
  );
  const [aliMercaderiaName, setAliMercaderiaName] = useState("");
  const [aliIng1, setAliIng1] = useState("");
  const [aliQty1, setAliQty1] = useState<number | "">("");
  const [aliIng2, setAliIng2] = useState("");
  const [aliQty2, setAliQty2] = useState<number | "">("");
  const [aliIng3, setAliIng3] = useState("");
  const [aliQty3, setAliQty3] = useState<number | "">("");
  const [aliSearchQuery, setAliSearchQuery] = useState("");

  const getIngredientUnit = (ingName: string): string => {
    const found = mercaderia.find((m) => m.ingredientes === ingName);
    return found ? found.unidadMedida : "";
  };

  const handleAddOrEditAlimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliMercaderiaName.trim()) {
      console.warn("[MealsView] Validation failed: aliMercaderiaName is empty");
      return;
    }

    setIsSaving(true);
    console.log("[MealsView] Saving alimento. Editing ID:", editingAlimentoId);

    try {
      const unit1 = aliIng1 ? getIngredientUnit(aliIng1) : undefined;
      const unit2 = aliIng2 ? getIngredientUnit(aliIng2) : undefined;
      const unit3 = aliIng3 ? getIngredientUnit(aliIng3) : undefined;

      const c1 = aliQty1 !== "" ? Number(aliQty1) : undefined;
      const c2 = aliQty2 !== "" ? Number(aliQty2) : undefined;
      const c3 = aliQty3 !== "" ? Number(aliQty3) : undefined;

      const calculatedAlimentoCals = Math.round(
        calculateIngredientCalories(aliIng1, c1, mercaderia) +
          calculateIngredientCalories(aliIng2, c2, mercaderia) +
          calculateIngredientCalories(aliIng3, c3, mercaderia),
      );

      const newItem: AlimentoItem = {
        id: editingAlimentoId || generateUniqueId("ali"),
        mercaderiaName: aliMercaderiaName.trim(),
        ingrediente1: aliIng1 || undefined,
        cantidad1: c1,
        unidad1: unit1 || undefined,
        ingrediente2: aliIng2 || undefined,
        cantidad2: c2,
        unidad2: unit2 || undefined,
        ingrediente3: aliIng3 || undefined,
        cantidad3: c3,
        unidad3: unit3 || undefined,
        calorias: calculatedAlimentoCals,
      };

      // Calular valores nutricionales automáticamente para AlimentoItem
      newItem.valoresNutricionales = calcularNutricionAlimento(newItem, mercaderia);

      console.log("[MealsView] Alimento item constructed:", newItem);

      await saveItemToFirestore(userId, "alimentos", newItem);
      setAlimentos((prev) => {
        const exists = prev.some((a) => a.id === newItem.id);
        if (exists) return prev.map((a) => (a.id === newItem.id ? newItem : a));
        return [newItem, ...prev];
      });
      console.log("[MealsView] Alimento saved successfully.");
      showToast(editingAlimentoId ? "Alimento actualizado con éxito" : "Alimento guardado con éxito", "success");

      // Reset Form
      setAliMercaderiaName("");
      setAliIng1("");
      setAliQty1("");
      setAliIng2("");
      setAliQty2("");
      setAliIng3("");
      setAliQty3("");
      setShowAddAlimento(false);
      setEditingAlimentoId(null);
    } catch (error) {
      console.error("[MealsView] Error saving Alimento:", error);
      showToast("Error al guardar el alimento", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAlimentoClick = (item: AlimentoItem) => {
    setEditingAlimentoId(item.id);
    setAliMercaderiaName(item.mercaderiaName);
    setAliIng1(item.ingrediente1 || "");
    setAliQty1(item.cantidad1 !== undefined ? item.cantidad1 : "");
    setAliIng2(item.ingrediente2 || "");
    setAliQty2(item.cantidad2 !== undefined ? item.cantidad2 : "");
    setAliIng3(item.ingrediente3 || "");
    setAliQty3(item.cantidad3 !== undefined ? item.cantidad3 : "");
    setShowAddAlimento(true);
  };

  const handleDeleteAlimento = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este alimento de la base de datos? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        console.log("[MealsView] Deleting alimento:", id);
        try {
          await deleteItemFromFirestore(userId, "alimentos", id);
          setAlimentos((prev) => prev.filter((a) => a.id !== id));
          console.log("[MealsView] Alimento deleted successfully.");
          showToast("Alimento eliminado con éxito", "success");
        } catch (error) {
          console.error("[MealsView] Error deleting Alimento:", error);
          showToast("Error al eliminar el alimento", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  // Platos form / view state
  const [showAddPlato, setShowAddPlato] = useState(false);
  const [editingPlatoId, setEditingPlatoId] = useState<string | null>(null);
  const [plaNombrePlato, setPlaNombrePlato] = useState("");
  const [plaAlimentoId1, setPlaAlimentoId1] = useState("");
  const [plaAlimentoId2, setPlaAlimentoId2] = useState("");
  const [plaAlimentoId3, setPlaAlimentoId3] = useState("");
  const [plaSearchQuery, setPlaSearchQuery] = useState("");

  const isNonEdible = (
    name: string,
    category: string,
    sector: string,
  ): boolean => {
    const n = name.toLowerCase();
    const c = category.toLowerCase();
    const s = sector.toLowerCase();
    if (
      c.includes("limpieza") ||
      c.includes("cuidado personal") ||
      c.includes("perfumeria") ||
      c.includes("higiene") ||
      s.includes("limpieza") ||
      s.includes("cuidado personal") ||
      s.includes("perfumeria") ||
      s.includes("higiene") ||
      n.includes("desodorante") ||
      n.includes("jabon") ||
      n.includes("detergente") ||
      n.includes("shampoo") ||
      n.includes("crema de enjuague") ||
      n.includes("cepillo") ||
      n.includes("papel de cocina") ||
      n.includes("higienico") ||
      n.includes("dicroica") ||
      n.includes("esponja") ||
      n.includes("dentifrico") ||
      n.includes("crema dental") ||
      n.includes("lavandina") ||
      n.includes("suavizante") ||
      n.includes("insecticida") ||
      n.includes("pilas") ||
      n.includes("bolsa") ||
      n.includes("servilleta") ||
      n.includes("agua micelar") ||
      n.includes("perfume")
    ) {
      return true;
    }
    return false;
  };

  const RAW_INGREDIENT_CALORIES: Record<string, number> = {
    "aceite de girasol": 884,
    "aceite de oliva": 884,
    "grasa bovina": 890,
    manteca: 717,
    "aceitunas negras": 115,
    "aceitunas verdes": 115,
    mayonesa: 680,
    ketchup: 112,
    mostaza: 66,
    sal: 0,
    pimienta: 0,
    oregano: 0,
    pimenton: 0,
    arroz: 360,
    "arroz sofia": 360,
    "harina 000": 340,
    "harina 0000": 340,
    "harina leudante": 340,
    "fideos cabello de angel": 350,
    "fideos coditos": 350,
    "fideos gruesos": 350,
    "fideos moñito": 350,
    "fideos mostachol": 350,
    "fideos secos": 350,
    "fideos tallarin": 350,
    "fideos tirabuzon": 350,
    "fideos nido": 350,
    facturas: 380,
    pan: 265,
    "pan para hamburguesa": 275,
    "pan rallado": 350,
    avena: 389,
    azucar: 387,
    "dulce de leche": 315,
    "dulce de cereza": 260,
    "dulce de durazno": 260,
    "dulce de frutilla": 260,
    "dulce de higos": 260,
    "dulce de naranja": 260,
    miel: 304,
    acelga: 19,
    "atado de acelga": 19,
    "atado de veteraba": 43,
    veteraba: 43,
    ajo: 149,
    alcaucil: 47,
    berenjena: 25,
    camote: 86,
    batata: 86,
    cebolla: 40,
    "cebolla blanca": 40,
    "cebolla morada": 40,
    choclo: 86,
    "choclo congelado": 86,
    "pimiento verde": 20,
    "morron verde": 20,
    "morron rojo": 31,
    "pimiento rojo": 31,
    zapallito: 17,
    zapallitos: 17,
    papa: 77,
    papas: 77,
    zanahoria: 41,
    zanahorias: 41,
    tomate: 18,
    tomates: 18,
    lechuga: 15,
    espinaca: 23,
    calabaza: 26,
    zapallo: 26,
    banana: 89,
    durazno: 39,
    frutilla: 32,
    manzana: 52,
    naranja: 47,
    limon: 29,
    "alitas de pollo": 203,
    "asado de carnicero": 250,
    "bife de nalga": 130,
    "bifes de cerdo": 143,
    "bifes de pollo": 120,
    "pechuga de pollo": 120,
    "pata muslo": 180,
    "pata muslo con piel": 180,
    "pollo entero": 160,
    "carne picada especial": 200,
    "molida especial": 200,
    "molida comun": 250,
    lomo: 140,
    "lomo de cerdo": 143,
    matambre: 210,
    "colita de cuadril": 180,
    "costeletas de carne": 220,
    "costeletas de cerdo": 210,
    merluza: 90,
    "filete de merluza": 90,
    milanesa: 220,
    salchichas: 260,
    salchicas: 260,
    "jamon cocido": 135,
    "jamon crudo": 240,
    "queso cremosos": 300,
    "queso mantecoso": 300,
    muzzarella: 280,
    "queso cheddar": 350,
    "queso rayado": 430,
    "queso rallado": 430,
    huevo: 75,
    huevos: 75,
    leche: 42,
    "crema de leche": 340,
    "crema de leche chico": 340,
    "crema de leche mediano": 340,
    "crema de leche grande": 340,
    yogur: 60,
    arvejas: 81,
    lentejas: 353,
    garvanzos: 364,
    porotos: 340,
    atun: 130,
    "levadura seca": 310,
  };

  const calculateAlimentoCalories = (
    alimento: AlimentoItem | undefined,
  ): number => {
    if (!alimento) return 0;
    let total = 0;
    total += calculateIngredientCalories(
      alimento.ingrediente1,
      alimento.cantidad1,
      mercaderia,
    );
    total += calculateIngredientCalories(
      alimento.ingrediente2,
      alimento.cantidad2,
      mercaderia,
    );
    total += calculateIngredientCalories(
      alimento.ingrediente3,
      alimento.cantidad3,
      mercaderia,
    );
    return total;
  };

  const calculatePlatoCalories = (plato: PlatoItem | undefined): number => {
    if (!plato) return 0;
    let total = 0;
    const ali1 = alimentos.find((a) => a.id === plato.alimentoId1);
    const ali2 = alimentos.find((a) => a.id === plato.alimentoId2);
    const ali3 = alimentos.find((a) => a.id === plato.alimentoId3);
    total += calculateAlimentoCalories(ali1);
    total += calculateAlimentoCalories(ali2);
    total += calculateAlimentoCalories(ali3);
    return Math.round(total);
  };

  const getAlimentoInfo = (alimentoId: string | undefined): string => {
    if (!alimentoId) return "-";
    const found = alimentos.find((a) => a.id === alimentoId);
    if (!found) return "-";

    const items: string[] = [];
    if (found.ingrediente1) {
      items.push(
        `${found.ingrediente1} ${found.cantidad1 !== undefined ? found.cantidad1 : ""} ${found.unidad1 || ""}`
          .trim()
          .replace(/\s+/g, " "),
      );
    }
    if (found.ingrediente2) {
      items.push(
        `${found.ingrediente2} ${found.cantidad2 !== undefined ? found.cantidad2 : ""} ${found.unidad2 || ""}`
          .trim()
          .replace(/\s+/g, " "),
      );
    }
    if (found.ingrediente3) {
      items.push(
        `${found.ingrediente3} ${found.cantidad3 !== undefined ? found.cantidad3 : ""} ${found.unidad3 || ""}`
          .trim()
          .replace(/\s+/g, " "),
      );
    }

    return items.length > 0 ? items.join(" + ") : "-";
  };

  const renderAlimentoIngredientsList = (alimentoId: string | undefined) => {
    if (!alimentoId)
      return <span className="text-slate-300 dark:text-zinc-700">-</span>;
    const found = alimentos.find((a) => a.id === alimentoId);
    if (!found)
      return <span className="text-slate-300 dark:text-zinc-700">-</span>;

    const list: {
      ingrediente: string;
      cantidad: number | undefined;
      unidad: string;
    }[] = [];
    if (found.ingrediente1) {
      list.push({
        ingrediente: found.ingrediente1,
        cantidad: found.cantidad1,
        unidad: found.unidad1 || "",
      });
    }
    if (found.ingrediente2) {
      list.push({
        ingrediente: found.ingrediente2,
        cantidad: found.cantidad2,
        unidad: found.unidad2 || "",
      });
    }
    if (found.ingrediente3) {
      list.push({
        ingrediente: found.ingrediente3,
        cantidad: found.cantidad3,
        unidad: found.unidad3 || "",
      });
    }

    if (list.length === 0)
      return <span className="text-slate-300 dark:text-zinc-700">-</span>;

    const totalCals = calculateAlimentoCalories(found);

    return (
      <div className="w-full flex flex-col gap-1 py-0.5">
        {list.map((item, idx) => {
          const ingCals = calculateIngredientCalories(
            item.ingrediente,
            item.cantidad,
            mercaderia,
          );
          return (
            <div
              key={idx}
              className="flex items-center gap-1.5 bg-primary/10 text-slate-700 dark:text-primary px-2 py-0.5 rounded-md border border-primary/20 text-[11px] w-fit font-sans"
              style={!darkMode ? { color: "#374151" } : undefined}
            >
              <span className="font-semibold">{item.ingrediente}</span>
              <span className="text-[10px] opacity-80">
                {item.cantidad !== undefined ? item.cantidad : ""} {item.unidad}
              </span>
              {ingCals > 0 && (
                <span
                  className="font-bold text-[9px] bg-primary/10 px-1 rounded text-slate-700 dark:text-primary"
                  style={!darkMode ? { color: "#374151" } : undefined}
                >
                  {Math.round(ingCals)} kcal
                </span>
              )}
            </div>
          );
        })}
        {totalCals > 0 && (
          <div
            className="text-[10px] font-semibold text-slate-700 dark:text-zinc-300"
            style={!darkMode ? { color: "#374151" } : undefined}
          >
            Subtotal: {Math.round(totalCals)} kcal
          </div>
        )}
        {(() => {
          const vn = found.valoresNutricionales || calcularNutricionAlimento(found, mercaderia);
          const p = Math.round(vn?.proteinas || 0);
          const c = Math.round(vn?.carbohidratos || 0);
          const g = Math.round(vn?.grasas || 0);
          if (p === 0 && c === 0 && g === 0) return null;
          return (
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans mt-0.5">
              Macros: P: {p}g | C: {c}g | G: {g}g
            </div>
          );
        })()}
      </div>
    );
  };

  const getAlimentoName = (alimentoId: string | undefined): string => {
    if (!alimentoId) return "-";
    const found = alimentos.find((a) => a.id === alimentoId);
    return found ? found.mercaderiaName : "-";
  };

  const handleAddOrEditPlato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plaNombrePlato.trim()) {
      console.warn("[MealsView] Validation failed: plaNombrePlato is empty");
      return;
    }

    setIsSaving(true);
    console.log("[MealsView] Saving plato. Editing ID:", editingPlatoId);

    try {
      const calculatedPlatoCals = calculatePlatoCalories({
        id: editingPlatoId || generateUniqueId("pla"),
        nombrePlato: plaNombrePlato.trim(),
        alimentoId1: plaAlimentoId1 || undefined,
        alimentoId2: plaAlimentoId2 || undefined,
        alimentoId3: plaAlimentoId3 || undefined,
      });

      const newItem: PlatoItem = {
        id: editingPlatoId || generateUniqueId("pla"),
        nombrePlato: plaNombrePlato.trim(),
        alimentoId1: plaAlimentoId1 || undefined,
        alimentoId2: plaAlimentoId2 || undefined,
        alimentoId3: plaAlimentoId3 || undefined,
        calorias: calculatedPlatoCals,
      };

      console.log("[MealsView] Plato item constructed:", newItem);

      await saveItemToFirestore(userId, "platos", newItem);
      setPlatos((prev) => {
        const exists = prev.some((p) => p.id === newItem.id);
        if (exists) return prev.map((p) => (p.id === newItem.id ? newItem : p));
        return [newItem, ...prev];
      });
      console.log("[MealsView] Plato saved successfully to Firestore.");
      showToast(editingPlatoId ? "Plato actualizado con éxito" : "Plato guardado con éxito", "success");

      // Reset Form
      setPlaNombrePlato("");
      setPlaAlimentoId1("");
      setPlaAlimentoId2("");
      setPlaAlimentoId3("");
      setShowAddPlato(false);
      setEditingPlatoId(null);
    } catch (error) {
      console.error("[MealsView] Error saving Plato:", error);
      showToast("Error al guardar el plato", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPlatoClick = (item: PlatoItem) => {
    setEditingPlatoId(item.id);
    setPlaNombrePlato(item.nombrePlato);
    setPlaAlimentoId1(item.alimentoId1 || "");
    setPlaAlimentoId2(item.alimentoId2 || "");
    setPlaAlimentoId3(item.alimentoId3 || "");
    setShowAddPlato(true);
  };

  const handleDeletePlato = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este plato? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        console.log("[MealsView] Deleting plato:", id);
        try {
          await deleteItemFromFirestore(userId, "platos", id);
          setPlatos((prev) => prev.filter((p) => p.id !== id));
          console.log("[MealsView] Plato deleted successfully.");
          showToast("Plato eliminado con éxito", "success");
        } catch (error) {
          console.error("[MealsView] Error deleting Plato:", error);
          showToast("Error al eliminar el plato", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  // Organización Semanal form / view state
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgFecha, setOrgFecha] = useState("");
  const [orgPlatoId, setOrgPlatoId] = useState("");
  const [orgSearchQuery, setOrgSearchQuery] = useState("");

  const getDiaDeLaSemana = (fechaStr: string): string => {
    if (!fechaStr) return "-";
    const date = new Date(fechaStr + "T12:00:00");
    if (isNaN(date.getTime())) return "-";
    const days = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    return days[date.getDay()];
  };

  const getPlatoName = (platoId: string): string => {
    const found = platos.find((p) => p.id === platoId);
    return found ? found.nombrePlato : "-";
  };

  const getPlatoIngredientsList = (platoId: string) => {
    const foundPlato = platos.find((p) => p.id === platoId);
    if (!foundPlato) return [];

    const alimentoIds = [
      foundPlato.alimentoId1,
      foundPlato.alimentoId2,
      foundPlato.alimentoId3,
    ].filter(Boolean) as string[];
    const list: {
      ingrediente: string;
      cantidad: number | undefined;
      unidad: string;
    }[] = [];

    alimentoIds.forEach((id) => {
      const foundAli = alimentos.find((a) => a.id === id);
      if (foundAli) {
        if (foundAli.ingrediente1) {
          list.push({
            ingrediente: foundAli.ingrediente1,
            cantidad: foundAli.cantidad1,
            unidad: foundAli.unidad1 || "",
          });
        }
        if (foundAli.ingrediente2) {
          list.push({
            ingrediente: foundAli.ingrediente2,
            cantidad: foundAli.cantidad2,
            unidad: foundAli.unidad2 || "",
          });
        }
        if (foundAli.ingrediente3) {
          list.push({
            ingrediente: foundAli.ingrediente3,
            cantidad: foundAli.cantidad3,
            unidad: foundAli.unidad3 || "",
          });
        }
      }
    });

    return list;
  };

  const renderPlatoIngredientsBadges = (platoId: string) => {
    const list = getPlatoIngredientsList(platoId);
    if (list.length === 0)
      return <span className="text-slate-400 dark:text-zinc-600">-</span>;

    return (
      <div className="flex flex-col gap-1.5 py-1">
        {list.map((item, idx) => {
          const ingCals = calculateIngredientCalories(
            item.ingrediente,
            item.cantidad,
            mercaderia,
          );
          return (
            <div
              key={idx}
              className={`flex items-center justify-between gap-3 text-slate-700 dark:text-zinc-300 px-2.5 py-1.5 rounded-lg border text-xs shadow-sm ${darkMode ? "bg-zinc-900 border-zinc-800/60" : "bg-slate-50 border-slate-200/60"}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="font-bold text-black dark:text-white"
                  style={!darkMode ? { color: "#000000" } : undefined}
                >
                  {item.ingrediente}
                </span>
                <span className="text-slate-500 dark:text-zinc-400 font-medium">
                  {item.cantidad !== undefined ? item.cantidad : ""}{" "}
                  {item.unidad}
                </span>
              </div>
              {ingCals > 0 && (
                <span className="font-bold text-[10px] bg-primary/10 px-1.5 py-0.5 rounded-md text-primary shrink-0">
                  {Math.round(ingCals)} kcal
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleAddOrEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgFecha || !orgPlatoId) {
      console.warn("[MealsView] Validation failed: orgFecha or orgPlatoId is empty");
      return;
    }

    setIsSaving(true);
    console.log("[MealsView] Saving weekly plan. Editing ID:", editingOrgId);

    try {
      const newItem: OrganizacionSemanalItem = {
        id: editingOrgId || generateUniqueId("org"),
        fecha: orgFecha,
        platoId: orgPlatoId,
      };

      console.log("[MealsView] Weekly plan item constructed:", newItem);

      await saveItemToFirestore(userId, "organizacion_semanal", newItem);
      console.log("[MealsView] Weekly plan saved successfully to Firestore.");
      showToast(editingOrgId ? "Planificación semanal actualizada" : "Planificación semanal guardada con éxito", "success");

      // Reset Form
      setOrgFecha("");
      setOrgPlatoId("");
      setShowAddOrg(false);
      setEditingOrgId(null);
    } catch (error) {
      console.error("[MealsView] Error saving weekly plan:", error);
      showToast("Error al guardar la planificación", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditOrgClick = (item: OrganizacionSemanalItem) => {
    setEditingOrgId(item.id);
    setOrgFecha(item.fecha);
    setOrgPlatoId(item.platoId);
    setShowAddOrg(true);
  };

  const handleDeleteOrg = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar esta planificación semanal? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        console.log("[MealsView] Deleting weekly plan:", id);
        try {
          await deleteItemFromFirestore(userId, "organizacion_semanal", id);
          console.log("[MealsView] Weekly plan deleted successfully.");
          showToast("Planificación semanal eliminada", "success");
        } catch (error) {
          console.error("[MealsView] Error deleting weekly plan:", error);
          showToast("Error al eliminar la planificación", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const filteredOrganizacion = (organizacionSemanal || [])
    .filter((item) => {
      const platoName = getPlatoName(item.platoId).toLowerCase();
      const diaName = getDiaDeLaSemana(item.fecha).toLowerCase();
      const query = orgSearchQuery.toLowerCase();
      return (
        platoName.includes(query) ||
        diaName.includes(query) ||
        item.fecha.includes(query)
      );
    })
    .sort((a, b) =>
      getPlatoName(a.platoId).localeCompare(getPlatoName(b.platoId)),
    );

  const formatFechaDMY = (fechaStr: string): string => {
    if (!fechaStr) return "-";
    const parts = fechaStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return fechaStr;
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

  // Lista de compras custom state
  const [manualShoppingItems, setManualShoppingItems] = useState<
    { id: string; mercaderiaId: string; cantidad: number }[]
  >(() => {
    try {
      const saved = localStorage.getItem("meals_manual_shopping");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deletedAutoIngredients, setDeletedAutoIngredients] = useState<
    string[]
  >(() => {
    try {
      const saved = localStorage.getItem("meals_deleted_auto_ingredients");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showAddManualShop, setShowAddManualShop] = useState(false);
  const [manualShopMercaderiaId, setManualShopMercaderiaId] = useState("");
  const [manualShopQty, setManualShopQty] = useState<number | "">("");
  const [shopSearchQuery, setShopSearchQuery] = useState("");

  const [notesCheckedItems, setNotesCheckedItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("meals_notes_checked_items");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notesGroupBy, setNotesGroupBy] = useState<
    "categoria" | "comercio" | "sector"
  >("categoria");

  React.useEffect(() => {
    localStorage.setItem(
      "meals_manual_shopping",
      JSON.stringify(manualShoppingItems),
    );
    window.dispatchEvent(new Event("storage"));
  }, [manualShoppingItems]);

  React.useEffect(() => {
    localStorage.setItem(
      "meals_deleted_auto_ingredients",
      JSON.stringify(deletedAutoIngredients),
    );
    window.dispatchEvent(new Event("storage"));
  }, [deletedAutoIngredients]);

  React.useEffect(() => {
    localStorage.setItem(
      "meals_notes_checked_items",
      JSON.stringify(notesCheckedItems),
    );
    window.dispatchEvent(new Event("storage"));
  }, [notesCheckedItems]);

  React.useEffect(() => {
    const handleStorageSync = () => {
      try {
        const savedManual = localStorage.getItem("meals_manual_shopping");
        if (savedManual) setManualShoppingItems(JSON.parse(savedManual));
        const savedDeleted = localStorage.getItem("meals_deleted_auto_ingredients");
        if (savedDeleted) setDeletedAutoIngredients(JSON.parse(savedDeleted));
        const savedNotes = localStorage.getItem("meals_notes_checked_items");
        if (savedNotes) setNotesCheckedItems(JSON.parse(savedNotes));
      } catch {}
    };
    window.addEventListener("storage", handleStorageSync);
    return () => window.removeEventListener("storage", handleStorageSync);
  }, []);

  // Combined Shopping List calculation
  const getCombinedShoppingList = () => {
    const listMap: {
      [name: string]: {
        name: string;
        cantidad: number;
        unidadMedida: string;
        categoria: string;
        comercio: string;
        sector: string;
        mercaderiaId?: string;
        isManual: boolean;
        isAuto: boolean;
      };
    } = {};

    // 1. Process Automatic Items from Weekly Organization
    (organizacionSemanal || []).forEach((item) => {
      const plato = platos.find((p) => p.id === item.platoId);
      if (!plato) return;

      const alimentoIds = [
        plato.alimentoId1,
        plato.alimentoId2,
        plato.alimentoId3,
      ].filter(Boolean) as string[];
      alimentoIds.forEach((aliId) => {
        const alim = alimentos.find((a) => a.id === aliId);
        if (!alim) return;

        // Ingredient 1
        if (alim.ingrediente1) {
          const ingName = alim.ingrediente1.trim();
          const ingQty = alim.cantidad1 || 0;
          if (!deletedAutoIngredients.includes(ingName)) {
            const lowerName = ingName.toLowerCase();
            if (!listMap[lowerName]) {
              // Find in mercaderia database
              const matchedMer = mercaderia.find(
                (m) => m.ingredientes.toLowerCase() === lowerName,
              );
              listMap[lowerName] = {
                name: matchedMer ? matchedMer.ingredientes : ingName,
                cantidad: 0,
                unidadMedida: matchedMer
                  ? matchedMer.unidadMedida
                  : alim.unidad1 || "Uni.",
                categoria: matchedMer ? matchedMer.categoria : "Otros",
                comercio: matchedMer ? matchedMer.comercio : "Otros",
                sector: matchedMer ? matchedMer.sector : "Otros",
                mercaderiaId: matchedMer?.id,
                isManual: false,
                isAuto: true,
              };
            }
            listMap[lowerName].cantidad += ingQty;
          }
        }

        // Ingredient 2
        if (alim.ingrediente2) {
          const ingName = alim.ingrediente2.trim();
          const ingQty = alim.cantidad2 || 0;
          if (!deletedAutoIngredients.includes(ingName)) {
            const lowerName = ingName.toLowerCase();
            if (!listMap[lowerName]) {
              const matchedMer = mercaderia.find(
                (m) => m.ingredientes.toLowerCase() === lowerName,
              );
              listMap[lowerName] = {
                name: matchedMer ? matchedMer.ingredientes : ingName,
                cantidad: 0,
                unidadMedida: matchedMer
                  ? matchedMer.unidadMedida
                  : alim.unidad2 || "Uni.",
                categoria: matchedMer ? matchedMer.categoria : "Otros",
                comercio: matchedMer ? matchedMer.comercio : "Otros",
                sector: matchedMer ? matchedMer.sector : "Otros",
                mercaderiaId: matchedMer?.id,
                isManual: false,
                isAuto: true,
              };
            }
            listMap[lowerName].cantidad += ingQty;
          }
        }

        // Ingredient 3
        if (alim.ingrediente3) {
          const ingName = alim.ingrediente3.trim();
          const ingQty = alim.cantidad3 || 0;
          if (!deletedAutoIngredients.includes(ingName)) {
            const lowerName = ingName.toLowerCase();
            if (!listMap[lowerName]) {
              const matchedMer = mercaderia.find(
                (m) => m.ingredientes.toLowerCase() === lowerName,
              );
              listMap[lowerName] = {
                name: matchedMer ? matchedMer.ingredientes : ingName,
                cantidad: 0,
                unidadMedida: matchedMer
                  ? matchedMer.unidadMedida
                  : alim.unidad3 || "Uni.",
                categoria: matchedMer ? matchedMer.categoria : "Otros",
                comercio: matchedMer ? matchedMer.comercio : "Otros",
                sector: matchedMer ? matchedMer.sector : "Otros",
                mercaderiaId: matchedMer?.id,
                isManual: false,
                isAuto: true,
              };
            }
            listMap[lowerName].cantidad += ingQty;
          }
        }
      });
    });

    // 2. Process Manual Items
    (manualShoppingItems || []).forEach((item) => {
      const matchedMer = mercaderia.find((m) => m.id === item.mercaderiaId);
      if (!matchedMer) return;

      const lowerName = matchedMer.ingredientes.toLowerCase();
      if (!listMap[lowerName]) {
        listMap[lowerName] = {
          name: matchedMer.ingredientes,
          cantidad: 0,
          unidadMedida: matchedMer.unidadMedida,
          categoria: matchedMer.categoria,
          comercio: matchedMer.comercio,
          sector: matchedMer.sector,
          mercaderiaId: matchedMer.id,
          isManual: true,
          isAuto: false,
        };
      } else {
        listMap[lowerName].isManual = true;
      }
      listMap[lowerName].cantidad += item.cantidad;
    });

    return Object.values(listMap);
  };

  const handleAddManualShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !manualShopMercaderiaId ||
      manualShopQty === "" ||
      Number(manualShopQty) <= 0
    )
      return;

    setIsSaving(true);
    try {
      // Check if item is already in manual list
      const existingIndex = manualShoppingItems.findIndex(
        (item) => item.mercaderiaId === manualShopMercaderiaId,
      );
      if (existingIndex !== -1) {
        const updated = [...manualShoppingItems];
        updated[existingIndex].cantidad += Number(manualShopQty);
        setManualShoppingItems(updated);
      } else {
        setManualShoppingItems([
          ...manualShoppingItems,
          {
            id: generateUniqueId("manual-shop"),
            mercaderiaId: manualShopMercaderiaId,
            cantidad: Number(manualShopQty),
          },
        ]);
      }

      setManualShopMercaderiaId("");
      setManualShopQty("");
      setShowAddManualShop(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShoppingItem = (
    itemName: string,
    mercaderiaId?: string,
  ) => {
    askConfirmation(
      "Confirmar Eliminación",
      `¿Estás seguro de que deseas eliminar "${itemName}" de la lista de compras?`,
      () => {
        // Exclude from auto if it's there
        if (!deletedAutoIngredients.includes(itemName)) {
          setDeletedAutoIngredients([...deletedAutoIngredients, itemName]);
        }

        // Remove from manual
        if (mercaderiaId) {
          setManualShoppingItems(
            manualShoppingItems.filter(
              (item) => item.mercaderiaId !== mercaderiaId,
            ),
          );
        } else {
          // Find mercaderia item by name and remove
          const matchedMer = mercaderia.find(
            (m) => m.ingredientes.toLowerCase() === itemName.toLowerCase(),
          );
          if (matchedMer) {
            setManualShoppingItems(
              manualShoppingItems.filter(
                (item) => item.mercaderiaId !== matchedMer.id,
              ),
            );
          }
        }
      },
    );
  };

  const handleResetShoppingList = () => {
    askConfirmation(
      "Confirmar Restablecimiento",
      "¿Estás seguro de que deseas restablecer la lista de compras? Se eliminarán los agregados manuales y se recuperarán los ingredientes calculados eliminados.",
      () => {
        setDeletedAutoIngredients([]);
        setManualShoppingItems([]);
      },
    );
  };

  const combinedShoppingList = getCombinedShoppingList();
  const filteredShoppingList = combinedShoppingList
    .filter((item) => {
      const q = shopSearchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q) ||
        item.comercio.toLowerCase().includes(q) ||
        item.sector.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Pantry Add Form
  const [showAddPantry, setShowAddPantry] = useState(false);
  const [newPName, setNewPName] = useState("");
  const [newPQty, setNewPQty] = useState<number>(1);
  const [newPUnit, setNewPUnit] = useState("unidades");
  const [newPMin, setNewPMin] = useState<number>(1);
  const [newPExp, setNewPExp] = useState("");

  // Shopping List item
  const [newShopName, setNewShopName] = useState("");
  const [newShopQty, setNewShopQty] = useState(1);
  const [newShopUnit, setNewShopUnit] = useState("unidades");

  // Meal Selection
  const [selectedDay, setSelectedDay] = useState("Lunes");

  const currentMealPlan = meals.find((m) => m.day === selectedDay) || meals[0];

  // Calendar State for Weekly Planner (Subtab: Planificador)
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    string | null
  >(null);

  // Days in month helper for calendar
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    return days;
  };

  // Mercadería form / view state
  const [showAddMercaderia, setShowAddMercaderia] = useState(false);

  useLockBodyScroll(
    Boolean(
      showAddAlimento ||
        showAddPlato ||
        showAddOrg ||
        showAddManualShop ||
        showAddPantry ||
        showAddMercaderia
    )
  );
  const [editingMercaderiaId, setEditingMercaderiaId] = useState<string | null>(
    null,
  );

  const [merName, setMerName] = useState("");
  const [merCategory, setMerCategory] = useState("Mercaderia");
  const [merSector, setMerSector] = useState("Dispensa");
  const [merStore, setMerStore] = useState("Chinos");
  const [merUnit, setMerUnit] = useState("Uni.");
  const [merCalorias, setMerCalorias] = useState<number | "">("");

  // Nutritional values states for Mercadería form
  const [merGrasas, setMerGrasas] = useState<number | "">(0);
  const [merProteinas, setMerProteinas] = useState<number | "">(0);
  const [merCarbohidratos, setMerCarbohidratos] = useState<number | "">(0);
  const [merAzucares, setMerAzucares] = useState<number | "">(0);
  const [merFibra, setMerFibra] = useState<number | "">(0);
  const [merSodio, setMerSodio] = useState<number | "">(0);

  // OpenFoodFacts search states
  const [offSearchQuery, setOffSearchQuery] = useState("");
  const [offResults, setOffResults] = useState<any[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [offError, setOffError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

  // Tab container ref for horizontal scrolling of submenus
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Handlers for Pantry
  const handleAddPantry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPName.trim()) {
      console.warn("[MealsView] Validation failed: newPName is empty");
      return;
    }

    setIsSaving(true);
    console.log("[MealsView] Adding pantry item:", newPName);

    try {
      const nItem: PantryItem = {
        id: generateUniqueId("pan"),
        name: newPName.trim(),
        quantity: Number(newPQty) || 1,
        unit: newPUnit,
        minQuantity: Number(newPMin) || 1,
        expirationDate: newPExp || undefined,
      };

      console.log("[MealsView] Pantry item constructed:", nItem);

      await saveItemToFirestore(userId, "pantry", nItem);
      setPantry((prev) => [nItem, ...prev]);
      console.log("[MealsView] Pantry item saved successfully.");
      showToast("Ingrediente agregado a la despensa", "success");

      setNewPName("");
      setNewPQty(1);
      setNewPMin(1);
      setNewPExp("");
      setShowAddPantry(false);
    } catch (error) {
      console.error("[MealsView] Error saving pantry item:", error);
      showToast("Error al agregar a la despensa", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMeal = (
    dayId: string,
    mealType: "breakfast" | "lunch" | "dinner" | "snack",
    value: string,
  ) => {
    const targetMeal = meals.find((m) => m.id === dayId);
    if (targetMeal) {
      const updated = { ...targetMeal, [mealType]: value };
      saveItemToFirestore(userId, "meals", updated);
    }
    setMeals((prev) =>
      prev.map((m) => {
        if (m.id === dayId) {
          return { ...m, [mealType]: value };
        }
        return m;
      }),
    );
  };

  const handleAddShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) {
      console.warn("[MealsView] Validation failed: newShopName is empty");
      return;
    }

    setIsSaving(true);
    console.log("[MealsView] Adding shopping item:", newShopName);

    try {
      const nShop: ShoppingItem = {
        id: generateUniqueId("shop"),
        name: newShopName.trim(),
        quantity: Number(newShopQty) || 1,
        unit: newShopUnit,
        checked: false,
      };

      console.log("[MealsView] Shopping item constructed:", nShop);

      await saveItemToFirestore(userId, "shopping", nShop);
      setShoppingList((prev) => [nShop, ...prev]);
      console.log("[MealsView] Shopping item saved successfully.");
      showToast("Artículo agregado a la lista de compras", "success");

      setNewShopName("");
      setNewShopQty(1);
    } catch (error) {
      console.error("[MealsView] Error saving shopping item:", error);
      showToast("Error al agregar a la lista de compras", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePantry = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este ingrediente de la despensa? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        console.log("[MealsView] Deleting pantry item:", id);
        try {
          await deleteItemFromFirestore(userId, "pantry", id);
          setPantry((prev) => prev.filter((p) => p.id !== id));
          console.log("[MealsView] Pantry item deleted successfully.");
          showToast("Ingrediente eliminado de la despensa", "success");
        } catch (error) {
          console.error("[MealsView] Error deleting pantry item:", error);
          showToast("Error al eliminar de la despensa", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const toggleShopping = (id: string) => {
    const targetItem = shoppingList.find((s) => s.id === id);
    if (targetItem) {
      const updated = { ...targetItem, checked: !targetItem.checked };
      saveItemToFirestore(userId, "shopping", updated);
    }
    setShoppingList((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, checked: !s.checked } : s,
      ),
    );
  };

  const deleteShopping = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este ítem de la lista de compras rápida? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteItemFromFirestore(userId, "shopping", id);
          setShoppingList((prev) => prev.filter((s) => s.id !== id));
          showToast("Artículo eliminado de la lista", "success");
        } catch (error) {
          console.error("Error deleting shopping item:", error);
          showToast("Error al eliminar de la lista", "error");
        }
      },
    );
  };

  // Auto-generate shopping list items from low stock pantry
  const generateFromLowStock = () => {
    const lowStockItems = pantry.filter(
      (item) => item.quantity <= item.minQuantity,
    );
    if (lowStockItems.length === 0) {
      alert(
        "¡Tu despensa está completamente abastecida! No hay ingredientes con bajo stock.",
      );
      return;
    }

    const newItems: ShoppingItem[] = [];
    lowStockItems.forEach((item) => {
      // Check if already in shopping list
      if (
        !shoppingList.some(
          (s) => s.name.toLowerCase() === item.name.toLowerCase(),
        )
      ) {
        newItems.push({
          id: "shop-gen-" + item.id,
          name: item.name,
          quantity: item.minQuantity * 2, // Stock up
          unit: item.unit,
          checked: false,
        });
      }
    });

    if (newItems.length === 0) {
      alert(
        "Los ingredientes de bajo stock ya se encuentran en tu lista de compras.",
      );
      return;
    }

    setShoppingList((prev) => [...prev, ...newItems]);
    alert(
      `Se agregaron ${newItems.length} ingredientes con bajo stock a tu lista de compras.`,
    );
  };

  // Adjust Pantry Quantity manually
  const adjustPantryQty = (id: string, delta: number) => {
    setPantry((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newQty = Math.max(0, p.quantity + delta);
          return { ...p, quantity: newQty };
        }
        return p;
      }),
    );
  };

  // Mercadería Handlers
  const handleAddOrEditMercaderia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merName.trim()) {
      console.warn("[MealsView] Validation failed: merName is empty");
      return;
    }

    setIsSaving(true);
    console.log("[MealsView] Saving mercadería. Editing ID:", editingMercaderiaId);

    try {
      const newItem: MercaderiaItem = {
        id: editingMercaderiaId || generateUniqueId("mer"),
        ingredientes: merName.trim(),
        categoria: merCategory,
        sector: merSector.trim(),
        comercio: merStore.trim(),
        unidadMedida: merUnit,
        valoresNutricionales: {
          grasas: typeof merGrasas === "number" ? merGrasas : 0,
          proteinas: typeof merProteinas === "number" ? merProteinas : 0,
          carbohidratos: typeof merCarbohidratos === "number" ? merCarbohidratos : 0,
          azucares: typeof merAzucares === "number" ? merAzucares : 0,
          fibra: typeof merFibra === "number" ? merFibra : 0,
          sodio: typeof merSodio === "number" ? merSodio : 0,
        },
      };

      console.log("[MealsView] Mercadería item constructed:", newItem);

      await saveItemToFirestore(userId, "mercaderia", newItem);
      setMercaderia((prev) => {
        const exists = prev.some((m) => m.id === newItem.id);
        if (exists) return prev.map((m) => (m.id === newItem.id ? newItem : m));
        return [newItem, ...prev];
      });
      console.log("[MealsView] Mercadería saved successfully to Firestore.");
      showToast(editingMercaderiaId ? "Mercadería actualizada con éxito" : "Mercadería guardada con éxito", "success");

      // Reset fields
      setMerName("");
      setMerCategory("Mercaderia");
      setMerSector("Dispensa");
      setMerStore("Chinos");
      setMerUnit("Uni.");
      setMerCalorias("");
      setMerGrasas(0);
      setMerProteinas(0);
      setMerCarbohidratos(0);
      setMerAzucares(0);
      setMerFibra(0);
      setMerSodio(0);
      setOffSearchQuery("");
      setOffResults([]);
      setOffError(null);
      setShowAddMercaderia(false);
      setEditingMercaderiaId(null);
    } catch (error) {
      console.error("[MealsView] Error saving Mercadería:", error);
      showToast("Error al guardar la mercadería", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (item: MercaderiaItem) => {
    setEditingMercaderiaId(item.id);
    setMerName(item.ingredientes);
    setMerCategory(item.categoria);
    setMerSector(item.sector);
    setMerStore(item.comercio);
    setMerUnit(item.unidadMedida);
    setMerCalorias("");
    
    // Set nutritional values from item or estimated fallback
    const vn = item.valoresNutricionales || generarNutricionEstimada(item.ingredientes, item.categoria);
    setMerGrasas(vn.grasas);
    setMerProteinas(vn.proteinas);
    setMerCarbohidratos(vn.carbohidratos);
    setMerAzucares(vn.azucares);
    setMerFibra(vn.fibra);
    setMerSodio(vn.sodio);
    
    // Clear OFF search
    setOffSearchQuery("");
    setOffResults([]);
    setOffError(null);

    setShowAddMercaderia(true);
  };

  const handleDeleteMercaderia = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este artículo de mercadería? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        console.log("[MealsView] Deleting mercadería:", id);
        try {
          await deleteItemFromFirestore(userId, "mercaderia", id);
          setMercaderia((prev) => prev.filter((m) => m.id !== id));
          console.log("[MealsView] Mercadería deleted successfully.");
          showToast("Mercadería eliminada con éxito", "success");
        } catch (error) {
          console.error("[MealsView] Error deleting Mercadería:", error);
          showToast("Error al eliminar la mercadería", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  // OpenFoodFacts search and selection handlers
  const searchOpenFoodFacts = async (query: string) => {
    if (!query.trim()) return;
    setOffLoading(true);
    setOffError(null);
    try {
      const proxyRes = await fetch(`/api/openfoodfacts/search?q=${encodeURIComponent(query)}`);
      const contentType = proxyRes.headers.get("content-type");
      if (!proxyRes.ok) {
        throw new Error(`Error en el servidor: status ${proxyRes.status}`);
      }
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Respuesta no válida del servidor");
      }
      const data = await proxyRes.json();

      if (data && data.products) {
        const parsedProducts = data.products.map((p: any) => {
          const nutriments = p.nutriments || {};
          
          const proteinas = parseFloat(nutriments.proteins_100g ?? nutriments.proteins_value ?? nutriments.proteins ?? 0);
          const grasas = parseFloat(nutriments.fat_100g ?? nutriments.fat_value ?? nutriments.fat ?? 0);
          const carbohidratos = parseFloat(nutriments.carbohydrates_100g ?? nutriments.carbohydrates_value ?? nutriments.carbohydrates ?? 0);
          const azucares = parseFloat(nutriments.sugars_100g ?? nutriments.sugars_value ?? nutriments.sugars ?? 0);
          const fibra = parseFloat(nutriments.fiber_100g ?? nutriments.fiber_value ?? nutriments.fiber ?? 0);
          
          let sodiumVal = nutriments.sodium_100g ?? nutriments.sodium_value ?? nutriments.sodium;
          if (sodiumVal === undefined && nutriments.salt_100g !== undefined) {
            sodiumVal = parseFloat(nutriments.salt_100g) / 2.5;
          }
          const sodio = Math.round(parseFloat(sodiumVal ?? 0) * 1000);

          return {
            id: p.id || p.code || String(Math.random()),
            name: p.product_name_es || p.product_name || p.product_name_en || "Producto sin nombre",
            brand: p.brands || "",
            category: p.categories_tags?.[0]?.replace("en:", "")?.replace("es:", "") || "Mercaderia",
            valoresNutricionales: {
              grasas: Math.round(grasas * 10) / 10,
              proteinas: Math.round(proteinas * 10) / 10,
              carbohidratos: Math.round(carbohidratos * 10) / 10,
              azucares: Math.round(azucares * 10) / 10,
              fibra: Math.round(fibra * 10) / 10,
              sodio: Math.round(sodio),
            }
          };
        });
        setOffResults(parsedProducts);
        if (parsedProducts.length === 0) {
          setOffError("No se encontraron productos en OpenFoodFacts.");
        }
      } else {
        setOffResults([]);
        setOffError("No se encontraron productos.");
      }
    } catch (error: any) {
      console.error("[MealsView] OpenFoodFacts search error:", error);
      setOffError("Error de conexión con OpenFoodFacts. Intente nuevamente.");
    } finally {
      setOffLoading(false);
    }
  };

  const handleSelectOffProduct = (prod: any) => {
    const fullName = prod.name + (prod.brand ? ` (${prod.brand})` : "");
    setMerName(fullName);
    
    setMerGrasas(prod.valoresNutricionales.grasas);
    setMerProteinas(prod.valoresNutricionales.proteinas);
    setMerCarbohidratos(prod.valoresNutricionales.carbohidratos);
    setMerAzucares(prod.valoresNutricionales.azucares);
    setMerFibra(prod.valoresNutricionales.fibra);
    setMerSodio(prod.valoresNutricionales.sodio);
    
    setOffResults([]);
    setOffSearchQuery("");
    setOffError(null);
    showToast(`Valores cargados de ${prod.name}`, "info");
  };

  // Pagination States
  const [merPage, setMerPage] = useState(1);
  const [aliPage, setAliPage] = useState(1);
  const [platoPage, setPlatoPage] = useState(1);
  const pageSize = 15;

  // Filter/Search Mercadería
  const filteredMercaderia = React.useMemo(() => {
    return mercaderia
      .filter((item) => {
        const matchesSearch =
          item.ingredientes.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.comercio.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
          selectedCategory === "Todas" || item.categoria === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.ingredientes.localeCompare(b.ingredientes));
  }, [mercaderia, searchQuery, selectedCategory]);

  const totalMerPages = Math.ceil(filteredMercaderia.length / pageSize) || 1;
  const paginatedMercaderia = React.useMemo(() => {
    const start = (merPage - 1) * pageSize;
    return filteredMercaderia.slice(start, start + pageSize);
  }, [filteredMercaderia, merPage, pageSize]);

  // Filter/Search Alimentos
  const filteredAlimentos = React.useMemo(() => {
    return alimentos
      .filter((item) => {
        const query = aliSearchQuery.toLowerCase();
        return (
          item.mercaderiaName.toLowerCase().includes(query) ||
          (item.ingrediente1 &&
            item.ingrediente1.toLowerCase().includes(query)) ||
          (item.ingrediente2 &&
            item.ingrediente2.toLowerCase().includes(query)) ||
          (item.ingrediente3 &&
            item.ingrediente3.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => a.mercaderiaName.localeCompare(b.mercaderiaName));
  }, [alimentos, aliSearchQuery]);

  const totalAliPages = Math.ceil(filteredAlimentos.length / pageSize) || 1;
  const paginatedAlimentos = React.useMemo(() => {
    const start = (aliPage - 1) * pageSize;
    return filteredAlimentos.slice(start, start + pageSize);
  }, [filteredAlimentos, aliPage, pageSize]);

  // Filter/Search Platos
  const filteredPlatos = React.useMemo(() => {
    return platos
      .filter((item) => {
        const query = plaSearchQuery.toLowerCase();
        return (
          item.nombrePlato.toLowerCase().includes(query) ||
          getAlimentoName(item.alimentoId1).toLowerCase().includes(query) ||
          getAlimentoName(item.alimentoId2).toLowerCase().includes(query) ||
          getAlimentoName(item.alimentoId3).toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.nombrePlato.localeCompare(b.nombrePlato));
  }, [platos, plaSearchQuery, alimentos]);

  const totalPlatoPages = Math.ceil(filteredPlatos.length / pageSize) || 1;
  const paginatedPlatos = React.useMemo(() => {
    const start = (platoPage - 1) * pageSize;
    return filteredPlatos.slice(start, start + pageSize);
  }, [filteredPlatos, platoPage, pageSize]);

  useEffect(() => {
    setAliPage(1);
  }, [aliSearchQuery]);

  useEffect(() => {
    setPlatoPage(1);
  }, [plaSearchQuery]);

  // Get distinct categories for filter
  const categoriesList = ["Todas", ...CATEGORIAS];

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6">
      {partnerInfo.isLinked && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 px-4 rounded-2xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary dark:text-blue-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>
              Base de datos de Comidas vinculada con: <strong className="text-zinc-900 dark:text-white">{partnerInfo.partnerEmail}</strong>
            </span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-primary/20 px-2.5 py-0.5 rounded-full">
            Sincronización en Vivo
          </span>
        </div>
      )}

      {/* Submenu Tabs Selector with Navigation Arrows */}
      {!propActiveSubTab && (
        <SubNav
          activeTab={activeSubTab}
          onTabChange={(id) => setActiveSubTab(id as any)}
          className="mb-6"
          tabs={[
            {
              id: "planificador",
              label: "Mi Alimentación",
              icon: UtensilsCrossed,
            },
            {
              id: "creacion_comidas",
              label: "Creación de Comidas",
              icon: Database,
            },
            {
              id: "organizacion_semanal",
              label: "Organización Semanal",
              icon: CalendarDays,
            },
            { id: "lista_compras", label: "Lista de Compras", icon: ShoppingBag },
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
          {/* RENDER PLANIFICADOR TAB */}
          {activeSubTab === "planificador" &&
            (() => {
          const MONTHS_ES = [
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre",
          ];
          const WEEKDAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Left Column: Compact Calendar Card (col-span-4) */}
              <div
                className={`p-6 rounded-3xl border flex flex-col lg:col-span-4 justify-between h-fit app-calendar-container ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-extrabold text-sm flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary animate-pulse" />
                      <span>Calendario de Comidas</span>
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const newCal = new Date(calendarDate);
                          newCal.setMonth(newCal.getMonth() - 1);
                          setCalendarDate(newCal);
                        }}
                        className="p-1.5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-primary cursor-pointer transition-colors"
                        title="Mes Anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const newCal = new Date(calendarDate);
                          newCal.setMonth(newCal.getMonth() + 1);
                          setCalendarDate(newCal);
                        }}
                        className="p-1.5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-primary cursor-pointer transition-colors"
                        title="Mes Siguiente"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-center font-extrabold text-xs mb-4 text-slate-800 dark:text-zinc-200 uppercase tracking-widest bg-slate-50 dark:bg-black/40 py-2 rounded-xl">
                    {MONTHS_ES[calendarDate.getMonth()]}{" "}
                    {calendarDate.getFullYear()}
                  </div>

                  <div className={`p-4 rounded-3xl ${darkMode ? "bg-zinc-950 shadow-sm" : "bg-white shadow-sm border border-slate-100"}`}>
{/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    {WEEKDAYS_ES.map((wd) => (
                      <div key={wd} className="py-1">
                        {wd}
                      </div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(calendarDate).map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} className="p-1" />;
                      }

                      const dateStr = `${calendarDate.getFullYear()}-${String(
                        calendarDate.getMonth() + 1,
                      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                      const count = (organizacionSemanal || []).filter(
                        (os) => os.fecha === dateStr,
                      ).length;
                      const isSelected = selectedCalendarDate === dateStr;
                      const isToday = getLocalDateString() === dateStr;

                      return (
                        <button
                          key={`day-${day}`}
                          onClick={() => {
                            setSelectedCalendarDate(
                              selectedCalendarDate === dateStr ? null : dateStr,
                            );
                          }}
                          className={`p-1.5 rounded-full flex flex-col items-center justify-center relative cursor-pointer transition-all h-9 w-full font-bold text-xs ${
                            isSelected
                              ? "border-2 border-primary text-primary dark:text-primary bg-primary/10 scale-105 shadow-sm"
                              : isToday
                                ? "bg-primary text-white dark:text-blue-950 shadow-md font-bold"
                                : "hover:bg-primary/10 text-slate-700 dark:text-zinc-300"
                          }`}
                        >
                          <span>{day}</span>
                          {count > 0 && (
                            <span
                              className={`absolute bottom-1 w-1 h-1 rounded-full ${
                                isSelected
                                  ? "bg-primary"
                                  : "bg-primary animate-pulse"
                              }`}
                              title={`${count} plato(s)`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
</div>

                {/* Calendar Footer Info */}
                <div className="mt-5 pt-3.5 border-t border-zinc-800/10 dark:border-zinc-800/40 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span>Días planificados</span>
                  </span>
                  <button
                    onClick={() => {
                      setCalendarDate(new Date());
                      setSelectedCalendarDate(null);
                    }}
                    className="text-primary dark:text-primary hover:underline cursor-pointer font-bold animate-pulse"
                  >
                    Ir a Hoy
                  </button>
                </div>
              </div>

              {/* Middle Column: Organización Semanal Card (col-span-4) */}
              <div
                className={`p-6 rounded-3xl border flex flex-col lg:col-span-4 justify-between h-fit ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-primary animate-pulse" />
                      <h3 className="font-extrabold text-sm">
                        Organización Semanal
                      </h3>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        if (selectedCalendarDate) {
                          setOrgFecha(selectedCalendarDate);
                        } else {
                          setOrgFecha(getLocalDateString());
                        }
                        setEditingOrgId(null);
                        setOrgPlatoId("");
                        setShowAddOrg(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 dark:hover:bg-primary dark:text-zinc-950 text-xs font-extrabold cursor-pointer transition-all shadow-md shrink-0 w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Planificar Plato</span>
                    </motion.button>
                  </div>

                  {/* Selected Date Header Banner for Organización Semanal */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2.5 px-4 bg-slate-50 dark:bg-black/40 border border-slate-150 dark:border-zinc-800/50 rounded-2xl mb-4">
                    <div>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                        Día Seleccionado
                      </p>
                      <p className="text-xs md:text-sm font-extrabold text-black dark:text-zinc-200 mt-0.5">
                        {formatDateFriendly(selectedCalendarDate || getLocalDateString())}
                      </p>
                    </div>

                    {selectedCalendarDate && (
                      <button
                        onClick={() => setSelectedCalendarDate(null)}
                        className="px-2.5 py-1 text-[10px] text-primary font-bold hover:underline cursor-pointer bg-slate-200/60 dark:bg-black/80 rounded-xl self-start sm:self-auto"
                        title="Ver todas las fechas"
                      >
                        Ver Todos
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {(() => {
                      const filtered = (organizacionSemanal || [])
                        .filter((os) => {
                          return (
                            !selectedCalendarDate ||
                            os.fecha === selectedCalendarDate
                          );
                        })
                        .sort((a, b) => a.fecha.localeCompare(b.fecha));

                      if (filtered.length === 0) {
                        return (
                          <p className="text-zinc-500 text-xs text-center py-10 italic">
                            No tienes platos planificados{" "}
                            {selectedCalendarDate ? "para este día" : ""}.
                          </p>
                        );
                      }

                      return (
                        <AnimatedList<OrganizacionSemanalItem>
                          items={filtered}
                          showGradients={true}
                          enableArrowNavigation={true}
                          className="max-h-[420px]"
                          style={{
                            '--gradient-color': darkMode ? '#18181b' : '#ffffff',
                          } as React.CSSProperties}
                          renderItem={(os) => {
                            const isToday = os.fecha === getLocalDateString();
                            return (
                              <div
                                key={os.id}
                                onClick={() => setActiveDetailItem(os)}
                                className={`rounded-2xl border transition-all flex flex-col justify-between relative cursor-pointer group overflow-hidden ${darkMode ? "bg-zinc-950 border-zinc-800 shadow-sm" : "bg-white border-zinc-200 shadow-sm"} ${isToday ? "ring-2 ring-primary/40 border-primary dark:border-primary" : "hover:border-primary/40"}`}
                                title="Haga clic para ver toda la información desplegada"
                              >
                                <div className="w-full h-28 overflow-hidden border-b border-inherit bg-slate-100 dark:bg-zinc-800/50">
                                  <img
                                    src={`https://tse2.mm.bing.net/th?q=${encodeURIComponent(getPlatoName(os.platoId) + " comida receta")}&w=400&h=200&c=7&rs=1`}
                                    alt={getPlatoName(os.platoId)}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="p-4 space-y-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                                          isToday
                                            ? "bg-primary/10 text-primary dark:text-primary"
                                            : "bg-primary/10 text-primary dark:text-primary"
                                        }`}
                                      >
                                        {getDiaDeLaSemana(os.fecha)}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-zinc-850 text-slate-500 dark:text-zinc-400">
                                        {formatFechaDMY(os.fecha)}
                                      </span>
                                      <span className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                        • Ver info desplegada
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div
                                      className="flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        onClick={() => handleEditOrgClick(os)}
                                        className="p-1 hover:bg-zinc-500/10 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                                        title="Editar Plan"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOrg(os.id)}
                                        className="p-1 hover:bg-red-500/10 rounded-lg text-red-500 hover:text-red-600 transition-all cursor-pointer"
                                        title="Eliminar Plan"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <h4
                                      className="font-extrabold text-sm force-text-black organizacion-semanal-plato-title text-black dark:text-white mb-1 flex items-center gap-1.5"
                                      data-plato-title="true"
                                      style={{ color: darkMode ? "#ffffff" : "#000000" }}
                                    >
                                      <UtensilsCrossed className="w-3.5 h-3.5 text-primary shrink-0 self-center" />
                                      <span
                                        className="force-text-black organizacion-semanal-plato-title self-center translate-y-[0.5px]"
                                        data-plato-title="true"
                                        style={{ color: darkMode ? "#ffffff" : "#000000" }}
                                      >
                                        {getPlatoName(os.platoId)}
                                      </span>
                                    </h4>
                                    <div className="mt-2">
                                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                        Ingredientes:
                                      </span>
                                      {renderPlatoIngredientsBadges(os.platoId)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: Checklist de Compras Card (col-span-4) */}
              <div
                id="shopping-notes-card"
                className={`p-6 rounded-3xl border lg:col-span-4 self-start space-y-6 ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                {/* Header & Controls */}
                <div className="border-b border-slate-100 dark:border-zinc-800/40 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-primary">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4
                        className="font-extrabold text-sm tracking-tight text-black dark:text-white"
                        style={{ color: darkMode ? undefined : '#000000' }}
                      >
                        Checklist de Compras
                      </h4>
                    </div>
                  </div>

                  {/* Grouping Selector as Dropdown */}
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/40 px-3 py-1 mt-2.5 rounded-xl border border-slate-200/50 dark:border-zinc-800/30 w-full sm:w-fit">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">
                      Agrupar por:
                    </span>
                    <CustomSelect
                      value={notesGroupBy}
                      onChange={(val) =>
                        setNotesGroupBy(
                          val as "categoria" | "comercio" | "sector",
                        )
                      }
                      options={[
                        { value: "categoria", label: "Categoría" },
                        { value: "comercio", label: "Comercio" },
                        { value: "sector", label: "Sector" },
                      ]}
                      size="sm"
                      className="w-full sm:w-28"
                    />
                  </div>
                </div>

                {/* Grouped Shopping Checklist */}
                {combinedShoppingList.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-zinc-700 animate-pulse" />
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">
                      No hay ingredientes en tu lista de compras
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 max-w-xs mx-auto block mt-1">
                      Planifica platos en el calendario de arriba o agrega ítems
                      manuales en la subpestaña "Lista de Compras" para llenar
                      esta sección.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const groups: {
                        [key: string]: typeof combinedShoppingList;
                      } = {};
                      combinedShoppingList.forEach((item) => {
                        let key = "Otros";
                        if (notesGroupBy === "categoria")
                          key = item.categoria || "Otros";
                        else if (notesGroupBy === "comercio")
                          key = item.comercio || "Otros";
                        else if (notesGroupBy === "sector")
                          key = item.sector || "Otros";

                        const capitalizedKey =
                          key.trim().charAt(0).toUpperCase() +
                          key.trim().slice(1);
                        if (!groups[capitalizedKey]) {
                          groups[capitalizedKey] = [];
                        }
                        groups[capitalizedKey].push(item);
                      });

                      const groupNames = Object.keys(groups).sort();

                      return (
                        <AnimatedList<string>
                          items={groupNames}
                          showGradients={true}
                          enableArrowNavigation={true}
                          className="max-h-[480px]"
                          style={{
                            '--gradient-color': darkMode ? '#18181b' : '#ffffff',
                          } as React.CSSProperties}
                          renderItem={(groupName) => (
                            <div
                              key={groupName}
                              className={`border rounded-2xl p-3 space-y-2 shadow-xs ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"}`}
                            >
                              {/* Group Title */}
                              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-zinc-800/30 pb-1.5">
                                <h5 className="text-[10px] font-extrabold text-primary dark:text-primary uppercase tracking-wider flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                  {groupName}
                                </h5>
                                <span className="text-[9px] font-bold bg-white/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-transparent">
                                  {groups[groupName].length}{" "}
                                  {groups[groupName].length === 1
                                    ? "ítem"
                                    : "ítems"}
                                </span>
                              </div>

                              {/* Checklist items */}
                              <div className="space-y-1">
                                {groups[groupName].map((item, itemIdx) => {
                                  const isCompleted =
                                    notesCheckedItems.includes(
                                      item.name.toLowerCase(),
                                    );
                                  return (
                                    <label
                                      key={itemIdx}
                                      className={`flex items-start gap-2.5 p-1.5 rounded-lg cursor-pointer transition-all border ${
                                        isCompleted
                                          ? "bg-white/30 dark:bg-black/10 border-transparent opacity-60"
                                          : "bg-white/70 dark:bg-black border-slate-200/40 dark:border-zinc-800/30 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-white/90 dark:hover:bg-zinc-900/10"
                                      }`}
                                      style={{
                                        backgroundColor: !darkMode
                                          ? isCompleted
                                            ? "rgba(255, 255, 255, 0.4)"
                                            : "rgba(255, 255, 255, 0.75)"
                                          : undefined,
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isCompleted}
                                        onChange={() => {
                                          const lowerName =
                                            item.name.toLowerCase();
                                          if (
                                            notesCheckedItems.includes(
                                              lowerName,
                                            )
                                          ) {
                                            setNotesCheckedItems(
                                              notesCheckedItems.filter(
                                                (n) => n !== lowerName,
                                              ),
                                            );
                                          } else {
                                            setNotesCheckedItems([
                                              ...notesCheckedItems,
                                              lowerName,
                                            ]);
                                          }
                                        }}
                                        className="mt-0.5 rounded border-slate-300 dark:border-zinc-700 text-primary focus:ring-primary h-3 w-3 cursor-pointer accent-primary"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p
                                          className={`text-[11px] font-semibold leading-tight break-words ${
                                            isCompleted
                                              ? "line-through text-slate-400 dark:text-zinc-500"
                                              : "text-black dark:text-zinc-200"
                                          }`}
                                          style={
                                            !isCompleted && !darkMode
                                              ? { color: "#000000" }
                                              : undefined
                                          }
                                        >
                                          {item.name}
                                        </p>
                                        <span
                                          className={`text-[9px] mt-0.5 block ${
                                            isCompleted
                                              ? "line-through text-slate-400 dark:text-zinc-600"
                                              : "text-primary dark:text-primary font-bold"
                                          }`}
                                        >
                                          Cant: {item.cantidad}{" "}
                                          {item.unidadMedida}
                                        </span>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        />
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* RENDER CREACION COMIDAS TAB */}
      {activeSubTab === "creacion_comidas" && (
        <div className="space-y-6">
          {/* Selector de Pestañas style matching Inversiones */}
          <div className="flex items-center justify-center gap-2 mb-8 w-full max-w-md mx-auto">
            <button
              type="button"
              onClick={scrollCreacionComidasTabsLeft}
              className={`pointer-events-auto p-1 rounded-full bg-white/90 dark:bg-black/95 border border-zinc-200/60 dark:border-white/10 text-zinc-600 dark:text-zinc-300 shadow-md hover:text-primary dark:hover:text-white transition-all cursor-pointer flex md:hidden items-center justify-center flex-shrink-0 w-8 h-8 ${["mercaderia","alimentos","platos"].indexOf(creacionComidasActiveTab) === 0 ? "opacity-30 pointer-events-none" : ""}`}
              aria-label="Desplazar izquierda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex-grow min-w-0">
              <div
                ref={creacionComidasScrollRef}
                className="flex items-center justify-start md:justify-center gap-1.5 p-1 sm:p-1.5 bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-md w-full overflow-x-auto scroll-smooth scrollbar-none whitespace-nowrap"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <button
                  type="button"
                  onClick={(e) => { setCreacionComidasActiveTab("mercaderia"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative md:!flex-1 shrink-0 py-2 px-3.5 sm:px-4 text-xs md:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 cursor-pointer z-10 whitespace-nowrap ${
                    creacionComidasActiveTab === "mercaderia"
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  <Database className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Mercadería</span>
                  {creacionComidasActiveTab === "mercaderia" && (
                    <motion.div
                      layoutId="activeCreacionComidasTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => { setCreacionComidasActiveTab("alimentos"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative md:!flex-1 shrink-0 py-2 px-3.5 sm:px-4 text-xs md:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 cursor-pointer z-10 whitespace-nowrap ${
                    creacionComidasActiveTab === "alimentos"
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Alimentos</span>
                  {creacionComidasActiveTab === "alimentos" && (
                    <motion.div
                      layoutId="activeCreacionComidasTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => { setCreacionComidasActiveTab("platos"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative md:!flex-1 shrink-0 py-2 px-3.5 sm:px-4 text-xs md:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 cursor-pointer z-10 whitespace-nowrap ${
                    creacionComidasActiveTab === "platos"
                      ? "text-white font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                  }`}
                >
                  <ChefHat className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Platos</span>
                  {creacionComidasActiveTab === "platos" && (
                    <motion.div
                      layoutId="activeCreacionComidasTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollCreacionComidasTabsRight}
              className={`pointer-events-auto p-1 rounded-full bg-white/90 dark:bg-black/95 border border-zinc-200/60 dark:border-white/10 text-zinc-600 dark:text-zinc-300 shadow-md hover:text-primary dark:hover:text-white transition-all cursor-pointer flex md:hidden items-center justify-center flex-shrink-0 w-8 h-8 ${["mercaderia","alimentos","platos"].indexOf(creacionComidasActiveTab) === 2 ? "opacity-30 pointer-events-none" : ""}`}
              aria-label="Desplazar derecha"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {creacionComidasActiveTab === "mercaderia" && (
              <motion.div
                key="mercaderia"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <span>Base de Datos de Mercadería</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Registra y cataloga tus ingredientes habituales por comercio, unidad de medida y sector de almacenamiento.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                onClick={updateAllPrices}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Sync Precios</span>
              </button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  setEditingMercaderiaId(null);
                  setMerName("");
                  setMerCategory("Mercaderia");
                  setMerSector("Dispensa");
                  setMerStore("Chinos");
                  setMerUnit("Uni.");
                  setMerCalorias("");
                  setShowAddMercaderia(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Mercadería</span>
              </motion.button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
            {/* Search query */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="text"
                placeholder="Buscar por ingredientes, categorías, comercios o sectores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
              />
            </div>
            {/* Category selection */}
            <CustomSelect
              size="sm"
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={categoriesList.map((cat) => ({
                value: cat,
                label: cat,
              }))}
              icon={<Filter className="w-3.5 h-3.5" />}
              className="w-full sm:w-56 shrink-0"
            />
          </div>

          {/* Interactive Table */}
          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="sticky top-0 z-20">
                <tr
                  className={`text-xs font-bold uppercase tracking-wider ${ darkMode ?"bg-zinc-950/40 text-zinc-400"
                      : "bg-slate-50 text-slate-500"
                  }`}
                >
                  <th className="px-4 py-4 whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[220px] w-[220px] max-w-[220px]">
                    <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Detalle</span>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cat.</span>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Sector</span>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Comercio</span>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> U.M.</span>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Val. Nutri. <span className="text-[10px] font-normal text-zinc-400">(100g)</span></span>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Calorías <span className="text-[10px] font-normal text-zinc-400">(100g)</span></span>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Precio</span>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="flex items-center justify-end gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                  </th>
                </tr>
              </thead>
              <tbody className="">
                {filteredMercaderia.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-slate-500 dark:text-zinc-500"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Database className="w-8 h-8 text-slate-300 dark:text-zinc-700 animate-pulse" />
                        <p className="font-semibold text-slate-700 dark:text-zinc-300">
                          No se encontraron artículos
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-600">
                          Prueba ajustando los filtros o agrega un artículo
                          nuevo.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedMercaderia.map((item) => (
                    <tr
                      key={item.id}
                      className="group hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap font-semibold text-slate-900 dark:text-zinc-100 md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[220px] w-[220px] max-w-[220px]">
                        <span className="truncate block" title={item.ingredientes}>{item.ingredientes}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            darkMode
                              ? "bg-primary/10 text-primary"
                              : "bg-primary-container text-primary"
                          }`}
                        >
                          {item.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
                          <span>{item.sector || "General"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
                          <span>{item.comercio || "No especificado"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
                          <Scale className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
                          <span>{item.unidadMedida}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const vn = item.valoresNutricionales || generarNutricionEstimada(item.ingredientes, item.categoria);
                          return (
                            <div className="flex flex-col min-w-[145px]" title={`Valores promedio por 100g:\nProteínas: ${vn.proteinas}g\nCarbohidratos: ${vn.carbohidratos}g (Azúcares: ${vn.azucares}g)\nGrasas: ${vn.grasas}g\nFibra: ${vn.fibra}g\nSodio: ${vn.sodio}mg`}>
                              <span className="text-[11px] font-semibold whitespace-nowrap">
                                <span className="text-zinc-500 dark:text-zinc-400 font-bold">P:</span> {vn.proteinas}g | <span className="text-zinc-500 dark:text-zinc-400 font-bold">C:</span> {vn.carbohidratos}g | <span className="text-zinc-500 dark:text-zinc-400 font-bold">G:</span> {vn.grasas}g
                              </span>
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap mt-0.5">
                                Azúcares: {vn.azucares}g | Fibra: {vn.fibra}g | Sodio: {vn.sodio}mg
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-zinc-400 font-sans">
                        {item.calorias !== undefined && item.calorias !== null ? `${item.calorias} kcal` : `${getCalorieDensity(item.ingredientes, item.categoria, item.sector)} kcal`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900 dark:text-zinc-100">
                        {priceLoadingIds[item.id] ? (
                          <span className="text-zinc-400 animate-pulse">
                            Cargando...
                          </span>
                        ) : item.precio ? (
                          <span>
                            $
                            {item.precio.toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-500 text-[10px]">
                            Sin sincronizar
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMercaderia(item.id)}
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

          {totalMerPages > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
              <span>
                Mostrando {paginatedMercaderia.length} de {filteredMercaderia.length} registros (Página {merPage} de {totalMerPages})
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={merPage === 1}
                  onClick={() => setMerPage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  disabled={merPage === totalMerPages}
                  onClick={() => setMerPage((prev) => Math.min(totalMerPages, prev + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
              </motion.div>
            )}

            {creacionComidasActiveTab === "alimentos" && (
              <motion.div
                key="alimentos"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">
                  Base de Datos de Alimentos
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Registra tus preparaciones vinculando ingredientes y cantidades
                de tu base de datos de Mercadería.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setEditingAlimentoId(null);
                setAliMercaderiaName("");
                setAliIng1("");
                setAliQty1("");
                setAliIng2("");
                setAliQty2("");
                setAliIng3("");
                setAliQty3("");
                setShowAddAlimento(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Alimento</span>
            </motion.button>
          </div>

          {/* Search bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="text"
                value={aliSearchQuery}
                onChange={(e) => setAliSearchQuery(e.target.value)}
                placeholder="Buscar por alimento o ingrediente..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
            <table className="w-full text-left border-collapse min-w-[1150px]">
              <thead className="sticky top-0 z-20">
                <tr
                  className={`text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}
                >
                  <th className="py-3 px-4 whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[220px] w-[220px] max-w-[220px]">
                    <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Mercadería</span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Database className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">1</sup>
                      </span>
                      Ingrediente
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Scale className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">1</sup>
                      </span>
                      Cant.
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Scale className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">1</sup>
                      </span>
                      U.M.
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Database className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">2</sup>
                      </span>
                      Ingrediente
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Scale className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">2</sup>
                      </span>
                      Cant.
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Scale className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">2</sup>
                      </span>
                      U.M.
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Database className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">3</sup>
                      </span>
                      Ingrediente
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Scale className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">3</sup>
                      </span>
                      Cant.
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Scale className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">3</sup>
                      </span>
                      U.M.
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Val. Nutri. <span className="text-[10px] font-normal text-zinc-400">(Total)</span></span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Calorías (Total)</span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">
                    <span className="flex items-center justify-end gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                  </th>
                </tr>
              </thead>
              <tbody className="">
                {filteredAlimentos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="py-8 text-center text-slate-400 dark:text-zinc-500"
                    >
                      No se encontraron alimentos registrados.
                    </td>
                  </tr>
                ) : (
                  paginatedAlimentos.map((item) => (
                      <tr
                        key={item.id}
                        className="group hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-900 dark:text-white md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[220px] w-[220px] max-w-[220px]">
                          <span className="truncate block" title={item.mercaderiaName}>{item.mercaderiaName}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300">
                          {item.ingrediente1 || (
                            <span className="text-slate-300 dark:text-zinc-700">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300">
                          {item.cantidad1 !== undefined ? (
                            item.cantidad1
                          ) : (
                            <span className="text-slate-300 dark:text-zinc-700">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-zinc-400">
                          {item.unidad1 || (
                            <span className="text-slate-300 dark:text-zinc-700">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300">
                          {item.ingrediente2 || (
                            <span className="text-slate-300 dark:text-zinc-700">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300">
                          {item.cantidad2 !== undefined ? (
                            item.cantidad2
                          ) : (
                            <span className="text-slate-300 dark:text-zinc-700">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-zinc-400">
                          {item.unidad2 || (
                            <span className="text-slate-300 dark:text-zinc-700">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300">
                          {item.ingrediente3 || (
                            <span className="text-slate-300 dark:text-zinc-700">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300">
                          {item.cantidad3 !== undefined ? (
                            item.cantidad3
                          ) : (
                            <span className="text-slate-300 dark:text-zinc-700">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-zinc-400">
                          {item.unidad3 || (
                            <span className="text-slate-300 dark:text-zinc-700">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {(() => {
                            const vn = item.valoresNutricionales || calcularNutricionAlimento(item, mercaderia);
                            return (
                              <div className="flex flex-col min-w-[145px]" title={`Valores totales de la receta:\nProteínas: ${vn.proteinas}g\nCarbohidratos: ${vn.carbohidratos}g (Azúcares: ${vn.azucares}g)\nGrasas: ${vn.grasas}g\nFibra: ${vn.fibra}g\nSodio: ${vn.sodio}mg`}>
                                <span className="text-[11px] font-semibold whitespace-nowrap">
                                <span className="text-zinc-500 dark:text-zinc-400 font-bold">P:</span> {vn.proteinas}g | <span className="text-zinc-500 dark:text-zinc-400 font-bold">C:</span> {vn.carbohidratos}g | <span className="text-zinc-500 dark:text-zinc-400 font-bold">G:</span> {vn.grasas}g
                                </span>
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap mt-0.5">
                                  Azúcares: {vn.azucares}g | Fibra: {vn.fibra}g | Sodio: {vn.sodio}mg
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-700 dark:text-zinc-300">
                          {calculateAlimentoCalories(item) > 0 ? (
                            <span>
                              {Math.round(calculateAlimentoCalories(item))} kcal
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-zinc-600 font-sans text-[11px]">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditAlimentoClick(item)}
                              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                              title="Editar Alimento"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAlimento(item.id)}
                              className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                              title="Eliminar Alimento"
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

          {totalAliPages > 1 ? (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
              <span>
                Mostrando {paginatedAlimentos.length} de {filteredAlimentos.length} registros (Página {aliPage} de {totalAliPages})
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={aliPage === 1}
                  onClick={() => setAliPage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  disabled={aliPage === totalAliPages}
                  onClick={() => setAliPage((prev) => Math.min(totalAliPages, prev + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
              <span>Total de alimentos: {filteredAlimentos.length}</span>
              <span>Unidades vinculadas directamente de Mercadería</span>
            </div>
          )}
              </motion.div>
            )}

            {creacionComidasActiveTab === "platos" && (
              <motion.div
                key="platos"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Base de Datos de Platos</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Registra tus platos vinculando alimentos cargados en tu base de
                datos de Alimentos. Los ingredientes se calculan de manera
                automática.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setEditingPlatoId(null);
                setPlaNombrePlato("");
                setPlaAlimentoId1("");
                setPlaAlimentoId2("");
                setPlaAlimentoId3("");
                setShowAddPlato(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Plato</span>
            </motion.button>
          </div>

          {/* Search bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="text"
                value={plaSearchQuery}
                onChange={(e) => setPlaSearchQuery(e.target.value)}
                placeholder="Buscar por nombre de plato o alimentos..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="sticky top-0 z-20">
                <tr
                  className={`text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}
                >
                  <th className="py-3 px-4 whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[240px] w-[240px] max-w-[240px]">
                    <span className="flex items-center gap-1.5"><ChefHat className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Plato</span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Package className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">1</sup>
                      </span>
                      Alimento
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">1</sup>
                      </span>
                      Detalle
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Package className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">2</sup>
                      </span>
                      Alimento
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">2</sup>
                      </span>
                      Detalle
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <Package className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">3</sup>
                      </span>
                      Alimento
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="relative inline-flex items-center mr-0.5">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                        <sup className="absolute -top-1 -right-1 text-[8px] font-extrabold text-slate-500 dark:text-zinc-400">3</sup>
                      </span>
                      Detalle
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                      Val. Nutri. (Total)
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Calorías</span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap text-center">
                    <span className="flex items-center justify-center gap-1.5 w-full"><ImageIcon className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Foto</span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">
                    <span className="flex items-center justify-end gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                  </th>
                </tr>
              </thead>
              <tbody className="">
                {filteredPlatos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-8 text-center text-slate-400 dark:text-zinc-500"
                    >
                      No se encontraron platos registrados.
                    </td>
                  </tr>
                ) : (
                  paginatedPlatos.map((item) => (
                      <tr
                        key={item.id}
                        className="group hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-900 dark:text-white md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[240px] w-[240px] max-w-[240px]">
                          <span className="truncate block" title={item.nombrePlato}>{item.nombrePlato}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300 font-medium">
                          {getAlimentoName(item.alimentoId1)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderAlimentoIngredientsList(item.alimentoId1)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300 font-medium">
                          {getAlimentoName(item.alimentoId2)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderAlimentoIngredientsList(item.alimentoId2)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300 font-medium">
                          {getAlimentoName(item.alimentoId3)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderAlimentoIngredientsList(item.alimentoId3)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {(() => {
                            const vn = calcularNutricionPlato(item, alimentos, mercaderia);
                            const hasNutrition = vn.proteinas > 0 || vn.carbohidratos > 0 || vn.grasas > 0;
                            if (!hasNutrition) {
                              return (
                                <span className="text-slate-400 dark:text-zinc-600 font-sans text-[11px]">
                                  -
                                </span>
                              );
                            }
                            return (
                              <div
                                className="flex flex-col min-w-[145px]"
                                title={`Valores totales del plato:\nProteínas: ${Math.round(vn.proteinas)}g\nCarbohidratos: ${Math.round(vn.carbohidratos)}g (Azúcares: ${Math.round(vn.azucares)}g)\nGrasas: ${Math.round(vn.grasas)}g\nFibra: ${Math.round(vn.fibra)}g\nSodio: ${Math.round(vn.sodio)}mg`}
                              >
                                <span className="text-[11px] font-semibold whitespace-nowrap">
                                <span className="text-zinc-500 dark:text-zinc-400 font-bold">P:</span> {Math.round(vn.proteinas)}g | <span className="text-zinc-500 dark:text-zinc-400 font-bold">C:</span> {Math.round(vn.carbohidratos)}g | <span className="text-zinc-500 dark:text-zinc-400 font-bold">G:</span> {Math.round(vn.grasas)}g
                                </span>
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap mt-0.5">
                                  Azúcares: {Math.round(vn.azucares)}g | Fibra: {Math.round(vn.fibra)}g | Sodio: {Math.round(vn.sodio)}mg
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                          {calculatePlatoCalories(item) > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary dark:text-primary font-bold">
                              {calculatePlatoCalories(item)} kcal
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-zinc-600 font-sans text-[11px]">
                              -
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-4 whitespace-nowrap text-center">
                          <img
                            src={`https://tse2.mm.bing.net/th?q=${encodeURIComponent(item.nombrePlato + " comida receta")}&w=100&h=100&c=7&rs=1`}
                            alt={item.nombrePlato}
                            className="w-12 h-12 rounded-lg object-cover shadow-sm mx-auto bg-slate-100 dark:bg-zinc-800"
                            referrerPolicy="no-referrer"
                          />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditPlatoClick(item)}
                              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                              title="Editar Plato"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePlato(item.id)}
                              className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                              title="Eliminar Plato"
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

          {totalPlatoPages > 1 ? (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
              <span>
                Mostrando {paginatedPlatos.length} de {filteredPlatos.length} registros (Página {platoPage} de {totalPlatoPages})
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={platoPage === 1}
                  onClick={() => setPlatoPage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  disabled={platoPage === totalPlatoPages}
                  onClick={() => setPlatoPage((prev) => Math.min(totalPlatoPages, prev + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
              <span>Total de platos: {filteredPlatos.length}</span>
              <span>Unidades y cantidades calculadas automáticamente</span>
            </div>
          )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* RENDER ORGANIZACION SEMANAL TAB */}
      {activeSubTab === "organizacion_semanal" && (
        <div id="organizacion-semanal-section" className={`p-6 rounded-3xl border ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <span>Organización Semanal</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Planifica qué días vas a cocinar cada plato.
              </p>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                id="add-organizacion-btn"
                onClick={() => {
                  setEditingOrgId(null);
                  setOrgFecha("");
                  setOrgPlatoId("");
                  setShowAddOrg(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Organizar Plato</span>
              </motion.button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                id="search-organizacion-input"
                type="text"
                placeholder="Buscar por plato, día o fecha..."
                value={orgSearchQuery}
                onChange={(e) => setOrgSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
            <table
              id="organizacion-semanal-table"
              className="w-full text-left border-collapse min-w-[900px]"
            >
                <thead className="sticky top-0 z-20">
                <tr
                  className={`text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}
                >
                    <th className="py-3 px-4 whitespace-nowrap w-[180px]">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Fecha</span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap w-[140px]">
                      <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Día</span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap w-[240px]">
                      <span className="flex items-center gap-1.5"><ChefHat className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Platos</span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Ingredientes</span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap text-right w-[100px]">
                      <span className="flex items-center justify-end gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="">
                  {filteredOrganizacion.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-slate-400 dark:text-zinc-500"
                      >
                        <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-zinc-700" />
                        <span className="text-xs font-medium block">
                          No hay planificaciones registradas
                        </span>
                        <span className="text-[10px] opacity-75">
                          Haz clic en "Organizar Plato" para comenzar
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredOrganizacion.map((item) => (
                      <tr
                        key={item.id}
                        id={`org-row-${item.id}`}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 transition-colors group"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap text-sm font-semibold text-black dark:text-zinc-300">
                          {formatFechaDMY(item.fecha)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                            style={!darkMode ? { color: "#374151" } : undefined}
                          >
                            {getDiaDeLaSemana(item.fecha)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-900 dark:text-white font-medium text-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold force-text-black organizacion-semanal-plato-title dark:text-white flex items-center gap-1.5" data-plato-title="true" style={{ color: darkMode ? "#ffffff" : "#000000" }}>
                              <UtensilsCrossed className="w-3.5 h-3.5 text-primary shrink-0 self-center" />
                              <span className="self-center translate-y-[0.5px]">{getPlatoName(item.platoId)}</span>
                            </span>
                            {(() => {
                              const plato = platos.find(
                                (p) => p.id === item.platoId,
                              );
                              const cals = calculatePlatoCalories(plato);
                              return cals > 0 ? (
                                <span className="inline-flex items-center text-[10px] text-primary dark:text-primary font-bold">
                                  {cals} kcal
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderPlatoIngredientsBadges(item.platoId)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              id={`edit-org-${item.id}`}
                              onClick={() => handleEditOrgClick(item)}
                              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                              title="Editar Organización"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`delete-org-${item.id}`}
                              onClick={() => handleDeleteOrg(item.id)}
                              className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                              title="Eliminar Planificación"
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

            <div className="p-4 border-t border-slate-100 dark:border-zinc-800/40 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
              <span>
                Total de días planificados: {filteredOrganizacion.length}
              </span>
              <span>
                Ingredientes y días de la semana calculados automáticamente
              </span>
            </div>
          </div>
        </div>
      )}

      {/* RENDER LISTA DE COMPRAS TAB */}
      {activeSubTab === "lista_compras" && (
        <div id="lista-compras-section" className={`p-6 rounded-3xl border ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <span>Lista de Compras</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Genera y gestiona tu lista de supermercado a partir de tu organización semanal.
              </p>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  id="reset-shop-list-btn"
                  onClick={handleResetShoppingList}
                  className="px-3.5 py-2 rounded-full border border-slate-200 dark:border-zinc-800 text-black dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-950/40 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                  style={!darkMode ? { color: "#000000" } : undefined}
                  title="Restablecer todos los cambios de la lista"
                >
                  <RotateCcw
                    className="w-3.5 h-3.5 text-black dark:text-zinc-300"
                    style={!darkMode ? { color: "#000000" } : undefined}
                  />
                  <span>Restablecer</span>
                </button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  id="add-manual-shop-btn"
                  onClick={() => {
                    setManualShopMercaderiaId("");
                    setManualShopQty("");
                    setShowAddManualShop(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Item Manual</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                id="search-shop-input"
                type="text"
                placeholder="Buscar por mercadería, categoría, comercio o sector..."
                value={shopSearchQuery}
                onChange={(e) => setShopSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
            <table
              id="lista-compras-table"
              className="w-full text-left border-collapse min-w-[850px]"
            >
                <thead className="sticky top-0 z-20">
                <tr
                  className={`text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}
                >
                    <th className="py-3 px-3 whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[50px] w-[50px] max-w-[50px]">
                      <span className="flex items-center justify-center"><Check className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /></span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap md:sticky md:left-[50px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[220px] w-[220px] max-w-[220px]">
                      <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Mercadería</span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap w-[120px]">
                      <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cant.</span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap w-[140px]">
                      <span className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> U.M.</span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cat.</span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Comercio</span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Sector</span>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap text-right w-[80px]">
                      <span className="flex items-center justify-end gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="">
                  {filteredShoppingList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-slate-400 dark:text-zinc-500"
                      >
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-zinc-700" />
                        <span className="text-xs font-medium block">
                          No hay ítems en tu lista de compras
                        </span>
                        <span className="text-[10px] opacity-75">
                          Suma platos a la Organización Semanal o agrega ítems
                          manualmente
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredShoppingList.map((item, index) => {
                      const isCompleted = notesCheckedItems.includes(
                        item.name.toLowerCase(),
                      );
                      return (
                        <tr
                          key={index}
                          id={`shop-row-${index}`}
                          className={`hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 transition-colors group ${ isCompleted ? "opacity-60" : ""
                          }`}
                        >
                          <td className="py-3.5 px-3 whitespace-nowrap md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[50px] w-[50px] max-w-[50px] text-center">
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => {
                                const lowerName = item.name.toLowerCase();
                                if (notesCheckedItems.includes(lowerName)) {
                                  setNotesCheckedItems(
                                    notesCheckedItems.filter(
                                      (i) => i !== lowerName,
                                    ),
                                  );
                                } else {
                                  setNotesCheckedItems([
                                    ...notesCheckedItems,
                                    lowerName,
                                  ]);
                                }
                              }}
                              className="rounded border-slate-300 text-primary focus:ring-primary"
                            />
                          </td>
                          <td
                            className={`py-3.5 px-4 whitespace-nowrap font-semibold text-slate-900 dark:text-white text-sm md:sticky md:left-[50px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[220px] w-[220px] max-w-[220px] ${isCompleted ? "line-through text-slate-400 dark:text-zinc-500" : ""}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{item.name}</span>
                              {item.isManual && item.isAuto && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                                  Mixto
                                </span>
                              )}
                              {item.isManual && !item.isAuto && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary-container text-primary uppercase tracking-wider">
                                  Manual
                                </span>
                              )}
                              {!item.isManual && item.isAuto && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                                  Menú
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className={`py-3.5 px-4 whitespace-nowrap font-semibold text-slate-700 dark:text-zinc-300 text-sm ${isCompleted ? "line-through opacity-50" : ""}`}
                          >
                            {item.cantidad}
                          </td>
                          <td
                            className={`py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300 text-xs ${isCompleted ? "line-through opacity-50" : ""}`}
                          >
                            {item.unidadMedida}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-zinc-300 ${isCompleted ? "line-through opacity-50" : ""}`}
                            >
                              {item.categoria}
                            </span>
                          </td>
                          <td
                            className={`py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300 text-xs ${isCompleted ? "line-through opacity-50" : ""}`}
                          >
                            {item.comercio}
                          </td>
                          <td
                            className={`py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300 text-xs ${isCompleted ? "line-through opacity-50" : ""}`}
                          >
                            {item.sector}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <button
                              onClick={() =>
                                handleDeleteShoppingItem(
                                  item.name,
                                  item.mercaderiaId,
                                )
                              }
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                              title="Eliminar de la lista"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

            <div className="p-4 border-t border-slate-100 dark:border-zinc-800/40 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
              <span>
                Total de ítems diferentes: {filteredShoppingList.length}
              </span>
              <span>
                Haga clic en el icono de basurero para eliminar o excluir
                cualquier ingrediente
              </span>
            </div>
          </div>
        </div>
      )}
        </motion.div>
      </AnimatePresence>

      {/* Add Manual Shopping Item Modal Overlay */}
      {createPortal(
        <AnimatePresence>
          {showAddManualShop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAddManualShop(false)}
              id="add-manual-shop-overlay"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                id="add-manual-shop-content"
                className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-visible relative cursor-default"
              >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md rounded-t-3xl">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Agregar Item Manual a la Lista de Compras
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddManualShop(false);
                    setManualShopMercaderiaId("");
                    setManualShopQty("");
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-visible p-6">

              {mercaderia.length === 0 && (
                <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Registra ítems en la base de datos de "Mercadería" para
                    poder seleccionarlos aquí.
                  </span>
                </div>
              )}

              <form
                onSubmit={handleAddManualShoppingItem}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    Seleccionar Mercadería
                  </label>
                  <CustomSelect
                    value={manualShopMercaderiaId}
                    onChange={(val) => setManualShopMercaderiaId(val)}
                    options={[...mercaderia]
                      .sort((a, b) =>
                        a.ingredientes.localeCompare(b.ingredientes),
                      )
                      .map((m) => ({
                        value: m.id,
                        label: `${m.ingredientes} (${m.unidadMedida} | ${m.categoria})`,
                      }))}
                    placeholder="-- Elige una mercadería --"
                    className="w-full"
                    searchable
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={manualShopQty}
                    onChange={(e) =>
                      setManualShopQty(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Ej: 2, 0.5, 500"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-slate-400 dark:focus:border-zinc-700"
                    required
                  />
                </div>

                {manualShopMercaderiaId && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200/50 dark:border-zinc-800/40 text-xs text-slate-500 space-y-1.5">
                    {(() => {
                      const found = mercaderia.find(
                        (m) => m.id === manualShopMercaderiaId,
                      );
                      if (!found) return null;
                      return (
                        <>
                          <div className="flex justify-between text-primary">
                            <span className="font-semibold text-primary">
                              Unidad de Medida:
                            </span>
                            <span className="font-mono text-primary">
                              {found.unidadMedida}
                            </span>
                          </div>
                          <div className="flex justify-between text-primary">
                            <span className="font-semibold text-primary">Categoría:</span>
                            <span className="text-primary">{found.categoria}</span>
                          </div>
                          <div className="flex justify-between text-primary">
                            <span className="font-semibold text-primary">Comercio:</span>
                            <span className="text-primary">{found.comercio}</span>
                          </div>
                          <div className="flex justify-between text-primary">
                            <span className="font-semibold text-primary">Sector:</span>
                            <span className="text-primary">{found.sector}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (!isSaving) {
                        setShowAddManualShop(false);
                        setManualShopMercaderiaId("");
                        setManualShopQty("");
                      }
                    }}
                    className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={mercaderia.length === 0 || isSaving}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full cursor-pointer transition-all shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      "Agregar a la Lista"
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

      {/* Add / Edit Organización Semanal Modal Overlay */}
      {createPortal(
        <AnimatePresence>
          {showAddOrg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowAddOrg(false);
                setOrgFecha("");
                setOrgPlatoId("");
                setEditingOrgId(null);
              }}
              id="add-org-modal-overlay"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                id="add-org-modal-content"
                className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-visible relative cursor-default"
              >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md rounded-t-3xl">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingOrgId
                    ? "Editar Planificación Semanal"
                    : "Agregar Planificación Semanal"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOrg(false);
                    setOrgFecha("");
                    setOrgPlatoId("");
                    setEditingOrgId(null);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-visible p-6">

              {platos.length === 0 && (
                <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Registra platos en la sección "Platos" para poder
                    seleccionarlos en la organización.
                  </span>
                </div>
              )}

              <form
                id="add-org-form"
                onSubmit={handleAddOrEditOrg}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    Fecha
                  </label>
                  <SmartDateTimePicker
                    value={orgFecha}
                    onChange={(val) => setOrgFecha(val)}
                    showTimeOption={false}
                    required
                  />
                  {orgFecha && (
                    <p className="mt-1.5 text-xs text-primary font-semibold">
                      Día seleccionado automáticamente:{" "}
                      {getDiaDeLaSemana(orgFecha)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    Seleccionar Plato
                  </label>
                  <CustomSelect
                    value={orgPlatoId}
                    onChange={(val) => setOrgPlatoId(val)}
                    options={platos.map((p) => ({
                      value: p.id,
                      label: p.nombrePlato,
                    }))}
                    placeholder="-- Elige un plato --"
                    className="w-full"
                    searchable
                  />
                </div>

                {orgPlatoId && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200/50 dark:border-zinc-800/40 space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      Vista previa de ingredientes autocompletados
                    </h4>
                    {renderPlatoIngredientsBadges(orgPlatoId)}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    id="cancel-org-modal"
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (!isSaving) {
                        setShowAddOrg(false);
                        setOrgFecha("");
                        setOrgPlatoId("");
                        setEditingOrgId(null);
                      }
                    }}
                    className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    id="submit-org-modal"
                    type="submit"
                    disabled={platos.length === 0 || isSaving}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full cursor-pointer transition-all shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      editingOrgId ? "Guardar Cambios" : "Guardar"
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

      {/* Add / Edit Alimento Modal Overlay */}
      {createPortal(
        <AnimatePresence>
          {showAddAlimento && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowAddAlimento(false);
                setEditingAlimentoId(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingAlimentoId ? "Editar Alimento" : "Agregar Alimento"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAlimento(false);
                    setEditingAlimentoId(null);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">

              {mercaderia.length === 0 && (
                <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Registra ítems en Mercadería para poder seleccionarlos como
                    ingredientes.
                  </span>
                </div>
              )}

              <form onSubmit={handleAddOrEditAlimento} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    Nombre de la preparación (Mercadería)
                  </label>
                  <input
                    type="text"
                    value={aliMercaderiaName}
                    onChange={(e) => setAliMercaderiaName(e.target.value)}
                    placeholder="Ej: Guiso de Pollo con Arroz, Ensalada Rusa"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-slate-400 dark:focus:border-zinc-700"
                    required
                  />
                </div>

                {/* Ingrediente 1 */}
                <div className="border-t border-slate-100 dark:border-zinc-800/40 pt-3 space-y-3">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Ingrediente principal (1)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Ingrediente 1
                      </label>
                      <CustomSelect
                        value={aliIng1}
                        onChange={(val) => setAliIng1(val)}
                        options={[
                          { value: "", label: "-- Seleccionar Ingrediente --" },
                          ...mercaderia.map((m) => ({
                            value: m.ingredientes,
                            label: `${m.ingredientes} (${m.unidadMedida})`,
                          })),
                        ]}
                        placeholder="-- Seleccionar Ingrediente --"
                        className="w-full"
                        searchable
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Cantidad 1
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={aliQty1}
                          onChange={(e) =>
                            setAliQty1(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          placeholder="Ej: 200"
                          className="w-full h-[42px] pl-3.5 pr-12 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-xs focus:border-slate-400 dark:focus:border-zinc-700"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">
                          {aliIng1 ? getIngredientUnit(aliIng1) : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ingrediente 2 */}
                <div className="border-t border-slate-100 dark:border-zinc-800/40 pt-3 space-y-3">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Ingrediente secundario (2)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Ingrediente 2
                      </label>
                      <CustomSelect
                        value={aliIng2}
                        onChange={(val) => setAliIng2(val)}
                        options={[
                          { value: "", label: "-- Seleccionar Ingrediente --" },
                          ...mercaderia.map((m) => ({
                            value: m.ingredientes,
                            label: `${m.ingredientes} (${m.unidadMedida})`,
                          })),
                        ]}
                        placeholder="-- Seleccionar Ingrediente --"
                        className="w-full"
                        searchable
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Cantidad 2
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={aliQty2}
                          onChange={(e) =>
                            setAliQty2(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          placeholder="Ej: 150"
                          className="w-full h-[42px] pl-3.5 pr-12 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-xs focus:border-slate-400 dark:focus:border-zinc-700"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">
                          {aliIng2 ? getIngredientUnit(aliIng2) : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ingrediente 3 */}
                <div className="border-t border-slate-100 dark:border-zinc-800/40 pt-3 space-y-3">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Ingrediente secundario (3)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Ingrediente 3
                      </label>
                      <CustomSelect
                        value={aliIng3}
                        onChange={(val) => setAliIng3(val)}
                        options={[
                          { value: "", label: "-- Seleccionar Ingrediente --" },
                          ...mercaderia.map((m) => ({
                            value: m.ingredientes,
                            label: `${m.ingredientes} (${m.unidadMedida})`,
                          })),
                        ]}
                        placeholder="-- Seleccionar Ingrediente --"
                        className="w-full"
                        searchable
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Cantidad 3
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={aliQty3}
                          onChange={(e) =>
                            setAliQty3(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          placeholder="Ej: 100"
                          className="w-full h-[42px] pl-3.5 pr-12 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-xs focus:border-slate-400 dark:focus:border-zinc-700"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">
                          {aliIng3 ? getIngredientUnit(aliIng3) : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculated Alimento Calories Summary */}
                <div className="border-t border-slate-100 dark:border-zinc-800/40 pt-3.5 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      Total de Calorías Estimado del Alimento
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Calculado en tiempo real según los ingredientes
                      seleccionados
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-primary dark:text-primary">
                      {Math.round(
                        calculateAlimentoCalories({
                          id: editingAlimentoId || "",
                          mercaderiaName: aliMercaderiaName,
                          ingrediente1: aliIng1 || undefined,
                          cantidad1:
                            aliQty1 !== "" ? Number(aliQty1) : undefined,
                          ingrediente2: aliIng2 || undefined,
                          cantidad2:
                            aliQty2 !== "" ? Number(aliQty2) : undefined,
                          ingrediente3: aliIng3 || undefined,
                          cantidad3:
                            aliQty3 !== "" ? Number(aliQty3) : undefined,
                        }),
                      )}{" "}
                      kcal
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (!isSaving) {
                        setShowAddAlimento(false);
                        setEditingAlimentoId(null);
                      }
                    }}
                    className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full cursor-pointer transition-all shadow-md shadow-primary/10 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      editingAlimentoId ? "Guardar Cambios" : "Guardar"
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

      {/* Add / Edit Plato Modal Overlay */}
      {createPortal(
        <AnimatePresence>
          {showAddPlato && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowAddPlato(false);
                setEditingPlatoId(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingPlatoId ? "Editar Plato" : "Agregar Plato"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPlato(false);
                    setEditingPlatoId(null);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">

              {alimentos.length === 0 && (
                <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Registra ítems en Alimentos para poder seleccionarlos en tus
                    Platos.
                  </span>
                </div>
              )}

              <form onSubmit={handleAddOrEditPlato} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    Nombre del Plato
                  </label>
                  <input
                    type="text"
                    value={plaNombrePlato}
                    onChange={(e) => setPlaNombrePlato(e.target.value)}
                    placeholder="Ej: Menú Semanal Lunes, Combo Fit"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-slate-400 dark:focus:border-zinc-700"
                    required
                  />
                </div>

                {/* Alimento 1 */}
                <div className="border-t border-slate-100 dark:border-zinc-800/40 pt-3 space-y-3">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Alimento 1
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Seleccionar Alimento
                      </label>
                      <CustomSelect
                        value={plaAlimentoId1}
                        onChange={(val) => setPlaAlimentoId1(val)}
                        options={[
                          { value: "", label: "-- Ninguno --" },
                          ...alimentos.map((a) => ({
                            value: a.id,
                            label: a.mercaderiaName,
                          })),
                        ]}
                        placeholder="-- Ninguno --"
                        className="w-full"
                        searchable
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Ingredientes + Cantidades + Unidades
                      </label>
                      <div className="px-3.5 min-h-[42px] h-auto py-2 rounded-xl bg-slate-100 dark:bg-black/20 border border-slate-200/50 dark:border-zinc-800/50 text-slate-500 dark:text-zinc-400 text-xs flex flex-wrap items-center">
                        {plaAlimentoId1 ? (
                          renderAlimentoIngredientsList(plaAlimentoId1)
                        ) : (
                          <span className="text-slate-300 dark:text-zinc-700 text-xs">
                            Se llena automáticamente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alimento 2 */}
                <div className="border-t border-slate-100 dark:border-zinc-800/40 pt-3 space-y-3">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Alimento 2
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Seleccionar Alimento
                      </label>
                      <CustomSelect
                        value={plaAlimentoId2}
                        onChange={(val) => setPlaAlimentoId2(val)}
                        options={[
                          { value: "", label: "-- Ninguno --" },
                          ...alimentos.map((a) => ({
                            value: a.id,
                            label: a.mercaderiaName,
                          })),
                        ]}
                        placeholder="-- Ninguno --"
                        className="w-full"
                        searchable
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Ingredientes + Cantidades + Unidades
                      </label>
                      <div className="px-3.5 min-h-[42px] h-auto py-2 rounded-xl bg-slate-100 dark:bg-black/20 border border-slate-200/50 dark:border-zinc-800/50 text-slate-500 dark:text-zinc-400 text-xs flex flex-wrap items-center">
                        {plaAlimentoId2 ? (
                          renderAlimentoIngredientsList(plaAlimentoId2)
                        ) : (
                          <span className="text-slate-300 dark:text-zinc-700 text-xs">
                            Se llena automáticamente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alimento 3 */}
                <div className="border-t border-slate-100 dark:border-zinc-800/40 pt-3 space-y-3">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Alimento 3
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Seleccionar Alimento
                      </label>
                      <CustomSelect
                        value={plaAlimentoId3}
                        onChange={(val) => setPlaAlimentoId3(val)}
                        options={[
                          { value: "", label: "-- Ninguno --" },
                          ...alimentos.map((a) => ({
                            value: a.id,
                            label: a.mercaderiaName,
                          })),
                        ]}
                        placeholder="-- Ninguno --"
                        className="w-full"
                        searchable
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                        Ingredientes + Cantidades + Unidades
                      </label>
                      <div className="px-3.5 min-h-[42px] h-auto py-2 rounded-xl bg-slate-100 dark:bg-black/20 border border-slate-200/50 dark:border-zinc-800/50 text-slate-500 dark:text-zinc-400 text-xs flex flex-wrap items-center">
                        {plaAlimentoId3 ? (
                          renderAlimentoIngredientsList(plaAlimentoId3)
                        ) : (
                          <span className="text-slate-300 dark:text-zinc-700 text-xs">
                            Se llena automáticamente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculated Calories Summary */}
                <div className="border-t border-slate-100 dark:border-zinc-800/40 pt-3.5 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      Total de Calorías Estimado
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Calculado automáticamente de la base de datos de
                      Mercadería
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-primary dark:text-primary">
                      {calculatePlatoCalories({
                        id: editingPlatoId || "",
                        nombrePlato: plaNombrePlato,
                        alimentoId1: plaAlimentoId1 || undefined,
                        alimentoId2: plaAlimentoId2 || undefined,
                        alimentoId3: plaAlimentoId3 || undefined,
                      })}{" "}
                      kcal
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (!isSaving) {
                        setShowAddPlato(false);
                        setEditingPlatoId(null);
                      }
                    }}
                    className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full cursor-pointer transition-all shadow-md shadow-primary/10 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      editingPlatoId ? "Guardar Cambios" : "Guardar"
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

      {/* Add Pantry item modal overlay */}
      {createPortal(
        <AnimatePresence>
          {showAddPantry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAddPantry(false)}
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
              <h3 className="font-extrabold text-lg">Agregar a la Alacena</h3>
              <form onSubmit={handleAddPantry} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                    Nombre del Alimento
                  </label>
                  <input
                    type="text"
                    value={newPName}
                    onChange={(e) => setNewPName(e.target.value)}
                    placeholder="Ej: Pechuga de Pollo / Harina"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      value={newPQty}
                      onChange={(e) =>
                        setNewPQty(parseInt(e.target.value) || 0)
                      }
                      placeholder="Ej: 500"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                      Unidad
                    </label>
                    <CustomSelect
                      value={newPUnit}
                      onChange={(val) => setNewPUnit(val)}
                      options={[
                        { value: "unidades", label: "Unidades" },
                        { value: "g", label: "Gramos (g)" },
                        { value: "ml", label: "Mililitros (ml)" },
                        { value: "paquetes", label: "Paquetes" },
                        { value: "latas", label: "Latas" },
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                      Cantidad Mínima
                    </label>
                    <input
                      type="number"
                      value={newPMin}
                      onChange={(e) =>
                        setNewPMin(parseInt(e.target.value) || 0)
                      }
                      placeholder="Alerta de bajo stock"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                      Vencimiento
                    </label>
                    <SmartDateTimePicker
                      value={newPExp}
                      onChange={(val) => setNewPExp(val)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => { if (!isSaving) setShowAddPantry(false); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold disabled:opacity-50 flex items-center gap-2"
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
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Add / Edit Mercadería modal overlay */}
      {createPortal(
        <AnimatePresence>
          {showAddMercaderia && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowAddMercaderia(false);
                setEditingMercaderiaId(null);
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
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingMercaderiaId
                    ? "Editar Mercadería"
                    : "Agregar Mercadería"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMercaderia(false);
                    setEditingMercaderiaId(null);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
              <form
                onSubmit={handleAddOrEditMercaderia}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    Ingredientes
                  </label>
                  <input
                    type="text"
                    value={merName}
                    onChange={(e) => setMerName(e.target.value)}
                    placeholder="Ej: Fideos Tallarines / Sal de mesa"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-slate-400 dark:focus:border-zinc-700"
                    required
                  />
                </div>

                {/* OpenFoodFacts search bar */}
                <div className="p-3.5 bg-white dark:bg-black/85 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" /> Buscador OpenFoodFacts (API)
                    </span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                      Relleno automático
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={offSearchQuery}
                      onChange={(e) => setOffSearchQuery(e.target.value)}
                      placeholder="Buscar producto por nombre..."
                      className="flex-1 h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 hover:border-primary focus:border-primary text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none text-xs transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          searchOpenFoodFacts(offSearchQuery);
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={offLoading}
                      onClick={() => searchOpenFoodFacts(offSearchQuery)}
                      className="h-[42px] px-4 bg-primary hover:bg-primary-hover disabled:bg-zinc-300 text-white dark:text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {offLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>Buscar</span>
                    </button>
                  </div>
                  
                  {offError && (
                    <p className="text-[10px] text-red-500 dark:text-red-400 font-medium">
                      {offError}
                    </p>
                  )}

                  {offResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-black/85 backdrop-blur-md p-1.5 space-y-1">
                      {offResults.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectOffProduct(prod)}
                          className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-primary hover:ring-1 hover:ring-primary/40 transition-all flex flex-col gap-0.5 cursor-pointer"
                        >
                          <span className="text-xs font-bold text-black dark:text-white">
                            {prod.name}
                          </span>
                          {prod.brand && (
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200">
                              Marca: {prod.brand}
                            </span>
                          )}
                          <span className="text-[10px] font-extrabold text-slate-900 dark:text-zinc-100">
                            P: {prod.valoresNutricionales.proteinas}g | C: {prod.valoresNutricionales.carbohidratos}g | G: {prod.valoresNutricionales.grasas}g
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                      Categoría
                    </label>
                    <CustomSelect
                      value={merCategory}
                      onChange={(val) => setMerCategory(val)}
                      options={CATEGORIAS.map((cat) => ({
                        value: cat,
                        label: cat,
                      }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                      Unidad de Medida
                    </label>
                    <CustomSelect
                      value={merUnit}
                      onChange={(val) => setMerUnit(val)}
                      options={UNIDADES_MEDIDA.map((unit) => ({
                        value: unit,
                        label: unit,
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                      Sector
                    </label>
                    <CustomSelect
                      value={merSector}
                      onChange={(val) => setMerSector(val)}
                      options={SECTORES.map((sec) => ({
                        value: sec,
                        label: sec,
                      }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                      Comercio
                    </label>
                    <CustomSelect
                      value={merStore}
                      onChange={(val) => setMerStore(val)}
                      options={COMERCIOS.map((com) => ({
                        value: com,
                        label: com,
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Valores Nutricionales Manuales/Autocompletados */}
                <div className="space-y-2 p-3 bg-slate-50/50 dark:bg-black/30 rounded-2xl border border-slate-100 dark:border-zinc-800/60">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                    Información Nutricional (por 100g)
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Proteínas (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={merProteinas}
                        onChange={(e) => setMerProteinas(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs outline-none focus:border-slate-350 dark:focus:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Carb. (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={merCarbohidratos}
                        onChange={(e) => setMerCarbohidratos(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs outline-none focus:border-slate-350 dark:focus:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Grasas (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={merGrasas}
                        onChange={(e) => setMerGrasas(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs outline-none focus:border-slate-350 dark:focus:border-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Azúcares (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={merAzucares}
                        onChange={(e) => setMerAzucares(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs outline-none focus:border-slate-350 dark:focus:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Fibra (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={merFibra}
                        onChange={(e) => setMerFibra(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs outline-none focus:border-slate-350 dark:focus:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                        Sodio (mg)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={merSodio}
                        onChange={(e) => setMerSodio(e.target.value === "" ? "" : parseInt(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs outline-none focus:border-slate-350 dark:focus:border-zinc-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (!isSaving) {
                        setShowAddMercaderia(false);
                        setEditingMercaderiaId(null);
                      }
                    }}
                    className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold rounded-full cursor-pointer transition-all shadow-md shadow-primary/10 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      editingMercaderiaId ? "Guardar Cambios" : "Guardar"
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
            const matchedPlato = platos.find(
              (p) => p.id === activeDetailItem.platoId,
            );
            const matchedAlimentos = matchedPlato
              ? [
                  alimentos.find((a) => a.id === matchedPlato.alimentoId1),
                  alimentos.find((a) => a.id === matchedPlato.alimentoId2),
                  alimentos.find((a) => a.id === matchedPlato.alimentoId3),
                ].filter(Boolean)
              : [];

            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in cursor-pointer"
                onClick={() => setActiveDetailItem(null)}
              >
                <div
                  className={`w-full max-w-lg rounded-3xl border shadow-2xl relative transition-all cursor-default overflow-hidden flex flex-col max-h-[90vh] ${
                    darkMode
                      ? "bg-zinc-950 border-zinc-800 text-white shadow-primary/20"
                      : "bg-white border-zinc-200 text-zinc-800 shadow-slate-200"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full h-40 shrink-0 overflow-hidden border-b border-inherit bg-slate-100 dark:bg-zinc-800/50">
                    <img
                      src={`https://tse2.mm.bing.net/th?q=${encodeURIComponent((matchedPlato ? matchedPlato.nombrePlato : "Comida") + " comida receta")}&w=800&h=400&c=7&rs=1`}
                      alt={matchedPlato ? matchedPlato.nombrePlato : "Comida"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {/* Close button */}
                  <button
                    onClick={() => setActiveDetailItem(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white cursor-pointer transition-colors backdrop-blur-sm shadow-sm z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold w-fit">
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>Organización Semanal / Comidas</span>
                    </div>
                    <h3 className="text-lg font-extrabold force-text-black organizacion-semanal-plato-title text-black dark:text-zinc-100 pr-8 flex items-center gap-1.5" data-plato-title="true" style={{ color: darkMode ? "#ffffff" : "#000000" }}>
                      <UtensilsCrossed className="w-4 h-4 text-primary shrink-0 self-center" />
                      <span className="self-center translate-y-[0.5px]">
                        {matchedPlato
                          ? matchedPlato.nombrePlato
                          : "Comida Desconocida"}
                      </span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400 font-bold">
                      <div className="bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Día de la Semana
                        </p>
                        <p className="text-slate-800 dark:text-zinc-200 font-extrabold mt-0.5">
                          {getDiaDeLaSemana(activeDetailItem.fecha)}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Fecha del Menú
                        </p>
                        <p className="text-slate-800 dark:text-zinc-200 font-extrabold mt-0.5">
                          {formatFechaDMY(activeDetailItem.fecha)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
                        Ingredientes y Composición del Plato:
                      </h4>
                      {matchedAlimentos.length > 0 ? (
                        <div className="space-y-2">
                          {matchedAlimentos.map((ali: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60"
                            >
                              <p className="text-xs font-extrabold text-primary">
                                {ali.mercaderiaName}
                              </p>
                              <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-zinc-400 font-semibold">
                                {ali.ingrediente1 && (
                                  <div>
                                    <p className="text-[8px] uppercase tracking-wider text-zinc-500">
                                      Ingr. 1
                                    </p>
                                    <p className="text-zinc-700 dark:text-zinc-300 font-extrabold truncate">
                                      {ali.ingrediente1}
                                    </p>
                                    <p className="text-primary font-bold">
                                      {ali.cantidad1} {ali.unidad1}
                                    </p>
                                  </div>
                                )}
                                {ali.ingrediente2 && (
                                  <div>
                                    <p className="text-[8px] uppercase tracking-wider text-zinc-500">
                                      Ingr. 2
                                    </p>
                                    <p className="text-zinc-700 dark:text-zinc-300 font-extrabold truncate">
                                      {ali.ingrediente2}
                                    </p>
                                    <p className="text-primary font-bold">
                                      {ali.cantidad2} {ali.unidad2}
                                    </p>
                                  </div>
                                )}
                                {ali.ingrediente3 && (
                                  <div>
                                    <p className="text-[8px] uppercase tracking-wider text-zinc-500">
                                      Ingr. 3
                                    </p>
                                    <p className="text-zinc-700 dark:text-zinc-300 font-extrabold truncate">
                                      {ali.ingrediente3}
                                    </p>
                                    <p className="text-primary font-bold">
                                      {ali.cantidad3} {ali.unidad3}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-dashed border-zinc-700 text-center text-xs text-zinc-400 font-medium">
                          No hay ingredientes específicos guardados para este
                          plato en tu despensa.
                        </div>
                      )}
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
