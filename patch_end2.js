import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

if (!code.includes('<FilePreviewModal')) {
  const index = code.lastIndexOf('    </div>');
  if (index !== -1) {
    code = code.substring(0, index) + 
      `      <FilePreviewModal isOpen={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} fileUrl={previewFileUrl} fileName={previewFileName} />\n` + 
      code.substring(index);
  }
}

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
