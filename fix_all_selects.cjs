const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/*.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let original = content;
    
    // Convert `truncate ${selectedOption...}` to `whitespace-nowrap ${selectedOption...}`
    content = content.replace(/className={`truncate \$\{selectedOption/g, 'className={`whitespace-nowrap ${selectedOption');
    
    // There are other places that might have `truncate`.
    // Let's also check for subLabel rendering in some selects (like FinanceView and HealthView had them)
    content = content.replace(/className="font-bold text-xs truncate w-full"/g, 'className="font-bold text-xs whitespace-nowrap w-full"');
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Updated truncate to whitespace-nowrap in", file);
    }
});
