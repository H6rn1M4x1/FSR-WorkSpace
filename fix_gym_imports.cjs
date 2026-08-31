const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { CustomSelect }')) {
  // Find the place after other imports
  content = content.replace(
    /import \{ MuscleCanvasMap \} from "\.\/MuscleCanvasMap";/,
    'import { MuscleCanvasMap } from "./MuscleCanvasMap";\nimport { CustomSelect } from "./CustomSelect";'
  );
  
  // If CustomSelect isn't a separate component but usually defined inline or in another file, let's check
}

fs.writeFileSync(file, content);
