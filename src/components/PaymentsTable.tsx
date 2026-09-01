import React, { useState } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { saveItemToFirestore, deleteItemFromFirestore } from "../lib/firestoreSyncService";
import { generateUniqueId } from "../utils/id";
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { ConfirmationModal } from "./ConfirmationModal";
import { DetailedPayment } from "../types";
import { SmartDateTimePicker } from "./SmartDateTimePicker";
import { CurrencyInput } from "./CurrencyInput";
import { parseFormattedNumber, formatNumberToDisplay } from "../lib/numberFormat";
import { processAndCreateRecurringPayments } from "../utils/recurringPayments";
import {
  Plus,
  Trash2,
  Upload,
  X,
  ChevronDown,
  Check,
  FileDown,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  Wallet,
  CheckSquare,
  FileText,
  Tag,
  Clock,
  CreditCard,
  DollarSign,
  RefreshCw,
  Receipt,
  FileCheck,
  MapPin,
  Activity,
  Building2,
  Loader2,
  ListFilter,
} from "lucide-react";
import { WorkspaceService } from "../lib/workspace";

interface PaymentsTableProps {
  payments: DetailedPayment[];
  setPayments: React.Dispatch<React.SetStateAction<DetailedPayment[]>>;
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
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
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
export default function PaymentsTable({
  payments,
  setPayments,
  darkMode,
  token,
  userEmail,
}: PaymentsTableProps) {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [uploadingState, setUploadingState] = useState<{
    [key: string]: boolean;
  }>({});

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useLockBodyScroll(
    Boolean(showAddPayment || editingPaymentId || confirmModal)
  );

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmModal({ title, message, onConfirm });
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

  const getDefaultMonthDates = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    const pad = (n: number) => String(n).padStart(2, "0");
    const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;

    return { startDate, endDate };
  };

