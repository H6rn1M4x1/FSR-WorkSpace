const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');

// 1. Find the stolen Grid closing tag. It should be right before `          {/* Activities & Calories Summary Grid */}`
const activitiesIdx = lines.findIndex(l => l.includes('{/* Activities & Calories Summary Grid */}'));
console.log("activitiesIdx:", activitiesIdx);

// Lines right before activitiesIdx should be:
// 3552:               })()}
// 3553:             </div>
// 3554:           </div>
// So at activitiesIdx - 1, we have `          </div>`.
// We will replace it with:
// `            </div>` (closes space-y-6)
// `          </div>` (closes SECCIÓN AVANZADA Wrapper)
lines[activitiesIdx - 1] = '            </div>\n          </div>';

// 2. Find `{/* Doctor directory / card organiser */}`
const doctorIdx = lines.findIndex(l => l.includes('{/* Doctor directory / card organiser */}'));
console.log("doctorIdx:", doctorIdx);

// Insert `          </div>` right before doctorIdx
lines.splice(doctorIdx, 0, '          </div>');

fs.writeFileSync('src/components/HealthView.tsx', lines.join('\n'), 'utf8');
console.log("Fixed!");
