const fs = require('fs');
let content = fs.readFileSync('src/components/SubNav.tsx', 'utf-8');

const targetStr = `const scrollTabs = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const scrollAmount = 220;
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };`;

const replacementStr = `const scrollTabs = (direction: "left" | "right") => {
    if (!tabs || tabs.length === 0) return;
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    
    if (direction === "left" && currentIndex > 0) {
      onTabChange(tabs[currentIndex - 1].id);
      if (tabsContainerRef.current) {
        const buttons = tabsContainerRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    } else if (direction === "right" && currentIndex < tabs.length - 1) {
      onTabChange(tabs[currentIndex + 1].id);
      if (tabsContainerRef.current) {
        const buttons = tabsContainerRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    } else {
      if (tabsContainerRef.current) {
        const scrollAmount = 220;
        tabsContainerRef.current.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };`;

content = content.replace(targetStr, replacementStr);

// Now disable left/right arrows when at bounds
const leftBtnRegex = /<button[^>]*onClick=\{\(\) => scrollTabs\("left"\)\}[^>]*className="([^"]*)"/g;
content = content.replace(leftBtnRegex, (match, p1) => {
  if (p1.includes('{`')) return match;
  return match.replace(`className="${p1}"`, `className={\`${p1} \${tabs.findIndex(t => t.id === activeTab) === 0 ? "opacity-30 pointer-events-none" : ""}\`}`);
});

const rightBtnRegex = /<button[^>]*onClick=\{\(\) => scrollTabs\("right"\)\}[^>]*className="([^"]*)"/g;
content = content.replace(rightBtnRegex, (match, p1) => {
  if (p1.includes('{`')) return match;
  return match.replace(`className="${p1}"`, `className={\`${p1} \${tabs.findIndex(t => t.id === activeTab) === tabs.length - 1 ? "opacity-30 pointer-events-none" : ""}\`}`);
});

fs.writeFileSync('src/components/SubNav.tsx', content, 'utf-8');
console.log("Done SubNav");
