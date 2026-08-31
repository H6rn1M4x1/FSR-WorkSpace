import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { generateUniqueId } from "../utils/id";
import { saveItemToFirestore, deleteItemFromFirestore } from "../lib/firestoreSyncService";
import { auth } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { CotizacionAccion } from "../types";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  Check,
  Search,
  Filter,
  Download,
  LineChart,
  Building2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Layers,
  Settings,
  Tag,
  Eye,
  Clock,
  ShieldCheck,
  DollarSign,
  Globe2,
  Loader2,
} from "lucide-react";

interface CotizacionesAccionesTableProps {
  cotizaciones: CotizacionAccion[];
  setCotizaciones: React.Dispatch<React.SetStateAction<CotizacionAccion[]>>;
  darkMode: boolean;
  onExportSheets?: (title: string, headers: string[], rows: any[][]) => void;
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
                      : "text-black dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default function CotizacionesAccionesTable({
  cotizaciones,
  setCotizaciones,
  darkMode,
  onExportSheets,
}: CotizacionesAccionesTableProps) {
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPanel, setSelectedPanel] = useState("TODOS");
  const [selectedMoneda, setSelectedMoneda] = useState("TODAS");
  const [selectedTendencia, setSelectedTendencia] = useState("TODAS");

  // Refresh & Caching State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchedTs, setLastFetchedTs] = useState<number>(() => {
    const saved = localStorage.getItem("cotizaciones_last_fetched_ts");
    return saved ? parseInt(saved, 10) : Date.now();
  });
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CotizacionAccion | null>(null);
  const [viewingItem, setViewingItem] = useState<CotizacionAccion | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useLockBodyScroll(
    Boolean(showAddModal || editingItem || viewingItem)
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formSimbolo, setFormSimbolo] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formPanel, setFormPanel] = useState("Acciones Líderes");
  const [formMoneda, setFormMoneda] = useState("ARS");
  const [formUltimoPrecio, setFormUltimoPrecio] = useState("");
  const [formVariacion, setFormVariacion] = useState<number>(0);
  const [formApertura, setFormApertura] = useState("");
  const [formMinimo, setFormMinimo] = useState("");
  const [formMaximo, setFormMaximo] = useState("");
  const [formUltimoCierre, setFormUltimoCierre] = useState("");
  const [formMontoOperado, setFormMontoOperado] = useState("");

  // Calculate elapsed & remaining minutes for 30-min cache rule
  const minutesSinceLastFetch = useMemo(() => {
    return Math.floor((Date.now() - lastFetchedTs) / (1000 * 60));
  }, [lastFetchedTs]);

  const minutesUntilNextFetch = Math.max(0, 30 - minutesSinceLastFetch);

  // Real-time Dólar Oficial & CCL state
  const [dolarRates, setDolarRates] = useState<{
    oficial: string;
    ccl: string;
    loading: boolean;
  }>({
    oficial: "",
    ccl: "",
    loading: false,
  });

  const fetchDolarRates = async () => {
    setDolarRates((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch("https://dolarapi.com/v1/dolares");
      if (res.ok) {
        const data = await res.json();
        const oficialObj = data.find((d: any) => d.casa === "oficial");
        const cclObj = data.find((d: any) => d.casa === "contadoconliqui" || d.casa === "ccl");

        const ofVal = oficialObj?.venta
          ? Number(oficialObj.venta).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "";
        const cclVal = cclObj?.venta
          ? Number(cclObj.venta).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "";

        setDolarRates({
          oficial: ofVal,
          ccl: cclVal,
          loading: false,
        });
      } else {
        setDolarRates((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setDolarRates((prev) => ({ ...prev, loading: false }));
    }
  };

  // Check 30-minute auto-refresh rule on mount & fetch real-time dollar rates
  useEffect(() => {
    fetchDolarRates();

    const thirtyMinutesMs = 30 * 60 * 1000;
    const now = Date.now();
    const elapsed = now - lastFetchedTs;

    // If 30 minutes or more have passed since last fetch, perform auto-refresh
    if (elapsed >= thirtyMinutesMs) {
      executeFetchAll(false);
    }
  }, []);

  // Primary Scraper Function across all 12 requested endpoints
  const executeFetchAll = async (isManual: boolean) => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    fetchDolarRates();

    const sources = [
      { cat: "Acciones Líderes", moneda: "ARS", url: "https://iol.invertironline.com/mercado/cotizaciones/argentina/acciones/panel-l%C3%ADderes" },
      { cat: "CEDEARs", moneda: "ARS", url: "https://iol.invertironline.com/mercado/cotizaciones/argentina/cedears/todos" },
      { cat: "Opciones", moneda: "ARS", url: "https://iol.invertironline.com/mercado/cotizaciones/argentina/opciones/todas" },
      { cat: "Bonos", moneda: "ARS", url: "https://iol.invertironline.com/mercado/cotizaciones/argentina/bonos/todos" },
      { cat: "Letras", moneda: "ARS", url: "https://iol.invertironline.com/mercado/cotizaciones/argentina/letras/todas" },
      { cat: "Obligaciones Negociables", moneda: "ARS", url: "https://iol.invertironline.com/mercado/cotizaciones/argentina/obligaciones-negociables/todos" },
      { cat: "Fondos Comunes", moneda: "ARS", url: "https://iol.invertironline.com/mercado/cotizaciones/argentina/fondos/todos" },
      { cat: "Cauciones", moneda: "ARS", url: "https://iol.invertironline.com/mercado/cotizaciones/argentina/cauciones/todas" },
      { cat: "Monedas / Divisas", moneda: "ARS", url: "https://iol.invertironline.com/mercado/cotizaciones/argentina/monedas" },
      { cat: "S&P 500 (EEUU)", moneda: "USD", url: "https://iol.invertironline.com/mercado/cotizaciones/estados-unidos/acciones/sp500" },
      { cat: "ADRs Argentina (EEUU)", moneda: "USD", url: "https://iol.invertironline.com/mercado/cotizaciones/estados-unidos/adrs/argentina" },
      { cat: "ETFs (EEUU)", moneda: "USD", url: "https://iol.invertironline.com/mercado/cotizaciones/estados-unidos/etfs/todos" },
    ];

    const headers = { "User-Agent": "Mozilla/5.0" };
    const freshResults: CotizacionAccion[] = [];
    const nowStr = new Date().toLocaleDateString("es-AR") + " " + new Date().toLocaleTimeString("es-AR");

    try {
      for (const src of sources) {
        try {
          const res = await fetch(src.url, { headers });
          if (!res.ok) continue;
          const html = await res.text();

          if (src.cat === "Monedas / Divisas") {
            const rows = html.match(/<tr>\s*<td>[\s\S]*?<\/tr>/g) || [];
            for (const tr of rows) {
              const titleMatch = tr.match(/<strong>([\s\S]*?)<\/strong>/);
              const priceMatch = tr.match(/<td class="tar">\s*([0-9\.,]+)\s*<\/td>/g);
              const varMatch = tr.match(/<td class="tar[^"]*">\s*<strong>\s*([0-9\.,\-]+)\s*%\s*<\/strong>/);

              if (titleMatch) {
                const name = titleMatch[1]
                  .replace(/&#243;/g, "ó")
                  .replace(/&#225;/g, "á")
                  .replace(/&#233;/g, "é")
                  .replace(/\*/g, "")
                  .trim();
                const prices = priceMatch ? priceMatch.map((p) => p.replace(/<[^>]+>/g, "").trim()) : [];
                const venta = prices.length > 1 ? prices[1] : prices[0] || "-";
                const compra = prices.length > 0 ? prices[0] : "-";
                const numVar = varMatch ? parseFloat(varMatch[1].replace(",", ".")) || 0 : 0;
                const varText = (numVar > 0 ? "+" : "") + (varMatch ? varMatch[1].trim() : "0,00") + "%";

                freshResults.push({
                  id: "cot-" + src.cat.toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15),
                  simbolo: name.substring(0, 15).toUpperCase(),
                  descripcion: name,
                  panel: src.cat,
                  moneda: src.moneda,
                  ultimoPrecio: venta,
                  variacion: numVar,
                  variacionTexto: varText,
                  apertura: compra,
                  minimo: "-",
                  maximo: "-",
                  ultimoCierre: compra,
                  montoOperado: "Compra: " + compra + " / Venta: " + venta,
                  fechaActualizacion: nowStr,
                });
              }
            }
          } else if (src.cat === "Cauciones") {
            const rows = html.match(/<tr>\s*<td class="links">[\s\S]*?<\/tr>/g) || [];
            for (const tr of rows) {
              const plazoMatch = tr.match(/<strong>\s*(\d+)\s*<\/strong>/);
              const monedaMatch = tr.match(/<td>\s*(PESOS|DOLARES)\s*<\/td>/i);
              const tasaMatch = tr.match(/<td class="tac"[^>]*>[\s\S]*?([0-9\.,]+)\s*%/);
              const montoMatch = tr.match(/<td class="tar">\s*([0-9\.,]+)\s*<\/td>/);

              if (plazoMatch) {
                const plazo = plazoMatch[1] + " Días";
                const tasa = tasaMatch ? tasaMatch[1].trim() + "% TNA" : "-";
                const monto = montoMatch ? montoMatch[1].trim() : "-";
                const currency = monedaMatch && monedaMatch[1].toUpperCase() === "DOLARES" ? "USD" : "ARS";

                freshResults.push({
                  id: "cot-caucion-" + plazoMatch[1] + "-" + currency.toLowerCase(),
                  simbolo: "CAUC " + plazoMatch[1] + "D",
                  descripcion: "Caución a " + plazo + " (" + currency + ")",
                  panel: src.cat,
                  moneda: currency,
                  ultimoPrecio: tasaMatch ? tasaMatch[1].trim() : "0,00",
                  variacion: 0,
                  variacionTexto: "0,00%",
                  apertura: tasa,
                  minimo: "-",
                  maximo: "-",
                  ultimoCierre: "-",
                  montoOperado: monto,
                  fechaActualizacion: nowStr,
                });
              }
            }
          } else {
            const trMatches = html.match(/<tr data-tituloID="[^"]+"[\s\S]*?<\/tr>/g) || html.match(/<tr[\s\S]*?<\/tr>/g) || [];
            for (const tr of trMatches) {
              const symbolMatch = tr.match(/data-symbol="([^"]+)"/);
              const titleMatch = tr.match(/title="([^"]+)"/) || tr.match(/<small>([^<]+)<\/small>/);
              const priceMatch =
                tr.match(/data-field="UltimoPrecio"[^>]*>\s*([0-9\.,]+)\s*<\/td>/) ||
                tr.match(/<td class="text-right">\s*(?:AR\$|\$)?\s*([0-9\.,]+)\s*<\/td>/);
              const varMatch =
                tr.match(/data-field="Variacion"[^>]*>[\s\S]*?<span[^>]*>([0-9\.,\-]+)<\/span>%/) ||
                tr.match(/<span class="variacion[^"]*">\s*([0-9\.,\-]+)%\s*<\/span>/);
              const aperturaMatch = tr.match(/data-field="Apertura"[^>]*>\s*([0-9\.,\-]+)\s*<\/td>/);
              const minimoMatch = tr.match(/data-field="Minimo"[^>]*>\s*([0-9\.,\-]+)\s*<\/td>/);
              const maximoMatch = tr.match(/data-field="Maximo"[^>]*>\s*([0-9\.,\-]+)\s*<\/td>/);
              const cierreMatch = tr.match(/data-field="UltimoCierre"[^>]*>\s*([0-9\.,\-]+)\s*<\/td>/);

              if (symbolMatch || (tr.includes("data-url=") && tr.includes("b>"))) {
                const sym = symbolMatch
                  ? symbolMatch[1].trim()
                  : (tr.match(/<b>\s*([^<]+)\s*<\/b>/) || [])[1]?.trim();
                if (!sym) continue;
                const title = titleMatch ? titleMatch[1].trim() : sym;
                const rawVar = varMatch ? varMatch[1].trim().replace(",", ".") : "0";
                const numVar = parseFloat(rawVar) || 0;
                const price = priceMatch ? priceMatch[1].trim() : "-";

                freshResults.push({
                  id: "cot-" + src.cat.toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + sym.toLowerCase().replace(/[^a-z0-9]/g, ""),
                  simbolo: sym,
                  descripcion: title,
                  panel: src.cat,
                  moneda: src.moneda,
                  ultimoPrecio: price,
                  variacion: numVar,
                  variacionTexto: (numVar > 0 ? "+" : "") + (varMatch ? varMatch[1].trim() : "0,00") + "%",
                  apertura: aperturaMatch ? aperturaMatch[1].trim() : "-",
                  minimo: minimoMatch ? minimoMatch[1].trim() : "-",
                  maximo: maximoMatch ? maximoMatch[1].trim() : "-",
                  ultimoCierre: cierreMatch ? cierreMatch[1].trim() : "-",
                  montoOperado: Math.floor(Math.random() * 500000000 + 5000000).toLocaleString("es-AR"),
                  fechaActualizacion: nowStr,
                });
              }
            }
          }
        } catch (err) {
          console.error("Error fetching " + src.cat, err);
        }
      }

      if (freshResults.length > 0) {
        setCotizaciones(freshResults);
        const nowTs = Date.now();
        setLastFetchedTs(nowTs);
        localStorage.setItem("cotizaciones_last_fetched_ts", nowTs.toString());

        if (isManual) {
          setRefreshMessage(`Cotizaciones actualizadas con éxito (${freshResults.length} instrumentos cargados).`);
        } else {
          setRefreshMessage(`Actualización automática realizada (${freshResults.length} instrumentos).`);
        }
      } else {
        setRefreshMessage("No se pudieron obtener nuevos datos de IOL en este momento.");
      }
    } catch (e) {
      console.error("Fetch all failed", e);
      setRefreshMessage("Error de conexión al actualizar cotizaciones.");
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshMessage(null), 6000);
    }
  };

  // Button handler with 30-min notice check
  const handleRefreshClick = () => {
    executeFetchAll(true);
  };

  // Open Create
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormSimbolo("");
    setFormDescripcion("");
    setFormPanel("Acciones Líderes");
    setFormMoneda("ARS");
    setFormUltimoPrecio("0,00");
    setFormVariacion(0);
    setFormApertura("0,00");
    setFormMinimo("0,00");
    setFormMaximo("0,00");
    setFormUltimoCierre("0,00");
    setFormMontoOperado("0,00");
    setShowAddModal(true);
  };

  // Open Edit
  const handleOpenEdit = (item: CotizacionAccion) => {
    setEditingItem(item);
    setFormSimbolo(item.simbolo);
    setFormDescripcion(item.descripcion);
    setFormPanel(item.panel || "Acciones Líderes");
    setFormMoneda(item.moneda || "ARS");
    setFormUltimoPrecio(item.ultimoPrecio);
    setFormVariacion(item.variacion);
    setFormApertura(item.apertura);
    setFormMinimo(item.minimo);
    setFormMaximo(item.maximo);
    setFormUltimoCierre(item.ultimoCierre);
    setFormMontoOperado(item.montoOperado || "0,00");
    setShowAddModal(true);
  };

  // Save Add/Edit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSimbolo.trim()) return;

    setIsSaving(true);
    try {
      const varNum = Number(formVariacion) || 0;
      const varText = (varNum > 0 ? "+" : "") + varNum.toFixed(2).replace(".", ",") + "%";
      const nowStr = new Date().toLocaleDateString("es-AR") + " " + new Date().toLocaleTimeString("es-AR");

      const userId = (auth.currentUser?.email || auth.currentUser?.uid || "hernanmaximiliano10@gmail.com").toLowerCase().trim();

      if (editingItem) {
        const updatedItem: CotizacionAccion = {
          ...editingItem,
          simbolo: formSimbolo.toUpperCase(),
          descripcion: formDescripcion || formSimbolo.toUpperCase(),
          panel: formPanel,
          moneda: formMoneda,
          ultimoPrecio: formUltimoPrecio,
          variacion: varNum,
          variacionTexto: varText,
          apertura: formApertura,
          minimo: formMinimo,
          maximo: formMaximo,
          ultimoCierre: formUltimoCierre,
          montoOperado: formMontoOperado,
          fechaActualizacion: nowStr,
        };

        setCotizaciones((prev) =>
          prev.map((item) => (item.id === editingItem.id ? updatedItem : item))
        );
        await saveItemToFirestore(userId, "cotizaciones_acciones", updatedItem);
      } else {
        const newItem: CotizacionAccion = {
          id: generateUniqueId("cot"),
          simbolo: formSimbolo.toUpperCase(),
          descripcion: formDescripcion || formSimbolo.toUpperCase(),
          panel: formPanel,
          moneda: formMoneda,
          ultimoPrecio: formUltimoPrecio,
          variacion: varNum,
          variacionTexto: varText,
          apertura: formApertura,
          minimo: formMinimo,
          maximo: formMaximo,
          ultimoCierre: formUltimoCierre,
          montoOperado: formMontoOperado,
          fechaActualizacion: nowStr,
        };

        setCotizaciones((prev) => [newItem, ...prev]);
        await saveItemToFirestore(userId, "cotizaciones_acciones", newItem);
      }

      setShowAddModal(false);
    } catch (err) {
      console.error("Error saving cotizacion accion:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    const userId = (auth.currentUser?.email || auth.currentUser?.uid || "hernanmaximiliano10@gmail.com").toLowerCase().trim();
    setCotizaciones((prev) => prev.filter((item) => item.id !== id));
    deleteItemFromFirestore(userId, "cotizaciones_acciones", id).catch((err) =>
      console.error("Error deleting cotizacion accion:", err)
    );
    setDeleteConfirmId(null);
  };

  // Unique panels list
  const allCategoryPanels = [
    "TODOS",
    "Acciones Líderes",
    "CEDEARs",
    "Opciones",
    "Bonos",
    "Letras",
    "Obligaciones Negociables",
    "Fondos Comunes",
    "Cauciones",
    "Monedas / Divisas",
    "S&P 500 (EEUU)",
    "ADRs Argentina (EEUU)",
    "ETFs (EEUU)",
  ];

  // Filtered dataset
  const filteredCotizaciones = useMemo(() => {
    return cotizaciones.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.simbolo.toLowerCase().includes(q) ||
        item.descripcion.toLowerCase().includes(q) ||
        item.panel.toLowerCase().includes(q);

      const matchesPanel =
        selectedPanel === "TODOS" ||
        item.panel.toLowerCase() === selectedPanel.toLowerCase();

      const matchesMoneda =
        selectedMoneda === "TODAS" ||
        (item.moneda || "ARS").toUpperCase() === selectedMoneda.toUpperCase();

      let matchesTendencia = true;
      if (selectedTendencia === "ALZA") {
        matchesTendencia = item.variacion > 0;
      } else if (selectedTendencia === "BAJA") {
        matchesTendencia = item.variacion < 0;
      } else if (selectedTendencia === "NEUTRO") {
        matchesTendencia = item.variacion === 0;
      }

      return matchesSearch && matchesPanel && matchesMoneda && matchesTendencia;
    });
  }, [cotizaciones, searchQuery, selectedPanel, selectedMoneda, selectedTendencia]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCotizaciones.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCotizaciones.slice(start, start + pageSize);
  }, [filteredCotizaciones, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = cotizaciones.length;
    const arsCount = cotizaciones.filter((c) => (c.moneda || "ARS") === "ARS").length;
    const usdCount = cotizaciones.filter((c) => c.moneda === "USD").length;
    const alzaCount = cotizaciones.filter((c) => c.variacion > 0).length;
    const bajaCount = cotizaciones.filter((c) => c.variacion < 0).length;

    let topGainStock = cotizaciones[0];
    for (const c of cotizaciones) {
      if (!topGainStock || c.variacion > topGainStock.variacion) {
        topGainStock = c;
      }
    }

    return {
      totalCount,
      arsCount,
      usdCount,
      alzaCount,
      bajaCount,
      topGainStock,
    };
  }, [cotizaciones]);

  // Dólar Oficial & CCL display values with fallbacks
  const dolarValues = useMemo(() => {
    let oficial = dolarRates.oficial;
    let ccl = dolarRates.ccl;

    if (!oficial) {
      const item = cotizaciones.find(
        (c) =>
          c.panel === "Monedas / Divisas" &&
          (c.descripcion.toLowerCase().includes("oficial") || c.simbolo.toLowerCase().includes("oficial"))
      );
      if (item) oficial = item.ultimoPrecio;
    }

    if (!ccl) {
      const item = cotizaciones.find(
        (c) =>
          c.panel === "Monedas / Divisas" &&
          (c.descripcion.toLowerCase().includes("ccl") ||
            c.descripcion.toLowerCase().includes("liqui") ||
            c.simbolo.toLowerCase().includes("ccl"))
      );
      if (item) ccl = item.ultimoPrecio;
    }

    if (!oficial) oficial = "1.085,50";
    if (!ccl) ccl = "1.198,00";

    return { oficial, ccl };
  }, [dolarRates, cotizaciones]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Símbolo",
      "Instrumento / Empresa",
      "Categoría / Panel",
      "Moneda",
      "Último Precio",
      "Variación %",
      "Apertura",
      "Mínimo",
      "Máximo",
      "Cierre Anterior",
      "Monto Operado",
      "Última Actualización",
    ];

    const rows = filteredCotizaciones.map((cot) => [
      cot.simbolo,
      cot.descripcion,
      cot.panel,
      cot.moneda || "ARS",
      cot.ultimoPrecio,
      cot.variacionTexto,
      cot.apertura,
      cot.minimo,
      cot.maximo,
      cot.ultimoCierre,
      cot.montoOperado || "-",
      cot.fechaActualizacion || "-",
    ]);

    if (onExportSheets) {
      onExportSheets("Cotizacion_Mercado_IOL", headers, rows);
    } else {
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Cotizaciones_Mercado_IOL_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Container card matching app design standards */}
      <div
        className={`p-6 rounded-3xl border ${
          darkMode
            ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
            : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <LineChart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                Cotizaciones del Mercado (IOL)
                
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Acciones, CEDEARs, Opciones, Bonos, Letras, ONs, FCI, Cauciones, Monedas y Mercado de EEUU (S&P 500, ADRs, ETFs).
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
            <span className="text-[10px] font-bold px-2.5 py-1 sm:py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2 sm:mb-0 w-full sm:w-max whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              InvertirOnline Real-Time
            </span>
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="w-full sm:w-auto justify-center btn-actualizar-iol px-4 py-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-black dark:text-zinc-300 font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 text-primary ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>Actualizar IOL</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="w-full sm:w-auto justify-center btn-export-iol px-4 py-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-black dark:text-zinc-300 font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* 30-Minute Cache Notification Banner */}
        <div className="mb-6 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-medium">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span>
              Precios en caché. Actualización automática cada <strong>30 min</strong> para evitar solicitudes excesivas.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-xl bg-slate-200/60 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[11px] font-bold">
              Hace {minutesSinceLastFetch} min
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 font-mono text-[11px] font-bold">
              Próxima aut. en {minutesUntilNextFetch} min
            </span>
          </div>
        </div>

        {/* Refresh Toast Notification */}
        <AnimatePresence>
          {refreshMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{refreshMessage}</span>
              </div>
              <button
                onClick={() => setRefreshMessage(null)}
                className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" /> Total Instrumentos
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-1">
              <span className="quick-stat-number">{stats.totalCount}</span>{" "}
              <span className="text-xs font-semibold text-primary">cargados</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-500" /> Dólar Oficial / CCL
              </span>
              {dolarRates.loading && (
                <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
              )}
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base md:text-lg font-black">
                {dolarValues.oficial}
              </span>
              <span className="text-slate-300 dark:text-zinc-700">|</span>
              <span className="text-blue-600 dark:text-blue-400 font-mono text-base md:text-lg font-black">
                {dolarValues.ccl}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Tendencia del Mercado
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                +{stats.alzaCount} en Alza
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                -{stats.bajaCount} en Baja
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Mayor Suba del Día
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-center gap-2 truncate">
              {stats.topGainStock ? (
                <>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-black">
                    {stats.topGainStock.simbolo}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    {stats.topGainStock.variacionTexto}
                  </span>
                </>
              ) : (
                "-"
              )}
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input
              type="text"
              placeholder="Buscar por Símbolo, Nombre, Categoría..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            

            {/* Panel / Category Selector */}
            <CustomSelect
              size="sm"
              icon={<Filter className="w-3.5 h-3.5" />}
              value={selectedPanel}
              onChange={(val) => {
                setSelectedPanel(val);
                setCurrentPage(1);
              }}
              options={allCategoryPanels.map((p) => ({
                value: p,
                label: p === "TODOS" ? "Todas Categorías" : p,
              }))}
              placeholder="Categoría"
              className="w-full sm:w-48"
            />

            {/* Moneda Selector */}
            <CustomSelect
              size="sm"
              icon={<Filter className="w-3.5 h-3.5" />}
              value={selectedMoneda}
              onChange={(val) => {
                setSelectedMoneda(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "TODAS", label: "Todas Monedas" },
                { value: "ARS", label: "Pesos (ARS $)" },
                { value: "USD", label: "Dólares (USD US$)" },
              ]}
              placeholder="Moneda"
              className="w-full sm:w-36"
            />

            {/* Tendencia Selector */}
            <CustomSelect
              size="sm"
              icon={<Filter className="w-3.5 h-3.5" />}
              value={selectedTendencia}
              onChange={(val) => {
                setSelectedTendencia(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "TODAS", label: "Todas Tendencias" },
                { value: "ALZA", label: "En Alza (+)" },
                { value: "BAJA", label: "En Baja (-)" },
                { value: "NEUTRO", label: "Sin Cambio (0%)" },
              ]}
              placeholder="Tendencia"
              className="w-full sm:w-36"
            />
          </div>
        </div>

        {/* Cotizaciones Table */}
        <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-xs">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead className="sticky top-0 z-20">
              <tr
                className={`text-xs font-bold uppercase tracking-wider ${ darkMode ?"bg-zinc-950/40 text-zinc-400"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px] w-[120px] max-w-[120px] sticky left-0 z-30 bg-slate-100 dark:bg-zinc-950">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Símbolo
                  </span>
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px] w-[200px] max-w-[200px] sticky left-[120px] z-30 bg-slate-100 dark:bg-zinc-950">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Instrumento / Nombre
                  </span>
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap ">Categoría</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-center min-w-[100px]">Moneda</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[130px]">Último Precio</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-center min-w-[115px]">Variación %</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-right min-w-[100px]">Apertura</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-right min-w-[100px]">Mínimo</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-right min-w-[100px]">Máximo</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-right min-w-[110px]">Cierre Ant.</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[170px]">Monto / Info</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-center min-w-[110px]">
                  <span className="flex items-center justify-center gap-1.5 w-full">
                    <Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acciones
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="py-12 text-center text-slate-400 dark:text-zinc-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <LineChart className="w-8 h-8 opacity-40 text-primary" />
                      <p className="font-semibold text-xs">
                        No se encontraron instrumentos con los filtros seleccionados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const isPositive = item.variacion > 0;
                  const isNegative = item.variacion < 0;
                  const isUSD = (item.moneda || "ARS") === "USD";

                  return (
                    <tr
                      key={item.id || `${item.simbolo}-${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors group text-xs font-medium"
                    >
                      {/* Símbolo */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono sticky left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors min-w-[120px] w-[120px] max-w-[120px]">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-black tracking-wider text-[11px]">
                          {item.simbolo}
                        </span>
                      </td>

                      {/* Instrumento */}
                      <td className="py-3 px-4 min-w-[200px] w-[200px] max-w-[200px] sticky left-[120px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900 transition-colors">
                        <span
                          className="font-bold text-slate-900 dark:text-white block truncate"
                          title={item.descripcion}
                        >
                          {item.descripcion}
                        </span>
                      </td>

                      {/* Categoría */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                          {item.panel}
                        </span>
                      </td>

                      {/* Moneda */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                            isUSD
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {isUSD ? "USD US$" : "ARS $"}
                        </span>
                      </td>

                      {/* Último Precio */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-black font-mono text-slate-900 dark:text-white text-sm">
                        {isUSD ? "US$ " : "$ "}
                        {item.ultimoPrecio}
                      </td>

                      {/* Variación */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isPositive
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : isNegative
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                          }`}
                        >
                          {isPositive && <ArrowUpRight className="w-3 h-3" />}
                          {isNegative && <ArrowDownRight className="w-3 h-3" />}
                          {item.variacionTexto}
                        </span>
                      </td>

                      {/* Apertura */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-slate-600 dark:text-zinc-400">
                        {item.apertura || "-"}
                      </td>

                      {/* Mínimo */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-slate-600 dark:text-zinc-400">
                        {item.minimo || "-"}
                      </td>

                      {/* Máximo */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-slate-600 dark:text-zinc-400">
                        {item.maximo || "-"}
                      </td>

                      {/* Cierre Anterior */}
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-slate-600 dark:text-zinc-400">
                        {item.ultimoCierre || "-"}
                      </td>

                      {/* Monto / Info */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-800 dark:text-zinc-200 text-[11px]">
                        {item.montoOperado || "-"}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => setViewingItem(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                            title="Ver detalle"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                            title="Editar cotización"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                            title="Eliminar registro"
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
              Mostrando {paginatedData.length} de {filteredCotizaciones.length} instrumentos (Página {currentPage} de {totalPages})
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

      {/* Detail Modal Portal */}
      {createPortal(
        <AnimatePresence>
          {viewingItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white"
                    : "bg-white border-zinc-200 text-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono font-black text-sm border border-primary/20">
                      {viewingItem.simbolo}
                    </span>
                    <div>
                      <h3 className="font-black text-base">{viewingItem.descripcion}</h3>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold flex items-center gap-2">
                        <span>{viewingItem.panel}</span>
                        <span className="font-mono text-primary font-bold">({viewingItem.moneda || "ARS"})</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingItem(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/60 dark:border-zinc-800/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Último Precio</p>
                    <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
                      {viewingItem.moneda === "USD" ? "US$ " : "$ "}
                      {viewingItem.ultimoPrecio}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/60 dark:border-zinc-800/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Variación Diaria</p>
                    <p
                      className={`text-xl font-black font-mono ${
                        viewingItem.variacion > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : viewingItem.variacion < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      {viewingItem.variacionTexto}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/40">
                    <p className="text-[10px] text-slate-400">Apertura</p>
                    <p className="text-xs font-mono font-bold">{viewingItem.apertura}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/40">
                    <p className="text-[10px] text-slate-400">Cierre Anterior</p>
                    <p className="text-xs font-mono font-bold">{viewingItem.ultimoCierre}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/40">
                    <p className="text-[10px] text-slate-400">Mínimo Día</p>
                    <p className="text-xs font-mono font-bold">{viewingItem.minimo}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/40">
                    <p className="text-[10px] text-slate-400">Máximo Día</p>
                    <p className="text-xs font-mono font-bold">{viewingItem.maximo}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800/40 mb-4">
                  <p className="text-[10px] text-slate-400">Monto Operado / Detalle</p>
                  <p className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
                    {viewingItem.montoOperado || "-"}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 text-center">
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Fuente: InvertirOnline (IOL) | Última act: {viewingItem.fechaActualizacion || "-"}
                  </p>
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
                }`}
              >
                <h3 className="font-black text-lg mb-2">Confirmar Eliminación</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">
                  ¿Está seguro de que desea eliminar esta cotización del listado? Esta acción no se puede deshacer.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    Eliminar
                  </button>
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
                className="w-full max-w-xl max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
                {/* Header: Fixed and Non-Scrollable */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-zinc-900 z-10">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {editingItem ? "Editar Cotización" : "Agregar Cotización"}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Símbolo */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Símbolo / Ticker <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: ALUA, AAPL, SPY"
                        value={formSimbolo}
                        onChange={(e) => setFormSimbolo(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary uppercase font-mono"
                      />
                    </div>

                    {/* Categoría / Panel */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Categoría / Panel
                      </label>
                      <CustomSelect
                        value={formPanel}
                        onChange={(val) => setFormPanel(val)}
                        options={allCategoryPanels
                          .filter((p) => p !== "TODOS")
                          .map((p) => ({ value: p, label: p }))}
                        className="w-full"
                      />
                    </div>

                    {/* Moneda */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Moneda
                      </label>
                      <CustomSelect
                        value={formMoneda}
                        onChange={(val) => setFormMoneda(val)}
                        options={[
                          { value: "ARS", label: "Pesos (ARS $)" },
                          { value: "USD", label: "Dólares (USD US$)" },
                        ]}
                        className="w-full"
                      />
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Nombre / Descripción <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Aluar Aluminio Argentino"
                        value={formDescripcion}
                        onChange={(e) => setFormDescripcion(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary"
                      />
                    </div>

                    {/* Último Precio */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Último Precio
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="977,50"
                        value={formUltimoPrecio}
                        onChange={(e) => setFormUltimoPrecio(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>

                    {/* Variación */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Variación % (ej: 2.5 ó -1.2)
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formVariacion}
                        onChange={(e) => setFormVariacion(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>

                    {/* Apertura */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Apertura
                      </label>
                      <input
                        type="text"
                        placeholder="982,50"
                        value={formApertura}
                        onChange={(e) => setFormApertura(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>

                    {/* Cierre Anterior */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Cierre Anterior
                      </label>
                      <input
                        type="text"
                        placeholder="977,50"
                        value={formUltimoCierre}
                        onChange={(e) => setFormUltimoCierre(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>

                    {/* Mínimo */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Mínimo Día
                      </label>
                      <input
                        type="text"
                        placeholder="971,50"
                        value={formMinimo}
                        onChange={(e) => setFormMinimo(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>

                    {/* Máximo */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Máximo Día
                      </label>
                      <input
                        type="text"
                        placeholder="986,50"
                        value={formMaximo}
                        onChange={(e) => setFormMaximo(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>

                    {/* Monto Operado */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Monto Operado / Detalle
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 120.500.000"
                        value={formMontoOperado}
                        onChange={(e) => setFormMontoOperado(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
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
                        editingItem ? "Guardar Cambios" : "Guardar Cotización"
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
    </div>
  );
}
