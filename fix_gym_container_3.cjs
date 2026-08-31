const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');

// There's a wrapper for GymRutinaView tabs that looks like:
// <div className="relative mb-8 max-w-4xl mx-auto overflow-hidden rounded-2xl">
// The outer most container of the tabs needs to be exactly like the one in FinanceView or HealthView inner tabs

// Let's replace the outer container
content = content.replace(/<div\s+className="relative mb-8 max-w-4xl mx-auto overflow-hidden rounded-2xl">\s*<div\s+ref=\{tabsScrollRef\}/,
  `<div className="relative flex flex-row items-center p-1 bg-slate-100/80 dark:bg-zinc-950/80 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/80 rounded-full w-full overflow-hidden mb-8 max-w-4xl mx-auto">
      <div ref={tabsScrollRef}`);

// Check if we need to close an extra div? Wait, replacing that outer div might not match if it already was replaced. Let's see what is there.
