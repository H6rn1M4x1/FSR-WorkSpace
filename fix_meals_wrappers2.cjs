const fs = require('fs');
let c = fs.readFileSync('src/components/MealsView.tsx', 'utf8');

c = c.replace(/<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\n\s*\{\/\* Filters Bar \*\/\}/g, `</button>\n            </div>\n          </div>\n\n          {/* Filters Bar */}`);

fs.writeFileSync('src/components/MealsView.tsx', c);
