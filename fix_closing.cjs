const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');

// The closing tags for the top menu bar are currently:
//                 </button>
//         </div>
//         
//           </div>
//         </div>
//       )}

content = content.replace(/<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* --- VISTA/g, 
  `</button>\n      </div>\n    </div>\n      {/* --- VISTA`);
  
// I am just guessing what's there because grep missed it. 
// Let me just look at lines right after the "progreso" button closing tag.
