/**
 * Current F1 grid (teams/constructors and drivers). Only names + the Wikipedia article title
 * used to fetch each one's photo/logo (see lib/wikipedia.ts) — no hardcoded image URLs, since
 * those tend to rot. Lineups change every season (and sometimes mid-season); this list is
 * current as of when it was written and may need occasional small edits.
 */
export interface F1Team {
  id: string;
  name: string;
  wikiTitle: string;
}

export interface F1Driver {
  id: string;
  name: string;
  teamId: string;
  wikiTitle: string;
}

export const F1_TEAMS: F1Team[] = [
  { id: "mclaren", name: "McLaren", wikiTitle: "McLaren" },
  { id: "ferrari", name: "Ferrari", wikiTitle: "Scuderia Ferrari" },
  { id: "redbull", name: "Red Bull Racing", wikiTitle: "Red Bull Racing" },
  { id: "mercedes", name: "Mercedes", wikiTitle: "Mercedes-Benz in Formula One" },
  { id: "astonmartin", name: "Aston Martin", wikiTitle: "Aston Martin F1 Team" },
  { id: "alpine", name: "Alpine", wikiTitle: "Alpine F1 Team" },
  { id: "williams", name: "Williams", wikiTitle: "Williams Grand Prix Engineering" },
  { id: "racingbulls", name: "Racing Bulls", wikiTitle: "RB Formula One Team" },
  { id: "sauber", name: "Kick Sauber", wikiTitle: "Sauber Motorsport" },
  { id: "haas", name: "Haas", wikiTitle: "Haas F1 Team" },
];

export const F1_DRIVERS: F1Driver[] = [
  { id: "norris", name: "Lando Norris", teamId: "mclaren", wikiTitle: "Lando Norris" },
  { id: "piastri", name: "Oscar Piastri", teamId: "mclaren", wikiTitle: "Oscar Piastri" },
  { id: "leclerc", name: "Charles Leclerc", teamId: "ferrari", wikiTitle: "Charles Leclerc" },
  { id: "hamilton", name: "Lewis Hamilton", teamId: "ferrari", wikiTitle: "Lewis Hamilton" },
  { id: "verstappen", name: "Max Verstappen", teamId: "redbull", wikiTitle: "Max Verstappen" },
  { id: "tsunoda", name: "Yuki Tsunoda", teamId: "redbull", wikiTitle: "Yuki Tsunoda" },
  { id: "russell", name: "George Russell", teamId: "mercedes", wikiTitle: "George Russell (racing driver)" },
  { id: "antonelli", name: "Kimi Antonelli", teamId: "mercedes", wikiTitle: "Andrea Kimi Antonelli" },
  { id: "alonso", name: "Fernando Alonso", teamId: "astonmartin", wikiTitle: "Fernando Alonso" },
  { id: "stroll", name: "Lance Stroll", teamId: "astonmartin", wikiTitle: "Lance Stroll" },
  { id: "gasly", name: "Pierre Gasly", teamId: "alpine", wikiTitle: "Pierre Gasly" },
  { id: "colapinto", name: "Franco Colapinto", teamId: "alpine", wikiTitle: "Franco Colapinto" },
  { id: "albon", name: "Alexander Albon", teamId: "williams", wikiTitle: "Alexander Albon" },
  { id: "sainz", name: "Carlos Sainz Jr.", teamId: "williams", wikiTitle: "Carlos Sainz Jr." },
  { id: "hadjar", name: "Isack Hadjar", teamId: "racingbulls", wikiTitle: "Isack Hadjar" },
  { id: "lawson", name: "Liam Lawson", teamId: "racingbulls", wikiTitle: "Liam Lawson" },
  { id: "hulkenberg", name: "Nico Hülkenberg", teamId: "sauber", wikiTitle: "Nico Hülkenberg" },
  { id: "bortoleto", name: "Gabriel Bortoleto", teamId: "sauber", wikiTitle: "Gabriel Bortoleto" },
  { id: "ocon", name: "Esteban Ocon", teamId: "haas", wikiTitle: "Esteban Ocon" },
  { id: "bearman", name: "Oliver Bearman", teamId: "haas", wikiTitle: "Oliver Bearman" },
];
