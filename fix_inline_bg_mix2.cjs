const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /style=\{\{ backgroundColor: !darkMode && notif\.read \? "#D5D6D7" : !darkMode && !notif\.read \? "var\(--color-primary-container\)" : undefined \}\}/g,
    'style={{ backgroundColor: !darkMode && notif.read ? "#D5D6D7" : !darkMode && !notif.read ? "color-mix(in srgb, var(--color-primary) 20%, white)" : undefined }}'
  );
  fs.writeFileSync(filePath, content);
}

fixFile('src/components/Header.tsx');
fixFile('src/components/TopNavbar.tsx');
