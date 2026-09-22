/**
 * Competencias de fútbol que se pueden seguir enteras (todos sus partidos, no solo los de un
 * equipo puntual) — solo los códigos de ESPN confirmados como válidos en este proyecto (ver
 * matchScheduler.ts: "uefa.europa" dio 400 confirmado en vivo, así que queda afuera hasta tener
 * un código verificado para Europa League/Conference League). Las eliminatorias de Eurocopa
 * ("uefa.euro.qualifiers") y Sudamericanas ("conmebol.wc.qualifiers") también dieron 400 — no
 * existen con esos nombres en la API de ESPN. "fifa.friendly" sí es válido para el scoreboard
 * general (a diferencia del endpoint de calendario por equipo puntual, donde da 400 para clubes).
 */
export interface FollowableCompetition {
  id: string; // código ESPN
  name: string;
  /** Título del artículo en Wikipedia (en inglés) — de ahí sale el escudo de la competencia,
   *  mismo mecanismo ya usado para los íconos de deporte y de F1 (fetchWikiThumbnail). Solo
   *  hace falta cuando difiere del "name" de arriba. */
  wikiTitle?: string;
}

export const FOLLOWABLE_COMPETITIONS: FollowableCompetition[] = [
  { id: "arg.1", name: "Liga Profesional Argentina", wikiTitle: "Liga Profesional de Fútbol Argentino" },
  { id: "arg.copa", name: "Copa Argentina" },
  { id: "conmebol.libertadores", name: "Copa Libertadores" },
  { id: "conmebol.sudamericana", name: "Copa Sudamericana" },
  { id: "eng.1", name: "Premier League" },
  { id: "esp.1", name: "LaLiga", wikiTitle: "La Liga" },
  { id: "ita.1", name: "Serie A" },
  { id: "ger.1", name: "Bundesliga" },
  { id: "fra.1", name: "Ligue 1" },
  { id: "uefa.champions", name: "UEFA Champions League" },
  { id: "fifa.world", name: "Mundial de la FIFA", wikiTitle: "FIFA World Cup" },
  { id: "fifa.cwc", name: "Mundial de Clubes FIFA", wikiTitle: "FIFA Club World Cup" },
  { id: "conmebol.america", name: "Copa América" },
  { id: "uefa.euro", name: "Eurocopa", wikiTitle: "UEFA European Championship" },
  { id: "fifa.friendly", name: "Amistosos Internacionales" },
];
