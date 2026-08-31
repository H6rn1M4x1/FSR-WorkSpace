const fs = require('fs');

function fixIcons(file) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // We'll replace w-4 h-4 or w-5 h-5 or w-6 h-6 with w-3.5 h-3.5 flex-shrink-0
  // specifically right after the button declaration in those tabs.
  // Actually, since they are already changed to `w-4 h-4 shrink-0`, let's just do a global replace for those specific icons if they match the pattern.
  // Let's do a targeted replace for the specific icons used in the tabs:
  // HealthView: Dumbbell, Utensils, TrendingUp, Stethoscope, Heart, FileText, Pill, History, Package
  // GymRutinaView: Dumbbell, History, Activity, TrendingUp

  const icons = ['Dumbbell', 'Utensils', 'TrendingUp', 'Stethoscope', 'Heart', 'FileText', 'Pill', 'History', 'Package', 'Activity'];
  
  icons.forEach(icon => {
    // Replace <Icon className="w-4 h-4 shrink-0" /> with <Icon className="w-3.5 h-3.5 flex-shrink-0" />
    content = content.replace(new RegExp(`<${icon} className="w-[456] h-[456](?: shrink-0)?" \\/>`, 'g'), `<${icon} className="w-3.5 h-3.5 flex-shrink-0" />`);
    content = content.replace(new RegExp(`<${icon} className="w-[456] h-[456](?: flex-shrink-0)?" \\/>`, 'g'), `<${icon} className="w-3.5 h-3.5 flex-shrink-0" />`);
    
    // Some might not have self-closing tags, but usually Lucide icons do.
  });

  // Ensure button padding is py-2.5 px-3 instead of py-2 px-3 to match Pagos exactly
  content = content.replace(/py-2 px-3/g, 'py-2.5 px-3');

  fs.writeFileSync(file, content, 'utf-8');
}

fixIcons('src/components/HealthView.tsx');
fixIcons('src/components/GymRutinaView.tsx');
console.log("Done Icons");
