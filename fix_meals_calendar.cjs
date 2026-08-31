const fs = require('fs');
const file = 'src/components/MealsView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const regex = /\{\/\* Day of Week Headers \*\/\}[\s\S]*?\{\/\* Days Grid \*\/\}[\s\S]*?<\/div>\n\s*<\/div>\n\s*<\/div>/;

// Looking closely at MealsView, line 2161 is Day of Week Headers, line 2217 is end of Days Grid
