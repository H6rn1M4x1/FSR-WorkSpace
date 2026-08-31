const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');

// There's a wrapper for GymRutinaView tabs that looks like:
// <div className="relative mb-8 max-w-4xl mx-auto overflow-hidden rounded-2xl">
//   <button ... className="absolute left-1 z-20..." ... />
//   <div ref={tabsScrollRef} className="flex items-center justify-start sm:justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-lg w-full max-w-full overflow-x-auto scroll-smooth scrollbar-none whitespace-nowrap" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>

// Let's ensure the parent container doesn't have `rounded-2xl` or block backgrounds that conflict.
content = content.replace(/className="relative mb-8 max-w-4xl mx-auto overflow-hidden rounded-2xl"/g, 'className="relative flex flex-row items-center p-1 bg-slate-100/80 dark:bg-zinc-950/80 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/80 rounded-full w-full overflow-hidden"');

// And remove the arrows completely as we want it to look like the pills without side buttons
content = content.replace(/<button[^>]*aria-label="Desplazar izquierda"[^>]*>[\s\S]*?<\/button>/g, '');
content = content.replace(/<button[^>]*aria-label="Desplazar derecha"[^>]*>[\s\S]*?<\/button>/g, '');

// Also we need to make sure the scroll ref div is formatted exactly like the other ones:
content = content.replace(/<div\s+ref=\{tabsScrollRef\}\s+className="flex items-center justify-start sm:justify-center gap-1\.5 p-1\.5 bg-white\/80 dark:bg-zinc-900\/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-lg w-full max-w-full overflow-x-auto scroll-smooth scrollbar-none whitespace-nowrap"/g, 
  '<div ref={tabsScrollRef} className="inversiones-toggle-container force-scroll-container w-full overflow-x-auto scroll-smooth md:overflow-visible scroll-smooth flex items-center scrollbar-none justify-start md:justify-center"');

content = content.replace(/<div ref=\{tabsScrollRef\} className="inversiones-toggle-container[^>]*>[^<]*<button/g, 
  `<div ref={tabsScrollRef} className="inversiones-toggle-container force-scroll-container w-full overflow-x-auto scroll-smooth md:overflow-visible scroll-smooth flex items-center scrollbar-none justify-start md:justify-center" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
      <div className="flex items-center gap-2 p-0 w-max min-w-full md:w-full md:min-w-0 md:justify-center">
        <button`);

// Close that inner div after the last button:
content = content.replace(/<\/button>\s*<\/div>\s*<\/div>\s*\{activeTab === "rutinas" && \(/g, 
  `</button>
      </div>
    </div>
  </div>
  {activeTab === "rutinas" && (`);


fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf-8');
console.log("Fixed gym structure");
