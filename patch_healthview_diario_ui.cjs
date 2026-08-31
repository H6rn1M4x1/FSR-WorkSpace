const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

const targetTableStart = `                <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">
                  <table className="w-full text-left text-sm border-separate border-spacing-y-2">`;

const newTableStart = `                {/* Mini Calendario Semanal - Historial Diario */}
                <div className={\`p-4 rounded-3xl border \${darkMode ? "bg-zinc-900/20 border-zinc-800/60 text-white" : "bg-slate-50/40 border-slate-200/50 text-slate-800"} space-y-3\`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Balance Semanal Diario
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {diarioWeekData.map((day, dIdx) => {
                      const isToday = new Date().toDateString() === day.dateObj.toDateString();
                      const isSelected = selectedDiarioDate && selectedDiarioDate.toDateString() === day.dateObj.toDateString();
                      return (
                        <div
                          key={dIdx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDiarioDate(null);
                            } else {
                              setSelectedDiarioDate(day.dateObj);
                            }
                          }}
                          className={\`p-3 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 \${
                            isSelected
                              ? "bg-primary text-white shadow-md ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 border-transparent"
                              : day.hasActivity
                              ? darkMode
                                ? "bg-zinc-900/50 border border-primary/50 text-zinc-100 shadow-xs hover:bg-zinc-800/80"
                                : "bg-primary/5 border border-primary/30 text-slate-800 shadow-xs hover:bg-primary/10"
                              : darkMode
                              ? "bg-zinc-950/20 border border-zinc-800/20 text-zinc-500 hover:bg-zinc-900/50"
                              : "bg-white/40 border border-slate-100 text-slate-400 hover:bg-slate-50"
                          } \${isToday && !isSelected ? "ring-2 ring-primary/60 dark:ring-primary/40" : ""}\`}
                        >
                          <span className={\`text-[9px] font-extrabold tracking-wider \${isSelected ? "text-white/80" : isToday ? "text-primary dark:text-primary-light" : "text-slate-400 dark:text-zinc-500"}\`}>
                            {day.dayLabel}
                          </span>
                          <span className="text-sm font-extrabold mt-0.5">
                            {day.dayNumber}
                          </span>
                          <span className={\`text-[8px] font-mono font-bold mt-1.5 \${isSelected ? "text-white/90" : day.balance > 0 ? "text-amber-500 dark:text-amber-400" : day.balance < 0 ? "text-green-500 dark:text-green-400" : "text-slate-400 dark:text-zinc-600"}\`}>
                            {Math.round(day.balance)} kcal
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Filter Status */}
                {selectedDiarioDate && (
                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                      Mostrando historial del: <span className="font-extrabold text-slate-800 dark:text-zinc-200">{selectedDiarioDate.toLocaleDateString("es-AR", { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </span>
                    <button
                      onClick={() => setSelectedDiarioDate(null)}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                    >
                      Limpiar filtro
                    </button>
                  </div>
                )}
                
                {/* List Table */}
                <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">
                  <table className="w-full text-left text-sm border-separate border-spacing-y-2">`;

// Note we only want to replace the SECOND occurrence, or rather the Historial Diario one.
// Let's replace the last occurrence since it's the second table.
const parts = content.split(targetTableStart);
if (parts.length >= 3) {
  content = parts[0] + targetTableStart + parts[1] + newTableStart + parts[2];
  console.log("Patched diario table start");
}

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
