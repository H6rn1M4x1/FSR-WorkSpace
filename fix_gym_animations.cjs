const fs = require('fs');

function addAnimations(file) {
  let content = fs.readFileSync(file, 'utf-8');
  
  content = content.replace(/className={\`relative md:!flex-1 shrink-0 py-2\.5 px-3 text-xs md:text-sm font-black transition-colors rounded-full flex items-center justify-center gap-1\.5 cursor-pointer z-10 whitespace-nowrap \$\{\s*activeTab === "([a-z]+)"\s*\?\s*"([^"]*)"\s*:\s*"([^"]*)"\s*\}\`\}\s*>\s*(<[^>]+>\s*[^<]+)\s*<\/button>/g, 
  (match, tab, activeClass, inactiveClass, innerContent) => {
    let newActiveClass = activeClass.replace(/bg-primary\s*/g, '').replace(/shadow-sm\s*/g, '');
    return `className={\`relative md:!flex-1 shrink-0 py-2.5 px-3 text-xs md:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 cursor-pointer z-10 whitespace-nowrap \${
                    activeTab === "${tab}"
                      ? "${newActiveClass.trim()} font-black"
                      : "${inactiveClass.trim()} font-medium"
                  }\`}
                >
                  ${innerContent.trim()}
                  {activeTab === "${tab}" && (
                    <motion.div
                      layoutId="activeGymRutinaTabIndicator"
                      className="absolute inset-0 rounded-full bg-primary shadow-sm -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>`;
  });

  fs.writeFileSync(file, content, 'utf-8');
  console.log(`Animations added to ${file}`);
}

addAnimations('src/components/GymRutinaView.tsx');
