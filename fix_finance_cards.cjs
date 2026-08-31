const fs = require('fs');
let file = 'src/components/FinanceView.tsx';
let lines = fs.readFileSync(file, 'utf-8').split('\n');

for (let i = 1460; i < 1500; i++) {
  if (lines[i] && lines[i].includes('className="flex flex-col gap-2 p-3 rounded-2xl border border-primary/25')) {
    lines[i] = '                              className="flex flex-col gap-2 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 cursor-pointer group relative overflow-hidden"';
  }
}

fs.writeFileSync(file, lines.join('\n'));
console.log("Updated FinanceView unpaid cards");
