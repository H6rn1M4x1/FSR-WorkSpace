import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  DollarSign,
  CalendarClock,
  HeartPulse,
  GraduationCap,
  ExternalLink,
  Bell,
  Monitor,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
} from "lucide-react";
import Logo from "./Logo";
import { AestheticStorageService } from "../lib/storage";
import { uiSounds } from "../lib/sounds";
import { getLocalDateString } from "../utils/date";
import type { DockEditKind, DockItem, DockSnapshot } from "../lib/dockSnapshot";

interface DockDisplayOption {
  id: number;
  label: string;
  selected: boolean;
}

interface NotifEntry {
  id: string;
  title: string;
  body: string;
  category: string;
  // Id del registro real al que apunta esta notificación (si lo tiene) — con esto, tocarla puede
  // abrir el mismo formulario de edición real en vez de un simple texto (ver handleItemClick).
  itemId?: string;
  receivedAt: number;
}

// Puente expuesto por electron/preload.cjs SOLO dentro de la ventana del dock — ver
// electron/main.cjs (createDockWindow) y electron/preload.cjs.
interface DockBridge {
  resize: (size: { width: number; height: number; collapsed: boolean }) => void;
  openMain: () => void;
  onSnapshot: (cb: (snapshot: DockSnapshot) => void) => () => void;
  onNotify: (cb: (payload: { title: string; body: string; category: string; id?: string }) => void) => () => void;
  getDisplays: () => Promise<DockDisplayOption[]>;
  setDisplay: (displayId: number) => void;
  quickAdd: (category: string) => void;
  quickEdit: (category: string, itemId: string) => void;
}

function getDockBridge(): DockBridge | null {
  return (window as unknown as { FSR_ELECTRON_DOCK?: DockBridge }).FSR_ELECTRON_DOCK ?? null;
}

type SectionKey = "finanzas" | "turnos" | "salud" | "academico";

const SECTIONS: { key: SectionKey; label: string; icon: typeof DollarSign }[] = [
  { key: "finanzas", label: "Finanzas", icon: DollarSign },
  { key: "turnos", label: "Turnos", icon: CalendarClock },
  { key: "salud", label: "Salud", icon: HeartPulse },
  { key: "academico", label: "Académico", icon: GraduationCap },
];

const CATEGORY_LABELS: Record<string, string> = {
  finanzas: "Finanzas",
  turno: "Turnos",
  turnos: "Turnos",
  universidad: "Académico",
  salud: "Salud",
  comidas: "Comidas",
  general: "General",
};

// Misma clave que usa QUICK_ADD_TARGETS en App.tsx — para el botón "+" de cada sección (siempre
// abre el formulario de alta en blanco, no depende de ningún ítem puntual).
const SECTION_ADD_KEY: Record<SectionKey, string> = {
  finanzas: "finanzas",
  turnos: "turno",
  salud: "salud",
  academico: "universidad",
};

const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

const COLLAPSED_SIZE = { width: 200, height: 40 };
const EXPANDED_SIZE = { width: 680, height: 420 };
// Tiempo que espera antes de colapsar al sacar el mouse, para no cerrarse por un roce accidental.
const COLLAPSE_DELAY_MS = 350;

const EMPTY_SNAPSHOT: DockSnapshot = {
  generatedAt: 0,
  finanzas: [],
  turnos: [],
  salud: [],
  academico: [],
  themeColor: "#8ab4f8",
  darkMode: true,
  profile: { name: "Usuario", photoURL: null },
};

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "U";
}

// "Hoy" = lo que vence puntualmente hoy + lo que no tiene fecha propia (ej. Salud) — sin arrastrar
// lo vencido de antes (punto 4 pedido: el filtro de "hoy" no debe mezclar fechas pasadas). Otro
// día elegido en el calendario = solo lo que cae justo en esa fecha exacta.
function matchesDate(item: DockItem, date: string, todayStr: string): boolean {
  if (date === todayStr) return item.isToday || item.dateOnly === "";
  return item.dateOnly === date;
}

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Recién";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Theme {
  bg: string;
  text: string;
  border: string;
  hover: string;
  subtle: string;
  popoverBg: string;
  navInactive: string;
}

