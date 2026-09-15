import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  MapPin,
  ExternalLink,
  RefreshCw,
  Trophy,
  Check,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  User as UserIcon,
  ArrowLeft,
  Settings,
  X,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { NbaLogo } from "./icons/NbaLogo";
import { SPORTS_CATALOG } from "../lib/sportsCatalog";
import {
  getSanJuanEvents,
  fetchEventPreferences,
  saveEventPreferences,
  fetchFollowedSportEvents,
  FOOTBALL_LEAGUES,
  getFootballClubs,
  F1_TEAMS,
  F1_DRIVERS,
  fetchF1TeamLogo,
  fetchF1DriverPhoto,
  NBA_TEAMS,
  fetchWikiThumbnail,
} from "../lib/eventsService";
import type { EventPreferences, FollowedTeam, SanJuanEvent, SportEvent } from "../types";

interface EventsViewProps {
  userId: string;
  darkMode?: boolean;
}

const MESES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

/** Best-effort: turns "15 de marzo" or "15/03" into an ISO date in the current/next occurrence. */
function guessIsoDate(raw?: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10); // already ISO
  const now = new Date();
  const dOfMonth = raw.match(/(\d{1,2})\s+de\s+(\w+)/i);
  if (dOfMonth) {
    const day = parseInt(dOfMonth[1], 10);
    const month = MESES[dOfMonth[2].toLowerCase()];
    if (month === undefined) return null;
    let year = now.getFullYear();
    const candidate = new Date(year, month, day);
    if (candidate.getTime() < now.getTime() - 60 * 24 * 60 * 60 * 1000) year++;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const slash = raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slash) {
    const day = parseInt(slash[1], 10);
    const month = parseInt(slash[2], 10) - 1;
    const year = slash[3] ? (slash[3].length === 2 ? 2000 + parseInt(slash[3], 10) : parseInt(slash[3], 10)) : now.getFullYear();
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

const CARD = (darkMode: boolean) =>
  `rounded-3xl border p-4 sm:p-6 space-y-5 ${darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white/80 border-slate-200"}`;
const SUBCARD = "rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-4";
const PICK_BTN = (active: boolean) =>
  `flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold text-left cursor-pointer transition-all ${
    active
      ? "bg-primary/10 border-primary text-primary"
      : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
  }`;

/**
 * Everything about "Eventos" (San Juan's monthly agenda, the sports calendars the user
 * follows, and a merged month calendar) lives on ONE unified page — no further sub-tabs —
 * reached as the "Eventos" entry inside Notas' own submenu.
 */
export function EventsView({ userId, darkMode = false }: EventsViewProps) {
  const { showToast } = useToast();

  // --- San Juan ---
  const [sjEvents, setSjEvents] = useState<SanJuanEvent[]>([]);
  const [sjLoading, setSjLoading] = useState(true);
  useEffect(() => {
    setSjLoading(true);
    getSanJuanEvents().then(setSjEvents).finally(() => setSjLoading(false));
  }, []);

  // "Qué hacer en San Juan": paginado de a 6, mismo patrón (Anterior/Siguiente) que el resto
  // de las tablas de la app (ver PaymentsTable, etc.) en vez de un "Ver más" que va acumulando.
  const [sjPage, setSjPage] = useState(1);
  const SJ_PAGE_SIZE = 6;
  useEffect(() => { setSjPage(1); }, [sjEvents]);
  const sjTotalPages = Math.max(1, Math.ceil(sjEvents.length / SJ_PAGE_SIZE));
  const sjPageEvents = useMemo(() => {
    const start = (sjPage - 1) * SJ_PAGE_SIZE;
    return sjEvents.slice(start, start + SJ_PAGE_SIZE);
  }, [sjEvents, sjPage]);

  // --- Preferences ---
  const [prefs, setPrefs] = useState<EventPreferences | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  useEffect(() => {
    if (!userId) return;
    fetchEventPreferences(userId).then((p) => {
      setPrefs(p || { followedSports: [], followedTeams: {}, updatedAt: Date.now() });
      setPrefsLoaded(true);
    });
  }, [userId]);

  const persistPrefs = async (next: EventPreferences) => {
    setPrefs(next);
    await saveEventPreferences(userId, next);
  };

  // "Deportes que seguís" now lives in a Guardar/Cancelar modal instead of writing to
  // Firestore on every click — all edits happen on this local draft, committed only on Guardar.
  const [sportsModalOpen, setSportsModalOpen] = useState(false);
  const [draftPrefs, setDraftPrefs] = useState<EventPreferences | null>(null);
  useLockBodyScroll(sportsModalOpen);

  const openSportsModal = () => {
    setDraftPrefs(prefs || { followedSports: [], followedTeams: {}, updatedAt: Date.now() });
    setExpandedSport(null);
    setFootballLeague(null);
    setSportsModalOpen(true);
  };
  const cancelSportsModal = () => {
    setSportsModalOpen(false);
    setDraftPrefs(null);
    showToast("Cambios descartados.", "info");
  };
  const saveSportsModal = async () => {
    if (!draftPrefs) return;
    await persistPrefs({ ...draftPrefs, updatedAt: Date.now() });
    setSportsModalOpen(false);
    setDraftPrefs(null);
    showToast("Preferencias de deportes guardadas.", "success");
  };

  const toggleDraftSport = (sportId: string) => {
    if (!draftPrefs) return;
    const following = draftPrefs.followedSports.includes(sportId);
    setDraftPrefs({
      ...draftPrefs,
      followedSports: following ? draftPrefs.followedSports.filter((s) => s !== sportId) : [...draftPrefs.followedSports, sportId],
    });
  };

  // Multi-select follow (fútbol clubs, NBA teams).
  const toggleDraftTeam = (sportId: string, team: FollowedTeam) => {
    if (!draftPrefs) return;
    const current = draftPrefs.followedTeams[sportId] || [];
    const already = current.some((t) => t.id === team.id);
    const next = already ? current.filter((t) => t.id !== team.id) : [...current, team];
    setDraftPrefs({ ...draftPrefs, followedTeams: { ...draftPrefs.followedTeams, [sportId]: next } });
  };

  // Single-select follow, one "team" + one "driver" (F1).
  const pickDraftSingle = (sportId: string, kind: "team" | "driver", entry: FollowedTeam) => {
    if (!draftPrefs) return;
    const current = draftPrefs.followedTeams[sportId] || [];
    const alreadyPicked = current.find((t) => t.kind === kind)?.id === entry.id;
    const others = current.filter((t) => t.kind !== kind);
    const next = alreadyPicked ? others : [...others, entry];
    setDraftPrefs({ ...draftPrefs, followedTeams: { ...draftPrefs.followedTeams, [sportId]: next } });
  };

  const [expandedSport, setExpandedSport] = useState<string | null>(null);
  const onToggleExpand = (sportId: string) => setExpandedSport((prev) => (prev === sportId ? null : sportId));

  // Sport header icons, forced to solid black/white so any source coloring becomes a clean
  // black-in-light, white-in-dark icon. F1 (Wikimedia's official F1.svg thumbnail — a
  // transparent PNG, so the brightness/invert trick applies) and FIFA (Wikipedia) are fixed
  // image URLs; NBA is the official logoman given as raw SVG, rendered as its own component
  // (see icons/NbaLogo.tsx) so it can be themed directly instead of filtering a raster image.
  const SPORT_LOGO_FIXED_URL: Record<string, string> = {
    f1: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/120px-F1.svg.png",
  };
  const SPORT_LOGO_WIKI_TITLE: Record<string, string> = {
    futbol: "FIFA",
  };
  const [sportLogos, setSportLogos] = useState<Record<string, string | null>>(SPORT_LOGO_FIXED_URL);
  useEffect(() => {
    Object.entries(SPORT_LOGO_WIKI_TITLE).forEach(([sportId, title]) => {
      if (sportId in sportLogos) return;
      fetchWikiThumbnail(title).then((url) => setSportLogos((prev) => ({ ...prev, [sportId]: url })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // F1 driver photos: sourced from formula1.com first, Wikipedia as fallback. Team logos are a
  // fixed known-good URL per team (see data/f1.ts) — no fetch/state needed for those.
  const [f1Images, setF1Images] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (expandedSport !== "f1") return;
    F1_DRIVERS.forEach((d) => {
      if (d.name in f1Images) return;
      fetchF1DriverPhoto(d.name).then((url) => setF1Images((prev) => ({ ...prev, [d.name]: url })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedSport]);

  // Fútbol: leagues first, drill into one league's clubs.
  const [footballLeague, setFootballLeague] = useState<string | null>(null);

  // --- Sport events for followed sports/teams/drivers ---
  const [sportEvents, setSportEvents] = useState<SportEvent[]>([]);
  const [sportEventsLoading, setSportEventsLoading] = useState(false);
  // "Eventos deportivos" se muestra de a 5, con un botón "Ver más" para ir sumando de a 5.
  const [visibleSportEventsCount, setVisibleSportEventsCount] = useState(5);
  useEffect(() => {
    if (!prefsLoaded || !prefs) return;
    setSportEventsLoading(true);
    setVisibleSportEventsCount(5);
    fetchFollowedSportEvents(prefs).then(setSportEvents).finally(() => setSportEventsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded, prefs?.followedSports.join(","), JSON.stringify(prefs?.followedTeams || {})]);

  // --- Calendar: San Juan + followed sport events, merged by ISO date ---
  const eventsByDate = useMemo(() => {
    const map: Record<
      string,
      { label: string; kind: "sanjuan" | "sport"; sportId?: string; homeTeamBadge?: string; awayTeamBadge?: string }[]
    > = {};
    sjEvents.forEach((ev) => {
      const iso = guessIsoDate(ev.rawDate || ev.date);
      if (iso) (map[iso] = map[iso] || []).push({ label: ev.title, kind: "sanjuan" });
    });
    sportEvents.forEach((ev) => {
      if (ev.date) {
        (map[ev.date] = map[ev.date] || []).push({
          label: ev.title,
          kind: "sport",
          sportId: ev.sportId,
          homeTeamBadge: ev.homeTeamBadge,
          awayTeamBadge: ev.awayTeamBadge,
        });
      }
    });
    return map;
  }, [sjEvents, sportEvents]);

  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));

  const monthGrid = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    return cells;
  }, [calMonth]);

  const draftFollowedF1Team = draftPrefs?.followedTeams["f1"]?.find((t) => t.kind === "team");
  const draftFollowedF1Driver = draftPrefs?.followedTeams["f1"]?.find((t) => t.kind === "driver");

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6">
    <div className={CARD(darkMode)}>
      <div className="flex items-center gap-3">
        <MapPin className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">Eventos</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Qué hacer en San Juan, los deportes que seguís, y todo junto en un calendario.
          </p>
        </div>
      </div>

      {/* Calendario (izquierda, mismo ancho que el resto de calendarios de la app) + Deportes (derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`${SUBCARD} lg:col-span-5 flex flex-col`}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" /> Calendario de Eventos
            </h3>
            <button
              type="button"
              onClick={() => { setCalMonth(new Date()); setSelectedDay(new Date().toISOString().slice(0, 10)); }}
              className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold cursor-pointer"
            >
              Ir a Hoy
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold capitalize">{calMonth.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</span>
            <button type="button" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-400 mb-1">
            {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((iso, i) => {
              if (!iso) return <div key={i} />;
              const dayNum = parseInt(iso.slice(-2), 10);
              const hasEvents = (eventsByDate[iso] || []).length > 0;
              const isSelected = iso === selectedDay;
              const isToday = iso === new Date().toISOString().slice(0, 10);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDay(iso)}
                  className={`h-9 w-full rounded-full text-xs font-bold flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                    isSelected ? "border-2 border-primary text-primary bg-primary/10" : isToday ? "bg-primary text-white shadow-md" : "hover:bg-primary/10 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span>{dayNum}</span>
                  {hasEvents && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/80">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
              {new Date(selectedDay + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {(eventsByDate[selectedDay] || []).length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Sin eventos este día.</p>
            ) : (
              <div className="space-y-1.5">
                {(eventsByDate[selectedDay] || []).map((ev, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    {ev.kind === "sanjuan" ? (
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : ev.sportId === "f1" ? (
                      // La F1 no tiene escudos de equipo local/visitante (es una carrera) — solo el logo de F1.
                      sportLogos.f1 ? (
                        <img src={sportLogos.f1} alt="" className="w-4 h-4 object-contain shrink-0 brightness-0 dark:invert" />
                      ) : (
                        <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                      )
                    ) : ev.sportId === "nba" ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <NbaLogo className="h-3.5 w-auto max-w-[24px] shrink-0 text-black dark:text-white" />
                        {ev.homeTeamBadge && <img src={ev.homeTeamBadge} alt="" className="w-4 h-4 rounded-full bg-white object-contain border border-white shrink-0" />}
                        {ev.awayTeamBadge && <img src={ev.awayTeamBadge} alt="" className="w-4 h-4 rounded-full bg-white object-contain border border-white shrink-0" />}
                      </div>
                    ) : ev.sportId === "futbol" ? (
                      <div className="flex items-center gap-1 shrink-0">
                        {sportLogos.futbol && <img src={sportLogos.futbol} alt="" className="w-3.5 h-3.5 object-contain shrink-0 brightness-0 dark:invert" />}
                        {ev.homeTeamBadge && <img src={ev.homeTeamBadge} alt="" className="w-4 h-4 rounded-full bg-white object-contain border border-white shrink-0" />}
                        {ev.awayTeamBadge && <img src={ev.awayTeamBadge} alt="" className="w-4 h-4 rounded-full bg-white object-contain border border-white shrink-0" />}
                      </div>
                    ) : (
                      <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                    <span className="truncate">{ev.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Deportes */}
        <div className={`${SUBCARD} lg:col-span-7`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Eventos deportivos</p>
            <button
              type="button"
              onClick={openSportsModal}
              className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer shrink-0"
              title="Configurar deportes que seguís"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          {sportEventsLoading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500 py-4">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando calendarios...
            </div>
          ) : sportEvents.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">
              {prefs?.followedSports.length ? "No hay próximos eventos por ahora." : "Elegí al menos un deporte desde el botón de configuración."}
            </p>
          ) : (
            (() => {
              const sorted = sportEvents.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(0, 30);
              const visible = sorted.slice(0, visibleSportEventsCount);
              return (
                <div className="space-y-1.5">
                  {visible.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                      <div className="flex items-center -space-x-2 shrink-0">
                        {ev.sportId === "f1" && sportLogos.f1 ? (
                          <img src={sportLogos.f1} alt="" className="w-6 h-6 object-contain brightness-0 dark:invert" />
                        ) : (
                          <>
                            {ev.homeTeamBadge && <img src={ev.homeTeamBadge} alt="" className="w-6 h-6 rounded-full bg-white object-contain border border-white" />}
                            {ev.awayTeamBadge && <img src={ev.awayTeamBadge} alt="" className="w-6 h-6 rounded-full bg-white object-contain border border-white" />}
                          </>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">{ev.title}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{ev.leagueName} · {ev.date}{ev.time ? ` ${ev.time}` : ""}</p>
                      </div>
                    </div>
                  ))}
                  {visibleSportEventsCount < sorted.length && (
                    <button
                      type="button"
                      onClick={() => setVisibleSportEventsCount((c) => c + 5)}
                      className="w-full py-2 rounded-xl text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
                    >
                      Ver más
                    </button>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Modal "Deportes que seguís": todos los cambios quedan en un draft local y solo se
          guardan al apretar "Guardar" (o se descartan con "Cancelar"), cada uno con su propio
          cartel de notificación. */}
      {sportsModalOpen && draftPrefs && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelSportsModal} />
          <div className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border p-4 sm:p-6 space-y-4 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> Deportes que seguís
              </h3>
              <button type="button" onClick={cancelSportsModal} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {SPORTS_CATALOG.map((sport) => {
                const following = draftPrefs.followedSports.includes(sport.id);
                return (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => {
                      toggleDraftSport(sport.id);
                      onToggleExpand(sport.id);
                      if (sport.id === "futbol") setFootballLeague(null);
                    }}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      following ? "bg-primary text-white border-primary" : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-primary/40"
                    }`}
                  >
                    {following && <Check className="w-3.5 h-3.5" />}
                    {sport.label}
                  </button>
                );
              })}
            </div>

            {draftPrefs.followedSports.map((sportId) => {
              const sport = SPORTS_CATALOG.find((s) => s.id === sportId);
              if (!sport) return null;
              const isOpen = expandedSport === sportId;

              return (
                <div key={sportId} className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-3 space-y-3">
                  <button type="button" onClick={() => onToggleExpand(sportId)} className="w-full flex items-center justify-between text-xs font-extrabold cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      {sportId === "nba" ? (
                        <NbaLogo className="h-4 w-auto max-w-[34px] shrink-0 text-black dark:text-white" />
                      ) : sportLogos[sportId] ? (
                        <img
                          src={sportLogos[sportId]!}
                          alt=""
                          // These marks are far from square (F1's is a wide wordmark) — a fixed
                          // square box squashed it into an unrecognizable sliver. Fix the
                          // height, let width follow the logo's own aspect ratio instead.
                          className="h-4 w-auto max-w-[34px] object-contain shrink-0 brightness-0 dark:invert"
                          onError={() => setSportLogos((prev) => ({ ...prev, [sportId]: null }))}
                        />
                      ) : (
                        <Users className="w-3.5 h-3.5 text-primary" />
                      )}
                      {sport.label}
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>

                  {isOpen && sportId === "f1" && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Escudería</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
                          {F1_TEAMS.map((t) => {
                            const logo = fetchF1TeamLogo(t.id);
                            return (
                            <button key={t.id} type="button" onClick={() => pickDraftSingle("f1", "team", { id: t.id, name: t.name, badgeUrl: logo || undefined, kind: "team" })} className={PICK_BTN(draftFollowedF1Team?.id === t.id)}>
                              {logo ? (
                                <img
                                  src={logo}
                                  alt=""
                                  // The source asset is a solid-white mark (readable on F1.com's
                                  // dark cards) — invert it to black in light mode so it doesn't
                                  // vanish against a light background; cancel that in dark mode.
                                  className="w-6 h-6 object-contain shrink-0 invert dark:invert-0"
                                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                              ) : (
                                <Trophy className="w-4 h-4 shrink-0" />
                              )}
                              <span className="truncate">{t.name}</span>
                            </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Piloto</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
                          {F1_DRIVERS.map((d) => (
                            <button key={d.id} type="button" onClick={() => pickDraftSingle("f1", "driver", { id: d.id, name: d.name, badgeUrl: f1Images[d.name] || undefined, kind: "driver" })} className={PICK_BTN(draftFollowedF1Driver?.id === d.id)}>
                              {f1Images[d.name] ? (
                                <img
                                  src={f1Images[d.name]!}
                                  alt=""
                                  className="w-6 h-6 object-contain shrink-0"
                                  onError={() => setF1Images((prev) => ({ ...prev, [d.name]: null }))}
                                />
                              ) : (
                                <UserIcon className="w-4 h-4 shrink-0" />
                              )}
                              <span className="truncate">{d.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {isOpen && sportId === "futbol" && (
                    <div className="space-y-2">
                      {!footballLeague ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {FOOTBALL_LEAGUES.map((l) => (
                            <button key={l.id} type="button" onClick={() => setFootballLeague(l.id)} className={PICK_BTN(false)}>
                              <Trophy className="w-4 h-4 shrink-0" />
                              <span className="truncate">{l.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button type="button" onClick={() => setFootballLeague(null)} className="flex items-center gap-1 text-[10px] font-bold text-primary cursor-pointer">
                            <ArrowLeft className="w-3 h-3" /> Volver a ligas
                          </button>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
                            {getFootballClubs(footballLeague).map((club) => {
                              const followed = (draftPrefs.followedTeams["futbol"] || []).some((t) => t.id === club.id);
                              return (
                                <button key={club.id} type="button" onClick={() => toggleDraftTeam("futbol", { id: club.id, name: club.name, badgeUrl: club.logo })} className={PICK_BTN(followed)}>
                                  <img src={club.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                                  <span className="truncate">{club.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isOpen && sportId === "nba" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                      {NBA_TEAMS.map((team) => (
                        <button key={team.id} type="button" onClick={() => toggleDraftTeam("nba", { id: team.id, name: team.name, badgeUrl: team.logo })} className={PICK_BTN((draftPrefs.followedTeams["nba"] || []).some((t) => t.id === team.id))}>
                          <img
                            src={team.logo}
                            alt=""
                            className="w-5 h-5 object-contain shrink-0"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                          <span className="truncate">{team.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
              <button type="button" onClick={cancelSportsModal} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={saveSportsModal} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-all cursor-pointer">
                Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* San Juan */}
      <div className={SUBCARD}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Qué hacer en San Juan
          </h3>
          <span className="text-[10px] text-zinc-400 font-bold">Se actualiza sola una vez por mes</span>
        </div>

        {sjLoading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500 py-8 justify-center">
            <RefreshCw className="w-4 h-4 animate-spin" /> Cargando agenda...
          </div>
        ) : sjEvents.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-8">
            No se encontraron eventos este mes (o no se pudo leer la fuente).
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sjPageEvents.map((ev) => (
                <a key={ev.id} href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 overflow-hidden hover:shadow-md transition-all flex flex-col">
                  {ev.imageUrl && (
                    <img
                      src={ev.imageUrl}
                      alt={ev.title}
                      className="w-full h-32 object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <div className="p-3 space-y-1 flex-1">
                    <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2">{ev.title}</p>
                    {ev.location && <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{ev.location}</p>}
                    {ev.rawDate && <p className="text-xs text-primary font-bold">{ev.rawDate}</p>}
                    <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Ver más
                    </p>
                  </div>
                </a>
              ))}
            </div>

            {sjTotalPages > 1 && (
              <div className="pt-4 mt-1 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                <span>
                  Mostrando {sjPageEvents.length} de {sjEvents.length} eventos (Página {sjPage} de {sjTotalPages})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={sjPage === 1}
                    onClick={() => setSjPage((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={sjPage === sjTotalPages}
                    onClick={() => setSjPage((prev) => Math.min(sjTotalPages, prev + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </div>
  );
}
