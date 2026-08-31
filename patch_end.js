import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

if (!code.includes('<FilePreviewModal')) {
  code = code.replace(/    <\/div>\n  \);/, 
    `      <FilePreviewModal isOpen={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} fileUrl={previewFileUrl} fileName={previewFileName} />
    </div>
  );`);
}

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
