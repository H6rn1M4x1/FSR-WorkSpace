import { generateUniqueId } from "../utils/id";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { saveItemToFirestore, deleteItemFromFirestore } from "../lib/firestoreSyncService";
import { auth } from "../lib/supabase";
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { ConfirmationModal } from "./ConfirmationModal";
import { CotizacionCripto } from "../types";
import {
  Search,
  Download,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  Bitcoin,
  LineChart,
  RefreshCw,
  Clock,
  ShieldCheck,
  Settings,
  Layers,
  DollarSign,
  Loader2,
} from "lucide-react";

export const getCriptoSymbol = (cripto: CotizacionCripto) => {
  if (cripto.symbol) return cripto.symbol.toUpperCase();
  if (cripto.circulatingSupply) {
    const parts = cripto.circulatingSupply.trim().split(" ");
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.toUpperCase() !== lastPart.toLowerCase()) {
      return lastPart.toUpperCase();
    }
  }
  if (cripto.id === "bitcoin") return "BTC";
  if (cripto.id === "ethereum") return "ETH";
  if (cripto.id === "tether") return "USDT";
  if (cripto.id === "binancecoin") return "BNB";
  if (cripto.id === "usd-coin") return "USDC";
  if (cripto.id === "ripple") return "XRP";
  if (cripto.id === "solana") return "SOL";
  if (cripto.id === "tron") return "TRX";
  return (cripto.name || "").substring(0, 4).toUpperCase();
};

export const toTitleCase = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

interface CotizacionesCriptoTableProps {
  cotizaciones: CotizacionCripto[];
  setCotizaciones: React.Dispatch<React.SetStateAction<CotizacionCripto[]>>;
  darkMode: boolean;
  onExportSheets: (title: string, headers: string[], rows: any[][]) => void;
}

