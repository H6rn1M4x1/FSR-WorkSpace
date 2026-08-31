import fs from 'fs';
let code = fs.readFileSync('src/components/RichTextEditor.tsx', 'utf8');

code = code.replace(/title="Color de texto"[\s\S]*?Opciones de lista"/, 
`title="Color de texto"
          >
            <Palette className="w-4 h-4" />
          </button>
                    
          <div className="w-px h-5 bg-slate-300 dark:bg-zinc-700 mx-1"></div>
          
          <button 
            type="button" 
            onClick={handleAddImage}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
            title="Adjuntar archivo"
          >
            <Paperclip className="w-4 h-4" />
          </button>
                    
          <button 
            type="button" 
            onClick={() => { setShowListMenu(!showListMenu); setShowFormatMenu(false); setShowColorMenu(false); }}
             className={\`p-2 rounded-lg transition-colors \${showListMenu ? 'bg-primary/20 text-primary' : 'hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'}\`}
            title="Opciones de lista"`);

fs.writeFileSync('src/components/RichTextEditor.tsx', code);
