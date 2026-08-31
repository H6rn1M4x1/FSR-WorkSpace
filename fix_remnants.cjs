const fs = require('fs');

function updateComponentTabs(file, configList) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  for (const config of configList) {
    const { name, stateVar, stateSetter, tabArray, refName } = config;
    const tabsArrayStr = JSON.stringify(tabArray);

    const leftRegex = new RegExp(`const scroll${name}TabsLeft = \\(\\)[\\s\\S]*?(?:\\n  \\};|\\n\\};)`, '');
    const rightRegex = new RegExp(`const scroll${name}TabsRight = \\(\\)[\\s\\S]*?(?:\\n  \\};|\\n\\};)`, '');

    const leftNew = `const scroll${name}TabsLeft = () => {
    const tabs = ${tabsArrayStr};
    const currentIndex = tabs.indexOf(${stateVar});
    if (currentIndex > 0) {
      ${stateSetter}(tabs[currentIndex - 1] as any);
      if (${refName}.current) {
        const buttons = ${refName}.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };`;

    const rightNew = `const scroll${name}TabsRight = () => {
    const tabs = ${tabsArrayStr};
    const currentIndex = tabs.indexOf(${stateVar});
    if (currentIndex < tabs.length - 1) {
      ${stateSetter}(tabs[currentIndex + 1] as any);
      if (${refName}.current) {
        const buttons = ${refName}.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };`;

    if (leftRegex.test(content)) {
      content = content.replace(leftRegex, leftNew);
      changed = true;
    }

    if (rightRegex.test(content)) {
      content = content.replace(rightRegex, rightNew);
      changed = true;
    }
    
    const leftBtnRegex = new RegExp(`(<button[^>]*onClick=\\{scroll${name}TabsLeft\\}[^>]*)className="([^"]*)"`, 'g');
    content = content.replace(leftBtnRegex, (match, p1, p2) => {
      if (p2.includes('{`')) return match;
      changed = true;
      return `${p1}className={\`${p2} \${${tabsArrayStr}.indexOf(${stateVar}) === 0 ? "opacity-30 pointer-events-none" : ""}\`}`;
    });

    const rightBtnRegex = new RegExp(`(<button[^>]*onClick=\\{scroll${name}TabsRight\\}[^>]*)className="([^"]*)"`, 'g');
    content = content.replace(rightBtnRegex, (match, p1, p2) => {
      if (p2.includes('{`')) return match;
      changed = true;
      return `${p1}className={\`${p2} \${${tabsArrayStr}.indexOf(${stateVar}) === ${tabArray.length - 1} ? "opacity-30 pointer-events-none" : ""}\`}`;
    });
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}

updateComponentTabs('src/components/InversionesTable.tsx', [
  { name: '', stateVar: 'activeTable', stateSetter: 'setActiveTable', tabArray: ['Tradicional', 'Cripto'], refName: 'scrollContainerRef' }
]);

updateComponentTabs('src/components/GymRutinaView.tsx', [
  { name: '', stateVar: 'activeTab', stateSetter: 'setActiveTab', tabArray: ['rutinas', 'historial', 'tecnica', 'progreso'], refName: 'tabsScrollRef' }
]);

console.log("Done remnants");
