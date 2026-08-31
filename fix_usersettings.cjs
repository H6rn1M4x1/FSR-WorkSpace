const fs = require('fs');
let content = fs.readFileSync('src/components/UserSettingsModal.tsx', 'utf-8');

const regex = /const scrollTabs = \(\w+: "left" \| "right"\) => \{[\s\S]*?\n\s*\};\n/m;

const replacementStr = `const scrollTabs = (direction: "left" | "right") => {
    const tabs = ["profile", "appearance", "health", "security", "backup"];
    const currentIndex = tabs.indexOf(activeTab);
    
    if (direction === "left" && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1] as any);
      if (tabsRef.current) {
        const buttons = tabsRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    } else if (direction === "right" && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1] as any);
      if (tabsRef.current) {
        const buttons = tabsRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };\n`;

if (regex.test(content)) {
  content = content.replace(regex, replacementStr);
  
  const leftBtnRegex = /<button[^>]*onClick=\{\(\) => scrollTabs\("left"\)\}[^>]*className="([^"]*)"/g;
  content = content.replace(leftBtnRegex, (match, p1) => {
    if (p1.includes('{`')) return match;
    return match.replace(`className="${p1}"`, `className={\`${p1} \${["profile", "appearance", "health", "security", "backup"].indexOf(activeTab) === 0 ? "opacity-30 pointer-events-none" : ""}\`}`);
  });
  
  const rightBtnRegex = /<button[^>]*onClick=\{\(\) => scrollTabs\("right"\)\}[^>]*className="([^"]*)"/g;
  content = content.replace(rightBtnRegex, (match, p1) => {
    if (p1.includes('{`')) return match;
    return match.replace(`className="${p1}"`, `className={\`${p1} \${["profile", "appearance", "health", "security", "backup"].indexOf(activeTab) === 4 ? "opacity-30 pointer-events-none" : ""}\`}`);
  });
  
  fs.writeFileSync('src/components/UserSettingsModal.tsx', content, 'utf-8');
  console.log("Done UserSettingsModal");
} else {
  console.log("Regex did not match UserSettingsModal");
}

