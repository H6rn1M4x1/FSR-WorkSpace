const fs = require('fs');
let file = 'src/components/HomeView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace invoice
content = content.replace(
  /"border-red-500\/20 bg-red-500\/5 hover:bg-red-500\/10"/g,
  '"border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"'
);

// Replace detailedPayment isClosing
content = content.replace(
  /\? "border-primary\/20 bg-primary\/10 hover:bg-primary\/10"\n\s*: "border-zinc-200/g,
  '? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"\n                                : "border-zinc-200'
);

fs.writeFileSync(file, content);
console.log("Replaced red background with solid white/zinc-950");
