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
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Home,
  Undo2,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  Snowflake,
  type LucideIcon,
} from "lucide-react";
import Logo from "./Logo";
import { AestheticStorageService } from "../lib/storage";
import { uiSounds } from "../lib/sounds";
import { getLocalDateString } from "../utils/date";
import { DOCK_ITEM_CAPABILITIES, type DockItem, type DockSectionKey, type DockSnapshot } from "../lib/dockSnapshot";

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
  receivedAt: number;
}

// Puente expuesto por electron/preload.cjs SOLO dentro de la ventana del dock — ver
// electron/main.cjs (createDockWindow) y electron/preload.cjs.
interface DockBridge {
  resize: (size: { width: number; height: number; collapsed: boolean }) => void;
  openMain: () => void;
  onSnapshot: (cb: (snapshot: DockSnapshot) => void) => () => void;
  onNotify: (cb: (payload: { title: string; body: string; category: string }) => void) => () => void;
  onVisibilityChange: (cb: (payload: { visible: boolean }) => void) => () => void;
  getDisplays: () => Promise<DockDisplayOption[]>;
  setDisplay: (displayId: number) => void;
  quickAdd: (category: string) => void;
  quickEdit: (category: string, itemId: string) => void;
  quickToggle: (kind: string, itemId: string) => void;
  quickDelete: (kind: string, itemId: string) => void;
}

function getDockBridge(): DockBridge | null {
  return (window as unknown as { FSR_ELECTRON_DOCK?: DockBridge }).FSR_ELECTRON_DOCK ?? null;
}

const SECTIONS: { key: DockSectionKey; label: string; icon: LucideIcon }[] = [
  { key: "finanzas", label: "Finanzas", icon: DollarSign },
  { key: "turnos", label: "Turnos", icon: CalendarClock },
  { key: "salud", label: "Salud", icon: HeartPulse },
  { key: "academico", label: "Académico", icon: GraduationCap },
];

const SECTION_ICON: Record<DockSectionKey, LucideIcon> = {
  finanzas: DollarSign,
  turnos: CalendarClock,
  salud: HeartPulse,
  academico: GraduationCap,
};

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
const SECTION_ADD_KEY: Record<DockSectionKey, string> = {
  finanzas: "finanzas",
  turnos: "turno",
  salud: "salud",
  academico: "universidad",
};

const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

const COLLAPSED_SIZE = { width: 200, height: 40 };
const EXPANDED_SIZE = { width: 680, height: 500 };
// Tamaño del aviso que se abre solo ante una notificación (punto 2 pedido, round 6) — "en
// pequeño", no el panel expandido entero.
const NOTIF_TOAST_SIZE = { width: 320, height: 104 };
// Cuánto se queda abierto el aviso antes de volver a cerrarse solo (si el mouse no está encima).
const NOTIF_TOAST_MS = 6000;
// Tiempo que espera antes de colapsar al sacar el mouse, para no cerrarse por un roce accidental.
const COLLAPSE_DELAY_MS = 350;
// La misma duración/curva la usan el resize del panel Y el crossfade del contenido — si no
// coinciden, el cierre se siente "cortado" en vez de una sola transición fluida (lo que se pidió
// arreglar: "cuando cierra el dock, no hay animación y además se ve poco fluido").
const PANEL_TRANSITION = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };
const CONTENT_TRANSITION = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

const EMPTY_SNAPSHOT: DockSnapshot = {
  generatedAt: 0,
  finanzas: [],
  turnos: [],
  salud: [],
  academico: [],
  themeColor: "#71717a",
  darkMode: true,
  profile: { name: "Usuario", photoURL: null },
};

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "U";
}

// "Hoy" = lo que vence puntualmente hoy + lo que no tiene fecha propia (ej. Salud) — sin arrastrar
// lo vencido de antes. Otro día elegido en el calendario = solo lo que cae justo en esa fecha.
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

function formatFechaLarga(dateOnly: string): string {
  if (!dateOnly) return "";
  const [y, m, d] = dateOnly.split("-");
  return d && m && y ? `${d}/${m}/${y}` : dateOnly;
}

