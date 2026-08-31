import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

code = code.replace(/onShareClick=\{\(\) => \{[\s\S]*?\}\}/, '');
fs.writeFileSync('src/components/AppointmentsView.tsx', code);

let home = fs.readFileSync('src/components/HomeView.tsx', 'utf8');
home = home.replace(/itemData: e\.detail\.itemData/, 'data: e.detail.itemData');
fs.writeFileSync('src/components/HomeView.tsx', home);
