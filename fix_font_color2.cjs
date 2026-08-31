const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-1" style={{ color: !darkMode \? "#000000" : undefined }}>/g,
    '<p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-1">'
  );
  fs.writeFileSync(filePath, content);
}

fixFile('src/components/Header.tsx');
fixFile('src/components/TopNavbar.tsx');
