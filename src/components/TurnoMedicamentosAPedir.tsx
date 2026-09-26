import React, { useMemo } from "react";
import { Pill, Check } from "lucide-react";
import { MedicamentoDetallado, DisponibilidadMedicamento } from "../types";

interface TurnoMedicamentosAPedirProps {
  darkMode: boolean;
  medicamentosDetallados: MedicamentoDetallado[];
  disponibilidadMedicamentos: DisponibilidadMedicamento[];
  selectedIds: string[];
  onToggle: (medicamentoId: string) => void;
}

// Parsea una fecha "YYYY-MM-DD" en horario local, evitando el corrimiento de día por UTC.
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
  }
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Stock restante estimado de un registro de disponibilidad: cantidad registrada menos lo
// consumido (consumo diario * días transcurridos desde el registro), nunca negativo. Misma
// fórmula que ya usa Salud > Medicamentos > Stock y Disponibilidad para esa unidad de stock,
// reimplementada acá de forma aislada para no tocar ese componente.
function calcularCantidadDisponible(disp: DisponibilidadMedicamento, med: MedicamentoDetallado): number {
  const cd = med.consumoDiario || 1;
  const cantReg = disp.cantidadRegistrada || 0;
  const regDate = parseLocalDate(disp.fechaRegistro);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));
  const diasPasados = diffDays < 0 ? 0 : diffDays;
  const cantidadDisponible = cantReg - cd * diasPasados;
  return cantidadDisponible < 0 ? 0 : cantidadDisponible;
}

// Lista de medicamentos para pedirle al doctor en un Turno, ordenada por menor stock
// disponible primero (lo que hay que pedir con más urgencia queda arriba).
export const TurnoMedicamentosAPedir: React.FC<TurnoMedicamentosAPedirProps> = ({
  darkMode,
  medicamentosDetallados,
  disponibilidadMedicamentos,
  selectedIds,
  onToggle,
}) => {
  const medicamentosOrdenados = useMemo(() => {
    return medicamentosDetallados
      .filter((m) => m.estado !== "Dejo de Consumir")
      .map((med) => {
        const disponibilidades = disponibilidadMedicamentos.filter((d) => d.medicamentoId === med.id);
        const stockRestante = disponibilidades.reduce(
          (acc, disp) => acc + calcularCantidadDisponible(disp, med),
          0
        );
        return { med, stockRestante };
      })
      .sort((a, b) => a.stockRestante - b.stockRestante);
  }, [medicamentosDetallados, disponibilidadMedicamentos]);

  if (medicamentosOrdenados.length === 0) return null;

  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
        Medicamentos a Pedir (ordenados por menor stock)
      </label>
      <div className="space-y-1.5 max-h-56 overflow-y-auto p-2 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-zinc-800/40 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        {medicamentosOrdenados.map(({ med, stockRestante }) => {
          const selected = selectedIds.includes(med.id);
          return (
            <button
              key={med.id}
              type="button"
              onClick={() => onToggle(med.id)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                selected
                  ? "bg-primary/10 border-primary/40"
                  : "bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800/60 hover:border-primary/30"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${
                  selected
                    ? "bg-primary border-primary text-white dark:text-zinc-950"
                    : "border-slate-300 dark:border-zinc-700"
                }`}
              >
                {selected && <Check className="w-3.5 h-3.5" />}
              </div>
              <Pill className="w-4 h-4 text-primary shrink-0" />
              <span className="flex-1 min-w-0 text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                {med.marca}
                {med.droga ? ` (${med.droga})` : ""}
              </span>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  stockRestante <= 0
                    ? "bg-red-500/10 text-red-500"
                    : stockRestante < (med.consumoDiario || 1) * 7
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-emerald-500/10 text-emerald-500"
                }`}
              >
                {stockRestante.toFixed(0)} {med.unidadMedida === "Capsulas" ? "cáps." : "comp."}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TurnoMedicamentosAPedir;
