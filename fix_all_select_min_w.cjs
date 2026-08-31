const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/*.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let original = content;
    
    const customSelectRegex = /<CustomSelect([\s\S]*?)\/>/g;
    content = content.replace(customSelectRegex, (match, props) => {
        let newProps = props.replace(/min-w-\[[0-9]+px\]/g, '');
        newProps = newProps.replace(/className="\s*"/g, 'className=""');
        return `<CustomSelect${newProps}/>`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Cleaned min-w from CustomSelects in", file);
    }
});
