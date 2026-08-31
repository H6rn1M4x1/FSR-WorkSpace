const fs = require('fs');
let content = fs.readFileSync('src/components/AcademicView.tsx', 'utf8');
console.log(content.indexOf('Submenu Tabs Selector with Navigation Arrows'));
