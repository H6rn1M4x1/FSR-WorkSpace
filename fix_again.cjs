const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

// 1. Chart height
content = content.replace(
  '<div className="h-[110px] min-h-[110px] w-full text-xs shrink-0">\n                          <ResponsiveContainer width="100%" height={110}>',
  '<div className="h-[150px] min-h-[150px] w-full text-xs shrink-0">\n                          <ResponsiveContainer width="100%" height={150}>'
);

// 2. Date style
content = content.replace(
  '<span className="text-zinc-500 font-medium">',
  '<span className="text-[11px] text-zinc-500 italic">'
); // Just replacing the class since there is only one in this scope, but wait, there might be multiple.

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Fixed again");
