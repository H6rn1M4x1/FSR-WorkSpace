const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf8');

const targetCalendarDay = `                return (
                  <div
                    key={dIdx}
                    className={\`p-3 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 \${
                      day.hasActivity
                        ? darkMode
                          ? "bg-zinc-900/50 border border-primary/50 text-zinc-100 shadow-xs"
                          : "bg-primary/5 border border-primary/30 text-slate-800 shadow-xs"
                        : darkMode
                        ? "bg-zinc-950/20 border border-zinc-800/20 text-zinc-500"
                        : "bg-white/40 border border-slate-100 text-slate-400"
                    } \${isToday ? "ring-2 ring-primary/60 dark:ring-primary/40" : ""}\`}
                  >`;

const newCalendarDay = `                const isSelected = selectedFilterDate && selectedFilterDate.toDateString() === day.dateObj.toDateString();
                return (
                  <div
                    key={dIdx}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFilterDate(null);
                      } else {
                        setSelectedFilterDate(day.dateObj);
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
                  >`;

content = content.replace(targetCalendarDay, newCalendarDay);

// We need to also adjust text colors for selected state:
const labelTarget = `<span className={\`text-[9px] font-extrabold tracking-wider \${isToday ? "text-primary dark:text-primary-light" : "text-slate-400 dark:text-zinc-500"}\`}>`;
const labelNew = `<span className={\`text-[9px] font-extrabold tracking-wider \${isSelected ? "text-white/80" : isToday ? "text-primary dark:text-primary-light" : "text-slate-400 dark:text-zinc-500"}\`}>`;

const calsTarget = `<span className={\`text-[8px] font-mono font-bold mt-1.5 \${day.calories > 0 ? "text-primary dark:text-primary-light" : "text-slate-400 dark:text-zinc-600"}\`}>`;
const calsNew = `<span className={\`text-[8px] font-mono font-bold mt-1.5 \${isSelected ? "text-white/90" : day.calories > 0 ? "text-primary dark:text-primary-light" : "text-slate-400 dark:text-zinc-600"}\`}>`;

content = content.replace(labelTarget, labelNew);
content = content.replace(calsTarget, calsNew);

fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf8');
console.log("Patched calendar");
