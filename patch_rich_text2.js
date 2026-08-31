import fs from 'fs';
let code = fs.readFileSync('src/components/RichTextEditor.tsx', 'utf8');

code = code.replace(
  /export function RichTextEditor\(\{ value, onChange, placeholder, onShareClick, attachments, onAttachmentsChange \}\: RichTextEditorProps\) \{/,
  `export function RichTextEditor({ value, onChange, placeholder, onShareClick, attachments, onAttachmentsChange, onPreview }: RichTextEditorProps) {`
);

fs.writeFileSync('src/components/RichTextEditor.tsx', code);
