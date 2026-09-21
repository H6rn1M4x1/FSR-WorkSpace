import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Star, RefreshCw, Flag } from "lucide-react";
import {
  fetchFootballStandings,
  fetchF1DriverStandings,
  fetchRecentF1Races,
  fetchNbaStandings,
  FootballLeagueStandings,
  F1DriverStanding,
  F1RaceResult,
  NbaStandingEntry,
} from "../lib/standingsService";
import { fetchWikiThumbnail } from "../lib/eventsService";

const CARD = (darkMode: boolean) =>
  `p-6 rounded-3xl border flex flex-col shadow-xs lg:col-span-4 ${
    darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
  }`;

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-zinc-800/10 dark:border-zinc-800/40 pb-3 mb-4">
      <span className="p-1 rounded-full bg-primary/10 shrink-0 flex items-center justify-center">{icon}</span>
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">{title}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="min-h-[292px] flex items-center text-xs text-zinc-500">{message}</p>;
}

function LoadingState() {
  return (
    <div className="min-h-[292px] flex items-center gap-2 text-xs text-zinc-500">
      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando posiciones...
    </div>
  );
}

/**
 * Tabla de posiciones de fútbol — una por cada liga seguida (según los equipos que seguís o
 * competencias de liga seguidas enteras), pasando de una liga a otra automáticamente cada 8s,
 * igual que el resto de los carruseles de esta página. Resalta con color de acento los equipos
 * que seguís, y con una estrella + acento el que marcaste como favorito.
 */
