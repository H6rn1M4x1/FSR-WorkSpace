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
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music2,
  Battery,
  BatteryCharging,
  Timer,
  RotateCcw,
  Volume2,
  VolumeX,
  Minus,
  Power,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Moon,
  Mic,
  Video,
  Bluetooth,
  Clipboard,
  Camera,
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
// "Now Playing" de todo Windows (punto 2 pedido, round 11, inspirado en Dynamic Island for
// Windows) — lo arma electron/main.cjs vía PowerShell/WinRT (Windows.Media.Control), no esto. Ver
// MEDIA_PROBE_SCRIPT ahí para el porqué (y el "no se pudo probar contra una sesión real").
interface MediaInfo {
  hasSession: boolean;
  title?: string;
  artist?: string;
  album?: string;
  appId?: string;
  // GlobalSystemMediaTransportControlsSessionPlaybackStatus: 0 Closed, 1 Opened, 2 Changing,
  // 3 Stopped, 4 Playing, 5 Paused.
  status?: number;
  positionSeconds?: number;
  endSeconds?: number;
  // Portada/carátula (punto 1 pedido, round 12) — viene en base64 desde electron/main.cjs (lee el
  // Thumbnail de la sesión de medios vía WinRT), no es una URL.
  thumbnailBase64?: string;
  thumbnailContentType?: string;
}

function mediaThumbnailUri(media: MediaInfo | null | undefined): string | null {
  if (!media?.thumbnailBase64) return null;
  return `data:${media.thumbnailContentType || "image/jpeg"};base64,${media.thumbnailBase64}`;
}

// Bloq Mayús/Bloq Num y batería (punto 3 pedido, round 12, bloque 1 de "Dynamic Island for
// Windows") — vienen de electron/main.cjs (FOREGROUND_PROBE_SCRIPT/BATTERY_PROBE_SCRIPT), acá solo
// se muestran como indicadores chicos (ver StatusStrip).
interface KeyLockInfo {
  capsLockOn: boolean;
  numLockOn: boolean;
}

interface BatteryInfo {
  hasBattery: boolean;
  percent?: number;
  charging?: boolean;
}

// Resto de las funciones de Dynamic Island for Windows (punto pedido, round 14) — todo esto viene
// consolidado en un solo sondeo (SYSTEM_PROBE_SCRIPT en electron/main.cjs) para no spawnear un
// powershell.exe por cada función. Cada campo es opcional/nullable porque cada uno tiene su propio
// try/catch allá: si uno falla (ej. dndState, que usa una clave no documentada por Microsoft), el
// resto igual llega.
interface SystemInfo {
  clipboardSeq?: number;
  clipboardPreview?: string;
  lastScreenshotFile?: string;
  lastScreenshotTicks?: number;
  micInUse?: boolean | null;
  camInUse?: boolean | null;
  // GlobalSystemMediaTransportControlsSessionPlaybackStatus no aplica acá — esto es el estado de
  // Enfoque asistido/No molestar: 0 Desactivado, 1 Solo prioritarias, 2 Solo alarmas, 3 Horas
  // silenciosas; null = no se pudo leer (no es lo mismo que "desactivado").
  dndState?: number | null;
  volumePercent?: number;
  muted?: boolean;
  bluetoothDevices?: string[];
  cpuPercent?: number;
  ramPercent?: number;
  ramUsedGB?: number;
  ramTotalGB?: number;
  diskFreeGB?: number;
  diskTotalGB?: number;
  netDownKBs?: number;
  netUpKBs?: number;
}

function prettyDndState(state: number | null | undefined): string | null {
  if (state === null || state === undefined || state === 0) return null;
  if (state === 1) return "Solo prioritarias";
  if (state === 2) return "Solo alarmas";
  if (state === 3) return "Horas silenciosas";
  return "Activado";
}

