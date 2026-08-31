const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/*.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let original = content;
    
    // In CustomSelect definition:
    // <span className="flex items-center gap-1.5 truncate min-w-0 flex-1">
    // => <span className="flex items-center gap-1.5 whitespace-nowrap">
    content = content.replace(/<span className="flex items-center gap-1\.5 truncate min-w-0 flex-1">/g, '<span className="flex items-center gap-1.5 whitespace-nowrap">');
    
    // <span data-custom-select-selected={!!selectedOption} className={`truncate min-w-0 block
    // => <span data-custom-select-selected={!!selectedOption} className={`whitespace-nowrap block
    content = content.replace(/className={`truncate min-w-0 block (.*?)}`/g, 'className={`whitespace-nowrap block $1}`}');
    
    // Also, there might be slightly different definitions in some files:
    content = content.replace(/<span className="truncate min-w-0 block/g, '<span className="whitespace-nowrap block');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Updated", file);
    }
});
