const fs = require('fs');

let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

// Find the blocks
const weekDaysMatch = content.match(/const weekDaysCurrent = useMemo\(\(\) => \{[\s\S]*?\}, \[\]\);/);
const alimWeekMatch = content.match(/const alimWeekData = useMemo\(\(\) => \{[\s\S]*?\}, \[weekDaysCurrent, alimentacionLogs\]\);/);
const diarioWeekMatch = content.match(/const diarioWeekData = useMemo\(\(\) => \{[\s\S]*?\}, \[weekDaysCurrent, alimentacionLogs, medidasHistory, metabolicProfile, selectedActivityFactor\]\);/);

if (!weekDaysMatch || !alimWeekMatch || !diarioWeekMatch) {
  console.error("Could not find the memo blocks.");
  process.exit(1);
}

// Remove them from the original location
content = content.replace(weekDaysMatch[0], '');
content = content.replace(alimWeekMatch[0], '');
content = content.replace(diarioWeekMatch[0], '');

// Find where to insert them
const insertPointMatch = content.match(/return b\.fecha\.localeCompare\(a\.fecha\);\n    \}\);\n  \};\n/);
if (!insertPointMatch) {
  console.error("Could not find the insertion point.");
  process.exit(1);
}

const insertionIdx = insertPointMatch.index + insertPointMatch[0].length;
const blocksToInsert = `\n  ${weekDaysMatch[0]}\n\n  ${alimWeekMatch[0]}\n\n  ${diarioWeekMatch[0]}\n`;

content = content.slice(0, insertionIdx) + blocksToInsert + content.slice(insertionIdx);

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf-8');
console.log("Patched HealthView.tsx successfully.");
