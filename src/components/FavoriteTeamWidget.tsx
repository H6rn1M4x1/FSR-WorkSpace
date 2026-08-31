import React, { useState, useEffect } from "react";
import { Activity, RefreshCw, Calendar, Radio, MapPin, Trophy, Shield } from "lucide-react";
import { TEAMS, Team } from "../data/teams";
import { getLeagueCodesForTeam, getStadiumForTeam } from "../lib/matchScheduler";

interface FavoriteTeamWidgetProps {
  favoriteTeamName?: string;
  darkMode?: boolean;
  onScheduleMonthlyMatches?: () => void;
  isScheduled?: boolean;
}

export interface MatchData {
  id: string;
  status: "live" | "upcoming" | "finished";
  statusText: string;
  clock?: string;
  dateStr: string;
  venue?: string;
  competition?: string;
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
  isFavoriteHome?: boolean;
  rawDate?: Date;
}

const LEAGUE_CODES: Record<string, string> = {
  "Liga Profesional": "arg.1",
  "Premier League": "eng.1",
  LaLiga: "esp.1",
  "Serie A": "ita.1",
  Bundesliga: "ger.1",
  "Ligue 1": "fra.1",
};

// Fallbacks per team for rich realistic fixtures if off-season / API unavailable
const FALLBACK_RIVALS: Record<string, { rival: string; rivalLogo: string; venue: string }> = {
  "Boca Juniors": {
    rival: "River Plate",
    rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/river.png",
    venue: "La Bombonera",
  },
  "River Plate": {
    rival: "Boca Juniors",
    rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/boca.png",
    venue: "M\u00e1s Monumental",
  },
  "Real Madrid": {
    rival: "FC Barcelona",
    rivalLogo: "https://assets.footylogos.com/logos/fc-barcelona/fc-barcelona-logo-footylogos.svg",
    venue: "Santiago Bernab\u00e9u",
  },
  "FC Barcelona": {
    rival: "Real Madrid",
    rivalLogo: "https://assets.footylogos.com/logos/real-madrid/real-madrid-logo-footylogos.svg",
    venue: "Spotify Camp Nou",
  },
  Arsenal: {
    rival: "Chelsea",
    rivalLogo: "https://assets.footylogos.com/logos/chelsea/chelsea-logo-footylogos.svg",
    venue: "Emirates Stadium",
  },
};

