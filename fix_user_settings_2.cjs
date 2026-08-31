const fs = require('fs');
let file = 'src/components/UserSettingsModal.tsx';
let content = fs.readFileSync(file, 'utf-8');

const regex = /<HealthCustomSelect\s+value=\{\s*profile\.activityLevel([^>]*?)label:\s*"Muy Activo \(5-6 días\/semana\)",\s*},\s*\]\}\s*\/>/g;
let replaced = false;

content = content.replace(regex, (match) => {
    replaced = true;
    return match.replace(/\/>$/, 'previewTransform={(lbl) => lbl.split(" (")[0]}\n                    />');
});

if (replaced) {
    fs.writeFileSync(file, content);
    console.log("Updated UserSettingsModal Nivel de Actividad");
} else {
    console.log("Still could not find it. Here is the block:");
    console.log(content.substring(content.indexOf("Nivel de Actividad Física"), content.indexOf("Nivel de Actividad Física") + 1000));
}
