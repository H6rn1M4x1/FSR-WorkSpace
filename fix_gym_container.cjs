const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');

// The container currently looks like:
// className={`p-1.5 rounded-2xl border flex flex-nowrap items-center gap-1.5 overflow-x-auto scroll-smooth whitespace-nowrap scrollbar-none w-full px-9 ${
//   darkMode ? "bg-zinc-800/40 border-zinc-700/40" : "bg-slate-100/60 border-slate-200/80"
// }`}

// We need to change it to use a rounded-full pill shape like HealthView:
// className="flex items-center justify-start sm:justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-lg w-full max-w-full overflow-x-auto scroll-smooth scrollbar-none whitespace-nowrap"

content = content.replace(/className={\`p-1\.5 rounded-2xl border flex flex-nowrap items-center gap-1\.5 overflow-x-auto scroll-smooth whitespace-nowrap scrollbar-none w-full px-9 \$\{\s*darkMode \? "bg-zinc-800\/40 border-zinc-700\/40" : "bg-slate-100\/60 border-slate-200\/80"\s*\}\`}/g, 'className="flex items-center justify-start sm:justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-lg w-full max-w-full overflow-x-auto scroll-smooth scrollbar-none whitespace-nowrap"');

// While we are here, let's fix the extra font-black font-black that might have happened:
content = content.replace(/font-black font-black/g, 'font-black');

fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf-8');
console.log("Fixed gym container");
