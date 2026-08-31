const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Estado para el menú desplegable personalizado de selección de ejercicio\n\s*const \[isExerciseSelectOpen, setIsExerciseSelectOpen\] = useState\(false\);\n\s*const \[exerciseDropdownSearch, setExerciseDropdownSearch\] = useState\(""\);\n\s*const exerciseDropdownRef = useRef<HTMLDivElement>\(null\);\n\n\s*useEffect\(\(\) => \{\n\s*const handleClickOutside = \(event: MouseEvent\) => \{\n\s*if \(\n\s*exerciseDropdownRef\.current &&\n\s*!exerciseDropdownRef\.current\.contains\(event\.target as Node\)\n\s*\) \{\n\s*setIsExerciseSelectOpen\(false\);\n\s*\}\n\s*\};\n\s*document\.addEventListener\("mousedown", handleClickOutside\);\n\s*return \(\) => \{\n\s*document\.removeEventListener\("mousedown", handleClickOutside\);\n\s*\};\n\s*\}, \[\]\);/g;

if (regex.test(content)) {
  content = content.replace(regex, '// Estado para la búsqueda de ejercicios en el gráfico\n  const [exerciseDropdownSearch, setExerciseDropdownSearch] = useState("");');
  fs.writeFileSync(file, content);
  console.log("Cleaned up unused state.");
} else {
  console.log("Regex not found.");
}
