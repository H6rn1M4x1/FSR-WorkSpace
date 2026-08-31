const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');

// Notice there is a missing closing div:
// The code has:
//                </button>
//        </div>
//        {activeTab === "rutinas" && (
//
// But the beginning of the block was:
// <div className="relative min-w-0 max-w-full mb-8 mt-2 mx-auto">
//   <div ref={tabsScrollRef} className="...">

// Wait, where does `{activeTab === "rutinas" && (` start?
// Ah! In fix_gym_container_4.cjs I did:
// content = content.replace(/<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\{activeTab === "rutinas" && \(/g, 
//   `</button>\n      </div>\n    </div>\n  {activeTab === "rutinas" && (`);

// Let's check exactly what is between the last button and {activeTab === "rutinas" && (
// Oh, the buttons are siblings! 
// rutinas button -> historial button -> tecnica button -> progreso button
// Then the wrapper divs close.
// So between the `progreso` button and `{activeTab === "rutinas"` there are closing divs.

// Wait, the output for `progreso` button is:
//                 </button>
//         </div>
//         {activeTab === "rutinas" && (
// Wait, no, `rutinas` view starts right after the tabs? Yes.

content = content.replace(/                <\/button>\n        <\/div>\s*\{activeTab === "rutinas" && \(/g, 
  `                </button>\n      </div>\n    </div>\n      {activeTab === "rutinas" && (`);

fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf-8');
console.log("Fixed gym top tabs closing divs 2");
