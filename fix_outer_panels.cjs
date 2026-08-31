const fs = require('fs');
let file = 'src/components/FinanceView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// The outer panels use this block:
//                    darkMode
//                      ? "bg-black/60 backdrop-blur-md border-zinc-800/80 text-white shadow-lg"
//                      : "bg-white border-zinc-200 text-zinc-800 shadow-sm"

content = content.replace(/\?\s*"bg-black\/60 backdrop-blur-md border-zinc-800\/80 text-white shadow-lg"\s*:\s*"bg-white border-zinc-200 text-zinc-800 shadow-sm"/g,
`? "bg-zinc-900/60 backdrop-blur-md border-zinc-800/80 text-white shadow-lg"
                      : "bg-white/80 backdrop-blur-md border-slate-200/80 text-zinc-800 shadow-sm"`);

// There is one at 2337:
//                  darkMode
//                    ? "bg-black/60 border-zinc-800/80 text-white"
//                    : "bg-white/70 border-slate-200/80 text-zinc-800 shadow-sm"
content = content.replace(/\?\s*"bg-black\/60 border-zinc-800\/80 text-white"\s*:\s*"bg-white\/70 border-slate-200\/80 text-zinc-800 shadow-sm"/g,
`? "bg-zinc-900/60 border-zinc-800/80 text-white"
                    : "bg-white/80 backdrop-blur-md border-slate-200/80 text-zinc-800 shadow-sm"`);

fs.writeFileSync(file, content);
console.log("Updated FinanceView outer panels");
