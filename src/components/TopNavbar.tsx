import { createPortal } from "react-dom";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  Calendar,
  DollarSign,
  GraduationCap,
  Heart,
  UtensilsCrossed,
  Sparkles,
  Settings,
  LogOut,
  Bell,
  RefreshCw,
  Menu,
  X,
  User,
  Stethoscope,
  TrendingUp,
  BarChart3,
  LineChart,
  Bitcoin,
  Wallet,
  CreditCard,
  BookOpen,
  Clock,
  FileCheck,
  GitMerge,
  Users,
  Activity,
  Pill,
  ChefHat,
  Package,
  ShoppingBag,
  FolderOpen,
  Database,
  ClipboardList,
  CalendarDays,
  Image,
  Video,
  CloudLightning,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Receipt,
  Shield,
} from "lucide-react";
import {
  AppNotification,
  TurnoCompromiso,
  Appointment,
  DetailedPayment,
  Invoice,
  PlatoItem,
  AlimentoItem,
  OrganizacionSemanalItem,
  MedicamentoDetallado,
  DoctorCard,
  MedicalRecord,
} from "../types";
import Logo from "./Logo";
import { NotificationDetailPreview } from "./NotificationDetailPreview";
import { getMealImage } from "../lib/mealHelpers";

const getNotificationCategoryDetails = (notif: AppNotification) => {
  const type = notif.type?.toLowerCase() || "";
  
  let categoryLabel = "";
  if (notif.body) {
    const match = notif.body.match(/Categor[ií]a:\s*([^-\n,]+)/i);
    if (match && match[1]) {
      categoryLabel = match[1].trim();
    }
  }

  switch (type) {
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
        icon: DollarSign,
      };
    case "meal":
    case "comida":
      return {
        label: categoryLabel || "Comidas",
        icon: UtensilsCrossed,
      };
    case "academic":
    case "academico":
      return {
        label: categoryLabel || "Universidad",
        icon: GraduationCap,
      };
    case "health":
    case "salud":
      return {
        label: categoryLabel || "Salud",
        icon: Heart,
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

export interface SubMenuItem {
  id: string;
  label: string;
  icon?: any;
}

export const SUBMENUS_BY_TAB: Record<string, SubMenuItem[]> = {
  appointments: [
    { id: "agenda", label: "Mi Agenda", icon: Calendar },
    { id: "registro", label: "Agenda de Turnos", icon: Stethoscope },
  ],
  finances: [
    { id: "resumen", label: "Mis Finanzas", icon: TrendingUp },
    { id: "pagos_mensuales", label: "Pagos Mensuales", icon: Wallet },
    { id: "inversiones", label: "Inversiones", icon: BarChart3 },
    { id: "cotizaciones", label: "Cotizaciones", icon: LineChart },
  ],
  academic: [
    { id: "resumen", label: "Mis Estudios", icon: TrendingUp },
    { id: "facultad", label: "Facultad", icon: FolderOpen },
    { id: "informacion_materias", label: "Plan de Estudio", icon: GraduationCap },
    { id: "horario", label: "Calendario Académico", icon: Clock },
  ],
  health: [
    { id: "resumen", label: "Mi Salud", icon: Activity },
    { id: "deporte_alimentacion", label: "Deporte y Alimentación", icon: Activity },
    { id: "control_clinico", label: "Control Clínico", icon: Stethoscope },
  ],
  meals: [
    { id: "planificador", label: "Mi Alimentación", icon: UtensilsCrossed },
    { id: "creacion_comidas", label: "Creación de Comidas", icon: Database },
    { id: "organizacion_semanal", label: "Organización Semanal", icon: CalendarDays },
    { id: "lista_compras", label: "Lista de Compras", icon: ShoppingBag },
  ],
  ai: [
    { id: "chat", label: "Chat de Organización", icon: Sparkles },
    { id: "image", label: "Generar Imagen", icon: Image },
    { id: "video", label: "Generar Video (Veo)", icon: Video },
    { id: "analysis", label: "Entender Video", icon: CloudLightning },
  ],
};

interface TopNavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeSubTab?: string;
  onSubTabChange?: (subTabId: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  user: any;
  token: string | null;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  onReadNotification: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onManualSync: () => void;
  syncing: boolean;
  lastSynced: string | null;
  onLogout: () => void;
  onOpenSettings?: () => void;
  isSettingsOpen?: boolean;
  menuVisibility?: Record<string, boolean>;
  turnosCompromisos?: TurnoCompromiso[];
  appointments?: Appointment[];
  detailedPayments?: DetailedPayment[];
  invoices?: Invoice[];
  platos?: PlatoItem[];
  alimentos?: AlimentoItem[];
  organizacionSemanal?: OrganizacionSemanalItem[];
  medicamentosDetallados?: MedicamentoDetallado[];
  doctors?: DoctorCard[];
  medicalRecords?: MedicalRecord[];
}

export default function TopNavbar({
  currentTab,
  setCurrentTab,
  activeSubTab,
  onSubTabChange,
  darkMode,
  setDarkMode,
  user,
  token,
  notifications,
  onClearNotifications,
  onReadNotification,
  onDeleteNotification,
  onManualSync,
  syncing,
  lastSynced,
  onLogout,
  onOpenSettings,
  isSettingsOpen = false,
  menuVisibility,
  turnosCompromisos = [],
  appointments = [],
  detailedPayments = [],
  invoices = [],
  platos = [],
  alimentos = [],
  organizacionSemanal = [],
  medicamentosDetallados = [],
  doctors = [],
  medicalRecords = [],
}: TopNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useLockBodyScroll(
    Boolean(mobileMenuOpen || showNotifications || mobileDetailOpen)
  );
  const notificationsRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (isSettingsOpen) {
      setMobileMenuOpen(false);
    }
  }, [isSettingsOpen]);

  // Auto-select first notification or first unread when opening
  useEffect(() => {
    if (showNotifications && notifications.length > 0) {
      if (!selectedNotifId || !notifications.some((n) => n.id === selectedNotifId)) {
        const firstUnread = notifications.find((n) => !n.read);
        setSelectedNotifId(firstUnread ? firstUnread.id : notifications[0].id);
      }
    }
  }, [showNotifications, notifications, selectedNotifId]);

  const selectedNotification =
    notifications.find((n) => n.id === selectedNotifId) ||
    (notifications.length > 0 ? notifications[0] : null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  const currentSubMenu = isSettingsOpen || mobileMenuOpen ? [] : (SUBMENUS_BY_TAB[currentTab] || []);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const subMenuScrollRef = useRef<HTMLDivElement>(null);
  const subMenuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const scrollToSubMenuButton = (buttonEl: HTMLElement | null) => {
    if (!buttonEl || !subMenuScrollRef.current) return;
    const container = subMenuScrollRef.current;
    const buttonLeft = buttonEl.offsetLeft;
    const buttonWidth = buttonEl.offsetWidth;
    const containerWidth = container.clientWidth;
    const maxScroll = container.scrollWidth - containerWidth;

    const currentScroll = container.scrollLeft;
    const paddingRight = 8;
    const paddingLeft = 8;

    let targetScrollLeft = currentScroll;

    // If the button's right edge is beyond or near the container's visible right edge
    if (buttonLeft + buttonWidth + paddingRight > currentScroll + containerWidth) {
      targetScrollLeft = buttonLeft + buttonWidth - containerWidth + paddingRight;
    } 
    // If the button's left edge is before or near the container's visible left edge
    else if (buttonLeft - paddingLeft < currentScroll) {
      targetScrollLeft = buttonLeft - paddingLeft;
    }

    container.scrollTo({
      left: Math.max(0, Math.min(maxScroll, targetScrollLeft)),
      behavior: "smooth",
    });
  };

  const updateSubMenuScrollButtons = () => {
    if (subMenuScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = subMenuScrollRef.current;
      setShowLeftArrow(scrollLeft > 2);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 4);
    } else {
      setShowLeftArrow(false);
      setShowRightArrow(false);
    }
  };

  useEffect(() => {
    if (activeSubTab && subMenuButtonRefs.current[activeSubTab]) {
      const timer = setTimeout(() => {
        scrollToSubMenuButton(subMenuButtonRefs.current[activeSubTab]);
        updateSubMenuScrollButtons();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeSubTab, currentTab]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateSubMenuScrollButtons();
    }, 150);

    window.addEventListener("resize", updateSubMenuScrollButtons);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updateSubMenuScrollButtons);
    };
  }, [currentTab, currentSubMenu]);

  const handleScrollSubMenu = (direction: "left" | "right") => {
    if (!currentSubMenu || currentSubMenu.length === 0) return;
    
    // Auto-select next/prev tab instead of just scrolling
    if (onSubTabChange && activeSubTab) {
      const currentIndex = currentSubMenu.findIndex(item => item.id === activeSubTab);
      if (direction === "left" && currentIndex > 0) {
        const prevTab = currentSubMenu[currentIndex - 1];
        onSubTabChange(prevTab.id);
        scrollToSubMenuButton(subMenuButtonRefs.current[prevTab.id]);
      } else if (direction === "right" && currentIndex < currentSubMenu.length - 1) {
        const nextTab = currentSubMenu[currentIndex + 1];
        onSubTabChange(nextTab.id);
        scrollToSubMenuButton(subMenuButtonRefs.current[nextTab.id]);
      }
    } else {
      if (subMenuScrollRef.current) {
        const container = subMenuScrollRef.current;
        const scrollAmount = 180;
        container.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  const menuItems = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "appointments", label: "Turnos", icon: Calendar },
    { id: "finances", label: "Finanzas", icon: DollarSign },
    { id: "academic", label: "Universidad", icon: GraduationCap },
    { id: "health", label: "Salud", icon: Heart },
    { id: "meals", label: "Comidas", icon: UtensilsCrossed },
    { id: "ai", label: "Copiloto IA", icon: Sparkles },
  ].filter((item) => item.id === "home" || menuVisibility?.[item.id] !== false);

  return (
    <header ref={notificationsRef} className="sticky top-0 sm:top-3 z-50 w-full max-w-7xl mx-auto px-2 sm:px-4">
      {/* Outer Glass Container with Animated Height/Layout Expansion */}
      <motion.div
        layout
        transition={{
          layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
          duration: 0.3,
        }}
        className={`w-full px-3 sm:px-5 py-2.5 rounded-2xl sm:rounded-[28px] border backdrop-blur-2xl transition-colors duration-300 shadow-xl flex flex-col ${
          darkMode
            ? "bg-zinc-950/75 border-white/10 text-zinc-100 shadow-black/40"
            : "bg-white/80 border-slate-200/80 text-zinc-800 shadow-slate-200/50"
        }`}
      >
        {/* TOP ROW: Main Header Bar */}
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Brand / Logo */}
          <div
            onClick={() => {
              setCurrentTab("home");
              setShowNotifications(false);
            }}
            className="flex items-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Logo darkMode={darkMode} size="sm" className="shrink-0" />
          </div>

          {/* Desktop Horizontal Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-500/5 dark:bg-white/5 p-1 rounded-full border border-zinc-200/40 dark:border-white/5 relative">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setShowNotifications(false);
                  }}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-300 cursor-pointer whitespace-nowrap z-10 ${
                    isActive
                      ? `text-white dark:text-zinc-950 font-bold ${!darkMode ? "active-nav-pill-light" : ""}`
                      : darkMode
                      ? "text-zinc-300 hover:text-white hover:bg-white/10"
                      : "text-black hover:text-black hover:bg-zinc-200/50"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMainNavPill"
                      className="absolute inset-0 rounded-full bg-primary shadow-md -z-10"
                      transition={{ type: "spring", stiffness: 220, damping: 26 }}
                    />
                  )}
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"} ${isActive ? `text-white dark:text-zinc-950 ${!darkMode ? "active-nav-pill-light" : ""}` : darkMode ? "text-zinc-300" : "text-black"}`} />
                  <span className={isActive && !darkMode ? "active-nav-pill-light" : ""}>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions Header */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sync Button */}
            <button
              onClick={() => {
                if (onManualSync) onManualSync();
                setShowNotifications(false);
              }}
              disabled={syncing}
              className="p-2 sm:p-2.5 rounded-full transition-all cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-black dark:text-white hover:text-primary dark:hover:text-primary border border-zinc-200/60 dark:border-white/10 shadow-xs header-action-btn"
              title="Sincronizar todo"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin text-primary" : ""}`} />
            </button>

            {/* Notification Bell */}
            <div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  if (isSettingsOpen) return;
                  const nextVal = !showNotifications;
                  setShowNotifications(nextVal);
                  if (nextVal) {
                    setMobileMenuOpen(false);
                  }
                }}
                className={`p-2 sm:p-2.5 rounded-full relative transition-all border shadow-xs header-action-btn ${
                  isSettingsOpen ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                } ${
                  showNotifications
                    ? "bg-primary/20 text-primary border-primary/40 dark:bg-primary/20 dark:text-primary dark:border-primary/40"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-black dark:text-white hover:text-primary dark:hover:text-primary border-zinc-200/60 dark:border-white/10"
                }`}
                title="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary ring-1 ring-white dark:ring-zinc-950 animate-pulse" />
                )}
              </motion.button>
            </div>

            {/* User Settings Gear */}
            {onOpenSettings && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                  setMobileMenuOpen(false);
                  setShowNotifications(false);
                }}
                className={`p-2 sm:p-2.5 rounded-full transition-all cursor-pointer border shadow-xs header-action-btn ${
                  isSettingsOpen
                    ? "bg-primary/20 text-primary border-primary/40 dark:bg-primary/20 dark:text-primary dark:border-primary/40"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-black dark:text-white hover:text-primary dark:hover:text-primary border-zinc-200/60 dark:border-white/10"
                }`}
                title="Ajustes de Perfil"
              >
                <Settings className="w-4 h-4" />
              </motion.button>
            )}

            {/* Profile / Logout Button (Desktop) */}
            <div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-zinc-200/60 dark:border-white/10">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                  setMobileMenuOpen(false);
                  setShowNotifications(false);
                }}
                className="flex items-center justify-center p-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-white/10"
                title="Ajustes de Perfil"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Usuario"}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                )}
              </motion.button>

              <button
                onClick={() => {
                  onLogout();
                  setShowNotifications(false);
                }}
                className="p-2 rounded-full hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-all cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Menu Hamburger Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                const nextOpening = !mobileMenuOpen;
                setMobileMenuOpen(nextOpening);
                setShowNotifications(false);
                if (nextOpening && isSettingsOpen && onOpenSettings) {
                  onOpenSettings();
                }
              }}
              className="md:hidden p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-white/10 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* BOTTOM ROW: Integrated Sub-Menu Row (Inside Same Capsule) */}
        <AnimatePresence mode="wait">
          {currentSubMenu && currentSubMenu.length > 0 && (
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full overflow-hidden relative flex items-center gap-1.5 pt-2.5 border-t border-zinc-200/50 dark:border-white/10"
            >
              {/* Left Scroll Button */}
              {showLeftArrow && (
                <button
                  onClick={() => handleScrollSubMenu("left")}
                  className={`p-1.5 rounded-full bg-white/90 dark:bg-zinc-900/95 border border-zinc-200/60 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:text-primary dark:hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0 z-20 ${currentSubMenu?.findIndex(item => item.id === activeSubTab) === 0 ? "opacity-30 pointer-events-none" : ""}`}
                  title="Desplazar a la izquierda"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <div
                ref={subMenuScrollRef}
                onScroll={updateSubMenuScrollButtons}
                className="flex-1 flex items-center justify-start sm:justify-start gap-1 overflow-x-auto scroll-smooth scrollbar-none relative px-1 py-0.5"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <div className="flex items-center gap-1.5 min-w-full sm:min-w-0 pr-6 sm:pr-2">
                  {currentSubMenu.map((subItem) => {
                    const Icon = subItem.icon;
                    const isActive = activeSubTab === subItem.id;

                    return (
                      <button
                        key={subItem.id}
                        ref={(el) => {
                          subMenuButtonRefs.current[subItem.id] = el;
                        }}
                        onClick={() => {
                          if (onSubTabChange) onSubTabChange(subItem.id);
                          scrollToSubMenuButton(subMenuButtonRefs.current[subItem.id]);
                          setShowNotifications(false);
                        }}
                        className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-300 cursor-pointer whitespace-nowrap z-10 shrink-0 ${
                          isActive
                            ? `text-white dark:text-zinc-950 font-bold ${!darkMode ? "active-nav-pill-light" : ""}`
                            : darkMode
                            ? "text-zinc-300 hover:text-white hover:bg-white/5"
                            : "text-black hover:text-black hover:bg-zinc-100/60"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeSubNavPill"
                            className="absolute inset-0 rounded-full bg-primary -z-10"
                            transition={{ type: "spring", stiffness: 220, damping: 26 }}
                          />
                        )}
                        {Icon && (
                          <Icon
                            className={`w-3.5 h-3.5 ${
                              isActive
                                ? `text-white dark:text-zinc-950 stroke-[2.2] ${!darkMode ? "active-nav-pill-light" : ""}`
                                : darkMode
                                ? "text-zinc-400 stroke-[1.8]"
                                : "text-black stroke-[1.8]"
                            }`}
                          />
                        )}
                        <span className={isActive && !darkMode ? "active-nav-pill-light" : ""}>{subItem.label}</span>
                      </button>
                    );
                  })}
                  {/* Compact trailing spacer for close alignment with right arrow */}
                  <div className="shrink-0 w-2.5 h-2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>

              {/* Right Scroll Button */}
              {showRightArrow && (
                <button
                  onClick={() => handleScrollSubMenu("right")}
                  className={`p-1.5 rounded-full bg-white/90 dark:bg-zinc-900/95 border border-zinc-200/60 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:text-primary dark:hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0 z-20 ${currentSubMenu?.findIndex(item => item.id === activeSubTab) === (currentSubMenu?.length || 1) - 1 ? "opacity-30 pointer-events-none" : ""}`}
                  title="Desplazar a la derecha"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu Backdrop Overlay & Floating Pop-up Card (Portal) */}
        {createPortal(
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                key="mobile-menu-backdrop-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeInOut" } }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[3px] z-40 md:hidden cursor-pointer"
              />
            )}

            {mobileMenuOpen && (
              <motion.div
                key="mobile-popup-menu-card"
                initial={{ scale: 0.8, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -20, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={`fixed top-[76px] left-1/2 -translate-x-1/2 w-[92%] max-w-lg p-4 rounded-3xl border shadow-2xl backdrop-blur-2xl transition-colors duration-200 z-50 md:hidden ${
                  darkMode
                    ? "bg-zinc-950/95 border-white/10 text-zinc-100"
                    : "bg-white/95 border-slate-200 text-zinc-800"
                }`}
              >
                {/* Navigation Items Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentTab(item.id);
                          setMobileMenuOpen(false);
                          setShowNotifications(false);
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? `bg-primary text-white dark:text-zinc-950 shadow-md font-bold ${!darkMode ? "active-nav-pill-light" : ""}`
                            : darkMode
                            ? "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800"
                            : "bg-zinc-100/70 text-black hover:bg-zinc-200"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? `text-white dark:text-zinc-950 ${!darkMode ? "active-nav-pill-light" : ""}` : darkMode ? "text-zinc-400" : "text-black"}`} />
                        <span className={isActive && !darkMode ? "active-nav-pill-light" : ""}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* User Profile & Logout Mobile Row */}
                <div className="pt-3 border-t border-zinc-200/50 dark:border-white/10 flex items-center justify-between">
                  <div
                    onClick={() => {
                      if (onOpenSettings) onOpenSettings();
                      setMobileMenuOpen(false);
                      setShowNotifications(false);
                    }}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "Usuario"}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{user?.displayName || "Usuario"}</span>
                      <span className="text-[10px] text-zinc-500">{user?.email || "Sin email"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                      setShowNotifications(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 dark:text-red-400 text-xs font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Salir</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* NOTIFICATIONS EXPANDABLE PANEL (Seamlessly integrated into TopNavbar Capsule with Desktop Left Detail View) */}
        <AnimatePresence initial={false}>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-full overflow-hidden"
            >
              <div className="w-full border-t border-zinc-200/60 dark:border-white/10 pt-3 mt-2">
                <div className="w-full flex flex-col md:flex-row items-stretch gap-4">
                  {/* Left Column (Desktop / Large Screen Detail Panel: Map, Photos, Files, Metadata) */}
                  <div className="hidden md:flex flex-1 min-w-0 flex-col">
                    <NotificationDetailPreview
                      notification={selectedNotification}
                      turnosCompromisos={turnosCompromisos}
                      appointments={appointments}
                      detailedPayments={detailedPayments}
                      invoices={invoices}
                      platos={platos}
                      alimentos={alimentos}
                      organizacionSemanal={organizacionSemanal}
                      medicamentosDetallados={medicamentosDetallados}
                      doctors={doctors}
                      medicalRecords={medicalRecords}
                      darkMode={darkMode}
                      onNavigateToSection={(tab, subTab) => {
                        setCurrentTab(tab);
                        if (subTab && onSubTabChange) onSubTabChange(subTab);
                        setShowNotifications(false);
                      }}
                      onClose={() => setShowNotifications(false)}
                    />
                  </div>

                  {/* Right Column: Notifications List */}
                  <div className="w-full md:w-80 lg:w-96 shrink-0 flex flex-col justify-between">
                    <div className="flex flex-col space-y-2 flex-1 min-h-0">
                      {/* Header */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-primary" />
                          <h3 className="text-xs font-extrabold notifications-title">
                            Notificaciones ({unreadCount})
                          </h3>
                        </div>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1 rounded-full hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                          title="Cerrar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Notifications list */}
                      <div className="max-h-64 sm:max-h-72 md:max-h-[380px] overflow-y-auto pr-1 scrollbar-none space-y-1.5 flex-1 min-h-0">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-zinc-500 font-medium bg-zinc-500/5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800">
                            No tienes notificaciones pendientes.
                          </div>
                        ) : (
                          <AnimatePresence initial={false}>
                            {notifications.map((notif) => {
                              const categoryInfo = getNotificationCategoryDetails(notif);
                              const CategoryIcon = categoryInfo.icon;
                              const isSelected = selectedNotifId === notif.id;
                              const isMeal = notif.type === "meal";
                              const mealImg = isMeal ? getMealImage(notif.title, notif.mealImage) : null;

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
                                  transition={{ duration: 0.15 }}
                                  onClick={() => {
                                    setSelectedNotifId(notif.id);
                                    onReadNotification(notif.id);
                                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                                      setMobileDetailOpen(true);
                                    }
                                  }}
                                  className={`group p-2.5 rounded-xl border relative flex flex-col notif-card-solid select-none transition-all cursor-pointer ${
                                    isSelected
                                      ? "border-primary ring-1 ring-primary/40 shadow-xs"
                                      : darkMode
                                      ? notif.read
                                        ? "border-zinc-800 text-zinc-300 hover:border-zinc-700"
                                        : "border-zinc-700 text-white shadow-xs hover:border-zinc-600"
                                      : notif.read
                                      ? "border-zinc-200 text-zinc-800 hover:border-zinc-300"
                                      : "border-zinc-300 text-black shadow-xs hover:border-zinc-400"
                                  }`}
                                  style={{
                                    backgroundColor: darkMode ? "#000000" : "#ffffff",
                                  }}
                                >
                                  <div className="pr-5 flex items-start gap-2.5">
                                    {isMeal && mealImg && (
                                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 shadow-2xs mt-0.5">
                                        <img
                                          src={mealImg}
                                          alt={notif.title}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between mb-1 gap-1.5">
                                        <div className="flex items-center gap-1 text-primary">
                                          <CategoryIcon className="w-3 h-3 shrink-0" />
                                          <span className="text-[9.5px] font-extrabold uppercase tracking-wider">
                                            {categoryInfo.label}
                                          </span>
                                        </div>
                                        <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium shrink-0">
                                          {new Date(notif.timestamp).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                      {matchDetails ? (
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-black dark:text-white leading-snug flex-wrap my-0.5">
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
                                        <p className="text-[11px] font-bold text-black dark:text-white leading-snug">
                                          {notif.title}
                                        </p>
                                      )}
                                      <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-medium leading-snug mt-0.5 line-clamp-2">
                                        {notif.body}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteNotification(notif.id);
                                      if (selectedNotifId === notif.id) {
                                        const remaining = notifications.filter((n) => n.id !== notif.id);
                                        setSelectedNotifId(remaining[0]?.id || null);
                                      }
                                    }}
                                    className="absolute right-1.5 top-1.5 p-1 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-500/10 sm:opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-20"
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
                    </div>

                    {/* Footer Actions - Automatically aligns at the bottom of the container */}
                    {notifications.length > 0 && (
                      <div className="flex items-center justify-between pt-2.5 mt-auto border-t border-zinc-200/40 dark:border-white/5">
                        <span className="text-[10.5px] text-zinc-500 font-medium">
                          {unreadCount > 0 ? `${unreadCount} sin leer` : "Todas leídas"}
                        </span>
                        <button
                          onClick={() => {
                            onClearNotifications();
                            setShowNotifications(false);
                            setSelectedNotifId(null);
                          }}
                          className="px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10.5px] font-bold transition-colors cursor-pointer"
                        >
                          Borrar todas
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Detail Modal (For narrow screens when tapping a notification) */}
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {mobileDetailOpen && selectedNotification && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:hidden">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    onClick={() => setMobileDetailOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-lg max-h-[85vh] bg-white dark:bg-black rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
                  >
                    <div className="flex items-center justify-between p-3.5 border-b border-zinc-200 dark:border-zinc-800">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Detalle de Notificación
                      </h3>
                      <button
                        onClick={() => setMobileDetailOpen(false)}
                        className="p-1 rounded-full text-zinc-500 hover:text-black dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                      <NotificationDetailPreview
                        notification={selectedNotification}
                        turnosCompromisos={turnosCompromisos}
                        appointments={appointments}
                        detailedPayments={detailedPayments}
                        invoices={invoices}
                        platos={platos}
                        alimentos={alimentos}
                        organizacionSemanal={organizacionSemanal}
                        medicamentosDetallados={medicamentosDetallados}
                        doctors={doctors}
                        medicalRecords={medicalRecords}
                        darkMode={darkMode}
                        onNavigateToSection={(tab, subTab) => {
                          setCurrentTab(tab);
                          if (subTab && onSubTabChange) onSubTabChange(subTab);
                          setMobileDetailOpen(false);
                          setShowNotifications(false);
                        }}
                        onClose={() => setMobileDetailOpen(false)}
                      />
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>,
            document.body
          )}
      </motion.div>
    </header>
  );
}

