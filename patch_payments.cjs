const fs = require('fs');
let file = 'src/components/PaymentsTable.tsx';
let content = fs.readFileSync(file, 'utf-8');

const inputClass = 'w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700';

const replacement = `<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
          {/* Search query */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input
              type="text"
              placeholder="Buscar por descripción, categoría, método..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="${inputClass}"
            />
          </div>
          {/* Category selection */}
          <CustomSelect
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
            options={allCategories.map((cat) => ({ value: cat, label: cat }))}
            icon={<Filter className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto min-w-[200px]"
            size="sm"
          />
        </div>`;

const regex = /<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">[\s\S]*?size="sm"\n\s*\/>\n\s*<\/div>/;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log("Updated PaymentsTable");
