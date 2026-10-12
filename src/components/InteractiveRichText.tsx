import React, { useEffect, useRef } from "react";

/**
 * Muestra HTML de texto enriquecido (dangerouslySetInnerHTML) pero, a diferencia de un div
 * "muerto", detecta el click en cualquier checkbox insertado por RichTextEditor y llama a
 * onToggleCheckbox con el HTML ya actualizado (el checkbox que se clickeó, marcado/desmarcado) —
 * para que el que lo use pueda persistirlo y confirmar el guardado, en vez de que tildar un
 * checkbox en modo lectura quede sin guardar (solo visual, hasta el próximo refresh).
 */
export function InteractiveRichText({
  html,
  className,
  onToggleCheckbox,
}: {
  html: string;
  className?: string;
  onToggleCheckbox: (newHtml: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;

      const liveCheckboxes = Array.from(el.querySelectorAll('input[type="checkbox"]'));
      const idx = liveCheckboxes.indexOf(target);
      if (idx === -1) return;

      // El navegador ya marcó/desmarcó el checkbox en vivo antes de que este handler se
      // ejecute (es el comportamiento nativo del click) — se replica ese mismo estado en una
      // copia del HTML guardado, por posición (el N-ésimo checkbox), para no depender de IDs
      // que este HTML nunca tuvo.
      const doc = new DOMParser().parseFromString(html, "text/html");
      const storedCheckboxes = doc.querySelectorAll('input[type="checkbox"]');
      const storedCb = storedCheckboxes[idx] as HTMLInputElement | undefined;
      if (!storedCb) return;

      if (target.checked) storedCb.setAttribute("checked", "");
      else storedCb.removeAttribute("checked");

      onToggleCheckbox(doc.body.innerHTML);
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [html, onToggleCheckbox]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default InteractiveRichText;
