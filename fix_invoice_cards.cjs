const fs = require('fs');
let file = 'src/components/HomeView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// For invoice:
content = content.replace(
  /inv\.paid\n\s+\? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"\n\s+: "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"/g,
  'inv.paid\n                              ? "border-primary/20 bg-primary/10 hover:bg-primary/10"\n                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"'
);

// For detailedPayment:
content = content.replace(
  /dp\.pago\n\s+\? "border-primary\/20 bg-primary\/10 hover:bg-primary\/10"\n\s+: isClosing\n\s+\? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"\n\s+: "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"/g,
  'dp.pago\n                              ? "border-primary/20 bg-primary/10 hover:bg-primary/10"\n                              : isClosing\n                                ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"\n                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"'
);

fs.writeFileSync(file, content);
console.log("Fixed paid states");
