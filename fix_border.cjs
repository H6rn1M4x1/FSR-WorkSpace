const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = '<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 pt-4 border-t border-zinc-200/40 dark:border-zinc-800/60 w-full">';
const replaceStr = '<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 pt-2 w-full">';

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log("Fixed duplicate border.");
} else {
  console.log("Target string not found.");
}
