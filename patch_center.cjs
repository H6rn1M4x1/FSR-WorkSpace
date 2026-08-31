const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

content = content.replace(
  /<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-5">/g,
  '<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-9">'
);

content = content.replace(
  /<span className="text-\[8px\] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">/g,
  '<span className="text-[7px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">'
);

content = content.replace(
  /<span className="text-\[10px\] font-extrabold text-primary">/g,
  '<span className="text-[9px] font-extrabold text-primary">'
);

content = content.replace(
  /<span className="text-\[10px\] font-extrabold text-slate-500 dark:text-zinc-400">/g,
  '<span className="text-[9px] font-extrabold text-slate-500 dark:text-zinc-400">'
);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched size and centering");
