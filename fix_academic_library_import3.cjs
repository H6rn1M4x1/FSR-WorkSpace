const fs = require('fs');
let c = fs.readFileSync('src/components/AcademicView.tsx', 'utf8');

c = c.replace(/import \{\n\s*Library, SubNav \} from "\.\/SubNav";/, 'import { SubNav } from "./SubNav";');

// Find lucide-react and add Library
c = c.replace(/import \{\n\s*Calendar,/, 'import {\n  Library,\n  Calendar,');

fs.writeFileSync('src/components/AcademicView.tsx', c);
