const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

// Fix parent div
content = content.replace(/justify-center gap-2 mb-8 w-full max-w-fit mx-auto/g, 'justify-center gap-2 mb-8 w-full max-w-full px-2 mx-auto');

// Fix inner scrollable div
content = content.replace(/justify-center gap-1.5 p-1.5 bg-white\/80 dark:bg-zinc-900\/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-lg w-full max-w-fit mx-auto/g, 'justify-start md:justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-lg w-full max-w-full mx-auto');

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf-8');
console.log("Done");
