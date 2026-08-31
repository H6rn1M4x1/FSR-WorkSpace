const fs = require('fs');
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

// 1. Add state
code = code.replace(/const \[tcInformacionPersonalizada, setTcInformacionPersonalizada\] = useState\(""\);/,
  `const [tcInformacionPersonalizada, setTcInformacionPersonalizada] = useState("");
  const [tcArchivosNecesarios, setTcArchivosNecesarios] = useState<{name: string, url: string}[]>([]);`);

// 2. Reset state
code = code.replace(/setTcInformacionPersonalizada\(""\);/g, `setTcInformacionPersonalizada("");\n    setTcArchivosNecesarios([]);`);

// 3. Populate state when editing
code = code.replace(/setTcInformacionPersonalizada\(tc\.informacionPersonalizada \|\| ""\);/, 
  `setTcInformacionPersonalizada(tc.informacionPersonalizada || "");\n    setTcArchivosNecesarios(tc.archivosNecesarios || []);`);

// 4. Save state when saving
code = code.replace(/informacionPersonalizada: tcInformacionPersonalizada \|\| undefined,/g, 
  `informacionPersonalizada: tcInformacionPersonalizada || undefined,\n                archivosNecesarios: tcArchivosNecesarios.length > 0 ? tcArchivosNecesarios : undefined,`);
code = code.replace(/informacionPersonalizada: tcInformacionPersonalizada \|\| undefined,/g, 
  `informacionPersonalizada: tcInformacionPersonalizada || undefined,\n        archivosNecesarios: tcArchivosNecesarios.length > 0 ? tcArchivosNecesarios : undefined,`);

// 5. Pass state to RichTextEditor
code = code.replace(/onChange=\{setTcInformacionPersonalizada\}/, 
  `onChange={setTcInformacionPersonalizada}
                      attachments={tcArchivosNecesarios}
                      onAttachmentsChange={setTcArchivosNecesarios}`);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
