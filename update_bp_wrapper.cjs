const fs = require('fs');
let file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const searchStr = `            {/* Blood Pressure Trends & SVG Chart */}
            <div className="flex flex-col gap-4 h-full overflow-hidden min-h-0 max-h-[440px]">`;

const replaceStr = `            {/* Blood Pressure Trends & SVG Chart */}
            <div
              className={\`p-6 rounded-3xl border flex flex-col gap-4 h-full overflow-hidden min-h-0 max-h-[500px] \${
                darkMode
                  ? "bg-zinc-900/40 border-white/10 backdrop-blur-md"
                  : "bg-white/40 border-slate-200 backdrop-blur-md"
              }\`}
            >`;

if(content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log("Updated wrapper");
} else {
  console.log("Search string not found!");
}