function ItemRow({ item, index, theme, onClick }: { item: DockItem; index: number; theme: Theme; onClick?: () => void }) {
  return (
    <motion.div
      onClick={onClick}
      onHoverStart={() => uiSounds.hover()}
      whileHover={{ scale: 1.015 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.035, 0.3) }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${onClick ? "cursor-pointer" : ""} ${
        item.overdue ? "bg-red-500/10 text-red-300" : item.isToday ? "bg-primary/10" : theme.subtle
      }`}
    >
      <p className="font-semibold truncate">{item.title}</p>
      {item.subtitle && <p className="text-xs opacity-70 truncate">{item.subtitle}</p>}
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-zinc-500 text-center py-6">
      Nada por acá para este día.
    </motion.p>
  );
}

function MiniCalendar({
  month,
  selectedDate,
  todayStr,
  theme,
  onSelect,
  onMonthChange,
}: {
  month: Date;
  selectedDate: string;
  todayStr: string;
  theme: Theme;
  onSelect: (dateOnly: string) => void;
  onMonthChange: (next: Date) => void;
}) {
  const first = startOfMonth(month);
  const startWeekday = first.getDay();
  const total = daysInMonth(month);
  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  const monthLabel = month.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className={`pt-2 border-t ${theme.border}`}>
      <div className="flex items-center justify-between px-0.5 mb-1">
        <button
          type="button"
          onClick={() => {
            uiSounds.click();
            onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
          }}
          className={`p-0.5 rounded ${theme.hover} cursor-pointer`}
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="text-[10px] font-semibold capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={() => {
            uiSounds.click();
            onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));
          }}
          className={`p-0.5 rounded ${theme.hover} cursor-pointer`}
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {WEEKDAY_LABELS.map((d, i) => (
          <span key={i} className="text-[8px] text-zinc-500 text-center">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const dateOnly = toDateOnly(new Date(month.getFullYear(), month.getMonth(), day));
          const isSelected = dateOnly === selectedDate;
          const isToday = dateOnly === todayStr;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                uiSounds.selectDate();
                onSelect(dateOnly);
              }}
              className={`text-[10px] w-5 h-5 mx-auto rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isSelected ? "bg-primary text-white font-bold" : isToday ? "text-primary font-bold" : `${theme.hover}`
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DockApp() {
  const [expanded, setExpanded] = useState(false);
  const [section, setSection] = useState<SectionKey | null>(null);
  const [snapshot, setSnapshot] = useState<DockSnapshot>(EMPTY_SNAPSHOT);
  const [notifFeed, setNotifFeed] = useState<NotifEntry[]>([]);
  const [openNotifId, setOpenNotifId] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const [displays, setDisplays] = useState<DockDisplayOption[]>([]);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const todayStr = useMemo(() => getLocalDateString(), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const bridgeRef = useRef<DockBridge | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bridgeRef.current = getDockBridge();
  }, []);

  // Bootstrap inicial (antes de que llegue el primer snapshot de la ventana principal): lee una
  // vez lo que ya haya en localStorage para no arrancar con el acento/tema por defecto un instante.
  useEffect(() => {
    document.documentElement.style.setProperty("--color-primary", AestheticStorageService.getThemeColor());
    document.documentElement.classList.toggle("dark", AestheticStorageService.getDarkMode());
  }, []);

  // El color de acento y el modo claro/oscuro los manda la ventana principal en cada snapshot
  // (punto 1 pedido: que el dock lo detecte y lo aplique solo).
  useEffect(() => {
    if (!snapshot.generatedAt) return;
    document.documentElement.style.setProperty("--color-primary", snapshot.themeColor);
    document.documentElement.classList.toggle("dark", snapshot.darkMode);
  }, [snapshot.themeColor, snapshot.darkMode, snapshot.generatedAt]);

  useEffect(() => {
    const bridge = getDockBridge();
    if (!bridge) return;
    const unsubSnapshot = bridge.onSnapshot((s) => setSnapshot(s));
    const unsubNotify = bridge.onNotify((payload) => {
      uiSounds.notify();
      setPulse(true);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => setPulse(false), 1600);
      setNotifFeed((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            title: payload.title,
            body: payload.body,
            category: payload.category,
            itemId: payload.id,
            receivedAt: Date.now(),
          },
          ...prev,
        ].slice(0, 12)
      );
    });
    bridge
      .getDisplays()
      .then(setDisplays)
      .catch(() => {});
    return () => {
      unsubSnapshot();
      unsubNotify();
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const size = expanded ? EXPANDED_SIZE : COLLAPSED_SIZE;
    bridgeRef.current?.resize({ ...size, collapsed: !expanded });
  }, [expanded]);

  // Abrir/cerrar con el mouse (punto 3 pedido): entra = se abre; sale = se cierra solo, con un
  // pequeño margen de tiempo para que no se cierre por pasar de largo sin querer.
  const handleMouseEnter = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (!expanded) {
      uiSounds.expand();
      setExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    collapseTimerRef.current = setTimeout(() => {
      setExpanded(false);
      setShowDisplayMenu(false);
      setOpenNotifId(null);
      uiSounds.collapse();
    }, COLLAPSE_DELAY_MS);
  };

  const handleSectionClick = (key: SectionKey) => {
    uiSounds.navigate();
    setSection((prev) => (prev === key ? null : key));
  };

  const handlePickDisplay = (id: number) => {
    uiSounds.click();
    bridgeRef.current?.setDisplay(id);
    setDisplays((prev) => prev.map((d) => ({ ...d, selected: d.id === id })));
    setShowDisplayMenu(false);
  };

  // Tocar un ítem de cualquier sección (punto 3 pedido): en vez de armar una vista de detalle
  // propia adentro del dock (y reimplementar Pagar/editar/eliminar con una lógica de guardado
  // paralela a la que ya existe), esto reusa el mismo mecanismo de "lápiz" que ya tiene Inicio
  // (handleQuickEdit en App.tsx) — abre la ventana principal directo en el formulario de edición
  // REAL de ese ítem (con su mismo diseño de PaymentsTable/Turnos/etc.), ya con Pagar/editar/
  // eliminar funcionando de verdad y sincronizado en todos lados.
  const handleItemClick = (editKind: DockEditKind, itemId: string) => {
    if (!editKind) return;
    uiSounds.expand();
    bridgeRef.current?.quickEdit(editKind, itemId);
  };

  // Las notificaciones de la agenda sí llevan el id del registro real (ver
  // src/services/notificationService.ts) — si la categoría tiene un formulario de edición
  // conocido, tocarla hace lo mismo que un ítem de sección. Si no (ej. una notificación genérica
  // de prueba, sin id), se muestra el texto completo en un panel simple adentro del dock.
  const handleNotifClick = (n: NotifEntry) => {
    const knownEditKinds: DockEditKind[] = ["finanzas", "turno", "universidad", "salud"];
    if (n.itemId && knownEditKinds.includes(n.category as DockEditKind)) {
      handleItemClick(n.category as DockEditKind, n.itemId);
      return;
    }
    uiSounds.expand();
    setOpenNotifId(n.id);
  };

  const handleCloseNotif = () => {
    uiSounds.collapse();
    setOpenNotifId(null);
  };

  const handleSectionAdd = (key: SectionKey) => {
    uiSounds.click();
    bridgeRef.current?.quickAdd(SECTION_ADD_KEY[key]);
  };

  // Filtrado por fecha (puntos 3 y 4 pedidos): por default siempre "hoy" (pendiente + vencido),
  // salvo que se elija otro día en el mini calendario.
  const finanzasF = useMemo(() => snapshot.finanzas.filter((i) => matchesDate(i, selectedDate, todayStr)), [snapshot.finanzas, selectedDate, todayStr]);
  const turnosF = useMemo(() => snapshot.turnos.filter((i) => matchesDate(i, selectedDate, todayStr)), [snapshot.turnos, selectedDate, todayStr]);
  const saludF = useMemo(() => snapshot.salud.filter((i) => matchesDate(i, selectedDate, todayStr)), [snapshot.salud, selectedDate, todayStr]);
  const academicoF = useMemo(() => snapshot.academico.filter((i) => matchesDate(i, selectedDate, todayStr)), [snapshot.academico, selectedDate, todayStr]);

  const filteredByKey: Record<SectionKey, DockItem[]> = {
    finanzas: finanzasF,
    turnos: turnosF,
    salud: saludF,
    academico: academicoF,
  };

  const mergedItems = useMemo(() => [...finanzasF, ...turnosF, ...saludF, ...academicoF].slice(0, 10), [finanzasF, turnosF, saludF, academicoF]);

  // El estado "ambiente" del pill colapsado siempre refleja lo pendiente de HOY, sin importar qué
  // día esté elegido en el calendario del panel expandido.
  const todayPendingCount = useMemo(() => {
    const all = [...snapshot.finanzas, ...snapshot.turnos, ...snapshot.academico];
    return all.filter((i) => matchesDate(i, todayStr, todayStr)).length;
  }, [snapshot, todayStr]);

  const statusText = useMemo(() => {
    if (todayPendingCount === 0) return "Al día";
    return `${todayPendingCount} pendiente${todayPendingCount === 1 ? "" : "s"}`;
  }, [todayPendingCount]);

  const sectionItems = section ? filteredByKey[section] : mergedItems;
  const sectionLabel = section ? SECTIONS.find((s) => s.key === section)!.label : "General";
  const openNotif = openNotifId ? notifFeed.find((n) => n.id === openNotifId) ?? null : null;

  const isDark = snapshot.darkMode;
  const theme: Theme = {
    bg: isDark ? "bg-black" : "bg-white",
    text: isDark ? "text-[#e3e2e6]" : "text-[#1a1a1a]",
    border: isDark ? "border-white/10" : "border-black/10",
    hover: isDark ? "hover:bg-white/5" : "hover:bg-black/5",
    subtle: isDark ? "bg-white/5" : "bg-black/5",
    popoverBg: isDark ? "bg-zinc-900" : "bg-zinc-50",
    navInactive: isDark ? "text-zinc-300" : "text-zinc-700",
  };

  return (
    <div
      className="w-screen h-screen flex items-start justify-center overflow-hidden bg-transparent"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        animate={{
          width: expanded ? EXPANDED_SIZE.width : COLLAPSED_SIZE.width,
          height: expanded ? EXPANDED_SIZE.height : COLLAPSED_SIZE.height,
          // Arriba siempre en escuadra, colapsado o expandido: pegado al borde de la pantalla,
          // como si el panel expandido fuera "el dock cerrado, pero más grande" (punto 2 pedido),
          // no una tarjeta flotando separada con un hueco arriba.
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: expanded ? 28 : 20,
          borderBottomRightRadius: expanded ? 28 : 20,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className={`relative ${theme.bg} border ${theme.border} shadow-2xl overflow-hidden ${theme.text}`}
      >
        {/* Anillo que destella cuando llega una notificación nueva, colapsado o expandido. */}
        <AnimatePresence>
          {pulse && (
            <motion.div
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 ring-2 ring-primary"
              style={{ borderRadius: "inherit" }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {!expanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex items-center gap-2 px-3"
            >
              <Logo darkMode={isDark} size="xs" />
              <span className="text-sm font-semibold truncate">{statusText}</span>
              {todayPendingCount > 0 && <span className="ml-auto w-2 h-2 rounded-full bg-primary shrink-0" />}
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex h-full"
            >
              {/* Sidebar: perfil + secciones + mini calendario a la izquierda. */}
              <div className={`w-[190px] shrink-0 h-full border-r ${theme.border} flex flex-col p-3 gap-1`}>
                <div className={`flex items-center gap-2 px-1 pb-3 mb-1 border-b ${theme.border}`}>
                  {snapshot.profile.photoURL ? (
                    <img src={snapshot.profile.photoURL} alt={snapshot.profile.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {initials(snapshot.profile.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{snapshot.profile.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{statusText}</p>
                  </div>
                </div>

                {SECTIONS.map(({ key, label, icon: Icon }) => {
                  const count = filteredByKey[key].length;
                  const active = section === key;
                  return (
                    <motion.button
                      key={key}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleSectionClick(key)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                        active ? "bg-primary text-white" : `${theme.navInactive} ${theme.hover}`
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{label}</span>
                      {count > 0 && (
                        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${active ? "bg-white/25" : theme.subtle}`}>{count}</span>
                      )}
                    </motion.button>
                  );
                })}

                <div className="flex-1" />

                <MiniCalendar
                  month={calendarMonth}
                  selectedDate={selectedDate}
                  todayStr={todayStr}
                  theme={theme}
                  onSelect={setSelectedDate}
                  onMonthChange={setCalendarMonth}
                />

                <div className={`relative flex items-center gap-1 pt-2 border-t ${theme.border}`}>
                  <button
                    type="button"
                    title="Elegir monitor"
                    onClick={() => {
                      uiSounds.click();
                      setShowDisplayMenu((v) => !v);
                    }}
                    className={`p-1.5 rounded-lg text-zinc-400 hover:text-current ${theme.hover} transition-colors cursor-pointer`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Abrir app completa"
                    onClick={() => {
                      uiSounds.click();
                      bridgeRef.current?.openMain();
                    }}
                    className={`p-1.5 rounded-lg text-zinc-400 hover:text-current ${theme.hover} transition-colors cursor-pointer`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <AnimatePresence>
                    {showDisplayMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute bottom-full left-0 mb-2 w-44 ${theme.popoverBg} border ${theme.border} rounded-xl shadow-xl p-1 z-10`}
                      >
                        <p className="text-[10px] uppercase tracking-wide text-zinc-500 px-2 py-1">Monitor del dock</p>
                        {displays.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => handlePickDisplay(d.id)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${theme.hover} cursor-pointer`}
                          >
                            <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                              {d.selected && <Check className="w-3.5 h-3.5 text-primary" />}
                            </span>
                            <span className="truncate">{d.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Contenido: la sección elegida, o todas mezcladas si no hay ninguna. */}
              <div className="flex-1 h-full flex flex-col min-w-0 relative">
                <div className={`px-4 py-3 border-b ${theme.border} shrink-0 flex items-center justify-between gap-2`}>
                  <div>
                    <p className="text-sm font-bold">{sectionLabel}</p>
                    <p className="text-xs text-zinc-500">
                      {selectedDate === todayStr ? "Lo pendiente de hoy" : `Lo que cae el ${selectedDate.split("-").reverse().join("/")}`}
                    </p>
                  </div>
                  {/* Agregar contenido de esta sección sin abrir la app (punto 5 pedido): dispara el
                      mismo formulario de alta que ya usa el botón "Agendar" de Inicio, así queda
                      guardado y sincronizado exactamente igual en la app, la web y Android. */}
                  {section && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleSectionAdd(section)}
                      title={`Agregar en ${sectionLabel}`}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-white text-xs font-bold cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar
                    </motion.button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${section ?? "merged"}-${selectedDate}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-1.5"
                    >
                      {sectionItems.length === 0 ? (
                        <EmptyState />
                      ) : (
                        sectionItems.map((item, i) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            index={i}
                            theme={theme}
                            onClick={item.editKind ? () => handleItemClick(item.editKind, item.id) : undefined}
                          />
                        ))
                      )}

                      {!section && selectedDate === todayStr && notifFeed.length > 0 && (
                        <div className={`pt-2 mt-2 border-t ${theme.border}`}>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1 px-1 mb-1">
                            <Bell className="w-3 h-3" /> Notificaciones
                          </p>
                          {notifFeed.map((n, i) => (
                            <ItemRow
                              key={n.id}
                              item={{ id: n.id, title: n.title, subtitle: n.body, dateOnly: "", overdue: false, isToday: false, editKind: null }}
                              index={i}
                              theme={theme}
                              onClick={() => handleNotifClick(n)}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Detalle de notificación (punto 2 pedido): se abre con animación + sonido y muestra
                    toda la info que tenemos de esa notificación. */}
                <AnimatePresence>
                  {openNotif && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      className={`absolute inset-0 ${theme.bg} flex flex-col p-4`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase tracking-wide font-bold text-primary">
                          {CATEGORY_LABELS[openNotif.category] || openNotif.category}
                        </span>
                        <button type="button" onClick={handleCloseNotif} className={`p-1 rounded-lg ${theme.hover} cursor-pointer`}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-base font-bold mb-2">{openNotif.title}</p>
                      <p className="text-sm opacity-80 leading-relaxed flex-1 overflow-y-auto">{openNotif.body}</p>
                      <p className="text-[11px] text-zinc-500 pt-2">{timeAgo(openNotif.receivedAt)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
