const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');

// The current top section container is:
// <div className="relative flex flex-row items-center p-1 bg-slate-100/80 dark:bg-zinc-950/80 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/80 rounded-full w-full overflow-hidden mb-6">
// <div ref={tabsScrollRef} className="inversiones-toggle-container force-scroll-container w-full overflow-x-auto scroll-smooth md:overflow-visible scroll-smooth flex items-center scrollbar-none justify-start md:justify-center" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
// <div className="flex items-center gap-2 p-0 w-max min-w-full md:w-full md:min-w-0 md:justify-center">

// We need it to be EXACTLY like medsActiveTab:
// <div className="relative min-w-0 max-w-full mb-8">
// <div ref={tabsScrollRef} className="flex items-center justify-start md:justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-lg w-full max-w-full mx-auto overflow-x-auto scroll-smooth scrollbar-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>

content = content.replace(/<div className="relative flex flex-row items-center p-1 bg-slate-100\/80 dark:bg-zinc-950\/80 backdrop-blur-md border border-slate-200\/50 dark:border-zinc-800\/80 rounded-full w-full overflow-hidden mb-6">\s*<div ref=\{tabsScrollRef\} className="inversiones-toggle-container force-scroll-container w-full overflow-x-auto scroll-smooth md:overflow-visible scroll-smooth flex items-center scrollbar-none justify-start md:justify-center" style=\{\{ scrollbarWidth: "none", msOverflowStyle: "none" \}\}>\s*<div className="flex items-center gap-2 p-0 w-max min-w-full md:w-full md:min-w-0 md:justify-center">/g, 
  `<div className="relative min-w-0 max-w-full mb-8 mt-2 mx-auto">
      <div ref={tabsScrollRef} className="flex items-center justify-start md:justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full border border-slate-200 dark:border-zinc-800 shadow-lg w-full max-w-full mx-auto overflow-x-auto scroll-smooth scrollbar-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>`);

// And remove the closing </div> for the removed inner wrapper
content = content.replace(/<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\{activeTab === "rutinas" && \(/g, 
  `</button>
      </div>
    </div>
  {activeTab === "rutinas" && (`);

fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf-8');
console.log("Fixed gym container to match meds");
