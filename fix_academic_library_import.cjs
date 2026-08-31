const fs = require('fs');
let c = fs.readFileSync('src/components/AcademicView.tsx', 'utf8');

c = c.replace(/import \{\n\s*Library, SubNav \} from "\.\/SubNav";/, 'import { SubNav } from "./SubNav";');

// Find lucide-react import
c = c.replace(/import \{\n\s*(.*)\n\} from "lucide-react";/, 'import {\n  Library,\n  $1\n} from "lucide-react";');

fs.writeFileSync('src/components/AcademicView.tsx', c);
