const fs = require('fs');
let css = fs.readFileSync('src/components/AnimatedList.css', 'utf8');

// Replace .scroll-list-container rules to make it a flex column
css = css.replace(
  '.scroll-list-container {\n  position: relative;\n  width: 100%;\n  overflow: hidden;\n  border-radius: 1.25rem;\n}',
  '.scroll-list-container {\n  position: relative;\n  width: 100%;\n  overflow: hidden;\n  border-radius: 1.25rem;\n  display: flex;\n  flex-direction: column;\n}'
);

// Replace .scroll-list rules to make it flex-1 min-h-0
css = css.replace(
  '.scroll-list {\n  max-height: 420px;\n  overflow-y: auto;\n  padding: 8px 8px 68px 8px;\n  display: flex;\n  flex-direction: column;\n  gap: 0.85rem;\n}',
  '.scroll-list {\n  flex: 1;\n  min-height: 0;\n  max-height: 420px;\n  overflow-y: auto;\n  padding: 8px 8px 68px 8px;\n  display: flex;\n  flex-direction: column;\n  gap: 0.85rem;\n}'
);

fs.writeFileSync('src/components/AnimatedList.css', css, 'utf8');
console.log("Patched AnimatedList.css");
