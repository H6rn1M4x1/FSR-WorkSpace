const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
let lines = content.split('\n');

const activitiesIdx = lines.findIndex(l => l.includes('{/* Activities & Calories Summary Grid */}'));
lines.splice(activitiesIdx - 3, 3);
lines.splice(activitiesIdx - 3, 0, '            </div>', '          </div>');

fs.writeFileSync('src/components/HealthView.tsx', lines.join('\n'), 'utf8');
