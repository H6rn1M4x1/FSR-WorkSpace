import React, { useState, useRef, useEffect } from 'react';
import { 
  Type, Palette, Paperclip, Image as ImageIcon, 
  CheckSquare, List, ListOrdered, Bold, Italic, 
  Underline, Heading1, Heading2, RemoveFormatting,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RichTextEditorProps {
  onPreview?: (url: string, name: string) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onShareClick?: () => void;
  attachments?: {name: string, url: string}[];
  onAttachmentsChange?: (attachments: {name: string, url: string}[]) => void;
}

export function RichTextEditor({ value, onChange, placeholder, onShareClick, attachments, onAttachmentsChange, onPreview }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);

  // Sync the editor's content whenever the external value changes (e.g. data finishes
  // loading from Firestore, or the user switches to editing a different record) —
  // but only while the editor isn't focused, so we never disrupt an active typing session.
  useEffect(() => {
    if (!editorRef.current) return;
    const isFocused = document.activeElement === editorRef.current;
    const nextValue = value || "";
    if (!isFocused && editorRef.current.innerHTML !== nextValue) {
      editorRef.current.innerHTML = nextValue;
    }
  }, [value]);

  const execCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        if (onAttachmentsChange && attachments) {
          onAttachmentsChange([...attachments, { name: file.name, url }]);
        }
      };
      reader.readAsDataURL(file);
    }
    // reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleInsertCheckbox = () => {
    const html = `<input type="checkbox" style="margin-right: 6px; cursor: pointer;" />&nbsp;`;
    execCommand("insertHTML", html);
    setShowListMenu(false);
  };

  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", 
    "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899",
    "#ffffff", "#000000", "#64748b"
  ];

  return (
    <div className="flex flex-col w-full border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-950/50 transition-all focus-within:border-primary">
      {/* Toolbars Container */}
      <div className="flex flex-col bg-slate-100/50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
        
        {/* Top Floating Format Menu (Conditional) */}
        <AnimatePresence>
          {showFormatMenu && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto scrollbar-none"
            >
              <button type="button" onClick={() => execCommand("formatBlock", "H1")} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors" title="Título 1"><Heading1 className="w-4 h-4" /></button>
              <button type="button" onClick={() => execCommand("formatBlock", "H2")} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors" title="Título 2"><Heading2 className="w-4 h-4" /></button>
              <div className="w-px h-4 bg-slate-300 dark:bg-zinc-700 mx-1"></div>
              <button type="button" onClick={() => execCommand("bold")} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors" title="Negrita"><Bold className="w-4 h-4" /></button>
              <button type="button" onClick={() => execCommand("italic")} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors" title="Cursiva"><Italic className="w-4 h-4" /></button>
              <button type="button" onClick={() => execCommand("underline")} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors" title="Subrayado"><Underline className="w-4 h-4" /></button>
              <div className="w-px h-4 bg-slate-300 dark:bg-zinc-700 mx-1"></div>
              <button type="button" onClick={() => execCommand("removeFormat")} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors ml-auto" title="Limpiar formato"><RemoveFormatting className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Color Palette Menu (Conditional) */}
        <AnimatePresence>
          {showColorMenu && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-1.5 p-2 border-b border-slate-200 dark:border-zinc-800 flex-wrap"
            >
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => execCommand("foreColor", color)}
                  className="w-5 h-5 rounded-full border border-slate-300 dark:border-zinc-700 cursor-pointer shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* List/Options Menu (Conditional) */}
        <AnimatePresence>
          {showListMenu && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-zinc-800"
            >
              <button type="button" onClick={() => execCommand("insertUnorderedList")} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1 text-xs font-medium" title="Lista de viñetas"><List className="w-4 h-4" /> Viñetas</button>
              <button type="button" onClick={() => execCommand("insertOrderedList")} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1 text-xs font-medium" title="Lista numerada"><ListOrdered className="w-4 h-4" /> Numerada</button>
              <div className="w-px h-4 bg-slate-300 dark:bg-zinc-700 mx-1"></div>
              <button type="button" onClick={handleInsertCheckbox} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1 text-xs font-medium" title="Casilla de verificación"><CheckSquare className="w-4 h-4" /> Checkbox</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Toolbar */}
        <div className="flex items-center gap-1 p-1.5 overflow-x-auto scrollbar-none">
          <button 
            type="button" 
            onClick={() => { setShowFormatMenu(!showFormatMenu); setShowColorMenu(false); setShowListMenu(false); }} 
            className={`p-2 rounded-lg transition-colors ${showFormatMenu ? 'bg-primary/20 text-primary' : 'hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'}`}
            title="Formato de texto"
          >
            <Type className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={() => { setShowColorMenu(!showColorMenu); setShowFormatMenu(false); setShowListMenu(false); }} 
            className={`p-2 rounded-lg transition-colors ${showColorMenu ? 'bg-primary/20 text-primary' : 'hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'}`}
            title="Color de texto"
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
             className={`p-2 rounded-lg transition-colors ${showListMenu ? 'bg-primary/20 text-primary' : 'hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'}`}
            title="Opciones de lista"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div 
        ref={editorRef}
        contentEditable
        className="w-full min-h-[120px] p-3 text-sm text-slate-900 dark:text-white outline-none cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 dark:empty:before:text-zinc-600 prose dark:prose-invert prose-sm max-w-none [&_ol_ol]:list-[lower-alpha] [&_ol_ol_ol]:list-[lower-roman]"
        onInput={handleInput}
        onBlur={handleInput}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
              execCommand("outdent");
            } else {
              execCommand("indent");
            }
            return;
          }
          if (e.key === 'Enter') {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              let currentNode = selection.anchorNode;
              if (currentNode?.nodeType === 3) currentNode = currentNode.parentNode;
              
              const parentEl = currentNode as HTMLElement;
              if (parentEl) {
                const lineDiv = parentEl.closest('div');
                if (lineDiv && lineDiv.querySelector('input[type="checkbox"]')) {
                   e.preventDefault();
                   const textContent = lineDiv.textContent?.trim();
                   if (!textContent) {
                     // Break out of list
                     execCommand("insertHTML", "<br/><br/>");
                   } else {
                     // Insert new checklist line as a real sibling block, so it always
                     // lands on its own line instead of appearing inline (execCommand
                     // insertHTML was unreliable for this across browsers).
                     const newLine = document.createElement("div");
                     newLine.innerHTML = '<input type="checkbox" style="margin-right: 6px; cursor: pointer;" />&nbsp;';
                     lineDiv.insertAdjacentElement("afterend", newLine);

                     const range = document.createRange();
                     const caretNode = newLine.lastChild;
                     if (caretNode) {
                       range.setStart(caretNode, caretNode.textContent?.length || 0);
                       range.collapse(true);
                       selection.removeAllRanges();
                       selection.addRange(range);
                     }
                     handleInput();
                   }
                }
              }
            }
          }
        }}
        data-placeholder={placeholder}
      />
      
      {attachments && attachments.length > 0 && (
        <div className="flex flex-col gap-2 p-3 bg-slate-100 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 rounded-b-xl">
          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Archivos Necesarios</span>
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 pr-2 bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors" onClick={(e) => { if (onPreview) onPreview(att.url, att.name); }}>
                {att.url.startsWith('data:image/') ? (
                  <img src={att.url} alt={att.name} className="w-8 h-8 object-cover rounded" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-slate-700 dark:text-zinc-300 max-w-[100px] truncate" title={att.name}>{att.name}</span>
                  <a href={att.url} download={att.name} className="text-[9px] text-primary hover:underline font-bold" onClick={(e) => e.stopPropagation()}>Descargar</a>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); onAttachmentsChange && onAttachmentsChange(attachments.filter((_, idx) => idx !== i)); }} className="ml-1 p-1 text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept="*/*" onChange={handleFileUpload} />
    </div>
  );
}
