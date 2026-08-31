import fs from 'fs';
let code = fs.readFileSync('src/components/RichTextEditor.tsx', 'utf8');

// 1. Add onPreview to Props
code = code.replace(
  /interface RichTextEditorProps \{/,
  `interface RichTextEditorProps {\n  onPreview?: (url: string, name: string) => void;`
);

// 2. Destructure onPreview
code = code.replace(
  /export function RichTextEditor\(\{\n\s*value,\n\s*onChange,\n\s*attachments,\n\s*onAttachmentsChange,\n\s*placeholder = "Escribe algo\.\.\.",\n\}\: RichTextEditorProps\) \{/,
  `export function RichTextEditor({\n  value,\n  onChange,\n  attachments,\n  onAttachmentsChange,\n  onPreview,\n  placeholder = "Escribe algo...",\n}: RichTextEditorProps) {`
);

// 3. Make attachment item clickable
code = code.replace(
  /<div key=\{i\} className="flex items-center gap-2 p-1\.5 pr-2 bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800">/g,
  `<div key={i} className="flex items-center gap-2 p-1.5 pr-2 bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors" onClick={(e) => { if (onPreview) onPreview(att.url, att.name); }}>`
);

// 4. Stop propagation on download button just in case
code = code.replace(
  /<a href=\{att\.url\} download=\{att\.name\} className="text-\[9px\] text-primary hover:underline font-bold">Descargar<\/a>/g,
  `<a href={att.url} download={att.name} className="text-[9px] text-primary hover:underline font-bold" onClick={(e) => e.stopPropagation()}>Descargar</a>`
);

fs.writeFileSync('src/components/RichTextEditor.tsx', code);
