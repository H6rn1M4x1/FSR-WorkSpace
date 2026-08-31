import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  CloudLightning,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  User,
  LogOut,
  Mail,
  FileSpreadsheet,
  MessageSquare,
  Settings,
  X,
  Trash2,
  Calendar,
  DollarSign,
  Receipt,
  Utensils,
  GraduationCap,
  HeartPulse,
  Pill,
  Shield,
} from "lucide-react";
import { AppNotification } from "../types";

interface HeaderProps {
  darkMode: boolean;
  user: any;
  token: string | null;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  onReadNotification: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onManualSync: () => void;
  syncing: boolean;
  lastSynced: string | null;
  onOpenSettings?: () => void;
}

const getCategoryDetails = (type: string, body?: string) => {
  let categoryLabel = "";
  if (body) {
    const match = body.match(/Categor[ií]a:\s*([^-\n,]+)/i);
    if (match && match[1]) {
      categoryLabel = match[1].trim();
    }
  }

  switch (type?.toLowerCase()) {
    case "appointment":
    case "turno":
      return {
        label: categoryLabel || "Turno",
        icon: Calendar,
      };
    case "finance":
    case "pago":
    case "factura":
      return {
        label: categoryLabel || "Finanzas",
        icon: Receipt,
      };
    case "meal":
    case "comida":
      return {
        label: categoryLabel || "Comidas",
        icon: Utensils,
      };
    case "academic":
    case "academico":
      return {
        label: categoryLabel || "Académico",
        icon: GraduationCap,
      };
    case "health":
    case "salud":
      return {
        label: categoryLabel || "Salud",
        icon: HeartPulse,
      };
    case "medication":
    case "medicamento":
      return {
        label: categoryLabel || "Medicamentos",
        icon: Pill,
      };
    case "sync":
      return {
        label: "Sincronización",
        icon: RefreshCw,
      };
    default:
      return {
        label: categoryLabel || "Notificación",
        icon: Bell,
      };
  }
};