export default function CotizacionesCriptoTable({
  cotizaciones,
  setCotizaciones,
  darkMode,
  onExportSheets,
}: CotizacionesCriptoTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CotizacionCripto | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useLockBodyScroll(Boolean(showAddModal || editingItem));

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const [dolarCrypto, setDolarCrypto] = useState<string>("");
  const [dolarCryptoLoading, setDolarCryptoLoading] = useState<boolean>(false);

  const fetchDolarCrypto = async () => {
    setDolarCryptoLoading(true);
    try {
      const res = await fetch("https://dolarapi.com/v1/dolares");
      if (res.ok) {
        const data = await res.json();
        const cryptoObj = data.find((d: any) => d.casa === "cripto");
        if (cryptoObj?.venta) {
          const val = Number(cryptoObj.venta).toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          setDolarCrypto(val);
        }
      }
    } catch (e) {
      console.error("Error fetching dolar crypto", e);
    } finally {
      setDolarCryptoLoading(false);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchedTs, setLastFetchedTs] = useState<number>(() => {
    const saved = localStorage.getItem("cotizaciones_cripto_last_fetched_ts");
    return saved ? parseInt(saved, 10) : Date.now();
  });
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const fetchCryptoData = async (isManual: boolean = false) => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    fetchDolarCrypto();
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=1h,24h,7d');
      if (!res.ok) {
        setIsRefreshing(false);
        return;
      }
      const coins = await res.json();
      
      const formatCurrency = (val: number) => {
        if (!val) return '$0.00';
        if (val >= 1e12) return '$' + (val / 1e12).toFixed(2) + 'T';
        if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
        if (val >= 1e6) return '$' + (val / 1e6).toFixed(2) + 'M';
        if (val >= 1) return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
      };

      const formatSupply = (val: number, symbol: string) => {
        if (!val) return '0 ' + symbol.toUpperCase();
        if (val >= 1e12) return (val / 1e12).toFixed(2) + 'T ' + symbol.toUpperCase();
        if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B ' + symbol.toUpperCase();
        if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M ' + symbol.toUpperCase();
        return val.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' ' + symbol.toUpperCase();
      };

      const newData: CotizacionCripto[] = coins.map((coin: any) => ({
        id: coin.id,
        name: coin.name,
        price: formatCurrency(coin.current_price),
        percent1h: Number((coin.price_change_percentage_1h_in_currency || 0).toFixed(2)),
        percent24h: Number((coin.price_change_percentage_24h_in_currency || 0).toFixed(2)),
        percent7d: Number((coin.price_change_percentage_7d_in_currency || 0).toFixed(2)),
        marketCap: formatCurrency(coin.market_cap),
        volume24h: formatCurrency(coin.total_volume),
        circulatingSupply: formatSupply(coin.circulating_supply, coin.symbol),
        sentiment: (coin.price_change_percentage_24h_in_currency || 0) >= 0 ? "bullish" : "bearish",
        image: coin.image,
        symbol: coin.symbol.toUpperCase(),
      }));

      setCotizaciones((prev) => {
        const merged = [...prev];
        for (const newItem of newData) {
          const idx = merged.findIndex(c => c.id === newItem.id);
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...newItem, image: newItem.image || merged[idx].image };
          } else {
            merged.push(newItem);
          }
        }
        
        // Return merged array
        return merged.map(c => {
          if (!c.image || (c.id !== 'bitcoin' && c.image === 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png')) {
             return { ...c, image: undefined };
          }
          return c;
        });
      });
      
      const now = Date.now();
      setLastFetchedTs(now);
      localStorage.setItem("cotizaciones_cripto_last_fetched_ts", now.toString());

      if (isManual) {
        setRefreshMessage("Actualización completada exitosamente.");
        setTimeout(() => setRefreshMessage(null), 5000);
      }
    } catch (err) {
      console.error("Error fetching crypto data:", err);
      if (isManual) {
        setRefreshMessage("Error al actualizar criptomonedas.");
        setTimeout(() => setRefreshMessage(null), 5000);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDolarCrypto();
    const thirtyMinutesMs = 30 * 60 * 1000;
    const now = Date.now();
    const elapsed = now - lastFetchedTs;
    const missingImages = cotizaciones.some((c) => !c.image);
    const hasWrongFallbacks = cotizaciones.some(c => c.id !== 'bitcoin' && c.image === 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png');
    
    if (elapsed >= thirtyMinutesMs || missingImages || hasWrongFallbacks) {
      fetchCryptoData(false);
    }
    const interval = setInterval(() => fetchCryptoData(false), thirtyMinutesMs);
    return () => clearInterval(interval);
  }, []);

  const minutesSinceLastFetch = useMemo(() => {
    return Math.floor((Date.now() - lastFetchedTs) / (1000 * 60));
  }, [lastFetchedTs]);

  const minutesUntilNextFetch = Math.max(0, 30 - minutesSinceLastFetch);

  // Form State
  const [formName, setFormName] = useState("");
  const [formSymbol, setFormSymbol] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [form1h, setForm1h] = useState<number | "">("");
  const [form24h, setForm24h] = useState<number | "">("");
  const [form7d, setForm7d] = useState<number | "">("");
  const [formMarketCap, setFormMarketCap] = useState("");
  const [formVolume, setFormVolume] = useState("");
  const [formCirculating, setFormCirculating] = useState("");
  const [formSentiment, setFormSentiment] = useState("neutral");

  // Filtering
  const marketStats = useMemo(() => {
    let alzaCount = 0;
    let bajaCount = 0;
    let topGainer: CotizacionCripto | null = null;

    cotizaciones.forEach((c) => {
      if (c.percent24h > 0) alzaCount++;
      else if (c.percent24h < 0) bajaCount++;

      if (!topGainer || c.percent24h > topGainer.percent24h) {
        topGainer = c;
      }
    });

    return { alzaCount, bajaCount, topGainer };
  }, [cotizaciones]);

  const filteredCriptos = useMemo(() => {
    let result = cotizaciones;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cotizaciones, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCriptos.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCriptos.slice(start, start + pageSize);
  }, [filteredCriptos, currentPage, pageSize]);

  const handleExport = () => {
    const title = "Cotizaciones de Criptomonedas - " + new Date().toLocaleDateString();
    const headers = [
      "Name",
      "Symbol",
      "Price",
      "1h %",
      "24h %",
      "7d %",
      "Market Cap",
      "Volume(24h)",
      "Circulating Supply",
      "Sentiment",
    ];
    const rows = filteredCriptos.map((c) => [
      c.name,
      c.symbol || getCriptoSymbol(c),
      c.price,
      c.percent1h,
      c.percent24h,
      c.percent7d,
      c.marketCap,
      c.volume24h,
      c.circulatingSupply,
      c.sentiment,
    ]);
    onExportSheets(title, headers, rows);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormName("");
    setFormSymbol("");
    setFormImage("");
    setFormPrice("");
    setForm1h("");
    setForm24h("");
    setForm7d("");
    setFormMarketCap("");
    setFormVolume("");
    setFormCirculating("");
    setFormSentiment("neutral");
    setShowAddModal(true);
  };

  const openEditModal = (item: CotizacionCripto) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormSymbol(item.symbol || getCriptoSymbol(item));
    setFormImage(item.image || "");
    setFormPrice(item.price);
    setForm1h(item.percent1h);
    setForm24h(item.percent24h);
    setForm7d(item.percent7d);
    setFormMarketCap(item.marketCap);
    setFormVolume(item.volume24h);
    setFormCirculating(item.circulatingSupply);
    setFormSentiment(item.sentiment);
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const newItem: CotizacionCripto = {
        id: editingItem ? editingItem.id : generateUniqueId("c"),
        name: formName,
        price: formPrice,
        percent1h: Number(form1h) || 0,
        percent24h: Number(form24h) || 0,
        percent7d: Number(form7d) || 0,
        marketCap: formMarketCap,
        volume24h: formVolume,
        circulatingSupply: formCirculating,
        sentiment: formSentiment,
        image: formImage || undefined,
        symbol: formSymbol.toUpperCase() || undefined,
      };

      const userId = (auth.currentUser?.email || auth.currentUser?.uid || "hernanmaximiliano10@gmail.com").toLowerCase().trim();

      if (editingItem) {
        setCotizaciones((prev) =>
          prev.map((c) => (c.id === editingItem.id ? newItem : c))
        );
      } else {
        setCotizaciones((prev) => [newItem, ...prev]);
      }

      await saveItemToFirestore(userId, "cotizaciones_cripto", newItem);
      setShowAddModal(false);
    } catch (err) {
      console.error("Error saving cotizacion cripto:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const getPercentColor = (percent: number) => {
    if (percent > 0) return "text-emerald-500";
    if (percent < 0) return "text-red-500";
    return darkMode ? "text-zinc-400" : "text-slate-500";
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
              <Bitcoin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                Cotizaciones de Criptomonedas
                
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Top 100 criptomonedas del mercado con variaciones de precios en tiempo real.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
            <span className="text-[10px] font-bold px-2.5 py-1 sm:py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2 sm:mb-0 w-full sm:w-max whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              CoinGecko Real-Time
            </span>
            <button
              onClick={() => fetchCryptoData(true)}
              disabled={isRefreshing}
              className="w-full sm:w-auto justify-center btn-actualizar-coingecko px-4 py-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-black dark:text-zinc-300 font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 text-primary ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>Actualizar CoinGecko</span>
            </button>
            <button
              onClick={handleExport}
              className="w-full sm:w-auto justify-center btn-export-coingecko px-4 py-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-black dark:text-zinc-300 font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" /> Total Criptomonedas
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-1">
              <span className="quick-stat-number">{cotizaciones.length}</span>{" "}
              <span className="text-xs font-semibold text-primary">cargadas</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-500" /> Dólar Crypto
              </span>
              {dolarCryptoLoading && (
                <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
              )}
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base md:text-lg font-black">
                {dolarCrypto ? `$ ${dolarCrypto}` : "Cargando..."}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Tendencia del Mercado
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-baseline gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                +{marketStats.alzaCount} en Alza
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                -{marketStats.bajaCount} en Baja
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Mayor Suba del Día
            </div>
            <div className="text-lg md:text-xl font-black text-black dark:text-white flex items-center gap-2 truncate">
              {marketStats.topGainer ? (
                <>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-black">
                    {toTitleCase(marketStats.topGainer.name)}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    {marketStats.topGainer.percent24h > 0 ? '+' : ''}{marketStats.topGainer.percent24h}%
                  </span>
                </>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
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

        {/* Filter and Search Controls */}
        <div className="w-full mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input
              type="text"
              placeholder="Buscar criptomoneda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-xs">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-20">
              <tr className={`text-xs font-bold uppercase tracking-wider ${ darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px] w-[180px] max-w-[180px] md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950">
                  <span className="flex items-center gap-1.5">
                    <Bitcoin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Criptomoneda
                  </span>
                </th>
                <th className="py-3.5 px-3 whitespace-nowrap text-left min-w-[100px] w-[100px] max-w-[100px] md:sticky md:left-[180px] z-30 bg-slate-100 dark:bg-zinc-950">Abreviatura</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[120px]">Precio</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-right min-w-[90px]">1h %</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-right min-w-[90px]">24h %</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-right min-w-[90px]">7d %</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[140px]">Market Cap</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[140px]">Volumen (24h)</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[120px]">Circulación</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[120px]">Sentimiento</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[110px]">
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
                    colSpan={11}
                    className="py-12 text-center text-slate-400 dark:text-zinc-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <LineChart className="w-8 h-8 opacity-40 text-primary" />
                      <p className="font-semibold text-xs">
                        No se encontraron criptomonedas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((cripto, idx) => (
                  <tr
                    key={cripto.id || idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition-colors group text-xs font-medium"
                  >
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[180px] w-[180px] max-w-[180px]">
                      <div className="flex items-center gap-2">
                        {cripto.image ? (
                           <img src={cripto.image} alt={cripto.name} className="w-5 h-5 rounded-full" />
                        ) : (
                          <Bitcoin className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
                        )}
                        <span className="cripto-table-name text-xs font-black text-slate-900 dark:text-white">
                          {toTitleCase(cripto.name)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap text-left md:sticky md:left-[180px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[100px] w-[100px] max-w-[100px]">
                      <span className="text-xs font-black font-mono px-2 py-1 rounded bg-slate-100 dark:bg-zinc-950/50 text-slate-600 dark:text-zinc-400">
                        {cripto.symbol || getCriptoSymbol(cripto)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap text-right">
                      <span className="cripto-table-price text-xs font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-zinc-950/50 px-2 py-1 rounded-md">
                        {cripto.price}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap text-right">
                      <div className={"flex items-center justify-end gap-1 font-mono text-[11px] font-bold " + getPercentColor(cripto.percent1h)}>
                        {cripto.percent1h > 0 ? <TrendingUp className="w-3 h-3" /> : cripto.percent1h < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        <span>{Math.abs(cripto.percent1h)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap text-right">
                      <div className={"flex items-center justify-end gap-1 font-mono text-[11px] font-bold " + getPercentColor(cripto.percent24h)}>
                        {cripto.percent24h > 0 ? <TrendingUp className="w-3 h-3" /> : cripto.percent24h < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        <span>{Math.abs(cripto.percent24h)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-middle whitespace-nowrap text-right">
                      <div className={"flex items-center justify-end gap-1 font-mono text-[11px] font-bold " + getPercentColor(cripto.percent7d)}>
                        {cripto.percent7d > 0 ? <TrendingUp className="w-3 h-3" /> : cripto.percent7d < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        <span>{Math.abs(cripto.percent7d)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap text-right">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 font-mono">
                        {cripto.marketCap}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap text-right">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 font-mono">
                        {cripto.volume24h}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap text-right">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 font-mono">
                        {cripto.circulatingSupply}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                          cripto.sentiment === "bullish"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : cripto.sentiment === "bearish"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {cripto.sentiment}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(cripto)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-primary transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cripto.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
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

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
            <span>
              Mostrando {paginatedData.length} de {filteredCriptos.length} criptomonedas (Página {currentPage} de {totalPages})
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

      {/* Add / Edit Modal */}
      {showAddModal &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl flex flex-col max-h-[90vh] ${
                  darkMode
                    ? "bg-[#0a0a0a] border border-zinc-800"
                    : "bg-white border border-slate-100"
                }`}
              >
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800/40 bg-slate-50/50 dark:bg-[#0a0a0a] flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      {editingItem ? "Editar Criptomoneda" : "Nueva Criptomoneda"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar">
                  <form id="cripto-form" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Nombre <span className="text-primary">*</span>
                        </label>
                        <input
                          required
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Ej: Bitcoin"
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Abreviatura / Símbolo
                        </label>
                        <input
                          value={formSymbol}
                          onChange={(e) => setFormSymbol(e.target.value)}
                          placeholder="Ej: BTC"
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary transition-colors font-mono uppercase"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Image URL
                        </label>
                        <input
                          value={formImage}
                          onChange={(e) => setFormImage(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Price <span className="text-primary">*</span>
                        </label>
                        <input
                          required
                          value={formPrice}
                          onChange={(e) => setFormPrice(e.target.value)}
                          placeholder="Ej: $98,450.20"
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          1h %
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={form1h}
                          onChange={(e) => setForm1h(parseFloat(e.target.value))}
                          placeholder="Ej: 0.12"
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          24h %
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={form24h}
                          onChange={(e) => setForm24h(parseFloat(e.target.value))}
                          placeholder="Ej: 2.34"
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          7d %
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={form7d}
                          onChange={(e) => setForm7d(parseFloat(e.target.value))}
                          placeholder="Ej: 5.67"
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Market Cap
                        </label>
                        <input
                          value={formMarketCap}
                          onChange={(e) => setFormMarketCap(e.target.value)}
                          placeholder="Ej: $1.94T"
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Volume(24h)
                        </label>
                        <input
                          value={formVolume}
                          onChange={(e) => setFormVolume(e.target.value)}
                          placeholder="Ej: $45.2B"
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono transition-colors"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Circulating Supply
                        </label>
                        <input
                          value={formCirculating}
                          onChange={(e) => setFormCirculating(e.target.value)}
                          placeholder="Ej: 19.78M BTC"
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono transition-colors"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Sentiment
                        </label>
                        <select
                          value={formSentiment}
                          onChange={(e) => setFormSentiment(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                        >
                          <option value="bullish">Bullish</option>
                          <option value="neutral">Neutral</option>
                          <option value="bearish">Bearish</option>
                        </select>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-zinc-800/40 bg-slate-50/50 dark:bg-[#0a0a0a] flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => { if (!isSaving) setShowAddModal(false); }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="cripto-form"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      editingItem ? "Guardar Cambios" : "Agregar Cripto"
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmDeleteId}
        title="Eliminar Criptomoneda"
        message="¿Estás seguro de que deseas eliminar esta criptomoneda de tus cotizaciones?"
        onConfirm={async () => {
          if (confirmDeleteId) {
            const userId = (auth.currentUser?.email || auth.currentUser?.uid || "hernanmaximiliano10@gmail.com").toLowerCase().trim();
            setCotizaciones((prev) => prev.filter((c) => c.id !== confirmDeleteId));
            await deleteItemFromFirestore(userId, "cotizaciones_cripto", confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        onClose={() => setConfirmDeleteId(null)}
        darkMode={darkMode}
      />
    </div>
  );
}
