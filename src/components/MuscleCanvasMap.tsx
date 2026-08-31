import React, { useState } from "react";
import Body, { ExtendedBodyPart, Slug } from "react-muscle-highlighter";
import { GrupoMuscular } from "../types";

interface MuscleCanvasMapProps {
  activeMuscles: Set<GrupoMuscular>;
  darkMode?: boolean;
  gender?: "male" | "female";
  selectedMuscleFilter?: string;
  muscleSetsMap?: Record<string, number>;
  onSelectMuscleGroup?: (muscle: GrupoMuscular) => void;
}

const MAP_GRUPO_TO_SLUGS: Record<GrupoMuscular, Slug[]> = {
  Pecho: ["chest"],
  Espalda: ["trapezius", "upper-back", "lower-back", "neck"],
  Hombros: ["deltoids"],
  Bíceps: ["biceps", "forearm"],
  Tríceps: ["triceps"],
  Abdomen: ["abs", "obliques"],
  Piernas: ["quadriceps", "hamstring", "calves", "adductors", "gluteal", "knees", "tibialis"],
};

const MAP_SLUG_TO_INFO: Partial<Record<Slug, { name: string; latinName: string; group: GrupoMuscular }>> = {
  chest: { name: "Pectoral Mayor", latinName: "Pectoralis major", group: "Pecho" },
  trapezius: { name: "Trapecio", latinName: "Trapezius", group: "Espalda" },
  "upper-back": { name: "Dorsal Ancho", latinName: "Latissimus dorsi", group: "Espalda" },
  "lower-back": { name: "Zona Lumbar", latinName: "Erector spinae", group: "Espalda" },
  deltoids: { name: "Deltoides (Hombros)", latinName: "Deltoideus", group: "Hombros" },
  biceps: { name: "Bíceps Braquial", latinName: "Biceps brachii", group: "Bíceps" },
  triceps: { name: "Tríceps Braquial", latinName: "Triceps brachii", group: "Tríceps" },
  forearm: { name: "Antebrazo / Braquiorradial", latinName: "Brachioradialis", group: "Bíceps" },
  abs: { name: "Recto Abdominal", latinName: "Rectus abdominis", group: "Abdomen" },
  obliques: { name: "Oblicuos Abdominales", latinName: "Obliquus externus", group: "Abdomen" },
  quadriceps: { name: "Cuádriceps Femoral", latinName: "Quadriceps femoris", group: "Piernas" },
  hamstring: { name: "Isquiotibiales", latinName: "Biceps femoris", group: "Piernas" },
  calves: { name: "Gemelos / Gastrocnemio", latinName: "Gastrocnemius", group: "Piernas" },
  gluteal: { name: "Glúteo Mayor y Medio", latinName: "Gluteus maximus", group: "Piernas" },
  adductors: { name: "Aductores", latinName: "Adductor longus", group: "Piernas" },
  knees: { name: "Rodillas", latinName: "Patella", group: "Piernas" },
  neck: { name: "Cuello", latinName: "Sternocleidomastoideus", group: "Espalda" },
  tibialis: { name: "Tibial Anterior", latinName: "Tibialis anterior", group: "Piernas" },
};

