import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
} from "lucide-react";
import { SubNav } from "./SubNav";
import { useToast } from "../context/ToastContext";
import { SPORTS_CATALOG } from "../lib/sportsCatalog";
import {
  getSanJuanEvents,
  fetchEventPreferences,
  saveEventPreferences,
  fetchTeamsForSport,
  fetchFollowedSportEvents,
} from "../lib/eventsService";
import type { EventPreferences, FollowedTeam, SanJuanEvent, SportEvent } from "../types";

interface EventsViewProps {
  userId: string;
  darkMode?: boolean;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

const MESES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

/** Best-effort: turns "15 de marzo" or "15/03" into an ISO date in the current/next occurrence. */
function guessIsoDate(raw?: string): string | null {
  if (!raw) return null;
  const now = new Date();
  const dOfMonth = raw.match(/^(\d{1,2})\s+de\s+(\w+)/i);
  if (dOfMonth) {
    const day = parseInt(dOfMonth[1], 10);
    const month = MESES[dOfMonth[2].toLowerCase()];
    if (month === undefined) return null;
    let year = now.getFullYear();
    // If that date already passed this year by more than a couple months, assume next year.
    const candidate = new Date(year, month, day);
    if (candidate.getTime() < now.getTime() - 60 * 24 * 60 * 60 * 1000) year++;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
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

export function EventsView({ userId, darkMode = false, activeSubTab: propActiveSubTab, onSubTabChange }: EventsViewProps) {
  const { showToast } = useToast();

  const [localTab, setLocalTab] = useState<"sanjuan" | "deportes" | "calendario">("sanjuan");
  const activeTab = (propActiveSubTab as typeof localTab) || localTab;
  const setActiveTab = (tab: typeof localTab) => {
    if (onSubTabChange) onSubTabChange(tab);
    setLocalTab(tab);
  };
  useEffect(() => {
    if (propActiveSubTab) setLocalTab(propActiveSubTab as typeof localTab);
  }, [propActiveSubTab]);

  // --- San Juan ---
  const [sjEvents, setSjEvents] = useState<SanJuanEvent[]>([]);
  const [sjLoading, setSjLoading] = useState(true);
  useEffect(() => {
    setSjLoading(true);
    getSanJuanEvents()
      .then(setSjEvents)
      .finally(() => setSjLoading(false));
  }, []);

  // --- Preferences + followed sports ---
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

  const toggleSport = async (sportId: string) => {
    if (!prefs) return;
    const following = prefs.followedSports.includes(sportId);
    const next: EventPreferences = {
      ...prefs,
      followedSports: following
        ? prefs.followedSports.filter((s) => s !== sportId)
        : [...prefs.followedSports, sportId],
      updatedAt: Date.now(),
    };
    await persistPrefs(next);
    showToast(following ? "Dejaste de seguir este deporte." : "Ahora seguís este deporte.", "success");
  };

  const [teamsBySport, setTeamsBySport] = useState<Record<string, { id: string; name: string; badgeUrl?: string }[]>>({});
  const [loadingTeamsFor, setLoadingTeamsFor] = useState<string | null>(null);
  const [expandedSport, setExpandedSport] = useState<string | null>(null);

  const loadTeamsIfNeeded = async (sportId: string) => {
    if (teamsBySport[sportId]) return;
    setLoadingTeamsFor(sportId);
    const teams = await fetchTeamsForSport(sportId);
    setTeamsBySport((prev) => ({ ...prev, [sportId]: teams }));
    setLoadingTeamsFor(null);
  };

  const toggleTeam = async (sportId: string, team: FollowedTeam) => {
    if (!prefs) return;
    const current = prefs.followedTeams[sportId] || [];
    const already = current.some((t) => t.id === team.id);
    const nextTeams = already ? current.filter((t) => t.id !== team.id) : [...current, team];
    await persistPrefs({
      ...prefs,
      followedTeams: { ...prefs.followedTeams, [sportId]: nextTeams },
      updatedAt: Date.now(),
    });
  };

  // --- Sport events for followed sports/teams ---
  const [sportEvents, setSportEvents] = useState<SportEvent[]>([]);
  const [sportEventsLoading, setSportEventsLoading] = useState(false);
  useEffect(() => {
    if (!prefsLoaded || !prefs) return;
    setSportEventsLoading(true);
    fetchFollowedSportEvents(prefs)
      .then(setSportEvents)
      .finally(() => setSportEventsLoading(false));
  }, [prefsLoaded, prefs?.followedSports.join(","), JSON.stringify(prefs?.followedTeams || {})]);

  // --- Calendar: San Juan (with a parseable date) + sport events, merged by ISO date ---
  const eventsByDate = useMemo(() => {
    const map: Record<string, { label: string; kind: "sanjuan" | "sport" }[]> = {};
    sjEvents.forEach((ev) => {
      const iso = guessIsoDate(ev.rawDate || ev.date);
      if (!iso) return;
      (map[iso] = map[iso] || []).push({ label: ev.title, kind: "sanjuan" });
    });
    sportEvents.forEach((ev) => {
      if (!ev.date) return;
      (map[ev.date] = map[ev.date] || []).push({ label: ev.title, kind: "sport" });
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
    for (let d = 1; d <= totalDays; d++) {
      cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    return cells;
  }, [calMonth]);

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6">
      {!propActiveSubTab && (
        <SubNav
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as typeof localTab)}
          className="mb-6"
          tabs={[
            { id: "sanjuan", label: "San Juan", icon: MapPin },
            { id: "deportes", label: "Deportes", icon: Trophy },
            { id: "calendario", label: "Calendario de Eventos", icon: CalendarIcon },
          ]}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === "sanjuan" && (
            <div className={CARD(darkMode)}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">Qué hacer en San Juan</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Agenda de eventos del mes, traída automáticamente una vez por mes.
                    </p>
                  </div>
                </div>
              </div>

              {sjLoading ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500 py-10 justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Cargando agenda...
                </div>
              ) : sjEvents.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-10">
                  No se encontraron eventos este mes (o no se pudo leer la fuente).
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sjEvents.map((ev) => (
                    <a
                      key={ev.id}
                      href={ev.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden hover:shadow-md transition-all flex flex-col"
                    >
                      {ev.imageUrl && (
                        <img src={ev.imageUrl} alt={ev.title} className="w-full h-32 object-cover" />
                      )}
                      <div className="p-3 space-y-1 flex-1">
                        <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2">{ev.title}</p>
                        {ev.rawDate && (
                          <p className="text-xs text-primary font-bold">{ev.rawDate}</p>
                        )}
                        <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Ver más
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "deportes" && (
            <div className={CARD(darkMode)}>
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">Deportes</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Elegí qué deportes (y qué equipos/pilotos) te interesan. Los calendarios se traen automáticamente.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPORTS_CATALOG.map((sport) => {
                  const following = !!prefs?.followedSports.includes(sport.id);
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={async () => {
                        await toggleSport(sport.id);
                        if (sport.hasTeams) {
                          setExpandedSport((prev) => (prev === sport.id ? null : sport.id));
                          loadTeamsIfNeeded(sport.id);
                        }
                      }}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        following
                          ? "bg-primary text-white border-primary"
                          : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-primary/40"
                      }`}
                    >
                      {following && <Check className="w-3.5 h-3.5" />}
                      {sport.label}
                    </button>
                  );
                })}
              </div>

              {(prefs?.followedSports || [])
                .filter((id) => SPORTS_CATALOG.find((s) => s.id === id)?.hasTeams)
                .map((sportId) => {
                  const sport = SPORTS_CATALOG.find((s) => s.id === sportId)!;
                  const teams = teamsBySport[sportId] || [];
                  const followedTeams = prefs?.followedTeams[sportId] || [];
                  return (
                    <div key={sportId} className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedSport((prev) => (prev === sportId ? null : sportId));
                          loadTeamsIfNeeded(sportId);
                        }}
                        className="w-full flex items-center justify-between text-xs font-extrabold cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary" /> Equipos/pilotos de {sport.label}
                          {followedTeams.length > 0 && (
                            <span className="text-[10px] font-bold text-zinc-400">({followedTeams.length} seguidos)</span>
                          )}
                        </span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${expandedSport === sportId ? "rotate-90" : ""}`} />
                      </button>
                      {expandedSport === sportId && (
                        loadingTeamsFor === sportId ? (
                          <div className="flex items-center gap-2 text-xs text-zinc-500 py-3">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Buscando equipos...
                          </div>
                        ) : teams.length === 0 ? (
                          <p className="text-xs text-zinc-500 py-3">No se encontraron equipos para {sport.label}.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                            {teams.map((team) => {
                              const isFollowed = followedTeams.some((t) => t.id === team.id);
                              return (
                                <button
                                  key={team.id}
                                  type="button"
                                  onClick={() => toggleTeam(sportId, team)}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] font-bold text-left cursor-pointer ${
                                    isFollowed
                                      ? "bg-primary/10 border-primary text-primary"
                                      : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
                                  }`}
                                >
                                  {team.badgeUrl && <img src={team.badgeUrl} alt="" className="w-5 h-5 object-contain shrink-0" />}
                                  <span className="truncate">{team.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Próximos eventos seguidos</p>
                {sportEventsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 py-4">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando calendarios...
                  </div>
                ) : sportEvents.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4">
                    {prefs?.followedSports.length ? "No hay próximos eventos por ahora." : "Elegí al menos un deporte arriba."}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {sportEvents
                      .slice()
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .slice(0, 30)
                      .map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800"
                        >
                          <div className="flex items-center -space-x-2 shrink-0">
                            {ev.homeTeamBadge && <img src={ev.homeTeamBadge} alt="" className="w-6 h-6 rounded-full bg-white object-contain border border-white" />}
                            {ev.awayTeamBadge && <img src={ev.awayTeamBadge} alt="" className="w-6 h-6 rounded-full bg-white object-contain border border-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">{ev.title}</p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              {ev.leagueName} · {ev.date}{ev.time ? ` ${ev.time}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "calendario" && (
            <div className={CARD(darkMode)}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">Calendario de Eventos</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">San Juan + los deportes que seguís, en un solo calendario.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setCalMonth(new Date()); setSelectedDay(new Date().toISOString().slice(0, 10)); }}
                  className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold cursor-pointer"
                >
                  Ir a Hoy
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                      className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-extrabold capitalize">
                      {calMonth.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                      className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
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
                          className={`aspect-square rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-primary text-white"
                              : isToday
                              ? "border border-primary text-primary"
                              : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {dayNum}
                          {hasEvents && <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                    {new Date(selectedDay + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  {(eventsByDate[selectedDay] || []).length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">Sin eventos este día.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(eventsByDate[selectedDay] || []).map((ev, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
                        >
                          {ev.kind === "sanjuan" ? <MapPin className="w-3.5 h-3.5 text-primary shrink-0" /> : <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />}
                          <span className="truncate">{ev.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
