const fs = require('fs');
let content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf8');

const target = 'const [activeTab, setActiveTab] = useState<"rutinas" | "logger" | "tecnica" | "progreso" | "historial">("rutinas");';
const replacement = target + '\n  const [selectedFilterDate, setSelectedFilterDate] = useState<Date | null>(null);';

content = content.replace(target, replacement);
fs.writeFileSync('src/components/GymRutinaView.tsx', content, 'utf8');
console.log("Added state");
