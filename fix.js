const fs = require('fs');
let code = fs.readFileSync('src/components/RichTextEditor.tsx', 'utf8');

// I can just replace the string if I use the actual contents
// Let's use string operations in Node? Oh, wait, require is not defined.
// Use sed!
