import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DollarSign, CalendarClock, HeartPulse, GraduationCap, ExternalLink, Bell, Monitor, Check } from "lucide-react";
import Logo from "./Logo";
import { AestheticStorageService } from "../lib/storage";
import { uiSounds } from "../lib/sounds";
import type { DockItem, DockSnapshot } from "../lib/dockSnapshot";

interface DockDisplayOption {
  id: number;
  label: string;
  selected: boolean;
}

// Puente expuesto por electron/preload.cjs SOLO dentro de la ventana del dock — ver
// electron/main.cjs (createDockWindow) y electron/preload.cjs.
interface DockBridge {
  resize: (size: { width: number; height: number; collapsed: boolean }) => void;
  openMain: () => void;
  onSnapshot: (cb: (snapshot: DockSnapshot) => void) => () => void;
  onNotify: (cb: (payload: { title: string; body: string; category: string }) => void) => () => void;
  getDisplays: () => Promise<DockDisplayOption[]>;
  setDisplay: (displayId: number) => void;
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

const COLLAPSED_SIZE = { width: 200, height: 40 };
const EXPANDED_SIZE = { width: 680, height: 400 };
// Tiempo que espera antes de colapsar al sacar el mouse, para no cerrarse por un roce accidental.
const COLLAPSE_DELAY_MS = 350;

const EMPTY_SNAPSHOT: DockSnapshot = {
  generatedAt: 0,
  finanzas: [],
  turnos: [],
  salud: [],
  academico: [],
  urgentCount: 0,
  counts: { finanzas: 0, turnos: 0, salud: 0, academico: 0 },
  themeColor: "#8ab4f8",
  darkMode: true,
  profile: { name: "Usuario", photoURL: null },
};

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "U";
}

function ItemRow({ item, index }: { item: DockItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.035, 0.3) }}
      className={`px-3 py-2 rounded-xl text-sm ${
        item.overdue
          ? "bg-red-500/10 text-red-300"
          : item.isToday
          ? "bg-primary/10 text-white"
          : "bg-white/5 text-zinc-300"
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
      Nada por acá, todo al día.
    </motion.p>
  );
}

export default function DockApp() {
  const [expanded, setExpanded] = useState(false);
  const [section, setSection] = useState<SectionKey | null>(null);
  const [snapshot, setSnapshot] = useState<DockSnapshot>(EMPTY_SNAPSHOT);
  const [notifFeed, setNotifFeed] = useState<{ id: string; title: string; body: string }[]>([]);
  const [pulse, setPulse] = useState(false);
  const [displays, setDisplays] = useState<DockDisplayOption[]>([]);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
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

  // El color de acento y el modo oscuro los manda la ventana principal en cada snapshot (punto 1
  // pedido: que el dock lo detecte y lo aplique solo, sin configurarlo acá aparte).
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
        [{ id: `${Date.now()}-${Math.random()}`, title: payload.title, body: payload.body }, ...prev].slice(0, 12)
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

  const statusText = useMemo(() => {
    if (snapshot.urgentCount === 0) return "Al día";
    return `${snapshot.urgentCount} pendiente${snapshot.urgentCount === 1 ? "" : "s"}`;
  }, [snapshot.urgentCount]);

  // "Si no selecciono nada, mezcla todas las secciones" — sin sección elegida se combinan todas.
  const mergedItems: DockItem[] = useMemo(
    () => [...snapshot.finanzas, ...snapshot.turnos, ...snapshot.salud, ...snapshot.academico].slice(0, 8),
    [snapshot]
  );

  const sectionItems = section ? snapshot[section] : mergedItems;
  const sectionLabel = section ? SECTIONS.find((s) => s.key === section)!.label : "General";

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
          borderTopLeftRadius: expanded ? 24 : 0,
          borderTopRightRadius: expanded ? 24 : 0,
          borderBottomLeftRadius: expanded ? 24 : 20,
          borderBottomRightRadius: expanded ? 24 : 20,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="relative bg-black border border-white/10 shadow-2xl overflow-hidden text-[#e3e2e6]"
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
              <Logo darkMode={snapshot.darkMode} size="xs" />
              <span className="text-sm font-semibold truncate">{statusText}</span>
              {snapshot.urgentCount > 0 && <span className="ml-auto w-2 h-2 rounded-full bg-primary shrink-0" />}
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
              {/* Sidebar: perfil + secciones a la izquierda (punto 4 y 8 pedidos). */}
              <div className="w-[190px] shrink-0 h-full border-r border-white/10 flex flex-col p-3 gap-1">
                <div className="flex items-center gap-2 px-1 pb-3 mb-1 border-b border-white/10">
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
                  const count = snapshot.counts[key];
                  const active = section === key;
                  return (
                    <motion.button
                      key={key}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleSectionClick(key)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                        active ? "bg-primary text-white" : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{label}</span>
                      {count > 0 && (
                        <span
                          className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                            active ? "bg-white/25" : "bg-white/10 text-zinc-300"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </motion.button>
                  );
                })}

                <div className="flex-1" />

                <div className="relative flex items-center gap-1 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    title="Elegir monitor"
                    onClick={() => setShowDisplayMenu((v) => !v)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Abrir app completa"
                    onClick={() => bridgeRef.current?.openMain()}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
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
                        className="absolute bottom-full left-0 mb-2 w-44 bg-zinc-900 border border-white/10 rounded-xl shadow-xl p-1 z-10"
                      >
                        <p className="text-[10px] uppercase tracking-wide text-zinc-500 px-2 py-1">Monitor del dock</p>
                        {displays.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => handlePickDisplay(d.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
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

              {/* Contenido: la sección elegida, o todas mezcladas si no hay ninguna (punto 4). */}
              <div className="flex-1 h-full flex flex-col min-w-0">
                <div className="px-4 py-3 border-b border-white/10 shrink-0">
                  <p className="text-sm font-bold">{sectionLabel}</p>
                  <p className="text-xs text-zinc-500">Lo que vence hoy o pronto</p>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={section ?? "merged"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-1.5"
                    >
                      {sectionItems.length === 0 ? (
                        <EmptyState />
                      ) : (
                        sectionItems.map((item, i) => <ItemRow key={item.id} item={item} index={i} />)
                      )}

                      {!section && notifFeed.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-white/10">
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1 px-1 mb-1">
                            <Bell className="w-3 h-3" /> Notificaciones
                          </p>
                          {notifFeed.map((n, i) => (
                            <ItemRow key={n.id} item={{ id: n.id, title: n.title, subtitle: n.body, overdue: false, isToday: false }} index={i} />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
