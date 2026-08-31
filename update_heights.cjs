const fs = require('fs');
let file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Medication card
content = content.replace(/max-h-\[440px\]/g, "max-h-[600px]");

// BP card
content = content.replace(/max-h-\[500px\]/g, "max-h-[600px]");
content = content.replace(/min-h-\[160px\]/g, "min-h-[220px]");
content = content.replace(/const itemsPerPage = 3;/g, "const itemsPerPage = 4;");

fs.writeFileSync(file, content);
console.log("Updated heights");
