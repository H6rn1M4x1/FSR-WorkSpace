const fs = require('fs');

let content = fs.readFileSync('src/components/CotizacionesCriptoTable.tsx', 'utf8');

const returnStatementOld = content.substring(content.indexOf('  return ('));

const newJSX = `  return (
    <div className="space-y-6">
      {/* Container card matching app design standards */}
      <div
        className={\`p-6 rounded-3xl border \${
          darkMode
            ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
            : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
        }\`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Bitcoin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                Cotizaciones de Criptomonedas
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  CoinGecko Real-Time
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Top 100 criptomonedas del mercado con variaciones de precios en tiempo real.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fetchCryptoData(true)}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-black dark:text-zinc-300 font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={\`w-4 h-4 text-primary \${
                  isRefreshing ? "animate-spin" : ""
                }\`}
              />
              <span>Actualizar CoinGecko</span>
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-black dark:text-zinc-300 font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-full bg-primary text-white dark:text-blue-950 font-bold text-xs hover:bg-primary-hover shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Cripto</span>
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

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
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
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20">
              <tr className={\`border-b text-xs font-bold uppercase tracking-wider \${ darkMode ?"bg-zinc-950/40 border-zinc-800/60 text-zinc-400" : "bg-slate-50 border-slate-100 text-slate-500"}\`}>
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">
                  <span className="flex items-center gap-1.5">
                    <Bitcoin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Criptomoneda
                  </span>
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[120px]">Precio</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-right min-w-[90px]">1h %</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-right min-w-[90px]">24h %</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-right min-w-[90px]">7d %</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[140px]">Market Cap</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[140px]">Volumen (24h)</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right min-w-[160px]">Circulación</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[120px]">Sentimiento</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-center min-w-[110px]">
                  <span className="flex items-center justify-center gap-1.5 w-full">
                    <Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acciones
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {filteredCriptos.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
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
                filteredCriptos.map((cripto, idx) => (
                  <tr
                    key={cripto.id || idx}
                    className="dark:hover:bg-zinc-800/30 transition-colors group text-xs font-medium hover:outline hover:outline-1 hover:outline-slate-300 hover:-outline-offset-1 dark:hover:outline-none"
                  >
                    <td className="px-4 py-3 align-middle sticky left-0 z-10 bg-white dark:bg-zinc-900 group-hover:bg-slate-50 dark:group-hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                          {cripto.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-zinc-950/50 px-2 py-1 rounded-md">
                        {cripto.price}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-right">
                      <div className={"flex items-center justify-end gap-1 font-mono text-[11px] font-bold " + getPercentColor(cripto.percent1h)}>
                        {cripto.percent1h > 0 ? <TrendingUp className="w-3 h-3" /> : cripto.percent1h < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        <span>{Math.abs(cripto.percent1h)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle text-right">
                      <div className={"flex items-center justify-end gap-1 font-mono text-[11px] font-bold " + getPercentColor(cripto.percent24h)}>
                        {cripto.percent24h > 0 ? <TrendingUp className="w-3 h-3" /> : cripto.percent24h < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        <span>{Math.abs(cripto.percent24h)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle text-right">
                      <div className={"flex items-center justify-end gap-1 font-mono text-[11px] font-bold " + getPercentColor(cripto.percent7d)}>
                        {cripto.percent7d > 0 ? <TrendingUp className="w-3 h-3" /> : cripto.percent7d < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        <span>{Math.abs(cripto.percent7d)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 font-mono">
                        {cripto.marketCap}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 font-mono">
                        {cripto.volume24h}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 font-mono">
                        {cripto.circulatingSupply}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-center">
                      <span
                        className={\`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide \${
                          cripto.sentiment === "bullish"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : cripto.sentiment === "bearish"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                        }\`}
                      >
                        {cripto.sentiment}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-center">
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
      </div>

${returnStatementOld.substring(returnStatementOld.indexOf('{/* Add / Edit Modal */}'))}
`;

content = content.replace(returnStatementOld, newJSX);
fs.writeFileSync('src/components/CotizacionesCriptoTable.tsx', content);

