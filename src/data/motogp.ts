/**
 * Current MotoGP grid (teams and riders). Same approach as data/f1.ts: only names + a
 * Wikipedia article title, photos/logos fetched live via lib/wikipedia.ts. Lineups shift
 * every season; this is current as of when it was written.
 */
export interface MotoGpTeam {
  id: string;
  name: string;
  wikiTitle: string;
}

export interface MotoGpRider {
  id: string;
  name: string;
  teamId: string;
  wikiTitle: string;
}

export const MOTOGP_TEAMS: MotoGpTeam[] = [
  { id: "ducati-lenovo", name: "Ducati Lenovo Team", wikiTitle: "Ducati Corse" },
  { id: "prima-pramac", name: "Prima Pramac Yamaha", wikiTitle: "Pramac Racing" },
  { id: "redbull-ktm", name: "Red Bull KTM Factory", wikiTitle: "Red Bull KTM Factory Racing" },
  { id: "aprilia", name: "Aprilia Racing", wikiTitle: "Aprilia Racing" },
  { id: "monster-yamaha", name: "Monster Energy Yamaha", wikiTitle: "Yamaha Factory Racing Team" },
  { id: "gresini", name: "Gresini Racing", wikiTitle: "Gresini Racing" },
  { id: "vr46", name: "VR46 Racing Team", wikiTitle: "VR46 Racing Team" },
  { id: "trackhouse", name: "Trackhouse Racing", wikiTitle: "Trackhouse Racing" },
  { id: "lcr-honda", name: "LCR Honda", wikiTitle: "Lucio Cecchinello Racing" },
  { id: "honda-hrc", name: "Honda HRC Castrol", wikiTitle: "Repsol Honda Team" },
];

export const MOTOGP_RIDERS: MotoGpRider[] = [
  { id: "bagnaia", name: "Francesco Bagnaia", teamId: "ducati-lenovo", wikiTitle: "Francesco Bagnaia" },
  { id: "marquez-marc", name: "Marc Márquez", teamId: "ducati-lenovo", wikiTitle: "Marc Márquez" },
  { id: "oliveira", name: "Miguel Oliveira", teamId: "prima-pramac", wikiTitle: "Miguel Oliveira" },
  { id: "morbidelli", name: "Franco Morbidelli", teamId: "prima-pramac", wikiTitle: "Franco Morbidelli" },
  { id: "acosta", name: "Pedro Acosta", teamId: "redbull-ktm", wikiTitle: "Pedro Acosta" },
  { id: "binder", name: "Brad Binder", teamId: "redbull-ktm", wikiTitle: "Brad Binder" },
  { id: "martin", name: "Jorge Martín", teamId: "aprilia", wikiTitle: "Jorge Martín (motorcyclist)" },
  { id: "quartararo", name: "Fabio Quartararo", teamId: "monster-yamaha", wikiTitle: "Fabio Quartararo" },
  { id: "rins", name: "Álex Rins", teamId: "monster-yamaha", wikiTitle: "Álex Rins" },
  { id: "marquez-alex", name: "Álex Márquez", teamId: "gresini", wikiTitle: "Álex Márquez" },
  { id: "bezzecchi", name: "Marco Bezzecchi", teamId: "vr46", wikiTitle: "Marco Bezzecchi" },
  { id: "diggia", name: "Fabio Di Giannantonio", teamId: "vr46", wikiTitle: "Fabio Di Giannantonio" },
  { id: "aldeguer", name: "Fermín Aldeguer", teamId: "gresini", wikiTitle: "Fermín Aldeguer" },
  { id: "miller", name: "Jack Miller", teamId: "trackhouse", wikiTitle: "Jack Miller" },
  { id: "marini", name: "Luca Marini", teamId: "honda-hrc", wikiTitle: "Luca Marini" },
  { id: "zarco", name: "Johann Zarco", teamId: "honda-hrc", wikiTitle: "Johann Zarco" },
];
