const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');

// Last fix introduced an extra </div> or fragment mismatch.
// We previously did:
// content = content.replace(/          document\.body\n        \)\}\n    <\/>/g, `          document.body\n        )}\n      </div>\n    </>`);
// This means the end of the file looks like:
//           document.body
//         )}
//       </div>
//     </>
//   );
// };
// Let's remove the extra </div> because it might be correctly closed further up.
// Or wait, the error is: "Unexpected closing "div" tag does not match opening fragment tag"

content = content.replace(/          document\.body\n        \)\}\n      <\/div>\n    <\/>/g, `          document.body\n        )}\n    </>`);

fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf-8');
console.log("Fixed gym structure bottom");
