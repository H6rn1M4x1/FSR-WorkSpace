# FSR Workspace

## Sistema de color (regla de diseño)

La app usa un sistema de color deliberadamente acotado. Al escribir o tocar UI, seguir esto:

- **Fondo**: negro sólido en tema oscuro, blanco sólido en tema claro (`bg-black`/`bg-white` o
  los tokens `--color-surface*` ya definidos en `src/index.css`). No usar fondos de color propio
  salvo que sea literalmente el color de acento.
- **Acento (`text-primary` / `bg-primary` / `border-primary`)**: para lo importante — botones
  principales, estados activos, valores destacados, títulos de componentes clave. Es el color
  que el usuario elige (`--color-primary` en `src/index.css`), nunca un color fijo propio.
- **Secundario / gris (`text-slate-400 dark:text-zinc-500`, o `text-slate-500 dark:text-zinc-400`
  para un poco más de contraste)**: para todo lo "menos importante" — textos de ayuda,
  instrucciones ("Elegí una materia para...", "Elegí un día para..."), labels, placeholders,
  metadata secundaria. Es el patrón ya usado en cientos de lugares del código (`grep -r
  "text-slate-400 dark:text-zinc-500" src/components` para ver ejemplos), así que seguir ese
  mismo patrón, no inventar uno nuevo.
- **Colores semánticos de alerta** (`text-amber-*`/`text-red-*`/`text-emerald-*`, los tokens
  `--color-warning`/`--color-danger`): reservados para cuando el color SÍ transmite información
  real — un vencimiento próximo, stock bajo, un error, una confirmación de éxito. No usarlos para
  una instrucción neutral solo porque "llama la atención"; eso es trabajo del gris secundario.
  Ejemplo del error que esta regla corrige: un cartel de "Elegí un día en el calendario para
  agendar" estaba en ámbar (sugiere una advertencia) cuando es solo una instrucción — se corrigió
  a gris secundario.

Si al tocar un componente aparece un color fijo (`text-amber-500`, `text-orange-500`, etc.) en un
texto puramente informativo/instructivo, cambiarlo a gris secundario como parte del mismo cambio.