export const MuscleCanvasMap: React.FC<MuscleCanvasMapProps> = ({
  activeMuscles,
  darkMode: propDarkMode,
  gender: initialGender = "male",
  selectedMuscleFilter,
  muscleSetsMap = {},
  onSelectMuscleGroup,
}) => {
  const [gender, setGender] = useState<"male" | "female">(initialGender);
  const [hoveredSlug, setHoveredSlug] = useState<Slug | null>(null);

  // Detectar tema claro / oscuro dinámicamente
  const isDark = propDarkMode ?? (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

  // Color de acento dinámico de la aplicación
  const highlightColor = "var(--color-primary, #1a73e8)";

  // Silueta base según el tema actual (Light vs Dark mode)
  const defaultFill = isDark ? "#2a2a32" : "#e4e4e7";
  const defaultStroke = isDark ? "#18181b" : "#cbd5e1";
  const defaultStrokeWidth = isDark ? 0.5 : 0.8;

  // Construir la lista de partes del cuerpo a resaltar
  const bodyPartsData: ExtendedBodyPart[] = [];

  // Agregar selecciones / músculos activos
  Object.entries(MAP_GRUPO_TO_SLUGS).forEach(([grupoStr, slugs]) => {
    const grupo = grupoStr as GrupoMuscular;
    const isWorked = activeMuscles.has(grupo);
    const isSelected = selectedMuscleFilter === grupo;
    const sets = muscleSetsMap[grupo] || 0;

    slugs.forEach((slug) => {
      const isHovered = hoveredSlug === slug;

      if (isHovered) {
        bodyPartsData.push({
          slug,
          styles: {
            fill: "var(--color-primary, #1a73e8)",
            stroke: isDark ? "#ffffff" : "#0f172a",
            strokeWidth: 2,
          },
        });
      } else if (isSelected) {
        bodyPartsData.push({
          slug,
          styles: {
            fill: highlightColor,
            stroke: isDark ? "#ffffff" : "#0f172a",
            strokeWidth: 2,
          },
        });
      } else if (isWorked || sets > 0) {
        let activeFill = highlightColor;
        bodyPartsData.push({
          slug,
          styles: {
            fill: activeFill,
            stroke: isDark ? "var(--color-primary, #1a73e8)" : "#0284c7",
            strokeWidth: 1,
          },
        });
      }
    });
  });

  const handleBodyPartClick = (b: ExtendedBodyPart) => {
    if (!b.slug) return;
    const info = MAP_SLUG_TO_INFO[b.slug];
    if (info && onSelectMuscleGroup) {
      onSelectMuscleGroup(info.group);
    }
  };

  const hoveredInfo = hoveredSlug ? MAP_SLUG_TO_INFO[hoveredSlug] : null;

  return (
    <div className={`w-full rounded-2xl p-4 space-y-3 flex flex-col items-center select-none transition-colors border ${
      isDark
        ? "bg-[#0a0a0d] border-zinc-800 text-white shadow-2xl"
        : "bg-white/90 border-slate-200 text-slate-800 shadow-sm"
    }`}>
      {/* RENDERIZADO SIMULTÁNEO VISTA FRONTAL Y POSTERIOR CON ANATOMÍA EXACTA DEL GITHUB REPO */}
      <div className={`w-full grid grid-cols-2 gap-2 sm:gap-4 justify-items-center py-3 px-1 rounded-xl border transition-colors ${
        isDark
          ? "bg-[#0e0e12] border-zinc-800/80"
          : "bg-slate-50 border-slate-200/80"
      }`}>
        {/* VISTA FRONTAL */}
        <div className="flex flex-col items-center space-y-1.5 w-full">
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            Vista Frontal
          </span>
          <div className="w-full min-h-[215px] sm:min-h-[235px] flex items-center justify-center relative">
            <Body
              data={bodyPartsData}
              gender={gender}
              side="front"
              scale={0.52}
              defaultFill={defaultFill}
              defaultStroke={defaultStroke}
              defaultStrokeWidth={defaultStrokeWidth}
              onBodyPartPress={handleBodyPartClick}
            />
          </div>
        </div>

        {/* VISTA POSTERIOR */}
        <div className="flex flex-col items-center space-y-1.5 w-full">
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            Vista Posterior
          </span>
          <div className="w-full min-h-[215px] sm:min-h-[235px] flex items-center justify-center relative">
            <Body
              data={bodyPartsData}
              gender={gender}
              side="back"
              scale={0.52}
              defaultFill={defaultFill}
              defaultStroke={defaultStroke}
              defaultStrokeWidth={defaultStrokeWidth}
              onBodyPartPress={handleBodyPartClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
