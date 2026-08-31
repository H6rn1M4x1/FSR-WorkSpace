const fs = require('fs');
let c = fs.readFileSync('src/components/MealsView.tsx', 'utf8');

const tabs = [
  '{/* RENDER MERCADERIA TAB */}',
  '{/* RENDER ALIMENTOS TAB */}',
  '{/* RENDER PLATOS TAB */}'
];

for (const tab of tabs) {
  let start = c.indexOf(tab);
  if(start === -1) continue;
  let end = c.indexOf('{/* Filter & Search */}', start);
  if(end === -1) continue;
  
  let block = c.substring(start, end + '{/* Filter & Search */}'.length);
  
  // Replace wrapper
  block = block.replace(/className=\{`p-6 rounded-3xl border[\s\S]*?shadow-sm"\n\s*\}`\}/, `className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}`);
  
  // Replace Header
  block = block.replace(/\{\/\* Header \*\/\}\n\s*<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">/, `{/* Header Controls */}\n          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">`);
  
  // Replace Buttons wrapper
  block = block.replace(/<div className="flex gap-2">/, `<div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">\n              <div className="flex items-center gap-2">`);
  
  // Add closing div
  block = block.replace(/<\/div>\n\n\s*\{\/\* Filter & Search \*\/\}/, `  </div>\n            </div>\n\n          {/* Filters Bar */}`);
  
  c = c.substring(0, start) + block + c.substring(end + '{/* Filter & Search */}'.length);
}

c = c.replace(/className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary(-hover)? text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-xs self-start sm:self-center"/g, `className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"`);

fs.writeFileSync('src/components/MealsView.tsx', c);
