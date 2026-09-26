import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pill, Check, ChevronDown } from "lucide-react";
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

// Selector desplegable (como el de Médico/Doctor) de medicamentos para pedirle al doctor en un
// Turno, con selección múltiple por checkbox. Las opciones están ordenadas por menor stock
// disponible primero (lo más urgente de pedir queda arriba).
export const TurnoMedicamentosAPedir: React.FC<TurnoMedicamentosAPedirProps> = ({
  darkMode,
  medicamentosDetallados,
  disponibilidadMedicamentos,
  selectedIds,
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placeAbove: false });

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

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 260 && rect.top > 260;
    setCoords({
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      placeAbove,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize, true);

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = triggerRef.current && triggerRef.current.contains(target);
      const insideMenu = menuRef.current && menuRef.current.contains(target);
      if (!insideTrigger && !insideMenu) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize, true);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (medicamentosOrdenados.length === 0) return null;

  const selectedCount = selectedIds.length;

  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
        Medicamentos a Pedir (ordenados por menor stock)
      </label>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3.5 h-[42px] rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-xs md:text-sm font-semibold cursor-pointer transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          <Pill className="w-4 h-4 text-primary shrink-0" />
          <span
            className={`truncate ${
              selectedCount > 0
                ? "font-bold text-black dark:text-white"
                : "text-slate-400 dark:text-zinc-500 font-normal"
            }`}
          >
            {selectedCount > 0
              ? `${selectedCount} medicamento${selectedCount > 1 ? "s" : ""} seleccionado${selectedCount > 1 ? "s" : ""}`
              : "-- Selecciona Medicamentos (Opcional) --"}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.placeAbove ? undefined : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-64 animate-fade-in"
          >
            <div className="overflow-y-auto p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
              {medicamentosOrdenados.map(({ med, stockRestante }) => {
                const selected = selectedIds.includes(med.id);
                return (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => onToggle(med.id)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      selected
                        ? "bg-primary/10"
                        : "hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${
                        selected
                          ? "bg-primary border-primary text-white dark:text-zinc-950"
                          : "border-slate-300 dark:border-zinc-700"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                    </div>
                    <span className="flex-1 min-w-0 truncate">
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{med.marca}</span>
                      {med.droga && (
                        <span className="text-[11px] font-normal text-slate-500 dark:text-zinc-400"> ({med.droga})</span>
                      )}
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
          </div>,
          document.body
        )}
    </div>
  );
};

export default TurnoMedicamentosAPedir;
