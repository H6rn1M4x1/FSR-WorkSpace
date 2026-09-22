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

/** Una tarjeta del slider de pilotos/escuderías — misma pinta para ambas, pasando de a una. */
function F1SliderCard({
  label,
  imageUrl,
  name,
  rank,
  points,
  isFollowed,
  pageKey,
  total,
  page,
}: {
  label: string;
  imageUrl?: string | null;
  name: string;
  rank: number;
  points: number;
  isFollowed: boolean;
  pageKey: string;
  total: number;
  page: number;
}) {
  return (
    <div className="flex flex-col min-w-0 min-h-0">
      <p className="text-[9px] font-bold uppercase text-zinc-400 mb-1 px-1">{label}</p>
      <div className="flex-1 min-h-0 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={pageKey}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3 }}
            className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-1 p-2"
          >
            {isFollowed && <Star className="w-3 h-3 text-primary fill-primary" />}
            {imageUrl && <img src={imageUrl} alt="" className="w-10 h-10 object-contain rounded-full" />}
            <p className={`text-[11px] font-extrabold truncate max-w-full ${isFollowed ? "text-primary" : "text-zinc-900 dark:text-zinc-100"}`}>
              {name}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">
              #{rank} · {points} pts
            </p>
          </motion.div>
        </AnimatePresence>
        {total > 1 && (
          <div className="flex items-center justify-center gap-1 pb-2 flex-wrap px-2">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === page ? "w-4 bg-primary" : "w-1.5 bg-zinc-300 dark:bg-zinc-700"}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * De arriba abajo: 3/4 del espacio con dos tablas en slider lado a lado (pilotos y
 * constructores, cada una pasando de a un piloto/escudería), 1/4 restante con la próxima
 * carrera. Resalta con acento + estrella el piloto/escudería que seguís, mismo criterio que las
 * tablas de fútbol/NBA.
 */
export function F1StandingsPanel({ darkMode, driverName, teamName }: { darkMode: boolean; driverName?: string; teamName?: string }) {
  const [drivers, setDrivers] = useState<F1DriverStanding[] | null>(null);
  const [constructors, setConstructors] = useState<F1ConstructorStanding[] | null>(null);
  const [nextRace, setNextRace] = useState<F1NextRace | null>(null);
  const [nextRaceImage, setNextRaceImage] = useState<string | null>(null);
  const [driverPhotos, setDriverPhotos] = useState<Record<string, string | null>>({});
  const [driverPage, setDriverPage] = useState(0);
  const [constructorPage, setConstructorPage] = useState(0);
  const [loading, setLoading] = useState(true);

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
    if (!drivers || drivers.length <= 1) return;
    const id = setInterval(() => setDriverPage((p) => (p + 1) % drivers.length), 5000);
    return () => clearInterval(id);
  }, [drivers]);

  useEffect(() => {
    if (!constructors || constructors.length <= 1) return;
    const id = setInterval(() => setConstructorPage((p) => (p + 1) % constructors.length), 6000);
    return () => clearInterval(id);
  }, [constructors]);

  const currentDriver = drivers?.[driverPage % Math.max(drivers.length, 1)];
  const currentConstructor = constructors?.[constructorPage % Math.max(constructors.length, 1)];

  useEffect(() => {
    if (!currentDriver || currentDriver.driverName in driverPhotos) return;
    fetchF1DriverPhoto(currentDriver.driverName).then((url) => setDriverPhotos((prev) => ({ ...prev, [currentDriver.driverName]: url })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDriver]);

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
          {/* 3/4: pilotos y constructores, cada uno en su propio slider */}
          <div className="grid grid-cols-2 gap-3 h-[260px]">
            {!drivers?.length ? (
              <div className="flex flex-col min-h-0">
                <p className="text-[9px] font-bold uppercase text-zinc-400 mb-1 px-1">Pilotos</p>
                <p className="text-xs text-zinc-500 text-center py-6 m-auto">No disponible.</p>
              </div>
            ) : (
              currentDriver && (
                <F1SliderCard
                  label="Pilotos"
                  imageUrl={driverPhotos[currentDriver.driverName]}
                  name={currentDriver.driverName}
                  rank={currentDriver.rank}
                  points={currentDriver.points}
                  isFollowed={isFollowedDriver(currentDriver.driverName)}
                  pageKey={currentDriver.driverId}
                  total={drivers.length}
                  page={driverPage}
                />
              )
            )}

            {!constructors?.length ? (
              <div className="flex flex-col min-h-0">
                <p className="text-[9px] font-bold uppercase text-zinc-400 mb-1 px-1">Escuderías</p>
                <p className="text-xs text-zinc-500 text-center py-6 m-auto">No disponible.</p>
              </div>
            ) : (
              currentConstructor && (
                <F1SliderCard
                  label="Escuderías"
                  imageUrl={currentConstructor.teamLogo}
                  name={currentConstructor.teamName}
                  rank={currentConstructor.rank}
                  points={currentConstructor.points}
                  isFollowed={isFollowedConstructor(currentConstructor.teamName)}
                  pageKey={currentConstructor.teamId}
                  total={constructors.length}
                  page={constructorPage}
                />
              )
            )}
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
