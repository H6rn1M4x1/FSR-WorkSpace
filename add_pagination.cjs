const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

// 1. Add state variable
if (!content.includes('const [bpTrendPage, setBpTrendPage] = useState(1);')) {
  content = content.replace(
    'const [bpTrendFilterPatient, setBpTrendFilterPatient] = useState("Todos");',
    'const [bpTrendFilterPatient, setBpTrendFilterPatient] = useState("Todos");\n  const [bpTrendPage, setBpTrendPage] = useState(1);'
  );
}

// 2. Modify the render block for BP list
const bpListOld = `                    return (
                      <AnimatedList<BloodPressureLog>
                        items={trendBpLogs}
                        showGradients={true}
                        enableArrowNavigation={true}
                        className="flex-1 overflow-y-auto min-h-0 pr-1"
                        style={{
                          '--gradient-color': darkMode ? '#18181b' : '#ffffff',
                        } as React.CSSProperties}
                        renderItem={(log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between text-xs p-2 rounded-xl bg-zinc-500/5 border border-zinc-800/10"
                          >
                            <span className="text-zinc-500 font-medium">
                              {log.date}{" "}
                              {bpTrendFilterPatient === "Todos" &&
                                \`(\${log.patient || "Hernan"})\`}
                            </span>
                            <span className="font-extrabold font-mono">
                              {log.systolic}/{log.diastolic} mmHg (Pulso:{" "}
                              {log.pulse})
                            </span>
                            <button
                              onClick={() => handleDeleteBpLog(log.id)}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      />
                    );`;

const bpListNew = `                    const itemsPerPage = 3;
                    const totalPages = Math.ceil(trendBpLogs.length / itemsPerPage);
                    const safePage = Math.min(bpTrendPage, Math.max(totalPages, 1));
                    const startIndex = (safePage - 1) * itemsPerPage;
                    const paginatedLogs = trendBpLogs.slice(startIndex, startIndex + itemsPerPage);

                    return (
                      <div className="flex flex-col h-full min-h-0">
                        <AnimatedList<BloodPressureLog>
                          items={paginatedLogs}
                          showGradients={true}
                          enableArrowNavigation={true}
                          className="flex-1 overflow-y-auto min-h-0 pr-1"
                          style={{
                            '--gradient-color': darkMode ? '#18181b' : '#ffffff',
                          } as React.CSSProperties}
                          renderItem={(log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-xs p-2 rounded-xl bg-zinc-500/5 border border-zinc-800/10 mb-1.5"
                            >
                              <span className="text-zinc-500 font-medium">
                                {log.date}{" "}
                                {bpTrendFilterPatient === "Todos" &&
                                  \`(\${log.patient || "Hernan"})\`}
                              </span>
                              <span className="font-extrabold font-mono">
                                {log.systolic}/{log.diastolic} mmHg (Pulso:{" "}
                                {log.pulse})
                              </span>
                              <button
                                onClick={() => handleDeleteBpLog(log.id)}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        />
                        {trendBpLogs.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-2 px-1 text-[10px] text-zinc-500 font-medium shrink-0">
                            <span>
                              Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, trendBpLogs.length)} de {trendBpLogs.length} registros
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setBpTrendPage(p => Math.max(p - 1, 1))}
                                disabled={safePage <= 1}
                                className="p-1 rounded border border-slate-200 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Página Anterior"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-1.5 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                {safePage} / {totalPages}
                              </span>
                              <button
                                onClick={() => setBpTrendPage(p => Math.min(p + 1, totalPages))}
                                disabled={safePage >= totalPages}
                                className="p-1 rounded border border-slate-200 dark:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Página Siguiente"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );`;

if (content.includes('items={trendBpLogs}')) {
  content = content.replace(bpListOld, bpListNew);
} else {
  console.log("Could not find the target block to replace.");
}

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Done");
