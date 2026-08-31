const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

// 1. Update max-h-[400px] to max-h-[440px]
content = content.replaceAll('max-h-[400px]', 'max-h-[440px]');

// 2. Update the date render
const rawDateOld = `<span className="text-[11px] text-zinc-500 italic">
                                {log.date ? log.date.replace('T', ' ').replace('Z', '').split(':').slice(0, 2).join(':') : ''}{" "}
                                {bpTrendFilterPatient === "Todos" &&
                                  \`(\${log.patient || "Hernan"})\`}
                              </span>`;

const newRenderDate = `{(() => {
                                const rawDate = log.date || "";
                                let datePart = rawDate;
                                let timePart = "";
                                if (rawDate.includes("T")) {
                                  [datePart, timePart] = rawDate.split("T");
                                } else if (rawDate.includes(" ")) {
                                  [datePart, timePart] = rawDate.split(" ");
                                }
                                timePart = timePart.replace("Z", "").split(":").slice(0, 2).join(":");

                                return (
                                  <span className="text-zinc-600 dark:text-zinc-400 font-normal text-sm">
                                    {datePart}
                                    {timePart && <span className="text-xs italic text-zinc-400 dark:text-zinc-500 ml-1.5">{timePart}</span>}
                                    {bpTrendFilterPatient === "Todos" && (
                                      <span className="text-[11px] italic text-zinc-400 ml-1.5">
                                        ({log.patient || "Hernan"})
                                      </span>
                                    )}
                                  </span>
                                );
                              })()}`;

if (content.includes(rawDateOld)) {
  content = content.replace(rawDateOld, newRenderDate);
  fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
  console.log("Patched successfully");
} else {
  console.log("Error: Could not find rawDateOld block");
}

