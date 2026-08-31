import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

// Remove the one at line 505
code = code.replace(/<FilePreviewModal isOpen=\{!!previewFileUrl\}[^>]+>\s*/, '');

// Put it at the real end
const index = code.lastIndexOf('</div>\n  );\n}');
if (index !== -1) {
    code = code.substring(0, index) + 
      `      <FilePreviewModal isOpen={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} fileUrl={previewFileUrl} fileName={previewFileName} />\n    ` + 
      code.substring(index);
}

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
