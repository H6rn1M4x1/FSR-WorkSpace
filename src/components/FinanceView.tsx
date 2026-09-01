import { SubNav } from "./SubNav";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { generateUniqueId } from "../utils/id";
import { getLocalDateString } from "../utils/date";
import { processAndCreateRecurringPayments } from "../utils/recurringPayments";
import { CurrencyInput } from "./CurrencyInput";
import { parseFormattedNumber, formatNumberToDisplay } from "../lib/numberFormat";
import React, { useState, useEffect } from "react";
import {
  subscribeToCategory,
  saveItemToFirestore,
  deleteItemFromFirestore,
} from "../lib/firestoreSyncService";
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import AnimatedList from "./AnimatedList";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  FileDown,
  CloudUpload,
  PieChart,
  Check,
  ChevronDown,
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  AlertTriangle,
  BarChart3,
  LineChart,
  Bitcoin,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Calculator,
  ExternalLink,
} from "lucide-react";
import {
  Invoice,
  PaymentRecord,
  DetailedPayment,
  MonthlyBudget,
  GastoVario,
  Inversion,
  CotizacionAccion,
  CotizacionCripto,
} from "../types";
import { SmartDateTimePicker } from "./SmartDateTimePicker";
import PaymentsTable from "./PaymentsTable";
import GastosVariosTable from "./GastosVariosTable";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Label,
} from "recharts";
import InversionesTable from "./InversionesTable";
import CotizacionesAccionesTable from "./CotizacionesAccionesTable";
import CotizacionesCriptoTable from "./CotizacionesCriptoTable";

export interface TasaData { id: string; name: string; currency: string; tna: string; logo: string; }