interface DockBridge {
  resize: (size: { width: number; height: number; collapsed: boolean }) => void;
  openMain: () => void;
  onSnapshot: (cb: (snapshot: DockSnapshot) => void) => () => void;
  onNotify: (cb: (payload: { title: string; body: string; category: string }) => void) => () => void;
  onVisibilityChange: (cb: (payload: { visible: boolean }) => void) => () => void;
  onMediaUpdate: (cb: (payload: MediaInfo) => void) => () => void;
  mediaControl: (action: "playpause" | "next" | "previous") => void;
  onKeyLockUpdate: (cb: (payload: KeyLockInfo) => void) => () => void;
  onBatteryUpdate: (cb: (payload: BatteryInfo) => void) => () => void;
  // Resto de las funciones de Dynamic Island for Windows (punto pedido, round 14).
  onSystemUpdate: (cb: (payload: SystemInfo) => void) => () => void;
  volumeControl: (action: "up" | "down" | "mute") => void;
  // Fuerza al dock a mostrarse un rato aunque algo esté en pantalla completa tapándolo (punto 3
  // pedido, round 13) — igual mecanismo que ya usan las notificaciones de la agenda (dock-notify en
  // electron/main.cjs), generalizado para cualquier aviso que se origine DENTRO del propio dock
  // (Bloq Mayús/Num, cambio de canción, batería baja, foco) en vez de venir de la ventana principal.
  forceReveal: (ms: number) => void;
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
  // Avisos del propio sistema operativo (batería baja, etc. — punto 3 pedido, round 12, Dynamic
  // Island), no de una sección de la app.
  sistema: "Sistema",
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
// Pill chico animado mientras suena algo (punto 2 pedido, round 12) — un poco más ancho que
// COLLAPSED_SIZE para que entren la portada + el espectro decorativo + el título.
const MEDIA_MINI_SIZE = { width: 220, height: 40 };
// Aviso grande que se abre solo al cambiar lo que suena (punto 2.1 pedido, round 12) — misma idea
// que NOTIF_TOAST_SIZE/MS pero para música: se achica solo, no al pill por defecto sino al
// MEDIA_MINI_SIZE de arriba (sigue sonando algo).
const MEDIA_TOAST_SIZE = { width: 340, height: 172 };
const MEDIA_TOAST_MS = 5000;
// Aviso de Bloq Mayús/Bloq Num (punto 1/3 pedidos, round 13) — chico y breve, igual que el de la
// imagen de referencia de Dynamic Island for Windows.
const KEYLOCK_TOAST_SIZE = { width: 270, height: 56 };
const KEYLOCK_TOAST_MS = 2200;
// Aviso + pill del temporizador de foco (punto 2/3 pedidos, round 13).
const FOCUS_TOAST_SIZE = { width: 280, height: 130 };
const FOCUS_TOAST_MS = 2600;
const FOCUS_MINI_SIZE = { width: 170, height: 40 };
// Avisos del resto de las funciones de Dynamic Island (punto pedido, round 14) — todos chicos y
// breves, igual que el de Bloq Mayús/Num.
const VOLUME_TOAST_SIZE = { width: 260, height: 64 };
const VOLUME_TOAST_MS = 1800;
const CLIPBOARD_TOAST_SIZE = { width: 300, height: 70 };
const CLIPBOARD_TOAST_MS = 2400;
const SCREENSHOT_TOAST_SIZE = { width: 260, height: 64 };
const SCREENSHOT_TOAST_MS = 2400;
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

interface LyricLine {
  time: number;
  text: string;
}

// Letras en formato LRC ("[mm:ss.xx]texto" por línea) — LRCLIB (lrclib.net) es gratis, sin API key
// y sin login, por eso se eligió para el punto 2 pedido (round 11, letras sincronizadas).
function parseSyncedLyrics(raw: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const re = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/;
  for (const rawLine of raw.split("\n")) {
    const m = re.exec(rawLine.trim());
    if (!m) continue;
    const text = m[3].trim();
    if (text) lines.push({ time: Number(m[1]) * 60 + Number(m[2]), text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

// SourceAppUserModelId de WinRT no es un nombre lindo para mostrar (ej. "Google.Chrome" o un App
// User Model ID largo tipo "...!App") — se traducen los más comunes, el resto se muestra tal cual
// viene en vez de nada.
function prettyAppId(appId?: string): string | null {
  if (!appId) return null;
  const lower = appId.toLowerCase();
  if (lower.includes("chrome")) return "Chrome";
  if (lower.includes("msedge") || lower.includes("edge")) return "Edge";
  if (lower.includes("firefox")) return "Firefox";
  if (lower.includes("spotify")) return "Spotify";
  if (lower.includes("vlc")) return "VLC";
  if (lower.includes("itunes") || lower.includes("applemusic")) return "Apple Music";
  return appId;
}

function formatMediaTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const MEDIA_STATUS_PLAYING = 4;

// "Now Playing" de todo Windows, con letras sincronizadas (punto 2 pedido, round 11, inspirado en
// Dynamic Island for Windows) — el estado (qué suena, play/pausa, posición) viaja desde
// electron/main.cjs vía dock-media-update; acá solo se muestra y se estima la posición entre un
// sondeo y el siguiente (cada 2s) para que la barra/letra avancen fluido, no a los saltos.
function NowPlayingWidget({
  media,
  theme,
  onControl,
}: {
  media: MediaInfo | null;
  theme: Theme;
  onControl: (action: "playpause" | "next" | "previous") => void;
}) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const lyricsKeyRef = useRef<string>("");
  const anchorRef = useRef<{ position: number; at: number } | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!media?.hasSession) {
      anchorRef.current = null;
      return;
    }
    anchorRef.current = { position: media.positionSeconds ?? 0, at: Date.now() };
  }, [media?.positionSeconds, media?.status, media?.hasSession]);

  // Vuelve a pintar cada 500ms para que la barra de progreso y la línea de letra actual avancen
  // solas entre un sondeo de PowerShell y el siguiente, en vez de quedarse quietas 2 segundos.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!media?.hasSession || !media.title) {
      setLyrics([]);
      lyricsKeyRef.current = "";
      return;
    }
    const key = `${media.title}|${media.artist ?? ""}`;
    if (lyricsKeyRef.current === key) return;
    lyricsKeyRef.current = key;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ track_name: media.title ?? "", artist_name: media.artist ?? "" });
        const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
        if (!res.ok) throw new Error("lrclib miss");
        const data = await res.json();
        const raw = (data?.syncedLyrics as string | undefined) || "";
        if (!cancelled) setLyrics(raw ? parseSyncedLyrics(raw) : []);
      } catch {
        // Sin letra para este tema (no está en LRCLIB, o falló la red) — no es crítico, el widget
        // sigue mostrando título/artista y los controles igual.
        if (!cancelled) setLyrics([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [media?.title, media?.artist, media?.hasSession]);

  if (!media?.hasSession) return null;

  const isPlaying = media.status === MEDIA_STATUS_PLAYING;
  const estimatedPosition = anchorRef.current
    ? anchorRef.current.position + (isPlaying ? (Date.now() - anchorRef.current.at) / 1000 : 0)
    : media.positionSeconds ?? 0;
  const duration = media.endSeconds ?? 0;
  const progressPct = duration > 0 ? Math.min(100, Math.max(0, (estimatedPosition / duration) * 100)) : 0;
  const currentLyric = [...lyrics].reverse().find((l) => l.time <= estimatedPosition)?.text;

  const thumbnailUri = mediaThumbnailUri(media);

  return (
    <div className={`mx-3 mt-3 p-3 rounded-xl border ${theme.border} ${theme.solidBlock} shrink-0`}>
      <div className="flex items-center gap-2.5">
        {thumbnailUri ? (
          <img src={thumbnailUri} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Music2 className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{media.title || "Reproduciendo"}</p>
          <p className="text-xs text-zinc-500 truncate">
            {media.artist || "—"}
            {prettyAppId(media.appId) && <span className="opacity-70"> · {prettyAppId(media.appId)}</span>}
          </p>
        </div>
      </div>

      {currentLyric && <p className="text-xs text-primary font-semibold mt-2 text-center truncate">{currentLyric}</p>}

      {duration > 0 && (
        <div className="mt-2.5">
          <div className={`h-1 rounded-full overflow-hidden ${theme.subtle}`}>
            <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-zinc-500 tabular-nums">{formatMediaTime(estimatedPosition)}</span>
            <span className="text-[10px] text-zinc-500 tabular-nums">-{formatMediaTime(Math.max(0, duration - estimatedPosition))}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mt-2.5">
        <button
          type="button"
          onClick={() => {
            uiSounds.click();
            onControl("previous");
          }}
          className={`p-1.5 rounded-lg cursor-pointer ${theme.hover}`}
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            uiSounds.click();
            onControl("playpause");
          }}
          className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            uiSounds.click();
            onControl("next");
          }}
          className={`p-1.5 rounded-lg cursor-pointer ${theme.hover}`}
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Espectro de sonido decorativo (punto 2 pedido, round 12): barras animadas por CSS/framer-motion,
// NO un análisis de frecuencia real del audio — eso requeriría captura WASAPI loopback + FFT, un
// desarrollo nativo aparte mucho más grande que esto, que no se pidió explícitamente.
function EqualizerBars({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-end gap-[2px] h-3 ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-primary"
          animate={{ height: ["30%", "100%", "45%", "85%", "30%"] }}
          transition={{ duration: 0.9 + i * 0.15, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// Pill colapsado chico mientras algo está sonando (punto 2 pedido, round 12) — portada/ícono +
// título + espectro decorativo, en el mismo tamaño de pill que el estado por defecto (apenas más
// ancho, ver MEDIA_MINI_SIZE).
function MiniPlayingPill({ media, isDark }: { media: MediaInfo; isDark: boolean }) {
  const thumbnailUri = mediaThumbnailUri(media);
  return (
    <div className="w-full h-full flex items-center gap-2 px-3">
      {thumbnailUri ? (
        <img src={thumbnailUri} alt="" className="w-6 h-6 rounded-md object-cover shrink-0" />
      ) : (
        <Logo darkMode={isDark} size="xs" />
      )}
      <span className="text-sm font-semibold truncate flex-1">{media.title || "Reproduciendo"}</span>
      <EqualizerBars />
    </div>
  );
}

// Aviso grande que se abre solo al cambiar lo que suena (punto 2.1 pedido, round 12) — portada +
// título/artista/app de origen + progreso + controles, igual que NowPlayingWidget pero sin letra
// sincronizada (se cierra solo antes de que haga falta) y en el tamaño de MEDIA_TOAST_SIZE.
function MediaToastContent({
  media,
  theme,
  onControl,
}: {
  media: MediaInfo;
  theme: Theme;
  onControl: (action: "playpause" | "next" | "previous") => void;
}) {
  const thumbnailUri = mediaThumbnailUri(media);
  const isPlaying = media.status === MEDIA_STATUS_PLAYING;
  const duration = media.endSeconds ?? 0;
  const position = media.positionSeconds ?? 0;
  const progressPct = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;
  return (
    <div className="w-full h-full flex flex-col gap-2.5 px-4 py-3.5">
      <div className="flex items-center gap-3">
        {thumbnailUri ? (
          <img src={thumbnailUri} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Music2 className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{media.title || "Reproduciendo"}</p>
          <p className="text-xs text-zinc-500 truncate">
            {media.artist || "—"}
            {prettyAppId(media.appId) && <span className="opacity-70"> · Reproduciendo desde {prettyAppId(media.appId)}</span>}
          </p>
        </div>
        <EqualizerBars />
      </div>

      {duration > 0 && (
        <div className={`h-1 rounded-full overflow-hidden ${theme.subtle}`}>
          <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => {
            uiSounds.click();
            onControl("previous");
          }}
          className={`p-1.5 rounded-lg cursor-pointer ${theme.hover}`}
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            uiSounds.click();
            onControl("playpause");
          }}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            uiSounds.click();
            onControl("next");
          }}
          className={`p-1.5 rounded-lg cursor-pointer ${theme.hover}`}
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Bloq Mayús/Bloq Num + batería (punto 3 pedido, round 12, bloque 1 de Dynamic Island) — indicador
// chico, no un bloque sólido propio: flota junto al perfil igual que LiveClock, porque es
// información ambiente ("así está la PC ahora"), no uno de los 9 bloques ya fijados.
function StatusStrip({ battery, keyLock }: { battery: BatteryInfo | null; keyLock: KeyLockInfo | null }) {
  const showBattery = battery?.hasBattery && typeof battery.percent === "number";
  const showCaps = keyLock?.capsLockOn;
  const showNum = keyLock?.numLockOn;
  if (!showBattery && !showCaps && !showNum) return null;
  const low = showBattery && !battery!.charging && (battery!.percent as number) <= 20;
  return (
    <div className="flex items-center gap-1.5 px-1 shrink-0">
      {showBattery && (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${low ? "text-red-500" : "text-zinc-500"}`}>
          {battery!.charging ? <BatteryCharging className="w-3.5 h-3.5" /> : <Battery className="w-3.5 h-3.5" />}
          {battery!.percent}%
        </span>
      )}
      {showCaps && <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">MAYÚS</span>}
      {showNum && <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">NUM</span>}
    </div>
  );
}

const FOCUS_PRESETS_MIN = [25, 15, 5];

// Temporizador de foco (punto 2 pedido, round 13: "debería estar en Académico" + "si le doy a
// iniciar se cancela la acción") — el estado y el intervalo viven en DockApp (ver más abajo), NO
// acá: antes este componente los tenía adentro, y como solo se montaba con el panel expandido
// abierto en Inicio, al colapsarse el dock se desmontaba y la cuenta se perdía. Ahora este
// componente es solo la VISTA de ese estado (se muestra en la sección Académico), y la cuenta
// sigue corriendo aunque el dock esté chiquito (ver FocusMiniPill, el pill colapsado).
function FocusTimerWidget({
  theme,
  totalSeconds,
  remaining,
  running,
  onPick,
  onToggle,
  onReset,
}: {
  theme: Theme;
  totalSeconds: number;
  remaining: number;
  running: boolean;
  onPick: (minutes: number) => void;
  onToggle: () => void;
  onReset: () => void;
}) {
  const progressPct = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  return (
    <div className={`mx-3 mt-3 p-3 rounded-xl border ${theme.border} ${theme.solidBlock} shrink-0`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500">
          <Timer className="w-3.5 h-3.5" /> Foco
        </span>
        <span className="text-lg font-bold tabular-nums">{formatMediaTime(remaining)}</span>
      </div>
      <div className={`h-1 rounded-full overflow-hidden mt-2 ${theme.subtle}`}>
        <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-1">
          {FOCUS_PRESETS_MIN.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onPick(m)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                totalSeconds === m * 60 ? "bg-primary text-white" : theme.subtle
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onReset} className={`p-1.5 rounded-lg cursor-pointer ${theme.hover}`}>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer"
          >
            {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Pill colapsado chico mientras el temporizador de foco sigue corriendo (punto 2 pedido, round
// 13) — mismo rol que MiniPlayingPill, pero para el foco en vez de la música.
function FocusMiniPill({ remaining }: { remaining: number }) {
  return (
    <div className="w-full h-full flex items-center gap-2 px-3">
      <Timer className="w-4 h-4 text-primary shrink-0" />
      <span className="text-sm font-semibold truncate flex-1">Foco</span>
      <span className="text-sm font-bold tabular-nums">{formatMediaTime(remaining)}</span>
    </div>
  );
}

// Aviso grande al arrancar/pausar/terminar el temporizador (punto 2/3 pedidos, round 13) — mismo
// patrón que MediaToastContent: aparece un momento y después se achica solo al FocusMiniPill.
function FocusToastContent({ kind, remaining }: { kind: "start" | "pause" | "done"; remaining: number }) {
  const label = kind === "start" ? "Arrancó el foco" : kind === "pause" ? "Foco en pausa" : "¡Terminó el foco!";
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-4">
      <Timer className="w-6 h-6 text-primary" />
      <p className="text-sm font-bold text-center">{label}</p>
      {kind !== "done" && <p className="text-lg font-bold tabular-nums">{formatMediaTime(remaining)}</p>}
    </div>
  );
}

// Aviso al tocar Bloq Mayús/Bloq Num (punto 1/3 pedidos, round 13, al estilo Dynamic Island for
// Windows) — ícono con la letra/estado + nombre + Activado/Desactivado, igual que MediaToastContent
// pero para esto. Se fuerza visible aunque algo esté en pantalla completa (ver bridge.forceReveal).
function KeyLockToastContent({ kind, isOn }: { kind: "caps" | "num"; isOn: boolean }) {
  const label = kind === "caps" ? "Bloq Mayús" : "Bloq Num";
  return (
    <div className="w-full h-full flex items-center gap-2.5 px-3.5">
      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
        {kind === "caps" ? "A" : "1"}
      </div>
      <span className="text-sm font-semibold truncate flex-1">{label}</span>
      <span className={`text-xs font-bold shrink-0 ${isOn ? "text-primary" : "text-zinc-500"}`}>
        {isOn ? "Activado" : "Desactivado"}
      </span>
    </div>
  );
}

// Aviso al cambiar el volumen (punto pedido, round 14) — las teclas físicas de volumen las maneja
// Windows directo, el dock no se entera del toque en sí, solo nota que el nivel cambió en el
// siguiente sondeo (igual que Bloq Mayús/Num) y muestra esto.
function VolumeToastContent({ percent, muted }: { percent: number; muted: boolean }) {
  return (
    <div className="w-full h-full flex items-center gap-3 px-4">
      {muted ? <VolumeX className="w-5 h-5 text-zinc-500 shrink-0" /> : <Volume2 className="w-5 h-5 text-primary shrink-0" />}
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-zinc-500/20">
        <div className="h-full bg-primary rounded-full" style={{ width: `${muted ? 0 : percent}%` }} />
      </div>
      <span className="text-sm font-bold tabular-nums w-11 text-right">{muted ? "Mute" : `${percent}%`}</span>
    </div>
  );
}

// Aviso al copiar algo (punto pedido, round 14) — detectado por el número de secuencia del
// portapapeles de Windows (GetClipboardSequenceNumber), con una vista previa corta si es texto.
function ClipboardToastContent({ preview }: { preview?: string }) {
  return (
    <div className="w-full h-full flex items-center gap-2.5 px-3.5">
      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <Clipboard className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Copiado</p>
        {preview && <p className="text-xs text-zinc-500 truncate">{preview}</p>}
      </div>
    </div>
  );
}

// Aviso al guardarse una captura de pantalla nueva (punto pedido, round 14) — Win+ImprPant guarda
// solo en la carpeta de Capturas de Windows; se detecta mirando el archivo más nuevo ahí en cada
// sondeo, sin necesitar un proceso aparte corriendo todo el tiempo.
function ScreenshotToastContent({ fileName }: { fileName?: string }) {
  return (
    <div className="w-full h-full flex items-center gap-2.5 px-3.5">
      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <Camera className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Captura guardada</p>
        {fileName && <p className="text-xs text-zinc-500 truncate">{fileName}</p>}
      </div>
    </div>
  );
}

// Widget persistente en Inicio con el resto de las funciones de Dynamic Island (punto pedido,
// round 14) — a diferencia de los avisos de arriba (momentáneos), esto es ESTADO ambiente (cuánto
// volumen hay ahora, qué tan ocupada está la PC, qué está conectado por Bluetooth, si el micrófono/
// cámara están en uso, si está activado Enfoque asistido), por eso va como indicador siempre
// visible en vez de un aviso que aparece y desaparece.
function SystemStatusWidget({
  system,
  theme,
  onVolumeControl,
}: {
  system: SystemInfo | null;
  theme: Theme;
  onVolumeControl: (action: "up" | "down" | "mute") => void;
}) {
  if (!system) return null;
  const dndLabel = prettyDndState(system.dndState);
  const hasBt = (system.bluetoothDevices?.length ?? 0) > 0;
  const hasPrivacy = system.micInUse || system.camInUse;
  const hasBadges = hasBt || hasPrivacy || !!dndLabel;
  const hasVolume = typeof system.volumePercent === "number";
  const hasHardware =
    typeof system.cpuPercent === "number" ||
    typeof system.ramPercent === "number" ||
    typeof system.diskFreeGB === "number" ||
    typeof system.netDownKBs === "number";
  if (!hasVolume && !hasHardware && !hasBadges) return null;

  return (
    <div className={`mx-3 mt-3 p-3 rounded-xl border ${theme.border} ${theme.solidBlock} shrink-0 space-y-2.5`}>
      {hasVolume && (
        <div className="flex items-center gap-2">
          {system.muted ? (
            <VolumeX className="w-4 h-4 text-zinc-500 shrink-0" />
          ) : (
            <Volume2 className="w-4 h-4 text-primary shrink-0" />
          )}
          <div className={`flex-1 h-1 rounded-full overflow-hidden ${theme.subtle}`}>
            <div className="h-full bg-primary rounded-full" style={{ width: `${system.muted ? 0 : system.volumePercent}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-zinc-500 w-8 text-right shrink-0">
            {system.muted ? "Mute" : `${system.volumePercent}%`}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button type="button" onClick={() => onVolumeControl("down")} className={`p-1 rounded cursor-pointer ${theme.hover}`}>
              <Minus className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => onVolumeControl("mute")} className={`p-1 rounded cursor-pointer ${theme.hover}`}>
              <Power className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => onVolumeControl("up")} className={`p-1 rounded cursor-pointer ${theme.hover}`}>
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {hasHardware && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          {typeof system.cpuPercent === "number" && (
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-500">CPU</span>
              <span className="ml-auto font-semibold tabular-nums">{system.cpuPercent}%</span>
            </div>
          )}
          {typeof system.ramPercent === "number" && (
            <div className="flex items-center gap-1.5">
              <MemoryStick className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-500">RAM</span>
              <span className="ml-auto font-semibold tabular-nums">{system.ramPercent}%</span>
            </div>
          )}
          {typeof system.diskFreeGB === "number" && (
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-500">Disco</span>
              <span className="ml-auto font-semibold tabular-nums">{system.diskFreeGB}GB libres</span>
            </div>
          )}
          {typeof system.netDownKBs === "number" && (
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-500">Red</span>
              <span className="ml-auto font-semibold tabular-nums">
                ↓{system.netDownKBs} ↑{system.netUpKBs ?? 0} KB/s
              </span>
            </div>
          )}
        </div>
      )}

      {hasBadges && (
        <div className={`pt-2 border-t ${theme.border} flex flex-wrap items-center gap-1.5`}>
          {dndLabel && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold">
              <Moon className="w-3 h-3" /> {dndLabel}
            </span>
          )}
          {system.micInUse && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 text-[10px] font-bold">
              <Mic className="w-3 h-3" /> Mic
            </span>
          )}
          {system.camInUse && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 text-[10px] font-bold">
              <Video className="w-3 h-3" /> Cámara
            </span>
          )}
          {hasBt && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-500/15 text-zinc-500 text-[10px] font-bold truncate max-w-full">
              <Bluetooth className="w-3 h-3 shrink-0" /> {system.bluetoothDevices!.join(", ")}
            </span>
          )}
        </div>
      )}
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
  // "Now Playing" de todo Windows (punto 2 pedido, round 11) — null mientras no haya ninguna
  // sesión de medios activa.
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  // Aviso grande que se abre solo al cambiar lo que suena (punto 2.1 pedido, round 12) — true
  // mientras se muestra; se achica solo al pill animado chico (MiniPlayingPill), no al default.
  const [mediaToast, setMediaToast] = useState(false);
  // Bloq Mayús/Bloq Num + batería (punto 3 pedido, round 12, bloque 1 de Dynamic Island).
  const [keyLock, setKeyLock] = useState<KeyLockInfo | null>(null);
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  // Aviso chico al tocar Bloq Mayús/Num (punto 1/3 pedidos, round 13) — null = no se muestra nada.
  const [keyLockToast, setKeyLockToast] = useState<{ kind: "caps" | "num"; isOn: boolean } | null>(null);
  // Temporizador de foco (punto 2 pedido, round 13) — vive acá, NO en FocusTimerWidget, para que
  // siga corriendo aunque el dock esté colapsado (ver el comentario de FocusTimerWidget).
  const [focusTotal, setFocusTotal] = useState(FOCUS_PRESETS_MIN[0] * 60);
  const [focusRemaining, setFocusRemaining] = useState(FOCUS_PRESETS_MIN[0] * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  // Aviso grande al arrancar/pausar/terminar el foco (punto 2/3 pedidos, round 13) — null = no se
  // muestra nada; se achica solo a FocusMiniPill mientras focusRunning siga en true.
  const [focusToast, setFocusToast] = useState<"start" | "pause" | "done" | null>(null);
  // Resto de las funciones de Dynamic Island (punto pedido, round 14).
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [volumeToast, setVolumeToast] = useState<{ percent: number; muted: boolean } | null>(null);
  const [clipboardToast, setClipboardToast] = useState<{ preview?: string } | null>(null);
  const [screenshotToast, setScreenshotToast] = useState<{ fileName?: string } | null>(null);
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
  const mediaToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Última "clave" (título|artista) de lo que sonaba, para detectar cuándo CAMBIA (y no disparar
  // el aviso grande en cada sondeo de PowerShell, que llega cada 2s aunque no haya cambiado nada).
  const mediaTrackKeyRef = useRef<string>("");
  // Para avisar batería baja una sola vez por "episodio" (no en cada sondeo de 20s mientras sigue
  // baja) — se resetea solo cuando vuelve a cargar o sube por encima del umbral.
  const batteryLowAlertedRef = useRef(false);
  const keyLockToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Último estado conocido de Bloq Mayús/Num, para detectar cuál de los dos CAMBIÓ (y no disparar
  // el aviso en el primer sondeo que llega, que no es un cambio real sino el estado inicial).
  const prevKeyLockRef = useRef<KeyLockInfo | null>(null);
  const focusToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumeToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenshotToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Último estado conocido del sondeo de sistema, para detectar QUÉ cambió (volumen, portapapeles,
  // captura) — igual idea que prevKeyLockRef, no dispara nada en el primer sondeo (estado inicial).
  const prevSystemRef = useRef<SystemInfo | null>(null);
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

  // Cuenta regresiva del temporizador de foco (punto 2 pedido, round 13) — a propósito al nivel de
  // DockApp (siempre montado), no dentro de FocusTimerWidget (que solo se monta con el panel
  // expandido abierto en Académico): así la cuenta sigue corriendo aunque el dock se colapse.
  useEffect(() => {
    if (!focusRunning) return;
    focusIntervalRef.current = setInterval(() => {
      setFocusRemaining((r) => {
        if (r <= 1) {
          setFocusRunning(false);
          uiSounds.notify();
          if (focusToastTimerRef.current) clearTimeout(focusToastTimerRef.current);
          setFocusToast("done");
          bridgeRef.current?.forceReveal(FOCUS_TOAST_MS + 600);
          focusToastTimerRef.current = setTimeout(() => setFocusToast(null), FOCUS_TOAST_MS);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    };
  }, [focusRunning]);

  const handleFocusPick = (minutes: number) => {
    uiSounds.click();
    setFocusRunning(false);
    setFocusTotal(minutes * 60);
    setFocusRemaining(minutes * 60);
  };

  const handleFocusToggle = () => {
    if (focusRemaining <= 0) return;
    uiSounds.toggle();
    setFocusRunning((r) => {
      const next = !r;
      // Punto 2/3 pedidos (round 13): avisar grande al arrancar/pausar, aunque haya algo en
      // pantalla completa tapando el dock — se achica solo al pill chico (FocusMiniPill) mientras
      // siga corriendo.
      if (focusToastTimerRef.current) clearTimeout(focusToastTimerRef.current);
      setFocusToast(next ? "start" : "pause");
      bridgeRef.current?.forceReveal(FOCUS_TOAST_MS + 600);
      focusToastTimerRef.current = setTimeout(() => setFocusToast(null), FOCUS_TOAST_MS);
      return next;
    });
  };

  const handleFocusReset = () => {
    uiSounds.click();
    setFocusRunning(false);
    setFocusRemaining(focusTotal);
  };

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
    const unsubMedia = bridge.onMediaUpdate((info) => {
      setMediaInfo(info);
      const key = info?.hasSession ? `${info.title ?? ""}|${info.artist ?? ""}` : "";
      if (!key) {
        setMediaToast(false);
      } else if (key !== mediaTrackKeyRef.current && !expandedRef.current) {
        // Punto 2.1 pedido (round 12): cambió lo que suena (o arrancó a sonar algo) — se agranda
        // solo un toque, como el reproductor de la imagen de referencia, y después se achica solo
        // al pill animado chico (no al estado por defecto, porque sigue sonando algo).
        if (mediaToastTimerRef.current) clearTimeout(mediaToastTimerRef.current);
        setMediaToast(true);
        bridgeRef.current?.forceReveal(MEDIA_TOAST_MS + 600);
        mediaToastTimerRef.current = setTimeout(() => setMediaToast(false), MEDIA_TOAST_MS);
      }
      mediaTrackKeyRef.current = key;
    });
    const unsubKeyLock = bridge.onKeyLockUpdate((info) => {
      const prev = prevKeyLockRef.current;
      setKeyLock(info);
      // Punto 1/3 pedidos (round 13): aviso al estilo Dynamic Island al tocar Bloq Mayús/Num — pero
      // no en el primer sondeo que llega (ese es el estado inicial, no un cambio real).
      if (prev) {
        if (info.capsLockOn !== prev.capsLockOn) {
          if (keyLockToastTimerRef.current) clearTimeout(keyLockToastTimerRef.current);
          setKeyLockToast({ kind: "caps", isOn: info.capsLockOn });
          bridgeRef.current?.forceReveal(KEYLOCK_TOAST_MS + 600);
          keyLockToastTimerRef.current = setTimeout(() => setKeyLockToast(null), KEYLOCK_TOAST_MS);
        } else if (info.numLockOn !== prev.numLockOn) {
          if (keyLockToastTimerRef.current) clearTimeout(keyLockToastTimerRef.current);
          setKeyLockToast({ kind: "num", isOn: info.numLockOn });
          bridgeRef.current?.forceReveal(KEYLOCK_TOAST_MS + 600);
          keyLockToastTimerRef.current = setTimeout(() => setKeyLockToast(null), KEYLOCK_TOAST_MS);
        }
      }
      prevKeyLockRef.current = info;
    });
    const unsubBattery = bridge.onBatteryUpdate((info) => {
      setBattery(info);
      const isLow = info.hasBattery && !info.charging && typeof info.percent === "number" && info.percent <= 20;
      if (isLow && !batteryLowAlertedRef.current) {
        // Aviso de batería baja (punto 3 pedido, round 12) — reusa el mismo mecanismo de
        // notifToast que ya tienen las notificaciones de la agenda, en vez de uno nuevo aparte.
        batteryLowAlertedRef.current = true;
        uiSounds.notify();
        setPulse(true);
        if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = setTimeout(() => setPulse(false), 1600);
        const entry: NotifEntry = {
          id: `${Date.now()}-${Math.random()}`,
          title: "Batería baja",
          body: `Te queda ${info.percent}% de batería — conectá el cargador.`,
          category: "sistema",
          receivedAt: Date.now(),
        };
        setNotifFeed((prev) => [entry, ...prev].slice(0, 12));
        if (!expandedRef.current) {
          if (notifToastTimerRef.current) clearTimeout(notifToastTimerRef.current);
          setNotifToast(entry);
          bridgeRef.current?.forceReveal(NOTIF_TOAST_MS + 600);
          notifToastTimerRef.current = setTimeout(() => setNotifToast(null), NOTIF_TOAST_MS);
        }
      } else if (!isLow) {
        batteryLowAlertedRef.current = false;
      }
    });
    // Resto de las funciones de Dynamic Island (punto pedido, round 14) — volumen/portapapeles/
    // captura son avisos momentáneos (se detecta el CAMBIO, igual que Bloq Mayús/Num); privacidad/
    // No molestar/Bluetooth/hardware son estado ambiente, no disparan nada acá, solo actualizan
    // systemInfo (ver SystemStatusWidget).
    const unsubSystem = bridge.onSystemUpdate((info) => {
      const prev = prevSystemRef.current;
      setSystemInfo(info);

      if (prev && typeof info.volumePercent === "number" && (info.volumePercent !== prev.volumePercent || info.muted !== prev.muted)) {
        if (volumeToastTimerRef.current) clearTimeout(volumeToastTimerRef.current);
        setVolumeToast({ percent: info.volumePercent, muted: !!info.muted });
        bridgeRef.current?.forceReveal(VOLUME_TOAST_MS + 600);
        volumeToastTimerRef.current = setTimeout(() => setVolumeToast(null), VOLUME_TOAST_MS);
      }

      if (
        prev &&
        typeof info.clipboardSeq === "number" &&
        typeof prev.clipboardSeq === "number" &&
        info.clipboardSeq !== prev.clipboardSeq
      ) {
        if (clipboardToastTimerRef.current) clearTimeout(clipboardToastTimerRef.current);
        setClipboardToast({ preview: info.clipboardPreview });
        bridgeRef.current?.forceReveal(CLIPBOARD_TOAST_MS + 600);
        clipboardToastTimerRef.current = setTimeout(() => setClipboardToast(null), CLIPBOARD_TOAST_MS);
      }

      if (
        prev &&
        typeof info.lastScreenshotTicks === "number" &&
        info.lastScreenshotTicks !== prev.lastScreenshotTicks
      ) {
        if (screenshotToastTimerRef.current) clearTimeout(screenshotToastTimerRef.current);
        setScreenshotToast({ fileName: info.lastScreenshotFile });
        bridgeRef.current?.forceReveal(SCREENSHOT_TOAST_MS + 600);
        screenshotToastTimerRef.current = setTimeout(() => setScreenshotToast(null), SCREENSHOT_TOAST_MS);
      }

      prevSystemRef.current = info;
    });
    bridge
      .getDisplays()
      .then(setDisplays)
      .catch(() => {});
    return () => {
      unsubSnapshot();
      unsubNotify();
      unsubMedia();
      unsubKeyLock();
      unsubBattery();
      unsubSystem();
      unsubVisibility();
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (keyLockToastTimerRef.current) clearTimeout(keyLockToastTimerRef.current);
      if (focusToastTimerRef.current) clearTimeout(focusToastTimerRef.current);
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      if (notifToastTimerRef.current) clearTimeout(notifToastTimerRef.current);
      if (mediaToastTimerRef.current) clearTimeout(mediaToastTimerRef.current);
      if (volumeToastTimerRef.current) clearTimeout(volumeToastTimerRef.current);
      if (clipboardToastTimerRef.current) clearTimeout(clipboardToastTimerRef.current);
      if (screenshotToastTimerRef.current) clearTimeout(screenshotToastTimerRef.current);
    };
  }, []);

  // Prioridad del pill colapsado (punto 2 pedido, round 12, extendida rounds 13/14): notificación >
  // Bloq Mayús/Num > volumen > portapapeles > captura > "cambió la música" > aviso del foco > pill
  // de música sonando > pill del foco corriendo > estado por defecto.
  const collapsedVariant:
    | "notif"
    | "keylock"
    | "volume"
    | "clipboard"
    | "screenshot"
    | "mediaToast"
    | "focusToast"
    | "miniPlaying"
    | "focusMini"
    | "default" = notifToast
    ? "notif"
    : keyLockToast
    ? "keylock"
    : volumeToast
    ? "volume"
    : clipboardToast
    ? "clipboard"
    : screenshotToast
    ? "screenshot"
    : mediaToast && mediaInfo?.hasSession
    ? "mediaToast"
    : focusToast
    ? "focusToast"
    : mediaInfo?.hasSession
    ? "miniPlaying"
    : focusRunning
    ? "focusMini"
    : "default";

  useEffect(() => {
    const size = expanded
      ? EXPANDED_SIZE
      : collapsedVariant === "notif"
      ? NOTIF_TOAST_SIZE
      : collapsedVariant === "keylock"
      ? KEYLOCK_TOAST_SIZE
      : collapsedVariant === "volume"
      ? VOLUME_TOAST_SIZE
      : collapsedVariant === "clipboard"
      ? CLIPBOARD_TOAST_SIZE
      : collapsedVariant === "screenshot"
      ? SCREENSHOT_TOAST_SIZE
      : collapsedVariant === "mediaToast"
      ? MEDIA_TOAST_SIZE
      : collapsedVariant === "focusToast"
      ? FOCUS_TOAST_SIZE
      : collapsedVariant === "miniPlaying"
      ? MEDIA_MINI_SIZE
      : collapsedVariant === "focusMini"
      ? FOCUS_MINI_SIZE
      : COLLAPSED_SIZE;
    bridgeRef.current?.resize({ ...size, collapsed: !expanded });
  }, [expanded, collapsedVariant]);

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
      if (mediaToastTimerRef.current) {
        clearTimeout(mediaToastTimerRef.current);
        mediaToastTimerRef.current = null;
      }
      setMediaToast(false);
      if (volumeToastTimerRef.current) {
        clearTimeout(volumeToastTimerRef.current);
        volumeToastTimerRef.current = null;
      }
      setVolumeToast(null);
      if (clipboardToastTimerRef.current) {
        clearTimeout(clipboardToastTimerRef.current);
        clipboardToastTimerRef.current = null;
      }
      setClipboardToast(null);
      if (screenshotToastTimerRef.current) {
        clearTimeout(screenshotToastTimerRef.current);
        screenshotToastTimerRef.current = null;
      }
      setScreenshotToast(null);
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

  const handleMediaControl = (action: "playpause" | "next" | "previous") => {
    bridgeRef.current?.mediaControl(action);
  };

  const handleVolumeControl = (action: "up" | "down" | "mute") => {
    uiSounds.click();
    bridgeRef.current?.volumeControl(action);
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
          width: expanded
            ? EXPANDED_SIZE.width
            : collapsedVariant === "notif"
            ? NOTIF_TOAST_SIZE.width
            : collapsedVariant === "keylock"
            ? KEYLOCK_TOAST_SIZE.width
            : collapsedVariant === "volume"
            ? VOLUME_TOAST_SIZE.width
            : collapsedVariant === "clipboard"
            ? CLIPBOARD_TOAST_SIZE.width
            : collapsedVariant === "screenshot"
            ? SCREENSHOT_TOAST_SIZE.width
            : collapsedVariant === "mediaToast"
            ? MEDIA_TOAST_SIZE.width
            : collapsedVariant === "focusToast"
            ? FOCUS_TOAST_SIZE.width
            : collapsedVariant === "miniPlaying"
            ? MEDIA_MINI_SIZE.width
            : collapsedVariant === "focusMini"
            ? FOCUS_MINI_SIZE.width
            : COLLAPSED_SIZE.width,
          height: expanded
            ? EXPANDED_SIZE.height
            : collapsedVariant === "notif"
            ? NOTIF_TOAST_SIZE.height
            : collapsedVariant === "keylock"
            ? KEYLOCK_TOAST_SIZE.height
            : collapsedVariant === "volume"
            ? VOLUME_TOAST_SIZE.height
            : collapsedVariant === "clipboard"
            ? CLIPBOARD_TOAST_SIZE.height
            : collapsedVariant === "screenshot"
            ? SCREENSHOT_TOAST_SIZE.height
            : collapsedVariant === "mediaToast"
            ? MEDIA_TOAST_SIZE.height
            : collapsedVariant === "focusToast"
            ? FOCUS_TOAST_SIZE.height
            : collapsedVariant === "miniPlaying"
            ? MEDIA_MINI_SIZE.height
            : collapsedVariant === "focusMini"
            ? FOCUS_MINI_SIZE.height
            : COLLAPSED_SIZE.height,
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
          ) : !expanded && collapsedVariant === "keylock" && keyLockToast ? (
            // Aviso al tocar Bloq Mayús/Bloq Num (punto 1/3 pedidos, round 13).
            <motion.div key="keylock-toast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={CONTENT_TRANSITION} className="w-full h-full">
              <KeyLockToastContent kind={keyLockToast.kind} isOn={keyLockToast.isOn} />
            </motion.div>
          ) : !expanded && collapsedVariant === "volume" && volumeToast ? (
            // Aviso al cambiar el volumen (punto pedido, round 14).
            <motion.div key="volume-toast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={CONTENT_TRANSITION} className="w-full h-full">
              <VolumeToastContent percent={volumeToast.percent} muted={volumeToast.muted} />
            </motion.div>
          ) : !expanded && collapsedVariant === "clipboard" && clipboardToast ? (
            // Aviso al copiar algo (punto pedido, round 14).
            <motion.div key="clipboard-toast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={CONTENT_TRANSITION} className="w-full h-full">
              <ClipboardToastContent preview={clipboardToast.preview} />
            </motion.div>
          ) : !expanded && collapsedVariant === "screenshot" && screenshotToast ? (
            // Aviso al guardarse una captura de pantalla nueva (punto pedido, round 14).
            <motion.div key="screenshot-toast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={CONTENT_TRANSITION} className="w-full h-full">
              <ScreenshotToastContent fileName={screenshotToast.fileName} />
            </motion.div>
          ) : !expanded && collapsedVariant === "mediaToast" && mediaInfo?.hasSession ? (
            // Aviso grande que se abre solo al cambiar lo que suena (punto 2.1 pedido, round 12).
            <motion.div key="media-toast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={CONTENT_TRANSITION} className="w-full h-full">
              <MediaToastContent media={mediaInfo} theme={theme} onControl={handleMediaControl} />
            </motion.div>
          ) : !expanded && collapsedVariant === "focusToast" && focusToast ? (
            // Aviso al arrancar/pausar/terminar el foco (punto 2/3 pedidos, round 13).
            <motion.div key="focus-toast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={CONTENT_TRANSITION} className="w-full h-full">
              <FocusToastContent kind={focusToast} remaining={focusRemaining} />
            </motion.div>
          ) : !expanded && collapsedVariant === "miniPlaying" && mediaInfo?.hasSession ? (
            // Pill chico animado mientras sigue sonando algo (punto 2 pedido, round 12).
            <motion.div key="media-mini" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={CONTENT_TRANSITION} className="w-full h-full">
              <MiniPlayingPill media={mediaInfo} isDark={isDark} />
            </motion.div>
          ) : !expanded && collapsedVariant === "focusMini" ? (
            // Pill chico mientras el foco sigue corriendo (punto 2 pedido, round 13) — así no se
            // pierde la cuenta al colapsar el dock ("se cancela la acción" reportado).
            <motion.div key="focus-mini" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={CONTENT_TRANSITION} className="w-full h-full">
              <FocusMiniPill remaining={focusRemaining} />
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

                <StatusStrip battery={battery} keyLock={keyLock} />

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
                {!section && <NowPlayingWidget media={mediaInfo} theme={theme} onControl={handleMediaControl} />}
                {!section && <SystemStatusWidget system={systemInfo} theme={theme} onVolumeControl={handleVolumeControl} />}
                {/* El foco va en Académico, no en Inicio (punto 2 pedido, round 13) — el estado
                    vive en DockApp (ver más arriba), este componente es solo la vista. */}
                {section === "academico" && (
                  <FocusTimerWidget
                    theme={theme}
                    totalSeconds={focusTotal}
                    remaining={focusRemaining}
                    running={focusRunning}
                    onPick={handleFocusPick}
                    onToggle={handleFocusToggle}
                    onReset={handleFocusReset}
                  />
                )}

                {/* Título de la sección como su propio bloque sólido (punto 1 pedido, round 11) —
                    antes flotaba directo sobre el fondo translúcido, sin bloque. */}
                <div
                  className={`mx-3 mt-3 px-4 py-3 rounded-xl border ${theme.border} ${theme.solidBlock} shrink-0 flex items-center justify-between gap-2`}
                >
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
