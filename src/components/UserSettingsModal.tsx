import React, { useState, useEffect, useRef } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { SmartDateTimePicker } from "./SmartDateTimePicker";
import { SearchableSelect } from "./SearchableSelect";
import { TeamSelect } from "./TeamSelect";
import { Country, State } from "country-state-city";
import { LocationPickerMap } from "./LocationPickerMap";
import {
  X,
  User,
  Shield,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Save,
  Loader2,
  Settings,
  Mail,
  Bell,
  Phone,
  MessageCircle,
  Briefcase,
  Globe,
  RefreshCw,
  Lock,
  Smartphone,
  Monitor,
  Tablet,
  Laptop,
  Cpu,
  AlertCircle,
  Trash2,
  Heart,
  Activity,
  Stethoscope,
  Weight,
  Ruler,
  Calendar,
  DollarSign,
  GraduationCap,
  UtensilsCrossed,
  AlertTriangle,
  Pill,
  FileText,
  HeartPulse,
  Syringe,
  PhoneCall,
  Droplet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  Palette,
  Cloud,
  History,
  Play,
  Database,
  Search,
  Share2,
  Users,
} from "lucide-react";
import {
  generate2FAQRCode,
  generate2FASecret,
  verify2FAToken,
} from "../lib/totp";
import { DriveBackupService, BackupLog } from "../lib/driveBackupService";
import { sendVerificationEmail, auth } from "../lib/supabase";
import { SharedSectionsManager } from "./SharedSectionsManager";
import { AgendaSharingManager } from "./AgendaSharingManager";
import { AgendaShare } from "../types";

function detectCurrentDevice() {
  if (typeof window === "undefined" || !navigator) {
    return {
      formattedLabel: "Dispositivo Desconocido",
      deviceType: "desktop" as const,
      osName: "Desconocido",
      browserName: "Navegador Web",
      userAgent: "",
      screenSize: "",
      touchSupport: false,
    };
  }

  const ua = navigator.userAgent || "";
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  let osName = "Windows";
  let browserName = "Google Chrome";

  // OS Detection
  if (/android/i.test(ua)) {
    deviceType = /mobile/i.test(ua) ? "mobile" : "tablet";
    osName = "Android";
  } else if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    const isTablet = /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    deviceType = isTablet ? "tablet" : "mobile";
    osName = isTablet ? "iPadOS" : "iOS (iPhone)";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = "desktop";
    osName = "Mac";
  } else if (/Windows/i.test(ua)) {
    deviceType = "desktop";
    osName = "Windows";
  } else if (/Linux/i.test(ua)) {
    deviceType = "desktop";
    osName = "Linux";
  }

  // Browser Detection
  if (/edg/i.test(ua)) {
    browserName = "Microsoft Edge";
  } else if (/chrome|crios/i.test(ua)) {
    browserName = "Google Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browserName = "Mozilla Firefox";
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browserName = "Apple Safari";
  } else if (/opr\//i.test(ua)) {
    browserName = "Opera";
  }

  let formattedLabel = "";
  if (deviceType === "mobile") {
    formattedLabel = `Móvil - ${osName}`;
  } else if (deviceType === "tablet") {
    formattedLabel = `Tablet - ${osName}`;
  } else {
    formattedLabel = `PC - ${osName}`;
  }

  const screenSize = `${window.innerWidth}x${window.innerHeight}`;
  const touchSupport = navigator.maxTouchPoints > 0;

  return {
    formattedLabel,
    deviceType,
    osName,
    browserName,
    userAgent: ua,
    screenSize,
    touchSupport,
  };
}

interface HealthCustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  icon?: React.ReactNode;
  previewTransform?: (label: string) => string;
  className?: string;
  valueColorClass?: string;
}

