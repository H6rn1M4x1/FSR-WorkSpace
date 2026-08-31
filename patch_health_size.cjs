const fs = require('fs');
let file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const regex = /size === "sm"\s*\?\s*"px-2\.5 py-1\.5[^"]+"/;
content = content.replace(regex, 'size === "sm"\n            ? "px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold focus:border-primary"');
fs.writeFileSync(file, content);
console.log("Updated HealthView");
