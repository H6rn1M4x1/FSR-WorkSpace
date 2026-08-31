const fs = require('fs');
let file = 'src/components/CotizacionesAccionesTable.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Remove from h2
let badgeRegex = /<span className="text-\[10px\] font-bold px-2\.5 py-0\.5 rounded-full bg-emerald-500\/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500\/20 uppercase tracking-widest flex items-center gap-1">\s*<span className="w-1\.5 h-1\.5 rounded-full bg-emerald-500 animate-pulse" \/>\s*InvertirOnline Real-Time\s*<\/span>/;
let match = content.match(badgeRegex);

if (match) {
  content = content.replace(badgeRegex, '');
  
  // Add before buttons
  let buttonDivRegex = /<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2\.5 w-full sm:w-auto mt-2 sm:mt-0">/;
  let replacement = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
            <span className="text-[10px] font-bold px-2.5 py-1 sm:py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2 sm:mb-0 w-full sm:w-max">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              InvertirOnline Real-Time
            </span>`;
            
  content = content.replace(buttonDivRegex, replacement);
  fs.writeFileSync(file, content);
  console.log("Updated Acciones Table header");
} else {
  console.log("Acciones badge not found");
}

let criptoFile = 'src/components/CotizacionesCriptoTable.tsx';
let criptoContent = fs.readFileSync(criptoFile, 'utf-8');

let criptoBadgeRegex = /<span className="text-\[10px\] font-bold px-2\.5 py-0\.5 rounded-full bg-emerald-500\/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500\/20 uppercase tracking-widest flex items-center gap-1">\s*<span className="w-1\.5 h-1\.5 rounded-full bg-emerald-500 animate-pulse" \/>\s*CoinGecko Real-Time\s*<\/span>/;
let criptoMatch = criptoContent.match(criptoBadgeRegex);

if (criptoMatch) {
  criptoContent = criptoContent.replace(criptoBadgeRegex, '');
  
  let criptoButtonDivRegex = /<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2\.5 w-full sm:w-auto mt-2 sm:mt-0">/;
  let criptoReplacement = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
            <span className="text-[10px] font-bold px-2.5 py-1 sm:py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2 sm:mb-0 w-full sm:w-max whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              CoinGecko Real-Time
            </span>`;
            
  criptoContent = criptoContent.replace(criptoButtonDivRegex, criptoReplacement);
  fs.writeFileSync(criptoFile, criptoContent);
  console.log("Updated Cripto Table header");
} else {
  console.log("Cripto badge not found");
}

