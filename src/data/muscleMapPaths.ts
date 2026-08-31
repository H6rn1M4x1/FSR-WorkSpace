import { GrupoMuscular } from "../types";

export interface MusclePathItem {
  id: string;
  muscleGroup: GrupoMuscular | "Base";
  subGroup?: string;
  d: string;
  label: string;
  latinName?: string;
  view?: "front" | "back";
}

export interface BodyMapConfig {
  viewBox: string;
  paths: MusclePathItem[];
}

// =========================================================================
// MALE FRONT PATHS (MuscleMapJS Male Anterior Anatomy)
// =========================================================================
export const maleFrontPaths: MusclePathItem[] = [
  // Silhouette Base (Cabeza, Cuello, Clavículas)
  {
    id: "head-m-f",
    muscleGroup: "Base",
    label: "Cabeza y Cuello",
    d: "M 88 12 C 88 4 112 4 112 12 C 112 32 107 42 100 42 C 93 42 88 32 88 12 Z",
    view: "front"
  },
  {
    id: "neck-m-f",
    muscleGroup: "Base",
    label: "Trapecio / Cuello",
    d: "M 92 42 L 92 56 C 92 58 108 58 108 56 L 108 42 Z",
    view: "front"
  },

  // Pecho / Pectorales
  {
    id: "chest-left-m-f",
    muscleGroup: "Pecho",
    subGroup: "Pectoral Mayor (Izquierdo)",
    label: "Pectoral Mayor Izquierdo",
    latinName: "Pectoralis major",
    d: "M 60 62 C 80 60 98 62 99 88 C 79 94 60 88 56 70 Z",
    view: "front"
  },
  {
    id: "chest-right-m-f",
    muscleGroup: "Pecho",
    subGroup: "Pectoral Mayor (Derecho)",
    label: "Pectoral Mayor Derecho",
    latinName: "Pectoralis major",
    d: "M 140 62 C 120 60 102 62 101 88 C 121 94 140 88 144 70 Z",
    view: "front"
  },

  // Hombros / Deltoides
  {
    id: "deltoid-left-m-f",
    muscleGroup: "Hombros",
    subGroup: "Deltoides Anterior y Lateral (Izq)",
    label: "Deltoides Anterior Izquierdo",
    latinName: "Deltoideus anterior",
    d: "M 58 56 C 40 60 30 76 32 93 C 42 93 50 80 58 68 Z",
    view: "front"
  },
  {
    id: "deltoid-right-m-f",
    muscleGroup: "Hombros",
    subGroup: "Deltoides Anterior y Lateral (Der)",
    label: "Deltoides Anterior Derecho",
    latinName: "Deltoideus anterior",
    d: "M 142 56 C 160 60 170 76 168 93 C 158 93 150 80 142 68 Z",
    view: "front"
  },

  // Bíceps
  {
    id: "biceps-left-m-f",
    muscleGroup: "Bíceps",
    subGroup: "Bíceps Braquial (Cabeza Larga/Corta)",
    label: "Bíceps Braquial Izquierdo",
    latinName: "Biceps brachii",
    d: "M 32 94 C 27 110 30 128 38 126 C 44 118 42 103 40 94 Z",
    view: "front"
  },
  {
    id: "biceps-right-m-f",
    muscleGroup: "Bíceps",
    subGroup: "Bíceps Braquial (Cabeza Larga/Corta)",
    label: "Bíceps Braquial Derecho",
    latinName: "Biceps brachii",
    d: "M 168 94 C 173 110 170 128 162 126 C 156 118 158 103 160 94 Z",
    view: "front"
  },

  // Antebrazos
  {
    id: "forearms-left-m-f",
    muscleGroup: "Bíceps",
    subGroup: "Braquiorradial y Antebrazo",
    label: "Antebrazo Izquierdo",
    latinName: "Brachioradialis",
    d: "M 35 130 C 25 148 22 170 30 178 C 36 176 40 156 40 134 Z",
    view: "front"
  },
  {
    id: "forearms-right-m-f",
    muscleGroup: "Bíceps",
    subGroup: "Braquiorradial y Antebrazo",
    label: "Antebrazo Derecho",
    latinName: "Brachioradialis",
    d: "M 165 130 C 175 148 178 170 170 178 C 164 176 160 156 160 134 Z",
    view: "front"
  },

  // Abdomen / Core / Oblicuos
  {
    id: "abs-upper-m-f",
    muscleGroup: "Abdomen",
    subGroup: "Recto Abdominal Superior",
    label: "Abdominales Superiores",
    latinName: "Rectus abdominis",
    d: "M 62 90 C 80 88 120 88 138 90 C 136 112 64 112 62 90 Z",
    view: "front"
  },
  {
    id: "abs-lower-m-f",
    muscleGroup: "Abdomen",
    subGroup: "Recto Abdominal Inferior & Oblicuos",
    label: "Abdominales Inferiores y Oblicuos",
    latinName: "Obliquus externus abdominis",
    d: "M 63 114 C 80 112 120 112 137 114 C 135 158 65 158 63 114 Z",
    view: "front"
  },

  // Cuádriceps / Piernas Frontal
  {
    id: "quads-left-m-f",
    muscleGroup: "Piernas",
    subGroup: "Cuádriceps (Recto Femoral & Vasto Lateral)",
    label: "Cuádriceps Izquierdo",
    latinName: "Quadriceps femoris",
    d: "M 60 162 C 90 162 96 192 94 256 C 75 256 62 219 55 179 Z",
    view: "front"
  },
  {
    id: "quads-right-m-f",
    muscleGroup: "Piernas",
    subGroup: "Cuádriceps (Recto Femoral & Vasto Lateral)",
    label: "Cuádriceps Derecho",
    latinName: "Quadriceps femoris",
    d: "M 140 162 C 110 162 104 192 106 256 C 125 256 138 219 145 179 Z",
    view: "front"
  },

  // Gemelos / Pantorrillas Frontal
  {
    id: "calves-left-m-f",
    muscleGroup: "Piernas",
    subGroup: "Tibial Anterior y Gemelo",
    label: "Gemelo / Tibial Izquierdo",
    latinName: "Tibialis anterior",
    d: "M 68 276 C 82 276 88 296 83 344 C 72 342 65 316 65 292 Z",
    view: "front"
  },
  {
    id: "calves-right-m-f",
    muscleGroup: "Piernas",
    subGroup: "Tibial Anterior y Gemelo",
    label: "Gemelo / Tibial Derecho",
    latinName: "Tibialis anterior",
    d: "M 132 276 C 118 276 112 296 117 344 C 128 342 135 316 135 292 Z",
    view: "front"
  }
];

