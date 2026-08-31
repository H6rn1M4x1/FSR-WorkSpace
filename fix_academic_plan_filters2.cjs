const fs = require('fs');
let c = fs.readFileSync('src/components/AcademicView.tsx', 'utf8');

c = c.replace(/\{\/\* Filters Section - Matching Comidas Layout \*\/\}\n\s*<div\n\s*className=\{`p-5 rounded-3xl border[\s\S]*?shadow-sm`\}\n\s*>\n\s*<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">/, `{/* Filters Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">`);

// Wait, the inner div was `<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">`.
// We need to remove the closing div of the outer wrapper.
// Where is it?
c = c.replace(/<\/div>\n\s*<\/div>\n\n\s*\{\/\* Table of Plan de Estudio \*\/\}/, `</div>\n\n              {/* Table of Plan de Estudio */}`);

fs.writeFileSync('src/components/AcademicView.tsx', c);