function formatMonto(n?: number): string {
  if (n === undefined || n === null) return "";
  return `AR$${Number(n).toLocaleString("es-AR")}`;
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
  // Fondo general del dock: translúcido + blur (mica/acrylic en Windows, ver electron/main.cjs),
  // negro o blanco según el tema — todo lo que NO es uno de los bloques de abajo "flota" sobre
  // este fondo (punto 4 pedido, round 8).
  bg: string;
  text: string;
  border: string;
  hover: string;
  // El bloque sólido (perfil, cada botón de sección, calendario, notas, notificaciones — punto 2
  // pedido, round 8): negro o blanco liso según el tema, sin nada de transparencia, para que se
  // distinga con claridad del fondo translúcido detrás (punto 3 pedido).
  solidBlock: string;
  // Superficie secundaria DENTRO de un bloque sólido (ej. el botón "Marcar como pendiente" ya
  // tildado, el numerito de pendientes de cada sección) — un escalón más sutil que solidBlock,
  // no uno de los bloques principales de la lista.
  subtle: string;
  popoverBg: string;
  navInactive: string;
}

// Mismo mapeo de códigos WMO que ya usa src/components/WeatherWidget.tsx — se copia acá en vez
// de importarlo porque ese componente arrastra "country-state-city" (para resolver el perfil del
// usuario a coordenadas), que el dock no necesita: acá se pide la ubicación real en el momento
// (ver WeatherMini), no la ciudad que el usuario cargó en su perfil.
function getWeatherIcon(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return Snowflake;
  if (code >= 95) return CloudLightning;
  return Sun;
}

interface WeatherState {
  temp: number;
  code: number;
}

