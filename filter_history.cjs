const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf8');

const targetList = `          <div className="space-y-3">
            {combinedHistory.map((item, idx) => {`;

const newTargetList = `          {/* Filter Status */}
          {selectedFilterDate && (
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                Mostrando actividades del: <span className="font-extrabold text-slate-800 dark:text-zinc-200">{selectedFilterDate.toLocaleDateString("es-AR", { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              </span>
              <button
                onClick={() => setSelectedFilterDate(null)}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
              >
                Limpiar filtro
              </button>
            </div>
          )}
          <div className="space-y-3">
            {(() => {
              const filteredHistory = combinedHistory.filter(item => {
                if (!selectedFilterDate) return true;
                const dateStr = item.tipo === "gym" ? item.gym.fecha : item.other.fecha;
                const d = new Date(dateStr);
                return d.toDateString() === selectedFilterDate.toDateString();
              });

              if (filteredHistory.length === 0) {
                return (
                  <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                    <Activity className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-3" />
                    <p className="text-sm font-bold text-slate-400 dark:text-zinc-500">No hay sesiones registradas para este día.</p>
                  </div>
                );
              }

              return filteredHistory.map((item, idx) => {`;

content = content.replace(targetList, newTargetList);

const endTarget = `                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>`;

const newEndTarget = `                      </div>
                    </div>
                  </div>
                );
              }
            });
            })()}
          </div>`;

content = content.replace(endTarget, newEndTarget);

fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf8');
console.log("Replaced history loop");
