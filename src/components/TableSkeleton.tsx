import React from "react";

/**
 * Esqueleto de fila/columna para tablas (<tbody> placeholder) — se muestra en vez de las filas
 * reales mientras `useBriefLoading` considera que la tabla está "cargando". `columns` define
 * cuántas celdas por fila y, opcionalmente, qué tan ancha se ve cada una (para que no todas las
 * barras midan lo mismo y se note menos artificial).
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  darkMode,
  widths,
}: {
  rows?: number;
  columns?: number;
  darkMode: boolean;
  widths?: string[];
}) {
  const bar = darkMode ? "bg-zinc-800/50" : "bg-zinc-200/60";
  const resolvedWidths = widths && widths.length === columns ? widths : Array.from({ length: columns }, (_, i) => (i === 0 ? "70%" : "55%"));

  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={`table-skeleton-row-${r}`} className="animate-pulse">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={`table-skeleton-cell-${r}-${c}`} className="px-4 py-4 sm:px-6">
              <div
                className={`h-3.5 rounded-lg ${bar}`}
                style={{ width: resolvedWidths[c], animationDelay: `${(r * columns + c) * 30}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default TableSkeleton;