// Clima con la ubicación real del dispositivo en el momento (punto 6 pedido: "que tome
// automáticamente mi ubicación actual"), no la ciudad cargada en el perfil — por eso usa
// geolocalización del navegador en vez del mecanismo de WeatherWidget. Si el usuario no da
// permiso, o la ubicación tarda demasiado, simplemente no se muestra nada (el reloj solo sigue
// andando igual) — electron/main.cjs aprueba el permiso de geolocalización de entrada para que acá
// no haga falta pedirlo a mano cada vez.
function WeatherMini() {
  const [weather, setWeather] = useState<WeatherState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = () => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`
            );
            const data = await res.json();
            const cw = data?.current_weather;
            if (!cancelled && cw) {
              setWeather({ temp: Math.round(cw.temperature), code: cw.weathercode ?? 0 });
            }
          } catch {
            // Sin clima esta vez — no es crítico, el reloj sigue andando igual.
          }
        },
        () => {
          // Permiso denegado o ubicación no disponible — se deja sin mostrar nada.
        },
        { timeout: 8000, maximumAge: 10 * 60 * 1000 }
      );
    };

    fetchWeather();
    const id = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!weather) return null;
  const Icon = getWeatherIcon(weather.code);
  return (
    <span className="inline-flex items-center gap-1 text-sm text-zinc-400">
      <Icon className="w-4 h-4 text-primary" />
      {weather.temp}°C
    </span>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="text-center py-2.5 shrink-0">
      <p className="text-3xl font-bold tabular-nums leading-none">{time}</p>
      <div className="flex items-center justify-center gap-2 mt-1">
        <p className="text-xs text-zinc-500 capitalize">{date}</p>
        <WeatherMini />
      </div>
    </div>
  );
}

// Tarjeta de cada nota (punto 1 pedido, round 5): mismo estilo visual que ya tiene Finanzas en la
// app real (categoría/estado arriba, ícono + título, fecha, monto si corresponde, botones de
// acción) — pero aplicado DIRECTO en la lista de cada sección, no solo al abrir un detalle aparte.
function ItemRow({
  item,
  done,
  theme,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: DockItem;
  done: boolean;
  theme: Theme;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const caps = DOCK_ITEM_CAPABILITIES[item.kind];
  const Icon = SECTION_ICON[item.section];
  const sectionLabel = SECTIONS.find((s) => s.key === item.section)?.label ?? item.section;
  const statusLabel = done ? "Resuelto" : item.overdue ? "Vencido" : item.isToday ? "Hoy" : "Pendiente";
  const statusColor = done
    ? "bg-emerald-500/15 text-emerald-500"
    : item.overdue
    ? "bg-red-500/15 text-red-400"
    : item.isToday
    ? "bg-primary/20 text-primary"
    : "bg-amber-500/15 text-amber-500";
  const isFinanzas = item.kind === "detailedPayment" || item.kind === "invoice";

  // Un solo toque elimina directo (punto 4 pedido, round 6): la confirmación de doble toque que
  // había antes generaba la sensación de "el botón no funciona" si no se volvía a tocar a tiempo.
  const handleTrashClick = () => {
    uiSounds.delete();
    onDelete();
  };

  return (
    <motion.div
      onHoverStart={() => uiSounds.hover()}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.25 }}
      className={`rounded-xl border ${theme.border} ${theme.solidBlock} p-3 ${done ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[9px] uppercase tracking-wide font-bold text-primary bg-primary/15 rounded-full px-2 py-0.5 truncate max-w-[60%]">
          {sectionLabel}
        </span>
        <span className={`text-[9px] uppercase tracking-wide font-bold rounded-full px-2 py-0.5 shrink-0 ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="flex items-start gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-bold text-sm truncate ${done ? "line-through" : ""}`}>{item.title}</p>
          {item.dateOnly && (
            <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
              <CalendarIcon className="w-3 h-3" /> {formatFechaLarga(item.dateOnly)}
            </p>
          )}
          {!isFinanzas && item.subtitle && <p className="text-[11px] text-zinc-500 mt-0.5">{item.subtitle}</p>}
        </div>
        {isFinanzas && item.amount != null && <p className="font-bold text-sm shrink-0">{formatMonto(item.amount)}</p>}
      </div>

      {(caps.toggleable || caps.editable || caps.deletable) && (
        <div className="flex items-center gap-1.5">
          {caps.toggleable && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                uiSounds.save();
                uiSounds.toggle();
                onToggle();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 font-bold text-xs py-1.5 rounded-lg cursor-pointer ${
                done ? `${theme.subtle} ${theme.hover}` : "bg-primary text-white"
              }`}
            >
              {done ? <Undo2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              {done ? "Marcar como pendiente" : caps.toggleLabel}
            </motion.button>
          )}
          {caps.editable && (
            <button
              type="button"
              title="Editar en la app"
              onClick={() => {
                uiSounds.edit();
                onEdit();
              }}
              className={`p-2 rounded-lg ${theme.hover} cursor-pointer shrink-0`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {caps.deletable && (
            <button
              type="button"
              title="Eliminar"
              onClick={handleTrashClick}
              className={`p-2 rounded-lg cursor-pointer transition-colors shrink-0 text-red-400 ${theme.hover}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
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
  markedDates,
  onSelect,
  onMonthChange,
}: {
  month: Date;
  selectedDate: string;
  todayStr: string;
  theme: Theme;
  markedDates: Set<string>;
  onSelect: (dateOnly: string) => void;
  onMonthChange: (next: Date) => void;
}) {
  const first = startOfMonth(month);
  const startWeekday = first.getDay();
  const total = daysInMonth(month);
  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  const monthLabel = month.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className={`p-2.5 rounded-2xl border ${theme.border} ${theme.solidBlock}`}>
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
          const hasItems = markedDates.has(dateOnly);
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                uiSounds.selectDate();
                onSelect(dateOnly);
              }}
              className="relative flex flex-col items-center cursor-pointer"
            >
              <span
                className={`text-[10px] w-5 h-5 mx-auto rounded-full flex items-center justify-center transition-colors ${
                  isSelected ? "bg-primary text-white font-bold" : isToday ? "text-primary font-bold" : theme.hover
                }`}
              >
                {day}
              </span>
              {hasItems && !isSelected && <span className="w-1 h-1 rounded-full bg-primary -mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DockApp() {
  const [expanded, setExpanded] = useState(false);
  const [section, setSection] = useState<DockSectionKey | null>(null);
  const [snapshot, setSnapshot] = useState<DockSnapshot>(EMPTY_SNAPSHOT);
  const [notifFeed, setNotifFeed] = useState<NotifEntry[]>([]);
  const [openNotifId, setOpenNotifId] = useState<string | null>(null);
  // Aviso que se abre solo ante una notificación nueva (punto 2 pedido, round 6), sin que haga
  // falta pasar el mouse — null cuando no hay ninguno mostrándose.
  const [notifToast, setNotifToast] = useState<NotifEntry | null>(null);
  // Ids borrados desde acá mismo — se esconden al toque (ocultamiento optimista) mientras la
  // ventana principal confirma el borrado de verdad.
  const [locallyResolvedIds, setLocallyResolvedIds] = useState<Set<string>>(new Set());
  // Ids tildados/destildados desde acá — a diferencia del borrado, esto NO esconde el ítem (punto
  // 3 pedido: lo de hoy se sigue mostrando aunque ya esté resuelto), solo invierte su estado
  // "done" de forma optimista mientras se confirma de verdad.
  const [locallyToggledIds, setLocallyToggledIds] = useState<Set<string>>(new Set());
  const [pulse, setPulse] = useState(false);
  const [displays, setDisplays] = useState<DockDisplayOption[]>([]);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const todayStr = useMemo(() => getLocalDateString(), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const bridgeRef = useRef<DockBridge | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Espejo de "expanded" en un ref: el handler de notificaciones se registra una sola vez (ver
  // más abajo) y necesita leer el valor más reciente sin tener que re-suscribirse cada vez que
  // cambia (lo que reiniciaría la conexión con el bridge).
  const expandedRef = useRef(false);

  useEffect(() => {
    bridgeRef.current = getDockBridge();
  }, []);

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  // Bootstrap inicial (antes de que llegue el primer snapshot de la ventana principal): lee una
  // vez lo que ya haya en localStorage para no arrancar con el acento/tema por defecto un instante.
  useEffect(() => {
    document.documentElement.style.setProperty("--color-primary", AestheticStorageService.getThemeColor());
    document.documentElement.classList.toggle("dark", AestheticStorageService.getDarkMode());
  }, []);

  // El color de acento y el modo claro/oscuro los manda la ventana principal en cada snapshot.
  useEffect(() => {
    if (!snapshot.generatedAt) return;
    document.documentElement.style.setProperty("--color-primary", snapshot.themeColor);
    document.documentElement.classList.toggle("dark", snapshot.darkMode);
  }, [snapshot.themeColor, snapshot.darkMode, snapshot.generatedAt]);

  useEffect(() => {
    const bridge = getDockBridge();
    if (!bridge) return;
    const unsubSnapshot = bridge.onSnapshot((s) => {
      setSnapshot(s);
      // Ya se reflejó el cambio real — los overrides optimistas (ver handleToggleItem/
      // handleDeleteItem) dejan de hacer falta.
      setLocallyResolvedIds(new Set());
      setLocallyToggledIds(new Set());
    });
    const unsubNotify = bridge.onNotify((payload) => {
      uiSounds.notify();
      setPulse(true);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => setPulse(false), 1600);
      const entry: NotifEntry = {
        id: `${Date.now()}-${Math.random()}`,
        title: payload.title,
        body: payload.body,
        category: payload.category,
        receivedAt: Date.now(),
      };
      setNotifFeed((prev) => [entry, ...prev].slice(0, 12));

      // Punto 2 pedido (round 6): que la notificación no solo quede guardada en el feed, sino que
      // el dock se abra solo (en chico) y muestre qué es, sin que haga falta pasarle el mouse —
      // electron/main.cjs fuerza la ventana visible un rato aunque algo esté en pantalla completa
      // tapándola (ver dock-notify ahí). Si el usuario ya está con el panel grande abierto, no
      // hace falta el aviso chico: ya lo va a ver en la lista/el feed de abajo.
      if (!expandedRef.current) {
        if (notifToastTimerRef.current) clearTimeout(notifToastTimerRef.current);
        setNotifToast(entry);
        notifToastTimerRef.current = setTimeout(() => setNotifToast(null), NOTIF_TOAST_MS);
      }
    });
    // Punto 3.1 pedido (round 9): el main process decide solo (según lo que haya en pantalla)
    // cuándo mostrar/esconder el dock entero por el mecanismo de pantalla completa — la animación
    // de opacidad ya la hace electron/main.cjs sobre la ventana misma, acá solo hace falta el
    // sonido (mismo que ya usa el abrir/cerrar con el mouse, para que se sienta consistente).
    const unsubVisibility = bridge.onVisibilityChange(({ visible }) => {
      if (visible) uiSounds.expand();
      else uiSounds.collapse();
    });
    bridge
      .getDisplays()
      .then(setDisplays)
      .catch(() => {});
    return () => {
      unsubSnapshot();
      unsubNotify();
      unsubVisibility();
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      if (notifToastTimerRef.current) clearTimeout(notifToastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const size = expanded ? EXPANDED_SIZE : notifToast ? NOTIF_TOAST_SIZE : COLLAPSED_SIZE;
    bridgeRef.current?.resize({ ...size, collapsed: !expanded });
  }, [expanded, notifToast]);

  // Abrir/cerrar con el mouse: entra = se abre; sale = se cierra solo, con un pequeño margen de
  // tiempo para que no se cierre por pasar de largo sin querer. Las dos con sonido.
  const handleMouseEnter = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (!expanded) {
      uiSounds.expand();
      setExpanded(true);
      // El aviso chico ya cumplió su función (o el usuario entró directo al panel grande) — se
      // saca para no competir con el panel expandido.
      if (notifToastTimerRef.current) {
        clearTimeout(notifToastTimerRef.current);
        notifToastTimerRef.current = null;
      }
      setNotifToast(null);
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

  const handleSectionClick = (key: DockSectionKey) => {
    uiSounds.navigate();
    setSection((prev) => (prev === key ? null : key));
  };

  const handlePickDisplay = (id: number) => {
    uiSounds.click();
    bridgeRef.current?.setDisplay(id);
    setDisplays((prev) => prev.map((d) => ({ ...d, selected: d.id === id })));
    setShowDisplayMenu(false);
  };

  // Tildar (Pagar/Marcar realizado/Marcar hecha): invierte el check al toque (optimista) mientras
  // la ventana principal guarda el cambio de verdad — ver dock-quick-toggle en App.tsx. A
  // diferencia de la versión anterior, esto YA NO esconde el ítem (punto 3 pedido): lo de hoy se
  // sigue mostrando aunque ya esté resuelto, solo con el check tildado.
  const handleToggleItem = (item: DockItem) => {
    bridgeRef.current?.quickToggle(item.kind, item.id);
    setLocallyToggledIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  const handleEditItem = (item: DockItem) => {
    const category = DOCK_ITEM_CAPABILITIES[item.kind].editCategory;
    if (!category) return;
    bridgeRef.current?.quickEdit(category, item.id);
  };

  const handleDeleteItem = (item: DockItem) => {
    bridgeRef.current?.quickDelete(item.kind, item.id);
    setLocallyResolvedIds((prev) => new Set(prev).add(item.id));
  };

  const handleNotifClick = (n: NotifEntry) => {
    uiSounds.expand();
    setOpenNotifId(n.id);
  };

  const handleCloseNotif = () => {
    uiSounds.collapse();
    setOpenNotifId(null);
  };

  // Tocar el aviso chico que se abrió solo: pasa al panel grande mostrando esa misma notificación.
  const handleToastClick = (n: NotifEntry) => {
    if (notifToastTimerRef.current) {
      clearTimeout(notifToastTimerRef.current);
      notifToastTimerRef.current = null;
    }
    setNotifToast(null);
    uiSounds.expand();
    setExpanded(true);
    setOpenNotifId(n.id);
  };

  const handleSectionAdd = (key: DockSectionKey) => {
    uiSounds.click();
    bridgeRef.current?.quickAdd(SECTION_ADD_KEY[key]);
  };

  // Estado "resuelto" efectivo de un ítem, considerando el toggle optimista local (ver
  // handleToggleItem) — no se usa para decidir si se MUESTRA o no (eso ya no depende de esto,
  // punto 3 pedido), solo para cómo se ve (check tildado, tachado, etc.).
  const effectiveDone = (i: DockItem) => (locallyToggledIds.has(i.id) ? !i.done : i.done);

  // Filtrado por fecha: por default siempre "hoy" (lo que vence hoy, resuelto o no), salvo que se
  // elija otro día en el mini calendario — y se sacan los que se acaban de BORRAR desde acá mismo
  // (ocultamiento optimista, ver handleDeleteItem; tildar ya no esconde nada, ver handleToggleItem).
  const notDeleted = (i: DockItem) => !locallyResolvedIds.has(i.id);
  const finanzasF = useMemo(
    () => snapshot.finanzas.filter((i) => matchesDate(i, selectedDate, todayStr) && notDeleted(i)),
    [snapshot.finanzas, selectedDate, todayStr, locallyResolvedIds]
  );
  const turnosF = useMemo(
    () => snapshot.turnos.filter((i) => matchesDate(i, selectedDate, todayStr) && notDeleted(i)),
    [snapshot.turnos, selectedDate, todayStr, locallyResolvedIds]
  );
  const saludF = useMemo(
    () => snapshot.salud.filter((i) => matchesDate(i, selectedDate, todayStr) && notDeleted(i)),
    [snapshot.salud, selectedDate, todayStr, locallyResolvedIds]
  );
  const academicoF = useMemo(
    () => snapshot.academico.filter((i) => matchesDate(i, selectedDate, todayStr) && notDeleted(i)),
    [snapshot.academico, selectedDate, todayStr, locallyResolvedIds]
  );

  const filteredByKey: Record<DockSectionKey, DockItem[]> = {
    finanzas: finanzasF,
    turnos: turnosF,
    salud: saludF,
    academico: academicoF,
  };

  // El numerito de cada sección en la barra lateral cuenta solo lo PENDIENTE de verdad (no lo ya
  // resuelto que se sigue mostrando igual, ver punto 3 pedido).
  const pendingCountOf = (items: DockItem[]) => items.filter((i) => !effectiveDone(i)).length;

  // Inicio mezcla Finanzas/Turnos/Académico, respetando ese mismo orden (el de las secciones en la
  // barra lateral) — Salud queda afuera (punto 2 pedido, round 5): solo se ve en su propia sección,
  // porque mezclado en Inicio resulta molesto (son medicamentos "en tratamiento", no vencimientos).
  const mergedItems = useMemo(() => [...finanzasF, ...turnosF, ...academicoF].slice(0, 12), [finanzasF, turnosF, academicoF]);

  // El estado "ambiente" del pill colapsado siempre refleja lo pendiente de HOY (sin contar lo ya
  // resuelto), sin importar qué día esté elegido en el calendario del panel expandido.
  const todayPendingCount = useMemo(() => {
    const all = [...snapshot.finanzas, ...snapshot.turnos, ...snapshot.academico];
    return all.filter((i) => matchesDate(i, todayStr, todayStr) && notDeleted(i) && !effectiveDone(i)).length;
  }, [snapshot, todayStr, locallyResolvedIds, locallyToggledIds]);

  const statusText = useMemo(() => {
    if (todayPendingCount === 0) return "Al día";
    return `${todayPendingCount} pendiente${todayPendingCount === 1 ? "" : "s"}`;
  }, [todayPendingCount]);

  // Días con algo pendiente, para el puntito del mini calendario (punto 8 pedido).
  const markedDates = useMemo(() => {
    const all = [...snapshot.finanzas, ...snapshot.turnos, ...snapshot.academico];
    return new Set(all.map((i) => i.dateOnly).filter(Boolean));
  }, [snapshot]);

  // Lo ya resuelto se muestra, pero al final de la lista (no mezclado con lo que todavía falta).
  const sectionItems = useMemo(
    () => [...(section ? filteredByKey[section] : mergedItems)].sort((a, b) => Number(effectiveDone(a)) - Number(effectiveDone(b))),
    [section, filteredByKey, mergedItems, locallyToggledIds]
  );
  const sectionLabel = section ? SECTIONS.find((s) => s.key === section)!.label : "Inicio";
  const openNotif = openNotifId ? notifFeed.find((n) => n.id === openNotifId) ?? null : null;

  const isDark = snapshot.darkMode;
  const theme: Theme = {
    // Negro o blanco al 80% de opacidad + blur (punto 4 pedido, round 8) — en Windows, el blur de
    // verdad lo da backgroundMaterial: "acrylic" de la ventana (ver electron/main.cjs); esta clase
    // es el respaldo por CSS para cuando no está disponible (u otra plataforma).
    bg: isDark ? "bg-black/80 backdrop-blur-2xl" : "bg-white/80 backdrop-blur-2xl",
    text: isDark ? "text-[#e3e2e6]" : "text-[#1a1a1a]",
    border: isDark ? "border-white/10" : "border-black/10",
    hover: isDark ? "hover:bg-white/5" : "hover:bg-black/5",
    // Negro o blanco LISO (sin transparencia) para el perfil, cada botón de sección, el
    // calendario, las notas y las notificaciones (punto 2/3 pedidos, round 8) — se distingue del
    // fondo translúcido de arriba por ser opaco (sin blur de por medio) más el borde fino.
    solidBlock: isDark ? "bg-black" : "bg-white",
    subtle: isDark ? "bg-zinc-800" : "bg-zinc-100",
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
          width: expanded ? EXPANDED_SIZE.width : notifToast ? NOTIF_TOAST_SIZE.width : COLLAPSED_SIZE.width,
          height: expanded ? EXPANDED_SIZE.height : notifToast ? NOTIF_TOAST_SIZE.height : COLLAPSED_SIZE.height,
          // Arriba siempre en escuadra, colapsado o expandido: pegado al borde de la pantalla,
          // como si el panel expandido fuera "el dock cerrado, pero más grande", no una tarjeta
          // flotando separada con un hueco arriba.
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: expanded ? 28 : 20,
          borderBottomRightRadius: expanded ? 28 : 20,
        }}
        transition={PANEL_TRANSITION}
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

        <AnimatePresence mode="popLayout" initial={false}>
          {!expanded && notifToast ? (
            // Aviso que se abre solo ante una notificación nueva (punto 2 pedido, round 6):
            // electron/main.cjs ya se encargó de forzar la ventana visible aunque algo esté en
            // pantalla completa tapándola — acá solo hace falta mostrar qué es.
            <motion.div
              key="toast"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={CONTENT_TRANSITION}
              role="button"
              tabIndex={0}
              onClick={() => handleToastClick(notifToast)}
              className="w-full h-full flex items-start gap-2.5 px-3.5 py-3 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] uppercase tracking-wide font-bold text-primary truncate">
                    {CATEGORY_LABELS[notifToast.category] || notifToast.category}
                  </span>
                  <span className="text-[10px] text-zinc-500 shrink-0">{timeAgo(notifToast.receivedAt)}</span>
                </div>
                <p className="text-sm font-bold truncate">{notifToast.title}</p>
                <p className="text-xs opacity-70 line-clamp-2">{notifToast.body}</p>
              </div>
            </motion.div>
          ) : !expanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={CONTENT_TRANSITION}
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
              transition={CONTENT_TRANSITION}
              className="flex h-full"
            >
              {/* Sidebar: perfil + secciones + mini calendario, flotando sobre el fondo translúcido
                  del dock (punto 4 pedido) — cada uno de estos es su propio bloque sólido (punto
                  2/3 pedidos, round 8), no una franja separada por una línea. */}
              <div className="w-[190px] shrink-0 h-full flex flex-col p-2.5 gap-2 overflow-y-auto">
                <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${theme.border} ${theme.solidBlock}`}>
                  {snapshot.profile.photoURL ? (
                    <img src={snapshot.profile.photoURL} alt={snapshot.profile.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {initials(snapshot.profile.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{snapshot.profile.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{statusText}</p>
                  </div>
                </div>

                {/* Inicio + las 4 secciones son UN SOLO bloque (punto 1 pedido, round 9) — no 5
                    bloques sólidos separados, sino un único contenedor con los botones adentro. */}
                <div className={`flex flex-col gap-0.5 p-1.5 rounded-xl border ${theme.border} ${theme.solidBlock}`}>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      uiSounds.navigate();
                      setSection(null);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                      !section ? "bg-primary text-white" : `${theme.navInactive} ${theme.hover}`
                    }`}
                  >
                    <Home className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">Inicio</span>
                  </motion.button>

                  {SECTIONS.map(({ key, label, icon: Icon }) => {
                    const count = pendingCountOf(filteredByKey[key]);
                    const active = section === key;
                    return (
                      <motion.button
                        key={key}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleSectionClick(key)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
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
                </div>

                <div className="flex-1" />

                <MiniCalendar
                  month={calendarMonth}
                  selectedDate={selectedDate}
                  todayStr={todayStr}
                  theme={theme}
                  markedDates={markedDates}
                  onSelect={setSelectedDate}
                  onMonthChange={setCalendarMonth}
                />

                <div className="relative flex items-center gap-1">
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

              {/* Contenido: Inicio (reloj + todo mezclado) o la sección elegida. */}
              <div className="flex-1 h-full flex flex-col min-w-0 relative">
                {!section && <LiveClock />}

                <div className="px-4 py-3 shrink-0 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{sectionLabel}</p>
                    <p className="text-xs text-zinc-500">
                      {selectedDate === todayStr ? "Lo pendiente de hoy" : `Lo que cae el ${selectedDate.split("-").reverse().join("/")}`}
                    </p>
                  </div>
                  {/* Agregar contenido de esta sección sin abrir la app: dispara el mismo alta que
                      ya usa el botón "Agendar" de Inicio, así queda guardado y sincronizado igual
                      en la app, la web y Android. */}
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
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={`${section ?? "merged"}-${selectedDate}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={CONTENT_TRANSITION}
                      className="space-y-1.5"
                    >
                      {sectionItems.length === 0 ? (
                        <EmptyState />
                      ) : (
                        sectionItems.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            done={effectiveDone(item)}
                            theme={theme}
                            onToggle={() => handleToggleItem(item)}
                            onEdit={() => handleEditItem(item)}
                            onDelete={() => handleDeleteItem(item)}
                          />
                        ))
                      )}

                      {!section && selectedDate === todayStr && notifFeed.length > 0 && (
                        <div className={`pt-2 mt-2 border-t ${theme.border}`}>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1 px-1 mb-1">
                            <Bell className="w-3 h-3" /> Notificaciones
                          </p>
                          {notifFeed.map((n) => (
                            <motion.div
                              key={n.id}
                              onClick={() => handleNotifClick(n)}
                              onHoverStart={() => uiSounds.hover()}
                              whileHover={{ scale: 1.015 }}
                              initial={{ opacity: 0, y: 10 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                              transition={{ duration: 0.25 }}
                              role="button"
                              tabIndex={0}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm cursor-pointer border ${theme.border} ${theme.solidBlock}`}
                            >
                              <p className="font-semibold truncate">{n.title}</p>
                              <p className="text-xs opacity-70 truncate">{n.body}</p>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Detalle simple de notificación (no viene con la info estructurada que tiene un
                    DockItem real, así que se muestra como texto en vez de la tarjeta rica). */}
                <AnimatePresence>
                  {openNotif && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={CONTENT_TRANSITION}
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
