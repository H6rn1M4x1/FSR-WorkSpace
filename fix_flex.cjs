const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

// For Medication Checklist
content = content.replace(
  '            <div\n              className={`p-4 sm:p-5 rounded-3xl border flex flex-col h-full overflow-hidden ${\n                darkMode\n                  ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"\n                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"\n              }`}\n            >\n              <div>',
  '            <div\n              className={`p-4 sm:p-5 rounded-3xl border flex flex-col h-full overflow-hidden min-h-0 max-h-[380px] ${\n                darkMode\n                  ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"\n                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"\n              }`}\n            >\n              <div className="flex flex-col h-full min-h-0">'
);

// For Blood Pressure Trends
content = content.replace(
  '            <div\n              className={`p-4 sm:p-5 rounded-3xl border flex flex-col h-full overflow-hidden ${\n                darkMode\n                  ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"\n                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"\n              }`}\n            >\n              <div className="flex flex-col h-full">\n                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">',
  '            <div\n              className={`p-4 sm:p-5 rounded-3xl border flex flex-col h-full overflow-hidden min-h-0 max-h-[380px] ${\n                darkMode\n                  ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"\n                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"\n              }`}\n            >\n              <div className="flex flex-col h-full min-h-0">\n                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">'
);


fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Fixed flexbox hierarchy for height containment");
