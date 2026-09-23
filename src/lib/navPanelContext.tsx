import { createContext, useContext, useEffect } from "react";

/**
 * Permite que una vista (HealthView, AcademicView, MealsView, etc.) registre sus propios
 * niveles de sub-pestañas (ej. "Doctores / Presión Arterial / Estudios / Medicamentos" dentro
 * de Salud → Control Clínico) para que TopNavbar los dibuje DENTRO de la misma cápsula
 * redondeada del navbar, como una fila más, en vez de que cada vista arme su propio menú
 * flotante independiente (con su propio fondo/borde/sombra) en el cuerpo de la página.
 */
export interface NavPanelTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface NavPanelRow {
  /** Identificador único por fila (para el layoutId del indicador animado). */
  indicatorId: string;
  activeId: string;
  tabs: NavPanelTab[];
  onChange: (id: string) => void;
}

type SetRows = (rows: NavPanelRow[] | null) => void;

export const NavPanelContext = createContext<SetRows>(() => {});

/**
 * `rows` es null/[] cuando la vista no tiene un nivel anidado que mostrar en ese momento.
 * Se limpia automáticamente al desmontar (cambio de sección) para que no queden filas de una
 * vista anterior "pegadas" en el navbar.
 */
export function useSubPanelRows(rows: NavPanelRow[] | null) {
  const setRows = useContext(NavPanelContext);
  const depKey = rows && rows.length
    ? rows.map((r) => `${r.indicatorId}:${r.activeId}:${r.tabs.map((t) => t.id).join(",")}`).join("|")
    : "";

  useEffect(() => {
    setRows(rows && rows.length ? rows : null);
    return () => setRows(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);
}
