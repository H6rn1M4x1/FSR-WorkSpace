/**
 * Competencias de fútbol que se pueden seguir enteras (todos sus partidos, no solo los de un
 * equipo puntual) — solo los códigos de ESPN confirmados como válidos en este proyecto (ver
 * matchScheduler.ts: "uefa.europa" y "fifa.friendly" dieron 400 confirmado en vivo, así que
 * quedan afuera hasta tener un código verificado para Europa League/Conference League).
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
];
