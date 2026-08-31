const fs = require('fs');

function addAnimations(file, configList) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  for (const config of configList) {
    const { stateVar, tabArray, layoutId } = config;

    for (const tab of tabArray) {
      // Find the button for this tab.
      // We look for:
      // className={`... ${stateVar === "tab" ? "active" : "inactive"}`}
      // >
      //   <Icon .../>
      //   <span ...>Text</span>
      // </button>
      
      const regexStr = 'className={`relative md:!flex-1 [^`]*\\$\\{\\s*' + stateVar + ' === "' + tab + '"\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"\\s*\\}\\`\\}\\s*>\\s*(<[^>]+>\\s*(?:<span[^>]*>[^<]+<\\/span>\\s*)?)(<\\/button>)';
      const regex = new RegExp(regexStr, 'g');

      content = content.replace(regex, (match, activeClass, inactiveClass, innerContent, closeButton) => {
        // we remove bg-primary from activeClass and move it to the motion.div
        let newActiveClass = activeClass.replace(/bg-primary\s*/g, '').replace(/shadow-md\s*/g, '').replace(/shadow-primary\/20\s*/g, '');
        // keep text colors
        changed = true;
        
        return `className={\`relative md:!flex-1 shrink-0 py-2.5 px-3 text-xs md:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 cursor-pointer z-10 whitespace-nowrap \${
                    ${stateVar} === "${tab}"
                      ? "${newActiveClass.trim()} font-black"
                      : "${inactiveClass.trim()} font-medium"
                  }\`}
                >
                  ${innerContent.trim()}
                  {${stateVar} === "${tab}" && (
                    <motion.div
                      layoutId="${layoutId}"
                      className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/20 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>`;
      });
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Animations added to ${file}`);
  }
}

addAnimations('src/components/HealthView.tsx', [
  { stateVar: 'clinicoActiveTab', tabArray: ['doctores', 'presion', 'estudios', 'medicamentos'], layoutId: 'activeClinicoTabIndicator' },
  { stateVar: 'deporteAlimActiveTab', tabArray: ['rutina', 'alimentacion', 'registro_diario'], layoutId: 'activeDeporteAlimTabIndicator' },
  { stateVar: 'medsActiveTab', tabArray: ['historial', 'stock'], layoutId: 'activeMedsTabIndicator' }
]);

addAnimations('src/components/GymRutinaView.tsx', [
  { stateVar: 'activeTab', tabArray: ['rutinas', 'historial', 'tecnica', 'progreso'], layoutId: 'activeGymRutinaTabIndicator' }
]);

console.log("Done animations script");
