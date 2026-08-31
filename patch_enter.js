const fs = require('fs');
let code = fs.readFileSync('src/components/RichTextEditor.tsx', 'utf8');

code = code.replace(/onKeyDown=\{\(e\) => \{[\s\S]*?data-placeholder=\{placeholder\}/, `onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              let currentNode = selection.anchorNode;
              if (currentNode?.nodeType === 3) currentNode = currentNode.parentNode;
              
              const parentEl = currentNode as HTMLElement;
              if (parentEl) {
                // Find the closest container inside the editor (don't go outside editorRef)
                const lineBlock = parentEl.closest('div');
                if (lineBlock && lineBlock !== editorRef.current && lineBlock.querySelector('input[type="checkbox"]')) {
                   e.preventDefault();
                   const text = lineBlock.textContent?.replace(/\\u00A0/g, '').trim();
                   if (!text) {
                     // Empty checkbox line: Replace with a clean new line
                     const range = document.createRange();
                     range.selectNode(lineBlock);
                     selection.removeAllRanges();
                     selection.addRange(range);
                     execCommand("insertHTML", "<div><br/></div>");
                   } else {
                     // Has content: Insert a new line with a checkbox
                     execCommand("insertHTML", "<br/><input type='checkbox' style='margin-right: 6px; cursor: pointer;' />&nbsp;");
                   }
                   return; // stop here
                } else if (parentEl === editorRef.current) {
                   // If they are at the root level and somehow there's a checkbox next to them?
                   // Usually the checkbox is wrapped in a div. 
                   // Let's just do a basic check if the immediate child they are in has a checkbox
                   // but standard enter is fine otherwise.
                }
              }
            }
          }
        }}
        data-placeholder={placeholder}`);

fs.writeFileSync('src/components/RichTextEditor.tsx', code);
