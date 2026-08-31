const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Insert import
if (!content.includes('import { InteractiveBackground }')) {
  content = content.replace('import { Header } from "./components/Header";', 'import { Header } from "./components/Header";\nimport { InteractiveBackground } from "./components/InteractiveBackground";');
}

// Insert component
if (!content.includes('<InteractiveBackground />')) {
  const target = '<div className={`min-h-screen flex ${darkMode ? "bg-[#131314] text-[#e3e2e6]" : "bg-[#f8f9fa] text-[#1f1f1f]"} font-sans transition-all duration-200`}>';
  content = content.replace(target, target + '\n      <InteractiveBackground />');
}

// Make backgrounds transparent to see the interactive background
content = content.replace('bg-[#131314]', 'bg-transparent');
content = content.replace('bg-[#f8f9fa]', 'bg-transparent');

fs.writeFileSync('src/App.tsx', content, 'utf8');
