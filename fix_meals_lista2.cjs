const fs = require('fs');

let c = fs.readFileSync('src/components/MealsView.tsx', 'utf8');

// The original pattern we want to replace
const regex = /\{\/\* RENDER LISTA DE COMPRAS TAB \*\/\}\n\s*\{activeSubTab === "lista_compras" && \(\n\s*<div id="lista-compras-section" className="space-y-6 animate-fade-in">\n\s*\{\/\* Action Bar \*\/\}\n\s*<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200\/60 dark:border-zinc-800\/60 shadow-xs">/;

const replacement = `{/* RENDER LISTA DE COMPRAS TAB */}
      {activeSubTab === "lista_compras" && (
        <div id="lista-compras-section" className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}>
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <span>Lista de Compras</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Genera y gestiona tu lista de supermercado a partir de tu organización semanal.
              </p>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  id="reset-shop-list-btn"
                  onClick={handleResetShoppingList}
                  className="px-3.5 py-2 rounded-full border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-950/40 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Restablecer todos los cambios de la lista"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer</span>
                </button>
                <button
                  id="add-manual-shop-btn"
                  onClick={() => {
                    setManualShopMercaderiaId("");
                    setManualShopQty("");
                    setShowManualShopModal(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Item Manual</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">`;

c = c.replace(regex, replacement);

// Next we must remove the OLD buttons and search bar wrapper from where they were.
// Let's just remove the old buttons
c = c.replace(/<div className="flex items-center gap-2">\n\s*<button\n\s*id="reset-shop-list-btn"[\s\S]*?<span>Item Manual<\/span>\n\s*<\/button>\n\s*<\/div>/, '');

// Now remove the closing tags of Action bar
c = c.replace(/<div className="relative flex-1 max-w-md">\n\s*<Search className="absolute left-3.5 top-1\/2 -translate-y-1\/2 w-4 h-4 text-slate-400 dark:text-zinc-500" \/>\n\s*<input\n\s*id="search-shop-input"[\s\S]*?\/>\n\s*<\/div>\n\s*<\/div>/, `<div className="relative flex-1 max-w-md">\n              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />\n              <input\n                id="search-shop-input"\n                type="text"\n                placeholder="Buscar por mercadería, categoría, comercio o sector..."\n                value={shopSearchQuery}\n                onChange={(e) => setShopSearchQuery(e.target.value)}\n                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/30 border border-slate-200/80 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all focus:border-slate-400 dark:focus:border-zinc-700"\n              />\n            </div>\n          </div>`);

c = c.replace(/\{\/\* List Container \*\/\}\n\s*<div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200\/60 dark:border-zinc-800\/60 overflow-hidden shadow-xs">/, `{/* List Container */}\n          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">`);

fs.writeFileSync('src/components/MealsView.tsx', c);
