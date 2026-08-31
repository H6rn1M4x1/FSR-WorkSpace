import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import {
  GraduationCap,
  UtensilsCrossed,
  DollarSign,
  Calendar,
  Heart,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Home,
} from "lucide-react";
import Logo from "./Logo";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
  user: any;
  onOpenSettings?: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  darkMode,
  setDarkMode,
  sidebarOpen,
  setSidebarOpen,
  onLogout,
  user,
  onOpenSettings,
}: SidebarProps) {
  useLockBodyScroll(sidebarOpen);
  const menuItems = [
    {
      id: "home",
      label: "Inicio",
      icon: Home,
      color: "text-primary bg-primary/10",
    },
    {
      id: "appointments",
      label: "Turnos",
      icon: Calendar,
      color: "text-primary bg-primary/10",
    },
    {
      id: "finances",
      label: "Finanzas",
      icon: DollarSign,
      color: "text-primary bg-primary/10",
    },
    {
      id: "academic",
      label: "Universidad",
      icon: GraduationCap,
      color: "text-primary bg-primary-container",
    },
    {
      id: "health",
      label: "Salud",
      icon: Heart,
      color: "text-primary bg-primary/10",
    },
    {
      id: "meals",
      label: "Comidas",
      icon: UtensilsCrossed,
      color: "text-primary bg-primary/10",
    },
    {
      id: "ai",
      label: "Copiloto IA",
      icon: Sparkles,
      color: "text-primary bg-primary/10",
    },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl border transition-all ${
          darkMode
            ? "bg-zinc-900 border-zinc-800 text-zinc-300"
            : "bg-white border-zinc-200 text-zinc-700"
        }`}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 shrink-0 z-40 flex flex-col border-r transition-all duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          darkMode
            ? "bg-zinc-950/60 backdrop-blur-xl border-white/10 text-zinc-300"
            : "bg-white/60 backdrop-blur-xl border-black/10 text-zinc-800"
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-200/50 dark:border-zinc-800/50">
          <Logo darkMode={darkMode} size="sm" />
          <div>
            <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-zinc-100">
              FSR - Workspace
            </h1>
            <p className="text-[10px] text-primary dark:text-primary font-bold uppercase tracking-widest">
              Sincronizado
            </p>
          </div>
        </div>

        {/* User Info Card with Settings Gear */}
        <div className="p-3 mx-3 my-4 rounded-2xl border border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-md shadow-xs hover:border-primary/40 dark:hover:border-primary/40 transition-all group">
          <div
            onClick={onOpenSettings}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-primary-container dark:bg-surface-variant border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-xs text-primary dark:text-primary">
                  {user?.displayName
                    ? user.displayName.slice(0, 2).toUpperCase()
                    : "US"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-zinc-200 truncate group-hover:text-primary dark:group-hover:text-primary transition-colors">
                {user?.displayName ||
                  user?.email?.split("@")[0] ||
                  "Hernan Sarmiento"}
              </p>
              <p className="text-[9px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                {user?.email || "hernanmaximiliano10@gmail.com"}
              </p>
            </div>
          </div>

          {/* Gear icon button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full text-zinc-500 hover:text-primary dark:hover:text-primary hover:bg-primary-container dark:hover:bg-surface-variant transition-all cursor-pointer shrink-0"
            title="Ajustes y Configuración de Usuario"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setSidebarOpen(false); // Auto close on mobile
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-full font-semibold text-xs tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? `bg-primary text-white dark:text-blue-950 shadow-sm ${!darkMode ? "active-nav-pill-light" : ""}`
                    : darkMode
                    ? "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                    : "text-black hover:bg-zinc-100/80 hover:text-zinc-950"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? `text-white dark:text-primary-on-container ${!darkMode ? "active-nav-pill-light" : ""}`
                      : darkMode
                      ? "text-zinc-400"
                      : "text-black"
                  }`}
                />
                <span className={isActive && !darkMode ? "active-nav-pill-light" : ""}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-inherit space-y-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-full hover:bg-zinc-500/5 text-sm transition-all cursor-pointer text-zinc-400 hover:text-inherit"
          >
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Sun className="w-4 h-4 text-primary" />
              ) : (
                <Moon className="w-4 h-4 text-primary" />
              )}
              <span>{darkMode ? "Modo Claro" : "Modo Oscuro"}</span>
            </div>
            <div
              className={`w-8 h-4 rounded-full relative p-0.5 transition-all ${darkMode ? "bg-primary" : "bg-zinc-300"}`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-all ${darkMode ? "translate-x-4" : "translate-x-0"}`}
              ></div>
            </div>
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-full hover:bg-red-500/10 text-red-500 font-medium text-sm transition-all cursor-pointer"
          >
            <div className="p-1.5 rounded-xl bg-red-500/10 text-red-500">
              <LogOut className="w-4 h-4" />
            </div>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay on Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
        ></div>
      )}
    </>
  );
}
