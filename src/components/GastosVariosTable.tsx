import React, { useState, useRef } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { saveItemToFirestore, deleteItemFromFirestore } from "../lib/firestoreSyncService";
import { generateUniqueId } from "../utils/id";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { ConfirmationModal } from "./ConfirmationModal";
import { useToast } from "../context/ToastContext";
import { GastoVario } from "../types";
import { SmartDateTimePicker } from "./SmartDateTimePicker";
import { CurrencyInput } from "./CurrencyInput";
import { parseFormattedNumber, formatNumberToDisplay } from "../lib/numberFormat";
import { GeminiService } from "../lib/gemini";
import {
  Plus,
  Trash2,
  Edit3,
  Upload,
  X,
  ChevronDown,
  Check,
  Search,
  Filter,
  AlertTriangle,
  CreditCard,
  Sparkles,
  Receipt,
  Loader2,
  FileText,
  DollarSign,
  TrendingUp,
  Tag,
  Calendar,
  Settings,
  Building2,
} from "lucide-react";

interface GastosVariosTableProps {
  gastosVarios: GastoVario[];
  setGastosVarios: React.Dispatch<React.SetStateAction<GastoVario[]>>;
  darkMode: boolean;
  token?: string | null;
  userEmail?: string;
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

interface SelectPopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: "top" | "bottom";
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedOption = options.find((opt) => opt.value === value);

