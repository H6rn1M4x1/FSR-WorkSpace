import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { saveItemToFirestore, deleteItemFromFirestore } from "../lib/firestoreSyncService";
import { generateUniqueId } from "../utils/id";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { useToast } from "../context/ToastContext";
import { Inversion, CotizacionAccion } from "../types";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  Filter,
  AlertTriangle,
  Download,
  DollarSign,
  BarChart3,
  Building2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Tag,
  Calendar,
  Settings,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  Calculator,
  Percent,
  Lock,
  Bitcoin,
  Loader2,
} from "lucide-react";

interface InversionesTableProps {
  inversiones: Inversion[];
  setInversiones: React.Dispatch<React.SetStateAction<Inversion[]>>;
  cotizaciones?: CotizacionAccion[];
  cotizacionesCripto?: import("../types").CotizacionCripto[];
  darkMode: boolean;
  onExportSheets?: (title: string, headers: string[], rows: any[][]) => void;
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
        }}
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
            className={`truncate ${
              selectedOption
                ? "font-bold text-black dark:text-white"
                : "text-slate-400 dark:text-zinc-500 font-normal"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${
            size === "sm" ? "w-3.5 h-3.5 ml-1.5" : "w-4 h-4 ml-2"
          }`}
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden p-1 scrollbar-none animate-fade-in left-0">
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
                      : "text-black dark:text-zinc-300 hover:bg-slate-50/80 dark:hover:bg-zinc-950/50"
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// Parsing and formatting helper utilities
function parseCurrency(val: string | number | undefined): number {
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
}

function parseUSDCurrency(val: string | number | undefined): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let s = val.toString().trim();
  s = s.replace(/[^0-9.]/g, "");
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

function formatARS(num: number): string {
  if (isNaN(num)) num = 0;
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const formatted = absVal.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? "-" : ""}$${formatted}`;
}

function formatUSD(num: number): string {
  if (isNaN(num)) num = 0;
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const formatted = absVal.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? "-" : ""}US$ ${formatted}`;
}

// CEDEAR Ratios dictionary and lookup helper according to IOL market quotes
const CEDEAR_RATIOS: Record<string, number> = {
  SPY: 20,
  QQQ: 20,
  DIA: 20,
  IWM: 10,
  EEM: 5,
  AAPL: 10,
  NVDA: 10,
  MSFT: 30,
  AMZN: 120,
  GOOGL: 58,
  GOOG: 58,
  META: 24,
  TSLA: 15,
  KO: 5,
  PEP: 6,
  MELI: 120,
  WMT: 18,
  DIS: 12,
  PFE: 5,
  JNJ: 15,
  V: 18,
  MA: 33,
  JPM: 15,
  BABA: 9,
  AMD: 10,
  NFLX: 48,
  XOM: 15,
  CVX: 16,
  GLOB: 18,
  DESP: 1,
  BA: 6,
  BBD: 1,
  C: 3,
  GE: 5,
  IBM: 5,
  INTC: 5,
  PYPL: 10,
  GOLD: 2,
  ABEV: 1,
  VALE: 2,
  ITUB: 1,
  BMY: 3,
  CAT: 20,
  CSCO: 5,
  EBAY: 2,
  MCD: 24,
  MMM: 10,
  NKE: 12,
  ORCL: 9,
  PG: 5,
  QCOM: 11,
  SBUX: 12,
  T: 3,
  UNH: 33,
  VZ: 2,
  WFC: 5,
  BAC: 4,
  GS: 13,
  MS: 4,
  HD: 8,
  COST: 12,
  CRM: 6,
  ADBE: 11,
  AVGO: 10,
  TXN: 5,
  COIN: 14,
  MSTR: 10,
  UBER: 4,
  ABNB: 6,
  BKR: 2,
  LMT: 20,
  RTX: 5,
  SLB: 3,
  HAL: 2,
  BP: 5,
  SHEL: 2,
  RIO: 4,
  BHP: 2,
  FCX: 3,
  NEM: 3,
  DE: 18,
  FDX: 10,
  UPS: 10,
  SPOT: 14,
  SONY: 8,
  SNE: 8,
  NTES: 5,
  JD: 4,
  BIDU: 11,
  TSM: 9,
  ASML: 15,
  AZN: 3,
  NVO: 16,
  SNY: 2,
  GSK: 4,
  PBR: 1,
  PBRA: 1,
  ARCO: 2,
  CAAP: 1,
  BIOX: 1,
};

function getRatioForTicker(ticker: string, cotizaciones: CotizacionAccion[]): number {
  if (!ticker) return 1;
  const clean = ticker.trim().toUpperCase();
  if (CEDEAR_RATIOS[clean] !== undefined) {
    return CEDEAR_RATIOS[clean];
  }
  const found = cotizaciones.find((c) => c.simbolo.toUpperCase() === clean);
  if (found && found.panel !== "CEDEARs") {
    return 1;
  }
  return 1;
}

