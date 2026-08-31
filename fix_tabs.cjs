const fs = require('fs');

function fixTabs(file) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // HealthView specific replacements
  if (file.includes('HealthView')) {
    // Replace the large padding and text classes
    content = content.replace(/relative px-5 py-2\.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0/g, 
      "relative md:!flex-1 shrink-0 py-2 px-3 text-xs md:text-sm font-black transition-colors rounded-full flex items-center justify-center gap-1.5 cursor-pointer z-10 whitespace-nowrap");
    
    content = content.replace(/relative px-5 py-2\.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer whitespace-nowrap/g, 
      "relative md:!flex-1 shrink-0 py-2 px-3 text-xs md:text-sm font-black transition-colors rounded-full flex items-center justify-center gap-1.5 cursor-pointer z-10 whitespace-nowrap");
    
    // Check if there are other button classes like px-4 py-2
    content = content.replace(/className={`relative px-6 py-3 rounded-full text-sm/g, 'className={`relative md:!flex-1 shrink-0 py-2 px-3 text-xs md:text-sm');
  }

  // GymRutinaView specific replacements
  if (file.includes('GymRutinaView')) {
    content = content.replace(/px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer/g, 
      "relative md:!flex-1 shrink-0 py-2 px-3 text-xs md:text-sm font-black transition-colors rounded-full flex items-center justify-center gap-1.5 cursor-pointer z-10 whitespace-nowrap");
  }

  // General icon size replacements in those blocks
  // Find the button icons and change them to w-4 h-4
  // We'll do this by replacing <Icon className="w-5 h-5" /> with w-4 h-4 in the vicinity of tabs
  
  fs.writeFileSync(file, content, 'utf-8');
}

fixTabs('src/components/HealthView.tsx');
fixTabs('src/components/GymRutinaView.tsx');
console.log("Done");
