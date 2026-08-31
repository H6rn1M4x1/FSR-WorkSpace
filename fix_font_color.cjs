const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /<p className="text-sm font-bold text-black dark:text-zinc-100">{notif\.title}<\/p>/g,
    '<p className="text-sm font-bold dark:text-zinc-100" style={{ color: !darkMode ? "#000000" : undefined }}>{notif.title}</p>'
  );
  content = content.replace(
    /<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-1">/g,
    '<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-1" style={{ color: !darkMode ? "#000000" : undefined }}>'
  );
  fs.writeFileSync(filePath, content);
}

fixFile('src/components/Header.tsx');
fixFile('src/components/TopNavbar.tsx');