// =========================================================================
// MALE BACK PATHS (MuscleMapJS Male Posterior Anatomy)
// =========================================================================
export const maleBackPaths: MusclePathItem[] = [
  // Silhouette Base
  {
    id: "head-m-b",
    muscleGroup: "Base",
    label: "Cabeza Posterior",
    d: "M 88 12 C 88 4 112 4 112 12 C 112 32 107 42 100 42 C 93 42 88 32 88 12 Z",
    view: "back"
  },
  {
    id: "neck-m-b",
    muscleGroup: "Base",
    label: "Cuello Posterior",
    d: "M 92 42 L 92 56 C 92 58 108 58 108 56 L 108 42 Z",
    view: "back"
  },

  // Trapecio
  {
    id: "trapezius-m-b",
    muscleGroup: "Espalda",
    subGroup: "Trapecio Superior, Medio e Inferior",
    label: "Trapecio / Cuello Posterior",
    latinName: "Trapezius",
    d: "M 92 46 C 78 53 60 58 52 66 C 80 73 100 90 100 90 C 100 90 120 73 148 66 C 140 58 122 53 108 46 Z",
    view: "back"
  },

  // Dorsales / Lumbares
  {
    id: "lats-left-m-b",
    muscleGroup: "Espalda",
    subGroup: "Dorsal Ancho & Zona Lumbar",
    label: "Dorsal Ancho Izquierdo",
    latinName: "Latissimus dorsi",
    d: "M 52 68 C 42 86 45 123 62 148 C 80 148 98 108 98 90 C 80 83 65 76 52 68 Z",
    view: "back"
  },
  {
    id: "lats-right-m-b",
    muscleGroup: "Espalda",
    subGroup: "Dorsal Ancho & Zona Lumbar",
    label: "Dorsal Ancho Derecho",
    latinName: "Latissimus dorsi",
    d: "M 148 68 C 158 86 155 123 138 148 C 120 148 102 108 102 90 C 120 83 135 76 148 68 Z",
    view: "back"
  },

  // Deltoides Posterior (Hombros Espalda)
  {
    id: "deltoid-left-m-b",
    muscleGroup: "Hombros",
    subGroup: "Deltoides Posterior (Izquierdo)",
    label: "Deltoides Posterior Izquierdo",
    latinName: "Deltoideus posterior",
    d: "M 50 64 C 36 68 30 80 32 90 C 40 90 48 80 52 68 Z",
    view: "back"
  },
  {
    id: "deltoid-right-m-b",
    muscleGroup: "Hombros",
    subGroup: "Deltoides Posterior (Derecho)",
    label: "Deltoides Posterior Derecho",
    latinName: "Deltoideus posterior",
    d: "M 150 64 C 164 68 170 80 168 90 C 160 90 152 80 148 68 Z",
    view: "back"
  },

  // Tríceps
  {
    id: "triceps-left-m-b",
    muscleGroup: "Tríceps",
    subGroup: "Tríceps Braquial (3 Cabezas)",
    label: "Tríceps Izquierdo",
    latinName: "Triceps brachii",
    d: "M 32 68 C 25 83 27 116 35 113 C 42 108 42 88 40 70 Z",
    view: "back"
  },
  {
    id: "triceps-right-m-b",
    muscleGroup: "Tríceps",
    subGroup: "Tríceps Braquial (3 Cabezas)",
    label: "Tríceps Derecho",
    latinName: "Triceps brachii",
    d: "M 168 68 C 175 83 173 116 165 113 C 158 108 158 88 160 70 Z",
    view: "back"
  },

  // Glúteos
  {
    id: "glutes-left-m-b",
    muscleGroup: "Piernas",
    subGroup: "Glúteo Mayor y Medio",
    label: "Glúteo Izquierdo",
    latinName: "Gluteus maximus",
    d: "M 60 148 C 98 148 99 164 98 186 C 78 194 60 184 58 164 Z",
    view: "back"
  },
  {
    id: "glutes-right-m-b",
    muscleGroup: "Piernas",
    subGroup: "Glúteo Mayor y Medio",
    label: "Glúteo Derecho",
    latinName: "Gluteus maximus",
    d: "M 140 148 C 102 148 101 164 102 186 C 122 194 140 184 142 164 Z",
    view: "back"
  },

  // Isquiotibiales
  {
    id: "hamstrings-left-m-b",
    muscleGroup: "Piernas",
    subGroup: "Isquiotibiales (Bíceps Femoral)",
    label: "Isquiotibial Izquierdo",
    latinName: "Biceps femoris",
    d: "M 59 188 C 96 188 94 221 90 258 C 75 258 62 228 59 204 Z",
    view: "back"
  },
  {
    id: "hamstrings-right-m-b",
    muscleGroup: "Piernas",
    subGroup: "Isquiotibiales (Bíceps Femoral)",
    label: "Isquiotibial Derecho",
    latinName: "Biceps femoris",
    d: "M 141 188 C 104 188 106 221 110 258 C 125 258 138 228 141 204 Z",
    view: "back"
  },

  // Gemelos Posterior
  {
    id: "calves-left-m-b",
    muscleGroup: "Piernas",
    subGroup: "Gastrocnemio / Gemelos",
    label: "Gemelo Posterior Izquierdo",
    latinName: "Gastrocnemius",
    d: "M 65 274 C 88 274 85 306 80 348 C 68 344 62 312 62 291 Z",
    view: "back"
  },
  {
    id: "calves-right-m-b",
    muscleGroup: "Piernas",
    subGroup: "Gastrocnemio / Gemelos",
    label: "Gemelo Posterior Derecho",
    latinName: "Gastrocnemius",
    d: "M 135 274 C 112 274 115 306 120 348 C 132 344 138 312 138 291 Z",
    view: "back"
  }
];

