import fs from 'fs';
let code = fs.readFileSync('src/types.ts', 'utf8');
if (!code.includes('transcripcionAutomatica?: string;')) {
  code = code.replace(/archivosNecesarios\?: \{name: string, url: string\}\[\];/g, 'archivosNecesarios?: {name: string, url: string}[];\n  transcripcionAutomatica?: string;');
  fs.writeFileSync('src/types.ts', code);
}
