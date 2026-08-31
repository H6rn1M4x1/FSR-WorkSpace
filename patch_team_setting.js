import fs from 'fs';
let code = fs.readFileSync('src/components/UserSettingsModal.tsx', 'utf8');

code = code.replace(
  /\{\/\* Background Style Option Card \*\/\}/,
  `{/* Favorite Team Option Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3 shadow-xs">
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span>Equipo Favorito (Deportes)</span>
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                    Ingresa tu equipo de fútbol, baloncesto u otro deporte para ver resultados rápidos en inicio.
                  </p>
                </div>
                <input
                  type="text"
                  value={profileData.favoriteTeam || ""}
                  onChange={(e) => setProfileData({ ...profileData, favoriteTeam: e.target.value })}
                  className="w-full h-10 px-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ej: Boca Juniors, Real Madrid, Lakers..."
                />
              </div>
              
              {/* Background Style Option Card */}`
);

fs.writeFileSync('src/components/UserSettingsModal.tsx', code);
