const fs = require('fs');
let file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Find the BP section
const searchStr = `            {/* Blood Pressure Trends & SVG Chart */}
            <div
              className={\`p-4 sm:p-5 rounded-3xl border flex flex-col h-full overflow-hidden min-h-0 max-h-[440px] \${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
              }\`}
            >
              <div className="flex flex-col h-full min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">`;

const replaceStr = `            {/* Blood Pressure Trends & SVG Chart */}
            <div className="flex flex-col gap-4 h-full overflow-hidden min-h-0 max-h-[440px]">
              <div
                className={\`p-4 sm:p-4 rounded-3xl border flex flex-col shrink-0 \${
                  darkMode
                    ? "bg-zinc-950 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }\`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">`;

content = content.replace(searchStr, replaceStr);

const listStartStr = `                {/* List of past logs */}
                <div className="mt-3 flex-1 flex flex-col min-h-[160px]">`;

const listReplaceStr = `              </div>
              
              {/* List of past logs */}
              <div
                className={\`p-4 sm:p-4 rounded-3xl border flex-1 flex flex-col min-h-[160px] overflow-hidden \${
                  darkMode
                    ? "bg-zinc-950 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                }\`}
              >
                <div className="flex-1 flex flex-col h-full min-h-0">`;

content = content.replace(listStartStr, listReplaceStr);

// We need to remove the closing div for the old wrapper.
// The old structure ended with:
/*
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
*/
// We need to change it to:
/*
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
*/
// Wait, the number of closing divs is actually the same!
// Let's count:
// OLD:
// <div wrapper>
//   <div inner>
//     <div header> </div>
//     <div graph> </div>
//     <div list> </div>
//   </div>
// </div>

// NEW:
// <div wrapper gap-4>
//   <div graphCard>
//     <div header> </div>
//     <div graph> </div>
//   </div>
//   <div listCard>
//     <div list inner> </div>
//   </div>
// </div>

// So old has 1 outer, 1 inner, 1 list = 3 divs opening.
// New has 1 outer, 1 graphCard, 1 listCard, 1 list inner = 4 divs opening.
// Wait, if New has 4 divs opening, we need to add a closing div.
// Let's trace.
