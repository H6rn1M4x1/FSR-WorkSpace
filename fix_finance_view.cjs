const fs = require('fs');
let file = 'src/components/FinanceView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add TasaData interface at the top
const regexInterface = /interface ResumenMetricas \{/;
const newInterface = `interface TasaData {
  id: string;
  name: string;
  type?: string;
  tna: string;
  logo: string;
  currency: 'ARS' | 'USD';
}

interface ResumenMetricas {`;
content = content.replace(regexInterface, newInterface);

// 2. Add State for Tasas
const regexState = /const \[isExpandedResumen, setIsExpandedResumen\] = useState\(false\);/;
const newState = `const [isExpandedResumen, setIsExpandedResumen] = useState(false);
  const [tasasData, setTasasData] = useState<TasaData[]>([]);`;
content = content.replace(regexState, newState);

// 3. Add useEffect for fetching Tasas
const regexUseEffect = /useEffect\(\(\) => \{\n\s*let montosFiltrados = \[\];/;
const newUseEffect = `useEffect(() => {
    const fetchTasas = async () => {
      try {
        const CACHE_KEY = 'tasas_ar_data';
        const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_EXPIRATION) {
            setTasasData(data);
            return;
          }
        }

        const [arsRes, usdRes] = await Promise.all([
          fetch('https://space.tasas.ar/api/bancos-digitales?include_uri=1'),
          fetch('https://space.tasas.ar/api/bancos-digitales/dolares?include_uri=1')
        ]);

        const arsData = await arsRes.json();
        const usdData = await usdRes.json();

        const combined = [
          ...(arsData.data || []).map((item: any) => ({ ...item, currency: 'ARS' })),
          ...(usdData.data || []).map((item: any) => ({ ...item, currency: 'USD' }))
        ];

        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: combined,
          timestamp: Date.now()
        }));

        setTasasData(combined);
      } catch (error) {
        console.error('Error fetching tasas:', error);
      }
    };

    fetchTasas();
  }, []);

  useEffect(() => {
    let montosFiltrados = [];`;
content = content.replace(regexUseEffect, newUseEffect);

// 4. Inject the UI block
const regexInject = /\{\/\* Sección de Inversiones: Ganancias\/Pérdidas, Acción Abierta con Mayor Crecimiento y Recomendaciones 6M \*\/\}/;
const newInject = `{/* Sección de Tasas de Rendimiento (tasas.ar) */}
              <div
                className={\`p-6 rounded-3xl border space-y-6 \${
                  darkMode
                    ? "bg-zinc-900/60 backdrop-blur-md border-zinc-800/80 text-white shadow-lg"
                    : "bg-white/80 backdrop-blur-md border-slate-200/80 text-zinc-800 shadow-sm"
                }\`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-zinc-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <h3
                        className="font-extrabold text-base dark:text-white flex items-center gap-2"
                        style={{ color: darkMode ? undefined : "#000000" }}
                      >
                        Rendimientos Bancos Digitales y FCI
                        <span className="px-2 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full font-bold">
                          tasas.ar
                        </span>
                      </h3>
                    </div>
                    <p
                      className="text-xs dark:text-zinc-400 mt-1 font-medium"
                      style={{ color: darkMode ? undefined : "#334155" }}
                    >
                      Tasas nominales anuales (TNA) de las principales billeteras y fondos actualizadas diariamente.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tasas ARS */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-extrabold dark:text-zinc-200 flex items-center gap-1.5" style={{ color: darkMode ? undefined : "#1e293b" }}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Rendimientos en Pesos (ARS)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {tasasData.filter(t => t.currency === 'ARS').slice(0, 9).map((tasa) => (
                        <div key={tasa.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
                           <img src={tasa.logo} alt={tasa.name} className="w-8 h-8 rounded-full mb-2 object-cover bg-white p-0.5 border border-slate-100 dark:border-zinc-800" />
                           <p className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 truncate w-full">{tasa.name}</p>
                           <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">{tasa.tna}%</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tasas USD */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-extrabold dark:text-zinc-200 flex items-center gap-1.5" style={{ color: darkMode ? undefined : "#1e293b" }}>
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Rendimientos en Dólares (USD)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {tasasData.filter(t => t.currency === 'USD').slice(0, 9).map((tasa) => (
                        <div key={tasa.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
                           <img src={tasa.logo} alt={tasa.name} className="w-8 h-8 rounded-full mb-2 object-cover bg-white p-0.5 border border-slate-100 dark:border-zinc-800" />
                           <p className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 truncate w-full">{tasa.name}</p>
                           <p className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5 font-mono">{tasa.tna}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección de Inversiones: Ganancias/Pérdidas, Acción Abierta con Mayor Crecimiento y Recomendaciones 6M */}`;
content = content.replace(regexInject, newInject);

fs.writeFileSync(file, content);
console.log("FinanceView injected");
