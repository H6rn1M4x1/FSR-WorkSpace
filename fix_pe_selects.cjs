const fs = require('fs');
let file = 'src/components/AcademicView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const regexPeMateria = /<CustomSelect\s+value=\{peSelectedMateria\}[\s\S]*?placeholder="Filtrar Materia"\s*\/>/;
const regexPeYear = /<CustomSelect\s+value=\{peSelectedYear\}[\s\S]*?placeholder="Año"\s*className=""\s*\/>/;
const regexPeCuat = /<CustomSelect\s+value=\{peSelectedCuatrimestre\}[\s\S]*?placeholder="Cuatrimestre"\s*className=""\s*\/>/;
const regexPeCur = /<CustomSelect\s+value=\{peSelectedCursarRendir\}[\s\S]*?placeholder="Cursar o Rendir"\s*className=""\s*\/>/;

let orig = content;
content = content.replace(regexPeMateria, `<CustomSelect
                      value={peSelectedMateria}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      onChange={(val) => setPeSelectedMateria(val)}
                      options={peMateriaOptions}
                      placeholder="Filtrar Materia"
                      size="sm"
                      className="w-full sm:w-auto"
                    />`);

content = content.replace(regexPeYear, `<CustomSelect
                      value={peSelectedYear}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      onChange={(val) => setPeSelectedYear(val)}
                      options={peYearOptions}
                      placeholder="Año"
                      size="sm"
                      className="w-full sm:w-auto"
                    />`);

content = content.replace(regexPeCuat, `<CustomSelect
                      value={peSelectedCuatrimestre}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      onChange={(val) => setPeSelectedCuatrimestre(val)}
                      options={peCuatrimestreOptions}
                      placeholder="Cuatrimestre"
                      size="sm"
                      className="w-full sm:w-auto"
                    />`);

content = content.replace(regexPeCur, `<CustomSelect
                      value={peSelectedCursarRendir}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      onChange={(val) => setPeSelectedCursarRendir(val)}
                      options={peCursarRendirOptions}
                      placeholder="Cursar o Rendir"
                      size="sm"
                      className="w-full sm:w-auto"
                    />`);

const searchRegex = /<Search className="absolute left-3\.5 top-1\/2 -translate-y-1\/2 w-4 h-4 text-primary" \/>\s*<input\s*type="text"\s*value=\{peSearchQuery\}\s*onChange=\{\(e\) => setPeSearchQuery\(e\.target\.value\)\}\s*placeholder="Buscar materia por nombre\.\.\."\s*className="w-full pl-10 pr-4 py-2 rounded-xl/g;
content = content.replace(searchRegex, `<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input
                      type="text"
                      value={peSearchQuery}
                      onChange={(e) => setPeSearchQuery(e.target.value)}
                      placeholder="Buscar materia por nombre..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl`);

if (content !== orig) {
    fs.writeFileSync(file, content);
    console.log("Updated pe select fields");
} else {
    console.log("No changes made. Check regex.");
}
