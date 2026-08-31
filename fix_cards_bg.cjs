const fs = require('fs');
let file = 'src/components/FinanceView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// The lines we want to change are the container divs that have bg-slate-50 dark:bg-zinc-950/50
// Let's replace `dark:bg-zinc-950/50` with `dark:bg-zinc-950` in `FinanceView.tsx`

content = content.replace(/dark:bg-zinc-950\/50/g, 'dark:bg-zinc-950');

fs.writeFileSync(file, content);
console.log("Updated FinanceView cards background");
