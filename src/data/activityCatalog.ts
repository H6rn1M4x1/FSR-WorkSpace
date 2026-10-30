// Catálogo de deportes/actividades y sus METs (equivalente metabólico), usado para estimar
// calorías quemadas y para poblar el selector "Tipo de Entrenamiento" de Añadir Actividad.
// Extraído de HealthView.tsx para poder reusarlo también desde GymRutinaView.tsx (tarjetas de
// rutinas y deportes del nuevo Historial de Sesiones) sin duplicar la lista.
export const activityMETs: Record<string, number> = {
  Caminata: 3.5,
  Correr: 9.8,
  Ciclismo: 7.5,
  "Ciclismo indoor / Spinning": 8.5,
  "Ciclismo de montaña": 8.5,
  Natación: 7.0,
  "Levantamiento de pesas": 3.0,
  "Gimnasio / Musculación": 3.5,
  Yoga: 2.5,
  Pilates: 3.0,
  Fútbol: 7.0,
  Básquetbol: 6.5,
  Tenis: 7.3,
  Pádel: 6.0,
  Voleibol: 4.0,
  "Danza / Baile": 5.0,
  Zumba: 6.8,
  CrossFit: 8.0,
  "Entrenamiento funcional": 7.0,
  Boxeo: 7.8,
  "Artes Marciales": 7.5,
  Escalada: 8.0,
  Remo: 7.0,
  "Saltar la cuerda": 11.0,
  Gimnasia: 4.0,
  Elíptica: 5.0,
  "Cinta de correr": 9.0,
  Aeróbicos: 7.3,
  Bádminton: 5.5,
  Béisbol: 5.0,
  Buceo: 7.0,
  Esquí: 7.0,
  "Esquí alpino": 5.0,
  Golf: 4.5,
  Hockey: 8.0,
  Judo: 10.0,
  Karate: 10.0,
  Kickboxing: 10.0,
  Patinaje: 7.0,
  Rugby: 8.3,
  Skateboarding: 5.0,
  Snowboard: 5.3,
  Surf: 3.0,
  "Tenis de mesa": 4.0,
  Trekking: 7.0,
  Senderismo: 6.0,
  "Patinaje en línea": 7.5,
  "Estiramiento / Stretching": 2.5,
  Otro: 5.0,
};

export const distanceBasedActivities = [
  "Caminata",
  "Correr",
  "Ciclismo",
  "Natación",
  "Remo",
  "Cinta de correr",
  "Elíptica",
  "Ciclismo de montaña",
  "Esquí",
  "Patinaje",
  "Senderismo",
  "Trekking",
  "Patinaje en línea",
];

/** Estimación de calorías por MET: METs × 3.5 × peso(kg) / 200 × minutos. Usa un peso promedio
 *  (70kg) ya que la app no guarda el peso corporal del usuario — es solo una estimación para
 *  mostrar algo razonable en las tarjetas, no un cálculo médico preciso. */
export function estimateCaloriesByMET(activity: string, minutes: number, weightKg = 70): number {
  const met = activityMETs[activity] ?? activityMETs.Otro;
  return Math.round((met * 3.5 * weightKg) / 200 * minutes);
}
