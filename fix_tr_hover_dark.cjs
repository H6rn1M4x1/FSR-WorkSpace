const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src/components', (filePath) => {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    let parts = content.split(/<tr/);
    for (let i = 1; i < parts.length; i++) {
      let part = parts[i];
      let endTagIndex = part.indexOf('>');
      if (endTagIndex !== -1) {
        let tagContent = part.substring(0, endTagIndex);
        let classMatch = tagContent.match(/className=(?:\{`|["'])([^"`'}]+)(?:`\}|["'])/);
        
        if (classMatch) {
          let classes = classMatch[1];
          let newClasses = classes;
          
          if (newClasses.includes('hover:outline-slate-300')) {
             if (!newClasses.includes('dark:hover:outline-none')) {
                 newClasses = newClasses.trim() + ' dark:hover:outline-none';
             }
          }
          
          newClasses = newClasses.replace(/\s+/g, ' ').trim();
          let newTagContent = tagContent.replace(classMatch[1], newClasses);
          parts[i] = newTagContent + part.substring(endTagIndex);
        }
      }
    }
    
    let newContent = parts.join('<tr');
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('Updated dark outline none ' + filePath);
    }
  }
});
