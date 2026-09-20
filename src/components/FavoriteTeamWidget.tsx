import React, { useState, useEffect } from "react";
import { Activity, RefreshCw, Calendar, Radio, MapPin, Trophy, Shield } from "lucide-react";
import { TEAMS, Team } from "../data/teams";
import { getStadiumForTeam, fetchTeamScheduleAllCompetitions } from "../lib/matchScheduler";
import { FOOTBALL_TEAM_ESPN_IDS } from "../data/espnTeamIds";

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

  // Calendario propio del equipo (.../teams/{id}/schedule, sin fecha) — mismo endpoint ya
  // confirmado en vivo para "Eventos deportivos" y el resto de los widgets de partidos. Antes
  // este widget usaba el scoreboard con "dates" como rango (400 seguro) y, cuando fallaba,
  // directamente INVENTABA un próximo y un último partido contra un rival de relleno
  // ("River Plate" fijo para Boca) con fechas armadas — de ahí que apareciera un "Boca vs
  // River" que no tenía nada que ver con el fixture real. Ahora, si no hay datos reales, el
  // widget simplemente no muestra nada en esa tarjeta.
  const fetchMatches = async () => {
    setLoading(true);
    try {
      const espnId = FOOTBALL_TEAM_ESPN_IDS[selectedTeamName];
      if (!espnId) {
        setLiveMatch(null);
        setNextMatch(null);
        setLastMatch(null);
        return;
      }

      const events = await fetchTeamScheduleAllCompetitions(teamObj, espnId);

      const parsedMatches: MatchData[] = events
        .map((ev) => {
          const comp = ev.competitions?.[0];
          const competitors = comp?.competitors || [];
          const homeComp = competitors.find((c: any) => c.homeAway === "home");
          const awayComp = competitors.find((c: any) => c.homeAway === "away");

          const homeName = homeComp?.team?.displayName || "Local";
          const awayName = awayComp?.team?.displayName || "Visitante";

          const homeLogo = getLogoForTeamName(homeName, homeComp?.team?.logos?.[0]?.href || homeComp?.team?.logo);
          const awayLogo = getLogoForTeamName(awayName, awayComp?.team?.logos?.[0]?.href || awayComp?.team?.logo);

          const isFavHome = homeName === selectedTeamName;
          // Algunos eventos traen el estado en competitions[0].status y otros (visto en vivo
          // con un partido en curso) solo lo tienen a nivel evento — se revisan los dos en vez
          // de asumir uno solo, así un partido en vivo no se pierde y termina sin mostrarse.
          const statusObj = comp?.status || ev.status;
          const state = statusObj?.type?.state; // 'in', 'pre', 'post'
          const rawDate = new Date(ev.date);

          return {
            id: ev.id,
            status: state === "in" ? "live" : state === "post" ? "finished" : "upcoming",
            statusText: statusObj?.type?.shortDetail || statusObj?.type?.description || "",
            clock: statusObj?.displayClock || `${statusObj?.clock || 0}'`,
            dateStr: rawDate.toLocaleDateString("es-AR", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            venue: comp?.venue?.fullName || comp?.venue?.displayName || getStadiumForTeam(homeName),
            competition: ev.league?.name || teamObj?.league || "Competencia",
            homeTeam: { name: homeName, logo: homeLogo, score: homeComp?.score?.displayValue ?? "0" },
            awayTeam: { name: awayName, logo: awayLogo, score: awayComp?.score?.displayValue ?? "0" },
            isFavoriteHome: isFavHome,
            rawDate,
          } as MatchData;
        })
        .filter((m) => m.rawDate && !isNaN(m.rawDate.getTime()));

      // 1. Live Match
      const foundLive = parsedMatches.find((m) => m.status === "live") || null;

      // 2. Next Match: closest upcoming
      const foundNext =
        parsedMatches
          .filter((m) => m.status === "upcoming")
          .sort((a, b) => (a.rawDate?.getTime() || 0) - (b.rawDate?.getTime() || 0))[0] || null;

      // 3. Last Match: most recent finished
      const foundLast =
        parsedMatches
          .filter((m) => m.status === "finished")
          .sort((a, b) => (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0))[0] || null;

      setLiveMatch(foundLive);
      setNextMatch(foundNext);
      setLastMatch(foundLast);
    } catch (e) {
      console.warn("[FavoriteTeamWidget] Error fetching matches from ESPN:", e);
      setLiveMatch(null);
      setNextMatch(null);
      setLastMatch(null);
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
              {currentLive?.competition || nextMatch?.competition || teamObj?.league || "Mi Equipo Favorito"}
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
