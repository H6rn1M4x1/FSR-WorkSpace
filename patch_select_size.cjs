const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/*.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Replace the size === "sm" line
    const regex = /size === "sm"\s*\?\s*"px-3 py-1\.5[^"]+text-\[11px\]"/;
    if (regex.test(content)) {
        content = content.replace(regex, 'size === "sm"\n            ? "px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold"');
        fs.writeFileSync(file, content);
        console.log("Updated", file);
    }
    // Check for variation in FinanceView or others
    const regex2 = /size === "sm"\s*\?\s*"px-3 py-1\.5[^"]+text-slate-700[^"]+text-\[11px\]"/;
    if (regex2.test(content)) {
        content = content.replace(regex2, 'size === "sm"\n            ? "px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold"');
        fs.writeFileSync(file, content);
        console.log("Updated 2", file);
    }
    
    const regex3 = /size === "sm"\s*\?\s*"px-3 py-1\.5[^"]+text-\[11px\]"/; // HealthView might be slightly different.
});