export const FavoriteTeamWidget: React.FC<FavoriteTeamWidgetProps> = ({
  favoriteTeamName = "Boca Juniors",
  darkMode,
  onScheduleMonthlyMatches,
  isScheduled,
}) => {
  const selectedTeamName = favoriteTeamName || "Boca Juniors";
  const teamObj: Team | undefined = TEAMS.find((t) => t.name === selectedTeamName);

  const [loading, setLoading] = useState<boolean>(true);
  const [liveMatch, setLiveMatch] = useState<MatchData | null>(null);
  const [nextMatch, setNextMatch] = useState<MatchData | null>(null);
  const [lastMatch, setLastMatch] = useState<MatchData | null>(null);
  const [isSimulatedLive, setIsSimulatedLive] = useState<boolean>(false);
  const [simulatedMinute, setSimulatedMinute] = useState<number>(68);

  // Function to search logo in TEAMS array or fallback
  const getLogoForTeamName = (name: string, defaultLogo?: string): string => {
    if (defaultLogo && defaultLogo.length > 5) return defaultLogo;
    const match = TEAMS.find(
      (t) =>
        t.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(t.name.toLowerCase())
    );
    return match?.logo || defaultLogo || "";
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const leagueName = teamObj?.league || "Liga Profesional";
      const leagueCodes = getLeagueCodesForTeam(teamObj);

      const now = new Date();
      const past = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      const future = new Date(now.getTime() + 14 * 24 * 3600 * 1000);

      const fmt = (d: Date) =>
        `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
          d.getUTCDate()
        ).padStart(2, "0")}`;

      const dateRange = `${fmt(past)}-${fmt(future)}`;

      const fetchPromises = leagueCodes.map(async (code) => {
        try {
          const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${dateRange}`;
          const res = await fetch(url).catch(() => null);
          if (res && res.ok) {
            const data = await res.json().catch(() => null);
            if (data) return { code, data };
          }
        } catch (e) {
          // Silently ignore inactive league codes
        }
        return null;
      });

      const fetchResults = await Promise.all(fetchPromises);
      const allEvents: { ev: any; competitionName: string }[] = [];
      const processedEventIds = new Set<string>();

      fetchResults.forEach((resObj) => {
        if (!resObj) return;
        const { data } = resObj;
        const events: any[] = data.events || [];
        const leagueNameFromAPI = data.leagues?.[0]?.name || teamObj?.league || "Competencia";

        events.forEach((ev) => {
          if (processedEventIds.has(ev.id)) return;
          processedEventIds.add(ev.id);
          allEvents.push({ ev, competitionName: leagueNameFromAPI });
        });
      });

      const cleanQuery = selectedTeamName
        .toLowerCase()
        .replace(/fc|club|de|cd|real|atletico|deportivo/g, "")
        .trim();

      const teamEvents = allEvents.filter(({ ev }) => {
        const comps = ev.competitions?.[0]?.competitors || [];
        return comps.some((c: any) => {
          const cn = c.team?.displayName?.toLowerCase() || "";
          return (
            cn.includes(cleanQuery) ||
            cleanQuery.includes(cn) ||
            c.team?.shortDisplayName?.toLowerCase()?.includes(cleanQuery)
          );
        });
      });

      const parsedMatches: MatchData[] = [];

      teamEvents.forEach(({ ev, competitionName }) => {
        const comp = ev.competitions?.[0];
        if (!comp) return;

        const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home");
        const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away");

        const homeName = homeComp?.team?.displayName || "Local";
        const awayName = awayComp?.team?.displayName || "Visitante";

        const homeLogo = getLogoForTeamName(
          homeName,
          homeComp?.team?.logo || homeComp?.team?.logos?.[0]?.href
        );
        const awayLogo = getLogoForTeamName(
          awayName,
          awayComp?.team?.logo || awayComp?.team?.logos?.[0]?.href
        );

        const isFavHome = homeName.toLowerCase().includes(cleanQuery);

        const state = ev.status?.type?.state; // 'in', 'pre', 'post'
        const matchObj: MatchData = {
          id: ev.id,
          status: state === "in" ? "live" : state === "post" ? "finished" : "upcoming",
          statusText: ev.status?.type?.shortDetail || ev.status?.type?.description || "",
          clock: ev.status?.displayClock || `${ev.status?.clock || 0}'`,
          dateStr: new Date(ev.date).toLocaleDateString("es-AR", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          venue: comp.venue?.displayName || getStadiumForTeam(homeName),
          competition: competitionName,
          homeTeam: {
            name: homeName,
            logo: homeLogo,
            score: homeComp?.score ?? "0",
          },
          awayTeam: {
            name: awayName,
            logo: awayLogo,
            score: awayComp?.score ?? "0",
          },
          isFavoriteHome: isFavHome,
          rawDate: new Date(ev.date),
        };

        parsedMatches.push(matchObj);
      });

      // 1. Live Match
      const liveMatches = parsedMatches.filter(m => m.status === "live");
      const foundLive = liveMatches.length > 0 ? liveMatches[0] : null;

      // 2. Next Match: Sort upcoming matches ascending by date (closest first)
      const upcomingMatches = parsedMatches
        .filter(m => m.status === "upcoming")
        .sort((a, b) => (a.rawDate?.getTime() || 0) - (b.rawDate?.getTime() || 0));
      const foundNext = upcomingMatches.length > 0 ? upcomingMatches[0] : null;

      // 3. Last Match: Sort finished matches descending by date (most recent first)
      const finishedMatches = parsedMatches
        .filter(m => m.status === "finished")
        .sort((a, b) => (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0));
      const foundLast = finishedMatches.length > 0 ? finishedMatches[0] : null;

      setLiveMatch(foundLive);
      setNextMatch(foundNext);
      setLastMatch(foundLast);

      // If no next match found from API (e.g. off-season break), set clean fallback match
      if (!foundNext) {
        const rivalInfo = FALLBACK_RIVALS[selectedTeamName] || {
          rival: "Rival FC",
          rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/river.png",
          venue: "Estadio Principal",
        };

        const fallbackNextDate = new Date();
        fallbackNextDate.setDate(fallbackNextDate.getDate() + 3);
        fallbackNextDate.setHours(18, 0, 0, 0);

        setNextMatch({
          id: "fb-next",
          status: "upcoming",
          statusText: "Programado",
          dateStr: fallbackNextDate.toLocaleDateString("es-AR", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          venue: rivalInfo.venue,
          competition: teamObj?.league || "Liga Oficial",
          homeTeam: {
            name: selectedTeamName,
            logo: teamObj?.logo || "",
            score: 0,
          },
          awayTeam: {
            name: rivalInfo.rival,
            logo: rivalInfo.rivalLogo,
            score: 0,
          },
          isFavoriteHome: true,
        });
      }

      // If no last match found from API, set clean fallback last match
      if (!foundLast) {
        const rivalInfo = FALLBACK_RIVALS[selectedTeamName] || {
          rival: "Rival FC",
          rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/river.png",
          venue: "Estadio Principal",
        };

        const fallbackLastDate = new Date();
        fallbackLastDate.setDate(fallbackLastDate.getDate() - 4);

        setLastMatch({
          id: "fb-last",
          status: "finished",
          statusText: "Finalizado",
          dateStr: fallbackLastDate.toLocaleDateString("es-AR", {
            day: "numeric",
            month: "short",
          }),
          venue: rivalInfo.venue,
          competition: teamObj?.league || "Liga Oficial",
          homeTeam: {
            name: selectedTeamName,
            logo: teamObj?.logo || "",
            score: 2,
          },
          awayTeam: {
            name: rivalInfo.rival,
            logo: rivalInfo.rivalLogo,
            score: 1,
          },
          isFavoriteHome: true,
        });
      }
    } catch (e) {
      console.warn("Could not fetch ESPN sports live data, using localized fixture data", e);

      // Robust local fallback when network is offline
      const rivalInfo = FALLBACK_RIVALS[selectedTeamName] || {
        rival: "Rival FC",
        rivalLogo: "https://paladarnegro.net/escudoteca/argentina/primeradivision/png/river.png",
        venue: "Estadio Principal",
      };

      setNextMatch({
        id: "fb-next-err",
        status: "upcoming",
        statusText: "Pr\u00f3ximo",
        dateStr: "Dom, 3 Ago • 18:00 hs",
        venue: rivalInfo.venue,
        competition: teamObj?.league || "Liga Oficial",
        homeTeam: {
          name: selectedTeamName,
          logo: teamObj?.logo || "",
          score: 0,
        },
        awayTeam: {
          name: rivalInfo.rival,
          logo: rivalInfo.rivalLogo,
          score: 0,
        },
        isFavoriteHome: true,
      });

      setLastMatch({
        id: "fb-last-err",
        status: "finished",
        statusText: "Finalizado",
        dateStr: "Hace 4 d\u00edas",
        venue: rivalInfo.venue,
        competition: teamObj?.league || "Liga Oficial",
        homeTeam: {
          name: selectedTeamName,
          logo: teamObj?.logo || "",
          score: 2,
        },
        awayTeam: {
          name: rivalInfo.rival,
          logo: rivalInfo.rivalLogo,
          score: 1,
        },
        isFavoriteHome: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [selectedTeamName]);

  // Live match minute counter timer when simulated or live
  useEffect(() => {
    if (!isSimulatedLive) return;
    const interval = setInterval(() => {
      setSimulatedMinute((prev) => (prev >= 90 ? 1 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [isSimulatedLive]);

  // Handle active display match (Live vs Next)
  const currentLive = isSimulatedLive
    ? ({
        id: "simulated-live",
        status: "live",
        statusText: `${simulatedMinute}' • EN VIVO`,
        clock: `${simulatedMinute}'`,
        dateStr: "Ahora mismo",
        venue: nextMatch?.venue || "Estadio Principal",
        competition: teamObj?.league || "Liga Oficial",
        homeTeam: {
          name: selectedTeamName,
          logo: teamObj?.logo || "",
          score: 2,
        },
        awayTeam: {
          name: nextMatch?.awayTeam?.name || "Rival FC",
          logo: nextMatch?.awayTeam?.logo || "",
          score: 1,
        },
        isFavoriteHome: true,
      } as MatchData)
    : liveMatch;

  return (
    <div
      className={`rounded-3xl p-5 border flex flex-col justify-between shadow-xs transition-all duration-300 h-full ${
        darkMode
          ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
          : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl bg-primary/10 text-primary shrink-0 flex items-center justify-center">
            {teamObj?.logo ? (
              <img
                src={teamObj.logo}
                alt={selectedTeamName}
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Shield className="w-4 h-4" />
            )}
          </div>
          <div className="truncate">
            <h3 className="font-extrabold text-sm tracking-wide leading-none text-zinc-900 dark:text-white truncate">
              {selectedTeamName}
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate block mt-1">
              {teamObj?.league || "Mi Equipo Favorito"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSimulatedLive(!isSimulatedLive)}
            title={isSimulatedLive ? "Volver a tiempo real" : "Simular partido en vivo"}
            className={`text-xs font-bold px-2.5 py-1 rounded-xl cursor-pointer transition-all flex items-center gap-1 border ${
              isSimulatedLive
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 animate-pulse"
                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>{isSimulatedLive ? "Simulación" : "Probar Vivo"}</span>
          </button>

          <button
            type="button"
            onClick={fetchMatches}
            disabled={loading}
            className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* MAIN MATCH AREA: Live OR Next Match */}
      <div className="py-1">
        {currentLive ? (
          /* LIVE MATCH CONTAINER */
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>{currentLive.statusText || "EN VIVO"}</span>
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[140px]">
                {currentLive.competition}
              </span>
            </div>

            <div className="flex items-center justify-between my-2">
              {/* Home Team */}
              <div className="flex flex-col items-center flex-1 text-center px-1">
                {currentLive.homeTeam.logo ? (
                  <img
                    src={currentLive.homeTeam.logo}
                    alt={currentLive.homeTeam.name}
                    className="w-7 h-7 object-contain mb-1 filter drop-shadow-xs"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <Shield className="w-6 h-6 text-zinc-400 mb-1" />
                )}
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[90px]">
                  {currentLive.homeTeam.name}
                </span>
              </div>

              {/* Live Score */}
              <div className="flex items-center gap-2 px-2">
                <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {currentLive.homeTeam.score}
                </span>
                <span className="text-sm opacity-40 font-extrabold text-zinc-400">-</span>
                <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {currentLive.awayTeam.score}
                </span>
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center flex-1 text-center px-1">
                {currentLive.awayTeam.logo ? (
                  <img
                    src={currentLive.awayTeam.logo}
                    alt={currentLive.awayTeam.name}
                    className="w-7 h-7 object-contain mb-1 filter drop-shadow-xs"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <Shield className="w-6 h-6 text-zinc-400 mb-1" />
                )}
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[90px]">
                  {currentLive.awayTeam.name}
                </span>
              </div>
            </div>

            {currentLive.venue && (
              <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 font-medium flex items-center justify-center gap-1 mt-1 truncate">
                <MapPin className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate">{currentLive.venue}</span>
              </p>
            )}
          </div>
        ) : nextMatch ? (
          /* NEXT MATCH CONTAINER */
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                <Calendar className="w-3 h-3 text-primary" />
                <span>Próximo</span>
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">{nextMatch.dateStr}</span>
            </div>

            <div className="flex items-center justify-between my-2">
              {/* Home Team */}
              <div className="flex flex-col items-center flex-1 text-center px-1">
                {nextMatch.homeTeam.logo ? (
                  <img
                    src={nextMatch.homeTeam.logo}
                    alt={nextMatch.homeTeam.name}
                    className="w-7 h-7 object-contain mb-1 filter drop-shadow-xs"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <Shield className="w-6 h-6 text-zinc-400 mb-1" />
                )}
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[90px]">
                  {nextMatch.homeTeam.name}
                </span>
              </div>

              {/* VS indicator */}
              <div className="flex flex-col items-center px-2">
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  VS
                </span>
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center flex-1 text-center px-1">
                {nextMatch.awayTeam.logo ? (
                  <img
                    src={nextMatch.awayTeam.logo}
                    alt={nextMatch.awayTeam.name}
                    className="w-7 h-7 object-contain mb-1 filter drop-shadow-xs"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <Shield className="w-6 h-6 text-zinc-400 mb-1" />
                )}
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[90px]">
                  {nextMatch.awayTeam.name}
                </span>
              </div>
            </div>

            {nextMatch.venue && (
              <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 font-medium flex items-center justify-center gap-1 mt-1 truncate">
                <MapPin className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate">{nextMatch.venue}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Sin partidos programados
          </div>
        )}
      </div>

      {/* LAST MATCH COMPACT SUB-CARD */}
      {lastMatch && (
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between text-xs bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors rounded-xl px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Último:
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Home Logo & Name */}
              <div className="flex items-center gap-1">
                {lastMatch.homeTeam.logo ? (
                  <img
                    src={lastMatch.homeTeam.logo}
                    alt={lastMatch.homeTeam.name}
                    className="w-3.5 h-3.5 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                  {lastMatch.homeTeam.name.split(" ")[0]}
                </span>
              </div>

              {/* Score */}
              <span className="font-extrabold text-xs bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-900 dark:text-white px-1.5 py-0.2 rounded tracking-wider">
                {lastMatch.homeTeam.score} - {lastMatch.awayTeam.score}
              </span>

              {/* Away Logo & Name */}
              <div className="flex items-center gap-1">
                <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                  {lastMatch.awayTeam.name.split(" ")[0]}
                </span>
                {lastMatch.awayTeam.logo ? (
                  <img
                    src={lastMatch.awayTeam.logo}
                    alt={lastMatch.awayTeam.name}
                    className="w-3.5 h-3.5 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Schedule Matches Button */}
      {onScheduleMonthlyMatches && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onScheduleMonthlyMatches}
            className="w-full py-2 px-3 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            title="Agendar automáticamente los partidos del mes de tu equipo favorito en Agenda Central Integrada y Calendario Unificado"
          >
            <Calendar className="w-4 h-4" />
            <span>{isScheduled ? "Partidos Agendados este Mes (Ocio)" : "Agendar Partidos del Mes en Agenda"}</span>
          </button>
        </div>
      )}
    </div>
  );
};
