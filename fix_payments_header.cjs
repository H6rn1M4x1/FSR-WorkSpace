const fs = require('fs');

let c = fs.readFileSync('src/components/PaymentsTable.tsx', 'utf8');

c = c.replace(/Calendar,\n\} from "lucide-react";/, 'Calendar,\n  Wallet,\n} from "lucide-react";');

// The original pattern to replace:
/*
    <div className="space-y-4 relative">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Todos los Pagos
        </h2>
        <button
          onClick={() => setShowAddPayment(true)}
          className="px-4 py-2 rounded-full bg-primary text-white dark:text-blue-950 text-xs font-bold transition-all hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm animate-fade-in"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Pago</span>
        </button>
      </div>

      {/* Filters Bar *\/}
      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800/60 space-y-3">
*/

const replacement = `    <div className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-extrabold text-md flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span>Todos los Pagos</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Administra y lleva el control de todos tus pagos, suscripciones y servicios registrados.
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
          <button
            onClick={() => setShowAddPayment(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Pago</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 space-y-3">`;

c = c.replace(/<div className="space-y-4 relative">[\s\S]*?\{.*?Filters Bar.*?\}/, replacement + "\n      {/* Filters Bar */}");

// now remove the old filter bar wrapper start
c = c.replace(/\{\/\* Filters Bar \*\/}\n\s*<div className="p-4 rounded-2xl bg-slate-50\/80 dark:bg-zinc-950\/40 border border-slate-200\/60 dark:border-zinc-800\/60 space-y-3">/g, "");

fs.writeFileSync('src/components/PaymentsTable.tsx', c);
