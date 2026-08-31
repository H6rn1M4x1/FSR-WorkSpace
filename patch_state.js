import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

code = code.replace(/const \[tcDescripcion, setTcDescripcion\] = useState\(""\);/, 
`const [tcDescripcion, setTcDescripcion] = useState("");
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("Documento Adjunto");`);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
