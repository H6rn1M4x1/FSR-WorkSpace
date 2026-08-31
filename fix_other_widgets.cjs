const fs = require('fs');

// 1. WeatherWidget.tsx
let weatherFile = 'src/components/WeatherWidget.tsx';
let weatherContent = fs.readFileSync(weatherFile, 'utf-8');
weatherContent = weatherContent.replace(
  /className="flex flex-col items-center justify-between p-1 rounded-xl bg-zinc-50 dark:bg-zinc-800\/40 border border-zinc-200\/60 dark:border-zinc-700\/40 text-center"/g,
  'className="flex flex-col items-center justify-between p-1 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center"'
);
fs.writeFileSync(weatherFile, weatherContent);
console.log("Updated WeatherWidget");

// 2. MultiTeamMatchWidget.tsx
let matchFile = 'src/components/MultiTeamMatchWidget.tsx';
let matchContent = fs.readFileSync(matchFile, 'utf-8');
matchContent = matchContent.replace(
  /className="bg-zinc-50 dark:bg-zinc-800\/40 border border-zinc-200\/60 dark:border-zinc-700\/40 rounded-2xl p-3\.5 flex flex-col justify-between hover:scale-\[1\.01\] hover:border-slate-300 dark:hover:border-zinc-600 transition-all shadow-xs relative overflow-hidden min-w-\[240px\] md:min-w-\[220px\] lg:flex-1 snap-start"/g,
  'className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between hover:scale-[1.01] hover:border-slate-300 dark:hover:border-zinc-600 transition-all shadow-xs relative overflow-hidden min-w-[240px] md:min-w-[220px] lg:flex-1 snap-start"'
);
fs.writeFileSync(matchFile, matchContent);
console.log("Updated MultiTeamMatchWidget");

