const fs = require('fs');
let code = fs.readFileSync('src/components/RichTextEditor.tsx', 'utf8');

code = code.replace(/import \{ \n  Type, Palette, UserPlus, Image as ImageIcon, \n  CheckSquare, List, ListOrdered, Bold, Italic, \n  Underline, Heading1, Heading2, RemoveFormatting,\n  X\n\} from 'lucide-react';/, 
`import { 
  Type, Palette, Paperclip, Image as ImageIcon, 
  CheckSquare, List, ListOrdered, Bold, Italic, 
  Underline, Heading1, Heading2, RemoveFormatting,
  X
} from 'lucide-react';`);

code = code.replace(/<div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-1"><\/div>[\s\S]*?<button \n             type="button" \n             onClick=\{handleAddImage\}[\s\S]*?<ImageIcon className="w-4 h-4" \/>\n          <\/button>/,
`<div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-1"></div>
                    
          <button 
            type="button" 
            onClick={handleAddImage}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
            title="Adjuntar archivo"
          >
            <Paperclip className="w-4 h-4" />
          </button>`);

code = code.replace(/const handleShareUser = \(\) => \{[\s\S]*?  \};\n/, '');

code = code.replace(/const parentEl = currentNode as HTMLElement;\n              if \(parentEl\) \{[\s\S]*?\} else \{[\s\S]*?execCommand\("insertHTML", "<br><input type='checkbox' style='margin-right: 6px; cursor: pointer;' \/>&nbsp;"\);\n                   \}\n                \}\n              \}/,
`const parentEl = currentNode as HTMLElement;
              if (parentEl) {
                const lineDiv = parentEl.closest('div');
                if (lineDiv && lineDiv.querySelector('input[type="checkbox"]')) {
                   e.preventDefault();
                   const textContent = lineDiv.textContent?.trim();
                   if (!textContent) {
                     // Break out of list
                     execCommand("insertHTML", "<br/><br/>");
                   } else {
                     // Insert new line with checkbox
                     const html = \`<div><input type="checkbox" style="margin-right: 6px; cursor: pointer;" />&nbsp;</div>\`;
                     execCommand("insertHTML", html);
                   }
                }
              }`);

fs.writeFileSync('src/components/RichTextEditor.tsx', code);
