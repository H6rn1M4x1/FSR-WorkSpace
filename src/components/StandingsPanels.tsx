import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Star, RefreshCw, Flag } from "lucide-react";
import {
  fetchFootballStandings,
  fetchF1DriverStandings,
  fetchF1ConstructorStandings,
  fetchF1NextRace,
  fetchNbaStandings,
  getF1CircuitImage,
  FootballLeagueStandings,
  F1DriverStanding,
  F1ConstructorStanding,
  F1NextRace,
  NbaStandingEntry,
} from "../lib/standingsService";
import { fetchWikiThumbnail, fetchF1DriverPhoto } from "../lib/eventsService";

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
  const scrollRef = useRef<HTMLDivElement>(null);

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
              ref={scrollRef}
              className="h-[350px] overflow-y-auto pr-1"
            >
              {!table ? (
                <p className="text-xs text-zinc-500 py-4 text-center">No se pudo cargar la tabla de {current.name}.</p>
              ) : (
                <div className="text-[11px]">
                  <div className="grid grid-cols-[20px_1fr_32px_36px] gap-2 px-2 text-zinc-400 uppercase text-[9px] font-bold pb-1">
                    <span>#</span>
                    <span>Equipo</span>
                    <span className="text-center">PJ</span>
                    <span className="text-center">Pts</span>
                  </div>
                  <div className="space-y-0.5">
                    {table.entries.map((e) => {
                      const isFollowed = followedTeamNames.has(e.teamName);
                      const isFavorite = favoriteTeamName === e.teamName;
                      return (
                        <motion.div
                          key={e.teamId}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ root: scrollRef, once: true, margin: "0px 0px -10% 0px" }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className={`grid grid-cols-[20px_1fr_32px_36px] items-center gap-2 px-2 py-1.5 rounded-xl transition-colors hover:bg-primary/10 ${
                            isFollowed ? "bg-primary/10 text-primary font-extrabold" : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <span>{e.rank}</span>
                          <span className="flex items-center gap-1.5 truncate min-w-0">
                            {isFavorite && <Star className="w-3 h-3 text-primary fill-primary shrink-0" />}
                            {e.teamLogo && <img src={e.teamLogo} alt="" className="w-4 h-4 object-contain shrink-0" />}
                            <span className="truncate">{e.teamName}</span>
                          </span>
                          <span className="text-center">{e.played}</span>
                          <span className="text-center font-extrabold">{e.points}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/**
 * De arriba abajo: 3/4 del espacio con UN slider que pasa entre la tabla completa de pilotos y
 * la de constructores (mismo formato fila-por-fila que la tabla de fútbol: foto/logo, nombre,
 * puntos, con scroll interno), 1/4 restante con la próxima carrera. Resalta con acento +
 * estrella el piloto/escudería que seguís, mismo criterio que las tablas de fútbol/NBA.
 */
export function F1StandingsPanel({ darkMode, driverName, teamName }: { darkMode: boolean; driverName?: string; teamName?: string }) {
  const [drivers, setDrivers] = useState<F1DriverStanding[] | null>(null);
  const [constructors, setConstructors] = useState<F1ConstructorStanding[] | null>(null);
  const [nextRace, setNextRace] = useState<F1NextRace | null>(null);
  const [nextRaceImage, setNextRaceImage] = useState<string | null>(null);
  const [driverPhotos, setDriverPhotos] = useState<Record<string, string | null>>({});
  const [page, setPage] = useState<"drivers" | "constructors">("drivers");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchF1DriverStandings(), fetchF1ConstructorStandings(), fetchF1NextRace()]).then(([d, c, r]) => {
      setDrivers(d);
      setConstructors(c);
      setNextRace(r);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!nextRace) return;
    const fixed = getF1CircuitImage(nextRace.raceName);
    if (fixed) {
      setNextRaceImage(fixed);
      return;
    }
    fetchWikiThumbnail(nextRace.circuitName || nextRace.raceName).then(setNextRaceImage);
  }, [nextRace]);

  useEffect(() => {
    if (!drivers?.length) return;
    drivers.forEach((d) => {
      if (d.driverName in driverPhotos) return;
      fetchF1DriverPhoto(d.driverName).then((url) => setDriverPhotos((prev) => ({ ...prev, [d.driverName]: url })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers]);

  useEffect(() => {
    const id = setInterval(() => setPage((p) => (p === "drivers" ? "constructors" : "drivers")), 8000);
    return () => clearInterval(id);
  }, []);

  const isFollowedDriver = (name: string) => Boolean(driverName) && name.toLowerCase().includes(driverName!.toLowerCase());
  const isFollowedConstructor = (name: string) => Boolean(teamName) && name.toLowerCase().includes(teamName!.toLowerCase());
  const nextRaceDate = nextRace ? new Date(nextRace.date) : null;

  return (
    <div className={CARD(darkMode)}>
      <CardHeader icon={<Flag className="w-3.5 h-3.5 text-primary" />} title="Posiciones - F1" />
      {loading ? (
        <LoadingState />
      ) : (
        <div className="flex flex-col gap-3">
          {/* 3/4: un slider, pasa entre la tabla de pilotos y la de constructores */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">{page === "drivers" ? "Pilotos" : "Escuderías"}</p>
              <div className="flex items-center gap-1">
                {(["drivers", "constructors"] as const).map((p) => (
                  <span key={p} className={`h-1.5 rounded-full transition-all ${p === page ? "w-4 bg-primary" : "w-1.5 bg-zinc-300 dark:bg-zinc-700"}`} />
                ))}
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.3 }}
                ref={scrollRef}
                className="h-[260px] overflow-y-auto pr-1 text-[11px]"
              >
                <div className="grid grid-cols-[20px_26px_1fr_36px] gap-2 px-2 text-zinc-400 uppercase text-[9px] font-bold pb-1">
                  <span>#</span>
                  <span></span>
                  <span>{page === "drivers" ? "Piloto" : "Escudería"}</span>
                  <span className="text-center">Pts</span>
                </div>
                <div className="space-y-0.5">
                  {page === "drivers"
                    ? (drivers || []).map((d) => {
                        const isFollowed = isFollowedDriver(d.driverName);
                        return (
                          <motion.div
                            key={d.driverId}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ root: scrollRef, once: true, margin: "0px 0px -10% 0px" }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className={`grid grid-cols-[20px_26px_1fr_36px] items-center gap-2 px-2 py-1.5 rounded-xl transition-colors hover:bg-primary/10 ${
                              isFollowed ? "bg-primary/10 text-primary font-extrabold" : "text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            <span>{d.rank}</span>
                            <span className="flex items-center justify-center">
                              {driverPhotos[d.driverName] ? (
                                <img src={driverPhotos[d.driverName]!} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 block shrink-0" />
                              )}
                            </span>
                            <span className="flex items-center gap-1.5 truncate min-w-0">
                              {isFollowed && <Star className="w-3 h-3 text-primary fill-primary shrink-0" />}
                              <span className="truncate">{d.driverName}</span>
                            </span>
                            <span className="text-center font-extrabold">{d.points}</span>
                          </motion.div>
                        );
                      })
                    : (constructors || []).map((c) => {
                        const isFollowed = isFollowedConstructor(c.teamName);
                        return (
                          <motion.div
                            key={c.teamId}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ root: scrollRef, once: true, margin: "0px 0px -10% 0px" }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className={`grid grid-cols-[20px_26px_1fr_36px] items-center gap-2 px-2 py-1.5 rounded-xl transition-colors hover:bg-primary/10 ${
                              isFollowed ? "bg-primary/10 text-primary font-extrabold" : "text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            <span>{c.rank}</span>
                            <span className="flex items-center justify-center">
                              {c.teamLogo ? (
                                <img src={c.teamLogo} alt="" className="w-5 h-5 object-contain shrink-0" />
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 block shrink-0" />
                              )}
                            </span>
                            <span className="flex items-center gap-1.5 truncate min-w-0">
                              {isFollowed && <Star className="w-3 h-3 text-primary fill-primary shrink-0" />}
                              <span className="truncate">{c.teamName}</span>
                            </span>
                            <span className="text-center font-extrabold">{c.points}</span>
                          </motion.div>
                        );
                      })}
                  {(page === "drivers" ? !drivers?.length : !constructors?.length) && (
                    <p className="text-xs text-zinc-500 py-4 text-center">No disponible.</p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 1/4: próxima carrera */}
          <div className="shrink-0 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-2.5 flex items-center gap-3">
            {nextRaceImage && <img src={nextRaceImage} alt="" className="w-10 h-10 object-contain rounded-lg shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase text-zinc-400 tracking-wide">Próxima carrera</p>
              {nextRace ? (
                <>
                  <p className="text-[11px] font-extrabold text-zinc-900 dark:text-zinc-100 truncate">{nextRace.raceName}</p>
                  {nextRaceDate && !isNaN(nextRaceDate.getTime()) && (
                    <p className="text-[10px] text-zinc-500">
                      {nextRaceDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-zinc-500">No disponible.</p>
              )}
            </div>
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
        <div ref={scrollRef} className="h-[350px] overflow-y-auto pr-1 text-[11px]">
          <div className="grid grid-cols-[20px_1fr_44px_36px] gap-2 px-2 text-zinc-400 uppercase text-[9px] font-bold pb-1">
            <span>#</span>
            <span>Equipo</span>
            <span className="text-center">G-P</span>
            <span className="text-center">Pts</span>
          </div>
          <div className="space-y-0.5">
            {entries.map((e) => {
              const isFollowed = followedTeamNames.has(e.teamName);
              return (
                <motion.div
                  key={e.teamId}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ root: scrollRef, once: true, margin: "0px 0px -10% 0px" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`grid grid-cols-[20px_1fr_44px_36px] items-center gap-2 px-2 py-1.5 rounded-xl transition-colors hover:bg-primary/10 ${
                    isFollowed ? "bg-primary/10 text-primary font-extrabold" : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span>{e.rank}</span>
                  <span className="flex items-center gap-1.5 truncate min-w-0">
                    {e.teamLogo && <img src={e.teamLogo} alt="" className="w-4 h-4 object-contain shrink-0" />}
                    <span className="truncate">{e.teamName}</span>
                  </span>
                  <span className="text-center">{e.won}-{e.lost}</span>
                  <span className="text-center font-extrabold">{e.points}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