const HealthCustomSelect: React.FC<HealthCustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "-- Seleccionar --",
  icon,
  className = "",
  valueColorClass = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const updatePosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition, true);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition, true);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
      document.documentElement.classList.add("overflow-hidden");
    } else {
      const otherPickers = document.querySelectorAll(
        ".datetime-picker-popover, .health-custom-select-menu"
      );
      const activePortals = Array.from(otherPickers).filter(
        (el) => el !== menuRef.current
      );
      if (activePortals.length === 0) {
        document.body.classList.remove("overflow-hidden");
        document.documentElement.classList.remove("overflow-hidden");
      }
    }

    return () => {
      const otherPickers = document.querySelectorAll(
        ".datetime-picker-popover, .health-custom-select-menu"
      );
      const activePortals = Array.from(otherPickers).filter(
        (el) => el !== menuRef.current
      );
      if (activePortals.length === 0) {
        document.body.classList.remove("overflow-hidden");
        document.documentElement.classList.remove("overflow-hidden");
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideTrigger = dropdownRef.current && dropdownRef.current.contains(target);
      const clickedInsideMenu = menuRef.current && menuRef.current.contains(target);
      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} className={`relative block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer px-4 py-2.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white text-xs focus:border-primary shadow-xs"
      >
        <span className="flex items-center gap-2 truncate">
          {icon && (
            <span className="shrink-0 text-slate-400 dark:text-zinc-500">
              {icon}
            </span>
          )}
          <span
            className={`truncate ${
              selectedOption
                ? `font-bold ${valueColorClass || "text-slate-900 dark:text-white"}`
                : "text-slate-400 dark:text-zinc-500 font-normal"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ml-2"
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: `${coords.top + 6}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 999999,
            }}
            className="health-custom-select-menu bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden p-1.5 scrollbar-none animate-fade-in"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary text-white dark:text-blue-950 font-bold shadow-xs"
                      : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/80"
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

export interface UserProfileData {
  displayName: string;
  email: string;
  photoURL?: string;
  username: string;
  phoneNumber: string;
  address: string;
  lat?: number;
  lon?: number;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  occupation: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string;

  // Health & Physical Profile
  birthDate?: string;
  age?: number | string;
  gender?: string;
  weightKg?: number | string;
  heightCm?: number | string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  medicationsSummary?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  activityLevel?: string;
  healthInsurance?: string;
  organDonor?: string;
  healthNotes?: string;
  whatsappPhoneNumber?: string;
  whatsappApiKey?: string;
  favoriteTeam?: string;
}

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  setDarkMode?: (dark: boolean) => void;
  backgroundStyle?: "dither" | "pixelblast" | "plasma";
  setBackgroundStyle?: (style: "dither" | "pixelblast" | "plasma") => void;
  themeColor?: string;
  setThemeColor?: (color: string) => void;
  menuVisibility?: Record<string, boolean>;
  setMenuVisibility?: (visibility: Record<string, boolean>) => void;
  user: any;
  profileSyncVersion?: string;
  onUpdateUser?: (updated: UserProfileData) => void;
  outgoingShares?: AgendaShare[];
  incomingShares?: AgendaShare[];
  appointments?: any[];
  turnosCompromisos?: any[];
  invoices?: any[];
  detailedPayments?: any[];
  organizacionSemanal?: any[];
  platos?: any[];
  disponibilidadMedicamentos?: any[];
  medicamentosDetallados?: any[];
}

export function UserSettingsModal({
  isOpen,
  onClose,
  darkMode,
  setDarkMode,
  backgroundStyle,
  setBackgroundStyle,
  themeColor,
  setThemeColor,
  menuVisibility,
  setMenuVisibility,
  user,
  profileSyncVersion,
  onUpdateUser,
  outgoingShares = [],
  incomingShares = [],
  appointments = [],
  turnosCompromisos = [],
  invoices = [],
  detailedPayments = [],
  organizacionSemanal = [],
  platos = [],
  disponibilidadMedicamentos = [],
  medicamentosDetallados = [],
}: UserSettingsModalProps) {
  useLockBodyScroll(isOpen);
  const [activeTab, setActiveTab] = useState<
    "profile" | "health" | "sharing" | "appearance" | "security" | "backup"
  >("profile");
  const [showColorPopover, setShowColorPopover] = useState(false);

  // Drive Backup States
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState<boolean>(
    DriveBackupService.isAutoBackupEnabled()
  );
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>(
    DriveBackupService.getBackupLogs()
  );
  const [isBackupRunning, setIsBackupRunning] = useState<boolean>(false);
  const [backupProgressMsg, setBackupProgressMsg] = useState<string>("");
  const [backupProgressPct, setBackupProgressPct] = useState<number>(0);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(
    DriveBackupService.getLastBackupDate()
  );
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<string>("");
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [pushStatus, setPushStatus] = useState<string>("");
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    setPushStatus("");
    try {
      const { enablePushNotifications } = await import("../lib/pushNotifications");
      const result = await enablePushNotifications();
      setPushStatus(
        result.ok
          ? "¡Notificaciones activadas! Vas a recibir avisos aunque la app esté cerrada."
          : result.reason || "No se pudo activar."
      );
    } catch (err: any) {
      setPushStatus(err.message || "Error al activar las notificaciones.");
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleTestPush = async () => {
    setPushStatus("Enviando notificación de prueba...");
    try {
      const { supabase } = await import("../lib/supabase");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/.netlify/functions/send-test-push", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setPushStatus("Notificación de prueba enviada. Cerrá la app y esperá unos segundos.");
    } catch (err: any) {
      setPushStatus(err.message || "Error al enviar la prueba.");
    }
  };

  const [whatsappStatus, setWhatsappStatus] = useState<string>("");
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);

  const handleTestWhatsapp = async () => {
    if (!profile.whatsappPhoneNumber || !profile.whatsappApiKey) {
      setWhatsappStatus("Completá tu número y tu APIKEY de CallMeBot primero.");
      return;
    }
    setIsSendingWhatsapp(true);
    setWhatsappStatus("Enviando mensaje de prueba...");
    try {
      const res = await fetch("/.netlify/functions/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: profile.whatsappPhoneNumber,
          apiKey: profile.whatsappApiKey,
          message: "¡Hola! Este es un mensaje de prueba de FSR Workspace. Tus recordatorios van a llegar así.",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setWhatsappStatus("Mensaje enviado — revisá tu WhatsApp.");
    } catch (err: any) {
      setWhatsappStatus(err.message || "Error al enviar el mensaje de prueba.");
    } finally {
      setIsSendingWhatsapp(false);
    }
  };

  const handleSendEmailVerification = async () => {
    setIsSendingVerification(true);
    setEmailVerificationStatus("");
    try {
      await sendVerificationEmail();
      setEmailVerificationStatus("¡Correo de verificación enviado exitosamente a tu Gmail! Por favor revisa tu bandeja de entrada o spam.");
    } catch (err: any) {
      console.error(err);
      setEmailVerificationStatus(err.message || "Error al enviar el correo de verificación. Asegúrate de haber iniciado sesión.");
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleRunBackup = async () => {
    setIsBackupRunning(true);
    setBackupProgressPct(5);
    setBackupProgressMsg("Iniciando conexión con Google Drive...");
    try {
      const result = await DriveBackupService.runFullBackup((msg, pct) => {
        setBackupProgressMsg(msg);
        setBackupProgressPct(pct);
      });
      setLastBackupDate(DriveBackupService.getLastBackupDate());
      setBackupLogs(DriveBackupService.getBackupLogs());
    } catch (err: any) {
      console.error(err);
      setBackupLogs(DriveBackupService.getBackupLogs());
      alert(err.message || "Error al realizar copia de seguridad.");
    } finally {
      setIsBackupRunning(false);
      setBackupProgressPct(0);
      setBackupProgressMsg("");
    }
  };

  const handleToggleAutoBackup = (checked: boolean) => {
    DriveBackupService.setAutoBackupEnabled(checked);
    setIsAutoBackupEnabled(checked);
  };

  // Tab scroll references & states
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const updateScrollButtons = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftArrow(scrollLeft > 2);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 2);
    }
  };

  useEffect(() => {
    const el = tabsRef.current;
    if (el) {
      updateScrollButtons();
      el.addEventListener("scroll", updateScrollButtons);
      window.addEventListener("resize", updateScrollButtons);
      return () => {
        el.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateScrollButtons, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const scrollTabs = (direction: "left" | "right") => {
    const tabs = ["profile", "health", "sharing", "appearance", "security", "backup"];
    const currentIndex = tabs.indexOf(activeTab);
    
    if (direction === "left" && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1] as any);
      if (tabsRef.current) {
        const buttons = tabsRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    } else if (direction === "right" && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1] as any);
      if (tabsRef.current) {
        const buttons = tabsRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  // Profile Form State
  const authenticatedEmail = user?.email || auth.currentUser?.email || "hernanmaximiliano10@gmail.com";
  const authenticatedName = user?.displayName || auth.currentUser?.displayName || (user?.email?.split("@")[0] ? "Hernan Sarmiento" : "Hernan Sarmiento");

  const [profile, setProfile] = useState<UserProfileData>({
    displayName: authenticatedName,
    email: authenticatedEmail,
    photoURL: user?.photoURL || auth.currentUser?.photoURL || "",
    username: "",
    phoneNumber: "",
    address: "",
    city: "",
    province: "",
    country: "",
    postalCode: "",
    occupation: "",
    twoFactorEnabled: false,
    twoFactorSecret: "JBSWY3DPEHPK3PXP",
    birthDate: "",
    age: "",
    gender: "",
    weightKg: "",
    heightCm: "",
    bloodType: "",
    allergies: "",
    chronicConditions: "",
    medicationsSummary: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    activityLevel: "",
    healthInsurance: "",
    organDonor: "",
    healthNotes: "",
    whatsappPhoneNumber: "",
    whatsappApiKey: "",
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // User Address Google Maps integration states
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [showAddressMap, setShowAddressMap] = useState(false);
  const addressSearchDebounceRef = useRef<any>(null);
  const addressSearchSeqRef = useRef<number>(0);

  const handleAddressSearch = async (query: string) => {
    setProfile((prev) => ({ ...prev, address: query }));

    if (addressSearchDebounceRef.current) {
      clearTimeout(addressSearchDebounceRef.current);
    }

    if (!query || query.trim().length < 2) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setSearchingAddress(false);
      return;
    }

    setShowAddressSuggestions(true);
    setSearchingAddress(true);

    addressSearchSeqRef.current++;
    const currentSeq = addressSearchSeqRef.current;

    addressSearchDebounceRef.current = setTimeout(async () => {
      try {
        let url = `/api/places/search?q=${encodeURIComponent(query.trim())}`;
        // Default proximity bias: San Juan, Argentina coords (-31.5375, -68.5364)
        url += `&lat=-31.5375&lon=-68.5364`;
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (currentSeq === addressSearchSeqRef.current) {
            setAddressSuggestions(
              data.map((item: any) => ({
                title: item.title || item.display_name?.split("-")[0]?.trim() || item.name,
                address: item.address || item.display_name?.split("-")?.slice(1)?.join("-")?.trim() || "",
                name: item.display_name || item.name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
              }))
            );
          }
        }
      } catch (err) {
        console.error("Address search error:", err);
      } finally {
        if (currentSeq === addressSearchSeqRef.current) {
          setSearchingAddress(false);
        }
      }
    }, 400);
  };

  const handleSelectAddressSuggestion = (s: any) => {
    addressSearchSeqRef.current++;
    const fullLoc = s.address && !s.title.toLowerCase().includes(s.address.toLowerCase().split(",")[0])
      ? `${s.title} - ${s.address}`
      : (s.name || s.title);
    
    // Parse city, province, country if available in the selected suggestion
    const parts = s.name ? s.name.split(",") : [];
    let extractedCountry = profile.country;
    let extractedProvince = profile.province;
    let extractedCity = profile.city;

    if (parts.length >= 3) {
      const countryPart = parts[parts.length - 1].trim();
      const provincePart = parts[parts.length - 2].trim();
      const cityPart = parts[parts.length - 3].trim();

      if (countryPart) extractedCountry = countryPart;
      if (provincePart) extractedProvince = provincePart;
      if (cityPart) extractedCity = cityPart;
    }

    setProfile((prev) => ({
      ...prev,
      address: fullLoc,
      lat: s.lat,
      lon: s.lon,
      city: extractedCity,
      province: extractedProvince,
      country: extractedCountry,
    }));

    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
    setSearchingAddress(false);
  };

  const handleMapSelectLocation = (selected: {
    lat: number;
    lon: number;
    address?: string;
    title?: string;
    display_name?: string;
  }) => {
    const addressText = selected.display_name || selected.address || selected.title || `${selected.lat.toFixed(5)}, ${selected.lon.toFixed(5)}`;
    
    const parts = selected.display_name ? selected.display_name.split(",") : [];
    let extractedCountry = profile.country;
    let extractedProvince = profile.province;
    let extractedCity = profile.city;

    if (parts.length >= 3) {
      const countryPart = parts[parts.length - 1].trim();
      const provincePart = parts[parts.length - 2].trim();
      const cityPart = parts[parts.length - 3].trim();

      if (countryPart) extractedCountry = countryPart;
      if (provincePart) extractedProvince = provincePart;
      if (cityPart) extractedCity = cityPart;
    }

    setProfile((prev) => ({
      ...prev,
      address: addressText,
      lat: selected.lat,
      lon: selected.lon,
      city: extractedCity,
      province: extractedProvince,
      country: extractedCountry,
    }));
  };

  // Security 2FA state
  const [authCode, setAuthCode] = useState("");
  const [authCodeStatus, setAuthCodeStatus] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isDeviceTrusted, setIsDeviceTrusted] = useState<boolean>(false);
  const [verifyingTestCode, setVerifyingTestCode] = useState<boolean>(false);

  // Setup Activation Flow State
  const [isActivating2FA, setIsActivating2FA] = useState<boolean>(false);
  const [setupCode, setSetupCode] = useState<string>("");
  const [verifyingSetup, setVerifyingSetup] = useState<boolean>(false);

  // Copy helper
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Health calculation helpers
  const calculateIMC = (weight?: number | string, height?: number | string) => {
    const w = parseFloat(String(weight || "0"));
    const h = parseFloat(String(height || "0")) / 100;
    if (!w || !h || h <= 0) return null;
    const imc = parseFloat((w / (h * h)).toFixed(1));
    let category = "Normal";
    let colorClass =
      "text-primary dark:text-primary bg-primary/10 border-primary/20";
    if (imc < 18.5) {
      category = "Bajo peso";
      colorClass =
        "text-primary dark:text-primary bg-primary/10 border-primary/20";
    } else if (imc >= 18.5 && imc <= 24.9) {
      category = "Saludable (Normal)";
      colorClass =
        "text-primary dark:text-primary bg-primary/10 border-primary/20";
    } else if (imc >= 25.0 && imc <= 29.9) {
      category = "Sobrepeso";
      colorClass =
        "text-primary dark:text-primary bg-primary/10 border-primary/20";
    } else {
      category = "Obesidad";
      colorClass =
        "text-primary dark:text-primary bg-primary/10 border-primary/20";
    }
    return { imc, category, colorClass };
  };

  const calculateAgeFromBirthDate = (dateStr: string): string => {
    if (!dateStr || typeof dateStr !== "string") return "";

    let birthYear: number | null = null;
    let birthMonth: number | null = null; // 1 - 12
    let birthDay: number | null = null; // 1 - 31

    const cleanStr = dateStr.trim();

    if (cleanStr.includes("-")) {
      const datePart = cleanStr.split("T")[0].split(" ")[0];
      const parts = datePart.split("-").map(Number);
      if (parts.length === 3) {
        if (parts[0] > 1000) {
          // YYYY-MM-DD
          birthYear = parts[0];
          birthMonth = parts[1];
          birthDay = parts[2];
        } else if (parts[2] > 1000) {
          // DD-MM-YYYY
          birthDay = parts[0];
          birthMonth = parts[1];
          birthYear = parts[2];
        }
      }
    } else if (cleanStr.includes("/")) {
      const datePart = cleanStr.split("T")[0].split(" ")[0];
      const parts = datePart.split("/").map(Number);
      if (parts.length === 3) {
        if (parts[2] > 1000) {
          // DD/MM/YYYY
          birthDay = parts[0];
          birthMonth = parts[1];
          birthYear = parts[2];
        } else if (parts[0] > 1000) {
          // YYYY/MM/DD
          birthYear = parts[0];
          birthMonth = parts[1];
          birthDay = parts[2];
        }
      }
    }

    if (
      !birthYear ||
      !birthMonth ||
      !birthDay ||
      isNaN(birthYear) ||
      isNaN(birthMonth) ||
      isNaN(birthDay)
    ) {
      const parsed = new Date(cleanStr);
      if (!isNaN(parsed.getTime())) {
        birthYear = parsed.getFullYear();
        birthMonth = parsed.getMonth() + 1;
        birthDay = parsed.getDate();
      } else {
        return "";
      }
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    let calculatedAge = currentYear - birthYear;
    if (
      currentMonth < birthMonth ||
      (currentMonth === birthMonth && currentDay < birthDay)
    ) {
      calculatedAge--;
    }

    if (calculatedAge < 0 || isNaN(calculatedAge)) return "0";
    return String(calculatedAge);
  };

  const handleBirthDateChange = (dateStr: string) => {
    const computedAge = calculateAgeFromBirthDate(dateStr);
    setProfile((prev) => ({
      ...prev,
      birthDate: dateStr,
      age: computedAge !== "" ? computedAge : prev.age,
    }));
  };

  useEffect(() => {
    // Load persisted profile from localStorage if exists
    try {
      const activeEmail = user?.email || auth.currentUser?.email || "hernanmaximiliano10@gmail.com";
      const activeName = user?.displayName || auth.currentUser?.displayName || "Hernan Sarmiento";

      const saved = localStorage.getItem("liquid_user_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        const autoAge = parsed.birthDate
          ? calculateAgeFromBirthDate(parsed.birthDate)
          : parsed.age || "";
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          displayName: parsed.displayName !== undefined ? parsed.displayName : activeName,
          email: activeEmail,
          age: autoAge || prev.age,
        }));
      } else {
        setProfile((prev) => ({
          ...prev,
          displayName: activeName,
          email: activeEmail,
        }));
      }

      // Check trusted device status
      const trustedRaw = localStorage.getItem("liquid_2fa_device_trusted");
      if (trustedRaw) {
        try {
          const parsedTrusted = JSON.parse(trustedRaw);
          if (parsedTrusted.trusted && parsedTrusted.expiresAt > Date.now()) {
            setIsDeviceTrusted(true);
          } else {
            setIsDeviceTrusted(false);
          }
        } catch (e) {
          setIsDeviceTrusted(false);
        }
      } else {
        setIsDeviceTrusted(false);
      }
    } catch (e) {
      console.error("Error loading profile from storage:", e);
    }
  }, [isOpen, user?.email, user?.displayName, profileSyncVersion]);

  // Generate real QR Code whenever email or twoFactorSecret changes
  useEffect(() => {
    if (profile.email && profile.twoFactorSecret) {
      generate2FAQRCode(profile.email, profile.twoFactorSecret).then((url) => {
        setQrCodeDataUrl(url);
      });
    }
  }, [profile.email, profile.twoFactorSecret]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const activeEmail = user?.email || auth.currentUser?.email || "hernanmaximiliano10@gmail.com";
      const fallbackName = user?.displayName || auth.currentUser?.displayName || "Usuario";
      const resolvedName = profile.displayName?.trim() || fallbackName;

      const updatedToSave: UserProfileData = {
        ...profile,
        displayName: resolvedName,
        email: activeEmail,
      };

      localStorage.setItem("liquid_user_profile", JSON.stringify(updatedToSave));
      if (onUpdateUser) {
        onUpdateUser(updatedToSave);
      }
      await new Promise((r) => setTimeout(r, 400));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStartSetup2FA = () => {
    if (!profile.twoFactorSecret) {
      const newSecret = generate2FASecret();
      const updated = { ...profile, twoFactorSecret: newSecret };
      setProfile(updated);
      localStorage.setItem("liquid_user_profile", JSON.stringify(updated));
      if (onUpdateUser) onUpdateUser(updated);
    }
    setIsActivating2FA(true);
    setSetupCode("");
    setAuthCodeStatus(null);
  };

  const handleDisable2FA = () => {
    const updated = { ...profile, twoFactorEnabled: false };
    setProfile(updated);
    localStorage.setItem("liquid_user_profile", JSON.stringify(updated));
    localStorage.removeItem("liquid_2fa_device_trusted");
    setIsDeviceTrusted(false);
    setIsActivating2FA(false);
    if (onUpdateUser) onUpdateUser(updated);
    setAuthCodeStatus("🔒 Autenticación de Dos Factores (2FA) desactivada.");
    setTimeout(() => setAuthCodeStatus(null), 4000);
  };

  const handleConfirmAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupCode.trim().length !== 6) {
      setAuthCodeStatus(
        "❌ Ingresa los 6 dígitos del código de tu app de Google Authenticator.",
      );
      return;
    }

    setVerifyingSetup(true);
    try {
      const isValid = await verify2FAToken(setupCode, profile.twoFactorSecret);
      if (isValid) {
        const updated = { ...profile, twoFactorEnabled: true };
        setProfile(updated);
        localStorage.setItem("liquid_user_profile", JSON.stringify(updated));

        // Trust device for 30 days automatically on setup
        const trustObj = {
          trusted: true,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        };
        localStorage.setItem(
          "liquid_2fa_device_trusted",
          JSON.stringify(trustObj),
        );
        setIsDeviceTrusted(true);

        setIsActivating2FA(false);
        setSetupCode("");
        if (onUpdateUser) onUpdateUser(updated);
        setAuthCodeStatus(
          "✅ ¡2FA de Google Authenticator validado y activado con éxito! Este dispositivo se guardó como seguro por 30 días.",
        );
      } else {
        setAuthCodeStatus(
          "❌ Código 2FA incorrecto o expirado. Asegúrate de haber escaneado el QR e ingresa el código de 6 dígitos actual.",
        );
      }
    } catch (err) {
      console.error("Error al validar 2FA:", err);
      setAuthCodeStatus("❌ Ocurrió un error al validar el código 2FA.");
    } finally {
      setVerifyingSetup(false);
    }
  };

  const handleRegenerateSecret = () => {
    const newSecret = generate2FASecret();
    const updated = { ...profile, twoFactorSecret: newSecret };
    setProfile(updated);
    localStorage.setItem("liquid_user_profile", JSON.stringify(updated));
    if (onUpdateUser) onUpdateUser(updated);
    setAuthCodeStatus(
      "✨ Nueva clave secreta y código QR generados con éxito. Vuelve a escanearlo en Google Authenticator.",
    );
    setTimeout(() => setAuthCodeStatus(null), 5000);
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authCode.trim().length !== 6) {
      setAuthCodeStatus(
        "❌ El código debe contener exactamente 6 dígitos numéricos.",
      );
      setTimeout(() => setAuthCodeStatus(null), 4000);
      return;
    }

    setVerifyingTestCode(true);
    try {
      const isValid = await verify2FAToken(authCode, profile.twoFactorSecret);
      if (isValid) {
        setAuthCodeStatus(
          "✅ ¡Código verificado con éxito! Tu aplicación Google Authenticator está correctamente sincronizada.",
        );
      } else {
        setAuthCodeStatus(
          "❌ Código 2FA inválido o expirado. Revisa la hora de tu teléfono y el código de 6 dígitos.",
        );
      }
    } catch (err) {
      setAuthCodeStatus("❌ Ocurrió un error al verificar el código.");
    } finally {
      setVerifyingTestCode(false);
      setTimeout(() => setAuthCodeStatus(null), 5000);
    }
  };

  const handleRevokeTrustedDevice = () => {
    localStorage.removeItem("liquid_2fa_device_trusted");
    setIsDeviceTrusted(false);
    setAuthCodeStatus(
      "🔒 Se eliminó este dispositivo como medio de confianza. Se solicitará el código 2FA en el próximo inicio de sesión.",
    );
    setTimeout(() => setAuthCodeStatus(null), 5000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-start justify-center p-3 md:p-6 pt-16 md:pt-24 pb-10 bg-black/60 backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
              darkMode
                ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                : "bg-white border-zinc-200 text-zinc-900"
            }`}
          >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-inherit flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 shadow-sm border border-slate-200 dark:border-transparent">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base md:text-lg">
                  Ajustes & Configuración de Usuario
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:text-primary border border-primary/20">
                  ID: Hernan Sarmiento
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                Gestiona tus datos personales, dirección y autenticación 2FA con
                Google Authenticator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-500/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation with Scroll Buttons */}
        <div className={`relative flex items-center border-b border-inherit shrink-0 ${
          darkMode ? "bg-zinc-950" : "bg-white"
        }`}>
          {/* Left Scroll Button */}
          {showLeftArrow && (
            <button
              type="button"
              onClick={() => scrollTabs("left")}
              className={`absolute left-0 z-10 h-full px-2.5 bg-gradient-to-r transition-all cursor-pointer flex items-center justify-center ${
                darkMode
                  ? "from-zinc-950 via-zinc-950/95 to-transparent text-zinc-400 hover:text-zinc-200"
                  : "from-white via-white/95 to-transparent text-zinc-500 hover:text-zinc-800"
              } ${["profile", "appearance", "health", "security", "backup"].indexOf(activeTab) === 0 ? "opacity-30 pointer-events-none" : ""}`}
              aria-label="Desplazar izquierda"
            >
              <div className={`p-1.5 rounded-full border flex items-center justify-center shadow-sm ${
                darkMode
                  ? "hover:bg-zinc-850 border-zinc-800 bg-zinc-900"
                  : "hover:bg-zinc-100 border-zinc-200/60 bg-white"
              }`}>
                <ChevronLeft className="w-4 h-4" />
              </div>
            </button>
          )}

          {/* Scrollable Tab Container */}
          <div
            ref={tabsRef}
            onScroll={updateScrollButtons}
            className="flex-1 flex px-4 overflow-x-auto scroll-smooth scrollbar-none scroll-smooth"
          >
            <button
              type="button"
              onClick={(e) => { setActiveTab("profile"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-xs md:text-sm border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "profile"
                  ? "border-primary text-primary"
                  : darkMode
                  ? "border-transparent text-zinc-400 hover:text-zinc-200"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Perfil & Datos Personales</span>
            </button>

            <button
              type="button"
              onClick={(e) => { setActiveTab("health"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-xs md:text-sm border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "health"
                  ? "border-primary text-primary"
                  : darkMode
                  ? "border-transparent text-zinc-400 hover:text-zinc-200"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Salud & Datos Físicos</span>
            </button>

            <button
              type="button"
              onClick={(e) => { setActiveTab("notifications"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-xs md:text-sm border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "notifications"
                  ? "border-primary text-primary"
                  : darkMode
                  ? "border-transparent text-zinc-400 hover:text-zinc-200"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notificaciones</span>
            </button>

            <button
              type="button"
              onClick={(e) => { setActiveTab("sharing"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-xs md:text-sm border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "sharing"
                  ? "border-primary text-primary"
                  : darkMode
                  ? "border-transparent text-zinc-400 hover:text-zinc-200"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Uso Compartido</span>
            </button>

            <button
              type="button"
              onClick={(e) => { setActiveTab("appearance"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-xs md:text-sm border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "appearance"
                  ? "border-primary text-primary"
                  : darkMode
                  ? "border-transparent text-zinc-400 hover:text-zinc-200"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Personalización de Interfaz</span>
            </button>

            <button
              type="button"
              onClick={(e) => { setActiveTab("security"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-xs md:text-sm border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "security"
                  ? "border-primary text-primary"
                  : darkMode
                  ? "border-transparent text-zinc-400 hover:text-zinc-200"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Seguridad & Google Authenticator</span>
            </button>

            <button
              type="button"
              onClick={(e) => { setActiveTab("backup"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-xs md:text-sm border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === "backup"
                  ? "border-primary text-primary"
                  : darkMode
                  ? "border-transparent text-zinc-400 hover:text-zinc-200"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>Respaldo (Google Drive)</span>
            </button>
          </div>

          {/* Right Scroll Button */}
          {showRightArrow && (
            <button
              type="button"
              onClick={() => scrollTabs("right")}
              className={`absolute right-0 z-10 h-full px-2.5 bg-gradient-to-l transition-all cursor-pointer flex items-center justify-center ${
                darkMode
                  ? "from-zinc-950 via-zinc-950/95 to-transparent text-zinc-400 hover:text-zinc-200"
                  : "from-white via-white/95 to-transparent text-zinc-500 hover:text-zinc-800"
              } ${["profile", "health", "sharing", "appearance", "security", "backup"].indexOf(activeTab) === 5 ? "opacity-30 pointer-events-none" : ""}`}
              aria-label="Desplazar derecha"
            >
              <div className={`p-1.5 rounded-full border flex items-center justify-center shadow-sm ${
                darkMode
                  ? "hover:bg-zinc-850 border-zinc-800 bg-zinc-900"
                  : "hover:bg-zinc-100 border-zinc-200/60 bg-white"
              }`}>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* TAB 1: PROFILE & PERSONAL DATA */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Profile Card Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {profile.photoURL ? (
                    <img
                      src={profile.photoURL}
                      alt={profile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-extrabold text-lg text-zinc-800 dark:text-zinc-200">
                      {profile.displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 truncate">
                    {profile.displayName}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {profile.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary dark:text-primary border border-primary/20 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Teléfono:{" "}
                      {profile.phoneNumber || "2644821280"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary-container text-primary dark:text-primary border border-primary/30">
                      {profile.city}, {profile.country}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Nombre Completo</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) =>
                        setProfile({ ...profile, displayName: e.target.value })
                      }
                      placeholder="Ingresa tu nombre completo..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      <span>Correo Electrónico</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700/50">
                      <Lock className="w-2.5 h-2.5" /> Cuenta Asociada
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 text-xs font-medium cursor-not-allowed select-none focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Nombre de Usuario / Nick</span>
                  </label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) =>
                      setProfile({ ...profile, username: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <span>Número de Teléfono</span>
                  </label>
                  <input
                    type="text"
                    value={profile.phoneNumber}
                    onChange={(e) =>
                      setProfile({ ...profile, phoneNumber: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5 relative">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Dirección Personal (Calle y Número)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => {
                        handleAddressSearch(e.target.value);
                        setShowAddressMap(true);
                      }}
                      onFocus={() => {
                        setShowAddressMap(true);
                        if (profile.address.trim().length >= 2 && addressSuggestions.length > 0) {
                          setShowAddressSuggestions(true);
                        }
                      }}
                      placeholder="Busca tu calle, ciudad o establecimiento en OpenStreetMap..."
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    {searchingAddress ? (
                      <div className="absolute right-3.5 top-3">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-zinc-400" />
                    )}
                  </div>

                  {/* Suggestions list */}
                  {showAddressSuggestions &&
                    profile.address.trim().length >= 2 &&
                    (addressSuggestions.length > 0 || searchingAddress) && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-52 overflow-y-auto p-1 left-0 divide-y divide-slate-100 dark:divide-zinc-800/40">
                        <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-950/60 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Resultados de OpenStreetMap</span>
                          <button
                            type="button"
                            onClick={() => setShowAddressSuggestions(false)}
                            className="text-[10px] font-extrabold text-primary hover:underline cursor-pointer"
                          >
                            Cerrar
                          </button>
                        </div>
                        {searchingAddress && addressSuggestions.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Buscando direcciones...</span>
                          </div>
                        ) : (
                          addressSuggestions.map((s, index) => {
                            const fullLoc = s.address && !s.title.toLowerCase().includes(s.address.toLowerCase().split(",")[0])
                              ? `${s.title} - ${s.address}`
                              : (s.name || s.title);
                            return (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleSelectAddressSuggestion(s)}
                                className="w-full text-left px-3 py-2 text-xs border border-transparent hover:border-primary hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 transition-colors flex items-start gap-2 rounded-lg cursor-pointer"
                              >
                                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold truncate">{s.title}</div>
                                  {s.address && (
                                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">
                                      {s.address}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}

                  {/* Interactive Small OpenStreetMap */}
                  {showAddressMap && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        <span>Ubicación en OpenStreetMap</span>
                        <button
                          type="button"
                          onClick={() => setShowAddressMap(false)}
                          className="text-[10px] font-extrabold text-primary hover:underline cursor-pointer"
                        >
                          Ocultar mapa
                        </button>
                      </div>
                      <LocationPickerMap
                        lat={profile.lat}
                        lon={profile.lon}
                        locationName={profile.address}
                        onSelectLocation={handleMapSelectLocation}
                        heightClass="h-44"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    País
                  </label>
                  <SearchableSelect
                    options={Country.getAllCountries().map(c => ({ value: c.isoCode, label: c.name }))}
                    value={Country.getAllCountries().find(c => c.name === profile.country || c.isoCode === profile.country)?.isoCode || ""}
                    onChange={(val) => {
                      const countryName = Country.getCountryByCode(val)?.name || val;
                      setProfile({ ...profile, country: val, province: "" })
                    }}
                    placeholder="Seleccionar país..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Provincia / Estado
                  </label>
                  <SearchableSelect
                    options={profile.country ? State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === profile.country || c.isoCode === profile.country)?.isoCode || profile.country).map(s => ({ value: s.isoCode, label: s.name })) : []}
                    value={profile.country ? State.getStatesOfCountry(Country.getAllCountries().find(c => c.name === profile.country || c.isoCode === profile.country)?.isoCode || profile.country).find(s => s.name === profile.province || s.isoCode === profile.province)?.isoCode || "" : ""}
                    onChange={(val) => {
                      setProfile({ ...profile, province: val })
                    }}
                    placeholder="Seleccionar provincia..."
                    disabled={!profile.country}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) =>
                      setProfile({ ...profile, city: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    <span>Ocupación / Institución</span>
                  </label>
                  <input
                    type="text"
                    value={profile.occupation}
                    onChange={(e) =>
                      setProfile({ ...profile, occupation: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {savedSuccess && (
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary dark:text-primary text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    ¡Los datos de tu perfil han sido guardados correctamente!
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Datos Personales</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB: PERSONALIZACIÓN DE INTERFAZ */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <span>Personalización de Interfaz</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Personaliza la apariencia visual, el fondo animado interactivo y el color de acento de la aplicación.
                </p>
              </div>

              {/* Theme & Appearance Option Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {darkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
                    <span>Apariencia y Tema de la Aplicación</span>
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                    Cambia el modo de color de la interfaz entre claro y oscuro.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-300/50 dark:border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDarkMode && setDarkMode(false)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      !darkMode
                        ? "bg-white text-zinc-900 shadow-md border border-slate-200"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-primary" />
                    <span>Modo Claro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDarkMode && setDarkMode(true)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      darkMode
                        ? "bg-zinc-950 text-white shadow-sm"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-primary" />
                    <span>Modo Oscuro</span>
                  </button>
                </div>
              </div>

              {/* Device Detection Option Card */}
              {(() => {
                const deviceInfo = detectCurrentDevice();
                const isMobileOrTablet = deviceInfo.deviceType === "mobile" || deviceInfo.deviceType === "tablet";

                return (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          {isMobileOrTablet ? (
                            <Smartphone className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Monitor className="w-4 h-4 text-blue-500" />
                          )}
                          <span>Dispositivo de Acceso Detectado</span>
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                          Detección automática en tiempo real de tu equipo y sistema operativo vía navigator.userAgent.
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Sesión Activa</span>
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl border flex items-center justify-center shrink-0 ${
                          isMobileOrTablet
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        }`}>
                          {isMobileOrTablet ? (
                            <Smartphone className="w-6 h-6" />
                          ) : (
                            <Monitor className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <span>{deviceInfo.formattedLabel}</span>
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-2 mt-0.5">
                            <span>{deviceInfo.browserName}</span>
                            <span>•</span>
                            <span>{deviceInfo.screenSize} px</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-700/50 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end text-[10px] text-zinc-400">
                        <span className="font-semibold text-zinc-500 dark:text-zinc-400 mb-0.5">userAgent:</span>
                        <span className="font-mono bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700/50 truncate max-w-[240px] text-[10px] text-zinc-600 dark:text-zinc-300" title={deviceInfo.userAgent}>
                          {deviceInfo.userAgent}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}



              {/* Individual Menus Visibility Option Card */}
              {setMenuVisibility && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3 shadow-xs">
                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span>Visibilidad Individual de Menús</span>
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                      Oculta o muestra cada menú (Turnos, Finanzas, Universidad, Salud, Comidas, Copiloto IA) de forma independiente.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      { id: "appointments", label: "Turnos", icon: Calendar },
                      { id: "finances", label: "Finanzas", icon: DollarSign },
                      { id: "academic", label: "Universidad", icon: GraduationCap },
                      { id: "health", label: "Salud", icon: Heart },
                      { id: "meals", label: "Comidas", icon: UtensilsCrossed },
                      { id: "ai", label: "Copiloto IA", icon: Sparkles },
                    ].map((menu) => {
                      const Icon = menu.icon;
                      const isVisible = menuVisibility?.[menu.id] !== false;
                      return (
                        <div
                          key={menu.id}
                          onClick={() => {
                            const updated = {
                              ...(menuVisibility || {
                                appointments: true,
                                finances: true,
                                academic: true,
                                health: true,
                                meals: true,
                                ai: true,
                              }),
                              [menu.id]: !isVisible,
                            };
                            setMenuVisibility(updated);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isVisible
                              ? "bg-white dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 shadow-xs"
                              : "bg-zinc-100/60 dark:bg-zinc-900/40 border-slate-200/50 dark:border-zinc-800 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{menu.label}</span>
                          </div>
                          <button
                            type="button"
                            className={`p-1.5 rounded-lg transition-colors ${
                              isVisible
                                ? "text-primary bg-primary/10 hover:bg-primary/20"
                                : "text-zinc-400 bg-zinc-200 dark:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-200"
                            }`}
                            title={isVisible ? "Ocultar menú" : "Mostrar menú"}
                          >
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Favorite Team Option Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3 shadow-xs relative z-50">
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span>Equipo Favorito (Deportes)</span>
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                    Ingresa tu equipo de fútbol, baloncesto u otro deporte para ver resultados rápidos en inicio.
                  </p>
                </div>
                <TeamSelect
                  value={profile.favoriteTeam || ""}
                  onChange={(val) => setProfile({ ...profile, favoriteTeam: val })}
                  placeholder="Ej: Boca Juniors, Real Madrid..."
                />
              </div>
              
              {/* Background Style Option Card */}
              {setBackgroundStyle && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Fondo Interactivo</span>
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                      Elige el estilo visual del fondo animado de la aplicación.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800/80 p-1 rounded-full border border-zinc-300/50 dark:border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBackgroundStyle("dither")}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        backgroundStyle === "dither"
                          ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>Ondas (Dither)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackgroundStyle("pixelblast")}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        backgroundStyle === "pixelblast"
                          ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>Pixeles (Blast)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackgroundStyle("plasma")}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        backgroundStyle === "plasma"
                          ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>Plasma</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Theme Color Option Card */}
              {setThemeColor && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />
                      <span>Color de Acento</span>
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                      Personaliza el color principal de la interfaz y del fondo animado.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 relative">
                    <div className="flex items-center justify-end gap-2">
                      <div
                        onClick={() => setShowColorPopover(!showColorPopover)}
                        className="w-8 h-8 rounded-full overflow-hidden border-2 border-zinc-300/50 dark:border-white/10 shrink-0 relative cursor-pointer group shadow-sm transition-transform hover:scale-110"
                        title="Abrir selector de color personalizado"
                      >
                        <div className="w-full h-full" style={{ backgroundColor: themeColor }} />
                      </div>
                      <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 font-medium">
                        {themeColor?.toUpperCase()}
                      </div>
                    </div>

                    {showColorPopover && (
                      <div className="absolute right-0 top-10 z-50 w-72 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                          <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-primary" />
                            Selector de Color Personalizado
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowColorPopover(false)}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Direct Custom Color Picker at the top */}
                        <div className="space-y-1.5 pb-3 border-b border-slate-100 dark:border-zinc-800">
                          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Elegir Color Personalizado</span>
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-10 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-zinc-700 shrink-0 cursor-pointer shadow-sm hover:scale-105 transition-transform">
                              <input
                                type="color"
                                value={themeColor}
                                onChange={(e) => setThemeColor(e.target.value)}
                                className="absolute inset-[-10px] w-20 h-20 opacity-0 cursor-pointer p-0"
                                title="Haga clic para elegir cualquier color personalizado"
                              />
                              <div className="w-full h-full" style={{ backgroundColor: themeColor }} />
                            </div>
                            <div className="relative flex-1 w-full">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">#</span>
                              <input
                                type="text"
                                value={themeColor.replace('#', '')}
                                onChange={(e) => {
                                  const val = '#' + e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                                  setThemeColor(val);
                                }}
                                className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-primary uppercase shadow-inner"
                                placeholder="8AB4F8"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Color presets grid */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Paleta de Colores</span>
                          <div className="grid grid-cols-6 gap-2">
                            {[
                              "#8ab4f8", "#a78bfa", "#f472b6", "#fb7185", "#f87171",
                              "#fb923c", "#fbbf24", "#a3e635", "#4ade80", "#2dd4bf",
                              "#38bdf8", "#818cf8", "#3b82f6", "#4f46e5", "#ec4899",
                              "#ef4444", "#f97316", "#eab308", "#84cc16", "#10b981",
                              "#06b6d4", "#0ea5e9", "#6366f1", "#a855f7"
                            ].map((preset, idx) => (
                              <button
                                key={`${preset}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setThemeColor(preset);
                                  setShowColorPopover(false);
                                }}
                                className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${themeColor === preset ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-primary" : ""}`}
                                style={{ backgroundColor: preset }}
                                aria-label={`Color ${preset}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap max-w-[150px] justify-end gap-1">
                      {[
                        "#8ab4f8", "#a78bfa", "#f472b6", "#fb7185", "#f87171",
                        "#fb923c", "#fbbf24", "#a3e635", "#4ade80", "#2dd4bf",
                        "#38bdf8", "#818cf8"
                      ].map((preset, idx) => (
                        <button
                          key={`${preset}-${idx}`}
                          type="button"
                          onClick={() => setThemeColor(preset)}
                          className={`w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-110 ${themeColor === preset ? "ring-2 ring-offset-1 ring-offset-slate-50 dark:ring-offset-zinc-900 ring-zinc-400 dark:ring-zinc-500" : ""}`}
                          style={{ backgroundColor: preset }}
                          aria-label={`Seleccionar color ${preset}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SALUD & DATOS FÍSICOS */}
          {activeTab === "notifications" && (
            <form onSubmit={handleSaveProfile} className="p-4 md:p-6 space-y-4">
              {/* Push Notifications Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary text-white dark:text-blue-950 shadow-md">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                        Notificaciones (app cerrada)
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Activá los avisos push para recibir recordatorios aunque no tengas la app abierta.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={isEnablingPush}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {isEnablingPush ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                      <span>{isEnablingPush ? "Activando..." : "Activar Notificaciones"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestPush}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      Probar
                    </button>
                  </div>
                </div>

                {pushStatus && (
                  <p className="text-xs font-bold text-primary dark:text-primary p-3 rounded-xl bg-primary-container border border-primary/30">
                    {pushStatus}
                  </p>
                )}
              </div>

              {/* WhatsApp Reminders Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-primary text-white dark:text-blue-950 shadow-md">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                      Recordatorios por WhatsApp
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Usa CallMeBot (gratis, uso personal). Cada persona activa el suyo — ver instrucciones en callmebot.com.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Tu número (con código de país)
                    </label>
                    <input
                      type="text"
                      value={profile.whatsappPhoneNumber || ""}
                      onChange={(e) => setProfile({ ...profile, whatsappPhoneNumber: e.target.value })}
                      placeholder="+5492644711127"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Tu APIKEY de CallMeBot
                    </label>
                    <input
                      type="text"
                      value={profile.whatsappApiKey || ""}
                      onChange={(e) => setProfile({ ...profile, whatsappApiKey: e.target.value })}
                      placeholder="123456"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestWhatsapp}
                  disabled={isSendingWhatsapp}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSendingWhatsapp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                  <span>{isSendingWhatsapp ? "Enviando..." : "Probar mensaje"}</span>
                </button>

                {whatsappStatus && (
                  <p className="text-xs font-bold text-primary dark:text-primary p-3 rounded-xl bg-primary-container border border-primary/30">
                    {whatsappStatus}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Notificaciones</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === "health" && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Health Summary Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/10 to-primary/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-primary text-white dark:text-blue-950 dark:text-blue-950 shadow-lg shadow-primary/20 shrink-0">
                    <HeartPulse className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      Ficha Médica & Salud Personal
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:text-primary border border-primary/20">
                        {profile.displayName}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Información relevante para seguimiento de salud,
                      emergencias médicas y parámetros físicos
                    </p>
                  </div>
                </div>

                {/* IMC & Sangre Badges */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  {(() => {
                    const imcInfo = calculateIMC(
                      profile.weightKg,
                      profile.heightCm,
                    );
                    if (imcInfo) {
                      return (
                        <div
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${imcInfo.colorClass}`}
                        >
                          <Activity className="w-4 h-4" />
                          <span>
                            IMC: {imcInfo.imc} ({imcInfo.category})
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary dark:text-primary text-xs font-black flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5" />
                    <span>Grupo: {profile.bloodType || "O+"}</span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 1: MEDICIONES FÍSICAS BÁSICAS */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2.5">
                  <Ruler className="w-4 h-4 text-primary" />
                  <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    1. Mediciones Físicas & Parámetros Biológicos
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Fecha de Nacimiento */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Fecha de Nacimiento</span>
                    </label>
                    <SmartDateTimePicker
                      value={profile.birthDate || ""}
                      onChange={(val) => handleBirthDateChange(val)}
                      showTimeOption={false}
                      placeholder="Seleccionar fecha"
                    />
                  </div>

                  {/* Edad */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>Edad (años)</span>
                      </label>
                      {profile.birthDate && profile.age ? (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                          Autocalculada
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-zinc-500">
                          Automática
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={profile.age ? `${profile.age} años` : ""}
                      readOnly
                      disabled
                      placeholder="Se calcula de tu fecha de nac."
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-100/80 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 text-xs font-bold cursor-not-allowed select-none focus:outline-none transition-all"
                    />
                  </div>

                  {/* Género / Sexo Biológico */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>Género / Sexo Biológico</span>
                    </label>
                    <HealthCustomSelect
                      value={profile.gender || ""}
                      onChange={(val) =>
                        setProfile({ ...profile, gender: val })
                      }
                      placeholder="Seleccionar género..."
                      options={[
                        { value: "Masculino", label: "Masculino" },
                        { value: "Femenino", label: "Femenino" },
                        { value: "Otro", label: "Otro / No binario" },
                        {
                          value: "Prefiero no decir",
                          label: "Prefiero no decir",
                        },
                      ]}
                    />
                  </div>

                  {/* Peso */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Weight className="w-3.5 h-3.5 text-primary" />
                      <span>Peso (kg)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={profile.weightKg || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, weightKg: e.target.value })
                      }
                      placeholder="Ej: 74.5"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Altura */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5 text-primary" />
                      <span>Altura (cm)</span>
                    </label>
                    <input
                      type="number"
                      value={profile.heightCm || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, heightCm: e.target.value })
                      }
                      placeholder="Ej: 178"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Grupo Sanguíneo */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Droplet className="w-3.5 h-3.5 text-primary" />
                      <span>Grupo Sanguíneo & Factor RH</span>
                    </label>
                    <HealthCustomSelect
                      value={profile.bloodType || ""}
                      onChange={(val) =>
                        setProfile({ ...profile, bloodType: val })
                      }
                      placeholder="Seleccionar grupo sanguíneo..."
                      valueColorClass="text-primary dark:text-primary"
                      options={[
                        { value: "O+", label: "O+ (O Positivo)" },
                        { value: "O-", label: "O- (O Negativo)" },
                        { value: "A+", label: "A+ (A Positivo)" },
                        { value: "A-", label: "A- (A Negativo)" },
                        { value: "B+", label: "B+ (B Positivo)" },
                        { value: "B-", label: "B- (B Negativo)" },
                        { value: "AB+", label: "AB+ (AB Positivo)" },
                        { value: "AB-", label: "AB- (AB Negativo)" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: ANTECEDENTES Y COBERTURA MÉDICA */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2.5">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    2. Antecedentes Médicos, Alergias & Cobertura
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Alergias */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-primary" />
                      <span>Alergias e Intolerancias</span>
                    </label>
                    <input
                      type="text"
                      value={profile.allergies || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, allergies: e.target.value })
                      }
                      placeholder="Ej: Penicilina, Mariscos, Polvo, Ninguna"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Enfermedades Crónicas */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      <span>Condiciones o Enfermedades Crónicas</span>
                    </label>
                    <input
                      type="text"
                      value={profile.chronicConditions || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          chronicConditions: e.target.value,
                        })
                      }
                      placeholder="Ej: Asma leve, Hipertensión, Diabetes, Ninguna"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Medicamentos Frecuentes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-primary" />
                      <span>Medicamentos o Suplementos Habituales</span>
                    </label>
                    <input
                      type="text"
                      value={profile.medicationsSummary || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          medicationsSummary: e.target.value,
                        })
                      }
                      placeholder="Ej: Vitamina C 1000mg, Enalapril 10mg, Ninguno"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Obra Social / Prepaga */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span>Obra Social / Cobertura Médica</span>
                    </label>
                    <input
                      type="text"
                      value={profile.healthInsurance || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          healthInsurance: e.target.value,
                        })
                      }
                      placeholder="Ej: OSDE Plan 210, Swiss Medical, Galeno, PAMI"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: ESTILO DE VIDA & CONTACTO DE EMERGENCIA */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2.5">
                  <PhoneCall className="w-4 h-4 text-primary" />
                  <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    3. Contacto de Emergencia & Estilo de Vida
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contacto Nombre */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>Contacto de Emergencia (Nombre)</span>
                    </label>
                    <input
                      type="text"
                      value={profile.emergencyContactName || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          emergencyContactName: e.target.value,
                        })
                      }
                      placeholder="Ej: María Sarmiento (Madre)"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Contacto Teléfono */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      <span>Teléfono de Emergencia</span>
                    </label>
                    <input
                      type="text"
                      value={profile.emergencyContactPhone || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          emergencyContactPhone: e.target.value,
                        })
                      }
                      placeholder="Ej: 2645123456"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-primary dark:text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    />
                  </div>

                  {/* Nivel de Actividad Física */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      <span>Nivel de Actividad Física</span>
                    </label>
                    <HealthCustomSelect
                      value={profile.activityLevel || ""}
                      onChange={(val) =>
                        setProfile({ ...profile, activityLevel: val })
                      }
                      placeholder="Seleccionar nivel de actividad..."
                      options={[
                        {
                          value: "Sedentario (Poco o ningún ejercicio)",
                          label: "Sedentario (Poco o ningún ejercicio)",
                        },
                        {
                          value: "Ligeramente Activo (1-2 días/semana)",
                          label: "Ligeramente Activo (1-2 días/semana)",
                        },
                        {
                          value: "Moderadamente Activo (3-4 días/semana)",
                          label: "Moderadamente Activo (3-4 días/semana)",
                        },
                        {
                          value: "Muy Activo (5-6 días/semana)",
                          label: "Muy Activo (5-6 días/semana)",
                        },
                        {
                          value: "Atleta / Entrenamiento Intenso Diario",
                          label: "Atleta / Entrenamiento Intenso Diario",
                        },
                      ]}
                      previewTransform={(lbl) => lbl.split(" (")[0]}
                    />
                  </div>

                  {/* Donante de Órganos */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-primary" />
                      <span>Donante de Órganos</span>
                    </label>
                    <HealthCustomSelect
                      value={profile.organDonor || ""}
                      onChange={(val) =>
                        setProfile({ ...profile, organDonor: val })
                      }
                      placeholder="Seleccionar condición de donante..."
                      options={[
                        {
                          value: "Sí (Donante Expreso)",
                          label: "Sí (Donante Expreso)",
                        },
                        { value: "No", label: "No" },
                        {
                          value: "No especificado / Decisión Familiar",
                          label: "No especificado / Decisión Familiar",
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Notas de Salud */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Notas u Observaciones Médicas Adicionales</span>
                  </label>
                  <textarea
                    rows={2}
                    value={profile.healthNotes || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, healthNotes: e.target.value })
                    }
                    placeholder="Instrucciones específicas en caso de desmayos, cirugías previas, prótesis, etc."
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                  />
                </div>
              </div>

              {savedSuccess && (
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary dark:text-primary text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    ¡Los datos de tu ficha médica han sido guardados
                    correctamente!
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Ficha de Salud</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB: USO COMPARTIDO */}
          {activeTab === "sharing" && (
            <div className="space-y-6">
              <SharedSectionsManager
                userEmail={profile.email || user?.email || auth.currentUser?.email || "hernanmaximiliano10@gmail.com"}
                darkMode={darkMode}
              />

              <AgendaSharingManager
                user={user}
                darkMode={darkMode}
                outgoingShares={outgoingShares}
                incomingShares={incomingShares}
                appointments={appointments}
                turnosCompromisos={turnosCompromisos}
                invoices={invoices}
                detailedPayments={detailedPayments}
                organizacionSemanal={organizacionSemanal}
                platos={platos}
                disponibilidadMedicamentos={disponibilidadMedicamentos}
                medicamentosDetallados={medicamentosDetallados}
              />
            </div>
          )}

          {/* TAB 2: SECURITY & GOOGLE AUTHENTICATOR (2FA) */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Email Verification Card (Firebase Auth) */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary text-white dark:text-blue-950 shadow-md">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                        Verificación de Correo en Gmail (Firebase Auth)
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Envía un mensaje oficial de confirmación a tu dirección de correo ({profile.email || auth.currentUser?.email || "tu cuenta"}) para validar tu identidad.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {auth.currentUser?.emailVerified ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Correo Verificado</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendEmailVerification}
                        disabled={isSendingVerification}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSendingVerification ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Mail className="w-3.5 h-3.5" />
                        )}
                        <span>{isSendingVerification ? "Enviando..." : "Enviar Correo de Verificación"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {emailVerificationStatus && (
                  <p className="text-xs font-bold text-primary dark:text-primary p-3 rounded-xl bg-primary-container border border-primary/30">
                    {emailVerificationStatus}
                  </p>
                )}
              </div>

              {/* 2FA Google Authenticator Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary text-white dark:text-blue-950 shadow-md">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                        Google Authenticator (Autenticación de Dos Factores -
                        2FA)
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Protección adicional requerida para acceder a la cuenta
                        de {profile.displayName}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge & Action */}
                  <div className="flex items-center gap-3">
                    {profile.twoFactorEnabled ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary dark:text-primary border border-primary/20 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>2FA Activado</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleDisable2FA}
                          className="px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs cursor-pointer transition-all border border-red-500/20"
                        >
                          Desactivar
                        </button>
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        2FA Desactivado
                      </span>
                    )}
                  </div>
                </div>

                {authCodeStatus && (
                  <p className="text-xs font-bold text-primary dark:text-primary p-3 rounded-xl bg-primary-container border border-primary/30">
                    {authCodeStatus}
                  </p>
                )}

                {/* CASE A: 2FA ACTIVATED */}
                {profile.twoFactorEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
                    {/* Real Dynamic QR Code */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-zinc-900 border border-slate-200 shadow-md">
                      {qrCodeDataUrl ? (
                        <div className="p-2 bg-white rounded-xl shadow-inner border border-slate-100 flex flex-col items-center">
                          <img
                            src={qrCodeDataUrl}
                            alt="Código QR Google Authenticator"
                            className="w-40 h-40 object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="w-40 h-40 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-zinc-400 font-medium">
                          Generando QR...
                        </div>
                      )}
                      <p className="text-[11px] text-zinc-600 font-extrabold mt-2 text-center flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-primary" />
                        <span>Google Authenticator Sincronizado</span>
                      </p>
                    </div>

                    {/* Details, Secret & Test Form */}
                    <div className="md:col-span-8 space-y-3">
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                        Tu cuenta está protegida. Si cambias de teléfono o
                        deseas re-sincronizar la aplicación, la clave secreta
                        registrada es:
                      </p>

                      {/* Base32 Secret Display */}
                      <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between font-mono text-xs font-black tracking-widest text-primary dark:text-primary">
                        <span>{profile.twoFactorSecret}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(profile.twoFactorSecret, "2fa")
                            }
                            className="px-2.5 py-1 rounded-full bg-primary-container hover:bg-primary-container text-primary text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
                          >
                            {copiedField === "2fa" ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {copiedField === "2fa"
                                ? "¡Copiada!"
                                : "Copiar Clave"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleRegenerateSecret}
                          className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold flex items-center gap-1.5 transition-all cursor-pointer underline underline-offset-4"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Generar Nueva Clave Secreta y QR</span>
                        </button>
                      </div>

                      {/* Test Verification Form */}
                      <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-2">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                          Probar Sincronización de Código:
                        </label>
                        <form
                          onSubmit={handleVerify2FA}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            maxLength={6}
                            value={authCode}
                            onChange={(e) =>
                              setAuthCode(e.target.value.replace(/\D/g, ""))
                            }
                            placeholder="Ej: 482910"
                            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-mono text-xs text-center w-32 focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={
                              verifyingTestCode || authCode.length !== 6
                            }
                            className="px-4 py-2 rounded-full bg-primary hover:bg-primary disabled:opacity-50 text-white dark:text-blue-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            {verifyingTestCode
                              ? "Verificando..."
                              : "Verificar Código"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* CASE B: 2FA NOT ACTIVATED, BUT USER CLICKED SETUP */}
                {!profile.twoFactorEnabled && isActivating2FA && (
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-primary/30 shadow-lg space-y-5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white dark:text-blue-950 font-black text-xs">
                          1
                        </span>
                        <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                          Escanea el código QR en tu app Google Authenticator
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsActivating2FA(false)}
                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      {/* QR Display */}
                      <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                        {qrCodeDataUrl ? (
                          <div className="p-2 bg-white rounded-xl shadow-md border border-slate-100 flex flex-col items-center">
                            <img
                              src={qrCodeDataUrl}
                              alt="Código QR Google Authenticator"
                              className="w-44 h-44 object-contain rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="w-44 h-44 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-zinc-400 font-medium">
                            Generando QR...
                          </div>
                        )}
                      </div>

                      {/* Instructions & Secret Key */}
                      <div className="md:col-span-7 space-y-3">
                        <ol className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 font-medium list-decimal pl-4">
                          <li>
                            Abre la app <b>Google Authenticator</b> o{" "}
                            <b>Authy</b> en tu teléfono.
                          </li>
                          <li>
                            Toca el botón <b>"+"</b> y elige{" "}
                            <b>"Escanear un código QR"</b>.
                          </li>
                          <li>Si prefieres ingresar la clave manualmente:</li>
                        </ol>

                        {/* Secret Key Display */}
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between font-mono text-xs font-black tracking-widest text-primary dark:text-primary">
                          <span>{profile.twoFactorSecret}</span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(profile.twoFactorSecret, "2fa")
                            }
                            className="px-2 py-1 rounded-full bg-primary-container hover:bg-primary-container text-primary text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
                          >
                            {copiedField === "2fa" ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {copiedField === "2fa" ? "Copiada" : "Copiar"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Code Validation */}
                    <div className="border-t border-slate-200 dark:border-zinc-800 pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white dark:text-blue-950 font-black text-xs">
                          2
                        </span>
                        <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                          Ingresa el código de 6 dígitos que te muestra ahora
                          Google Authenticator para confirmar:
                        </h4>
                      </div>

                      <form
                        onSubmit={handleConfirmAndEnable2FA}
                        className="flex flex-col sm:flex-row items-center gap-3 pt-1"
                      >
                        <input
                          type="text"
                          maxLength={6}
                          value={setupCode}
                          onChange={(e) =>
                            setSetupCode(e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="000000"
                          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-base font-black tracking-widest text-center w-full sm:w-44 focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={
                            verifyingSetup || setupCode.trim().length !== 6
                          }
                          className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-primary hover:bg-primary disabled:opacity-50 text-white dark:text-blue-950 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                          {verifyingSetup
                            ? "Validando..."
                            : "Confirmar y Activar 2FA Ahora"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* CASE C: 2FA NOT ACTIVATED, SHOW PROMPT */}
                {!profile.twoFactorEnabled && !isActivating2FA && (
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                          Aún no has configurado Google Authenticator
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          La Autenticación de Dos Factores genera un código
                          temporal dinámico cada 30 segundos en tu teléfono para
                          garantizar que solo tú puedas ingresar.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleStartSetup2FA}
                        className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 dark:text-blue-950 font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4" />
                        <span>
                          Configurar y Activar Google Authenticator (2FA)
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Trusted Devices and Active Sessions */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400">
                  Dispositivo de Confianza y Sesión Actual
                </h4>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-primary border border-primary/20">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-zinc-800 dark:text-zinc-200">
                        Chrome en Linux (San Juan, Argentina)
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Estado de Confianza:{" "}
                        {isDeviceTrusted
                          ? "Guardado como dispositivo seguro por 30 días"
                          : "No guardado como dispositivo de confianza"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDeviceTrusted ? (
                      <button
                        type="button"
                        onClick={handleRevokeTrustedDevice}
                        className="px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revocar Confianza de este Dispositivo</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        Sesión Activa
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "backup" && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3.5 rounded-2xl bg-primary text-white dark:text-blue-950 shadow-lg shadow-primary/20 shrink-0">
                    <Cloud className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      Copia de Seguridad en Google Drive
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
                      Resguarda automáticamente tus tablas de datos en archivos de Excel (.xlsx) estructurados por Menús y Submenús en tu cuenta personal de Google Drive.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col gap-1.5 md:items-end">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Última copia</span>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                    {lastBackupDate ? new Date(lastBackupDate).toLocaleString("es-AR") : "Nunca realizada"}
                  </span>
                </div>
              </div>

              {/* Settings and Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Auto Backup Configuration Card */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-primary" />
                      <span>Backup Automático</span>
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      Si está habilitado, la aplicación realizará un respaldo silencioso en Google Drive una vez al mes al iniciar la aplicación.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {isAutoBackupEnabled ? "Habilitado (Mensual)" : "Deshabilitado"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleAutoBackup(!isAutoBackupEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isAutoBackupEnabled ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isAutoBackupEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Manual Backup Card */}
                <div className="md:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-primary" />
                      <span>Ejecutar Backup Manual</span>
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      Crea o actualiza de forma inmediata toda la estructura de carpetas y archivos Excel en tu Google Drive. Esto no interferirá con tu respaldo automático mensual.
                    </p>
                  </div>

                  {isBackupRunning ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-primary truncate max-w-[250px]">{backupProgressMsg}</span>
                        <span>{backupProgressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-950 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-zinc-800">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${backupProgressPct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleRunBackup}
                        className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Respaldar Todo Ahora</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Logs Section */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-primary" />
                  <span>Historial de Respaldos</span>
                </h4>

                {backupLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-400">
                    No se registran copias de seguridad anteriores.
                  </div>
                ) : (
                  <div className="overflow-x-auto scroll-smooth max-h-[210px] overflow-y-auto rounded-xl border border-slate-100 dark:border-zinc-800/80">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-20">
                        <tr className="bg-slate-50 dark:bg-zinc-900/40 text-zinc-500 font-extrabold border-b border-slate-100 dark:border-zinc-800/80">
                          <th className="p-3">Fecha y Hora</th>
                          <th className="p-3">Estado</th>
                          <th className="p-3">Detalle / Mensaje</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                        {backupLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/10 font-medium transition-colors">
                            <td className="p-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400 font-semibold">
                              {new Date(log.timestamp).toLocaleString("es-AR")}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  log.status === "success"
                                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/10"
                                    : log.status === "error"
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/10"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10"
                                }`}
                              >
                                {log.status === "success" ? "Completado" : log.status === "error" ? "Error" : "En progreso"}
                              </span>
                            </td>
                            <td className="p-3 text-zinc-700 dark:text-zinc-300 font-semibold max-w-xs md:max-w-md truncate" title={log.message}>
                              {log.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
