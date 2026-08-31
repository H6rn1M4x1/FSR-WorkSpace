const fs = require('fs');
let content = fs.readFileSync('src/components/TopNavbar.tsx', 'utf-8');

const regex = /const handleScrollSubMenu = \(\w+: "left" \| "right"\) => \{[\s\S]*?\n\s*\};\n/m;
const leftBtnRegex = /<button[^>]*onClick=\{\(\) => handleScrollSubMenu\("left"\)\}[^>]*className="([^"]*)"/g;
const rightBtnRegex = /<button[^>]*onClick=\{\(\) => handleScrollSubMenu\("right"\)\}[^>]*className="([^"]*)"/g;

const replacementStr = `const handleScrollSubMenu = (direction: "left" | "right") => {
    if (!currentSubMenu || currentSubMenu.length === 0) return;
    
    // Auto-select next/prev tab instead of just scrolling
    if (onSubTabChange && activeSubTab) {
      const currentIndex = currentSubMenu.findIndex(item => item.id === activeSubTab);
      if (direction === "left" && currentIndex > 0) {
        onSubTabChange(currentSubMenu[currentIndex - 1].id);
        if (subMenuScrollRef.current) {
          const buttons = subMenuScrollRef.current.querySelectorAll('button');
          if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      } else if (direction === "right" && currentIndex < currentSubMenu.length - 1) {
        onSubTabChange(currentSubMenu[currentIndex + 1].id);
        if (subMenuScrollRef.current) {
          const buttons = subMenuScrollRef.current.querySelectorAll('button');
          if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    } else {
      // Fallback if no subtab handling is present
      if (subMenuScrollRef.current) {
        const container = subMenuScrollRef.current;
        const scrollAmount = 180;
        container.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };\n`;

if (regex.test(content)) {
  content = content.replace(regex, replacementStr);
  
  // Disable logic
  content = content.replace(leftBtnRegex, (match, p1) => {
    if (p1.includes('{`')) return match;
    return match.replace(`className="${p1}"`, `className={\`${p1} \${currentSubMenu?.findIndex(item => item.id === activeSubTab) === 0 ? "opacity-30 pointer-events-none" : ""}\`}`);
  });
  
  content = content.replace(rightBtnRegex, (match, p1) => {
    if (p1.includes('{`')) return match;
    return match.replace(`className="${p1}"`, `className={\`${p1} \${currentSubMenu?.findIndex(item => item.id === activeSubTab) === (currentSubMenu?.length || 1) - 1 ? "opacity-30 pointer-events-none" : ""}\`}`);
  });
  
  fs.writeFileSync('src/components/TopNavbar.tsx', content, 'utf-8');
  console.log("Done TopNavbar");
} else {
  console.log("Regex did not match TopNavbar");
}

