/**
 * Persistencia del análisis con IA de Progreso y Métricas (Gimnasio). Un solo documento por
 * usuario (id fijo "latest") — no hace falta historial de análisis viejos, solo el más reciente
 * más algunos metadatos para decidir cuándo toca regenerarlo solo. Mismo patrón de "category" que
 * noteFoldersService.ts.
 */
import { saveItemToFirestore, subscribeToCategory } from "./firestoreSyncService";

const CATEGORY = "gymAIAnalysis";
const DOC_ID = "latest";

export interface StoredGymAIAnalysis {
  id: string; // siempre DOC_ID
  result: unknown; // AIAnalysisResult, tipado en GymAIAnalysisPanel.tsx
  generatedAt: number;
  generatedWeekKey: string; // p.ej. "2026-W44" — para no auto-regenerar dos veces la misma semana
  objetivo: "bajar" | "mantener" | "subir";
}

export function subscribeGymAIAnalysis(userId: string, onUpdate: (stored: StoredGymAIAnalysis | null) => void) {
  return subscribeToCategory(userId, CATEGORY, (items) => {
    const found = (items as StoredGymAIAnalysis[]).find((i) => i.id === DOC_ID);
    onUpdate(found || null);
  });
}

export async function saveGymAIAnalysis(userId: string, stored: Omit<StoredGymAIAnalysis, "id">): Promise<void> {
  await saveItemToFirestore(userId, CATEGORY, { ...stored, id: DOC_ID });
}
