import fs from 'fs';
let code = fs.readFileSync('src/components/UserSettingsModal.tsx', 'utf8');

code = code.replace(
  /healthNotes\?: string;/,
  `healthNotes?: string;\n  favoriteTeam?: string;`
);

fs.writeFileSync('src/components/UserSettingsModal.tsx', code);
