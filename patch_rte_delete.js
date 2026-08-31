import fs from 'fs';
let code = fs.readFileSync('src/components/RichTextEditor.tsx', 'utf8');

code = code.replace(
  /<button type="button" onClick=\{\(\) => onAttachmentsChange && onAttachmentsChange\(attachments\.filter\(\(_, idx\) => idx !== i\)\)\} className="ml-1 p-1 text-slate-400 hover:text-red-500 transition-colors">/g,
  `<button type="button" onClick={(e) => { e.stopPropagation(); onAttachmentsChange && onAttachmentsChange(attachments.filter((_, idx) => idx !== i)); }} className="ml-1 p-1 text-slate-400 hover:text-red-500 transition-colors">`
);

fs.writeFileSync('src/components/RichTextEditor.tsx', code);
