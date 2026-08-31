const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /style=\{\{ backgroundColor: !darkMode && notif\.read \? "#D5D6D7" : undefined \}\}/g,
    'style={{ backgroundColor: !darkMode && notif.read ? "#D5D6D7" : !darkMode && !notif.read ? "color-mix(in srgb, var(--color-primary) 25%, white)" : undefined }}'
  );
  content = content.replace(
    /border-primary\/30 bg-primary\/20 dark:bg-primary\/10/g,
    'border-primary/30 dark:bg-primary/10'
  );
  fs.writeFileSync(filePath, content);
}

fixFile('src/components/Header.tsx');
fixFile('src/components/TopNavbar.tsx');
