import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Radio,
  MapPin,
  Trophy,
  Shield,
  RefreshCw,
  Sliders,
  Check,
  ChevronDown,
  Search,
  X,
  Plus
} from "lucide-react";
import { TEAMS, Team } from "../data/teams";
import { getLeagueCodesForTeam, getStadiumForTeam } from "../lib/matchScheduler";

interface MultiTeamMatchWidgetProps {
  darkMode: boolean;
}

export interface MatchWeeklyData {
  id: string;
  teamKey: string; // The selected team name
  logo: string;
  status: "live" | "upcoming" | "finished";
  statusText: string;
  dateStr: string;
  weekdayNum: number; // 0: Sunday, 1: Monday, ... 6: Saturday
  dateObj: Date;
  competition: string;
  venue: string;
  homeTeam: {
    name: string;
    logo: string;
    score?: string | number;
  };
  awayTeam: {
    name: string;
    logo: string;
    score?: string | number;
  };
  isRecommended?: boolean;
}

const NATIONAL_SELECTIONS = [
  { name: "Argentina", logo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/202.png&h=120&w=120", country: "Argentina" },
  { name: "España", logo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/206.png&h=120&w=120", country: "España" },
  { name: "Brasil", logo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/205.png&h=120&w=120", country: "Brasil" },
  { name: "Francia", logo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/449.png&h=120&w=120", country: "Francia" },
  { name: "Italia", logo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/207.png&h=120&w=120", country: "Italia" },
  { name: "Alemania", logo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/481.png&h=120&w=120", country: "Alemania" },
  { name: "Inglaterra", logo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/448.png&h=120&w=120", country: "Inglaterra" },
  { name: "Uruguay", logo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/209.png&h=120&w=120", country: "Uruguay" },
  { name: "Colombia", logo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/204.png&h=120&w=120", country: "Colombia" },
  { name: "Portugal", logo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/482.png&h=120&w=120", country: "Portugal" },
];

const FALLBACK_CLUB_RIVALS: Record<string, { rival: string; rivalLogo: string; venue: string }> = {
  "Boca Juniors": { rival: "River Plate", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/16.png&h=120&w=120", venue: "La Bombonera" },
  "River Plate": { rival: "Boca Juniors", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/5.png&h=120&w=120", venue: "Más Monumental" },
  "Real Madrid": { rival: "FC Barcelona", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/83.png&h=120&w=120", venue: "Santiago Bernabéu" },
  "FC Barcelona": { rival: "Real Madrid", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/86.png&h=120&w=120", venue: "Spotify Camp Nou" },
  Arsenal: { rival: "Chelsea", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/363.png&h=120&w=120", venue: "Emirates Stadium" },
  Chelsea: { rival: "Arsenal", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/359.png&h=120&w=120", venue: "Stamford Bridge" },
  "Manchester United": { rival: "Manchester City", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/382.png&h=120&w=120", venue: "Old Trafford" },
  "Manchester City": { rival: "Manchester United", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/360.png&h=120&w=120", venue: "Etihad Stadium" },
  "Liverpool": { rival: "Everton", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/368.png&h=120&w=120", venue: "Anfield" },
  "Inter Milan": { rival: "AC Milan", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/103.png&h=120&w=120", venue: "Estadio Giuseppe Meazza" },
  "AC Milan": { rival: "Inter Milan", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/110.png&h=120&w=120", venue: "San Siro" },
  "Bayern Munich": { rival: "Borussia Dortmund", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/124.png&h=120&w=120", venue: "Allianz Arena" },
  "Paris Saint-Germain": { rival: "Monaco", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/175.png&h=120&w=120", venue: "Parc des Princes" }
};

const FALLBACK_SELECTION_RIVALS: Record<string, { rival: string; rivalLogo: string; venue: string }> = {
  "Argentina": { rival: "Brasil", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/205.png&h=120&w=120", venue: "Estadio de Maracaná" },
  "España": { rival: "Francia", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/449.png&h=120&w=120", venue: "Estadio Santiago Bernabéu" },
  "Brasil": { rival: "Argentina", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/202.png&h=120&w=120", venue: "Estadio de Maracaná" },
  "Francia": { rival: "Alemania", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/481.png&h=120&w=120", venue: "Stade de France" },
  "Italia": { rival: "España", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/206.png&h=120&w=120", venue: "Stadio Olimpico de Roma" },
  "Alemania": { rival: "Inglaterra", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/448.png&h=120&w=120", venue: "Allianz Arena" },
  "Inglaterra": { rival: "Alemania", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/481.png&h=120&w=120", venue: "Wembley Stadium" },
  "Uruguay": { rival: "Argentina", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/202.png&h=120&w=120", venue: "Estadio Centenario" },
  "Colombia": { rival: "Brasil", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/205.png&h=120&w=120", venue: "Estadio Metropolitano" },
  "Portugal": { rival: "España", rivalLogo: "https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/206.png&h=120&w=120", venue: "Estádio da Luz" },
};

const getCompetitionLogo = (competitionName: string): string => {
  const comp = competitionName.toLowerCase();
  if (comp.includes("libertadores")) {
    return "https://upload.wikimedia.org/wikipedia/commons/e/ec/Copa_Conmebol_Libertadores_Logo.png";
  }
  if (comp.includes("champions") || comp.includes("uefa") || comp.includes("champions league")) {
    return "https://upload.wikimedia.org/wikipedia/en/b/bf/UEFA_Champions_League_logo_2.svg";
  }
  if (comp.includes("sudamericana")) {
    return "https://upload.wikimedia.org/wikipedia/commons/7/70/Copa_Sudamericana_logo.png";
  }
  if (comp.includes("copa américa") || comp.includes("america")) {
    return "https://upload.wikimedia.org/wikipedia/commons/e/ea/Copa_Am%C3%A9rica_2024_logo.svg";
  }
  if (comp.includes("mundial") || comp.includes("world cup") || comp.includes("worldcup")) {
    return "https://upload.wikimedia.org/wikipedia/commons/d/df/FIFA_World_Cup_2026_logo.svg";
  }
  if (comp.includes("recopa")) {
    return "https://upload.wikimedia.org/wikipedia/commons/0/00/Copa_Recopa_Sudamericana_Logo.png";
  }
  if (comp.includes("supercopa")) {
    return "https://upload.wikimedia.org/wikipedia/commons/b/ba/Supercopa_Argentina_Logo.svg";
  }
  if (comp.includes("euro")) {
    return "https://upload.wikimedia.org/wikipedia/commons/8/87/UEFA_Euro_2024_logo.svg";
  }
  return "";
};

const TEAM_NAME_TO_ESPN_ID: Record<string, string> = {
  // Premier League
  "Arsenal": "359",
  "Aston Villa": "362",
  "Bournemouth": "349",
  "Brentford": "337",
  "Brighton & Hove Albion": "331",
  "Chelsea": "363",
  "Crystal Palace": "384",
  "Everton": "368",
  "Fulham": "370",
  "Liverpool": "364",
  "Manchester City": "382",
  "Manchester United": "360",
  "Newcastle United": "361",
  "Nottingham Forest": "393",
  "Tottenham Hotspur": "367",
  "West Ham United": "371",
  "Wolverhampton Wanderers": "380",

  // LaLiga
  "Athletic Club": "93",
  "Atlético de Madrid": "1068",
  "CA Osasuna": "97",
  "Cádiz CF": "3741",
  "Deportivo Alavés": "96",
  "FC Barcelona": "83",
  "Getafe CF": "2922",
  "Girona FC": "9812",
  "Rayo Vallecano": "101",
  "RC Celta de Vigo": "85",
  "RCD Mallorca": "84",
  "Real Betis": "244",
  "Real Madrid": "86",
  "Real Sociedad": "89",
  "Sevilla FC": "243",
  "UD Almería": "176",
  "UD Las Palmas": "3742",
  "Valencia CF": "94",
  "Villarreal CF": "102",

  // Serie A
  "Atalanta": "105",
  "Bologna": "107",
  "Cagliari": "2925",
  "Empoli": "116",
  "Fiorentina": "109",
  "Frosinone": "4057",
  "Genoa": "3263",
  "Inter Milan": "110",
  "Juventus": "111",
  "Lazio": "112",
  "Lecce": "113",
  "AC Milan": "103",
  "Monza": "4007",
  "Napoli": "114",
  "Roma": "104",
  "Salernitana": "3994",
  "Sassuolo": "3997",
  "Torino": "239",
  "Udinese": "118",
  "Hellas Verona": "120",

  // Bundesliga
  "Bayern Munich": "132",
  "Borussia Dortmund": "124",
  "Bayer Leverkusen": "131",
  "RB Leipzig": "11420",
  "VfB Stuttgart": "134",
  "Eintracht Frankfurt": "125",
  "SC Freiburg": "126",
  "Hoffenheim": "7911",
  "Werder Bremen": "137",
  "Borussia Mönchengladbach": "268",

  // Ligue 1
  "Paris Saint-Germain": "160",
  "Monaco": "174",
  "Lille": "166",
  "Marseille": "176",
  "Lyon": "167",
  "Lens": "175",
  "Rennes": "169",

  // Liga Profesional Argentina
  "Boca Juniors": "5",
  "River Plate": "16",
  "Racing Club": "15",
  "Independiente": "11",
  "San Lorenzo": "18",
  "Estudiantes LP": "8",
  "Rosario Central": "17",
  "Newell's Old Boys": "14",
  "Talleres (C)": "19",
  "Belgrano": "4",
  "Argentinos Juniors": "3",
  "Vélez Sarsfield": "21",
  "Lanús": "12",
  "Defensa y Justicia": "8950",
  "Huracán": "10",
  "Gimnasia LP": "9",
  "Tigre": "7767",
  "Banfield": "235",
  "Unión": "20",
  "Platense": "7764",
  "Instituto": "2975",
  "Sarmiento": "10158",
  "Central Córdoba": "11989",
  "Atlético Tucumán": "9785",
  "Barracas Central": "10060",
  "Independiente Rivadavia": "9744",
  "Deportivo Riestra": "17702",

  // National Selections
  "Argentina": "202",
  "España": "206",
  "Brasil": "205",
  "Francia": "449",
  "Italia": "207",
  "Alemania": "481",
  "Inglaterra": "448",
  "Uruguay": "209",
  "Colombia": "204",
  "Portugal": "482",
};

const NATIONAL_SELECTION_ALIASES: Record<string, string[]> = {
  "Argentina": ["argentina"],
  "España": ["spain", "espana", "españa"],
  "Brasil": ["brazil", "brasil"],
  "Francia": ["france", "francia"],
  "Italia": ["italy", "italia"],
  "Alemania": ["germany", "alemania"],
  "Inglaterra": ["england", "inglaterra"],
  "Uruguay": ["uruguay"],
  "Colombia": ["colombia"],
  "Portugal": ["portugal"],
};

const matchesTeam = (displayName: string, teamName: string, isClub: boolean): boolean => {
  const normDisplay = displayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normTeam = teamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (!isClub) {
    const aliases = NATIONAL_SELECTION_ALIASES[teamName] || [normTeam];
    return aliases.some(alias => {
      const normAlias = alias.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normDisplay.includes(normAlias) || normAlias.includes(normDisplay);
    });
  }

  // Direct match
  if (normDisplay.includes(normTeam) || normTeam.includes(normDisplay)) {
    return true;
  }

  // Helper clean names
  const clean = (s: string) =>
    s
      .replace(/\(.*?\)/g, "") // remove parenthesized parts
      .replace(/fc|club|de|cd|real|atletico|deportivo|juniors|plate|ca|lp|cf|ud|rcd|rc|sd/g, "")
      .replace(/[\s.-]/g, "")
      .trim();

  const cleanDisplay = clean(normDisplay);
  const cleanTeam = clean(normTeam);

  if (cleanDisplay.length >= 3 && cleanTeam.length >= 3) {
    if (cleanDisplay.includes(cleanTeam) || cleanTeam.includes(cleanDisplay)) {
      return true;
    }
  }

  return false;
};

const getBestLogo = (teamName: string, espnLogo?: string, isClub: boolean = true): string => {
  const normName = teamName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (isClub) {
    const localMatch = TEAMS.find(t => {
      const normLocal = t.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normLocal.includes(normName) || normName.includes(normLocal);
    });
    if (localMatch) return localMatch.logo;
  } else {
    const localMatch = NATIONAL_SELECTIONS.find(s => {
      const normLocal = s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normLocal.includes(normName) || normName.includes(normLocal);
    });
    if (localMatch) return localMatch.logo;
  }
  
  // Cross-type check
  const crossMatchClub = TEAMS.find(t => {
    const normLocal = t.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normLocal.includes(normName) || normName.includes(normLocal);
  });
  if (crossMatchClub) return crossMatchClub.logo;

  const crossMatchSel = NATIONAL_SELECTIONS.find(s => {
    const normLocal = s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normLocal.includes(normName) || normName.includes(normLocal);
  });
  if (crossMatchSel) return crossMatchSel.logo;

  return espnLogo || "";
};

const getAllLeagueCodesForTeam = (teamName: string, isClub: boolean): string[] => {
  if (!isClub) {
    return [
      "fifa.friendly",
      "copa.america",
      "uefa.euro",
      "fifa.world",
      "fifa.world.q.conmebol",
      "fifa.world.q.uefa",
      "fifa.world.q.concacaf",
      "caf.nations",
      "fifa.world.q.afc",
      "uefa.euro.q",
      "uefa.nations",
      "copa.championship"
    ];
  }

  const teamObj = TEAMS.find((t) => t.name === teamName);
  const country = teamObj?.country?.toLowerCase() || "";
  const league = teamObj?.league?.toLowerCase() || "";

  const codes: string[] = [];

  if (country.includes("argentina") || league.includes("profesional")) {
    codes.push(
      "arg.1",
      "arg.copa",
      "conmebol.libertadores",
      "conmebol.sudamericana",
      "conmebol.recopa",
      "club.friendly"
    );
  } else if (country.includes("españa") || country.includes("espana") || league.includes("laliga")) {
    codes.push(
      "esp.1",
      "esp.copa_del_rey",
      "esp.supercopa",
      "uefa.champions",
      "uefa.champions.q",
      "uefa.europa",
      "uefa.europa.q",
      "uefa.conf_league",
      "uefa.conf_league.q",
      "uefa.super_cup",
      "club.friendly"
    );
  } else if (country.includes("inglaterra") || league.includes("premier")) {
    codes.push(
      "eng.1",
      "eng.fa",
      "eng.league_cup",
      "eng.charity_shield",
      "uefa.champions",
      "uefa.champions.q",
      "uefa.europa",
      "uefa.europa.q",
      "uefa.conf_league",
      "uefa.conf_league.q",
      "uefa.super_cup",
      "club.friendly"
    );
  } else if (country.includes("italia") || league.includes("serie a")) {
    codes.push(
      "ita.1",
      "ita.coppa",
      "ita.supercoppa",
      "uefa.champions",
      "uefa.champions.q",
      "uefa.europa",
      "uefa.europa.q",
      "uefa.conf_league",
      "uefa.conf_league.q",
      "uefa.super_cup",
      "club.friendly"
    );
  } else if (country.includes("alemania") || league.includes("bundesliga")) {
    codes.push(
      "ger.1",
      "ger.dfb_pokal",
      "ger.supercup",
      "uefa.champions",
      "uefa.champions.q",
      "uefa.europa",
      "uefa.europa.q",
      "uefa.conf_league",
      "uefa.conf_league.q",
      "uefa.super_cup",
      "club.friendly"
    );
  } else if (country.includes("francia") || league.includes("ligue 1")) {
    codes.push(
      "fra.1",
      "fra.coupe_de_france",
      "fra.trophee_des_champions",
      "uefa.champions",
      "uefa.champions.q",
      "uefa.europa",
      "uefa.europa.q",
      "uefa.conf_league",
      "uefa.conf_league.q",
      "uefa.super_cup",
      "club.friendly"
    );
  } else {
    codes.push(
      "arg.1",
      "arg.copa",
      "esp.1",
      "eng.1",
      "uefa.champions",
      "uefa.champions.q",
      "uefa.europa",
      "uefa.europa.q",
      "conmebol.libertadores",
      "club.friendly"
    );
  }

  codes.push("fifa.friendly", "club.friendly", "fifa.club");
  return Array.from(new Set(codes));
};

const TOP_WORLD_TEAM_IDS = new Set([
  "86",   // Real Madrid
  "83",   // Barcelona
  "382",  // Manchester City
  "359",  // Arsenal
  "364",  // Liverpool
  "360",  // Manchester United
  "363",  // Chelsea
  "132",  // Bayern Munich
  "124",  // Borussia Dortmund
  "131",  // Bayer Leverkusen
  "110",  // Inter Milan
  "103",  // AC Milan
  "111",  // Juventus
  "160",  // PSG
  "1068", // Atletico Madrid
  "5",    // Boca Juniors
  "16"    // River Plate
]);

const isInterestingMatch = (ev: any, compName: string): boolean => {
  const comp = ev.competitions?.[0];
  const competitors = comp?.competitors || [];
  if (competitors.length < 2) return false;

  const homeComp = competitors.find((c: any) => c.homeAway === "home");
  const awayComp = competitors.find((c: any) => c.homeAway === "away");

  const homeId = String(homeComp?.team?.id || "");
  const awayId = String(awayComp?.team?.id || "");

  const homeName = homeComp?.team?.displayName || "";
  const awayName = awayComp?.team?.displayName || "";

  const isHomeTop = TOP_WORLD_TEAM_IDS.has(homeId);
  const isAwayTop = TOP_WORLD_TEAM_IDS.has(awayId);

  // 1. Both are top world teams
  if (isHomeTop && isAwayTop) return true;

  // 2. Specific historic clásico / derby check by team names
  const hn = homeName.toLowerCase();
  const an = awayName.toLowerCase();

  const isDerby =
    (hn.includes("boca") && an.includes("river")) ||
    (hn.includes("river") && an.includes("boca")) ||
    (hn.includes("real madrid") && an.includes("barcelona")) ||
    (hn.includes("barcelona") && an.includes("real madrid")) ||
    (hn.includes("real madrid") && an.includes("atletico")) ||
    (hn.includes("atletico") && an.includes("real madrid")) ||
    (hn.includes("milan") && an.includes("inter")) ||
    (hn.includes("inter") && an.includes("milan")) ||
    (hn.includes("manchester united") && an.includes("manchester city")) ||
    (hn.includes("manchester city") && an.includes("manchester united")) ||
    (hn.includes("arsenal") && an.includes("tottenham")) ||
    (hn.includes("tottenham") && an.includes("arsenal")) ||
    (hn.includes("bayern") && an.includes("dortmund")) ||
    (hn.includes("dortmund") && an.includes("bayern"));

  if (isDerby) return true;

  // 3. Champions League or Libertadores match featuring at least one top team
  const isMajorTournament = compName.toLowerCase().includes("champions league") ||
                            compName.toLowerCase().includes("libertadores");
  if (isMajorTournament && (isHomeTop || isAwayTop)) return true;

  // 4. Matches between a top team and other strong teams
  const strongTeamIds = ["363", "367", "124", "131", "104", "112", "244", "243"]; // Chelsea, Tottenham, Dortmund, Leverkusen, Roma, Lazio, Betis, Sevilla
  if (isHomeTop && strongTeamIds.includes(awayId)) return true;
  if (isAwayTop && strongTeamIds.includes(homeId)) return true;

  return false;
};

export const MultiTeamMatchWidget: React.FC<MultiTeamMatchWidgetProps> = ({ darkMode }) => {
  // Load initial states from localStorage or use premium defaults
  const [selectedClubs, setSelectedClubs] = useState<string[]>(() => {
    const saved = localStorage.getItem("weekly_tracked_clubs");
    return saved ? JSON.parse(saved) : ["Boca Juniors", "Real Madrid", "Arsenal", "Inter Milan"];
  });

  const [selectedSelection, setSelectedSelection] = useState<string>(() => {
    return localStorage.getItem("weekly_tracked_selection") || "Argentina";
  });

  const [matches, setMatches] = useState<MatchWeeklyData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDayFilter, setActiveDayFilter] = useState<number | null>(null); // null = All week
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeEditSlot, setActiveEditSlot] = useState<{ type: "club" | "selection"; index?: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem("weekly_tracked_clubs", JSON.stringify(selectedClubs));
  }, [selectedClubs]);

  useEffect(() => {
    localStorage.setItem("weekly_tracked_selection", selectedSelection);
  }, [selectedSelection]);

  // Click outside listener for configuration dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveEditSlot(null);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getWeekRange = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday
    // Calculate Monday of the current week
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    // Sunday of the current week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  };

  const fetchMatchesForWeek = async () => {
    setLoading(true);
    const { monday, sunday } = getWeekRange();

    const fmt = (d: Date) =>
      `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
        d.getUTCDate()
      ).padStart(2, "0")}`;

    const dateRange = `${fmt(monday)}-${fmt(sunday)}`;

    const weeklyMatches: MatchWeeklyData[] = [];
    const addedMatchKeys = new Set<string>();

    // Combine all tracked teams (4 clubs + 1 selection)
    const trackedTeams = [
      ...selectedClubs.map((name, i) => ({ name, type: "club" as const, index: i, espnId: TEAM_NAME_TO_ESPN_ID[name] })),
      { name: selectedSelection, type: "selection" as const, espnId: TEAM_NAME_TO_ESPN_ID[selectedSelection] }
    ];

    // Collect all unique league codes to fetch
    const allUniqueCodes = new Set<string>();
    // Always include top leagues to discover worldwide interesting matches
    ["eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "arg.1", "uefa.champions", "conmebol.libertadores", "club.friendly"].forEach(code => allUniqueCodes.add(code));

    for (const teamInfo of trackedTeams) {
      const isClub = teamInfo.type === "club";
      const codes = getAllLeagueCodesForTeam(teamInfo.name, isClub);
      codes.forEach(code => allUniqueCodes.add(code));
    }

    const allCodesArray = Array.from(allUniqueCodes);
    const scoreboards: { code: string; data: any }[] = [];

    try {
      const apiPromises = allCodesArray.map(async (code) => {
        try {
          const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${dateRange}`;
          const res = await fetch(url).catch(() => null);
          if (res && res.ok) {
            const data = await res.json().catch(() => null);
            if (data) return { code, data };
          }
        } catch (e) {
          // Ignore failures for specific leagues
        }
        return null;
      });

      const apiResults = await Promise.all(apiPromises);
      apiResults.forEach(res => {
        if (res && res.data) {
          scoreboards.push(res);
        }
      });
    } catch (globalErr) {
      // Safe fallback
    }

    // Now, scan all tracked teams and extract matches
    for (const teamInfo of trackedTeams) {
      const isClub = teamInfo.type === "club";
      let teamLogo = "";

      if (isClub) {
        const teamObj = TEAMS.find((t) => t.name === teamInfo.name);
        teamLogo = teamObj?.logo || "";
      } else {
        const selectionObj = NATIONAL_SELECTIONS.find((s) => s.name === teamInfo.name);
        teamLogo = selectionObj?.logo || "";
      }

      // Scan all scoreboards for matches of this team
      for (const { data } of scoreboards) {
        const events: any[] = data.events || [];
        const competitionName = data.leagues?.[0]?.name || (isClub ? "Liga Profesional" : "Partido Internacional");

        const teamEvents = events.filter((ev) => {
          const competitors = ev.competitions?.[0]?.competitors || [];
          return competitors.some((c: any) => {
            if (teamInfo.espnId) {
              return String(c.team?.id) === teamInfo.espnId;
            }
            const displayName = c.team?.displayName || "";
            return matchesTeam(displayName, teamInfo.name, isClub);
          });
        });

        for (const ev of teamEvents) {
          const comp = ev.competitions?.[0];
          const homeComp = comp?.competitors?.find((c: any) => c.homeAway === "home");
          const awayComp = comp?.competitors?.find((c: any) => c.homeAway === "away");

          const homeName = homeComp?.team?.displayName || "Local";
          const awayName = awayComp?.team?.displayName || "Visitante";

          const state = ev.status?.type?.state;
          const matchDate = new Date(ev.date);

          const matchKey = `${teamInfo.name}-${ev.id || matchDate.getTime()}`;
          if (addedMatchKeys.has(matchKey)) continue;
          addedMatchKeys.add(matchKey);

          const homeLogo = getBestLogo(homeName, homeComp?.team?.logo || homeComp?.team?.logos?.[0]?.href, isClub);
          const awayLogo = getBestLogo(awayName, awayComp?.team?.logo || awayComp?.team?.logos?.[0]?.href, isClub);

          const formattedWeekdayAndDay = matchDate.toLocaleDateString("es-AR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          const formattedTime = matchDate.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const dateStr = `${formattedWeekdayAndDay} • ${formattedTime}`;

          weeklyMatches.push({
            id: `weekly-${teamInfo.name}-${ev.id || matchDate.getTime()}`,
            teamKey: teamInfo.name,
            logo: teamLogo,
            status: state === "in" ? "live" : state === "post" ? "finished" : "upcoming",
            statusText: ev.status?.type?.shortDetail || ev.status?.type?.description || "Programado",
            dateStr,
            weekdayNum: matchDate.getDay(),
            dateObj: matchDate,
            competition: competitionName,
            venue: comp?.venue?.displayName || getStadiumForTeam(homeName),
            homeTeam: {
              name: homeName,
              logo: homeLogo || "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/boca.png",
              score: homeComp?.score ?? "",
            },
            awayTeam: {
              name: awayName,
              logo: awayLogo || "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/river.png",
              score: awayComp?.score ?? "",
            }
          });
        }
      }
    }

    // Second pass: scan all fetched scoreboards for highly interesting matches of other top world teams
    for (const { data } of scoreboards) {
      const events: any[] = data.events || [];
      const competitionName = data.leagues?.[0]?.name || "Competencia Internacional";

      for (const ev of events) {
        if (isInterestingMatch(ev, competitionName)) {
          const comp = ev.competitions?.[0];
          const homeComp = comp?.competitors?.find((c: any) => c.homeAway === "home");
          const awayComp = comp?.competitors?.find((c: any) => c.homeAway === "away");

          const homeName = homeComp?.team?.displayName || "Local";
          const awayName = awayComp?.team?.displayName || "Visitante";

          const matchDate = new Date(ev.date);

          // Build a unique key to verify if we already added this event for a selected team
          let alreadyExists = false;
          for (const match of weeklyMatches) {
            if (match.id.includes(String(ev.id))) {
              match.isRecommended = true; // Mark as recommended too!
              alreadyExists = true;
              break;
            }
          }

          if (alreadyExists) continue;

          // Check if we already have it in the addedMatchKeys
          const matchKeyHome = `${homeName}-${ev.id || matchDate.getTime()}`;
          const matchKeyAway = `${awayName}-${ev.id || matchDate.getTime()}`;
          if (addedMatchKeys.has(matchKeyHome) || addedMatchKeys.has(matchKeyAway)) continue;

          addedMatchKeys.add(matchKeyHome);
          addedMatchKeys.add(matchKeyAway);

          const homeLogo = getBestLogo(homeName, homeComp?.team?.logo || homeComp?.team?.logos?.[0]?.href, true);
          const awayLogo = getBestLogo(awayName, awayComp?.team?.logo || awayComp?.team?.logos?.[0]?.href, true);

          const formattedWeekdayAndDay = matchDate.toLocaleDateString("es-AR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          const formattedTime = matchDate.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const dateStr = `${formattedWeekdayAndDay} • ${formattedTime}`;

          const state = ev.status?.type?.state;

          weeklyMatches.push({
            id: `weekly-recommended-${ev.id || matchDate.getTime()}`,
            teamKey: "Destacado",
            logo: "⭐",
            status: state === "in" ? "live" : state === "post" ? "finished" : "upcoming",
            statusText: ev.status?.type?.shortDetail || ev.status?.type?.description || "Programado",
            dateStr,
            weekdayNum: matchDate.getDay(),
            dateObj: matchDate,
            competition: competitionName,
            venue: comp?.venue?.displayName || getStadiumForTeam(homeName),
            homeTeam: {
              name: homeName,
              logo: homeLogo || "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/boca.png",
              score: homeComp?.score ?? "",
            },
            awayTeam: {
              name: awayName,
              logo: awayLogo || "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/river.png",
              score: awayComp?.score ?? "",
            },
            isRecommended: true
          });
        }
      }
    }

    // Sort: unplayed first (upcoming/live), finished last. Secondary sort: chronological ascending.
    weeklyMatches.sort((a, b) => {
      const aFinished = a.status === "finished";
      const bFinished = b.status === "finished";

      if (aFinished && !bFinished) return 1;
      if (!aFinished && bFinished) return -1;

      return a.dateObj.getTime() - b.dateObj.getTime();
    });
    setMatches(weeklyMatches);
    setLoading(false);
  };

  useEffect(() => {
    fetchMatchesForWeek();
  }, [selectedClubs, selectedSelection]);

  const filteredMatches = activeDayFilter === null
    ? matches
    : matches.filter((m) => m.weekdayNum === activeDayFilter);

  const getDayNameShort = (dayNum: number) => {
    return ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][dayNum];
  };

  // Build weekday ribbon counters
  const dayCounters = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const count = matches.filter((m) => m.weekdayNum === d).length;
    return { dayNum: d, name: getDayNameShort(d), count };
  });

  // Filtered lists for team edit dropdowns
  const availableClubs = TEAMS.filter((team) => {
    const isAlreadySelected = selectedClubs.includes(team.name);
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
    return !isAlreadySelected && matchesSearch;
  });

  const availableSelections = NATIONAL_SELECTIONS.filter((selection) => {
    const isAlreadySelected = selectedSelection === selection.name;
    const matchesSearch = selection.name.toLowerCase().includes(searchTerm.toLowerCase());
    return !isAlreadySelected && matchesSearch;
  });

  const handleUpdateClub = (index: number, newClubName: string) => {
    const updated = [...selectedClubs];
    updated[index] = newClubName;
    setSelectedClubs(updated);
    setActiveEditSlot(null);
    setSearchTerm("");
  };

  const handleUpdateSelection = (newSelectionName: string) => {
    setSelectedSelection(newSelectionName);
    setActiveEditSlot(null);
    setSearchTerm("");
  };

  return (
    <div
      id="multi-team-match-widget"
      className={`relative rounded-3xl p-6 border flex flex-col justify-between shadow-xs transition-all duration-300 ${
        activeEditSlot ? "z-[150]" : "z-10"
      } ${
        darkMode
          ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
          : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
      }`}
    >
      {/* Title Header */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-wide text-zinc-900 dark:text-white">
              Seguimiento Semanal de Equipos
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Mis 4 Clubs favoritos y Selección Nacional
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 border ${
              isEditing
                ? "bg-primary text-white border-primary"
                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isEditing ? "Ver Agenda" : "Configurar"}</span>
          </button>

          <button
            type="button"
            onClick={fetchMatchesForWeek}
            disabled={loading}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors"
            title="Actualizar partidos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          /* CONFIGURATION PANEL WITH INLINE SLOT EDITORS */
          <motion.div
            key="edit-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="p-3 bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800/40 rounded-2xl">
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                Haz click en cualquier slot para seleccionar tu equipo desde la base de datos oficial:
              </p>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 relative ${activeEditSlot ? "z-[100]" : "z-10"}`} ref={dropdownRef}>
              {/* 4 Clubs Slots */}
              {selectedClubs.map((clubName, idx) => {
                const clubObj = TEAMS.find((t) => t.name === clubName);
                const isThisSlotOpen = activeEditSlot?.type === "club" && activeEditSlot?.index === idx;

                return (
                  <div key={`club-slot-${idx}`} className={`relative ${isThisSlotOpen ? "z-[100]" : "z-10"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEditSlot(isThisSlotOpen ? null : { type: "club", index: idx });
                        setSearchTerm("");
                      }}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isThisSlotOpen
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {clubObj?.logo ? (
                          <img
                            src={clubObj.logo}
                            alt={clubName}
                            className="w-5 h-5 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <Shield className="w-5 h-5 text-zinc-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Club #{idx + 1}</p>
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{clubName}</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isThisSlotOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Club Selection Dropdown */}
                    <AnimatePresence>
                      {isThisSlotOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 right-0 top-full mt-1.5 z-[100] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden max-h-60 flex flex-col"
                        >
                          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-950 z-10">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                              <input
                                type="text"
                                className="w-full pl-7 pr-3 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-zinc-800 dark:text-zinc-200"
                                placeholder="Buscar club..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto p-1 flex-1">
                            {availableClubs.length > 0 ? (
                              availableClubs.map((team) => (
                                <button
                                  type="button"
                                  key={team.id}
                                  onClick={() => handleUpdateClub(idx, team.name)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors text-zinc-700 dark:text-zinc-300"
                                >
                                  {team.logo && (
                                    <img src={team.logo} alt={team.name} className="w-4 h-4 object-contain shrink-0" referrerPolicy="no-referrer" />
                                  )}
                                  <div className="truncate">
                                    <span className="font-bold block truncate">{team.name}</span>
                                    <span className="text-[9px] text-zinc-400 block truncate">{team.league} - {team.country}</span>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <p className="text-center py-4 text-xs text-zinc-400">No se encontraron clubs</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* 1 National Team Slot */}
              {(() => {
                const selectionObj = NATIONAL_SELECTIONS.find((s) => s.name === selectedSelection);
                const isThisSlotOpen = activeEditSlot?.type === "selection";

                return (
                  <div className={`relative ${isThisSlotOpen ? "z-[100]" : "z-10"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEditSlot(isThisSlotOpen ? null : { type: "selection" });
                        setSearchTerm("");
                      }}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isThisSlotOpen
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {selectionObj?.logo ? (
                          <img
                            src={selectionObj.logo}
                            alt={selectedSelection}
                            className="w-5 h-5 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <Shield className="w-5 h-5 text-zinc-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Selección</p>
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{selectedSelection}</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isThisSlotOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Selection Dropdown */}
                    <AnimatePresence>
                      {isThisSlotOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 right-0 top-full mt-1.5 z-[100] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden max-h-60 flex flex-col"
                        >
                          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-950 z-10">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                              <input
                                type="text"
                                className="w-full pl-7 pr-3 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-zinc-800 dark:text-zinc-200"
                                placeholder="Buscar selección..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto p-1 flex-1">
                            {availableSelections.length > 0 ? (
                              availableSelections.map((sel) => (
                                <button
                                  type="button"
                                  key={sel.name}
                                  onClick={() => handleUpdateSelection(sel.name)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors text-zinc-700 dark:text-zinc-300"
                                >
                                  {sel.logo && (
                                    <img src={sel.logo} alt={sel.name} className="w-4 h-4 object-contain shrink-0" referrerPolicy="no-referrer" />
                                  )}
                                  <span className="font-bold block truncate">{sel.name}</span>
                                </button>
                              ))
                            ) : (
                              <p className="text-center py-4 text-xs text-zinc-400">No se encontraron selecciones</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar y Ver Horarios</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* WEEK MATCHES VIEWER WITH CALENDAR RIBBON AND DETAILED MATCH LIST */
          <motion.div
            key="matches-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* List of matches for the week - Compact horizontal single row */}
            <div className="flex flex-row gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x">
              {loading ? (
                <div className="w-full py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs font-medium text-zinc-400">Buscando fechas del fixture...</p>
                </div>
              ) : filteredMatches.length === 0 ? (
                <div className="w-full py-12 bg-slate-50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-800/40 rounded-3xl flex flex-col items-center justify-center text-center p-6">
                  <Shield className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <h4 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">
                    Sin partidos para este período
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                    No hay partidos registrados de tus equipos o del fútbol destacado para este período de la semana.
                  </p>
                </div>
              ) : (
                filteredMatches.slice(0, 15).map((match) => {
                  const isLive = match.status === "live";
                  const isFinished = match.status === "finished";

                  return (
                    <div
                      key={match.id}
                      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between hover:scale-[1.01] hover:border-slate-300 dark:hover:border-zinc-600 transition-all shadow-xs relative overflow-hidden min-w-[240px] md:min-w-[220px] lg:flex-1 snap-start"
                    >
                      {/* Top ribbon: state & competition info */}
                      <div className="flex items-center justify-between gap-1 border-b border-zinc-100 dark:border-zinc-800/60 pb-2 mb-2">
                        <div className="flex items-center gap-1 min-w-0">
                          {isLive ? (
                            <span className="text-[8px] font-extrabold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 uppercase tracking-wider animate-pulse">
                              <span className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
                              <span>{match.statusText || "VIVO"}</span>
                            </span>
                          ) : isFinished ? (
                            <span className="text-[8px] font-bold bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 border border-zinc-300/20 dark:border-zinc-600/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 uppercase tracking-wider">
                              <Trophy className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                              <span>Fin</span>
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold bg-primary/10 text-primary border border-primary/15 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 uppercase tracking-wider">
                              <Calendar className="w-2.5 h-2.5 text-primary shrink-0" />
                              <span>{match.dateStr.split(" • ")[0]?.substring(0, 3) || "Sem"}</span>
                            </span>
                          )}

                          {getCompetitionLogo(match.competition) && (
                            <img
                              src={getCompetitionLogo(match.competition)}
                              alt={match.competition}
                              className="w-4 h-4 object-contain shrink-0 filter drop-shadow-xs"
                              referrerPolicy="no-referrer"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          )}

                          <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 truncate max-w-[80px]">
                            {match.competition}
                          </span>
                        </div>

                        {/* Shows who we are tracking */}
                        {match.isRecommended ? (
                          <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                            <span className="text-[8px] font-black text-amber-600 dark:text-amber-400">🔥 DESTACADO</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 px-1.5 py-0.5 rounded-full shrink-0">
                            {match.logo && match.logo.length > 2 ? (
                              <img
                                src={match.logo}
                                alt={match.teamKey}
                                className="w-3 h-3 object-contain"
                                referrerPolicy="no-referrer"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                              />
                            ) : (
                              <span className="text-[9px]">⭐</span>
                            )}
                            <span className="text-[8px] font-black text-zinc-600 dark:text-zinc-400">
                              {match.teamKey.split(" ")[0]}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Main score/versus card */}
                      <div className="flex items-center justify-between py-1">
                        {/* Home team */}
                        <div className="flex flex-col items-center flex-1 text-center px-0.5 min-w-0" title={match.homeTeam.name}>
                          {match.homeTeam.logo ? (
                            <img
                              src={match.homeTeam.logo}
                              alt={match.homeTeam.name}
                              className="w-9 h-9 object-contain mb-0.5 filter drop-shadow-sm transition-transform hover:scale-105"
                              referrerPolicy="no-referrer"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <Shield className="w-9 h-9 text-zinc-400 mb-0.5" />
                          )}
                        </div>

                        {/* Scores / VS */}
                        <div className="flex flex-col items-center justify-center px-1 shrink-0">
                          {isLive || isFinished ? (
                            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800">
                              <span className="text-xs font-black text-zinc-950 dark:text-white leading-none">
                                {match.homeTeam.score}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-extrabold leading-none">-</span>
                              <span className="text-xs font-black text-zinc-950 dark:text-white leading-none">
                                {match.awayTeam.score}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[8px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20 leading-none">
                              VS
                            </span>
                          )}
                          <span className="text-[8px] font-extrabold text-zinc-400 mt-1">
                            {match.dateStr.includes(" • ") ? match.dateStr.split(" • ")[1] : match.dateStr}
                          </span>
                        </div>

                        {/* Away team */}
                        <div className="flex flex-col items-center flex-1 text-center px-0.5 min-w-0" title={match.awayTeam.name}>
                          {match.awayTeam.logo ? (
                            <img
                              src={match.awayTeam.logo}
                              alt={match.awayTeam.name}
                              className="w-9 h-9 object-contain mb-0.5 filter drop-shadow-sm transition-transform hover:scale-105"
                              referrerPolicy="no-referrer"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <Shield className="w-9 h-9 text-zinc-400 mb-0.5" />
                          )}
                        </div>
                      </div>

                      {/* Stadium */}
                      {match.venue && (
                        <p className="text-[8px] text-center text-zinc-400 dark:text-zinc-500 font-medium flex items-center justify-center gap-0.5 mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/40 truncate">
                          <MapPin className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{match.venue}</span>
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
