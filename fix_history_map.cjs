const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf8');

const targetOld = `                  </div>
                );
              }
            })}
            {combinedHistory.length === 0 && (`;

const targetNew = `                  </div>
                );
              }
            });
            })()}
            {combinedHistory.length === 0 && (`;

content = content.replace(targetOld, targetNew);
fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf8');
console.log("Fixed map");
