const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');

// Between the "progreso" button closing tag and {/* --- VISTA 4 we have:
//                </button>
//        </div>
//        
//
// Which means the main tabs array container and the parent `div className="relative flex flex-row items-center p-1 bg-slate-100/80 ..."` are NOT properly closed.
// Let's check how many divs we opened:
// 1. <div className="relative flex flex-row items-center p-1 bg-slate-100/80 dark:bg-zinc-950/80 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/80 rounded-full w-full overflow-hidden mb-6">
// 2. <div ref={tabsScrollRef} className="inversiones-toggle-container force-scroll-container w-full overflow-x-auto scroll-smooth md:overflow-visible scroll-smooth flex items-center scrollbar-none justify-start md:justify-center" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
// 3. <div className="flex items-center gap-2 p-0 w-max min-w-full md:w-full md:min-w-0 md:justify-center">

// Then the buttons. Then it closes like:
//                </button>
//        </div>

// This only closes the 3rd div. We need 2 more closing divs.

content = content.replace(/                <\/button>\s*<\/div>\s*\{\/\* ---/g, 
`                </button>
        </div>
      </div>
    </div>
      {/* ---`);

fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf-8');
console.log("Fixed gym top tabs closing divs");
