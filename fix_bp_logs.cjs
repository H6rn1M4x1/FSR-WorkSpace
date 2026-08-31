const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

// The block starts around 2672
const bpListOld = `                              <span className="text-zinc-500 font-medium">
                                {log.date}{" "}
                                {bpTrendFilterPatient === "Todos" &&
                                  \`(\${log.patient || "Hernan"})\`}
                              </span>`;

const bpListNew = `                              <span className="text-zinc-500 font-medium">
                                {log.date ? log.date.replace('T', ' ').replace('Z', '').split(':').slice(0, 2).join(':') : ''}{" "}
                                {bpTrendFilterPatient === "Todos" &&
                                  \`(\${log.patient || "Hernan"})\`}
                              </span>`;

if (content.includes(bpListOld)) {
  content = content.replace(bpListOld, bpListNew);
} else {
  console.log("Could not find the target block to replace.");
}

// Ensure the AnimatedList or its wrapper has the max-h-48 class.
// We have: className="flex-1 overflow-y-auto min-h-0 pr-1"
// Let's change it to: className="flex-1 overflow-y-auto min-h-0 max-h-48 pr-1"
const animatedListClassOld = 'className="flex-1 overflow-y-auto min-h-0 pr-1"';
const animatedListClassNew = 'className="flex-1 overflow-y-auto min-h-0 max-h-52 pr-1"';
content = content.replace(animatedListClassOld, animatedListClassNew);


fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Done");
