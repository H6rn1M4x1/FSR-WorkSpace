const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/*.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let original = content;
    
    // We want to remove min-w-[150px], min-w-[160px], min-w-[180px], min-w-[200px] 
    // from className="w-full sm:w-auto min-w-[...]" or className="min-w-[...]"
    
    content = content.replace(/min-w-\[150px\]/g, '');
    content = content.replace(/min-w-\[160px\]/g, '');
    content = content.replace(/min-w-\[180px\]/g, '');
    content = content.replace(/min-w-\[200px\]/g, '');
    
    // Clean up multiple spaces
    content = content.replace(/className="w-full sm:w-auto\s+"/g, 'className="w-full sm:w-auto"');
    content = content.replace(/className="\s+"/g, 'className=""');
    
    // Specific check for min-w-[220px] in GymRutinaView which might be the search input, let's keep that one if it's not a select.
    // I only replaced 150, 160, 180, 200 which were the ones I injected.

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Updated", file);
    }
});
