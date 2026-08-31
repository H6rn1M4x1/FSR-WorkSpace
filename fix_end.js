import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

code = code.replace(/<FilePreviewModal isOpen=\{!!previewFileUrl\} onClose=\{\(\) =>\s+<\/div>\n  \);\n\}/, 
`      <FilePreviewModal isOpen={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} fileUrl={previewFileUrl} fileName={previewFileName} />
    </div>
  );
}`);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
