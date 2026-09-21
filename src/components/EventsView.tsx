import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
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
  Bell,
  BellOff,
  Clock,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { NbaLogo } from "./icons/NbaLogo";
import { PillFilterBar } from "./PillFilterBar";
import { SPORTS_CATALOG } from "../lib/sportsCatalog";
import { StorageService } from "../lib/storage";
import { saveItemToFirestore, deleteItemFromFirestore } from "../lib/firestoreSyncService";
import {
  getSanJuanEvents,
  fetchEventPreferences,
  saveEventPreferences,
  fetchFollowedSportEventsFromCache,
  FOOTBALL_LEAGUES,
  FOLLOWABLE_COMPETITIONS,
  getFootballClubs,
  F1_TEAMS,
  F1_DRIVERS,
  fetchF1TeamLogo,
  fetchF1DriverPhoto,
  NBA_TEAMS,
  fetchWikiThumbnail,
} from "../lib/eventsService";
import type { EventPreferences, FollowedTeam, SanJuanEvent, SportEvent, TurnoCompromiso } from "../types";

interface EventsViewProps {
  userId: string;
  darkMode?: boolean;
  turnosCompromisos: TurnoCompromiso[];
  setTurnosCompromisos: (updater: TurnoCompromiso[] | ((prev: TurnoCompromiso[]) => TurnoCompromiso[])) => void;
}

/** Id estable para el turno "Ocio" que agenda este evento de San Juan — así togglear la
 * campanita puede encontrar/quitar exactamente esa entrada sin duplicarla. */
const sanJuanTurnoId = (ev: SanJuanEvent) => `sanjuan-${ev.id}`;

/** Mismo patrón que sanJuanTurnoId, para la campanita de "Eventos deportivos". */
const sportTurnoId = (ev: SportEvent) => `sport-${ev.id}`;

interface DayEvent {
  label: string;
  kind: "sanjuan" | "sport";
  sportId?: string;
  homeTeamBadge?: string;
  awayTeamBadge?: string;
  location?: string;
  time?: string;
  categoryLabel: string;
}

type DayEventFilter = "Todos" | "San Juan" | "Deportes";

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

// Mismo estilo de tarjeta "de verdad" (opaca, con sombra) que usan Calendario Unificado /
// Agenda Central Integrada en Inicio — antes estas secciones vivían anidadas dentro de UN
// único contenedor traslúcido (bg-zinc-900/60), lo que las hacía perderse contra el fondo
// texturado de la app en vez de leerse como bloques separados.
const SECTION_CARD = (darkMode: boolean) =>
  `p-6 rounded-3xl border flex flex-col shadow-xs ${
    darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
  }`;
const INNER_BOX = (darkMode: boolean) =>
  `p-4 rounded-3xl ${darkMode ? "bg-zinc-950 shadow-sm" : "bg-white shadow-sm border border-slate-100"}`;
const PICK_BTN = (active: boolean) =>
  `flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold text-left cursor-pointer transition-all ${
    active
      ? "bg-primary/10 border-primary text-primary"
      : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
  }`;

const SPORT_EVENTS_MAX = 300;
// Pestañas fijas: ayer + hoy + los próximos 7 días, relativas a hoy — siempre las mismas, tenga
// o no partidos cacheados ese día.
const SPORT_EVENTS_DAYS_AHEAD = 7;

function sportDayLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T00:00:00`);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays === -1) return "Ayer";
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface SportDayPanelProps {
  darkMode: boolean;
  title: string;
  headerIcon?: React.ReactNode;
  events: SportEvent[];
  loading: boolean;
  emptyMessage: string;
  onConfigure: () => void;
  isSportScheduled: (ev: SportEvent) => boolean;
  toggleSportSchedule: (ev: SportEvent) => void;
  competitionLogos: Record<string, string | null>;
  sportLogos: Record<string, string | null>;
}

/**
 * Estilo OneFootball, reusado para "Partidos de Hoy" (fútbol) y "NBA": arriba, un selector de
 * días (Ayer/Hoy/Mañana/fechas) a modo de filtro; abajo, los partidos de ese día — primero los
 * de los equipos que seguís, después los de las competencias seguidas enteras, en secciones
 * separadas. Acotado (no infinita) con scroll interno y animación de aparición al hacer scroll.
 * Cada instancia mantiene su propio día seleccionado, así se puede mirar un día distinto en cada
 * panel al mismo tiempo.
 */
function SportDayPanel({
  darkMode,
  title,
  headerIcon,
  events,
  loading,
  emptyMessage,
  onConfigure,
  isSportScheduled,
  toggleSportSchedule,
  competitionLogos,
  sportLogos,
}: SportDayPanelProps) {
  const sportEventsSorted = useMemo(
    () =>
      events
        .slice()
        .sort((a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`))
        .slice(0, SPORT_EVENTS_MAX),
    [events]
  );

  const todayIso = useMemo(() => todayIsoDate(), []);

  const sportEventDays = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const days: string[] = [];
    for (let offset = -1; offset <= SPORT_EVENTS_DAYS_AHEAD; offset++) {
      const d = new Date(base.getTime() + offset * 86400000);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return days;
  }, []);

  // Se guarda el ÍNDICE del día elegido (no la fecha en sí) — "Hoy" siempre está en el índice 1
  // (offset 0 en un arreglo que arranca en -1) de este arreglo fijo, así que avanzar/retroceder
  // es sumar/restar 1 al índice, sin comparar strings de fecha que podían desincronizarse (el
  // bug reportado: las flechas desplazaban el contenedor pero nunca cambiaban el día elegido).
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const selectedSportDay = sportEventDays[selectedDayIndex] ?? todayIso;

  // Flechas para desplazar las pestañas de día, mismo mecanismo que el submenú principal
  // (SubNav.tsx): al clickear, avanza al día anterior/siguiente si hay uno y lo centra en la
  // vista; si ya está en la punta, solo desplaza el contenedor.
  const dayTabsScrollRef = useRef<HTMLDivElement>(null);
  const dayTabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollDayButtonIntoView = (day: string) => {
    const buttonEl = dayTabButtonRefs.current[day];
    const container = dayTabsScrollRef.current;
    if (!buttonEl || !container) return;
    const buttonLeft = buttonEl.offsetLeft;
    const buttonWidth = buttonEl.offsetWidth;
    const containerWidth = container.clientWidth;
    const maxScroll = container.scrollWidth - containerWidth;
    const currentScroll = container.scrollLeft;
    let target = currentScroll;
    if (buttonLeft + buttonWidth + 8 > currentScroll + containerWidth) {
      target = buttonLeft + buttonWidth - containerWidth + 8;
    } else if (buttonLeft - 8 < currentScroll) {
      target = buttonLeft - 8;
    }
    container.scrollTo({ left: Math.max(0, Math.min(maxScroll, target)), behavior: "smooth" });
  };
  const scrollDayTabs = (direction: "left" | "right") => {
    const nextIndex = direction === "left" ? selectedDayIndex - 1 : selectedDayIndex + 1;
    if (nextIndex >= 0 && nextIndex < sportEventDays.length) {
      setSelectedDayIndex(nextIndex);
      scrollDayButtonIntoView(sportEventDays[nextIndex]);
    } else if (dayTabsScrollRef.current) {
      dayTabsScrollRef.current.scrollBy({ left: direction === "left" ? -160 : 160, behavior: "smooth" });
    }
  };

  const selectedSportDayEvents = useMemo(
    () => sportEventsSorted.filter((ev) => ev.date === selectedSportDay),
    [sportEventsSorted, selectedSportDay]
  );
  // Los partidos de un equipo seguido van primero; el resto son de competencias seguidas enteras.
  const selectedSportDayTeamEvents = useMemo(
    () => selectedSportDayEvents.filter((ev) => ev.matchedBy !== "competition"),
    [selectedSportDayEvents]
  );
  const selectedSportDayCompetitionEvents = useMemo(
    () => selectedSportDayEvents.filter((ev) => ev.matchedBy === "competition"),
    [selectedSportDayEvents]
  );

  // Nombre de competencia a mostrar: si el partido trae un competitionId conocido, siempre se
  // usa el nombre curado de FOLLOWABLE_COMPETITIONS en vez de "leagueName" tal cual venga del
  // caché — así la UI nunca vuelve a mostrar el código crudo de ESPN (ej. "arg.1"), sea cual sea
  // el estado del caché compartido en ese momento.
  const competitionNameById = useMemo(
    () => new Map(FOLLOWABLE_COMPETITIONS.map((comp) => [comp.id, comp.name])),
    []
  );
  const competitionDisplayName = (ev: SportEvent): string =>
    (ev.competitionId && competitionNameById.get(ev.competitionId)) || ev.leagueName;

  // Dentro de "Competencias que seguís", separadas cada una en su propio grupo con los partidos
  // de esa competencia debajo.
  const selectedSportDayCompetitionGroups = useMemo(() => {
    const groups: { key: string; name: string; events: SportEvent[] }[] = [];
    const indexByKey = new Map<string, number>();
    for (const ev of selectedSportDayCompetitionEvents) {
      const key = ev.competitionId || ev.leagueName;
      let idx = indexByKey.get(key);
      if (idx === undefined) {
        idx = groups.length;
        indexByKey.set(key, idx);
        groups.push({ key, name: competitionDisplayName(ev), events: [] });
      }
      groups[idx].events.push(ev);
    }
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSportDayCompetitionEvents, competitionNameById]);

  // Contenedor con scroll — se pasa como "root" del viewport de framer-motion para que cada
  // fila anime su aparición a medida que se desplaza DENTRO de este scroll interno.
  const sportEventsScrollRef = useRef<HTMLDivElement>(null);

  const renderSportEventRow = (ev: SportEvent) => {
    const scheduled = isSportScheduled(ev);
    const isLive = ev.status === "live";
    const isFinished = ev.status === "finished";
    const hasScore = ev.homeScore !== undefined && ev.awayScore !== undefined;
    return (
      <motion.div
        key={ev.id}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ root: sportEventsScrollRef, once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800"
      >
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
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
            {ev.competitionId && competitionLogos[ev.competitionId] && (
              <img src={competitionLogos[ev.competitionId]!} alt="" className="w-3 h-3 object-contain shrink-0" />
            )}
            <span className="truncate">{competitionDisplayName(ev)}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          {isLive ? (
            <span className="text-[9px] font-extrabold text-red-500 dark:text-red-400 uppercase tracking-wide flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {ev.statusText || "En vivo"}
            </span>
          ) : isFinished ? (
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Finalizado</span>
          ) : (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">{ev.time || ""}</span>
          )}
          {hasScore ? (
            <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">{ev.homeScore} - {ev.awayScore}</p>
          ) : null}
        </div>
        <button
          type="button"
          title={scheduled ? "Quitar de mis turnos" : "Agendar en mis turnos (Ocio)"}
          onClick={() => toggleSportSchedule(ev)}
          className={`p-1.5 rounded-full shrink-0 transition-all cursor-pointer ${
            scheduled ? "bg-primary text-white" : "bg-white dark:bg-zinc-950 text-zinc-400 dark:text-zinc-500 hover:text-primary border border-slate-200 dark:border-zinc-800"
          }`}
        >
          {scheduled ? <Bell className="w-3.5 h-3.5 fill-current" /> : <BellOff className="w-3.5 h-3.5" />}
        </button>
      </motion.div>
    );
  };

  return (
    <div className={`${SECTION_CARD(darkMode)} lg:col-span-4`}>
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/10 dark:border-zinc-800/40 pb-3 mb-4">
        <div className="flex items-center gap-1.5">
          {headerIcon && (
            <span className="p-1 rounded-full bg-primary/10 shrink-0 flex items-center justify-center">
              {headerIcon}
            </span>
          )}
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">{title}</p>
        </div>
        <button
          type="button"
          onClick={onConfigure}
          className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer shrink-0"
          title="Configurar deportes que seguís"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="min-h-[292px] flex items-center gap-2 text-xs text-zinc-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando calendarios...
        </div>
      ) : events.length === 0 ? (
        <p className="min-h-[292px] flex items-center text-xs text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {/* Mismo mecanismo de flechas que el submenú principal (SubNav) para desplazar las
              pestañas de día. */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollDayTabs("left")}
              title="Desplazar a la izquierda"
              className={`p-1 rounded-full shrink-0 text-zinc-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer ${
                selectedDayIndex === 0 ? "opacity-30 pointer-events-none" : ""
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div ref={dayTabsScrollRef} className="flex-1 flex gap-1.5 overflow-x-auto pb-1 scroll-smooth scrollbar-none">
              {sportEventDays.map((day, dayIndex) => (
                <button
                  key={day}
                  type="button"
                  ref={(el) => { dayTabButtonRefs.current[day] = el; }}
                  onClick={() => setSelectedDayIndex(dayIndex)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide capitalize transition-all cursor-pointer ${
                    dayIndex === selectedDayIndex
                      ? "bg-primary text-white"
                      : "bg-slate-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {sportDayLabel(day)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => scrollDayTabs("right")}
              title="Desplazar a la derecha"
              className={`p-1 rounded-full shrink-0 text-zinc-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer ${
                selectedDayIndex === sportEventDays.length - 1 ? "opacity-30 pointer-events-none" : ""
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div ref={sportEventsScrollRef} className="h-[380px] overflow-y-auto pr-1 space-y-4">
            {selectedSportDayEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No hay partidos ese día.</p>
            ) : (
              <>
                {selectedSportDayTeamEvents.length > 0 && (
                  <div>
                    <p className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-300 mb-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800">
                      Tus equipos
                    </p>
                    <div className="space-y-1.5">{selectedSportDayTeamEvents.map(renderSportEventRow)}</div>
                  </div>
                )}
                {selectedSportDayCompetitionGroups.length > 0 && (
                  <div>
                    <p className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-300 mb-2 px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800">
                      Competencias que seguís
                    </p>
                    <div className="space-y-3">
                      {selectedSportDayCompetitionGroups.map((group) => (
                        <div key={group.key}>
                          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-1 pl-2 border-l-2 border-primary/40 flex items-center gap-1.5">
                            {competitionLogos[group.key] && (
                              <img src={competitionLogos[group.key]!} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                            )}
                            {group.name}
                          </p>
                          <div className="space-y-1.5">{group.events.map(renderSportEventRow)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Everything about "Eventos" (San Juan's monthly agenda, the sports calendars the user
 * follows, and a merged month calendar) lives on ONE unified page — no further sub-tabs —
 * reached as the "Eventos" entry inside Notas' own submenu.
 */
export function EventsView({ userId, darkMode = false, turnosCompromisos, setTurnosCompromisos }: EventsViewProps) {
  const { showToast } = useToast();

  // Campanita en cada tarjeta de "Qué hacer en San Juan": agenda/desagenda el evento como
  // Turno-Compromiso categoría "Ocio" — con eso ya aparece solo en Inicio, Agenda Central
  // Integrada y Turnos, porque las tres leen el mismo estado turnosCompromisos (mismo patrón
  // que usan los partidos de fútbol seguidos, ver lib/matchScheduler.ts).
  const isSanJuanScheduled = (ev: SanJuanEvent) =>
    turnosCompromisos.some((t) => t.id === sanJuanTurnoId(ev));

  // Igual que en AppointmentsView: el cambio se aplica local (instantáneo) Y se persiste en
  // Firestore con saveItemToFirestore/deleteItemFromFirestore. Solo tocar el estado local (lo
  // que hacía antes) se perdía al cambiar de sección, porque el listener de sincronización
  // vuelve a traer lo último que hay guardado en el servidor y pisa lo que no llegó a guardarse.
  const toggleSanJuanSchedule = async (ev: SanJuanEvent) => {
    const id = sanJuanTurnoId(ev);
    const alreadyScheduled = turnosCompromisos.some((t) => t.id === id);

    if (alreadyScheduled) {
      setTurnosCompromisos((prev) => {
        const next = prev.filter((t) => t.id !== id);
        StorageService.setTurnosCompromisos(next);
        return next;
      });
      try {
        await deleteItemFromFirestore(userId, "turnos_compromisos", id);
        showToast(`"${ev.title}" quitado de tus turnos.`, "info");
      } catch (err: any) {
        setTurnosCompromisos((prev) => {
          const reverted = [...prev, turnosCompromisos.find((t) => t.id === id)!].filter(Boolean);
          StorageService.setTurnosCompromisos(reverted);
          return reverted;
        });
        showToast(err?.message || "No se pudo quitar el evento de tus turnos.", "error");
      }
      return;
    }

    const fecha = guessIsoDate(ev.rawDate || ev.date) || new Date().toISOString().slice(0, 10);
    const nuevoTurno: TurnoCompromiso = {
      id,
      estatus: false,
      descripcion: ev.title,
      categoria: "Ocio",
      fecha,
      lugar: ev.location || "San Juan",
      informacionPersonalizada: JSON.stringify({
        source: "sanjuan",
        imageUrl: ev.imageUrl,
        sourceUrl: ev.sourceUrl,
        rawDate: ev.rawDate,
      }),
    };
    setTurnosCompromisos((prev) => {
      const next = [...prev, nuevoTurno];
      StorageService.setTurnosCompromisos(next);
      return next;
    });
    try {
      await saveItemToFirestore(userId, "turnos_compromisos", nuevoTurno);
      showToast(`"${ev.title}" agendado en tus turnos (Ocio).`, "success");
    } catch (err: any) {
      setTurnosCompromisos((prev) => {
        const reverted = prev.filter((t) => t.id !== id);
        StorageService.setTurnosCompromisos(reverted);
        return reverted;
      });
      showToast(err?.message || "No se pudo agendar el evento.", "error");
    }
  };

  // Campanita en cada tarjeta de "Eventos deportivos": mismo patrón que San Juan (ver arriba) —
  // agenda/desagenda el partido como turno-compromiso "Ocio" persistido en Firestore.
  const isSportScheduled = (ev: SportEvent) =>
    turnosCompromisos.some((t) => t.id === sportTurnoId(ev));

  const toggleSportSchedule = async (ev: SportEvent) => {
    const id = sportTurnoId(ev);
    const alreadyScheduled = turnosCompromisos.some((t) => t.id === id);

    if (alreadyScheduled) {
      setTurnosCompromisos((prev) => {
        const next = prev.filter((t) => t.id !== id);
        StorageService.setTurnosCompromisos(next);
        return next;
      });
      try {
        await deleteItemFromFirestore(userId, "turnos_compromisos", id);
        showToast(`"${ev.title}" quitado de tus turnos.`, "info");
      } catch (err: any) {
        setTurnosCompromisos((prev) => {
          const reverted = [...prev, turnosCompromisos.find((t) => t.id === id)!].filter(Boolean);
          StorageService.setTurnosCompromisos(reverted);
          return reverted;
        });
        showToast(err?.message || "No se pudo quitar el evento de tus turnos.", "error");
      }
      return;
    }

    const nuevoTurno: TurnoCompromiso = {
      id,
      estatus: false,
      descripcion: ev.title,
      categoria: "Ocio",
      fecha: ev.date,
      lugar: ev.venue || ev.leagueName,
      informacionPersonalizada: JSON.stringify({
        source: "sport",
        sportId: ev.sportId,
        leagueName: ev.leagueName,
        time: ev.time,
        homeTeamBadge: ev.homeTeamBadge,
        awayTeamBadge: ev.awayTeamBadge,
      }),
    };
    setTurnosCompromisos((prev) => {
      const next = [...prev, nuevoTurno];
      StorageService.setTurnosCompromisos(next);
      return next;
    });
    try {
      await saveItemToFirestore(userId, "turnos_compromisos", nuevoTurno);
      showToast(`"${ev.title}" agendado en tus turnos (Ocio).`, "success");
    } catch (err: any) {
      setTurnosCompromisos((prev) => {
        const reverted = prev.filter((t) => t.id !== id);
        StorageService.setTurnosCompromisos(reverted);
        return reverted;
      });
      showToast(err?.message || "No se pudo agendar el evento.", "error");
    }
  };

  // --- San Juan ---
  const [sjEvents, setSjEvents] = useState<SanJuanEvent[]>([]);
  const [sjLoading, setSjLoading] = useState(true);
  useEffect(() => {
    setSjLoading(true);
    getSanJuanEvents().then(setSjEvents).finally(() => setSjLoading(false));
  }, []);

  // "Qué hacer en San Juan": mismo carrusel paginado (flechas + puntos, avance automático)
  // que "Eventos deportivos" y "Eventos del Día" — 6 tarjetas por página, 3 por columna (grilla
  // de 2 columnas), como pidió el usuario.
  const [sjPage, setSjPage] = useState(1);
  const SJ_PAGE_SIZE = 6;
  useEffect(() => { setSjPage(1); }, [sjEvents]);
  const sjTotalPages = Math.max(1, Math.ceil(sjEvents.length / SJ_PAGE_SIZE));
  useEffect(() => {
    if (sjTotalPages <= 1) return;
    const id = setInterval(() => {
      setSjPage((p) => (p >= sjTotalPages ? 1 : p + 1));
    }, 6000);
    return () => clearInterval(id);
  }, [sjTotalPages]);
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

  // Seguir una competencia entera (todos sus partidos, no solo los de un equipo puntual).
  const toggleDraftCompetition = (competitionId: string) => {
    if (!draftPrefs) return;
    const current = draftPrefs.followedCompetitions || [];
    const already = current.includes(competitionId);
    const next = already ? current.filter((c) => c !== competitionId) : [...current, competitionId];
    setDraftPrefs({ ...draftPrefs, followedCompetitions: next });
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

  // Escudo de cada competencia (Libertadores, Premier League, etc.), al lado de su nombre en
  // "Eventos deportivos" — mismo mecanismo que sportLogos de arriba (thumbnail de Wikipedia por
  // título de artículo), en vez de un link directo a un sitio de logos que no podemos verificar
  // desde acá que siga funcionando.
  const [competitionLogos, setCompetitionLogos] = useState<Record<string, string | null>>({});
  useEffect(() => {
    FOLLOWABLE_COMPETITIONS.forEach((comp) => {
      if (comp.id in competitionLogos) return;
      fetchWikiThumbnail(comp.wikiTitle || comp.name).then((url) =>
        setCompetitionLogos((prev) => ({ ...prev, [comp.id]: url }))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mismo mecanismo para las ligas del picker "O elegí un equipo puntual" del modal de
  // configuración — FOOTBALL_LEAGUES ya traía un wikiTitle por liga sin usar, pensado para esto.
  const [footballLeagueLogos, setFootballLeagueLogos] = useState<Record<string, string | null>>({});
  useEffect(() => {
    FOOTBALL_LEAGUES.forEach((league) => {
      if (league.id in footballLeagueLogos) return;
      fetchWikiThumbnail(league.wikiTitle || league.name).then((url) =>
        setFootballLeagueLogos((prev) => ({ ...prev, [league.id]: url }))
      );
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
  // Seguir varios equipos dispara varios fetches secuenciales a ESPN (uno por liga por club),
  // así que este efecto puede tardar bastante y solaparse con una corrida más nueva (ej. el
  // usuario agrega/edita equipos de nuevo mientras la anterior todavía está en vuelo). Sin
  // esta guarda, la respuesta VIEJA que termina después podía pisar a la nueva con datos
  // desactualizados o directamente vacíos — "seleccioné varios y no aparece nada".
  const sportFetchGeneration = useRef(0);
  useEffect(() => {
    if (!prefsLoaded || !prefs) return;
    const myGeneration = ++sportFetchGeneration.current;

    // Se guardan en localStorage por firma de preferencias (deportes/equipos/competencias
    // seguidas) + un TTL corto — el caché real y compartido ya vive en Firestore (refrescado
    // cada 15 min por el scheduled function), esto solo evita releerlo en cada render.
    const signature = JSON.stringify({ sports: prefs.followedSports, teams: prefs.followedTeams, competitions: prefs.followedCompetitions });
    const cacheKey = `sj_sport_events_cache_${userId}`;
    const SPORT_EVENTS_TTL_MS = 2 * 60 * 1000; // 2min — hay partidos en vivo, no conviene más
    try {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached.signature === signature && Date.now() - cached.fetchedAt < SPORT_EVENTS_TTL_MS) {
          if (myGeneration === sportFetchGeneration.current) setSportEvents(cached.events || []);
          return; // caché fresco — no vuelve a pedir nada por red
        }
      }
    } catch (_) {
      // localStorage inaccesible o corrupto — seguir al fetch normal
    }

    setSportEventsLoading(true);
    fetchFollowedSportEventsFromCache(prefs)
      .then((events) => {
        // Una corrida más nueva ya arrancó (el usuario cambió equipos de nuevo antes de que
        // esta terminara) — descartar esta respuesta en vez de pisar el resultado más actual.
        if (myGeneration !== sportFetchGeneration.current) return;
        setSportEvents(events);
        // Ojo: NO cachear un resultado vacío. Antes cacheábamos cualquier resultado — si un
        // fetch fallaba parcialmente (o legítimamente no había próximos eventos ese momento),
        // ese "vacío" quedaba congelado 3h y parecía que la campanita/selección "no traía
        // nada" aunque el usuario reintentara. Un vacío siempre reintenta en la próxima carga.
        if (events.length > 0) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ signature, fetchedAt: Date.now(), events }));
          } catch (_) {
            // Quota llena o storage bloqueado — no rompe la carga, solo no cachea esta vez
          }
        } else {
          try { localStorage.removeItem(cacheKey); } catch (_) { /* noop */ }
        }
      })
      .finally(() => {
        if (myGeneration === sportFetchGeneration.current) setSportEventsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded, prefs?.followedSports.join(","), JSON.stringify(prefs?.followedTeams || {}), (prefs?.followedCompetitions || []).join(",")]);

  // --- Calendar: San Juan + followed sport events, merged by ISO date ---
  const eventsByDate = useMemo(() => {
    const map: Record<string, DayEvent[]> = {};
    sjEvents.forEach((ev) => {
      const iso = guessIsoDate(ev.rawDate || ev.date);
      if (iso) (map[iso] = map[iso] || []).push({ label: ev.title, kind: "sanjuan", location: ev.location, categoryLabel: "San Juan" });
    });
    sportEvents.forEach((ev) => {
      if (ev.date) {
        (map[ev.date] = map[ev.date] || []).push({
          label: ev.title,
          kind: "sport",
          sportId: ev.sportId,
          homeTeamBadge: ev.homeTeamBadge,
          awayTeamBadge: ev.awayTeamBadge,
          time: ev.time,
          categoryLabel: ev.leagueName || "Deportes",
        });
      }
    });
    return map;
  }, [sjEvents, sportEvents]);

  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));

  // Lista de eventos del día seleccionado: filtro Todos/San Juan/Deportes (igual que la
  // "Agenda de Turnos y Compromisos") + máximo 3 a la vez, en el mismo carrusel paginado
  // (flechas + puntos, avance automático) que "Eventos deportivos" — en vez de listar todo
  // junto, que empujaba el resto de la tarjeta cuando un día tenía muchos eventos.
  const [dayEventFilter, setDayEventFilter] = useState<DayEventFilter>("Todos");
  const [calDayPage, setCalDayPage] = useState(1);
  useEffect(() => { setCalDayPage(1); }, [selectedDay, dayEventFilter]);
  const CAL_DAY_PAGE_SIZE = 3;
  const selectedDayAllEvents = eventsByDate[selectedDay] || [];
  const selectedDayEvents = selectedDayAllEvents.filter((ev) =>
    dayEventFilter === "Todos" ? true : dayEventFilter === "San Juan" ? ev.kind === "sanjuan" : ev.kind === "sport"
  );
  const calDayTotalPages = Math.max(1, Math.ceil(selectedDayEvents.length / CAL_DAY_PAGE_SIZE));
  const selectedDayPageEvents = selectedDayEvents.slice(
    (calDayPage - 1) * CAL_DAY_PAGE_SIZE,
    calDayPage * CAL_DAY_PAGE_SIZE
  );
  // Mismo carrusel automático que "Eventos deportivos": avanza de página sola cada 6s.
  useEffect(() => {
    if (calDayTotalPages <= 1) return;
    const id = setInterval(() => {
      setCalDayPage((p) => (p >= calDayTotalPages ? 1 : p + 1));
    }, 6000);
    return () => clearInterval(id);
  }, [calDayTotalPages]);

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
      {/* Calendario (izquierda) + eventos del día seleccionado (derecha) — mismo layout Y
          mismo estilo de tarjeta que "Calendario Unificado" + "Agenda Central Integrada" en
          Inicio: tarjetas opacas con sombra, grilla de días metida en su propia caja anidada,
          mes en una placa en mayúsculas, en vez de la tarjeta chica y traslúcida de antes. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`${SECTION_CARD(darkMode)} lg:col-span-5`}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary animate-pulse" />
              <span>Calendario de Eventos</span>
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                className="p-1.5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-primary cursor-pointer transition-colors"
                title="Mes Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                className="p-1.5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-primary cursor-pointer transition-colors"
                title="Mes Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-center font-extrabold text-xs mb-4 text-slate-800 dark:text-zinc-200 uppercase tracking-widest bg-slate-50 dark:bg-black/40 py-2 rounded-xl">
            {calMonth.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </div>

          <div className={INNER_BOX(darkMode)}>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
            {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
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
                    isSelected ? "border-2 border-primary text-primary bg-primary/10 scale-105 shadow-sm" : isToday ? "bg-primary text-white shadow-md" : "hover:bg-primary/10 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span>{dayNum}</span>
                  {hasEvents && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary animate-pulse" />}
                </button>
              );
            })}
          </div>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-800/10 dark:border-zinc-800/40">
            <button
              type="button"
              onClick={() => { setCalMonth(new Date()); setSelectedDay(new Date().toISOString().slice(0, 10)); }}
              className="w-full px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold cursor-pointer hover:bg-primary/20 transition-colors"
            >
              Ir a Hoy
            </button>
          </div>
        </div>

        {/* Eventos del día seleccionado */}
        <div className={`${SECTION_CARD(darkMode)} lg:col-span-7`}>
          <div className="flex items-center gap-2 border-b border-zinc-800/10 dark:border-zinc-800/40 pb-3 mb-4">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-sm">Eventos del Día</h3>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2.5 px-4 bg-slate-50 dark:bg-black/40 border border-slate-150 dark:border-zinc-800/50 rounded-2xl mb-4">
            <div>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Día Seleccionado</p>
              <p className="text-xs md:text-sm font-extrabold text-black dark:text-zinc-200 mt-0.5 capitalize">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <PillFilterBar
              options={[
                { id: "Todos", label: "Todos" },
                { id: "San Juan", label: "San Juan" },
                { id: "Deportes", label: "Deportes" },
              ]}
              activeValue={dayEventFilter}
              onChange={setDayEventFilter}
              layoutIdPrefix="eventsDayFilter"
              className="self-start sm:self-auto"
            />
          </div>
          <div className="space-y-2">
            {/* Alto mínimo fijo (una página completa de 3 tarjetas) para que la caja no se
                achique cuando el día tiene menos eventos — así la paginación de abajo queda
                siempre en el mismo lugar en vez de saltar hacia arriba. */}
            <div className="min-h-[280px]">
            {selectedDayEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Sin eventos este día.</p>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={calDayPage}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="space-y-2.5"
                >
                  {selectedDayPageEvents.map((ev, i) => {
                    const CatIcon = ev.kind === "sanjuan" ? MapPin : Trophy;
                    return (
                      <div key={i} className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 flex items-start gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                          {ev.kind === "sport" && ev.sportId === "f1" && sportLogos.f1 ? (
                            <img src={sportLogos.f1} alt="" className="w-4 h-4 object-contain brightness-0 dark:invert" />
                          ) : ev.kind === "sport" && ev.sportId === "nba" ? (
                            <NbaLogo className="h-4 w-auto max-w-[16px]" />
                          ) : (
                            <CatIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                            {ev.categoryLabel}
                          </span>
                          <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">{ev.label}</p>
                          {(ev.time || ev.location || ev.homeTeamBadge || ev.awayTeamBadge) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">
                              {ev.time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 shrink-0" /> {ev.time}
                                </span>
                              )}
                              {ev.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 shrink-0" /> {ev.location}
                                </span>
                              )}
                              {(ev.homeTeamBadge || ev.awayTeamBadge) && (
                                <span className="flex items-center gap-1">
                                  {ev.homeTeamBadge && <img src={ev.homeTeamBadge} alt="" className="w-3.5 h-3.5 rounded-full bg-white object-contain border border-white" />}
                                  {ev.awayTeamBadge && <img src={ev.awayTeamBadge} alt="" className="w-3.5 h-3.5 rounded-full bg-white object-contain border border-white" />}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
            </div>
            {calDayTotalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  title="Página anterior"
                  onClick={() => setCalDayPage((p) => (p === 1 ? calDayTotalPages : p - 1))}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: calDayTotalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      title={`Página ${i + 1}`}
                      onClick={() => setCalDayPage(i + 1)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        calDayPage === i + 1 ? "w-4 bg-primary" : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  title="Página siguiente"
                  onClick={() => setCalDayPage((p) => (p === calDayTotalPages ? 1 : p + 1))}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
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
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1.5">
                          Competencias (todos sus partidos)
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {FOLLOWABLE_COMPETITIONS.map((comp) => (
                            <button
                              key={comp.id}
                              type="button"
                              onClick={() => toggleDraftCompetition(comp.id)}
                              className={PICK_BTN((draftPrefs.followedCompetitions || []).includes(comp.id))}
                            >
                              {competitionLogos[comp.id] ? (
                                <img src={competitionLogos[comp.id]!} alt="" className="w-4 h-4 object-contain shrink-0" />
                              ) : (
                                <Trophy className="w-4 h-4 shrink-0" />
                              )}
                              <span className="truncate">{comp.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">O elegí un equipo puntual</p>
                      {!footballLeague ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {FOOTBALL_LEAGUES.map((l) => (
                            <button key={l.id} type="button" onClick={() => setFootballLeague(l.id)} className={PICK_BTN(false)}>
                              {footballLeagueLogos[l.id] ? (
                                <img src={footballLeagueLogos[l.id]!} alt="" className="w-4 h-4 object-contain shrink-0" />
                              ) : (
                                <Trophy className="w-4 h-4 shrink-0" />
                              )}
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

      {/* Qué hacer en San Juan + Partidos de Hoy (fútbol) + NBA — tres tarjetas iguales, cada
          una su propia tarjeta opaca igual que arriba. "items-start" evita que CSS grid estire
          las 3 tarjetas a la altura de la más alta (San Juan, con 6 tarjetas en 3 filas, quedaba
          más alta que las otras dos, que se estiraban dejando un espacio vacío enorme abajo). */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className={`${SECTION_CARD(darkMode)} lg:col-span-4`}>
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800/10 dark:border-zinc-800/40 pb-3 mb-4">
          <h3 className="font-extrabold text-sm flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Qué hacer en San Juan
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
          <div className="space-y-2">
            {/* Alto FIJO (no mínimo) — antes, con "min-h", la tarjeta crecía o se achicaba en
                cada página según cuánto texto tuviera cada evento, dando un efecto de
                "salto" molesto al pasar de página. Con altura fija + overflow-hidden queda
                estable siempre, del mismo alto que "Partidos de Hoy"/"NBA" al lado. */}
            <div className="overflow-hidden h-[380px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={sjPage}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {sjPageEvents.map((ev) => {
                    const scheduled = isSanJuanScheduled(ev);
                    return (
                      <a key={ev.id} href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="relative rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 overflow-hidden hover:shadow-md transition-all flex flex-col">
                        <button
                          type="button"
                          title={scheduled ? "Quitar de mis turnos" : "Agendar en mis turnos (Ocio)"}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSanJuanSchedule(ev); }}
                          className={`absolute top-2 right-2 z-10 p-1.5 rounded-full shadow-md transition-all cursor-pointer ${
                            scheduled ? "bg-primary text-white" : "bg-white/90 dark:bg-zinc-950/90 text-zinc-500 dark:text-zinc-400 hover:text-primary"
                          }`}
                        >
                          {scheduled ? <Bell className="w-3.5 h-3.5 fill-current" /> : <BellOff className="w-3.5 h-3.5" />}
                        </button>
                        {ev.imageUrl && (
                          <img
                            src={ev.imageUrl}
                            alt={ev.title}
                            className="w-full h-32 object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        )}
                        <div className="p-3 space-y-1 flex-1">
                          <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 pr-5">{ev.title}</p>
                          {ev.location && <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{ev.location}</p>}
                          {ev.rawDate && <p className="text-xs text-primary font-bold">{ev.rawDate}</p>}
                          <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Ver más
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {sjTotalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  title="Página anterior"
                  onClick={() => setSjPage((p) => (p === 1 ? sjTotalPages : p - 1))}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: sjTotalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      title={`Página ${i + 1}`}
                      onClick={() => setSjPage(i + 1)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        sjPage === i + 1 ? "w-4 bg-primary" : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  title="Página siguiente"
                  onClick={() => setSjPage((p) => (p === sjTotalPages ? 1 : p + 1))}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fútbol y NBA: mismo comportamiento (pestañas de día, tus equipos / competencias que
          seguís, scroll con animación), cada una su propia tarjeta e independiente entre sí. */}
      <SportDayPanel
        darkMode={darkMode}
        title="Partidos de Hoy"
        headerIcon={
          sportLogos.futbol ? (
            <img src={sportLogos.futbol} alt="" className="w-3.5 h-3.5 object-contain brightness-0 dark:invert" />
          ) : undefined
        }
        events={sportEvents.filter((ev) => ev.sportId === "futbol")}
        loading={sportEventsLoading}
        emptyMessage={prefs?.followedSports.includes("futbol") ? "No hay próximos partidos de fútbol por ahora." : "Elegí al menos un equipo o competencia de fútbol desde el botón de configuración."}
        onConfigure={openSportsModal}
        isSportScheduled={isSportScheduled}
        toggleSportSchedule={toggleSportSchedule}
        competitionLogos={competitionLogos}
        sportLogos={sportLogos}
      />

      <SportDayPanel
        darkMode={darkMode}
        title="NBA"
        headerIcon={<NbaLogo className="w-3.5 h-3.5 text-primary" />}
        events={sportEvents.filter((ev) => ev.sportId === "nba")}
        loading={sportEventsLoading}
        emptyMessage={prefs?.followedSports.includes("nba") ? "No hay próximos partidos de NBA por ahora." : "Elegí al menos un equipo de NBA desde el botón de configuración."}
        onConfigure={openSportsModal}
        isSportScheduled={isSportScheduled}
        toggleSportSchedule={toggleSportSchedule}
        competitionLogos={competitionLogos}
        sportLogos={sportLogos}
      />
      </div>
    </div>
  );
}
