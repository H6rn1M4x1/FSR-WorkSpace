const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');

// Current top section structure:
// {/* 1. SECCIÓN SUPERIOR: NAVEGACIÓN PRINCIPAL DE PESTAÑAS */}
// <div className="relative flex items-center w-full">
// <div ref={tabsScrollRef} className="inversiones-toggle-container force-scroll-container w-full overflow-x-auto scroll-smooth md:overflow-visible scroll-smooth flex items-center scrollbar-none justify-start md:justify-center" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>

// Replace it with the container from FinanceView:
// <div className="relative flex flex-row items-center p-1 bg-slate-100/80 dark:bg-zinc-950/80 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/80 rounded-full w-full overflow-hidden mb-8">

content = content.replace(/\{\/\* 1\. SECCIÓN SUPERIOR: NAVEGACIÓN PRINCIPAL DE PESTAÑAS \*\/\}\s*<div className="relative flex items-center w-full">\s*<div ref=\{tabsScrollRef\}/g,
  `{/* 1. SECCIÓN SUPERIOR: NAVEGACIÓN PRINCIPAL DE PESTAÑAS */}
      <div className="relative flex flex-row items-center p-1 bg-slate-100/80 dark:bg-zinc-950/80 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/80 rounded-full w-full overflow-hidden mb-6">
                <div ref={tabsScrollRef}`);

fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf-8');
console.log("Fixed gym structure");
