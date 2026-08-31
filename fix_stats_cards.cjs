const fs = require('fs');

const files = [
  'src/components/InversionesTable.tsx',
  'src/components/CotizacionesAccionesTable.tsx',
  'src/components/CotizacionesCriptoTable.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(
    /className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950\/40 border border-slate-200\/60 dark:border-zinc-800\/50"/g,
    'className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"'
  );
  fs.writeFileSync(file, content);
  console.log("Updated " + file);
}
