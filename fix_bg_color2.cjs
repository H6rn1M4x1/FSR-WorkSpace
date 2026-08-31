const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /border-primary\/30 bg-primary\/15 dark:bg-primary\/10/g,
    'border-primary/30 bg-primary/20 dark:bg-primary/10'
  );
  fs.writeFileSync(filePath, content);
}

fixFile('src/components/Header.tsx');
fixFile('src/components/TopNavbar.tsx');
