const fs = require('fs');
let content = fs.readFileSync('src/components/TopNavbar.tsx', 'utf-8');

const target = `{showNotifications && (
                <motion.div`;

const replacement = `<AnimatePresence>
              {showNotifications && (
                <motion.div`;

if (content.includes(target) && !content.includes(replacement)) {
    content = content.replace(target, replacement);
    content = content.replace(`</motion.div>\n              )}`, `</motion.div>\n              )}\n              </AnimatePresence>`);
    fs.writeFileSync('src/components/TopNavbar.tsx', content);
    console.log("Fixed AnimatePresence in TopNavbar");
}
