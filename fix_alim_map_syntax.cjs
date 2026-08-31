const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
content = content.replace(`                            )
                            })}
                      </tbody>`, `                            )
                          })}
                      </tbody>`);
fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Fixed syntax");