  const defaultDates = getDefaultMonthDates();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);

  // Automatic recurring payments check (triggers 1 day before month end or later)
  React.useEffect(() => {
    if (payments && payments.length > 0) {
      const userId = userEmail || "hernanmaximiliano10@gmail.com";
      processAndCreateRecurringPayments(payments, userId).then(
        ({ newPaymentsCreated }) => {
          if (newPaymentsCreated.length > 0) {
            setPayments((prev) => {
              const newIds = new Set(newPaymentsCreated.map((np) => np.id));
              const filteredPrev = prev.filter((p) => !newIds.has(p.id));
              return [...newPaymentsCreated, ...filteredPrev];
            });
          }
        },
      );
    }
  }, [payments?.length, userEmail]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const baseCategories = [
    "Impuestos",
    "Prestamos",
    "Telefonia e Internet",
    "Servicios Digitales",
    "Obra Social",
    "Tarjeta de Credito",
    "Servicios Esenciales",
  ];
  const uniqueCategoriesFromPayments = Array.from(
    new Set(payments.map((p) => p.categoria)),
  );
  const allCategories = Array.from(
    new Set(["Todos", ...baseCategories, ...uniqueCategoriesFromPayments]),
  ).filter(Boolean);

  const filteredPayments = React.useMemo(() => {
    return payments
      .filter((p) => {
        const lowerQuery = searchQuery.toLowerCase();
        const matchesSearch =
          p.descripcion.toLowerCase().includes(lowerQuery) ||
          p.categoria.toLowerCase().includes(lowerQuery) ||
          (p.metodoPago && p.metodoPago.toLowerCase().includes(lowerQuery)) ||
          (p.conQuePagar && p.conQuePagar.toLowerCase().includes(lowerQuery)) ||
          (p.dondePagar && p.dondePagar.toLowerCase().includes(lowerQuery));

        const matchesCategory =
          selectedCategory === "Todos" || p.categoria === selectedCategory;

        let matchesDate = true;
        if (p.fechaVencimiento) {
          const dueDate = p.fechaVencimiento.split("T")[0];
          if (startDate && dueDate < startDate) {
            matchesDate = false;
          }
          if (endDate && dueDate > endDate) {
            matchesDate = false;
          }
        } else {
          if (startDate || endDate) {
            matchesDate = false;
          }
        }

        return matchesSearch && matchesCategory && matchesDate;
      })
      .sort((a, b) => {
        const dateA = a.fechaVencimiento || "";
        const dateB = b.fechaVencimiento || "";
        return dateA.localeCompare(dateB);
      });
  }, [payments, searchQuery, selectedCategory, startDate, endDate]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedPayments = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const handleFileUpload = async (
    paymentId: string,
    field: "facturaEmitida" | "comprobantePago",
    file: File,
  ) => {
    const uploadKey = `${paymentId}-${field}`;
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }));

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;
      const userId = userEmail || "hernanmaximiliano10@gmail.com";

      if (token) {
        const result = await WorkspaceService.uploadFileToDrive(
          file.name,
          file.type || "application/octet-stream",
          base64Data,
          token,
        );

        if (result.success && result.webViewLink) {
          const updatedPayment = payments.find((p) => p.id === paymentId);
          if (updatedPayment) {
            const toSave = { ...updatedPayment, [field]: result.webViewLink };
            setPayments((prev) =>
              prev.map((p) => (p.id === paymentId ? toSave : p)),
            );
            await saveItemToFirestore(userId, "detailed_payments", toSave);
          }
          showToast(`Archivo "${file.name}" subido y guardado con éxito.`, "success");
        } else {
          showToast(
            "Error al subir archivo a Google Drive: " + (result.error || "Error desconocido"),
            "error",
          );
        }
      } else {
        const updatedPayment = payments.find((p) => p.id === paymentId);
        if (updatedPayment) {
          const toSave = { ...updatedPayment, [field]: base64Data };
          setPayments((prev) =>
            prev.map((p) => (p.id === paymentId ? toSave : p)),
          );
          await saveItemToFirestore(userId, "detailed_payments", toSave);
        }
        showToast(
          `Archivo "${file.name}" guardado (iniciá sesión con Google para subirlo también a Drive).`,
          "success",
        );
      }
    } catch (err: any) {
      console.error("Error uploading file:", err);
      showToast("Error al procesar el archivo: " + err.message, "error");
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }));
    }
  };

  // Form states
  const [pago, setPago] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("Impuestos");
  const [fechaVencimiento, setFechaVencimiento] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [fechaCierre, setFechaCierre] = useState("");
  const [metodoPago, setMetodoPago] = useState("Tarjeta de Debito");
  const [montoAPagar, setMontoAPagar] = useState("");
  const [pagoRecurrente, setPagoRecurrente] = useState(false);
  const [conQuePagar, setConQuePagar] = useState("");
  const [dondePagar, setDondePagar] = useState("");

  const handleUpdate = (
    id: string,
    field: keyof DetailedPayment,
    value: any,
  ) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const handleEdit = (p: DetailedPayment) => {
    setEditingPaymentId(p.id);
    setPago(p.pago);
    setDescripcion(p.descripcion);
    setCategoria(p.categoria);
    setFechaVencimiento(p.fechaVencimiento);
    setFechaCierre(p.fechaCierre || "");
    setMetodoPago(p.metodoPago);
    setMontoAPagar(p.montoAPagar ? formatNumberToDisplay(p.montoAPagar) : "");
    setPagoRecurrente(p.pagoRecurrente || false);
    setConQuePagar(p.conQuePagar || "");
    setDondePagar(p.dondePagar || "");
    setShowAddPayment(true);
  };

  const resetForm = () => {
    setPago(false);
    setDescripcion("");
    setCategoria("Impuestos");
    setFechaVencimiento(new Date().toISOString().split("T")[0]);
    setFechaCierre("");
    setMetodoPago("Tarjeta de Debito");
    setMontoAPagar("");
    setPagoRecurrente(false);
    setConQuePagar("");
    setDondePagar("");
    setEditingPaymentId(null);
    setShowAddPayment(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion || !descripcion.trim()) {
      showToast("Por favor, ingresa una descripción para el pago.", "error");
      return;
    }
    if (!fechaVencimiento) {
      showToast("Por favor, selecciona una fecha de vencimiento.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const paymentData: DetailedPayment = {
        id: editingPaymentId || generateUniqueId("dp"),
        pago,
        descripcion: descripcion.trim(),
        categoria: categoria as any,
        fechaVencimiento,
        fechaCierre: categoria === "Tarjeta de Credito" ? fechaCierre : undefined,
        metodoPago: metodoPago as any,
        montoAPagar: parseFormattedNumber(montoAPagar),
        pagoRecurrente,
        conQuePagar,
        dondePagar,
      };

      const userId = userEmail || "hernanmaximiliano10@gmail.com";
      await saveItemToFirestore(userId, "detailed_payments", paymentData);

      setPayments((prev) => {
        const exists = prev.some((p) => p.id === paymentData.id);
        if (exists) {
          return prev.map((p) => (p.id === paymentData.id ? paymentData : p));
        }
        return [paymentData, ...prev];
      });

      if (paymentData.pagoRecurrente) {
        const currentList = payments.some((p) => p.id === paymentData.id)
          ? payments.map((p) => (p.id === paymentData.id ? paymentData : p))
          : [paymentData, ...payments];
        processAndCreateRecurringPayments(currentList, userId).then(
          ({ newPaymentsCreated }) => {
            if (newPaymentsCreated.length > 0) {
              setPayments((prev) => {
                const newIds = new Set(newPaymentsCreated.map((np) => np.id));
                const filteredPrev = prev.filter((p) => !newIds.has(p.id));
                return [...newPaymentsCreated, ...filteredPrev];
              });
            }
          },
        );
      }

      showToast(
        editingPaymentId ? "Pago actualizado con éxito" : "Pago registrado con éxito",
        "success"
      );
      resetForm();
    } catch (err: any) {
      console.error("Error al guardar el pago:", err);
      showToast(err?.message || "Error al guardar el pago.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro de pago? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        try {
          const userId = userEmail || "hernanmaximiliano10@gmail.com";
          await deleteItemFromFirestore(userId, "detailed_payments", id);
          setPayments((prev) => prev.filter((p) => p.id !== id));
          showToast("Registro de pago eliminado", "success");
        } catch (err: any) {
          showToast("Error al eliminar el pago", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  return (
        <div className={`p-6 rounded-3xl border ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-extrabold text-md flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span>Gastos Mensuales</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Administra y lleva el control de todos tus pagos, suscripciones y servicios registrados.
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowAddPayment(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Pago</span>
          </motion.button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 space-y-3">
      
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
          {/* Search query */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input
              type="text"
              placeholder="Buscar por descripción, categoría, método..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
            />
          </div>
          {/* Category selection */}
          <CustomSelect
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
            options={allCategories.map((cat) => ({ value: cat, label: cat }))}
            icon={<Filter className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto"
            size="sm"
          />
        </div>

        {/* Date Range Filter (Vencimiento) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t w-full border-slate-200/60 dark:border-zinc-800/50 text-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <span className="flex items-center gap-1.5 font-bold text-black dark:text-zinc-300" style={{ color: darkMode ? undefined : '#000000' }}>
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span style={{ color: darkMode ? undefined : '#000000' }}>Vencimiento:</span>
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 whitespace-nowrap w-10">
                Desde:
              </label>
              <div className="flex-1 w-full sm:w-44">
                <SmartDateTimePicker
                  value={startDate}
                  onChange={(val) => setStartDate(val ? val.split("T")[0] : "")}
                  placeholder="Desde..."
                  showTimeOption={false}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 whitespace-nowrap w-10">
                Hasta:
              </label>
              <div className="flex-1 w-full sm:w-44">
                <SmartDateTimePicker
                  value={endDate}
                  onChange={(val) => setEndDate(val ? val.split("T")[0] : "")}
                  placeholder="Hasta..."
                  showTimeOption={false}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                const defaults = getDefaultMonthDates();
                setStartDate(defaults.startDate);
                setEndDate(defaults.endDate);
              }}
              className={`flex-1 sm:flex-initial w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 ${
                startDate === getDefaultMonthDates().startDate && endDate === getDefaultMonthDates().endDate
                  ? "bg-primary text-white dark:text-slate-950 hover:bg-primary-hover shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-700/80 hover:bg-primary/10 hover:text-primary dark:hover:text-primary"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Mes Actual</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className={`flex-1 sm:flex-initial w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 ${
                !startDate && !endDate
                  ? "bg-primary text-white dark:text-slate-950 hover:bg-primary-hover shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-700/80 hover:bg-slate-200 dark:hover:bg-zinc-700"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Ver Todos</span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="sticky top-0 z-30">
            <tr
              className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "bg-zinc-950 text-zinc-400" : "bg-slate-100 text-slate-600"}`}
            >
              <th className="px-2 py-3.5 md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[80px] w-[80px] max-w-[80px]">
                <span className="flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" /> Pago</span>
              </th>
              <th className="px-3 py-3.5 md:sticky md:left-[80px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[180px] w-[180px] max-w-[180px]">
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Detalle</span>
              </th>
              <th className="px-3 py-3.5 md:sticky md:left-[260px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[130px] w-[130px] max-w-[130px]">
                <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cat.</span>
              </th>
              <th className="px-3 py-3.5 md:sticky md:left-[390px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[110px] w-[110px] max-w-[110px]">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Vence</span>
              </th>
              <th className="px-3 py-3.5 md:sticky md:left-[500px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[100px] w-[100px] max-w-[100px]">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cierre</span>
              </th>
              <th className="px-4 py-3.5 whitespace-nowrap bg-slate-100 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Medio</span>
              </th>
              <th className="px-4 py-3.5 whitespace-nowrap bg-slate-100 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400 min-w-[120px]">
                <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Monto</span>
              </th>
              <th className="px-4 py-3.5 whitespace-nowrap bg-slate-100 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Recurr.</span>
              </th>
              <th className="px-4 py-3.5 whitespace-nowrap bg-slate-100 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1"><Receipt className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Fact.</span>
              </th>
              <th className="px-4 py-3.5 whitespace-nowrap bg-slate-100 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1"><FileCheck className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Comprob.</span>
              </th>
              <th className="px-4 py-3.5 whitespace-nowrap bg-slate-100 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Débito</span>
              </th>
              <th className="px-4 py-3.5 whitespace-nowrap bg-slate-100 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Lugar</span>
              </th>
              <th className="px-4 py-3.5 whitespace-nowrap bg-slate-100 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Estado</span>
              </th>
              <th className="px-4 py-3.5 bg-slate-100 dark:bg-zinc-950"></th>
            </tr>
          </thead>
          <tbody className="">
            {filteredPayments.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400 font-medium"
                >
                  No se encontraron pagos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              paginatedPayments.map((p) => {
                const today = new Date().toISOString().split("T")[0];
                let estado = "Pendiente de Pago";
                if (
                  (p.pago && p.pagoRecurrente) ||
                  (p.pago && p.fechaVencimiento < today)
                ) {
                  estado = "Pagado";
                } else if (p.pago && !p.pagoRecurrente) {
                  estado = "Cancelado";
                } else if (!p.pago && p.fechaVencimiento === today) {
                  estado = "Vencimiento";
                } else if (p.pago) {
                  estado = "Pagado";
                }
                return (
                  <tr
                    key={p.id}
                    className="group transition-all hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-2 py-3.5 md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[80px] w-[80px] max-w-[80px] text-center">
                      <input
                        type="checkbox"
                        checked={p.pago}
                        onChange={async () => {
                          const updated = { ...p, pago: !p.pago };
                          setPayments((prev) =>
                            prev.map((item) =>
                              item.id === p.id ? updated : item,
                            ),
                          );
                          try {
                            const userId = userEmail || "hernanmaximiliano10@gmail.com";
                            await saveItemToFirestore(userId, "detailed_payments", updated);
                            showToast(
                              updated.pago ? "Marcado como pagado y guardado." : "Marcado como pendiente y guardado.",
                              "success",
                            );
                          } catch (err: any) {
                            // Roll back the optimistic update if the save actually failed.
                            setPayments((prev) =>
                              prev.map((item) => (item.id === p.id ? p : item)),
                            );
                            showToast(err?.message || "No se pudo guardar el cambio.", "error");
                          }
                        }}
                        className="w-4 h-4 accent-primary cursor-pointer rounded border-slate-300 dark:border-zinc-700"
                      />
                    </td>
                    <td className="px-3 py-3.5 md:sticky md:left-[80px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[180px] w-[180px] max-w-[180px] font-semibold text-slate-900 dark:text-zinc-100 break-words">
                      {p.descripcion}
                    </td>
                    <td className="px-3 py-3.5 md:sticky md:left-[260px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[130px] w-[130px] max-w-[130px]">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          darkMode
                            ? "bg-primary/10 text-primary"
                            : "bg-primary-container text-primary"
                        }`}
                      >
                        {p.categoria}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 md:sticky md:left-[390px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[110px] w-[110px] max-w-[110px] text-slate-500 dark:text-zinc-400 font-medium">
                      {formatFechaDMY(p.fechaVencimiento)}
                    </td>
                    <td className="px-3 py-3.5 md:sticky md:left-[500px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[100px] w-[100px] max-w-[100px] text-slate-500 dark:text-zinc-400 font-medium">
                      {p.categoria === "Tarjeta de Credito"
                        ? formatFechaDMY(p.fechaCierre)
                        : "-"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-zinc-300 font-medium whitespace-nowrap">
                      {p.metodoPago}
                    </td>
                    <td className="px-4 py-4 font-mono font-semibold text-slate-900 dark:text-zinc-100 whitespace-nowrap min-w-[120px]">
                      AR${" "}
                      {new Intl.NumberFormat("es-AR", {
                        minimumFractionDigits: 2,
                      }).format(p.montoAPagar)}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={p.pagoRecurrente}
                        onChange={async () => {
                          const updated = { ...p, pagoRecurrente: !p.pagoRecurrente };
                          setPayments((prev) =>
                            prev.map((item) =>
                              item.id === p.id ? updated : item,
                            ),
                          );
                          try {
                            const userId = userEmail || "hernanmaximiliano10@gmail.com";
                            await saveItemToFirestore(userId, "detailed_payments", updated);
                            showToast(
                              updated.pagoRecurrente ? "Marcado como recurrente y guardado." : "Desmarcado como recurrente y guardado.",
                              "success",
                            );
                          } catch (err: any) {
                            setPayments((prev) =>
                              prev.map((item) => (item.id === p.id ? p : item)),
                            );
                            showToast(err?.message || "No se pudo guardar el cambio.", "error");
                          }
                        }}
                        className="w-4 h-4 accent-primary cursor-pointer rounded border-slate-300 dark:border-zinc-700"
                      />
                    </td>
                    <td className="px-6 py-4 text-center min-w-[120px]">
                      {uploadingState[`${p.id}-facturaEmitida`] ? (
                        <div className="flex items-center justify-center gap-1 text-[10px] text-primary font-bold">
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span>Subiendo...</span>
                        </div>
                      ) : p.facturaEmitida ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={p.facturaEmitida}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline transition-all"
                          >
                            <FileDown className="w-3 h-3" />
                            <span>Ver</span>
                          </a>
                          <button
                            onClick={() => {
                              askConfirmation(
                                "Desvincular Archivo",
                                "¿Estás seguro de que deseas desvincular este archivo de factura?",
                                () => {
                                  setPayments((prev) =>
                                    prev.map((item) =>
                                      item.id === p.id
                                        ? { ...item, facturaEmitida: undefined }
                                        : item,
                                    ),
                                  );
                                },
                              );
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                            title="Eliminar archivo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-full text-[10px] font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-all w-fit mx-auto">
                          <Upload className="w-3 h-3" />
                          <span>Subir</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileUpload(
                                  p.id,
                                  "facturaEmitida",
                                  e.target.files[0],
                                );
                              }
                            }}
                          />
                        </label>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center min-w-[120px]">
                      {uploadingState[`${p.id}-comprobantePago`] ? (
                        <div className="flex items-center justify-center gap-1 text-[10px] text-primary font-bold">
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span>Subiendo...</span>
                        </div>
                      ) : p.comprobantePago ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={p.comprobantePago}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline transition-all"
                          >
                            <FileDown className="w-3 h-3" />
                            <span>Ver</span>
                          </a>
                          <button
                            onClick={() => {
                              askConfirmation(
                                "Desvincular Archivo",
                                "¿Estás seguro de que deseas desvincular este comprobante de pago?",
                                () => {
                                  setPayments((prev) =>
                                    prev.map((item) =>
                                      item.id === p.id
                                        ? {
                                            ...item,
                                            comprobantePago: undefined,
                                          }
                                        : item,
                                    ),
                                  );
                                },
                              );
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                            title="Eliminar archivo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-full text-[10px] font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-all w-fit mx-auto">
                          <Upload className="w-3 h-3" />
                          <span>Subir</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileUpload(
                                  p.id,
                                  "comprobantePago",
                                  e.target.files[0],
                                );
                              }
                            }}
                          />
                        </label>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-zinc-400 font-medium">
                      {p.conQuePagar || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-zinc-400 font-medium">
                      {p.dondePagar || "-"}
                    </td>
                    <td className="px-6 py-4 font-bold text-xs whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          estado === "Pagado" || estado === "Cancelado"
                            ? darkMode
                              ? "bg-primary/10 text-primary"
                              : "bg-primary-container text-primary"
                            : estado === "Vencimiento"
                              ? darkMode
                                ? "bg-red-500/10 text-red-400"
                                : "bg-red-50 text-red-600"
                              : darkMode
                                ? "bg-primary/10 text-primary"
                                : "bg-primary-container text-primary"
                        }`}
                      >
                        {estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                          title="Editar"
                        >
                          <svg
                            xmlns="http://www.2003/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
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

      {/* PAGINATION FOOTER */}
      {totalPages > 1 && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>
            Mostrando {paginatedPayments.length} de {filteredPayments.length} registros (Página {currentPage} de {totalPages})
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

      {createPortal(
        <AnimatePresence>
          {showAddPayment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { if (!isSaving) resetForm(); }}
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
                  {editingPaymentId ? "Editar Pago" : "Agregar Pago"}
                </h3>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => { if (!isSaving) resetForm(); }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleAddSubmit} className="space-y-4 pb-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="pago-checkbox"
                        checked={pago}
                        onChange={(e) => setPago(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                      <label
                        htmlFor="pago-checkbox"
                        className="text-sm font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
                      >
                        ¿Está Pagado?
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="recurrente-checkbox"
                        checked={pagoRecurrente}
                        onChange={(e) => setPagoRecurrente(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                      <label
                        htmlFor="recurrente-checkbox"
                        className="text-sm font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
                      >
                        Pago Recurrente
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Ej: Internet / Supermercado"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-slate-400 dark:focus:border-zinc-700"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Categoría
                      </label>
                      <CustomSelect
                        value={categoria}
                        onChange={(value) => setCategoria(value)}
                        options={[
                          "Impuestos",
                          "Prestamos",
                          "Telefonia e Internet",
                          "Servicios Digitales",
                          "Obra Social",
                          "Tarjeta de Credito",
                          "Servicios Esenciales",
                        ].map((cat) => ({ value: cat, label: cat }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Monto (AR$)
                      </label>
                      <CurrencyInput
                        value={montoAPagar}
                        onChange={(val) => setMontoAPagar(val)}
                        placeholder="Ej: 45.500,00"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-slate-400 dark:focus:border-zinc-700"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Fecha Vencimiento
                      </label>
                      <SmartDateTimePicker
                        value={fechaVencimiento}
                        onChange={(val) => setFechaVencimiento(val)}
                        required
                      />
                    </div>
                    {categoria === "Tarjeta de Credito" ? (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                          Fecha Cierre
                        </label>
                        <SmartDateTimePicker
                          value={fechaCierre}
                          onChange={(val) => setFechaCierre(val)}
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                          Método de Pago
                        </label>
                        <CustomSelect
                          value={metodoPago}
                          onChange={(value) => setMetodoPago(value)}
                          options={[
                            "Tarjeta de Debito",
                            "Transferencia Bancaria",
                            "Debito Automatico",
                          ].map((met) => ({ value: met, label: met }))}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {categoria === "Tarjeta de Credito" && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                          Método de Pago
                        </label>
                        <CustomSelect
                          value={metodoPago}
                          onChange={(value) => setMetodoPago(value)}
                          options={[
                            "Tarjeta de Debito",
                            "Transferencia Bancaria",
                            "Debito Automatico",
                          ].map((met) => ({ value: met, label: met }))}
                          className="w-full"
                        />
                      </div>
                    )}
                    <div
                      className={
                        categoria !== "Tarjeta de Credito" ? "col-span-1" : ""
                      }
                    >
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        ¿Con qué pagar?
                      </label>
                      <input
                        type="text"
                        value={conQuePagar}
                        onChange={(e) => setConQuePagar(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-slate-400 dark:focus:border-zinc-700"
                      />
                    </div>
                    <div
                      className={
                        categoria !== "Tarjeta de Credito"
                          ? "col-span-1"
                          : "col-span-2"
                      }
                    >
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        ¿Dónde pagar?
                      </label>
                      <input
                        type="text"
                        value={dondePagar}
                        onChange={(e) => setDondePagar(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-slate-400 dark:focus:border-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Factura Emitida
                      </label>
                      <label className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-full bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900/80">
                        <Upload className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                        <span className="truncate">Subir</span>
                        <input type="file" className="hidden" />
                      </label>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Comprobante
                      </label>
                      <label className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-full bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900/80">
                        <Upload className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                        <span className="truncate">Subir</span>
                        <input type="file" className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => { if (!isSaving) resetForm(); }}
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
                        editingPaymentId ? "Actualizar Pago" : "Guardar Pago"
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

      {/* CUSTOM CONFIRMATION DIALOG MODAL CON ANIMACIÓN & ESTADO ELIMINANDO */}
      <ConfirmationModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || "Confirmar Eliminación"}
        message={confirmModal?.message || "¿Estás seguro de que deseas eliminar este registro de pago?"}
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
