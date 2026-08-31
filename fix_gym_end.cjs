const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');

// It seems there's a missing closing </div> for the main <div className="p-6 rounded-3xl...">
// We can insert it before the closing fragment

content = content.replace(/          document\.body\n        \)\}\n    <\/>/g, `          document.body\n        )}\n      </div>\n    </>`);

fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf-8');
console.log("Fixed missing div");