export function FootballStandingsPanel({
  darkMode,
  leagues,
  followedTeamNames,
  favoriteTeamName,
}: {
  darkMode: boolean;
  leagues: { code: string; name: string }[];
  followedTeamNames: Set<string>;
  favoriteTeamName?: string;
}) {
  const [tables, setTables] = useState<Record<string, FootballLeagueStandings | null>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
    if (leagues.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(leagues.map((l) => fetchFootballStandings(l.code, l.name))).then((results) => {
      const byCode: Record<string, FootballLeagueStandings | null> = {};
      results.forEach((r, i) => { byCode[leagues[i].code] = r; });
      setTables(byCode);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagues.map((l) => l.code).join(",")]);

  useEffect(() => {
    if (leagues.length <= 1) return;
    const id = setInterval(() => setPage((p) => (p + 1) % leagues.length), 8000);
    return () => clearInterval(id);
  }, [leagues.length]);

  const current = leagues[page];
  const table = current ? tables[current.code] : null;

  return (
    <div className={CARD(darkMode)}>
      <CardHeader icon={<Trophy className="w-3.5 h-3.5 text-primary" />} title="Posiciones - Fútbol" />
      {leagues.length === 0 ? (
        <EmptyState message="Elegí al menos un equipo o liga de fútbol desde el botón de configuración de Eventos deportivos." />
      ) : loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">{current.name}</p>
            <div className="flex items-center gap-1">
              {leagues.map((l, i) => (
                <span key={l.code} className={`h-1.5 rounded-full transition-all ${i === page ? "w-4 bg-primary" : "w-1.5 bg-zinc-300 dark:bg-zinc-700"}`} />
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.code}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3 }}
              className="h-[350px] overflow-y-auto pr-1"
            >
              {!table ? (
                <p className="text-xs text-zinc-500 py-4 text-center">No se pudo cargar la tabla de {current.name}.</p>
              ) : (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-zinc-400 uppercase text-[9px]">
                      <th className="text-left font-bold pb-1">#</th>
                      <th className="text-left font-bold pb-1">Equipo</th>
                      <th className="text-center font-bold pb-1">PJ</th>
                      <th className="text-center font-bold pb-1">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.entries.map((e) => {
                      const isFollowed = followedTeamNames.has(e.teamName);
                      const isFavorite = favoriteTeamName === e.teamName;
                      return (
                        <tr
                          key={e.teamId}
                          className={`border-t border-slate-100 dark:border-zinc-800/60 ${
                            isFollowed ? "bg-primary/10 text-primary font-extrabold" : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <td className="py-1.5">{e.rank}</td>
                          <td className="py-1.5 flex items-center gap-1.5 truncate max-w-[140px]">
                            {isFavorite && <Star className="w-3 h-3 text-primary fill-primary shrink-0" />}
                            {e.teamLogo && <img src={e.teamLogo} alt="" className="w-4 h-4 object-contain shrink-0" />}
                            <span className="truncate">{e.teamName}</span>
                          </td>
                          <td className="py-1.5 text-center">{e.played}</td>
                          <td className="py-1.5 text-center font-extrabold">{e.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/**
 * Columna del medio dividida en dos: arriba la posición del piloto de F1 que seguís en el
 * campeonato; abajo el circuito de las últimas carreras (una por vez, avanzando sola) con el
 * resultado de ese piloto en cada una.
 */
export function F1StandingsPanel({ darkMode, driverName }: { darkMode: boolean; driverName?: string }) {
  const [standings, setStandings] = useState<F1DriverStanding[] | null>(null);
  const [races, setRaces] = useState<F1RaceResult[]>([]);
  const [circuitImages, setCircuitImages] = useState<Record<string, string | null>>({});
  const [racePage, setRacePage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchF1DriverStandings(), fetchRecentF1Races()]).then(([s, r]) => {
      setStandings(s);
      setRaces(r);
      setLoading(false);
    });
  }, [driverName]);

  useEffect(() => {
    races.forEach((r) => {
      if (!r.circuitName || r.circuitName in circuitImages) return;
      fetchWikiThumbnail(r.circuitName).then((url) => setCircuitImages((prev) => ({ ...prev, [r.circuitName as string]: url })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [races]);

  useEffect(() => {
    if (races.length <= 1) return;
    const id = setInterval(() => setRacePage((p) => (p + 1) % races.length), 8000);
    return () => clearInterval(id);
  }, [races.length]);

  const myStanding = standings?.find((s) => driverName && s.driverName.toLowerCase().includes(driverName.toLowerCase()));
  const currentRace = races[racePage];
  const myRaceResult = currentRace?.driverResults.find((r) => driverName && r.driverName.toLowerCase().includes(driverName.toLowerCase()));

  return (
    <div className={CARD(darkMode)}>
      <CardHeader icon={<Flag className="w-3.5 h-3.5 text-primary" />} title="Posiciones - F1" />
      {!driverName ? (
        <EmptyState message="Elegí un piloto de F1 desde el botón de configuración de Eventos deportivos." />
      ) : loading ? (
        <LoadingState />
      ) : (
        <div className="flex flex-col gap-3 h-[350px]">
          {/* Mitad de arriba: posición en el campeonato */}
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">{driverName}</p>
            {myStanding ? (
              <>
                <p className="text-3xl font-black text-primary">#{myStanding.rank}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold">{myStanding.points} puntos</p>
              </>
            ) : (
              <p className="text-xs text-zinc-500 text-center">No se encontró la posición en el campeonato.</p>
            )}
          </div>

          {/* Mitad de abajo: circuito + resultado, una carrera por vez */}
          <div className="flex-1 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3 overflow-hidden">
            {!currentRace ? (
              <p className="text-xs text-zinc-500 text-center py-6">Sin carreras recientes.</p>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentRace.raceId}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center gap-1.5 h-full justify-center"
                >
                  {currentRace.circuitName && circuitImages[currentRace.circuitName] && (
                    <img src={circuitImages[currentRace.circuitName]!} alt="" className="w-16 h-16 object-contain rounded-xl" />
                  )}
                  <p className="text-[11px] font-extrabold text-zinc-900 dark:text-zinc-100 truncate max-w-full">{currentRace.raceName}</p>
                  {currentRace.circuitName && <p className="text-[10px] text-zinc-500 truncate max-w-full">{currentRace.circuitName}</p>}
                  {myRaceResult ? (
                    <p className="text-sm font-extrabold text-primary">
                      P{myRaceResult.position}
                      {myRaceResult.fastestLap && <span className="text-[9px] ml-1 uppercase">(vuelta rápida)</span>}
                    </p>
                  ) : (
                    <p className="text-[10px] text-zinc-500">Sin resultado para {driverName} en esta carrera.</p>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Tabla de posiciones de NBA con los puntos de cada equipo, con scroll interno. */
export function NbaStandingsPanel({
  darkMode,
  followedTeamNames,
}: {
  darkMode: boolean;
  followedTeamNames: Set<string>;
}) {
  const [entries, setEntries] = useState<NbaStandingEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchNbaStandings().then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className={CARD(darkMode)}>
      <CardHeader icon={<Trophy className="w-3.5 h-3.5 text-primary" />} title="Posiciones - NBA" />
      {loading ? (
        <LoadingState />
      ) : !entries || entries.length === 0 ? (
        <EmptyState message="No se pudo cargar la tabla de posiciones de la NBA." />
      ) : (
        <div className="h-[350px] overflow-y-auto pr-1">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-zinc-400 uppercase text-[9px]">
                <th className="text-left font-bold pb-1">#</th>
                <th className="text-left font-bold pb-1">Equipo</th>
                <th className="text-center font-bold pb-1">G-P</th>
                <th className="text-center font-bold pb-1">Pts</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const isFollowed = followedTeamNames.has(e.teamName);
                return (
                  <tr
                    key={e.teamId}
                    className={`border-t border-slate-100 dark:border-zinc-800/60 ${
                      isFollowed ? "bg-primary/10 text-primary font-extrabold" : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <td className="py-1.5">{e.rank}</td>
                    <td className="py-1.5 flex items-center gap-1.5 truncate max-w-[140px]">
                      {e.teamLogo && <img src={e.teamLogo} alt="" className="w-4 h-4 object-contain shrink-0" />}
                      <span className="truncate">{e.teamName}</span>
                    </td>
                    <td className="py-1.5 text-center">{e.won}-{e.lost}</td>
                    <td className="py-1.5 text-center font-extrabold">{e.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
