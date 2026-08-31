const fs = require('fs');
let file = 'src/components/MealsView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace "Platos" search
content = content.replace(
  /<div className="relative flex-1 w-full sm:max-w-md">\s*<Search className="absolute left-3\.5 top-1\/2 -translate-y-1\/2 w-4 h-4 text-primary" \/>\s*<input\s*id="search-organizacion-input"/,
  '<div className="relative flex-1 w-full">\n              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />\n              <input\n                id="search-organizacion-input"'
);

// Replace "Mercadería" search
content = content.replace(
  /<div className="relative flex-1 w-full sm:max-w-md">\s*<Search className="absolute left-3\.5 top-1\/2 -translate-y-1\/2 w-4 h-4 text-primary" \/>\s*<input\s*id="search-shop-input"/,
  '<div className="relative flex-1 w-full">\n              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />\n              <input\n                id="search-shop-input"'
);

// Replace "Ingredientes" search container and input
const ingrSearchRegex = /<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">\s*\{\/\* Search query \*\/\}\s*<div className="relative sm:col-span-2">\s*<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">\s*<Search className="w-4 h-4 text-primary" \/>\s*<\/span>\s*<input\s*type="text"\s*placeholder="Buscar por ingredientes, categorías, comercios o sectores..."\s*value=\{searchQuery\}\s*onChange=\{\(e\) => setSearchQuery\(e.target.value\)\}\s*className="[^"]+"\s*\/>\s*<\/div>\s*\{\/\* Category selection \*\/\}\s*<CustomSelect\s*value=\{selectedCategory\}\s*onChange=\{\(val\) => setSelectedCategory\(val\)\}\s*options=\{categoriesList\.map\(\(cat\) => \(\{\s*value: cat,\s*label: cat,\s*\}\)\)\}\s*icon=\{<Filter className="w-3\.5 h-3\.5" \/>\}\s*className="w-full"\s*\/>\s*<\/div>/;

const ingrSearchReplacement = `<div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
            {/* Search query */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="text"
                placeholder="Buscar por ingredientes, categorías, comercios o sectores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/30 border border-slate-200/80 dark:border-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none transition-all focus:border-slate-400 dark:focus:border-zinc-700"
              />
            </div>
            {/* Category selection */}
            <CustomSelect
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={categoriesList.map((cat) => ({
                value: cat,
                label: cat,
              }))}
              icon={<Filter className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto min-w-[200px]"
            />
          </div>`;

content = content.replace(ingrSearchRegex, ingrSearchReplacement);

fs.writeFileSync(file, content);
