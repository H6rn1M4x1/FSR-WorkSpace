const fs = require('fs');
let content = fs.readFileSync('src/components/TopNavbar.tsx', 'utf-8');

const targetStr = `onClick={() => {
                          if (onSubTabChange) onSubTabChange(subItem.id); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });`;

const replacementStr = `onClick={(e) => {
                          if (onSubTabChange) onSubTabChange(subItem.id); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });`;

content = content.replace(targetStr, replacementStr);

fs.writeFileSync('src/components/TopNavbar.tsx', content, 'utf-8');
console.log("Done");
