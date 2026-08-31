const fs = require('fs');
let file = 'src/components/AcademicView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// The issue was I injected className="w-full sm:w-auto min-w-[160px]" but left the original className="min-w-[150px]" below it.
// We need to clean up the duplicate classNames.

content = content.replace(/className="w-full sm:w-auto min-w-\[160px\]"([\s\S]*?)className="min-w-\[150px\]"/g, 'className="w-full sm:w-auto min-w-[160px]"$1');
content = content.replace(/className="w-full sm:w-auto min-w-\[160px\]"([\s\S]*?)className="min-w-\[160px\]"/g, 'className="w-full sm:w-auto min-w-[160px]"$1');

fs.writeFileSync(file, content);
console.log("Fixed duplicates");