export default function Header({
  darkMode,
  user,
  token,
  notifications,
  onClearNotifications,
  onReadNotification,
  onManualSync,
  syncing,
  lastSynced,
  onOpenSettings,
  onDeleteNotification,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header
      className={`h-20 px-6 border-b flex items-center justify-between sticky top-0 z-30 transition-all ${
        darkMode
          ? "bg-black border-zinc-800 text-zinc-100"
          : "bg-white border-zinc-200 text-zinc-900"
      }`}
    >
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="md:block hidden">
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            Mi Espacio Personal
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            Gestión integral e inteligente de tus tareas
          </p>
        </div>
      </div>

      {/* Sync Badges & Profile Controls */}
      <div className="flex items-center gap-3">
        {/* Google Workspace Connection status */}
        <div className="md:flex hidden items-center gap-2">
          {token ? (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-variant dark:bg-surface-variant border border-[#188038]/30 dark:border-[#81c995]/30 text-[#188038] dark:text-[#81c995] text-xs font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Workspace Conectado</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-variant dark:bg-surface-variant border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-primary" />
              <span>Workspace Desconectado</span>
            </div>
          )}

          {lastSynced && (
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
              Sinc:{" "}
              {new Date(lastSynced).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}

          <button
            onClick={onManualSync}
            disabled={syncing}
            className="p-2.5 rounded-full transition-all cursor-pointer bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-primary"
            title="Sincronizar todo"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Notification Bell */}
        <div className="relative flex items-center gap-2">
          {/* User Settings Gear Button */}
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-full transition-all cursor-pointer bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-primary"
            title="Ajustes de Usuario y Perfil"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-full relative transition-all cursor-pointer bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-primary"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary ring-1 ring-inherit animate-pulse"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className={`fixed left-1/2 -translate-x-1/2 top-20 w-[calc(100vw-2rem)] max-w-[360px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:translate-x-0 sm:mt-2.5 sm:w-96 rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden z-50 flex flex-col ${
                  darkMode
                    ? "bg-black border-zinc-800 text-zinc-100 shadow-2xl"
                    : "bg-white border-zinc-200 text-zinc-900 shadow-2xl"
                }`}
              >
                {/* Header */}
                <div 
                  className={`flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b shrink-0 ${
                    darkMode
                      ? "bg-black border-zinc-800 text-white"
                      : "bg-white border-zinc-200 text-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <h3 className="text-sm sm:text-base font-extrabold">
                      Notificaciones ({unreadCount})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className={`max-h-72 overflow-y-auto p-2.5 scrollbar-none space-y-1.5 ${
                  darkMode ? "bg-black" : "bg-white"
                }`}>
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-500 font-medium">
                      No tienes notificaciones pendientes.
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {notifications.map((notif) => {
                        const { label, icon: CategoryIcon } = getCategoryDetails(notif.type, notif.body);

                        let matchDetails: {
                          homeTeam?: string;
                          homeLogo?: string;
                          awayTeam?: string;
                          awayLogo?: string;
                          competition?: string;
                        } | null = null;

                        if (notif.notes) {
                          try {
                            const trimmed = notif.notes.trim();
                            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                              const parsed = JSON.parse(trimmed);
                              if (parsed && (parsed.homeTeam || parsed.awayTeam)) {
                                matchDetails = parsed;
                              }
                            }
                          } catch (e) {}
                        }

                        if (!matchDetails && notif.title && (notif.title.includes(" vs ") || notif.title.includes(" VS "))) {
                          const parts = notif.title.split(/ vs | VS /i);
                          if (parts.length === 2) {
                            matchDetails = {
                              homeTeam: parts[0].trim(),
                              awayTeam: parts[1].trim(),
                            };
                          }
                        }

                        return (
                          <motion.div
                            key={notif.id}
                            layout
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, padding: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`group p-3 rounded-xl border relative flex flex-col notif-card-solid select-none transition-all ${
                              notif.read
                                ? darkMode
                                  ? "border-zinc-800 text-zinc-300"
                                  : "border-zinc-200 text-zinc-700"
                                : darkMode
                                  ? "border-zinc-700 text-white shadow-sm"
                                  : "border-zinc-300 text-black shadow-sm"
                            }`}
                            style={{
                              backgroundColor: darkMode ? "#000000" : "#ffffff",
                              borderColor: darkMode ? (notif.read ? "#27272a" : "#3f3f46") : (notif.read ? "#e4e4e7" : "#d4d4d8"),
                            }}
                          >
                            <div
                              className="cursor-pointer pr-6"
                              onClick={() => onReadNotification(notif.id)}
                            >
                              <div className="flex items-start gap-3">
                                {/* Category Icon Badge */}
                                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 flex items-center justify-center">
                                  <CategoryIcon className="w-4 h-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1 gap-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary truncate">
                                      {label}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-medium shrink-0">
                                      {new Date(notif.timestamp).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>

                                  {matchDetails ? (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug flex-wrap my-0.5">
                                      <div className="flex items-center gap-1 shrink-0 bg-zinc-50 dark:bg-zinc-900/60 px-1.5 py-0.5 rounded-md border border-zinc-200/50 dark:border-zinc-800/40">
                                        {matchDetails.homeLogo ? (
                                          <img src={matchDetails.homeLogo} alt={matchDetails.homeTeam} className="w-3.5 h-3.5 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                        ) : (
                                          <Shield className="w-3.5 h-3.5 text-zinc-400" />
                                        )}
                                        <span className="truncate max-w-[80px]">{matchDetails.homeTeam}</span>
                                      </div>
                                      <span className="text-primary text-[9px] font-black shrink-0">VS</span>
                                      <div className="flex items-center gap-1 shrink-0 bg-zinc-50 dark:bg-zinc-900/60 px-1.5 py-0.5 rounded-md border border-zinc-200/50 dark:border-zinc-800/40">
                                        {matchDetails.awayLogo ? (
                                          <img src={matchDetails.awayLogo} alt={matchDetails.awayTeam} className="w-3.5 h-3.5 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                        ) : (
                                          <Shield className="w-3.5 h-3.5 text-zinc-400" />
                                        )}
                                        <span className="truncate max-w-[80px]">{matchDetails.awayTeam}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                                      {notif.title}
                                    </p>
                                  )}

                                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium leading-snug mt-0.5 line-clamp-2">
                                    {notif.body}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteNotification) onDeleteNotification(notif.id);
                              }}
                              className="absolute right-2 top-2 p-1 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-500/10 sm:opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-20"
                              title="Eliminar notificación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>

                {/* Footer Actions */}
                {notifications.length > 0 && (
                  <div className={`px-4 py-2.5 sm:px-5 sm:py-3 border-t flex justify-end shrink-0 ${
                    darkMode
                      ? "bg-black border-zinc-800"
                      : "bg-white border-zinc-200"
                  }`}>
                    <button
                      onClick={() => {
                        onClearNotifications();
                        setShowNotifications(false);
                      }}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer"
                    >
                      Borrar todas
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

