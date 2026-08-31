const fs = require('fs');

const file = 'src/components/CotizacionesCriptoTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const filterCode = `  const filteredCriptos = useMemo(() => {`;

const statsCode = `  const marketStats = useMemo(() => {
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

  const filteredCriptos = useMemo(() => {`;

content = content.replace(filterCode, statsCode);

const uiAnchor = `{/* 30-Minute Cache Notification Banner */}`;

const widgetsUI = `        {/* Market Stats Widgets */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/60 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
              <TrendingUp className="w-3 h-3" />
              Tendencia del mercado
            </div>
            <div className="flex items-center gap-3 text-sm md:text-base font-black">
              <span className="text-emerald-500">+{marketStats.alzaCount} en Alza</span>
              <span className="text-red-500">{marketStats.bajaCount > 0 ? \`-\${marketStats.bajaCount}\` : "0"} en Baja</span>
            </div>
          </div>
          
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/60 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
              <TrendingUp className="w-3 h-3" />
              Mayor suba del día
            </div>
            <div className="flex items-center gap-3 text-sm md:text-base font-black">
              {marketStats.topGainer ? (
                <>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono text-xs md:text-sm uppercase tracking-wide">
                    {marketStats.topGainer.name}
                  </span>
                  <span className="text-emerald-500">{marketStats.topGainer.percent24h > 0 ? '+' : ''}{marketStats.topGainer.percent24h}%</span>
                </>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          </div>
        </div>

        {/* 30-Minute Cache Notification Banner */}`;

content = content.replace(uiAnchor, widgetsUI);

fs.writeFileSync(file, content);
