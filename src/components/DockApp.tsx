import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Home, DollarSign, CalendarClock, HeartPulse, GraduationCap, ExternalLink, Bell } from "lucide-react";
import Logo from "./Logo";
import { AestheticStorageService } from "../lib/storage";
import type { DockItem, DockSnapshot } from "../lib/dockSnapshot";

// Puente expuesto por electron/preload.cjs SOLO dentro de la ventana del dock — ver
// electron/main.cjs (createDockWindow) y electron/preload.cjs.
interface DockBridge {
  resize: (size: { width: number; height: number }) => void;
  openMain: () => void;
  onSnapshot: (cb: (snapshot: DockSnapshot) => void) => () => void;
  onNotify: (cb: (payload: { title: string; body: string; category: string }) => void) => () => void;
}

function getDockBridge(): DockBridge | null {
  return (window as unknown as { FSR_ELECTRON_DOCK?: DockBridge }).FSR_ELECTRON_DOCK ?? null;
}

type TabKey = "inicio" | "finanzas" | "turnos" | "salud" | "academico";

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "inicio", label: "Inicio", icon: Home },
  { key: "finanzas", label: "Finanzas", icon: DollarSign },
  { key: "turnos", label: "Turnos", icon: CalendarClock },
  { key: "salud", label: "Salud", icon: HeartPulse },
  { key: "academico", label: "Académico", icon: GraduationCap },
];

const COLLAPSED_SIZE = { width: 220, height: 48 };
const EXPANDED_SIZE = { width: 340, height: 440 };

const EMPTY_SNAPSHOT: DockSnapshot = {
  generatedAt: 0,
  finanzas: [],
  turnos: [],
  salud: [],
  academico: [],
  urgentCount: 0,
};

function ItemRow({ item }: { item: DockItem }) {
  return (
    <div
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
    </div>
  );
}

function EmptyState() {
  return <p className="text-xs text-zinc-500 text-center py-6">Nada por acá, todo al día.</p>;
}

export default function DockApp() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("inicio");
  const [snapshot, setSnapshot] = useState<DockSnapshot>(EMPTY_SNAPSHOT);
  const [notifFeed, setNotifFeed] = useState<{ id: string; title: string; body: string }[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const bridgeRef = useRef<DockBridge | null>(null);

  useEffect(() => {
    bridgeRef.current = getDockBridge();
  }, []);

  // Replica el bootstrap de color/tema que en la ventana principal hace App.tsx — acá no se monta
  // ese componente, así que el dock tiene que leer y aplicar lo mismo por su cuenta.
  useEffect(() => {
    const applyTheme = () => {
      const color = AestheticStorageService.getThemeColor();
      document.documentElement.style.setProperty("--color-primary", color);
      const dark = AestheticStorageService.getDarkMode();
      document.documentElement.classList.toggle("dark", dark);
      setDarkMode(dark);
    };
    applyTheme();
    window.addEventListener("storage", applyTheme);
    return () => window.removeEventListener("storage", applyTheme);
  }, []);

  useEffect(() => {
    const bridge = getDockBridge();
    if (!bridge) return;
    const unsubSnapshot = bridge.onSnapshot((s) => setSnapshot(s));
    const unsubNotify = bridge.onNotify((payload) => {
      setNotifFeed((prev) => [{ id: `${Date.now()}-${Math.random()}`, title: payload.title, body: payload.body }, ...prev].slice(0, 12));
    });
    return () => {
      unsubSnapshot();
      unsubNotify();
    };
  }, []);

  useEffect(() => {
    const size = expanded ? EXPANDED_SIZE : COLLAPSED_SIZE;
    bridgeRef.current?.resize(size);
  }, [expanded]);

  const statusText = useMemo(() => {
    if (snapshot.urgentCount === 0) return "Al día";
    return `${snapshot.urgentCount} pendiente${snapshot.urgentCount === 1 ? "" : "s"}`;
  }, [snapshot.urgentCount]);

  const tabItems: DockItem[] = activeTab === "inicio" ? [] : snapshot[activeTab];

  return (
    <div className="w-screen h-screen flex items-start justify-center overflow-hidden bg-transparent">
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-zinc-950/95 border border-white/10 shadow-2xl overflow-hidden text-[#e3e2e6]"
        style={{
          borderRadius: expanded ? 20 : 999,
          width: expanded ? EXPANDED_SIZE.width : COLLAPSED_SIZE.width,
          height: expanded ? EXPANDED_SIZE.height : COLLAPSED_SIZE.height,
          // La zona general del dock arrastra la ventana (frameless); los controles interactivos
          // de adentro cortan ese comportamiento con no-drag (ver más abajo).
          WebkitAppRegion: "drag",
        } as React.CSSProperties}
      >
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full h-full flex items-center gap-2 px-3 cursor-pointer"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <Logo darkMode={darkMode} size="xs" />
            <span className="text-sm font-semibold truncate">{statusText}</span>
            {snapshot.urgentCount > 0 && (
              <span className="ml-auto w-2 h-2 rounded-full bg-primary shrink-0" />
            )}
          </button>
        )}

        {expanded && (
          <div className="flex flex-col h-full">
            <div
              className="flex items-center gap-2 px-3 py-2 border-b border-white/10 shrink-0"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <Logo darkMode={darkMode} size="xs" />
              <span className="text-xs font-semibold">FSR Workspace</span>
              <button
                type="button"
                title="Abrir app completa"
                onClick={() => bridgeRef.current?.openMain()}
                className="ml-auto text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Minimizar"
                onClick={() => setExpanded(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-bold px-1"
              >
                ▾
              </button>
            </div>

            <div
              className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10 shrink-0 overflow-x-auto"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  title={label}
                  className={`flex items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    activeTab === key ? "bg-primary text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              {activeTab === "inicio" ? (
                <>
                  {[...snapshot.finanzas, ...snapshot.turnos, ...snapshot.academico].slice(0, 4).map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                  {snapshot.finanzas.length + snapshot.turnos.length + snapshot.academico.length === 0 && <EmptyState />}
                  {notifFeed.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-white/10">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1 px-1 mb-1">
                        <Bell className="w-3 h-3" /> Notificaciones
                      </p>
                      {notifFeed.map((n) => (
                        <div key={n.id} className="px-3 py-2 rounded-xl text-sm bg-white/5 text-zinc-300">
                          <p className="font-semibold truncate">{n.title}</p>
                          <p className="text-xs opacity-70 truncate">{n.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-1.5"
                  >
                    {tabItems.length === 0 ? <EmptyState /> : tabItems.map((item) => <ItemRow key={item.id} item={item} />)}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