export default function InversionesTable({
  inversiones,
  setInversiones,
  cotizaciones = [],
  cotizacionesCripto = [],
  darkMode,
  onExportSheets,
  userEmail,
}: InversionesTableProps) {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTable, setActiveTable] = useState<"Tradicional" | "Cripto">("Tradicional");
  const [selectedBroker, setSelectedBroker] = useState("TODOS");
  const [selectedOperacion, setSelectedOperacion] = useState("TODAS");
  const [selectedEstado, setSelectedEstado] = useState("TODOS");
  const [selectedResultado, setSelectedResultado] = useState("TODOS");

  // Scroll references and helpers for tab selection
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollTabsLeft = () => {
    const tabs = ["Tradicional","Cripto"];
    const currentIndex = tabs.indexOf(activeTable);
    if (currentIndex > 0) {
      setActiveTable(tabs[currentIndex - 1] as any);
      if (scrollContainerRef.current) {
        const buttons = scrollContainerRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const scrollTabsRight = () => {
    const tabs = ["Tradicional","Cripto"];
    const currentIndex = tabs.indexOf(activeTable);
    if (currentIndex < tabs.length - 1) {
      setActiveTable(tabs[currentIndex + 1] as any);
      if (scrollContainerRef.current) {
        const buttons = scrollContainerRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const tabs = ["Tradicional", "Cripto"];
      const currentIndex = tabs.indexOf(activeTable);
      const buttons = scrollContainerRef.current.querySelectorAll('button');
      if (buttons[currentIndex]) {
        buttons[currentIndex].scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [activeTable]);
  // Combine props cotizaciones
  const allCotizaciones = useMemo(() => {
    return cotizaciones || [];
  }, [cotizaciones]);

  // Recents state for ticker selector
  const [recentTickers, setRecentTickers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("iol_recent_tickers");
      if (saved) return JSON.parse(saved);
    } catch {}
    return ["AAPL", "GGAL", "SPY", "AL30", "NVDA", "YPFD", "PAMP", "BMA"];
  });

  const saveRecentTicker = (ticker: string) => {
    if (!ticker) return;
    const clean = ticker.trim().toUpperCase();
    setRecentTickers((prev) => {
      const filtered = prev.filter((t) => t !== clean);
      const updated = [clean, ...filtered].slice(0, 10);
      try {
        localStorage.setItem("iol_recent_tickers", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTickerPicker, setShowTickerPicker] = useState(false);
  const [editingItem, setEditingItem] = useState<Inversion | null>(null);

  useLockBodyScroll(
    Boolean(showAddModal || showTickerPicker || editingItem)
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Real-time Dólar CCL state from Market Quotes (IOL / dolarapi)
  const [marketDolarCCL, setMarketDolarCCL] = useState<string>("1.198,00");
  const [marketDolarCripto, setMarketDolarCripto] = useState<string>("1.200,00");
  const [formTipoMercado, setFormTipoMercado] = useState<"Tradicional" | "Cripto">("Tradicional");
  const [formDolarCripto, setFormDolarCripto] = useState("1.200,00");
  const [basePriceCripto, setBasePriceCripto] = useState("");

  // Form State
  const [formLugar, setFormLugar] = useState("Invertir Online");
  const [formOperacion, setFormOperacion] = useState("Compra");
  const [formTicker, setFormTicker] = useState("");
  const [formFecha, setFormFecha] = useState("");
  const [formCantidad, setFormCantidad] = useState<number>(1);
  const [formDolarCCL, setFormDolarCCL] = useState("1.198,00");
  const [formSplit, setFormSplit] = useState<number>(1);

  const [formValorUnitarioPesos, setFormValorUnitarioPesos] = useState("$0,00");
  const [formValorTotalPesos, setFormValorTotalPesos] = useState("$0,00");
  const [formValorUnitarioDolares, setFormValorUnitarioDolares] = useState("US$ 0,00");
  const [formValorTotalDolares, setFormValorTotalDolares] = useState("US$ 0,00");
  const [formGananciasPesos, setFormGananciasPesos] = useState("$0,00");
  const [formGananciasDolares, setFormGananciasDolares] = useState("US$ 0,00");
  const [formResultado, setFormResultado] = useState("Ganancia");
  const [formEstado, setFormEstado] = useState("Abierto");

  // Ticker Selector Search & Category Filter State
  const [tickerSearch, setTickerSearch] = useState("");
  const [tickerCategoryFilter, setTickerCategoryFilter] = useState("TODOS");
  const [pickerVisibleCount, setPickerVisibleCount] = useState(40);

  // Reset pagination when search or category filter changes
  useEffect(() => {
    setPickerVisibleCount(40);
  }, [tickerSearch, tickerCategoryFilter]);

  const openTickerPickerModal = () => {
    setTickerSearch("");
    setTickerCategoryFilter("TODOS");
    setPickerVisibleCount(40);
    setShowTickerPicker(true);
  };

  // Auto-refresh interval (30 minutes) to update quote calculations
  const [lastRefreshedTs, setLastRefreshedTs] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefreshedTs(Date.now());
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Recalculate Form values automatically when inputs change
  useEffect(() => {
    const qty = formCantidad > 0 ? formCantidad : 0;
    
    if (formTipoMercado === "Cripto") {
       let unitUSD = parseCurrency(basePriceCripto);
       if (unitUSD === 0 && basePriceCripto.trim() === "") unitUSD = 0;
       
       const cripto = parseCurrency(formDolarCripto) || 1200;
       
       // Binance Commission: 0.1%
       const ratePercent = 0.001;
       const rawTotalUSD = unitUSD * qty;
       const comisionUSD = rawTotalUSD * ratePercent;
       const totalConComisionUSD = rawTotalUSD + comisionUSD;
       
       // Valor Total (USD): Cantidad*Precio de Compra/Venta (US$) + Comision
       const totalUSD = totalConComisionUSD;

       setFormValorTotalDolares(formatUSD(totalUSD));
       setFormValorUnitarioDolares(formatUSD(unitUSD)); // Underlying unit for save
       
       const unitARS = unitUSD * cripto;
       const totalConComisionARS = totalConComisionUSD * cripto;
       
       // Valor Total (ARS): (Cantidad*Precio de Compra/Venta (US$) + Comision)*Cotización Dólar Crypto
       const totalARS = totalConComisionARS;
       
       setFormValorUnitarioPesos(formatARS(unitARS));
       setFormValorTotalPesos(formatARS(totalARS));
       
       // G/P calculation
       if (formTicker.trim()) {
           const cQuote = cotizacionesCripto?.find(c => c.id === formTicker);
           if (cQuote && cQuote.price) {
               const currentPriceUSD = parseUSDCurrency(cQuote.price);
               const currentPriceARS = currentPriceUSD * cripto;

               const gpUnitUSD = currentPriceUSD - unitUSD;
               const gpTotalUSD = gpUnitUSD * qty;
               const gpTotalARS = gpTotalUSD * cripto;

               setFormGananciasDolares(formatUSD(gpTotalUSD));
               setFormGananciasPesos(formatARS(gpTotalARS));
           } else {
               setFormGananciasDolares("US$ 0,00");
               setFormGananciasPesos("$0,00");
           }
       } else {
           setFormGananciasDolares("US$ 0,00");
           setFormGananciasPesos("$0,00");
       }
       
    } else {
      const unitARS = parseCurrency(formValorUnitarioPesos);
      const ccl = parseCurrency(formDolarCCL) || 1198;
      const split = formSplit > 0 ? formSplit : 1;

      const cleanTicker = formTicker.trim().toUpperCase();
      const quote = allCotizaciones.find(
        (c) => c.simbolo.toUpperCase() === cleanTicker
      );
      const panel = quote?.panel || "";

      let ratePercent = 0.00605; // IOL: 0.50% + 21% IVA = 0.605%
      let minARS = 121;
      let minUSD = 2.0;

      if (panel.toLowerCase().includes("fondo") || cleanTicker.startsWith("FCI")) {
        ratePercent = 0;
        minARS = 0;
        minUSD = 0;
      } else if (panel.toLowerCase().includes("caucion") || cleanTicker.includes("CAUCION")) {
        ratePercent = 0.001815;
        minARS = 0;
        minUSD = 0;
      }

      const rawTotalARS = unitARS * qty;
      const comisionARS = rawTotalARS > 0 && ratePercent > 0 ? Math.max(rawTotalARS * ratePercent, minARS) : 0;
      const totalConComisionARS = rawTotalARS + comisionARS;
      setFormValorTotalPesos(formatARS(totalConComisionARS));

      const valorAccionCompletaUSD = ccl > 0 ? (unitARS * split) / ccl : 0;
      const unitUSD = split > 0 ? valorAccionCompletaUSD / split : (ccl > 0 ? unitARS / ccl : 0);
      setFormValorUnitarioDolares(formatUSD(unitUSD));

      const rawTotalUSD = unitUSD * qty;
      const comisionUSD = rawTotalUSD > 0 && ratePercent > 0 ? Math.max(rawTotalUSD * ratePercent, minUSD) : 0;
      const totalConComisionUSD = rawTotalUSD + comisionUSD;
      setFormValorTotalDolares(formatUSD(totalConComisionUSD));

      // 4. G/P Acumulada
      if (formTicker.trim() && quote) {
        const currentPriceARS = parseCurrency(quote.ultimoPrecio);
        const currentPriceUSD = quote.moneda === "USD" ? currentPriceARS : (ccl > 0 ? currentPriceARS / ccl : 0);

        const gpUnitARS = currentPriceARS - unitARS;
        const gpTotalARS = gpUnitARS * qty;

        const gpUnitUSD = currentPriceUSD - unitUSD;
        const gpTotalUSD = gpUnitUSD * qty;

        setFormGananciasPesos(formatARS(gpTotalARS));
        setFormGananciasDolares(formatUSD(gpTotalUSD));
      } else {
        setFormGananciasPesos("$0,00");
        setFormGananciasDolares("US$ 0,00");
      }
    }
  }, [
    formValorUnitarioPesos,
    formCantidad,
    formDolarCCL,
    formSplit,
    formTicker,
    allCotizaciones,
    formTipoMercado,
    basePriceCripto,
    formDolarCripto,
    cotizacionesCripto,
  ]);




  useEffect(() => {
    let isMounted = true;
    const fetchDolares = async () => {
      try {
        const res = await fetch("https://dolarapi.com/v1/dolares");
        if (res.ok) {
          const data = await res.json();
          
          const cclObj = data.find(
            (d: any) => d.casa === "contadoconliqui" || d.casa === "ccl"
          );
          if (cclObj?.venta && isMounted) {
            const val = Number(cclObj.venta).toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            if (val) setMarketDolarCCL(val);
          } else {
             // fallback IOL
            const item = allCotizaciones.find(
              (c) =>
                c.panel === "Monedas / Divisas" &&
                (c.descripcion.toLowerCase().includes("ccl") ||
                  c.descripcion.toLowerCase().includes("liqui") ||
                  c.simbolo.toLowerCase().includes("ccl"))
            );
            if (item && item.ultimoPrecio && isMounted) {
              setMarketDolarCCL(item.ultimoPrecio);
            }
          }

          const criptoObj = data.find((d: any) => d.casa === "cripto");
          if (criptoObj?.venta && isMounted) {
             const valCripto = Number(criptoObj.venta).toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
             });
             if (valCripto) setMarketDolarCripto(valCripto);
          }
        }
      } catch {}
    };

    fetchDolares();
    return () => {
      isMounted = false;
    };
  }, [allCotizaciones]);

  // Keep formDolarCCL automatically updated to Cotizaciones del Mercado (IOL)
  useEffect(() => {
    if (marketDolarCCL) {
      setFormDolarCCL(marketDolarCCL);
    }
  }, [marketDolarCCL]);

  // Track previous ticker to detect user ticker changes
  const prevTickerRef = useRef<string>("");

  // Keep formSplit & formValorUnitarioPesos automatically updated based on Ticker / Símbolo (Cotizaciones IOL)
  useEffect(() => {
    const cleanTicker = formTicker.trim().toUpperCase();
    if (cleanTicker) {
      const autoRatio = getRatioForTicker(cleanTicker, allCotizaciones);
      setFormSplit(autoRatio);

      // Auto-update Valor Unitario (ARS) if ticker changed
      if (prevTickerRef.current.trim().toUpperCase() !== cleanTicker) {
        prevTickerRef.current = formTicker;
        if (formTipoMercado === "Cripto") {
           const cQuote = cotizacionesCripto?.find(c => c.id === formTicker);
           if (cQuote && cQuote.price) {
              const rawUSD = parseUSDCurrency(cQuote.price);
              const clean = rawUSD.toLocaleString("es-AR", {
                 useGrouping: true,
                 minimumFractionDigits: 2,
                 maximumFractionDigits: 6
              });
              setBasePriceCripto(`US$ ${clean}`);
           }
        } else {
          const quote = allCotizaciones.find(
            (c) => c.simbolo.trim().toUpperCase() === cleanTicker
          );
          if (quote && quote.ultimoPrecio) {
            const rawPrice = quote.ultimoPrecio.startsWith("$")
              ? quote.ultimoPrecio
              : `${quote.ultimoPrecio}`;
            setFormValorUnitarioPesos(rawPrice);
          }
        }
      }
    } else {
      setFormSplit(1);
      prevTickerRef.current = "";
    }
  }, [formTicker, allCotizaciones]);

  // Tariffs calculation based on selected ticker/panel/crypto
  const iolFeeInfo = useMemo(() => {
    const qty = formCantidad > 0 ? formCantidad : 0;
    
    if (formTipoMercado === "Cripto") {
       let unitUSD = parseCurrency(basePriceCripto);
       if (unitUSD === 0 && basePriceCripto.trim() === "") unitUSD = 0;
       const cripto = parseCurrency(formDolarCripto) || 1200;
       
       const rawTotalUSD = unitUSD * qty;
       const ratePercent = 0.001; // 0.1% Binance Spot
       const rateLabel = "0,10% Spot";
       
       const comisionUSD = rawTotalUSD * ratePercent;
       const comisionARS = comisionUSD * cripto;
       const totalConComisionUSD = rawTotalUSD + comisionUSD;
       const totalConComisionARS = (rawTotalUSD + comisionUSD) * cripto;
       
       return { 
           comisionARS, 
           comisionUSD, 
           rateLabel, 
           ratePercent, 
           totalConComisionARS, 
           totalConComisionUSD 
       };
    }

    const unitARS = parseCurrency(formValorUnitarioPesos);
    const ccl = parseCurrency(formDolarCCL) || 1198;
    const split = formSplit > 0 ? formSplit : 1;

    const rawTotalARS = unitARS * qty;
    const valorAccionCompletaUSD = ccl > 0 ? (unitARS * split) / ccl : 0;
    const unitUSD = split > 0 ? valorAccionCompletaUSD / split : (ccl > 0 ? unitARS / ccl : 0);
    const rawTotalUSD = unitUSD * qty;

    const cleanTicker = formTicker.trim().toUpperCase();
    const quote = allCotizaciones.find((c) => c.simbolo.toUpperCase() === cleanTicker);
    const panel = quote?.panel || "";

    // Determine IOL tariff rate
    let ratePercent = 0.00605; // Default: 0.50% + 21% IVA = 0.605%
    let rateLabel = "0,50% + IVA (0,605%)";
    let minARS = 121; // $100 + IVA
    let minUSD = 2.0;

    if (panel.toLowerCase().includes("fondo") || cleanTicker.startsWith("FCI")) {
      ratePercent = 0;
      rateLabel = "0,00% (Sin comisión)";
      minARS = 0;
      minUSD = 0;
    } else if (panel.toLowerCase().includes("caucion") || cleanTicker.includes("CAUCION")) {
      ratePercent = 0.001815; // 0.15% + IVA = 0.1815%
      rateLabel = "0,15% + IVA (0,1815%)";
      minARS = 0;
      minUSD = 0;
    }

    const comisionARS =
      rawTotalARS > 0
        ? ratePercent > 0
          ? Math.max(rawTotalARS * ratePercent, minARS)
          : 0
        : 0;

    const comisionUSD =
      rawTotalUSD > 0
        ? ratePercent > 0
          ? Math.max(rawTotalUSD * ratePercent, minUSD)
          : 0
        : 0;

    return {
      rateLabel,
      ratePercent,
      comisionARS,
      totalConComisionARS: rawTotalARS + comisionARS,
      comisionUSD,
      totalConComisionUSD: rawTotalUSD + comisionUSD,
    };
  }, [
    formValorUnitarioPesos,
    formCantidad,
    formDolarCCL,
    formSplit,
    formTicker,
    allCotizaciones,
    formTipoMercado,
    basePriceCripto,
    formDolarCripto,
  ]);

  // Options for custom selects
  const uniqueBrokers = useMemo(() => {
    const list = Array.from(new Set(inversiones.map((i) => i.lugar).filter(Boolean)));
    return ["TODOS", ...list];
  }, [inversiones]);

  // Handle selecting a ticker from the floating sub-modal
  const handleSelectTickerFromModal = (symbolObj: CotizacionAccion) => {
    const sym = symbolObj.simbolo;
    setFormTicker(sym);
    saveRecentTicker(sym);

    if (formTipoMercado === "Cripto") {
       if (symbolObj.ultimoPrecio) {
          const rawUSD = parseUSDCurrency(symbolObj.ultimoPrecio);
          const clean = rawUSD.toLocaleString("es-AR", {
             useGrouping: true,
             minimumFractionDigits: 2,
             maximumFractionDigits: 6
          });
          setBasePriceCripto(`US$ ${clean}`);
       }
    } else {
      // Auto-load split/ratio from quote symbol
      const autoRatio = getRatioForTicker(sym, allCotizaciones);
      setFormSplit(autoRatio);

      // Auto-fill Unitario ARS with latest quote price
      if (symbolObj.ultimoPrecio) {
        const rawPrice = symbolObj.ultimoPrecio.startsWith("$")
          ? symbolObj.ultimoPrecio
          : `${symbolObj.ultimoPrecio}`;
        setFormValorUnitarioPesos(rawPrice);
      }
    }

    setShowTickerPicker(false);
  };

  // Open Edit
  const handleOpenEdit = (item: Inversion) => {
    const itemTicker = item.ticker || "";
    prevTickerRef.current = itemTicker;
    setEditingItem(item);
    
    // Auto-detect crypto
    const isCrypto = cotizacionesCripto && cotizacionesCripto.some(c => c.id === itemTicker);
    setFormTipoMercado(isCrypto ? "Cripto" : "Tradicional");

    setFormLugar(item.lugar || "Invertir Online");
    setFormOperacion(item.operacion || "Compra");
    setFormTicker(itemTicker);
    setFormFecha(item.fecha || "");
    setFormCantidad(item.cantidad || 1);
    setFormDolarCCL(marketDolarCCL || "1.198,00");
    setFormDolarCripto(marketDolarCripto || "1.200,00");
    
    if (isCrypto) {
       setBasePriceCripto(item.valorUnitarioDolares || "US$ 0,00");
    }

    const itemRatio = item.ticker ? getRatioForTicker(item.ticker, allCotizaciones) : 1;
    setFormSplit(itemRatio);
    setFormValorUnitarioPesos(item.valorUnitarioPesos || "$0,00");
    setFormValorTotalPesos(item.valorTotalPesos || "$0,00");
    setFormEstado(item.estado || "Abierto");
    setFormValorUnitarioDolares(item.valorUnitarioDolares || "US$ 0,00");
    setFormValorTotalDolares(item.valorTotalDolares || "US$ 0,00");
    setFormGananciasPesos(item.gananciasAcumuladasPesos || "$0,00");
    setFormGananciasDolares(item.gananciasAcumuladasDolares || "US$ 0,00");
    setFormResultado(item.resultado || "Ganancia");
    setShowAddModal(true);
  };

  // Open Create
  const handleOpenAdd = () => {
    prevTickerRef.current = "";
    setEditingItem(null);
    setFormTipoMercado(activeTable === "Cripto" ? "Cripto" : "Tradicional");
    setBasePriceCripto("");
    setFormLugar("Invertir Online");
    setFormOperacion("Compra");
    setFormTicker("");
    const now = new Date();
    const formattedNow = `${now.getDate().toString().padStart(2, "0")}/${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${now.getFullYear()} ${now
      .getHours()
      .toString()
      .padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    setFormFecha(formattedNow);
    setFormCantidad(1);
    setFormDolarCCL(marketDolarCCL || "1.198,00");
    setFormDolarCripto(marketDolarCripto || "1.200,00");
    setFormSplit(1);
    setFormValorUnitarioPesos("$0,00");
    setFormValorTotalPesos("$0,00");
    setFormEstado("Abierto");
    setFormValorUnitarioDolares("US$ 0,00");
    setFormValorTotalDolares("US$ 0,00");
    setFormGananciasPesos("$0,00");
    setFormGananciasDolares("US$ 0,00");
    setFormResultado("Ganancia");
    setShowAddModal(true);
  };

  // Save Investment
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTicker.trim()) return;

    saveRecentTicker(formTicker);

    setIsSaving(true);
    try {
      const newItem: Inversion = {
        id: editingItem?.id || generateUniqueId("inv"),
        lugar: formLugar,
        operacion: formOperacion,
        ticker: formTicker.toUpperCase(),
        fecha: formFecha,
        cantidad: Number(formCantidad),
        valorUnitarioPesos: formValorUnitarioPesos,
        valorTotalPesos: formValorTotalPesos,
        estado: formEstado,
        valorUnitarioDolares: formValorUnitarioDolares,
        valorTotalDolares: formValorTotalDolares,
        gananciasAcumuladasPesos: formGananciasPesos,
        gananciasAcumuladasDolares: formGananciasDolares,
        resultado: formResultado,
      };

      const userId = userEmail || "hernanmaximiliano10@gmail.com";
      await saveItemToFirestore(userId, "inversiones", newItem);
      setInversiones((prev) => {
        const exists = prev.some((inv) => inv.id === newItem.id);
        if (exists) {
          return prev.map((inv) => (inv.id === newItem.id ? newItem : inv));
        }
        return [newItem, ...prev];
      });
      showToast(editingItem ? "Inversión actualizada con éxito" : "Inversión registrada con éxito", "success");
      setShowAddModal(false);
    } catch (error) {
      console.error("Error al guardar inversión:", error);
      showToast("Error al guardar la inversión", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const userId = userEmail || "hernanmaximiliano10@gmail.com";
      await deleteItemFromFirestore(userId, "inversiones", id);
      setInversiones((prev) => prev.filter((inv) => inv.id !== id));
      showToast("Registro de inversión eliminado", "success");
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error al eliminar inversión:", error);
      showToast("Error al eliminar la inversión", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Map and compute live G/P for investments in table
  const mappedInversiones = useMemo(() => {
    const ccl = 1198;
    return inversiones.map((item) => {
      const quote = allCotizaciones.find(
        (c) => c.simbolo.toUpperCase() === item.ticker.trim().toUpperCase()
      );

      if (!quote) {
        const cQuote = cotizacionesCripto?.find(
          (c) => c.id.toUpperCase() === item.ticker.trim().toUpperCase()
        );
        if (cQuote) {
          const currentPriceUSD = parseUSDCurrency(cQuote.price);
          const unitCostUSD = parseCurrency(item.valorUnitarioDolares);
          const gpUnitUSD = currentPriceUSD - unitCostUSD;
          const gpTotalUSD = gpUnitUSD * (item.cantidad || 1);

          const unitCostARS = parseCurrency(item.valorUnitarioPesos);
          const implicitRate = (unitCostARS > 0 && unitCostUSD > 0)
            ? (unitCostARS / unitCostUSD)
            : 1200;
          const currentPriceARS = currentPriceUSD * implicitRate;
          const gpUnitARS = currentPriceARS - unitCostARS;
          const gpTotalARS = gpUnitARS * (item.cantidad || 1);

          const resultado = gpTotalARS >= 0 ? "Ganancia" : "Perdida";

          return {
            ...item,
            gananciasAcumuladasPesos: formatARS(gpTotalARS),
            gananciasAcumuladasDolares: formatUSD(gpTotalUSD),
            resultado,
          };
        }
        return item;
      }

      const currentPriceARS = parseCurrency(quote.ultimoPrecio);
      const unitCostARS = parseCurrency(item.valorUnitarioPesos);
      const gpUnitARS = currentPriceARS - unitCostARS;
      const gpTotalARS = gpUnitARS * (item.cantidad || 1);

      const unitCostUSD = parseCurrency(item.valorUnitarioDolares);
      const currentPriceUSD =
        quote.moneda === "USD" ? currentPriceARS : currentPriceARS / ccl;
      const gpUnitUSD = currentPriceUSD - unitCostUSD;
      const gpTotalUSD = gpUnitUSD * (item.cantidad || 1);

      const resultado = gpTotalARS >= 0 ? "Ganancia" : "Perdida";

      return {
        ...item,
        gananciasAcumuladasPesos: formatARS(gpTotalARS),
        gananciasAcumuladasDolares: formatUSD(gpTotalUSD),
        resultado,
      };
    });
  }, [inversiones, allCotizaciones, cotizacionesCripto, lastRefreshedTs]);

  // Filtered dataset
  const filteredInversiones = useMemo(() => {
    return mappedInversiones.filter((item) => {
      // Classify as crypto if ticker matches any item in cotizacionesCripto
      const isCrypto = (cotizacionesCripto || []).some(
        (c) => c.id.toUpperCase() === item.ticker.trim().toUpperCase()
      );
      const matchesTab = activeTable === "Cripto" ? isCrypto : !isCrypto;
      if (!matchesTab) return false;

      const matchSearch =
        item.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lugar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.operacion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.fecha && item.fecha.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchBroker =
        selectedBroker === "TODOS" ||
        item.lugar.toLowerCase() === selectedBroker.toLowerCase();

      const matchOperacion =
        selectedOperacion === "TODAS" ||
        item.operacion.toLowerCase() === selectedOperacion.toLowerCase();

      const matchEstado =
        selectedEstado === "TODOS" ||
        item.estado.toLowerCase() === selectedEstado.toLowerCase();

      const matchResultado =
        selectedResultado === "TODOS" ||
        (item.resultado &&
          item.resultado.toLowerCase() === selectedResultado.toLowerCase());

      return (
        matchSearch &&
        matchBroker &&
        matchOperacion &&
        matchEstado &&
        matchResultado
      );
    });
  }, [
    mappedInversiones,
    searchQuery,
    selectedBroker,
    selectedOperacion,
    selectedEstado,
    selectedResultado,
    activeTable,
    cotizacionesCripto,
  ]);

  // Pagination logic
  const totalPages = Math.ceil(filteredInversiones.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInversiones.slice(start, start + pageSize);
  }, [filteredInversiones, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    const activeTabInversiones = mappedInversiones.filter((item) => {
      const isCrypto = (cotizacionesCripto || []).some(
        (c) => c.id.toUpperCase() === item.ticker.trim().toUpperCase()
      );
      return activeTable === "Cripto" ? isCrypto : !isCrypto;
    });

    const totalCount = activeTabInversiones.length;
    const abiertasCount = activeTabInversiones.filter(
      (i) => i.estado.toLowerCase() === "abierto"
    ).length;
    const cerradasCount = activeTabInversiones.filter(
      (i) => i.estado.toLowerCase() === "cerrado"
    ).length;
    const gananciasCount = activeTabInversiones.filter(
      (i) => i.resultado?.toLowerCase() === "ganancia"
    ).length;
    const perdidasCount = activeTabInversiones.filter(
      (i) => i.resultado?.toLowerCase() === "perdida"
    ).length;

    return {
      totalCount,
      abiertasCount,
      cerradasCount,
      gananciasCount,
      perdidasCount,
    };
  }, [mappedInversiones, activeTable, cotizacionesCripto]);

  // Filtered quotes list for ticker selector modal
  const uniquePanels = useMemo(() => {
    if (formTipoMercado === "Cripto") {
       return ["TODOS", "Criptomonedas"];
    }
    const panels = Array.from(new Set(allCotizaciones.map((c) => c.panel).filter(Boolean)));
    return ["TODOS", ...panels];
  }, [allCotizaciones, formTipoMercado]);

  const filteredQuotesForPicker = useMemo(() => {
    const q = tickerSearch.toLowerCase().trim();
    const cat = tickerCategoryFilter.toLowerCase();

    if (formTipoMercado === "Cripto") {
       return (cotizacionesCripto || []).filter(c => {
          const matchSearch = !q || c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
          return matchSearch;
       }).map(c => ({
          simbolo: c.id,
          descripcion: c.name,
          ultimoPrecio: c.price,
          variacionPorcentual: c.percent24h,
          panel: "Criptomonedas"
       }));
    }

    return allCotizaciones.filter((c) => {
      const matchSearch =
        !q ||
        c.simbolo.toLowerCase().includes(q) ||
        c.descripcion.toLowerCase().includes(q) ||
        c.panel.toLowerCase().includes(q);

      const matchCategory =
        tickerCategoryFilter === "TODOS" ||
        c.panel.toLowerCase() === cat;

      return matchSearch && matchCategory;
    });
  }, [allCotizaciones, cotizacionesCripto, tickerSearch, tickerCategoryFilter, formTipoMercado]);

  const visibleQuotesForPicker = useMemo(() => {
    return filteredQuotesForPicker.slice(0, pickerVisibleCount);
  }, [filteredQuotesForPicker, pickerVisibleCount]);

  // Export CSV / Google Sheets
  const handleExportCSV = () => {
    const headers = [
      "Lugar",
      "Operación",
      "Ticker",
      "Fecha",
      "Cantidad",
      "Valor Unit. ARS",
      "Valor Total ARS",
      "Estado",
      "Valor Unit. USD",
      "Valor Total USD",
      "Ganancia/Pérdida ARS",
      "Ganancia/Pérdida USD",
      "Resultado",
    ];

    const rows = filteredInversiones.map((inv) => [
      inv.lugar,
      inv.operacion,
      inv.ticker,
      inv.fecha,
      inv.cantidad,
      inv.valorUnitarioPesos,
      inv.valorTotalPesos,
      inv.estado,
      inv.valorUnitarioDolares,
      inv.valorTotalDolares,
      inv.gananciasAcumuladasPesos,
      inv.gananciasAcumuladasDolares,
      inv.resultado,
    ]);

    if (onExportSheets) {
      onExportSheets("Reporte_Inversiones", headers, rows);
    } else {
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Inversiones_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sliding toggle button for switching between Tradicional and Cripto */}
      <div className="flex items-center justify-center mb-8 w-full max-w-sm sm:max-w-md mx-auto">
        <div className="w-full">
          <div
            ref={scrollContainerRef}
            className="flex items-center justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-full w-full shadow-md whitespace-nowrap"
          >
            <button
              onClick={() => {
                setActiveTable("Tradicional");
                setCurrentPage(1);
              }}
              className={`relative flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                activeTable === "Tradicional"
                  ? "text-white font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
              }`}
            >
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap font-bold">Acciones y CEDEARs</span>
              {activeTable === "Tradicional" && (
                <motion.div
                  layoutId="activeInversionesTabIndicator"
                  className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTable("Cripto");
                setCurrentPage(1);
              }}
              className={`relative flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                activeTable === "Cripto"
                  ? "text-white font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
              }`}
            >
              <Bitcoin className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap font-bold">Criptomonedas</span>
              {activeTable === "Cripto" && (
                <motion.div
                  layoutId="activeInversionesTabIndicator"
                  className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Unified Main Card Container matching GastosVariosTable */}
      <div
        className={`p-6 rounded-3xl border ${
          darkMode
            ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
            : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
        }`}
      >
        {/* Header and Add Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                Portafolio de Inversiones
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Gestión y seguimiento de operaciones en ARS/USD con actualización de cotizaciones cada 30 min.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={handleExportCSV}
              className="w-full sm:w-auto justify-center btn-export-iol px-4 py-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50/80 dark:hover:bg-zinc-800 text-black dark:text-zinc-300 font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>Exportar</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto justify-center px-4 py-2 rounded-full bg-primary text-white dark:text-blue-950 font-bold text-xs hover:bg-primary-hover shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Inversión</span>
            </button>
          </div>
        </div>

        {/* Quick Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" /> Total Operaciones
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-1">
              <span className="quick-stat-number">{stats.totalCount}</span>{" "}
              <span className="text-xs font-semibold text-primary">registros</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-500" /> Posiciones Abiertas
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-1">
              <span className="quick-stat-number text-amber-600 dark:text-amber-400">{stats.abiertasCount}</span>{" "}
              <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                / {stats.cerradasCount} cerradas
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Operaciones Ganancia
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-1">
              <span className="quick-stat-number text-emerald-600 dark:text-emerald-400">{stats.gananciasCount}</span>{" "}
              <span className="text-xs font-semibold text-emerald-600/80 dark:text-emerald-400/80">con ganancia</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" /> Operaciones Pérdida
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-1">
              <span className="quick-stat-number text-rose-600 dark:text-rose-400">{stats.perdidasCount}</span>{" "}
              <span className="text-xs font-semibold text-rose-600/80 dark:text-rose-400/80">con pérdida</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input
              type="text"
              placeholder="Buscar por Ticker, Lugar, Fecha..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            

            <CustomSelect
              size="sm"
              value={selectedBroker}
              icon={<Filter className="w-3.5 h-3.5" />}
              onChange={(val) => {
                setSelectedBroker(val);
                setCurrentPage(1);
              }}
              options={uniqueBrokers.map((b) => ({ value: b, label: b === "TODOS" ? "Todos Brokers" : b }))}
              placeholder="Broker"
              className="w-full sm:w-36"
            />

            <CustomSelect
              size="sm"
              value={selectedOperacion}
              icon={<Filter className="w-3.5 h-3.5" />}
              onChange={(val) => {
                setSelectedOperacion(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "TODAS", label: "Todas Operaciones" },
                { value: "Compra", label: "Compra" },
                { value: "Venta", label: "Venta" },
              ]}
              placeholder="Operación"
              className="w-full sm:w-36"
            />

            <CustomSelect
              size="sm"
              value={selectedEstado}
              icon={<Filter className="w-3.5 h-3.5" />}
              onChange={(val) => {
                setSelectedEstado(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "TODOS", label: "Todos Estados" },
                { value: "Abierto", label: "Abierto" },
                { value: "Cerrado", label: "Cerrado" },
              ]}
              placeholder="Estado"
              className="w-full sm:w-32"
            />

            <CustomSelect
              size="sm"
              value={selectedResultado}
              icon={<Filter className="w-3.5 h-3.5" />}
              onChange={(val) => {
                setSelectedResultado(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "TODOS", label: "Todos Resultados" },
                { value: "Ganancia", label: "Ganancia" },
                { value: "Perdida", label: "Pérdida" },
              ]}
              placeholder="Resultado"
              className="w-full sm:w-36"
            />
          </div>
        </div>

        {/* Inversiones Table */}
        <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead className="sticky top-0 z-20">
              <tr
                className={`text-xs font-bold uppercase tracking-wider ${ darkMode ?"bg-zinc-950/40 text-zinc-400"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
              <th className="py-3.5 px-3.5 whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Lugar</span>
              </th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Tipo</span>
              </th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Ticker</span>
              </th>
              <th className="py-3.5 px-3.5 whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Fecha</span>
              </th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-right">Cant.</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-right">Unit. ARS</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-right">Total ARS</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Estado</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-right">Unit. USD</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-right">Total USD</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-right">G/P ARS</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-right">G/P USD</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Resultado</th>
              <th className="py-3.5 px-3.5 whitespace-nowrap text-center">
                <span className="flex items-center justify-center gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
              </th>
            </tr>
          </thead>
          <tbody className="">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="py-12 text-center text-slate-400 dark:text-zinc-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    {activeTable === "Cripto" ? (
                      <Bitcoin className="w-8 h-8 opacity-40 text-primary animate-pulse" />
                    ) : (
                      <BarChart3 className="w-8 h-8 opacity-40 text-primary" />
                    )}
                    <p className="font-semibold text-xs">
                      {activeTable === "Cripto"
                        ? "No se encontraron inversiones en criptomonedas."
                        : "No se encontraron inversiones en acciones y CEDEARs."}
                    </p>
                    <p className="text-[11px] opacity-70">
                      Presiona "Agregar Inversión" para cargar operaciones en el portafolio.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => {
                const isCompra = item.operacion.toLowerCase() === "compra";
                const isAbierto = item.estado.toLowerCase() === "abierto";
                const isGanancia = item.resultado?.toLowerCase() === "ganancia";

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors group text-xs font-medium"
                  >
                    {/* Lugar */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                        {item.lugar}
                      </span>
                    </td>

                    {/* Operación */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isCompra
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {isCompra ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {item.operacion}
                      </span>
                    </td>

                    {/* Ticker */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-black font-mono tracking-wider">
                        {item.ticker}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-zinc-400 font-mono text-[11px]">
                      {item.fecha}
                    </td>

                    {/* Cantidad */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right font-bold font-mono text-slate-900 dark:text-white">
                      {item.cantidad}
                    </td>

                    {/* Unit ARS */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono text-slate-700 dark:text-zinc-300">
                      {item.valorUnitarioPesos || "-"}
                    </td>

                    {/* Total ARS */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono font-bold text-slate-900 dark:text-white">
                      {item.valorTotalPesos || "-"}
                    </td>

                    {/* Estado */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isAbierto
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {item.estado}
                      </span>
                    </td>

                    {/* Unit USD */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono text-slate-700 dark:text-zinc-300">
                      {item.valorUnitarioDolares || "-"}
                    </td>

                    {/* Total USD */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono font-bold text-slate-900 dark:text-white">
                      {item.valorTotalDolares || "-"}
                    </td>

                    {/* G/P ARS */}
                    <td
                      className={`py-3 px-3.5 whitespace-nowrap text-right font-mono font-bold ${
                        isGanancia
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {item.gananciasAcumuladasPesos || "-"}
                    </td>

                    {/* G/P USD */}
                    <td
                      className={`py-3 px-3.5 whitespace-nowrap text-right font-mono font-bold ${
                        isGanancia
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {item.gananciasAcumuladasDolares || "-"}
                    </td>

                    {/* Resultado */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isGanancia
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {isGanancia ? "Ganancia" : "Pérdida"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-slate-50/80 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                          title="Editar inversión"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                          title="Eliminar inversión"
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
            Mostrando {paginatedData.length} de {filteredInversiones.length} registros (Página {currentPage} de {totalPages})
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50/80 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
            >
              Anterior
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50/80 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Floating Ticker / Símbolo Selector Sub-Modal Portal */}
      {createPortal(
        <AnimatePresence>
          {showTickerPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowTickerPicker(false)}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
                {/* Modal Header: Fixed and Non-Scrollable, exact match with Agregar Inversión */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-zinc-900 z-10 shrink-0">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {formTipoMercado === "Cripto" ? "Seleccionar Crypto" : "Seleccionar Ticker / Símbolo"}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                      {formTipoMercado === "Cripto" ? "Cotizaciones de Criptomonedas" : "Cotizaciones del Mercado (IOL)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTickerPicker(false)}
                    className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Content Area: Spacing exactly matches form style */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 flex flex-col space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Buscar por símbolo o empresa (ej: AAPL, GGAL, AL30)..."
                      value={tickerSearch}
                      onChange={(e) => setTickerSearch(e.target.value)}
                      className="w-full pl-9 pr-20 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                    />
                    {tickerSearch && (
                      <button
                        onClick={() => setTickerSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  {/* Recientemente Usados */}
                  {recentTickers.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="recently-used-label flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        <Clock className="w-3 h-3 text-amber-500" /> Usados Recientemente
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto no-scrollbar py-0.5">
                        {recentTickers.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              if (formTipoMercado === "Cripto") {
                                const foundCripto = (cotizacionesCripto || []).find(
                                  (c) => c.id.toUpperCase() === t.toUpperCase()
                                );
                                if (foundCripto) {
                                  handleSelectTickerFromModal({
                                    simbolo: foundCripto.id,
                                    descripcion: foundCripto.name,
                                    ultimoPrecio: foundCripto.price,
                                    variacionPorcentual: foundCripto.percent24h,
                                    panel: "Criptomonedas"
                                  } as any);
                                } else {
                                  setFormTicker(t);
                                  setShowTickerPicker(false);
                                }
                              } else {
                                const found = allCotizaciones.find(
                                  (c) => c.simbolo.toUpperCase() === t.toUpperCase()
                                );
                                if (found) {
                                  handleSelectTickerFromModal(found);
                                } else {
                                  setFormTicker(t);
                                  setShowTickerPicker(false);
                                }
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-black font-mono transition-colors cursor-pointer shrink-0"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Filters */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scroll-smooth py-1 no-scrollbar scrollbar-none shrink-0">
                    {uniquePanels.map((p) => {
                      const isSel = tickerCategoryFilter === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={(e) => { setTickerCategoryFilter(p); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                            isSel
                              ? "bg-primary text-white dark:text-blue-950 shadow-xs"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50/80 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Symbol Cards List */}
                  <div
                    className="overflow-y-auto flex-1 space-y-1.5 pr-1 scrollbar-thin max-h-[360px]"
                    onScroll={(e) => {
                      const target = e.currentTarget;
                      if (target.scrollHeight - target.scrollTop - target.clientHeight < 120) {
                        if (pickerVisibleCount < filteredQuotesForPicker.length) {
                          setPickerVisibleCount((prev) => prev + 40);
                        }
                      }
                    }}
                  >
                    {filteredQuotesForPicker.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500 font-medium">
                        No se encontraron símbolos que coincidan con "{tickerSearch}".
                      </div>
                    ) : (
                      <>
                        {visibleQuotesForPicker.map((item, idx) => {
                          const isUSD = item.moneda === "USD" || item.simbolo.endsWith("D");
                          const isPositive = item.variacion >= 0;

                          return (
                            <button
                              key={item.id || `${item.simbolo}-${idx}`}
                              type="button"
                              onClick={() => handleSelectTickerFromModal(item)}
                              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-zinc-950/40 hover:bg-primary/5 dark:hover:bg-primary/10 border border-slate-200/50 dark:border-zinc-800/50 hover:border-primary/40 transition-all text-left cursor-pointer group"
                            >
                              <div className="flex items-center gap-3">
                                <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-black font-mono text-xs group-hover:scale-105 transition-transform">
                                  {item.simbolo}
                                </span>
                                <div className="truncate max-w-[200px] sm:max-w-[260px]">
                                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {item.descripcion}
                                  </p>
                                  <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                                    {item.panel}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="font-mono font-black text-xs text-slate-900 dark:text-white">
                                  {isUSD ? "US$ " : "$ "}
                                  {item.ultimoPrecio}
                                </p>
                                <span
                                  className={`text-[10px] font-bold ${
                                    isPositive
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {item.variacionTexto || (isPositive ? `+${item.variacion}%` : `${item.variacion}%`)}
                                </span>
                              </div>
                            </button>
                          );
                        })}

                        {pickerVisibleCount < filteredQuotesForPicker.length && (
                          <div className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => setPickerVisibleCount((prev) => prev + 60)}
                              className="px-4 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors cursor-pointer"
                            >
                              Cargar más símbolos ({filteredQuotesForPicker.length - pickerVisibleCount} restantes)
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Manual Add/Edit Modal Portal */}
      {createPortal(
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
                {/* Header: Fixed and Non-Scrollable */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-zinc-900 z-10">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {editingItem ? "Editar Inversión" : "Agregar Inversión"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                  <form onSubmit={handleSave} className="space-y-4 pb-1">
                    {/* Tipo de Inversión */}
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
                        Tipo de Inversión
                      </label>
                      <div className="flex bg-slate-100 dark:bg-zinc-900 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setFormTipoMercado("Tradicional")}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            formTipoMercado === "Tradicional"
                              ? "bg-primary text-white dark:text-blue-950 shadow-sm font-black"
                              : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
                          }`}
                        >
                          Mercado Tradicional
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormTipoMercado("Cripto")}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            formTipoMercado === "Cripto"
                              ? "bg-primary text-white dark:text-blue-950 shadow-sm font-black"
                              : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
                          }`}
                        >
                          Criptomoneda
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Lugar */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Lugar / Broker <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Invertir Online, Binance"
                        value={formLugar}
                        onChange={(e) => setFormLugar(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                      />
                    </div>

                    {/* Operación */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Operación
                      </label>
                      <CustomSelect
                        value={formOperacion}
                        onChange={(val) => setFormOperacion(val)}
                        options={[
                          { value: "Compra", label: "Compra" },
                          { value: "Venta", label: "Venta" },
                        ]}
                        className="w-full"
                      />
                    </div>

                    {/* Ticker / Símbolo Selector Button */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                        <span>
                          {formTipoMercado === "Cripto" ? "Nombre de Crypto" : "Ticker / Símbolo (Cotizaciones IOL)"} <span className="text-primary">*</span>
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                          Abre el menú flotante
                        </span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={openTickerPickerModal}
                          className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 hover:border-primary transition-all text-xs font-bold cursor-pointer"
                        >
                          {formTicker ? (
                            <span className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-black font-mono">
                                {formTicker}
                              </span>
                              <span className="text-slate-500 dark:text-zinc-400 text-[11px]">
                                {allCotizaciones.find((c) => c.simbolo === formTicker)?.descripcion || "Seleccionado"}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-zinc-500 font-normal">
                              -- Buscar / Seleccionar Ticker de IOL --
                            </span>
                          )}
                          <Search className="w-4 h-4 text-primary shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Fecha */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Fecha y Hora
                      </label>
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY HH:MM:SS"
                        value={formFecha}
                        onChange={(e) => setFormFecha(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>

                    {/* Cantidad */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        {formTipoMercado === "Cripto" ? "Cantidad" : "Cantidad de Acciones"} <span className="text-primary">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formCantidad}
                        onChange={(e) => setFormCantidad(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>

                    {formTipoMercado === "Cripto" ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                            Cotización Dólar Crypto
                          </label>
                          <input
                            type="text"
                            value={formDolarCripto}
                            onChange={(e) => setFormDolarCripto(e.target.value)}
                            placeholder="1.200,00"
                            className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                            Precio de Compra/Venta (US$)
                          </label>
                          <input
                            type="text"
                            value={basePriceCripto}
                            onChange={(e) => setBasePriceCripto(e.target.value)}
                            placeholder="US$ 0,00"
                            className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Dólar CCL & Split configuration */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                            <span>Dólar CCL (Cotización)</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <Lock className="w-3 h-3" /> No modificable
                            </span>
                          </label>
                          <input
                            type="text"
                            disabled
                            readOnly
                            value={formDolarCCL}
                            placeholder="1.198,00"
                            className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 outline-none font-mono cursor-not-allowed select-none opacity-85"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                            <span>Split / Ratio</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <Lock className="w-3 h-3" /> No modificable
                            </span>
                          </label>
                          <input
                            type="number"
                            disabled
                            readOnly
                            value={formSplit}
                            className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 outline-none font-mono cursor-not-allowed select-none opacity-85"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                            Valor Unitario (ARS)
                          </label>
                          <input
                            type="text"
                            placeholder="$15.000,00"
                            value={formValorUnitarioPesos}
                            onChange={(e) => setFormValorUnitarioPesos(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                          />
                        </div>

                        {/* Unit USD (Calculated: (Acción Completa USD) / Split) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                            Valor Unitario (USD) <Calculator className="w-3 h-3 text-blue-500" />
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={formValorUnitarioDolares}
                            className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400 outline-none font-mono cursor-not-allowed"
                          />
                        </div>
                      </>
                    )}

                    {/* Total ARS (Calculated automatically with commissions) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          Valor Total (ARS) <Calculator className="w-3 h-3 text-primary" />
                        </span>
                        <span className="text-[10px] font-semibold text-primary/80">
                          {formTipoMercado === "Cripto" ? "(Incluye 0.1% Binance)" : "(Incluye comisiones IOL)"}
                        </span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formValorTotalPesos}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-primary outline-none font-mono cursor-not-allowed"
                      />
                    </div>

                    {/* Total USD (Calculated automatically with commissions) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          Valor Total (USD) <Calculator className="w-3 h-3 text-blue-500" />
                        </span>
                        <span className="text-[10px] font-semibold text-blue-600/80 dark:text-blue-400/80">
                          {formTipoMercado === "Cripto" ? "(Incluye 0.1% Binance)" : "(Incluye comisiones IOL)"}
                        </span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formValorTotalDolares}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400 outline-none font-mono cursor-not-allowed"
                      />
                    </div>

                    {/* Banner a todo lo largo: Comisiones IOL a pagar */}
                    <div className="col-span-1 sm:col-span-2 p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-400/5 border border-amber-500/20 dark:border-amber-400/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                          <Percent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{formTipoMercado === "Cripto" ? "Comisión Binance a Pagar" : "Comisión IOL a Pagar"}</span>
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-500/20">
                              {iolFeeInfo.rateLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                            Monto estimado de comisiones cargado automáticamente en los Totales
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 font-mono font-bold text-xs bg-white dark:bg-zinc-900 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 shrink-0 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-sans font-semibold uppercase">ARS:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">+ {formatARS(iolFeeInfo.comisionARS)}</span>
                        </div>
                        <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800" />
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-sans font-semibold uppercase">USD:</span>
                          <span className="text-blue-600 dark:text-blue-400">+ {formatUSD(iolFeeInfo.comisionUSD)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ganancias ARS (Auto calculated from IOL 30m refresh) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                        G/P Acumulada (ARS) <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formGananciasPesos}
                        className={`w-full px-3.5 py-2.5 text-xs font-extrabold rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 font-mono cursor-not-allowed ${
                          formGananciasPesos.startsWith("-")
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      />
                    </div>

                    {/* Ganancias USD (Auto calculated from IOL 30m refresh) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                        G/P Acumulada (USD) <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formGananciasDolares}
                        className={`w-full px-3.5 py-2.5 text-xs font-extrabold rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 font-mono cursor-not-allowed ${
                          formGananciasDolares.startsWith("-")
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      />
                    </div>

                    {/* Resultado Global */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Resultado Global (Auto)
                      </label>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-black text-center border ${
                            formResultado === "Ganancia"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {formResultado === "Ganancia" ? "▲ Ganancia" : "▼ Pérdida"}
                        </span>
                      </div>
                    </div>

                    {/* Estado Posición */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Estado Posición
                      </label>
                      <CustomSelect
                        value={formEstado}
                        onChange={(val) => setFormEstado(val)}
                        options={[
                          { value: "Abierto", label: "Abierto" },
                          { value: "Cerrado", label: "Cerrado" },
                        ]}
                        className="w-full"
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
                        editingItem ? "Guardar Cambios" : "Guardar Inversión"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delete Confirmation Modal Portal */}
      {createPortal(
        <AnimatePresence>
          {deleteConfirmId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white"
                    : "bg-white border-zinc-200 text-zinc-900"
                } space-y-4`}
              >
                <div className="flex items-center gap-3 text-rose-500">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Confirmar Eliminación
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-medium">
                  ¿Estás seguro de que deseas eliminar este registro de inversión de forma permanente?
                </p>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    disabled={isDeleting}
                    onClick={() => { if (!isDeleting) setDeleteConfirmId(null); }}
                    className="px-4 py-2 rounded-full border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs hover:bg-slate-50/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Eliminando...</span>
                      </>
                    ) : (
                      "Eliminar"
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
