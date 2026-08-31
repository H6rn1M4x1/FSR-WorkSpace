const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

content = content.replace(
  'className="flex items-center justify-between text-xs p-2 rounded-xl bg-zinc-500/5 border border-zinc-800/10 mb-1.5"',
  'className="flex items-center justify-between text-xs p-2 rounded-xl bg-zinc-500/5 border border-zinc-800/10"'
);

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Removed mb-1.5");