interface FinanceViewProps {
  darkMode: boolean;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  payments: PaymentRecord[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentRecord[]>>;
  detailedPayments: DetailedPayment[];
  setDetailedPayments: React.Dispatch<React.SetStateAction<DetailedPayment[]>>;
  gastosVarios: GastoVario[];
  setGastosVarios: React.Dispatch<React.SetStateAction<GastoVario[]>>;
  inversiones?: Inversion[];
  setInversiones?: React.Dispatch<React.SetStateAction<Inversion[]>>;
  cotizacionesAcciones?: CotizacionAccion[];
  cotizacionesCripto?: CotizacionCripto[];
  setCotizacionesCripto?: React.Dispatch<
    React.SetStateAction<CotizacionCripto[]>
  >;
  setCotizacionesAcciones?: React.Dispatch<
    React.SetStateAction<CotizacionAccion[]>
  >;
  budgets: MonthlyBudget[];
  setBudgets: React.Dispatch<React.SetStateAction<MonthlyBudget[]>>;
  onExportSheets: (title: string, headers: string[], rows: any[][]) => void;
  exportingSheets: boolean;
  onSendEmail: (to: string, subject: string, body: string) => void;
  sendingEmail: boolean;
  userEmail?: string;
  token?: string | null;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
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
export default function FinanceView({
  darkMode,
  invoices,
  setInvoices,
  payments,
  setPayments,
  detailedPayments,
  setDetailedPayments,
  gastosVarios,
  setGastosVarios,
  inversiones: propInversiones,
  setInversiones: propSetInversiones,
  cotizacionesAcciones: propCotizacionesAcciones,
  cotizacionesCripto: propCotizacionesCripto,
  setCotizacionesCripto: propSetCotizacionesCripto,
  setCotizacionesAcciones: propSetCotizacionesAcciones,
  budgets,
  setBudgets,
  onExportSheets,
  exportingSheets,
  onSendEmail,
  sendingEmail,
  userEmail,
  token,
  activeSubTab: propActiveSubTab,
  onSubTabChange,
}: FinanceViewProps) {
  const { showToast } = useToast();
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [tasasData, setTasasData] = useState<TasaData[]>([]);
  const [calcBanco, setCalcBanco] = useState("");
  const [calcMonto, setCalcMonto] = useState("");
  const [calcDias, setCalcDias] = useState("30");

  useEffect(() => {
    const fetchTasas = async () => {
      try {
        const CACHE_KEY = 'tasas_ar_data';
        const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_EXPIRATION) {
            setTasasData(data);
            return;
          }
        }

        const [arsRes, usdRes] = await Promise.all([
          fetch('https://space.tasas.ar/api/bancos-digitales?include_uri=1'),
          fetch('https://space.tasas.ar/api/bancos-digitales/dolares?include_uri=1')
        ]);

        const arsData = await arsRes.json();
        const usdData = await usdRes.json();

        const combined = [
          ...(arsData.data || []).map((item: any) => ({ ...item, currency: 'ARS' })),
          ...(usdData.data || []).map((item: any) => ({ ...item, currency: 'USD' }))
        ];

        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: combined,
          timestamp: Date.now()
        }));

        setTasasData(combined);
      } catch (error) {
        console.error('Error fetching tasas:', error);
      }
    };

    fetchTasas();
  }, []);

  const [inflacionData, setInflacionData] = useState<{
    fecha: string;
    valorMensual: number;
    valorInteranual?: number;
    periodoNombre: string;
    loading: boolean;
  }>({
    fecha: "",
    valorMensual: 0,
    valorInteranual: 0,
    periodoNombre: "",
    loading: true,
  });

  useEffect(() => {
    const fetchInflacion = async () => {
      try {
        const CACHE_KEY = "ipc_indec_data";
        const CACHE_EXPIRATION = 12 * 60 * 60 * 1000;

        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_EXPIRATION) {
            setInflacionData({ ...data, loading: false });
            return;
          }
        }

        const [resM, resI] = await Promise.all([
          fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion"),
          fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacionInteranual"),
        ]);

        if (resM.ok) {
          const dataM = await resM.json();
          const dataI = resI.ok ? await resI.json() : [];

          if (Array.isArray(dataM) && dataM.length > 0) {
            const lastM = dataM[dataM.length - 1];
            const lastI = Array.isArray(dataI) && dataI.length > 0 ? dataI[dataI.length - 1] : null;

            const dateParts = (lastM.fecha || "").split("-");
            let periodoNombre = lastM.fecha;
            if (dateParts.length === 3) {
              const year = dateParts[0];
              const monthIdx = parseInt(dateParts[1], 10) - 1;
              const meses = [
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
              ];
              if (monthIdx >= 0 && monthIdx < 12) {
                periodoNombre = `${meses[monthIdx]} ${year}`;
              }
            }

            const result = {
              fecha: lastM.fecha,
              valorMensual: lastM.valor,
              valorInteranual: lastI?.valor || 0,
              periodoNombre,
            };

            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                data: result,
                timestamp: Date.now(),
              })
            );

            setInflacionData({ ...result, loading: false });
            return;
          }
        }
      } catch (e) {
        console.error("Error fetching inflacion:", e);
      }

      setInflacionData({
        fecha: "2026-07-31",
        valorMensual: 2.1,
        valorInteranual: 33.8,
        periodoNombre: "Julio 2026",
        loading: false,
      });
    };

    fetchInflacion();
  }, []);

  // Local fallback state if not provided via props
  const [localInversiones, setLocalInversiones] = useState<Inversion[]>(
    propInversiones || [],
  );
  const inversiones = propInversiones || localInversiones;
  const setInversiones: React.Dispatch<React.SetStateAction<Inversion[]>> = (
    action,
  ) => {
    if (propSetInversiones) propSetInversiones(action);
    setLocalInversiones(action);
  };

  const [localCotizaciones, setLocalCotizaciones] = useState<
    CotizacionAccion[]
  >(propCotizacionesAcciones || []);
  const [localCotizacionesCripto, setLocalCotizacionesCripto] = useState<
    CotizacionCripto[]
  >(propCotizacionesCripto || []);
  const cotizacionesCripto = propCotizacionesCripto || localCotizacionesCripto;
  const setCotizacionesCripto: React.Dispatch<
    React.SetStateAction<CotizacionCripto[]>
  > = (action) => {
    if (propSetCotizacionesCripto) propSetCotizacionesCripto(action);
    setLocalCotizacionesCripto(action);
  };
  const cotizacionesAcciones = propCotizacionesAcciones || localCotizaciones;
  const setCotizacionesAcciones: React.Dispatch<
    React.SetStateAction<CotizacionAccion[]>
  > = (action) => {
    if (propSetCotizacionesAcciones) propSetCotizacionesAcciones(action);
    setLocalCotizaciones(action);
  };

  // Tabs and scrolling helpers for unified subtabs
  const cotizacionesScrollRef = React.useRef<HTMLDivElement>(null);
  const pagosScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollCotizacionesTabsLeft = () => {
    const tabs = ["acciones", "cripto"];
    const currentIndex = tabs.indexOf(cotizacionesSubTab);
    if (currentIndex > 0) {
      setCotizacionesSubTab(tabs[currentIndex - 1] as any);
      if (cotizacionesScrollRef.current) {
        const buttons =
          cotizacionesScrollRef.current.querySelectorAll("button");
        if (buttons[currentIndex - 1])
          buttons[currentIndex - 1].scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
      }
    }
  };
  const scrollCotizacionesTabsRight = () => {
    const tabs = ["acciones", "cripto"];
    const currentIndex = tabs.indexOf(cotizacionesSubTab);
    if (currentIndex < tabs.length - 1) {
      setCotizacionesSubTab(tabs[currentIndex + 1] as any);
      if (cotizacionesScrollRef.current) {
        const buttons =
          cotizacionesScrollRef.current.querySelectorAll("button");
        if (buttons[currentIndex + 1])
          buttons[currentIndex + 1].scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
      }
    }
  };

  const scrollPagosTabsLeft = () => {
    const tabs = ["todos_pagos", "gastos_varios"];
    const currentIndex = tabs.indexOf(pagosSubTab);
    if (currentIndex > 0) {
      setPagosSubTab(tabs[currentIndex - 1] as any);
      if (pagosScrollRef.current) {
        const buttons = pagosScrollRef.current.querySelectorAll("button");
        if (buttons[currentIndex - 1])
          buttons[currentIndex - 1].scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
      }
    }
  };
  const scrollPagosTabsRight = () => {
    const tabs = ["todos_pagos", "gastos_varios"];
    const currentIndex = tabs.indexOf(pagosSubTab);
    if (currentIndex < tabs.length - 1) {
      setPagosSubTab(tabs[currentIndex + 1] as any);
      if (pagosScrollRef.current) {
        const buttons = pagosScrollRef.current.querySelectorAll("button");
        if (buttons[currentIndex + 1])
          buttons[currentIndex + 1].scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
      }
    }
  };

  const [pagosSubTab, setPagosSubTab] = useState<
    "todos_pagos" | "gastos_varios"
  >("todos_pagos");
  const [cotizacionesSubTab, setCotizacionesSubTab] = useState<
    "acciones" | "cripto"
  >("acciones");

  React.useEffect(() => {
    if (cotizacionesScrollRef.current) {
      const tabs = ["acciones", "cripto"];
      const currentIndex = tabs.indexOf(cotizacionesSubTab);
      const buttons = cotizacionesScrollRef.current.querySelectorAll("button");
      if (buttons[currentIndex]) {
        buttons[currentIndex].scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [cotizacionesSubTab]);

  React.useEffect(() => {
    if (pagosScrollRef.current) {
      const tabs = ["todos_pagos", "gastos_varios"];
      const currentIndex = tabs.indexOf(pagosSubTab);
      const buttons = pagosScrollRef.current.querySelectorAll("button");
      if (buttons[currentIndex]) {
        buttons[currentIndex].scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [pagosSubTab]);

  const [localActiveTab, setLocalActiveTab] = useState<
    | "resumen"
    | "todos_pagos"
    | "gastos_varios"
    | "inversiones"
    | "cotizaciones"
    | "criptomonedas"
    | "pagos_mensuales"
  >("resumen");

  const rawActiveTab = (propActiveSubTab as any) || localActiveTab;

  // Backwards compatibility tab mapping
  let activeTab:
    | "resumen"
    | "todos_pagos"
    | "gastos_varios"
    | "inversiones"
    | "cotizaciones"
    | "criptomonedas"
    | "pagos_mensuales" = rawActiveTab;
  if (rawActiveTab === "todos_pagos" || rawActiveTab === "gastos_varios") {
    activeTab = "pagos_mensuales";
  } else if (rawActiveTab === "criptomonedas") {
    activeTab = "cotizaciones";
  }

  const setActiveTab = (
    tab:
      | "resumen"
      | "todos_pagos"
      | "gastos_varios"
      | "inversiones"
      | "cotizaciones"
      | "criptomonedas"
      | "pagos_mensuales",
  ) => {
    if (onSubTabChange) onSubTabChange(tab);
    setLocalActiveTab(tab);
  };

  // Synchronize sub-tab selection with prop state changes for backwards compatibility
  useEffect(() => {
    if (rawActiveTab === "todos_pagos") {
      setPagosSubTab("todos_pagos");
    } else if (rawActiveTab === "gastos_varios") {
      setPagosSubTab("gastos_varios");
    } else if (rawActiveTab === "criptomonedas") {
      setCotizacionesSubTab("cripto");
    } else if (rawActiveTab === "cotizaciones") {
      setCotizacionesSubTab("acciones");
    }
  }, [rawActiveTab]);

  // Sync props to local state for real-time reactivity
  useEffect(() => {
    if (propInversiones) setLocalInversiones(propInversiones);
  }, [propInversiones]);

  useEffect(() => {
    if (propCotizacionesAcciones)
      setLocalCotizaciones(propCotizacionesAcciones);
  }, [propCotizacionesAcciones]);

  useEffect(() => {
    if (propCotizacionesCripto)
      setLocalCotizacionesCripto(propCotizacionesCripto);
  }, [propCotizacionesCripto]);

  useEffect(() => {
    if (propActiveSubTab) setLocalActiveTab(propActiveSubTab as any);
  }, [propActiveSubTab]);

  // Real-time local subscription for FinanceView categories with strict unmount cleanup
  useEffect(() => {
    const userId = userEmail || "hernanmaximiliano10@gmail.com";
    const unsubs = [
      subscribeToCategory(userId, "invoices", (items) => setInvoices?.(items)),
      subscribeToCategory(userId, "payments", (items) => setPayments?.(items)),
      subscribeToCategory(userId, "detailed_payments", (items) =>
        setDetailedPayments?.(items),
      ),
      subscribeToCategory(userId, "gastos_varios", (items) =>
        setGastosVarios?.(items),
      ),
      subscribeToCategory(userId, "inversiones", (items) =>
        setInversiones?.(items),
      ),
      subscribeToCategory(userId, "cotizaciones_acciones", (items) =>
        setCotizacionesAcciones?.(items),
      ),
      subscribeToCategory(userId, "cotizaciones_cripto", (items) =>
        setCotizacionesCripto?.(items),
      ),
      subscribeToCategory(userId, "budgets", (items) => setBudgets?.(items)),
    ];

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch (_) {}
      });
    };
  }, [userEmail]);

  // Automatic recurring payments check (triggers 1 day before month end or later)
  useEffect(() => {
    if (detailedPayments && detailedPayments.length > 0) {
      const userId = userEmail || "hernanmaximiliano10@gmail.com";
      processAndCreateRecurringPayments(detailedPayments, userId).then(
        ({ newPaymentsCreated }) => {
          if (newPaymentsCreated.length > 0) {
            setDetailedPayments?.((prev) => {
              const newIds = new Set(newPaymentsCreated.map((np) => np.id));
              const filteredPrev = prev.filter((p) => !newIds.has(p.id));
              return [...newPaymentsCreated, ...filteredPrev];
            });
          }
        },
      );
    }
  }, [detailedPayments?.length, userEmail]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const [activeDetailItem, setActiveDetailItem] = useState<{
    type: "detailedPayment";
    data: DetailedPayment;
  } | null>(null);

  // Calendar State and Helpers
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    string | null
  >(null);

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

  const formatFechaDMY = (fechaStr: string): string => {
    if (!fechaStr) return "-";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaStr)) return fechaStr;
    const clean = fechaStr.split("T")[0].split(" ")[0];
    const parts = clean.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts;
      const pad = (s: string) => s.padStart(2, "0");
      return `${pad(d)}/${pad(m)}/${y}`;
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

  // Add Invoice / Expense Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useLockBodyScroll(Boolean(showAddForm || showEmailModal));
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newCategory, setNewCategory] = useState("Vivienda");
  const [isPaymentOnly, setIsPaymentOnly] = useState(false); // directly logs a payment without an invoice

  // Email state
  const [emailTo, setEmailTo] = useState(userEmail || "");

  // Handlers
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast("Por favor, ingresa un concepto o título", "error");
      return;
    }
    const amountNum = parseFormattedNumber(newAmount);
    if (amountNum <= 0) {
      showToast("Por favor, ingresa un monto válido mayor a 0", "error");
      return;
    }

    setIsSaving(true);
    console.log(
      "[FinanceView] Adding transaction. Is payment only:",
      isPaymentOnly,
    );

    try {
      const userId = userEmail || "hernanmaximiliano10@gmail.com";
      if (isPaymentOnly) {
        const nPay: PaymentRecord = {
          id: generateUniqueId("pay"),
          title: newTitle.trim(),
          amount: amountNum,
          date: new Date().toISOString().split("T")[0],
          category: newCategory,
        };
        console.log("[FinanceView] PaymentRecord constructed:", nPay);
        await saveItemToFirestore(userId, "payments", nPay);
        setPayments((prev) => [nPay, ...prev]);
        showToast("Pago registrado con éxito", "success");
      } else {
        const nInv: Invoice = {
          id: generateUniqueId("inv"),
          title: newTitle.trim(),
          amount: amountNum,
          dueDate: newDueDate || new Date().toISOString().split("T")[0],
          category: newCategory,
          paid: false,
        };
        console.log("[FinanceView] Invoice constructed:", nInv);
        await saveItemToFirestore(userId, "invoices", nInv);
        setInvoices((prev) => [nInv, ...prev]);
        showToast("Vencimiento registrado con éxito", "success");
      }

      setNewTitle("");
      setNewAmount("");
      setNewDueDate("");
      setShowAddForm(false);
    } catch (error: any) {
      console.error("[FinanceView] Error saving transaction:", error);
      showToast(error?.message || "Error al registrar la transacción", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayInvoice = async (id: string) => {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) return;

    setIsSaving(true);
    console.log("[FinanceView] Paying invoice:", id);

    try {
      const userId = userEmail || "hernanmaximiliano10@gmail.com";
      // Mark as paid
      const updatedInvoice = { ...invoice, paid: true };
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? updatedInvoice : inv)),
      );
      await saveItemToFirestore(userId, "invoices", updatedInvoice);

      // Add to payments table
      const nPay: PaymentRecord = {
        id: generateUniqueId("pay"),
        title: `Pago: ${invoice.title}`,
        amount: invoice.amount,
        date: new Date().toISOString().split("T")[0],
        category: invoice.category,
      };
      setPayments((prev) => [nPay, ...prev]);
      await saveItemToFirestore(userId, "payments", nPay);
      console.log(
        "[FinanceView] Invoice paid and payment recorded successfully.",
      );
      showToast("Pago realizado y registrado", "success");
    } catch (error) {
      console.error("[FinanceView] Error paying invoice:", error);
      showToast("Error al procesar el pago", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvoice = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro de factura/vencimiento? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        console.log("[FinanceView] Deleting invoice:", id);
        try {
          const userId = userEmail || "hernanmaximiliano10@gmail.com";
          await deleteItemFromFirestore(userId, "invoices", id);
          setInvoices((prev) => prev.filter((inv) => inv.id !== id));
          console.log("[FinanceView] Invoice deleted successfully.");
          showToast("Factura/Vencimiento eliminada con éxito", "success");
        } catch (error) {
          console.error("[FinanceView] Error deleting invoice:", error);
          showToast("Error al eliminar la factura/vencimiento", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const handleDeletePayment = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro de pago? Esta acción no se puede deshacer y afectará el presupuesto.",
      async () => {
        setIsDeleting(true);
        console.log("[FinanceView] Deleting payment:", id);
        try {
          const userId = userEmail || "hernanmaximiliano10@gmail.com";
          await deleteItemFromFirestore(userId, "payments", id);
          setPayments((prev) => prev.filter((pay) => pay.id !== id));
          console.log("[FinanceView] Payment deleted successfully.");
          showToast("Registro de pago eliminado con éxito", "success");
        } catch (error) {
          console.error("[FinanceView] Error deleting payment:", error);
          showToast("Error al eliminar el pago", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ["Título", "Monto", "Categoría", "Fecha de Pago"];
    const rows = payments.map((p) => [
      p.title,
      `$${p.amount}`,
      p.category,
      p.date,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Reporte_Finanzas_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sync to Google Sheets
  const handleSheetsExport = () => {
    const title = "Workspace Finanzas - " + new Date().toLocaleDateString();
    const headers = ["Concepto", "Monto", "Categoría", "Fecha de Transacción"];
    const rows = payments.map((p) => [p.title, p.amount, p.category, p.date]);
    onExportSheets(title, headers, rows);
  };

  // Compose Email Report
  const handleSendEmailReport = () => {
    if (!emailTo) return;
    const body = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
        <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 8px;">Liquid Workspace - Reporte de Finanzas</h2>
        <p>A continuación se detalla el resumen de gastos y pagos realizados en tu espacio de trabajo personal:</p>
        
        <h3>Resumen de Gastos Realizados</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f4f4f5;">
              <th style="padding: 10px; border: 1px solid #e4e4e7; text-align: left;">Concepto</th>
              <th style="padding: 10px; border: 1px solid #e4e4e7; text-align: right;">Monto</th>
              <th style="padding: 10px; border: 1px solid #e4e4e7; text-align: left;">Categoría</th>
              <th style="padding: 10px; border: 1px solid #e4e4e7; text-align: center;">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
            ${payments
              .map(
                (p) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #e4e4e7;">${p.title}</td>
                <td style="padding: 10px; border: 1px solid #e4e4e7; text-align: right; font-weight: bold;">$${p.amount}</td>
                <td style="padding: 10px; border: 1px solid #e4e4e7;">${p.category}</td>
                <td style="padding: 10px; border: 1px solid #e4e4e7; text-align: center; color: #71717a;">${p.date}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div style="margin-top: 25px; padding: 15px; background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px;">
          <h4 style="margin: 0; color: #065f46;">Total Gastado</h4>
          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #047857;">
            $${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
          </p>
        </div>

        <p style="font-size: 11px; color: #a1a1aa; text-align: center; margin-top: 30px; border-top: 1px solid #e4e4e7; padding-top: 15px;">
          Enviado automáticamente desde tu espacio de trabajo inteligente Liquid Workspace.
        </p>
      </div>
    `;

    onSendEmail(emailTo, "Reporte Mensual de Gastos - Liquid Workspace", body);
    setShowEmailModal(false);
  };

  // Helper to check if a date string corresponds to the current month/year relative to today
  const isCurrentMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const clean = dateStr.split("T")[0].split(" ")[0];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (clean.includes("-")) {
      const parts = clean.split("-");
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        return y === currentYear && m === currentMonth;
      }
    } else if (clean.includes("/")) {
      const parts = clean.split("/");
      if (parts.length === 3) {
        const y = parseInt(parts[2], 10);
        const m = parseInt(parts[1], 10) - 1;
        return y === currentYear && m === currentMonth;
      }
    }
    return false;
  };

  // Group payments by category and status from Todos los Pagos (detailedPayments) for current month
  const currentMonthDetailedPayments = detailedPayments.filter((p) =>
    isCurrentMonth(p.fechaVencimiento),
  );
  const totalSpent = currentMonthDetailedPayments.reduce(
    (sum, p) => sum + p.montoAPagar,
    0,
  );

  const formatCurrency = (val: number) => {
    return (
      "AR$ " +
      new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val)
    );
  };

  const formatARS = (num: number): string => {
    if (isNaN(num)) num = 0;
    const isNegative = num < 0;
    const absVal = Math.abs(num);
    const formatted = absVal.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? "-" : ""}$${formatted}`;
  };

  const formatUSD = (num: number): string => {
    if (isNaN(num)) num = 0;
    const isNegative = num < 0;
    const absVal = Math.abs(num);
    const formatted = absVal.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? "-" : ""}US$ ${formatted}`;
  };

  const categoriesList = [
    "Impuestos",
    "Prestamos",
    "Telefonia e Internet",
    "Servicios Digitales",
    "Obra Social",
    "Tarjeta de Credito",
    "Servicios Esenciales",
  ];

  const allDetailedCategories = Array.from(
    new Set([
      ...categoriesList,
      ...currentMonthDetailedPayments.map((p) => p.categoria),
    ]),
  ).filter(Boolean);

  const categoryDetailedTotals = allDetailedCategories.reduce(
    (acc, cat) => {
      acc[cat] = currentMonthDetailedPayments
        .filter((p) => p.categoria === cat)
        .reduce((sum, p) => sum + p.montoAPagar, 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  const activeCategories = allDetailedCategories.filter(
    (cat) => (categoryDetailedTotals[cat] || 0) > 0,
  );

  // Gastos Varios category calculations for ALL TIME (per user request)
  const currentMonthGastosVarios = gastosVarios; // Removido el filtro de mes actual a pedido del usuario

  const totalGastosVarios = currentMonthGastosVarios.reduce(
    (sum, g) => sum + g.monto,
    0,
  );

  const gastosVariosCategoriesList = Array.from(
    new Set(currentMonthGastosVarios.map((g) => g.categoria)),
  ).filter(Boolean);

  const gastosVariosCategoryTotals = gastosVariosCategoriesList.reduce(
    (acc, cat) => {
      acc[cat] = currentMonthGastosVarios
        .filter((g) => g.categoria === cat)
        .reduce((sum, g) => sum + g.monto, 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  const activeGastosVariosCategories = gastosVariosCategoriesList
    .filter((cat) => (gastosVariosCategoryTotals[cat] || 0) > 0)
    .sort(
      (a, b) =>
        (gastosVariosCategoryTotals[b] || 0) -
        (gastosVariosCategoryTotals[a] || 0),
    );

  const chartColors = [
    "#3B82F6", // blue
    "#10B981", // emerald
    "#EF4444", // red
    "#F59E0B", // amber
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#14B8A6", // rose
  ];

  const pendingDetailedPayments = detailedPayments.filter((p) => !p.pago);
  const paidDetailedPayments = detailedPayments.filter((p) => p.pago);

  const filteredPendingDetailedPayments = pendingDetailedPayments.filter(
    (p) => {
      return (
        !selectedCalendarDate || p.fechaVencimiento?.split("T")[0] === selectedCalendarDate
      );
    },
  );

  const filteredPaidDetailedPayments = paidDetailedPayments.filter((p) => {
    return !selectedCalendarDate || p.fechaVencimiento?.split("T")[0] === selectedCalendarDate;
  });

  const handlePayDetailedPayment = (id: string) => {
    setDetailedPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pago: true } : p)),
    );
  };

  const handleDeleteDetailedPayment = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro de factura/pago de forma permanente? Esta acción no se puede deshacer.",
      () => {
        setDetailedPayments((prev) => prev.filter((p) => p.id !== id));
      },
    );
  };

  // Recommended stocks with 6M bullish trend
  const RECOMMENDED_STOCKS_6M = [
    {
      ticker: "NVDA",
      nombre: "NVIDIA Corporation (CEDEAR)",
      panel: "CEDEARs",
      trend6M: "+48,5% alcista",
      priceARS: "$14.850,00",
      motivo:
        "Liderazgo mundial insustituible en semiconductores para Inteligencia Artificial y Data Centers. Fuerte demanda institucional con tendencia alcista sólida.",
    },
    {
      ticker: "YPFD",
      nombre: "YPF S.A.",
      panel: "Acciones Líderes",
      trend6M: "+38,2% alcista",
      priceARS: "$32.400,00",
      motivo:
        "Récord de extracción en Vaca Muerta y plan masivo de exportación de GNL impulsan un firme canal alcista en el mercado local y Wall Street.",
    },
    {
      ticker: "GGAL",
      nombre: "Grupo Financiero Galicia",
      panel: "Acciones Líderes",
      trend6M: "+42,0% alcista",
      priceARS: "$5.890,00",
      motivo:
        "Principal entidad financiera del país. Crecimiento de margen operativo tras la adquisición de HSBC Argentina y fuerte rally de ADRs.",
    },
  ];

  // Recommended cryptos with 6M bullish trend
  const RECOMMENDED_CRIPTOS_6M = [
    {
      id: "bitcoin",
      symbol: "BTC",
      nombre: "Bitcoin",
      trend6M: "+35,2% alcista",
      priceUSD: "US$ 64.500,00",
      motivo:
        "Consolidación institucional post-Halving e ingresos constantes a través de ETFs de spot. Considerada el refugio de valor supremo del ecosistema.",
    },
    {
      id: "ethereum",
      symbol: "ETH",
      nombre: "Ethereum",
      trend6M: "+28,4% alcista",
      priceUSD: "US$ 3.450,00",
      motivo:
        "Líder indiscutido en contratos inteligentes y DeFi. La reciente aprobación de ETFs de spot y la escalabilidad de Capa 2 fortalecen su tendencia alcista.",
    },
    {
      id: "solana",
      symbol: "SOL",
      nombre: "Solana",
      trend6M: "+62,8% alcista",
      priceUSD: "US$ 180,00",
      motivo:
        "Fuerte resurgimiento de volumen impulsado por transacciones de bajo costo, memecoins y adopción masiva de su ecosistema DeFi y NFT de alta velocidad.",
    },
  ];

  // Effective investments & quotes datasets
  const effectiveInversiones = React.useMemo(() => {
    return inversiones || [];
  }, [inversiones]);

  const effectiveCotizaciones = React.useMemo(() => {
    return cotizacionesAcciones || [];
  }, [cotizacionesAcciones]);

  const parseCurrencyVal = (val: string | number | undefined): number => {
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let s = val.toString().trim();
    s = s.replace(/[$US\s]/g, "");
    if (s.includes(".") && s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  };

  const parseUSDCurrency = (val: string | number | undefined): number => {
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let s = val.toString().trim();
    s = s.replace(/[^0-9.]/g, "");
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  };

  const investmentMetrics = React.useMemo(() => {
    const ccl = 1198;
    const openPositions = effectiveInversiones.filter((inv) => {
      const isOpen = !inv.estado || inv.estado.toLowerCase() === "abierto";
      const isCrypto = (cotizacionesCripto || []).some(
        (c) =>
          c.id.toLowerCase() === inv.ticker.trim().toLowerCase() ||
          (c.symbol &&
            c.symbol.toLowerCase() === inv.ticker.trim().toLowerCase()),
      );
      return isOpen && !isCrypto;
    });

    let totalInvertidoARS = 0;
    let totalActualARS = 0;
    let totalInvertidoUSD = 0;
    let totalActualUSD = 0;

    let bestOpenStock: {
      ticker: string;
      nombre: string;
      unitCostARS: number;
      currentPriceARS: number;
      percentGrowth: number;
      gainARS: number;
      gainUSD: number;
      cantidad: number;
    } | null = null;

    openPositions.forEach((inv) => {
      const qty = inv.cantidad || 1;
      const unitCostARS = parseCurrencyVal(inv.valorUnitarioPesos);
      const unitCostUSD = parseCurrencyVal(inv.valorUnitarioDolares);

      const quote = effectiveCotizaciones.find(
        (c) => c.simbolo.toUpperCase() === inv.ticker.trim().toUpperCase(),
      );

      let currentPriceARS = unitCostARS;
      let currentPriceUSD = unitCostUSD;

      if (quote) {
        currentPriceARS = parseCurrencyVal(quote.ultimoPrecio);
        currentPriceUSD =
          quote.moneda === "USD" ? currentPriceARS : currentPriceARS / ccl;
      }

      const investedARS =
        parseCurrencyVal(inv.valorTotalPesos) || unitCostARS * qty;
      const actualARS = currentPriceARS * qty;
      const investedUSD =
        parseCurrencyVal(inv.valorTotalDolares) || unitCostUSD * qty;
      const actualUSD = currentPriceUSD * qty;

      totalInvertidoARS += investedARS;
      totalActualARS += actualARS;
      totalInvertidoUSD += investedUSD;
      totalActualUSD += actualUSD;

      const gainARS = actualARS - investedARS;
      const gainUSD = actualUSD - investedUSD;
      const percentGrowth =
        unitCostARS > 0
          ? ((currentPriceARS - unitCostARS) / unitCostARS) * 100
          : 0;

      if (!bestOpenStock || percentGrowth > bestOpenStock.percentGrowth) {
        bestOpenStock = {
          ticker: inv.ticker,
          nombre: quote?.descripcion || inv.nombreAccion || inv.ticker,
          unitCostARS,
          currentPriceARS,
          percentGrowth,
          gainARS,
          gainUSD,
          cantidad: qty,
        };
      }
    });

    const netGainARS = totalActualARS - totalInvertidoARS;
    const netGainUSD = totalActualUSD - totalInvertidoUSD;

    return {
      openPositionsCount: openPositions.length,
      totalInvertidoARS,
      totalActualARS,
      netGainARS,
      netGainUSD,
      bestOpenStock,
    };
  }, [effectiveInversiones, effectiveCotizaciones, cotizacionesCripto]);

  const criptoMetrics = React.useMemo(() => {
    const ccl = 1198;
    const openCriptoPositions = effectiveInversiones.filter((inv) => {
      const isOpen = !inv.estado || inv.estado.toLowerCase() === "abierto";
      const isCrypto = (cotizacionesCripto || []).some(
        (c) =>
          c.id.toLowerCase() === inv.ticker.trim().toLowerCase() ||
          (c.symbol &&
            c.symbol.toLowerCase() === inv.ticker.trim().toLowerCase()),
      );
      return isOpen && isCrypto;
    });

    let totalInvertidoARS = 0;
    let totalActualARS = 0;
    let totalInvertidoUSD = 0;
    let totalActualUSD = 0;

    let bestOpenCripto: {
      ticker: string;
      nombre: string;
      unitCostARS: number;
      currentPriceARS: number;
      unitCostUSD: number;
      currentPriceUSD: number;
      percentGrowth: number;
      gainARS: number;
      gainUSD: number;
      cantidad: number;
    } | null = null;

    openCriptoPositions.forEach((inv) => {
      const qty = inv.cantidad || 1;
      const unitCostARS = parseCurrencyVal(inv.valorUnitarioPesos);
      const unitCostUSD = parseCurrencyVal(inv.valorUnitarioDolares);

      const cQuote = cotizacionesCripto?.find(
        (c) =>
          c.id.toLowerCase() === inv.ticker.trim().toLowerCase() ||
          (c.symbol &&
            c.symbol.toLowerCase() === inv.ticker.trim().toLowerCase()),
      );

      let currentPriceUSD = unitCostUSD;
      if (cQuote) {
        currentPriceUSD = parseUSDCurrency(cQuote.price);
      }

      const implicitExchangeRate =
        unitCostARS > 0 && unitCostUSD > 0 ? unitCostARS / unitCostUSD : ccl;
      let currentPriceARS = currentPriceUSD * implicitExchangeRate;

      const investedARS =
        parseCurrencyVal(inv.valorTotalPesos) || unitCostARS * qty;
      const actualARS = currentPriceARS * qty;
      const investedUSD =
        parseCurrencyVal(inv.valorTotalDolares) || unitCostUSD * qty;
      const actualUSD = currentPriceUSD * qty;

      totalInvertidoARS += investedARS;
      totalActualARS += actualARS;
      totalInvertidoUSD += investedUSD;
      totalActualUSD += actualUSD;

      const gainARS = actualARS - investedARS;
      const gainUSD = actualUSD - investedUSD;
      const percentGrowth =
        unitCostUSD > 0
          ? ((currentPriceUSD - unitCostUSD) / unitCostUSD) * 100
          : 0;

      if (!bestOpenCripto || percentGrowth > bestOpenCripto.percentGrowth) {
        bestOpenCripto = {
          ticker: inv.ticker,
          nombre: cQuote?.name || inv.nombreAccion || inv.ticker,
          unitCostARS,
          currentPriceARS,
          unitCostUSD,
          currentPriceUSD,
          percentGrowth,
          gainARS,
          gainUSD,
          cantidad: qty,
        };
      }
    });

    const netGainARS = totalActualARS - totalInvertidoARS;
    const netGainUSD = totalActualUSD - totalInvertidoUSD;

    return {
      openPositionsCount: openCriptoPositions.length,
      totalInvertidoARS,
      totalActualARS,
      netGainARS,
      netGainUSD,
      bestOpenCripto,
    };
  }, [effectiveInversiones, cotizacionesCripto]);

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6">
      {!propActiveSubTab && (
        <SubNav
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
          className="mb-6"
          tabs={[
            { id: "resumen", label: "Mis Finanzas", icon: TrendingUp },
            { id: "todos_pagos", label: "Gastos Mensuales", icon: Wallet },
            { id: "gastos_varios", label: "Gastos Varios", icon: CreditCard },
            { id: "inversiones", label: "Inversiones", icon: BarChart3 },
            {
              id: "cotizaciones",
              label: "Cotización de Acciones",
              icon: LineChart,
            },
            {
              id: "criptomonedas",
              label: "Cotización de Criptomonedas",
              icon: Bitcoin,
            },
          ]}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {activeTab === "resumen" ? (
            <div className="space-y-6">
              {/* Grid: Invoices deadlines & Payments Table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Compact Calendar Card (col-span-4) */}
                <div
                  className={`p-6 rounded-3xl border flex flex-col justify-between h-fit lg:col-span-4 app-calendar-container ${
                    darkMode
                      ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                      : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-extrabold text-sm flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary animate-pulse" />
                        <span>Calendario de Pagos</span>
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

                        const count = (detailedPayments || []).filter(
                          (p) => p.fechaVencimiento?.split("T")[0] === dateStr,
                        ).length;
                        const isSelected = selectedCalendarDate === dateStr;
                        const isToday = getLocalDateString() === dateStr;

                        return (
                          <button
                            key={`day-${day}`}
                            onClick={() => {
                              setSelectedCalendarDate(
                                selectedCalendarDate === dateStr
                                  ? null
                                  : dateStr,
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
                                title={`${count} pago(s)`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
</div>

                  {/* Calendar Footer Info */}
                  <div className="mt-5 pt-3.5 border-t border-zinc-800/10 dark:border-zinc-800/40 flex items-center justify-between text-[11px] text-zinc-500 font-medium w-full">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span>Días con vencimientos</span>
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

                {/* Middle Column: Invoices deadlines (col-span-4) */}
                <div
                  className={`p-6 rounded-3xl border flex flex-col justify-between h-fit lg:col-span-4 ${
                    darkMode
                      ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                      : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-md">
                          Facturas y Vencimientos
                        </h3>
                      </div>
                    </div>

                    {/* Selected Date Header Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2.5 px-4 bg-slate-100 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-2xl mb-4">
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
                          Ver Todas
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {filteredPendingDetailedPayments.length === 0 ? (
                        <p className="text-zinc-500 text-xs text-center py-10">
                          No hay facturas pendientes
                          {selectedCalendarDate ? " para este día" : ""}.
                        </p>
                      ) : (
                        <AnimatedList<DetailedPayment>
                          items={filteredPendingDetailedPayments}
                          showGradients={false}
                          enableArrowNavigation={true}
                          className="max-h-[350px]"
                          renderItem={(p) => {
                            const isExpanded = expandedPaymentId === p.id;
                            return (
                              <div
                                key={p.id}
                                onClick={() =>
                                  setExpandedPaymentId(isExpanded ? null : p.id)
                                }
                                className={`flex flex-col gap-2 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group relative overflow-hidden ${
                                  isExpanded
                                    ? "bg-white dark:bg-black border-primary/50 shadow-md ring-1 ring-primary/20"
                                    : "bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-900"
                                }`}
                                title="Haga clic para ver toda la información desplegada"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div
                                    className="text-xs font-extrabold text-black dark:text-zinc-100 truncate flex items-center gap-1.5"
                                    style={{
                                      color: darkMode ? "#f4f4f5" : "#000000",
                                    }}
                                  >
                                    <Receipt className="w-3.5 h-3.5 text-primary shrink-0 self-center" />
                                    <span className="self-center translate-y-[0.5px]">{p.descripcion}</span>
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-primary shrink-0 self-center transition-transform duration-200 ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] text-zinc-500 font-medium">
                                    {formatFechaDMY(p.fechaVencimiento)}
                                  </span>
                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                    Pendiente
                                  </span>
                                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary truncate max-w-[120px]">
                                    {p.categoria}
                                  </span>
                                </div>

                                <div
                                  className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-900/60"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-xs font-extrabold text-primary font-mono">
                                    {formatCurrency(p.montoAPagar)}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() =>
                                        handlePayDetailedPayment(p.id)
                                      }
                                      className="px-2.5 py-1 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-[10px] font-bold cursor-pointer transition-all"
                                    >
                                      Pagar
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteDetailedPayment(p.id)
                                      }
                                      className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
                                            Fechas (Vencimiento / Cierre)
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            Vence: {formatFechaDMY(p.fechaVencimiento)}
                                            {p.fechaCierre
                                              ? ` • Cierre: ${formatFechaDMY(p.fechaCierre)}`
                                              : ""}
                                          </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Método de Pago
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {p.metodoPago || "Debito Automatico"}
                                            {p.conQuePagar
                                              ? ` (${p.conQuePagar})`
                                              : ""}
                                          </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Dónde / Medio de Pago
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {p.dondePagar || "Homebanking / Entidad Bancaria"}
                                          </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Recurrencia y Estado
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {p.pagoRecurrente ? "Pago Recurrente" : "Pago Único"} • Pendiente
                                          </span>
                                        </div>
                                      </div>

                                      {p.observaciones && (
                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Observaciones
                                          </span>
                                          <p className="text-zinc-700 dark:text-zinc-300 italic">
                                            {p.observaciones}
                                          </p>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Payments history (col-span-4) */}
                <div
                  className={`p-6 rounded-3xl border flex flex-col justify-between h-fit lg:col-span-4 ${
                    darkMode
                      ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                      : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-md">
                          Historial de Pagos
                        </h3>
                      </div>
                    </div>

                    {/* Selected Date Header Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2.5 px-4 bg-slate-100 dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-2xl mb-4">
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
                          Ver Todas
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {filteredPaidDetailedPayments.length === 0 ? (
                        <p className="text-zinc-500 text-xs text-center py-10">
                          No hay pagos registrados
                          {selectedCalendarDate ? " para este día" : ""}.
                        </p>
                      ) : (
                        <AnimatedList<DetailedPayment>
                          items={filteredPaidDetailedPayments}
                          showGradients={false}
                          enableArrowNavigation={true}
                          className="max-h-[350px]"
                          renderItem={(p) => {
                            const isExpanded = expandedPaymentId === p.id;
                            return (
                              <div
                                key={p.id}
                                onClick={() =>
                                  setExpandedPaymentId(isExpanded ? null : p.id)
                                }
                                className={`flex flex-col gap-2 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group relative overflow-hidden ${
                                  isExpanded
                                    ? "bg-white dark:bg-black border-primary/50 shadow-md ring-1 ring-primary/20"
                                    : "bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-900"
                                }`}
                                title="Haga clic para ver toda la información desplegada"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div
                                    className="text-xs font-extrabold text-black dark:text-zinc-100 truncate flex items-center gap-1.5"
                                    style={{
                                      color: darkMode ? "#f4f4f5" : "#000000",
                                    }}
                                  >
                                    <Receipt className="w-3.5 h-3.5 text-primary shrink-0 self-center" />
                                    <span className="self-center translate-y-[0.5px]">{p.descripcion}</span>
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-primary shrink-0 self-center transition-transform duration-200 ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] text-zinc-500 font-medium">
                                    {formatFechaDMY(p.fechaVencimiento)}
                                  </span>
                                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                    Pagado
                                  </span>
                                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary truncate max-w-[120px]">
                                    {p.categoria}
                                  </span>
                                </div>

                                <div
                                  className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-900/60"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-xs font-extrabold text-primary font-mono">
                                    {formatCurrency(p.montoAPagar)}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleDeleteDetailedPayment(p.id)
                                    }
                                    className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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
                                            Fechas (Vencimiento / Cierre)
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            Vence: {formatFechaDMY(p.fechaVencimiento)}
                                            {p.fechaCierre
                                              ? ` • Cierre: ${formatFechaDMY(p.fechaCierre)}`
                                              : ""}
                                          </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Método de Pago
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {p.metodoPago || "Debito Automatico"}
                                            {p.conQuePagar
                                              ? ` (${p.conQuePagar})`
                                              : ""}
                                          </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Dónde / Medio de Pago
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {p.dondePagar || "Homebanking / Entidad Bancaria"}
                                          </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Recurrencia y Estado
                                          </span>
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {p.pagoRecurrente ? "Pago Recurrente" : "Pago Único"} • Pagado
                                          </span>
                                        </div>
                                      </div>

                                      {p.observaciones && (
                                        <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                          <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                            Observaciones
                                          </span>
                                          <p className="text-zinc-700 dark:text-zinc-300 italic">
                                            {p.observaciones}
                                          </p>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección de Tasas de Rendimiento (tasas.ar) */}
              <div
                className={`p-6 rounded-3xl border space-y-6 ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-zinc-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <h3
                        className="font-extrabold text-base dark:text-white flex items-center gap-2"
                        style={{ color: darkMode ? undefined : "#000000" }}
                      >
                        Rendimientos Bancos Digitales y FCI
                        <span className="px-2 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full font-bold whitespace-nowrap shrink-0">
                          tasas.ar
                        </span>
                      </h3>
                    </div>
                    <p
                      className="text-xs dark:text-zinc-400 mt-1 font-medium"
                      style={{ color: darkMode ? undefined : "#334155" }}
                    >
                      Tasas nominales anuales (TNA) de las principales billeteras y fondos actualizadas diariamente.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  {/* Columna Izquierda: Listado de Tasas ARS y USD en dos tarjetas independientes */}
                  <div className="lg:col-span-2 flex flex-col justify-between gap-4 h-full">
                    {/* Tarjeta 1: Rendimientos en Pesos (ARS) - flex-1 para extenderse a la par de Calculadora */}
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 280, damping: 28 }}
                      className="flex-1 p-3 sm:p-4 rounded-3xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-zinc-800/80 flex flex-col justify-between overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2.5">
                        <h4
                          className="text-xs sm:text-sm font-extrabold dark:text-zinc-200 flex items-center gap-2 min-w-0"
                          style={{ color: darkMode ? undefined : "#1e293b" }}
                        >
                          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shrink-0"></span>
                          <span className="truncate">Rendimientos en Pesos (ARS)</span>
                        </h4>
                        <span className="w-full sm:w-auto py-1 sm:py-0.5 px-2.5 text-[10px] bg-primary/10 text-primary rounded-xl sm:rounded-full font-extrabold text-center flex flex-row sm:flex-col items-center justify-center gap-1 sm:gap-0 sm:leading-tight shrink-0">
                          <span>{tasasData.filter((t) => t.currency === "ARS").length}</span>
                          <span>Opciones</span>
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-center">
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5">
                          {tasasData
                            .filter((t) => t.currency === "ARS")
                            .map((t) => (
                              <div
                                key={`${t.id}-${t.currency}`}
                                onClick={() => setCalcBanco(`${t.id}-${t.currency}`)}
                                className="p-1.5 rounded-xl bg-white dark:bg-black/80 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center text-center hover:border-primary/80 transition-all cursor-pointer group shadow-2xs hover:scale-102"
                              >
                                <img
                                  src={t.logo}
                                  alt={t.name}
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover bg-white p-[1px] border border-slate-200 dark:border-zinc-800 shadow-2xs mb-0.5 shrink-0"
                                />
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-700 dark:text-zinc-300 group-hover:text-primary transition-colors line-clamp-1 leading-tight w-full px-0.5">
                                  {t.name}
                                </p>
                                <p className="text-[10px] sm:text-[11px] font-black text-primary font-mono mt-0.5">
                                  {t.tna}%
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </motion.div>

                    {/* Tarjeta 2: Rendimientos en Dólares (USD) */}
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 280, damping: 28 }}
                      className="shrink-0 p-3 sm:p-4 rounded-3xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-zinc-800/80 flex flex-col justify-between overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2.5">
                        <h4
                          className="text-xs sm:text-sm font-extrabold dark:text-zinc-200 flex items-center gap-2 min-w-0"
                          style={{ color: darkMode ? undefined : "#1e293b" }}
                        >
                          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shrink-0"></span>
                          <span className="truncate">Rendimientos en Dólares (USD)</span>
                        </h4>
                        <span className="w-full sm:w-auto py-1 sm:py-0.5 px-2.5 text-[10px] bg-primary/10 text-primary rounded-xl sm:rounded-full font-extrabold text-center flex flex-row sm:flex-col items-center justify-center gap-1 sm:gap-0 sm:leading-tight shrink-0">
                          <span>{tasasData.filter((t) => t.currency === "USD").length}</span>
                          <span>Opciones</span>
                        </span>
                      </div>

                      <div>
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5">
                          {tasasData
                            .filter((t) => t.currency === "USD")
                            .map((t) => (
                              <div
                                key={`${t.id}-${t.currency}`}
                                onClick={() => setCalcBanco(`${t.id}-${t.currency}`)}
                                className="p-1.5 rounded-xl bg-white dark:bg-black/80 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center text-center hover:border-primary/80 transition-all cursor-pointer group shadow-2xs hover:scale-102"
                              >
                                <img
                                  src={t.logo}
                                  alt={t.name}
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover bg-white p-[1px] border border-slate-200 dark:border-zinc-800 shadow-2xs mb-0.5 shrink-0"
                                />
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-700 dark:text-zinc-300 group-hover:text-primary transition-colors line-clamp-1 leading-tight w-full px-0.5">
                                  {t.name}
                                </p>
                                <p className="text-[10px] sm:text-[11px] font-black text-primary font-mono mt-0.5">
                                  {t.tna}%
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Columna Derecha: Calculadora y Tarjeta de Inflación IPC */}
                  <div className="lg:col-span-1 flex flex-col justify-between gap-4 h-full">
                    {/* Calculadora */}
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 280, damping: 28 }}
                      className="p-4 rounded-3xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-zinc-800/80 flex flex-col relative z-20"
                    >
                      <h4 className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-2 mb-4">
                        <Calculator className="w-4 h-4 text-primary" />
                        Calculadora
                      </h4>

                      <div className="space-y-3 flex-1">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                            ¿En qué banco digital depositas tu plata?
                          </label>
                          <CustomSelect
                            value={calcBanco}
                            onChange={(val) => setCalcBanco(val)}
                            options={tasasData.map((t) => ({
                              value: `${t.id}-${t.currency}`,
                              label: `${t.name} (${t.currency}) - ${t.tna}%`,
                            }))}
                            placeholder="Elegí un banco digital"
                            searchable
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                            ¿Cuánta plata vas a depositar?
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">$</span>
                            <CurrencyInput
                              placeholder="Ej. 100.000,00"
                              value={calcMonto}
                              onChange={(val) => setCalcMonto(val)}
                              className="w-full pl-7 pr-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-xs md:text-sm text-slate-800 dark:text-zinc-200 outline-none focus:border-primary transition-colors"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                            ¿Querés calcular para días específicos? <span className="text-zinc-500 font-normal">(opcional)</span>
                          </label>
                          <input
                            type="number"
                            placeholder="Ej. 30"
                            value={calcDias}
                            onChange={(e) => setCalcDias(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-xs md:text-sm text-slate-800 dark:text-zinc-200 outline-none focus:border-primary transition-colors"
                          />
                        </div>

                        {/* Result Display with Smooth Spring Animation */}
                        <AnimatePresence mode="wait">
                          {(() => {
                            const monto = parseFormattedNumber(calcMonto);
                            const dias = parseFloat(calcDias || "30");
                            const bancoObj = tasasData.find(t => `${t.id}-${t.currency}` === calcBanco);
                            
                            if (!isNaN(monto) && !isNaN(dias) && bancoObj) {
                              const tna = parseFloat(bancoObj.tna);
                              const ganancia = (monto * (tna / 100) / 365) * dias;
                              const total = monto + ganancia;
                              const isUsd = bancoObj.currency === 'USD';

                              const gananciaFormatted = ganancia.toLocaleString('es-AR', { maximumFractionDigits: 2 });
                              const totalFormatted = total.toLocaleString('es-AR', { maximumFractionDigits: 2 });
                              const gananciaStr = `+${isUsd ? 'U$D ' : '$'}${gananciaFormatted}`;
                              const totalStr = `${isUsd ? 'U$D ' : '$'}${totalFormatted}`;

                              const getFontSize = (str: string, isTotal: boolean) => {
                                const len = str.length;
                                if (len > 18) return 'text-[10px] sm:text-[11px]';
                                if (len > 14) return 'text-[11px] sm:text-[12px]';
                                if (len > 11) return 'text-[13px] sm:text-[14px]';
                                return isTotal ? 'text-lg sm:text-xl' : 'text-base sm:text-lg';
                              };

                              return (
                                <motion.div
                                  key="result-card"
                                  initial={{ opacity: 0, height: 0, scale: 0.95, marginTop: 0 }}
                                  animate={{ opacity: 1, height: "auto", scale: 1, marginTop: 16 }}
                                  exit={{ opacity: 0, height: 0, scale: 0.95, marginTop: 0 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                                  className="p-4 rounded-2xl bg-primary/10 border border-primary/20 w-full overflow-hidden"
                                >
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary mb-2">
                                    Rendimiento Estimado ({dias} días)
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 items-start w-full">
                                    <div className="min-w-0 flex flex-col items-start overflow-hidden">
                                      <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 mb-0.5 shrink-0">
                                        Ganancia
                                      </p>
                                      <motion.p
                                        key={gananciaStr}
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`font-black text-primary font-mono leading-tight truncate w-full ${getFontSize(gananciaStr, false)}`}
                                        title={gananciaStr}
                                      >
                                        {gananciaStr}
                                      </motion.p>
                                    </div>
                                    <div className="min-w-0 flex flex-col items-end text-right overflow-hidden">
                                      <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 mb-0.5 shrink-0">
                                        Total
                                      </p>
                                      <motion.p
                                        key={totalStr}
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`font-black text-slate-800 dark:text-zinc-100 font-mono leading-tight truncate w-full ${getFontSize(totalStr, true)}`}
                                        title={totalStr}
                                      >
                                        {totalStr}
                                      </motion.p>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            }
                            return null;
                          })()}
                        </AnimatePresence>
                      </div>
                    </motion.div>

                    {/* Tarjeta de Inflación (IPC INDEC) - Ubicada justo debajo de Calculadora */}
                    <motion.div
                      layout
                      transition={{ type: "spring", stiffness: 280, damping: 28 }}
                      className="p-4 rounded-3xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-zinc-800/80 w-full"
                    >
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                          <span>Último Dato de Inflación</span>
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full font-extrabold whitespace-nowrap shrink-0">
                          INDEC
                        </span>
                      </div>

                      {inflacionData.loading ? (
                        <div className="flex items-center justify-center py-6 text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" />
                          <span className="text-xs font-medium">Cargando IPC...</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 rounded-2xl bg-white dark:bg-black/60 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                            <div>
                              <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-zinc-400">
                                IPC Mensual ({inflacionData.periodoNombre})
                              </p>
                              <p className="text-xl sm:text-2xl font-black text-primary font-mono mt-0.5">
                                +{inflacionData.valorMensual.toLocaleString('es-AR')}%
                              </p>
                            </div>
                            {inflacionData.valorInteranual ? (
                              <div className="text-left sm:text-right">
                                <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-zinc-400">
                                  Interanual
                                </p>
                                <p className="text-base font-black text-slate-800 dark:text-zinc-200 font-mono mt-0.5">
                                  {inflacionData.valorInteranual.toLocaleString('es-AR')}%
                                </p>
                              </div>
                            ) : null}
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                            Este dato se actualiza una vez al mes tras la publicación oficial del informe técnico del INDEC.
                          </p>

                          <a
                            href="https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20 text-center"
                          >
                            <span>Calendario de Informes IPC</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>

              </div>
              {/* Sección de Inversiones: Ganancias/Pérdidas, Acción Abierta con Mayor Crecimiento y Recomendaciones 6M */}
              <div
                className={`p-6 rounded-3xl border space-y-6 ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200/60 dark:border-zinc-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <h3
                        className="font-extrabold text-base dark:text-white"
                        style={{ color: darkMode ? undefined : "#000000" }}
                      >
                        Información y Análisis de Acciones
                      </h3>
                    </div>
                    <p
                      className="text-xs dark:text-zinc-400 mt-1 font-medium"
                      style={{ color: darkMode ? undefined : "#334155" }}
                    >
                      Monitoreo en tiempo real de tu cartera abierta,
                      ganancias/pérdidas y recomendaciones de mercado
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      setActiveTab("inversiones");
                      e.currentTarget.scrollIntoView({
                        behavior: "smooth",
                        inline: "center",
                        block: "nearest",
                      });
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-primary text-white dark:text-slate-950 font-bold text-xs hover:bg-primary-hover transition-all cursor-pointer shadow-xs"
                  >
                    <span>Ir a Tabla Completa</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Top Grid: 2 Main Status Cards (Ganancia/Pérdida & Acción con Mayor Crecimiento) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Card 1: Cuánto he ganado o perdido */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2">
                        <span
                          className="text-[11px] font-extrabold dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 min-w-0"
                          style={{ color: darkMode ? undefined : "#1e293b" }}
                        >
                          <Wallet className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">Resultado de Inversiones</span>
                        </span>
                        <span
                          className={`w-full sm:w-auto py-1 sm:py-0.5 px-2.5 rounded-xl sm:rounded-full text-[10px] font-extrabold text-center flex flex-row sm:flex-col items-center justify-center gap-1 sm:gap-0 sm:leading-tight shrink-0 ${
                            investmentMetrics.netGainARS >= 0
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20"
                          }`}
                        >
                          <span>{investmentMetrics.netGainARS >= 0 ? "Ganancia" : "Pérdida"}</span>
                          <span>Acumulada</span>
                        </span>
                      </div>

                      <div className="mt-1">
                        <h4
                          className={`text-2xl font-black font-mono ${
                            investmentMetrics.netGainARS >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatARS(investmentMetrics.netGainARS)}
                        </h4>
                        <p
                          className="text-xs font-bold font-mono dark:text-zinc-400 mt-0.5"
                          style={{ color: darkMode ? undefined : "#1e293b" }}
                        >
                          {formatUSD(investmentMetrics.netGainUSD)}
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] dark:text-zinc-400 font-medium"
                      style={{ color: darkMode ? undefined : "#334155" }}
                    >
                      <span>
                        Invertido:{" "}
                        <strong
                          className="dark:text-zinc-200"
                          style={{ color: darkMode ? undefined : "#0f172a" }}
                        >
                          {formatARS(investmentMetrics.totalInvertidoARS)}
                        </strong>
                      </span>
                      <span>
                        Posiciones Abiertas:{" "}
                        <strong className="text-primary">
                          {investmentMetrics.openPositionsCount}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Acción Abierta que Más Creció */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between md:col-span-1 lg:col-span-2">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2">
                        <span
                          className="text-[11px] font-extrabold dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 min-w-0"
                          style={{ color: darkMode ? undefined : "#1e293b" }}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">Mayor Crecimiento (Operaciones Abiertas)</span>
                        </span>
                        <span className="w-full sm:w-auto py-1 sm:py-0.5 px-2.5 rounded-xl sm:rounded-full text-[10px] font-extrabold text-center flex flex-row sm:flex-col items-center justify-center gap-1 sm:gap-0 sm:leading-tight shrink-0 bg-primary/15 text-primary border border-primary/20">
                          <span>Top</span>
                          <span>Operación</span>
                        </span>
                      </div>

                      {investmentMetrics.bestOpenStock ? (
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-xl bg-primary text-white dark:text-slate-950 font-black text-sm">
                                {investmentMetrics.bestOpenStock.ticker}
                              </span>
                              <span
                                className="font-bold text-sm dark:text-zinc-200 truncate max-w-[200px]"
                                style={{
                                  color: darkMode ? undefined : "#0f172a",
                                }}
                              >
                                {investmentMetrics.bestOpenStock.nombre}
                              </span>
                            </div>
                            <div
                              className="flex items-center gap-3 mt-2 text-xs dark:text-zinc-400 font-medium"
                              style={{
                                color: darkMode ? undefined : "#334155",
                              }}
                            >
                              <span>
                                Compra:{" "}
                                <strong
                                  className="dark:text-zinc-300"
                                  style={{
                                    color: darkMode ? undefined : "#0f172a",
                                  }}
                                >
                                  {formatARS(
                                    investmentMetrics.bestOpenStock.unitCostARS,
                                  )}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Actual:{" "}
                                <strong
                                  className="dark:text-zinc-300"
                                  style={{
                                    color: darkMode ? undefined : "#0f172a",
                                  }}
                                >
                                  {formatARS(
                                    investmentMetrics.bestOpenStock
                                      .currentPriceARS,
                                  )}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black text-lg">
                              <ArrowUpRight className="w-5 h-5" />
                              <span>
                                +
                                {investmentMetrics.bestOpenStock.percentGrowth.toFixed(
                                  2,
                                )}
                                %
                              </span>
                            </div>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              +
                              {formatARS(
                                investmentMetrics.bestOpenStock.gainARS,
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="text-xs dark:text-zinc-400 py-3 font-medium"
                          style={{ color: darkMode ? undefined : "#334155" }}
                        >
                          No hay operaciones abiertas registradas actualmente.
                        </p>
                      )}
                    </div>

                    <div
                      className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 text-[11px] dark:text-zinc-400 font-medium"
                      style={{ color: darkMode ? undefined : "#334155" }}
                    >
                      Calculado automáticamente comparando el precio unitario de
                      compra contra la cotización en vivo del mercado.
                    </div>
                  </div>
                </div>

                {/* Bottom Section: 3 Acciones Recomendadas para Invertir (Tendencia Alcista Ult. 6 Meses) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4
                      className="text-xs font-extrabold dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5"
                      style={{ color: darkMode ? undefined : "#0f172a" }}
                    >
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span>
                        3 Acciones Recomendadas para Invertir (Tendencia Alcista
                        en los Últimos 6 Meses)
                      </span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {RECOMMENDED_STOCKS_6M.map((rec) => {
                      const quoteMatch = effectiveCotizaciones.find(
                        (c) =>
                          c.simbolo.toUpperCase() === rec.ticker.toUpperCase(),
                      );
                      const displayPrice = quoteMatch?.ultimoPrecio
                        ? quoteMatch.ultimoPrecio.startsWith("$")
                          ? quoteMatch.ultimoPrecio
                          : `$${quoteMatch.ultimoPrecio}`
                        : rec.priceARS;

                      return (
                        <div
                          key={rec.ticker}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 hover:border-primary/40 dark:hover:border-primary/40 transition-all flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-black text-xs">
                                  {rec.ticker}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  {rec.trend6M}
                                </span>
                              </div>
                              <span
                                className="text-[10px] dark:text-zinc-400 font-bold"
                                style={{
                                  color: darkMode ? undefined : "#334155",
                                }}
                              >
                                {rec.panel}
                              </span>
                            </div>

                            <h5
                              className="font-extrabold text-sm dark:text-white mt-1"
                              style={{
                                color: darkMode ? undefined : "#0f172a",
                              }}
                            >
                              {rec.nombre}
                            </h5>

                            <p
                              className="text-[11px] dark:text-zinc-300 mt-2 leading-relaxed font-medium"
                              style={{
                                color: darkMode ? undefined : "#1e293b",
                              }}
                            >
                              {rec.motivo}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                            <div>
                              <span
                                className="block text-[9px] font-extrabold dark:text-zinc-400 uppercase"
                                style={{
                                  color: darkMode ? undefined : "#334155",
                                }}
                              >
                                Cotización Actual
                              </span>
                              <span
                                className="text-xs font-black font-mono dark:text-zinc-200"
                                style={{
                                  color: darkMode ? undefined : "#0f172a",
                                }}
                              >
                                {displayPrice}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveTab("cotizaciones");
                                e.currentTarget.scrollIntoView({
                                  behavior: "smooth",
                                  inline: "center",
                                  block: "nearest",
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white dark:hover:text-slate-950 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>Ver Cotización</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sección de Criptomonedas: Ganancias/Pérdidas, Criptomoneda Abierta con Mayor Crecimiento y Recomendaciones 6M */}
              <div
                className={`p-6 rounded-3xl border space-y-6 ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200/60 dark:border-zinc-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Bitcoin className="w-5 h-5" />
                      </div>
                      <h3
                        className="font-extrabold text-base dark:text-white"
                        style={{ color: darkMode ? undefined : "#000000" }}
                      >
                        Información y Análisis de Criptomonedas
                      </h3>
                    </div>
                    <p
                      className="text-xs dark:text-zinc-400 mt-1 font-medium"
                      style={{ color: darkMode ? undefined : "#334155" }}
                    >
                      Monitoreo en tiempo real de tu cartera de criptomonedas,
                      ganancias/pérdidas y recomendaciones de mercado
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      setActiveTab("criptomonedas");
                      e.currentTarget.scrollIntoView({
                        behavior: "smooth",
                        inline: "center",
                        block: "nearest",
                      });
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-primary text-white dark:text-slate-950 font-bold text-xs hover:bg-primary-hover transition-all cursor-pointer shadow-xs"
                  >
                    <span>Ir a Tabla Completa</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Top Grid: 2 Main Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Card 1: Cuánto he ganado o perdido en cripto */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2">
                        <span
                          className="text-[11px] font-extrabold dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 min-w-0"
                          style={{ color: darkMode ? undefined : "#1e293b" }}
                        >
                          <Bitcoin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">Resultado de Criptomonedas</span>
                        </span>
                        <span
                          className={`w-full sm:w-auto py-1 sm:py-0.5 px-2.5 rounded-xl sm:rounded-full text-[10px] font-extrabold text-center flex flex-row sm:flex-col items-center justify-center gap-1 sm:gap-0 sm:leading-tight shrink-0 ${
                            criptoMetrics.netGainARS >= 0
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20"
                          }`}
                        >
                          <span>{criptoMetrics.netGainARS >= 0 ? "Ganancia" : "Pérdida"}</span>
                          <span>Acumulada</span>
                        </span>
                      </div>

                      <div className="mt-1">
                        <h4
                          className={`text-2xl font-black font-mono ${
                            criptoMetrics.netGainARS >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatARS(criptoMetrics.netGainARS)}
                        </h4>
                        <p
                          className="text-xs font-bold font-mono dark:text-zinc-400 mt-0.5"
                          style={{ color: darkMode ? undefined : "#1e293b" }}
                        >
                          {formatUSD(criptoMetrics.netGainUSD)}
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] dark:text-zinc-400 font-medium"
                      style={{ color: darkMode ? undefined : "#334155" }}
                    >
                      <span>
                        Invertido:{" "}
                        <strong
                          className="dark:text-zinc-200"
                          style={{ color: darkMode ? undefined : "#0f172a" }}
                        >
                          {formatARS(criptoMetrics.totalInvertidoARS)}
                        </strong>
                      </span>
                      <span>
                        Posiciones Abiertas:{" "}
                        <strong className="text-primary">
                          {criptoMetrics.openPositionsCount}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Cripto Abierta que Más Creció */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between md:col-span-1 lg:col-span-2">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2">
                        <span
                          className="text-[11px] font-extrabold dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 min-w-0"
                          style={{ color: darkMode ? undefined : "#1e293b" }}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">Mayor Crecimiento (Cripto Abiertas)</span>
                        </span>
                        <span className="w-full sm:w-auto py-1 sm:py-0.5 px-2.5 rounded-xl sm:rounded-full text-[10px] font-extrabold text-center flex flex-row sm:flex-col items-center justify-center gap-1 sm:gap-0 sm:leading-tight shrink-0 bg-primary/15 text-primary border border-primary/20">
                          <span>Top</span>
                          <span>Cripto</span>
                        </span>
                      </div>

                      {criptoMetrics.bestOpenCripto ? (
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-xl bg-primary text-white dark:text-slate-950 font-black text-sm animate-pulse">
                                {criptoMetrics.bestOpenCripto.ticker.toUpperCase()}
                              </span>
                              <span
                                className="font-bold text-sm dark:text-zinc-200 truncate max-w-[200px]"
                                style={{
                                  color: darkMode ? undefined : "#0f172a",
                                }}
                              >
                                {criptoMetrics.bestOpenCripto.nombre}
                              </span>
                            </div>
                            <div
                              className="flex items-center gap-3 mt-2 text-xs dark:text-zinc-400 font-medium"
                              style={{
                                color: darkMode ? undefined : "#334155",
                              }}
                            >
                              <span>
                                Compra:{" "}
                                <strong
                                  className="dark:text-zinc-300"
                                  style={{
                                    color: darkMode ? undefined : "#0f172a",
                                  }}
                                >
                                  {formatUSD(
                                    criptoMetrics.bestOpenCripto.unitCostUSD,
                                  )}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Actual:{" "}
                                <strong
                                  className="dark:text-zinc-300"
                                  style={{
                                    color: darkMode ? undefined : "#0f172a",
                                  }}
                                >
                                  {formatUSD(
                                    criptoMetrics.bestOpenCripto
                                      .currentPriceUSD,
                                  )}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black text-lg">
                              <ArrowUpRight className="w-5 h-5" />
                              <span>
                                +
                                {criptoMetrics.bestOpenCripto.percentGrowth.toFixed(
                                  2,
                                )}
                                %
                              </span>
                            </div>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              +{formatARS(criptoMetrics.bestOpenCripto.gainARS)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="text-xs dark:text-zinc-400 py-3 font-medium"
                          style={{ color: darkMode ? undefined : "#334155" }}
                        >
                          No hay operaciones abiertas de criptomonedas
                          registradas actualmente.
                        </p>
                      )}
                    </div>

                    <div
                      className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 text-[11px] dark:text-zinc-400 font-medium"
                      style={{ color: darkMode ? undefined : "#334155" }}
                    >
                      Calculado automáticamente comparando el costo promedio de
                      compra contra la cotización en tiempo real.
                    </div>
                  </div>
                </div>

                {/* Bottom Section: 3 Criptos Recomendadas */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4
                      className="text-xs font-extrabold dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5"
                      style={{ color: darkMode ? undefined : "#0f172a" }}
                    >
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span>
                        3 Criptomonedas Recomendadas para Invertir (Tendencia
                        Alcista en los Últimos 6 Meses)
                      </span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {RECOMMENDED_CRIPTOS_6M.map((rec) => {
                      const quoteMatch = (cotizacionesCripto || []).find(
                        (c) =>
                          c.id.toLowerCase() === rec.id.toLowerCase() ||
                          (c.symbol &&
                            c.symbol.toLowerCase() ===
                              rec.symbol.toLowerCase()),
                      );
                      const displayPrice = quoteMatch?.price || rec.priceUSD;

                      return (
                        <div
                          key={rec.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 hover:border-primary/40 dark:hover:border-primary/40 transition-all flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-black text-xs">
                                  {rec.symbol}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  {rec.trend6M}
                                </span>
                              </div>
                              <span
                                className="text-[10px] dark:text-zinc-400 font-bold"
                                style={{
                                  color: darkMode ? undefined : "#334155",
                                }}
                              >
                                Criptomonedas
                              </span>
                            </div>

                            <h5
                              className="font-extrabold text-sm dark:text-white mt-1"
                              style={{
                                color: darkMode ? undefined : "#0f172a",
                              }}
                            >
                              {rec.nombre}
                            </h5>

                            <p
                              className="text-[11px] dark:text-zinc-300 mt-2 leading-relaxed font-medium"
                              style={{
                                color: darkMode ? undefined : "#1e293b",
                              }}
                            >
                              {rec.motivo}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                            <div>
                              <span
                                className="block text-[9px] font-extrabold dark:text-zinc-400 uppercase"
                                style={{
                                  color: darkMode ? undefined : "#334155",
                                }}
                              >
                                Cotización Actual
                              </span>
                              <span
                                className="text-xs font-black font-mono dark:text-zinc-200"
                                style={{
                                  color: darkMode ? undefined : "#0f172a",
                                }}
                              >
                                {displayPrice}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveTab("criptomonedas");
                                e.currentTarget.scrollIntoView({
                                  behavior: "smooth",
                                  inline: "center",
                                  block: "nearest",
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white dark:hover:text-slate-950 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>Ver Cotización</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Unificado: Bloque Principal de Finanzas */}
              <div
                className={`p-6 rounded-3xl border shadow-xl flex flex-col gap-6 w-full ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }`}
              >
                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Total Gastado */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-center text-zinc-900 dark:text-white shadow-xs">
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                      Total Gastado
                    </span>
                    <h3 className="text-2xl font-black mt-1 text-primary">
                      {formatCurrency(totalSpent)}
                    </h3>
                  </div>

                  {/* Pendientes de Pago */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-center text-zinc-900 dark:text-white shadow-xs">
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                      Pendientes de Pago
                    </span>
                    <h3 className="text-2xl font-black mt-1 text-red-500">
                      {currentMonthDetailedPayments.filter((p) => !p.pago).length}/{currentMonthDetailedPayments.length}
                    </h3>
                  </div>

                  {/* Controles de Exportación e Informes */}
                  <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-zinc-900 dark:text-white shadow-xs">
                    <div>
                      <h4 className="font-extrabold text-sm dark:text-white">
                        Controles de Exportación e Informes
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        Envía tus resúmenes financieros de forma segura
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                      <button
                        onClick={handleExportCSV}
                        className="p-3 rounded-xl bg-slate-200/40 hover:bg-slate-200 dark:bg-zinc-800/40 dark:hover:bg-zinc-800 border border-slate-200/50 dark:border-zinc-700/40 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                        title="Descargar en formato CSV"
                      >
                        <FileDown className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleSheetsExport}
                        disabled={exportingSheets}
                        className="p-3 rounded-xl bg-primary hover:bg-primary text-white dark:text-blue-950 transition-all cursor-pointer shadow-lg shadow-primary/10 disabled:opacity-50"
                        title="Sincronizar reporte con Google Sheets"
                      >
                        <CloudUpload
                          className={`w-5 h-5 ${exportingSheets ? "animate-spin" : ""}`}
                        />
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setShowEmailModal(true)}
                        disabled={sendingEmail}
                        className="p-3 rounded-xl bg-primary hover:bg-primary text-white dark:text-blue-950 transition-all cursor-pointer shadow-lg shadow-primary/20 disabled:opacity-50"
                        title="Enviar reporte por Correo Electrónico"
                      >
                        <Mail
                          className={`w-5 h-5 ${sendingEmail ? "animate-spin" : ""}`}
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Bottom Visualizations Row */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Ring Chart: Distribución de Gastos Varios */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between h-full text-zinc-900 dark:text-white shadow-xs">
                    <div className="flex items-center gap-2 mb-4">
                      <PieChart className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-md dark:text-white">
                        Distribución de Gastos Varios
                      </h3>
                    </div>
                    {(() => {
                      const pieDataGastosVarios = activeGastosVariosCategories
                        .map((cat) => ({
                          name: cat,
                          value: gastosVariosCategoryTotals[cat] || 0,
                        }))
                        .filter((item) => item.value > 0);

                      const totalPieEntriesGV = Math.max(
                        pieDataGastosVarios.length,
                        1,
                      );
                      const primaryPaletteGV = pieDataGastosVarios.map(
                        (_, index) => {
                          const opacityPercent = Math.max(
                            30,
                            Math.round(
                              100 -
                                (index * 65) /
                                  Math.max(totalPieEntriesGV - 1, 1),
                            ),
                          );
                          return `color-mix(in srgb, var(--color-primary) ${opacityPercent}%, ${darkMode ? "#27272a" : "#cbd5e1"})`;
                        },
                      );

                      return pieDataGastosVarios.length > 0 ? (
                        <div className="flex-1 flex flex-col">
                          <div className="h-60 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={pieDataGastosVarios}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={65}
                                  paddingAngle={4}
                                  cornerRadius={8}
                                  dataKey="value"
                                >
                                  <Label
                                    content={({ viewBox }) => {
                                      const { cx, cy } = viewBox as any;
                                      return (
                                        <text
                                          x={cx}
                                          y={cy}
                                          textAnchor="middle"
                                          dominantBaseline="central"
                                        >
                                          <tspan
                                            x={cx}
                                            dy="-0.5em"
                                            fontSize="7"
                                            fontWeight="bold"
                                            fill={
                                              darkMode ? "#a1a1aa" : "#64748b"
                                            }
                                            letterSpacing="0.05em"
                                          >
                                            TOTAL
                                          </tspan>
                                          <tspan
                                            x={cx}
                                            dy="1.2em"
                                            fontSize="9"
                                            fontWeight="800"
                                            fill="var(--color-primary)"
                                          >
                                            {formatCurrency(totalGastosVarios)}
                                          </tspan>
                                        </text>
                                      );
                                    }}
                                  />
                                  {pieDataGastosVarios.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={
                                        primaryPaletteGV[
                                          index % primaryPaletteGV.length
                                        ]
                                      }
                                      stroke={darkMode ? "#09090b" : "#f8fafc"}
                                      strokeWidth={
                                        pieDataGastosVarios.length === 1 ? 0 : 2
                                      }
                                    />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  contentStyle={{
                                    backgroundColor: darkMode
                                      ? "#18181b"
                                      : "#ffffff",
                                    border: "1px solid var(--color-primary)",
                                    borderRadius: "14px",
                                    boxShadow:
                                      "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                  }}
                                  itemStyle={{
                                    color: "var(--color-primary)",
                                  }}
                                  formatter={(value) =>
                                    formatCurrency(value as number)
                                  }
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mt-2 px-2 overflow-y-auto max-h-32">
                            {pieDataGastosVarios.map((entry, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-1.5"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      primaryPaletteGV[
                                        index % primaryPaletteGV.length
                                      ],
                                  }}
                                />
                                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                  {entry.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col">
                          <div className="h-60 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={[{ name: "Sin datos", value: 1 }]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={65}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  <Label
                                    content={({ viewBox }) => {
                                      const { cx, cy } = viewBox as any;
                                      return (
                                        <text
                                          x={cx}
                                          y={cy}
                                          textAnchor="middle"
                                          dominantBaseline="central"
                                        >
                                          <tspan
                                            x={cx}
                                            dy="-0.5em"
                                            fontSize="7"
                                            fontWeight="bold"
                                            fill={
                                              darkMode ? "#a1a1aa" : "#64748b"
                                            }
                                            letterSpacing="0.05em"
                                          >
                                            TOTAL
                                          </tspan>
                                          <tspan
                                            x={cx}
                                            dy="1.2em"
                                            fontSize="9"
                                            fontWeight="800"
                                            fill={
                                              darkMode ? "#a1a1aa" : "#64748b"
                                            }
                                          >
                                            $0,00
                                          </tspan>
                                        </text>
                                      );
                                    }}
                                  />
                                  <Cell
                                    fill={darkMode ? "#18181b" : "#e2e8f0"}
                                  />
                                </Pie>
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="text-center text-xs text-zinc-500 font-medium italic mt-2">
                            Sin datos
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* budgets progress */}
                  <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 flex flex-col h-full text-zinc-900 dark:text-white shadow-xs">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-md font-sans dark:text-white">
                          Categorías
                        </h3>
                      </div>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                      {allDetailedCategories.map((cat, idx) => {
                        const amt = categoryDetailedTotals[cat] || 0;
                        const percent =
                          totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-zinc-700 dark:text-zinc-200">
                                {cat}
                              </span>
                              <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                                {formatCurrency(amt)} ({percent.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-black/60 border border-slate-300/30 dark:border-zinc-800/50 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500 bg-primary"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Custom Visual SVG Donut/Pie Chart */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between h-full text-zinc-900 dark:text-white shadow-xs">
                    <div className="flex items-center gap-2 mb-4">
                      <PieChart className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-md dark:text-white">
                        Distribución por Categoria
                      </h3>
                    </div>
                    {(() => {
                      const pieDataCategorias = activeCategories
                        .map((cat) => ({
                          name: cat,
                          value: categoryDetailedTotals[cat] || 0,
                        }))
                        .filter((item) => item.value > 0);

                      const totalPieEntriesCat = Math.max(
                        pieDataCategorias.length,
                        1,
                      );
                      const primaryPaletteCat = pieDataCategorias.map(
                        (_, index) => {
                          const opacityPercent = Math.max(
                            30,
                            Math.round(
                              100 -
                                (index * 65) /
                                  Math.max(totalPieEntriesCat - 1, 1),
                            ),
                          );
                          return `color-mix(in srgb, var(--color-primary) ${opacityPercent}%, ${darkMode ? "#27272a" : "#cbd5e1"})`;
                        },
                      );

                      return pieDataCategorias.length > 0 ? (
                        <div className="flex-1 flex flex-col">
                          <div className="h-60 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={pieDataCategorias}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={65}
                                  paddingAngle={4}
                                  cornerRadius={8}
                                  dataKey="value"
                                >
                                  <Label
                                    content={({ viewBox }) => {
                                      const { cx, cy } = viewBox as any;
                                      return (
                                        <text
                                          x={cx}
                                          y={cy}
                                          textAnchor="middle"
                                          dominantBaseline="central"
                                        >
                                          <tspan
                                            x={cx}
                                            dy="-0.5em"
                                            fontSize="7"
                                            fontWeight="bold"
                                            fill={
                                              darkMode ? "#a1a1aa" : "#64748b"
                                            }
                                            letterSpacing="0.05em"
                                          >
                                            TOTAL
                                          </tspan>
                                          <tspan
                                            x={cx}
                                            dy="1.2em"
                                            fontSize="9"
                                            fontWeight="800"
                                            fill="var(--color-primary)"
                                          >
                                            {formatCurrency(totalSpent)}
                                          </tspan>
                                        </text>
                                      );
                                    }}
                                  />
                                  {pieDataCategorias.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={
                                        primaryPaletteCat[
                                          index % primaryPaletteCat.length
                                        ]
                                      }
                                      stroke={darkMode ? "#09090b" : "#f8fafc"}
                                      strokeWidth={
                                        pieDataCategorias.length === 1 ? 0 : 2
                                      }
                                    />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  contentStyle={{
                                    backgroundColor: darkMode
                                      ? "#18181b"
                                      : "#ffffff",
                                    border: "1px solid var(--color-primary)",
                                    borderRadius: "14px",
                                    boxShadow:
                                      "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                  }}
                                  itemStyle={{
                                    color: "var(--color-primary)",
                                  }}
                                  formatter={(value) =>
                                    formatCurrency(value as number)
                                  }
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mt-2 px-2 overflow-y-auto max-h-32">
                            {pieDataCategorias.map((entry, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-1.5"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      primaryPaletteCat[
                                        index % primaryPaletteCat.length
                                      ],
                                  }}
                                />
                                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                  {entry.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 font-medium italic min-h-[160px]">
                          Sin datos
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "pagos_mensuales" ? (
            <div className="space-y-6">
              {/* Selector de Pestañas de Pagos Mensuales */}
              <div className="flex items-center justify-center mb-8 w-full max-w-sm sm:max-w-md mx-auto">
                <div className="w-full">
                  <div
                    ref={pagosScrollRef}
                    className="flex items-center justify-center gap-1.5 p-1.5 bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-full w-full shadow-md whitespace-nowrap"
                  >
                    <button
                      onClick={() => setPagosSubTab("todos_pagos")}
                      className={`relative flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                        pagosSubTab === "todos_pagos"
                          ? "text-white font-black"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                      }`}
                    >
                      <Wallet className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap font-bold">
                        Gastos Mensuales
                      </span>
                      {pagosSubTab === "todos_pagos" && (
                        <motion.div
                          layoutId="activePagosTabIndicator"
                          className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                    <button
                      onClick={() => setPagosSubTab("gastos_varios")}
                      className={`relative flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                        pagosSubTab === "gastos_varios"
                          ? "text-white font-black"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap font-bold">
                        Gastos Varios
                      </span>
                      {pagosSubTab === "gastos_varios" && (
                        <motion.div
                          layoutId="activePagosTabIndicator"
                          className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {pagosSubTab === "todos_pagos" ? (
                  <motion.div
                    key="todos_pagos_view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    <PaymentsTable
                      payments={detailedPayments}
                      setPayments={setDetailedPayments}
                      darkMode={darkMode}
                      token={token}
                      userEmail={userEmail}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="gastos_varios_view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.15 }}
                  >
                    <GastosVariosTable
                      gastosVarios={gastosVarios}
                      setGastosVarios={setGastosVarios}
                      darkMode={darkMode}
                      token={token}
                      userEmail={userEmail}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : activeTab === "inversiones" ? (
            <InversionesTable
              inversiones={inversiones}
              setInversiones={setInversiones}
              cotizaciones={cotizacionesAcciones}
              cotizacionesCripto={cotizacionesCripto}
              darkMode={darkMode}
              onExportSheets={onExportSheets}
              userEmail={userEmail}
            />
          ) : activeTab === "cotizaciones" ? (
            <div className="space-y-6">
              {/* Selector de Pestañas de Cotizaciones */}
              <div className="flex items-center justify-center mb-8 w-full max-w-sm sm:max-w-md mx-auto">
                <div className="w-full">
                  <div
                    ref={cotizacionesScrollRef}
                    className="flex items-center justify-center gap-1.5 p-1.5 bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-full w-full shadow-md whitespace-nowrap"
                  >
                    <button
                      onClick={() => setCotizacionesSubTab("acciones")}
                      className={`relative flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                        cotizacionesSubTab === "acciones"
                          ? "text-white font-black"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                      }`}
                    >
                      <LineChart className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap font-bold">
                        Acciones y CEDEARs
                      </span>
                      {cotizacionesSubTab === "acciones" && (
                        <motion.div
                          layoutId="activeCotizacionesTabIndicator"
                          className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                    <button
                      onClick={() => setCotizacionesSubTab("cripto")}
                      className={`relative flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                        cotizacionesSubTab === "cripto"
                          ? "text-white font-black"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                      }`}
                    >
                      <Bitcoin className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap font-bold">
                        Criptomonedas
                      </span>
                      {cotizacionesSubTab === "cripto" && (
                        <motion.div
                          layoutId="activeCotizacionesTabIndicator"
                          className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {cotizacionesSubTab === "acciones" ? (
                  <motion.div
                    key="acciones_view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.15 }}
                  >
                    <CotizacionesAccionesTable
                      cotizaciones={cotizacionesAcciones}
                      setCotizaciones={setCotizacionesAcciones}
                      darkMode={darkMode}
                      onExportSheets={onExportSheets}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="cripto_view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.15 }}
                  >
                    <CotizacionesCriptoTable
                      cotizaciones={cotizacionesCripto}
                      setCotizaciones={setCotizacionesCripto}
                      darkMode={darkMode}
                      onExportSheets={onExportSheets}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* Transaction Loading modal */}
      {showAddForm &&
        createPortal(
          <div
            onClick={() => {
              if (!isSaving) setShowAddForm(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 cursor-default ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-white"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <h3 className="font-extrabold text-lg">
                {isPaymentOnly
                  ? "Registrar Gasto Directo"
                  : "Cargar Factura Pendiente"}
              </h3>
              <form onSubmit={handleAddTransaction} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                    Concepto / Título
                  </label>
                  <input
                    type="text"
                    disabled={isSaving}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Internet / Supermercado"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm disabled:opacity-50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                      Monto ($)
                    </label>
                    <CurrencyInput
                      disabled={isSaving}
                      value={newAmount}
                      onChange={(val) => setNewAmount(val)}
                      placeholder="Ej: 45.500,00"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm disabled:opacity-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                      Categoría
                    </label>
                    <CustomSelect
                      value={newCategory}
                      onChange={(value) => setNewCategory(value)}
                      options={[
                        { value: "Alimentación", label: "Alimentación" },
                        { value: "Vivienda", label: "Vivienda" },
                        { value: "Servicios", label: "Servicios" },
                        { value: "Suscripciones", label: "Suscripciones" },
                        { value: "Bienestar", label: "Bienestar / Deportes" },
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>

                {!isPaymentOnly && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans">
                      Fecha de Vencimiento
                    </label>
                    <SmartDateTimePicker
                      value={newDueDate}
                      onChange={(val) => setNewDueDate(val)}
                      required
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (!isSaving) setShowAddForm(false);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold disabled:opacity-50 flex items-center gap-2"
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
            </div>
          </div>,
          document.body,
        )}

      {/* Send Email Modal overlay */}
      {showEmailModal &&
        createPortal(
          <div
            onClick={() => setShowEmailModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 cursor-default ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-white"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <h3 className="font-extrabold text-lg">
                Enviar Reporte Financiero
              </h3>
              <p className="text-xs text-zinc-500">
                Comunica tu reporte de gastos de forma automática por Gmail.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                    Destinatario
                  </label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendEmailReport}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* DETAILED MODAL POPUP (Mini Menu Desplegado) */}
      {activeDetailItem &&
        activeDetailItem.type === "detailedPayment" &&
        createPortal(
          (() => {
            const item = activeDetailItem.data;
            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in cursor-pointer"
                onClick={() => setActiveDetailItem(null)}
              >
                <div
                  className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl relative transition-all cursor-default ${
                    darkMode
                      ? item.pago
                        ? "bg-zinc-950 border-zinc-800 text-white shadow-primary/5"
                        : "bg-zinc-950 border-zinc-800 text-white shadow-primary/20"
                      : "bg-white border-zinc-200 text-zinc-800 shadow-slate-200"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button */}
                  <button
                    onClick={() => setActiveDetailItem(null)}
                    className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-zinc-500/10 text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="space-y-4">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 ${
                        item.pago
                          ? "bg-primary/10 text-primary"
                          : "bg-primary/10 text-primary"
                      } rounded-xl text-xs font-bold w-fit`}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>
                        {item.pago
                          ? "Historial de Pagos"
                          : "Facturas y Vencimientos"}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 pr-8">
                      {item.descripcion}
                    </h3>

                    <div
                      className={`text-xs text-zinc-400 font-bold bg-slate-50 dark:bg-black/60 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/40`}
                    >
                      <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                        Monto del Compromiso
                      </p>
                      <p
                        className={`text-2xl font-black ${
                          item.pago ? "text-primary" : "text-primary"
                        } mt-1 font-mono`}
                      >
                        {formatCurrency(item.montoAPagar)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400 font-bold">
                      <div className="bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Fecha de Vencimiento
                        </p>
                        <p className="text-slate-800 dark:text-zinc-200 font-extrabold mt-0.5">
                          {formatFechaDMY(item.fechaVencimiento)}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Estado
                        </p>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                            item.pago
                              ? "bg-primary/10 text-primary dark:text-primary"
                              : "bg-primary/10 text-primary dark:text-primary"
                          }`}
                        >
                          {item.pago ? "Pagado" : "Pendiente de Pago"}
                        </span>
                      </div>
                    </div>

                    {item.metodoPago && (
                      <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400 font-bold">
                        <div className="bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                          <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                            Método de Pago
                          </p>
                          <p className="text-slate-800 dark:text-zinc-200 font-extrabold mt-0.5">
                            {item.metodoPago}
                          </p>
                        </div>
                        {(item.conQuePagar || item.dondePagar) && (
                          <div className="bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                            <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                              ¿Con qué pagar / Dónde?
                            </p>
                            <p
                              className="text-slate-800 dark:text-zinc-200 font-bold mt-0.5 truncate"
                              title={`${item.conQuePagar || ""} / ${item.dondePagar || ""}`}
                            >
                              {item.conQuePagar || item.dondePagar}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 space-y-1.5 text-xs text-slate-600 dark:text-zinc-400 font-medium">
                      <p className="font-extrabold text-slate-800 dark:text-zinc-200 uppercase text-[9px] tracking-widest">
                        Categoría Asociada:
                      </p>
                      <p
                        className={`font-bold ${item.pago ? "text-primary" : "text-primary"} text-sm`}
                      >
                        {item.categoria}
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      {!item.pago && (
                        <button
                          onClick={() => {
                            handlePayDetailedPayment(item.id);
                            setActiveDetailItem(null);
                          }}
                          className="px-4 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-md"
                        >
                          Marcar como Pagado
                        </button>
                      )}
                      <button
                        onClick={() => setActiveDetailItem(null)}
                        className={`px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-bold cursor-pointer transition-colors ${
                          item.pago ? "text-primary" : "text-primary"
                        }`}
                      >
                        Cerrar
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
