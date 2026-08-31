import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

code = code.replace(/setPreviewFileUrl\(null\)\} fileUrl=\{previewFileUrl\} fileName=\{previewFileName\} \/>\n/g, '');

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