// =========================================================================
// FEMALE FRONT PATHS (MuscleMapJS Female Anterior Anatomy)
// =========================================================================
export const femaleFrontPaths: MusclePathItem[] = [
  {
    id: "head-f-f",
    muscleGroup: "Base",
    label: "Cabeza y Cuello",
    d: "M 89 14 C 89 5 111 5 111 14 C 111 32 106 41 100 41 C 94 41 89 32 89 14 Z",
    view: "front"
  },
  {
    id: "neck-f-f",
    muscleGroup: "Base",
    label: "Cuello",
    d: "M 93 39 L 93 52 C 93 54 107 54 107 52 L 107 39 Z",
    view: "front"
  },
  {
    id: "chest-left-f-f",
    muscleGroup: "Pecho",
    subGroup: "Pectoral Femenino (Izquierdo)",
    label: "Pectoral Izquierdo",
    latinName: "Pectoralis major",
    d: "M 62 60 C 80 58 97 60 98 86 C 80 92 62 86 58 68 Z",
    view: "front"
  },
  {
    id: "chest-right-f-f",
    muscleGroup: "Pecho",
    subGroup: "Pectoral Femenino (Derecho)",
    label: "Pectoral Derecho",
    latinName: "Pectoralis major",
    d: "M 138 60 C 120 58 103 60 102 86 C 120 92 138 86 142 68 Z",
    view: "front"
  },
  {
    id: "deltoid-left-f-f",
    muscleGroup: "Hombros",
    subGroup: "Deltoides Izquierdo",
    label: "Deltoides Izquierdo",
    latinName: "Deltoideus",
    d: "M 60 54 C 45 58 34 72 35 88 C 44 88 52 76 60 65 Z",
    view: "front"
  },
  {
    id: "deltoid-right-f-f",
    muscleGroup: "Hombros",
    subGroup: "Deltoides Derecho",
    label: "Deltoides Derecho",
    latinName: "Deltoideus",
    d: "M 140 54 C 155 58 166 72 165 88 C 156 88 148 76 140 65 Z",
    view: "front"
  },
  {
    id: "biceps-left-f-f",
    muscleGroup: "Bíceps",
    subGroup: "Bíceps Braquial Izquierdo",
    label: "Bíceps Izquierdo",
    latinName: "Biceps brachii",
    d: "M 35 89 C 30 104 33 122 40 120 C 45 112 43 98 42 89 Z",
    view: "front"
  },
  {
    id: "biceps-right-f-f",
    muscleGroup: "Bíceps",
    subGroup: "Bíceps Braquial Derecho",
    label: "Bíceps Derecho",
    latinName: "Biceps brachii",
    d: "M 165 89 C 170 104 167 122 160 120 C 155 112 157 98 158 89 Z",
    view: "front"
  },
  {
    id: "abs-f-f",
    muscleGroup: "Abdomen",
    subGroup: "Zona Abdominal Femenina & Core",
    label: "Abdominales / Core",
    latinName: "Rectus abdominis",
    d: "M 65 88 C 99 86 135 88 130 156 C 100 162 70 162 70 156 Z",
    view: "front"
  },
  {
    id: "quads-left-f-f",
    muscleGroup: "Piernas",
    subGroup: "Cuádriceps Izquierdo",
    label: "Cuádriceps Izquierdo",
    latinName: "Quadriceps femoris",
    d: "M 58 163 C 90 163 96 193 94 258 C 72 258 58 226 52 180 Z",
    view: "front"
  },
  {
    id: "quads-right-f-f",
    muscleGroup: "Piernas",
    subGroup: "Cuádriceps Derecho",
    label: "Cuádriceps Derecho",
    latinName: "Quadriceps femoris",
    d: "M 142 163 C 110 163 104 193 106 258 C 128 258 142 226 148 180 Z",
    view: "front"
  },
  {
    id: "calves-left-f-f",
    muscleGroup: "Piernas",
    subGroup: "Gemelos / Pantorrillas",
    label: "Gemelo Izquierdo",
    latinName: "Tibialis anterior",
    d: "M 68 278 C 82 278 88 298 83 346 C 72 344 65 318 65 294 Z",
    view: "front"
  },
  {
    id: "calves-right-f-f",
    muscleGroup: "Piernas",
    subGroup: "Gemelos / Pantorrillas",
    label: "Gemelo Derecho",
    latinName: "Tibialis anterior",
    d: "M 132 278 C 118 278 112 298 117 346 C 128 344 135 318 135 294 Z",
    view: "front"
  }
];

