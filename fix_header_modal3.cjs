const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const targetStr = `              document.body
            )}`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, targetStr + "\n        </div>\n      </div>\n    </header>\n");
    fs.writeFileSync('src/components/Header.tsx', content);
    console.log("Fixed missing tags.");
} else {
    console.log("Could not find target to fix.");
}
