const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldFilter = `  const filteredQuotesForPicker = useMemo(() => {
    const q = tickerSearch.toLowerCase().trim();
    const cat = tickerCategoryFilter.toLowerCase();

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
  }, [allCotizaciones, tickerSearch, tickerCategoryFilter]);`;

const newFilter = `  const filteredQuotesForPicker = useMemo(() => {
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
  }, [allCotizaciones, cotizacionesCripto, tickerSearch, tickerCategoryFilter, formTipoMercado]);`;

content = content.replace(oldFilter, newFilter);

const oldModalCategories = `                {/* Categorias (Filter by Panel) */}
                <div className="shrink-0 mb-3 -mx-2 px-2 overflow-x-auto scrollbar-none flex gap-2">
                  {["TODOS", ...Array.from(new Set(allCotizaciones.map(c => c.panel)))].filter(Boolean).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setTickerCategoryFilter(cat)}
                      className={\`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border \${
                        tickerCategoryFilter === cat
                          ? "bg-primary text-white border-primary"
                          : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-primary/50"
                      }\`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>`;

const newModalCategories = `                {/* Categorias (Filter by Panel) */}
                {formTipoMercado === "Tradicional" && (
                  <div className="shrink-0 mb-3 -mx-2 px-2 overflow-x-auto scrollbar-none flex gap-2">
                    {["TODOS", ...Array.from(new Set(allCotizaciones.map(c => c.panel)))].filter(Boolean).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setTickerCategoryFilter(cat)}
                        className={\`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border \${
                          tickerCategoryFilter === cat
                            ? "bg-primary text-white border-primary"
                            : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-primary/50"
                        }\`}
                      >
                        {cat.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}`;

content = content.replace(oldModalCategories, newModalCategories);

// Also we need to make sure that the selection logic correctly handles Cripto selection
// find where `setFormTicker(c.simbolo)` happens
fs.writeFileSync(file, content);