// =========================================================================
// FEMALE BACK PATHS (MuscleMapJS Female Posterior Anatomy)
// =========================================================================
export const femaleBackPaths: MusclePathItem[] = [
  {
    id: "head-f-b",
    muscleGroup: "Base",
    label: "Cabeza Posterior",
    d: "M 89 14 C 89 5 111 5 111 14 C 111 32 106 41 100 41 C 94 41 89 32 89 14 Z",
    view: "back"
  },
  {
    id: "traps-f-b",
    muscleGroup: "Espalda",
    subGroup: "Trapecio Superior",
    label: "Trapecio Femenino",
    latinName: "Trapezius",
    d: "M 93 44 C 80 51 62 56 55 63 C 80 70 100 86 100 86 C 100 86 120 70 145 63 C 138 56 120 51 107 44 Z",
    view: "back"
  },
  {
    id: "lats-left-f-b",
    muscleGroup: "Espalda",
    subGroup: "Dorsal Ancho Izquierdo",
    label: "Dorsal Izquierdo",
    latinName: "Latissimus dorsi",
    d: "M 55 65 C 46 82 48 118 64 144 C 80 144 98 106 98 88 C 82 81 67 74 55 65 Z",
    view: "back"
  },
  {
    id: "lats-right-f-b",
    muscleGroup: "Espalda",
    subGroup: "Dorsal Ancho Derecho",
    label: "Dorsal Derecho",
    latinName: "Latissimus dorsi",
    d: "M 145 65 C 154 82 152 118 136 144 C 120 144 102 106 102 88 C 118 81 133 74 145 65 Z",
    view: "back"
  },
  {
    id: "triceps-left-f-b",
    muscleGroup: "Tríceps",
    subGroup: "Tríceps Braquial",
    label: "Tríceps Izquierdo",
    latinName: "Triceps brachii",
    d: "M 35 65 C 28 80 30 112 37 109 C 43 104 43 85 41 67 Z",
    view: "back"
  },
  {
    id: "triceps-right-f-b",
    muscleGroup: "Tríceps",
    subGroup: "Tríceps Braquial",
    label: "Tríceps Derecho",
    latinName: "Triceps brachii",
    d: "M 165 65 C 172 80 170 112 163 109 C 157 104 157 85 159 67 Z",
    view: "back"
  },
  {
    id: "glutes-left-f-b",
    muscleGroup: "Piernas",
    subGroup: "Glúteo Mayor y Medio Femenino",
    label: "Glúteo Izquierdo",
    latinName: "Gluteus maximus",
    d: "M 55 146 C 98 146 99 163 98 190 C 74 198 55 186 53 164 Z",
    view: "back"
  },
  {
    id: "glutes-right-f-b",
    muscleGroup: "Piernas",
    subGroup: "Glúteo Mayor y Medio Femenino",
    label: "Glúteo Derecho",
    latinName: "Gluteus maximus",
    d: "M 145 146 C 102 146 101 163 102 190 C 126 198 145 186 147 164 Z",
    view: "back"
  },
  {
    id: "hamstrings-left-f-b",
    muscleGroup: "Piernas",
    subGroup: "Isquiotibiales",
    label: "Isquiotibial Izquierdo",
    latinName: "Biceps femoris",
    d: "M 55 192 C 96 192 94 223 90 258 C 72 258 58 228 55 204 Z",
    view: "back"
  },
  {
    id: "hamstrings-right-f-b",
    muscleGroup: "Piernas",
    subGroup: "Isquiotibiales",
    label: "Isquiotibial Derecho",
    latinName: "Biceps femoris",
    d: "M 145 192 C 104 192 106 223 110 258 C 128 258 142 228 145 204 Z",
    view: "back"
  },
  {
    id: "calves-left-f-b",
    muscleGroup: "Piernas",
    subGroup: "Gemelos / Pantorrillas",
    label: "Gemelo Posterior Izq",
    latinName: "Gastrocnemius",
    d: "M 65 274 C 88 274 85 306 80 348 C 68 344 62 312 62 291 Z",
    view: "back"
  },
  {
    id: "calves-right-f-b",
    muscleGroup: "Piernas",
    subGroup: "Gemelos / Pantorrillas",
    label: "Gemelo Posterior Der",
    latinName: "Gastrocnemius",
    d: "M 135 274 C 112 274 115 306 120 348 C 132 344 138 312 138 291 Z",
    view: "back"
  }
];

// Backwards compatibility structures
export const MALE_FRONT_MAP: BodyMapConfig = {
  viewBox: "0 0 200 400",
  paths: maleFrontPaths
};

export const MALE_BACK_MAP: BodyMapConfig = {
  viewBox: "0 0 200 400",
  paths: maleBackPaths
};

export const FEMALE_FRONT_MAP: BodyMapConfig = {
  viewBox: "0 0 200 400",
  paths: femaleFrontPaths
};

export const FEMALE_BACK_MAP: BodyMapConfig = {
  viewBox: "0 0 200 400",
  paths: femaleBackPaths
};