  const computePopoverPosition = (): SelectPopoverPosition | null => {
    if (!dropdownRef.current) return null;
    const rect = dropdownRef.current.getBoundingClientRect();
    const popoverWidth = Math.max(rect.width, 160);

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    const estimatedHeight = Math.min(
      (filteredOptions.length || 1) * 36 + (searchable ? 45 : 0) + 16,
      240
    );
    const popoverHeight = popoverRef.current?.offsetHeight || estimatedHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUpwards =
      spaceBelow < popoverHeight + 10 && spaceAbove > spaceBelow;

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
      setIsOpen(true);
      setSearchTerm("");
    } else {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
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
  }, [isOpen, filteredOptions.length]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
    >
      <button
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
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && popoverPosition && (
              <motion.div
                ref={popoverRef}
                initial={{
                  opacity: 0,
                  scale: 0.97,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
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
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden p-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800"
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
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-full text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary text-white dark:text-blue-950"
                            : "text-black dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
                        }`}
                      >
                        <span className="truncate pr-2">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
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

export default function GastosVariosTable({
  gastosVarios,
  setGastosVarios,
  darkMode,
  userEmail,
}: GastosVariosTableProps) {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedMethod, setSelectedMethod] = useState("Todos");

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoVario | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  useLockBodyScroll(Boolean(showAddModal || showAiModal || editingGasto));

  // Form fields
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formCategoria, setFormCategoria] = useState("Supermercado");
  const [formFecha, setFormFecha] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [formMetodo, setFormMetodo] = useState("Visa Galicia");
  const [formMonto, setFormMonto] = useState("");

  // AI Ingestion Modal state
  const [cardNameDefault, setCardNameDefault] = useState("Visa Galicia");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<GastoVario[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation Modal state
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

  // Base categories & methods for dropdown options
  const defaultCategories = [
    "Supermercado",
    "Restaurante y Comida",
    "Combustible",
    "Servicios Digitales",
    "Salud y Farmacia",
    "Indumentaria",
    "Hogar y Servicios",
    "Entretenimiento",
    "Impuestos y Tasas",
    "Varios",
  ];

  const uniqueCategories = Array.from(
    new Set([
      "Todas",
      ...defaultCategories,
      ...gastosVarios.map((g) => g.categoria),
    ]),
  ).filter(Boolean);

  const uniqueMethods = Array.from(
    new Set([
      "Todos",
      "Visa Galicia",
      "Mastercard BBVA",
      "Visa Santander",
      "Tarjeta Naranja",
      "Mercado Pago",
      "American Express",
      ...gastosVarios.map((g) => g.metodo),
    ]),
  ).filter(Boolean);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filtered List
  const filteredGastos = React.useMemo(() => {
    return gastosVarios.filter((item) => {
      const matchesSearch =
        item.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.metodo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoria.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        selectedCategory === "Todas" || item.categoria === selectedCategory;
      const matchesMethod =
        selectedMethod === "Todos" || item.metodo === selectedMethod;
      return matchesSearch && matchesCat && matchesMethod;
    });
  }, [gastosVarios, searchQuery, selectedCategory, selectedMethod]);

  const totalPages = Math.ceil(filteredGastos.length / pageSize) || 1;
  const paginatedGastos = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGastos.slice(start, start + pageSize);
  }, [filteredGastos, currentPage, pageSize]);

  // Financial Stats
  const totalMonto = filteredGastos.reduce((sum, g) => sum + g.monto, 0);

  const formatCurrency = (val: number) => {
    return (
      "AR$ " +
      new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val)
    );
  };

  const formatFechaDMY = (val?: string): string => {
    if (!val) return "-";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
    const clean = val.split("T")[0].split(" ")[0];
    const parts = clean.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts;
      const pad = (s: string) => s.padStart(2, "0");
      return `${pad(d)}/${pad(m)}/${y}`;
    }
    return val;
  };

  // Handlers for Add / Edit
  const handleOpenAdd = () => {
    setEditingGasto(null);
    setFormDescripcion("");
    setFormCategoria("Supermercado");
    setFormFecha(new Date().toISOString().split("T")[0]);
    setFormMetodo("Visa Galicia");
    setFormMonto("");
    setShowAddModal(true);
  };

  const handleOpenEdit = (gasto: GastoVario) => {
    setEditingGasto(gasto);
    setFormDescripcion(gasto.descripcion);
    setFormCategoria(gasto.categoria);
    setFormFecha(gasto.fecha);
    setFormMetodo(gasto.metodo);
    setFormMonto(gasto.monto ? formatNumberToDisplay(gasto.monto) : "");
    setShowAddModal(true);
  };

  const handleSaveGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescripcion.trim()) {
      showToast("Por favor ingresa una descripción para el gasto.", "error");
      return;
    }
    const montoNum = parseFormattedNumber(formMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
      showToast("Por favor ingresa un monto válido mayor a 0.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const gastoItem: GastoVario = {
        id: editingGasto?.id || generateUniqueId("gv"),
        descripcion: formDescripcion.trim(),
        categoria: formCategoria.trim() || "Varios",
        fecha: formFecha,
        metodo: formMetodo.trim() || "Tarjeta",
        monto: montoNum,
      };

      const userId = userEmail || "hernanmaximiliano10@gmail.com";
      await saveItemToFirestore(userId, "gastos_varios", gastoItem);
      setGastosVarios((prev) => {
        const exists = prev.some((g) => g.id === gastoItem.id);
        if (exists) {
          return prev.map((g) => (g.id === gastoItem.id ? gastoItem : g));
        }
        return [gastoItem, ...prev];
      });
      showToast(editingGasto ? "Gasto vario actualizado con éxito" : "Gasto vario guardado con éxito", "success");
      setShowAddModal(false);
    } catch (error) {
      console.error("Error al guardar gasto vario:", error);
      showToast("Error al guardar el gasto", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    askConfirmation(
      "Eliminar Gasto Vario",
      "¿Estás seguro de que deseas eliminar este gasto de tu registro?",
      async () => {
        setIsDeleting(true);
        try {
          const userId = userEmail || "hernanmaximiliano10@gmail.com";
          await deleteItemFromFirestore(userId, "gastos_varios", id);
          setGastosVarios((prev) => prev.filter((g) => g.id !== id));
          showToast("Gasto vario eliminado con éxito", "success");
        } catch (error) {
          console.error("Error al eliminar gasto vario:", error);
          showToast("Error al eliminar el gasto", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  // AI Statement Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    setAiError(null);
    setExtractedPreview([]);

    try {
      const reader = new FileReader();

      const isImageOrPdf =
        file.type.startsWith("image/") || file.type === "application/pdf";

      reader.onload = async () => {
        try {
          const fileData = reader.result as string;
          const mimeType =
            file.type ||
            (file.name.endsWith(".pdf") ? "application/pdf" : "text/plain");

          let parsedItems: {
            descripcion: string;
            categoria: string;
            fecha: string;
            metodo: string;
            monto: number;
          }[] = [];

          try {
            // Attempt server Gemini endpoint
            parsedItems = await GeminiService.parseCardStatement(
              fileData,
              mimeType,
              cardNameDefault,
            );
          } catch (apiErr: any) {
            console.warn(
              "AI Endpoint error, running client parser fallback:",
              apiErr,
            );
            // Fallback parsing for text/CSV or simulated response
            if (!isImageOrPdf) {
              const textContent = typeof fileData === "string" ? fileData : "";
              const lines = textContent.split(/\r?\n/);
              for (const line of lines) {
                if (!line.trim()) continue;
                const matchMonto = line.match(/(\d+[\d.,]*)/);
                if (matchMonto) {
                  const montoVal = parseFloat(
                    matchMonto[1].replace(/\./g, "").replace(",", "."),
                  );
                  if (!isNaN(montoVal) && montoVal > 0) {
                    parsedItems.push({
                      descripcion:
                        line
                          .slice(0, 40)
                          .replace(/[^a-zA-Z0-9\s]/g, "")
                          .trim() || "Consumo Detectado",
                      categoria: "Varios",
                      fecha: new Date().toISOString().split("T")[0],
                      metodo: cardNameDefault || "Tarjeta",
                      monto: montoVal,
                    });
                  }
                }
              }
            } else {
              throw apiErr;
            }
          }

          if (parsedItems.length === 0) {
            setAiError(
              "No se pudieron detectar consumos en el resumen cargado. Intenta con otro archivo o formato de imagen/PDF.",
            );
          } else {
            const formattedExtracted: GastoVario[] = parsedItems.map(
              (item) => ({
                id: generateUniqueId("ext"),
                descripcion: item.descripcion || "Consumo Tarjeta",
                categoria: item.categoria || "Varios",
                fecha: item.fecha || new Date().toISOString().split("T")[0],
                metodo: item.metodo || cardNameDefault || "Tarjeta",
                monto: item.monto || 0,
              }),
            );
            setExtractedPreview(formattedExtracted);
          }
        } catch (err: any) {
          setAiError(
            err.message ||
              "Ocurrió un error al analizar el archivo de resumen.",
          );
        } finally {
          setAiLoading(false);
        }
      };

      if (isImageOrPdf) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    } catch (err: any) {
      setAiError("Error al leer el archivo seleccionado.");
      setAiLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (extractedPreview.length === 0) return;
    setGastosVarios((prev) => [...extractedPreview, ...prev]);
    showToast("Gastos importados con éxito", "success");
    setShowAiModal(false);
    setExtractedPreview([]);
  };

  return (
    <div className="space-y-6">
      {/* Container header matching PaymentsTable */}
      <div
        className={`p-6 rounded-3xl border ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                Gastos Varios
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">
                  Control & AI
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Sigue tus consumos por tarjeta de crédito o débito e importa
                resúmenes automáticamente con Inteligencia Artificial.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={() => {
                setShowAiModal(true);
                setExtractedPreview([]);
                setAiError(null);
              }}
              className="w-full sm:w-auto justify-center px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Subir Resumen con IA</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto justify-center px-4 py-2 rounded-full bg-primary text-white dark:text-blue-950 font-bold text-xs hover:bg-primary-hover shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Gasto</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800/50">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" /> Total Gastos
              Varios
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white quick-stat-number">
              {formatCurrency(totalMonto)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800/50">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-primary" /> Cantidad de
              Consumos
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-1">
              <span className="quick-stat-number">{filteredGastos.length}</span>{" "}
              <span className="text-xs font-semibold text-primary">
                registros
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800/50">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary" /> Tarjetas /
              Métodos Activos
            </div>
            <div className="text-sm md:text-base font-bold text-black dark:text-white truncate flex items-baseline gap-1">
              <span className="quick-stat-number">
                {Array.from(new Set(gastosVarios.map((g) => g.metodo))).length ||
                  0}
              </span>{" "}
              <span className="text-xs font-semibold text-primary">
                métodos
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input
              type="text"
              placeholder="Buscar por comercio, tarjeta o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            
            <CustomSelect
              size="sm"
              value={selectedCategory}
              icon={<Filter className="w-3.5 h-3.5" />}
              onChange={(val) => setSelectedCategory(val)}
              options={uniqueCategories.map((cat) => ({
                value: cat,
                label: cat,
              }))}
              placeholder="Categoría"
              className="w-full sm:w-40"
            />
            <CustomSelect
              size="sm"
              value={selectedMethod}
              icon={<Filter className="w-3.5 h-3.5" />}
              onChange={(val) => setSelectedMethod(val)}
              options={uniqueMethods.map((m) => ({ value: m, label: m }))}
              placeholder="Método"
              className="w-full sm:w-44"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead className="sticky top-0 z-20">
              <tr
                className={`text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}
              >
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">
                  <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Detalle</span>
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[140px]">
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cat.</span>
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Fecha</span>
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">
                  <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Medio</span>
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[130px]">
                  <span className="flex items-center justify-end gap-1.5 w-full"><DollarSign className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Importe</span>
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[90px]">
                  <span className="flex items-center justify-center gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                </th>
              </tr>
            </thead>
            <tbody className="">
              {filteredGastos.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-400 dark:text-zinc-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-8 h-8 opacity-40" />
                      <p className="font-semibold text-xs">
                        No se encontraron gastos varios registrados.
                      </p>
                      <p className="text-[11px] opacity-70">
                        Presiona "Agregar Gasto" o "Subir Resumen con IA" para
                        cargar consumos.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedGastos.map((gasto) => (
                  <tr
                    key={gasto.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {gasto.descripcion}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 inline-flex items-center gap-1">
                        <Tag className="w-3 h-3 text-primary" />
                        {gasto.categoria}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400 font-medium whitespace-nowrap">
                      {formatFechaDMY(gasto.fecha)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        {gasto.metodo}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white text-sm whitespace-nowrap">
                      {formatCurrency(gasto.monto)}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => handleOpenEdit(gasto)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                          title="Editar gasto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(gasto.id)}
                          className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                          title="Eliminar gasto"
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

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
            <span>
              Mostrando {paginatedGastos.length} de {filteredGastos.length} registros (Página {currentPage} de {totalPages})
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Add/Edit Modal */}
      {createPortal(
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { if (!isSaving) setShowAddModal(false); }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
                {/* Header: Fixed and Non-Scrollable */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-zinc-900 z-10">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {editingGasto ? "Editar Gasto Vario" : "Agregar Gasto Vario"}
                  </h3>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => { if (!isSaving) setShowAddModal(false); }}
                    className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                  <form onSubmit={handleSaveGasto} className="space-y-4 pb-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Descripción <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={isSaving}
                        placeholder="Ej: Supermercado Vea, Nafta YPF, Resto Italia"
                        value={formDescripcion}
                        onChange={(e) => setFormDescripcion(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Categoría
                        </label>
                        <CustomSelect
                          value={formCategoria}
                          onChange={(val) => setFormCategoria(val)}
                          options={defaultCategories.map((c) => ({
                            value: c,
                            label: c,
                          }))}
                          placeholder="Seleccionar categoría"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Método / Tarjeta de Origen
                        </label>
                        <input
                          type="text"
                          disabled={isSaving}
                          placeholder="Ej: Visa Galicia, Mastercard BBVA"
                          value={formMetodo}
                          onChange={(e) => setFormMetodo(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Fecha
                        </label>
                        <SmartDateTimePicker
                          value={formFecha}
                          onChange={(val) => setFormFecha(val)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Monto (AR$) <span className="text-primary">*</span>
                        </label>
                        <CurrencyInput
                          required
                          disabled={isSaving}
                          placeholder="0,00"
                          value={formMonto}
                          onChange={(val) => setFormMonto(val)}
                          className="w-full px-3.5 py-2.5 text-xs font-black rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800/40">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => { if (!isSaving) setShowAddModal(false); }}
                        className="px-4 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-all cursor-pointer disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          editingGasto ? "Guardar Cambios" : "Guardar Gasto"
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

      {/* AI Statement Upload Modal */}
      {createPortal(
        <AnimatePresence>
          {showAiModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border flex flex-col ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white"
                    : "bg-white border-zinc-200 text-zinc-900"
                }`}
              >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base">
                      Cargar Resumen de Tarjeta con IA
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                      Lee de forma automática imágenes (PNG/JPG), PDFs o textos
                      de resúmenes bancarios.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Tarjeta de Origen (Nombre por defecto)
                  </label>
                  <input
                    type="text"
                    value={cardNameDefault}
                    onChange={(e) => setCardNameDefault(e.target.value)}
                    placeholder="Ej: Visa Galicia, Mastercard BBVA"
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                  />
                </div>

                {/* Dropzone / Upload Button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/20 hover:border-primary bg-primary/10 hover:bg-primary/10 p-8 rounded-full text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {aiLoading ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-xs font-bold text-primary">
                        Analizando resumen de tarjeta con Inteligencia
                        Artificial...
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Extrayendo comercios, fechas, categorías y montos
                        consumidos.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                          Haz clic para seleccionar o soltar un archivo de
                          resumen
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Soporta resúmenes en imagen (captura de pantalla
                          PNG/JPG), PDF o archivo de texto/CSV.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {aiError && (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                {/* Extracted Items Preview */}
                {extractedPreview.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        Consumos Detectados por IA ({extractedPreview.length})
                      </h4>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        Total:{" "}
                        {formatCurrency(
                          extractedPreview.reduce(
                            (sum, item) => sum + item.monto,
                            0,
                          ),
                        )}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">
                      <table className="w-full text-left border-collapse min-w-[950px]">
                        <thead className="sticky top-0 z-20">
                          <tr
                            className={`text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}
                          >
                            <th className="py-3 px-4 whitespace-nowrap">
                              <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Comercio</span>
                            </th>
                            <th className="py-3 px-4 whitespace-nowrap">
                              <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cat.</span>
                            </th>
                            <th className="py-3 px-4 whitespace-nowrap">
                              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Fecha</span>
                            </th>
                            <th className="py-3 px-4 whitespace-nowrap">
                              <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Tarjeta</span>
                            </th>
                            <th className="py-3 px-4 whitespace-nowrap text-right">
                              <span className="flex items-center justify-end gap-1.5 w-full"><DollarSign className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Importe</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="">
                          {extractedPreview.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                              <td className="p-3 font-bold whitespace-nowrap">
                                {item.descripcion}
                              </td>
                              <td className="p-3 text-slate-500 whitespace-nowrap">
                                {item.categoria}
                              </td>
                              <td className="p-3 text-slate-500 whitespace-nowrap">
                                {formatFechaDMY(item.fecha)}
                              </td>
                              <td className="p-3 font-medium whitespace-nowrap">{item.metodo}</td>
                              <td className="p-3 text-right font-black text-primary whitespace-nowrap">
                                {formatCurrency(item.monto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setExtractedPreview([])}
                        className="px-4 py-2 rounded-full text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        Descartar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImport}
                        className="px-5 py-2 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          Confirmar e Importar {extractedPreview.length}{" "}
                          Consumos
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Confirmation Modal con Animación y Estado Eliminando */}
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
