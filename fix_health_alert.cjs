const fs = require('fs');

const file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /className=\{`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer group relative overflow-hidden \$\{\n\s*details\.estado === "Comprar Medicamento"\n\s*\? "bg-red-500\/5 border-red-500\/20 text-red-600 dark:text-red-400 hover:border-red-500 hover:ring-2 hover:ring-red-500\/10"\n\s*: "bg-primary\/10 border-primary\/20 text-primary dark:text-primary hover:border-primary hover:ring-2 hover:ring-primary\/10"\n\s*\}`\}/g,
  'className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer group relative overflow-hidden ${details.estado === "Comprar Medicamento" ? "bg-white dark:bg-zinc-950 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20" : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-primary hover:bg-zinc-50 dark:hover:bg-zinc-900"}`}'
);

fs.writeFileSync(file, content);
console.log("Updated HealthView alert cards");
