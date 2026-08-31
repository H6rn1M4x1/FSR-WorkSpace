const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/*.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let original = content;
    
    // Convert `}`} to `}` in that specific place
    content = content.replace(/font-normal"}`}}/g, 'font-normal"}`}');
    content = content.replace(/className={`whitespace-nowrap block \$\{([^}]+)\}`}}/g, 'className={`whitespace-nowrap block ${$1}`}');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Fixed syntax in", file);
    }
});
