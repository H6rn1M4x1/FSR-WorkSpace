const fs = require('fs');

let content = fs.readFileSync('src/components/CotizacionesCriptoTable.tsx', 'utf8');

// we'll replace the return statement with the new styling matching CotizacionesAccionesTable.tsx
const newReturn = `  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchedTs, setLastFetchedTs] = useState<number>(() => {
    const saved = localStorage.getItem("cotizaciones_cripto_last_fetched_ts");
    return saved ? parseInt(saved, 10) : Date.now();
  });
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const fetchCryptoData = async (isManual: boolean = false) => {
    setIsRefreshing(true);
    setRefreshMessage(null);
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
      }));

      setCotizaciones(newData);
      
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
    const thirtyMinutesMs = 30 * 60 * 1000;
    const now = Date.now();
    const elapsed = now - lastFetchedTs;
    if (elapsed >= thirtyMinutesMs) {
      fetchCryptoData();
    }
    const interval = setInterval(() => fetchCryptoData(), thirtyMinutesMs);
    return () => clearInterval(interval);
  }, []);

  const minutesSinceLastFetch = useMemo(() => {
    return Math.floor((Date.now() - lastFetchedTs) / (1000 * 60));
  }, [lastFetchedTs]);

  const minutesUntilNextFetch = Math.max(0, 30 - minutesSinceLastFetch);
`;

const oldUseEffect = content.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[setCotizaciones\]\);/)[0];

content = content.replace(oldUseEffect, newReturn);
fs.writeFileSync('src/components/CotizacionesCriptoTable.tsx', content);

