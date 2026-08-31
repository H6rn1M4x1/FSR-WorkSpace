const fs = require('fs');
let file = 'src/components/UserSettingsModal.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add previewTransform to HealthCustomSelectProps
content = content.replace(
  /searchable\?: boolean;\n}/,
  `searchable?: boolean;
  previewTransform?: (label: string) => string;
}`
);

// 2. Destructure previewTransform in HealthCustomSelect
content = content.replace(
  /searchable = false,\n}\) => {/,
  `searchable = false,
  previewTransform,
}) => {`
);

// 3. Apply previewTransform to selectedOption.label
content = content.replace(
  /\{selectedOption \? selectedOption\.label : placeholder\}/,
  `{selectedOption ? (previewTransform ? previewTransform(selectedOption.label) : selectedOption.label) : placeholder}`
);

// 4. Pass previewTransform to Nivel de Actividad Física
const targetSelect = /<HealthCustomSelect\s+value=\{\s*profile\.activityLevel \|\|[\s\S]*?label: "Muy Activo \(5-6 días\/semana\)",\s*},\s*\]\}\s*\/>/;

const match = content.match(/<HealthCustomSelect\s+value=\{\s*profile\.activityLevel \|\|[\s\S]*?label: "Muy Activo \(5-6 días\/semana\)",\s*},\s*\]\}\s*\/>/);
if (match) {
    let replaced = match[0].replace('/>', 'previewTransform={(lbl) => lbl.split(" (")[0]}\n                    />');
    content = content.replace(match[0], replaced);
    fs.writeFileSync(file, content);
    console.log("Updated UserSettingsModal dropdown preview");
} else {
    console.log("Could not find Nivel de Actividad in UserSettingsModal");
}
