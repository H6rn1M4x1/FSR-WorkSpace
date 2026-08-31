import fs from 'fs';

let code = fs.readFileSync('src/components/HomeView.tsx', 'utf8');

code = code.replace(
  /<div className="space-y-6 animate-fade-in p-6" id="home-view-container">\s*\{\/\* Main Grid Content \*\/\}/,
  `<div className="space-y-6 animate-fade-in p-6" id="home-view-container">
      {/* Top Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Weather Widget */}
        <div className="bg-gradient-to-br from-sky-400 to-blue-500 dark:from-sky-500 dark:to-blue-700 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden flex items-center justify-between">
          <div className="relative z-10">
            <h3 className="font-bold text-sm opacity-90 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Mi Ubicación
            </h3>
            <div className="text-4xl font-extrabold mt-1 tracking-tight">24°C</div>
            <p className="text-xs font-medium opacity-90 mt-1">Soleado / Despejado</p>
          </div>
          <Sun className="w-16 h-16 text-yellow-300 relative z-10 animate-[spin_10s_linear_infinite]" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        </div>

        {/* Favorite Team Widget */}
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-emerald-500 dark:to-teal-700 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden flex items-center justify-between">
          <div className="relative z-10">
            <h3 className="font-bold text-sm opacity-90 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> {userProfile?.favoriteTeam || "Mi Equipo Favorito"}
            </h3>
            <div className="text-sm font-extrabold mt-1 tracking-tight flex items-center gap-2">
              <span className="text-2xl">2</span>
              <span className="opacity-50">-</span>
              <span className="text-2xl">1</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Finalizado</span>
            </div>
            <p className="text-[11px] font-medium opacity-90 mt-1">vs Rival FC (Local)</p>
          </div>
          <div className="relative z-10 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-black/10 rounded-full blur-3xl -mr-10 -mb-10 pointer-events-none" />
        </div>
      </div>

      {/* Main Grid Content */}`
);

fs.writeFileSync('src/components/HomeView.tsx', code);
