const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

content = content.replace(
  '<div className="w-full space-y-2 mt-2">',
  '<div className="w-full space-y-2 mt-2 shrink-0">'
);

// We also have className="flex-1 overflow-y-auto min-h-0 max-h-52 pr-1" on AnimatedList, which is fine, but we can change it to className="flex-1 min-h-0" since AnimatedList handles its own overflow now, or keep it.
// Actually, let's make sure the list wrapper has flex-1 overflow-y-auto
content = content.replace(
  '<div className="space-y-1.5 mt-3 flex-1 overflow-y-auto min-h-0">',
  '<div className="space-y-1.5 mt-3 flex-1 overflow-y-auto min-h-0">'
); // no-op if same, but ensures it's there

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Patched layout");
