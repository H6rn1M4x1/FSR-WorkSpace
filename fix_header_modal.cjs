const fs = require('fs');
const content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const startIdx = content.indexOf('{showNotifications && (');
const endIdx = content.lastIndexOf(')}') + ')}'.length; // that might be wrong.
