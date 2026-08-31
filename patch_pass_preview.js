import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

code = code.replace(
  /<RichTextEditor\n\s*value=\{tcInformacionPersonalizada\}\n\s*onChange=\{setTcInformacionPersonalizada\}\n\s*attachments=\{tcArchivosNecesarios\}\n\s*onAttachmentsChange=\{setTcArchivosNecesarios\}/,
  `<RichTextEditor
                      value={tcInformacionPersonalizada}
                      onChange={setTcInformacionPersonalizada}
                      attachments={tcArchivosNecesarios}
                      onAttachmentsChange={setTcArchivosNecesarios}
                      onPreview={(url, name) => { setPreviewFileUrl(url); setPreviewFileName(name); }}`
);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
