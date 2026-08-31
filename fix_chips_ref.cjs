const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Ref y función para desplazamiento horizontal de los chips de filtrado rápido\n\s*const chipsScrollRef = useRef<HTMLDivElement>\(null\);\n\s*const scrollChips = \(direction: "left" \| "right"\) => \{\n\s*if \(chipsScrollRef\.current\) \{\n\s*const scrollAmount = direction === "left" \? -250 : 250;\n\s*chipsScrollRef\.current\.scrollBy\(\{ left: scrollAmount, behavior: "smooth" \}\);\n\s*\}\n\s*\};\n/g;

if (regex.test(content)) {
  content = content.replace(regex, '');
  fs.writeFileSync(file, content);
  console.log("Removed chips scroll logic.");
} else {
  console.log("Regex not found.");
}
