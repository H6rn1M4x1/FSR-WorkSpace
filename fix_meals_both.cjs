const fs = require('fs');

let c = fs.readFileSync('src/components/MealsView.tsx', 'utf8');

// --- Organizacion Semanal ---
// Replace the top wrapper and Action bar for "organizacion_semanal"
let p1 = c.indexOf('{/* RENDER ORGANIZACION SEMANAL TAB */}');
let p2 = c.indexOf('{/* Table Container */}', p1);
if (p1 !== -1 && p2 !== -1) {
  let sub = c.substring(p1, p2);
  let replacement = `{/* RENDER ORGANIZACION SEMANAL TAB */}
      {activeSubTab === "organizacion_semanal" && (
        <div id="organizacion-semanal-section" className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}>
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <span>Organización Semanal</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Planifica qué días vas a cocinar cada plato.
              </p>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
              <button
                id="add-organizacion-btn"
                onClick={() => {
                  setEditingOrgId(null);
                  setOrgFecha("");
                  setOrgPlatoId("");
                  setShowAddOrg(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Organizar Plato</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
              <input
                id="search-organizacion-input"
                type="text"
                placeholder="Buscar por plato, día o fecha..."
                value={orgSearchQuery}
                onChange={(e) => setOrgSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/30 border border-slate-200/80 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all focus:border-slate-400 dark:focus:border-zinc-700"
              />
            </div>
          </div>

          `;
  c = c.substring(0, p1) + replacement + c.substring(p2);
}

// --- Lista de Compras ---
p1 = c.indexOf('{/* RENDER LISTA DE COMPRAS TAB */}');
p2 = c.indexOf('{/* Table Container */}', p1);
if (p1 !== -1 && p2 !== -1) {
  let sub = c.substring(p1, p2);
  let replacement = `{/* RENDER LISTA DE COMPRAS TAB */}
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
                    setShowAddManualShop(true);
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
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
              <input
                id="search-shop-input"
                type="text"
                placeholder="Buscar por mercadería, categoría, comercio o sector..."
                value={shopSearchQuery}
                onChange={(e) => setShopSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/30 border border-slate-200/80 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all focus:border-slate-400 dark:focus:border-zinc-700"
              />
            </div>
          </div>

          `;
  c = c.substring(0, p1) + replacement + c.substring(p2);
}

c = c.replace(/\{\/\* Table Container \*\/\}\n\s*<div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200\/60 dark:border-zinc-800\/60 overflow-hidden shadow-xs">/g, `{/* Table Container */}\n          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">`);

fs.writeFileSync('src/components/MealsView.tsx', c);
