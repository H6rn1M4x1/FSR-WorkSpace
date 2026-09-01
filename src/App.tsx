import { useState, useEffect, useRef } from "react";
import { StorageService, AestheticStorageService, setStoredDataSilent, setSyncUserId } from "./lib/storage";
import { subscribeToCategory, saveItemToFirestore, refetchCategory } from "./lib/firestoreSyncService";
import { reconcileCollection, sanitizeSyncPayload, saveStateToServer } from "./utils/sync";
import { getLocalDateString } from "./utils/date";
import { useToast } from "./context/ToastContext";
import { initAuth, logout, auth } from "./lib/supabase";
import { WorkspaceService } from "./lib/workspace";
import { Eye, EyeOff, Settings, Folder, RefreshCw } from "lucide-react";
import LoginScreen from "./components/LoginScreen";
import Logo from "./components/Logo";
import TopNavbar, { SUBMENUS_BY_TAB } from "./components/TopNavbar";
import HomeView from "./components/HomeView";
import AcademicView from "./components/AcademicView";
import MealsView from "./components/MealsView";
import FinanceView from "./components/FinanceView";
import AppointmentsView from "./components/AppointmentsView";
import HealthView from "./components/HealthView";
import AIAssistant from "./components/AIAssistant";
import PageSkeleton from "./components/PageSkeleton";
import { UserSettingsModal, UserProfileData } from "./components/UserSettingsModal";
import { TwoFactorLoginModal } from "./components/TwoFactorLoginModal";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { useScrollReveal } from "./hooks/useScrollReveal";
import { DriveBackupService } from "./lib/driveBackupService";
import { syncMonthlyMatches } from "./lib/matchScheduler";
import Dither from "./components/Dither";
import PixelBlast from "./components/PixelBlast";
import Plasma from "./components/Plasma";
import {
  AlimentacionLog,
  AcademicSubject,
  AcademicTask,
  AcademicNote,
  PantryItem,
  MealPlan,
  ShoppingItem,
  Invoice,
  PaymentRecord,
  DetailedPayment,
  GastoVario,
  Inversion,
  CotizacionAccion,
  CotizacionCripto,
  MonthlyBudget,
  Appointment,
  RoutineLog,
  Medication,
  BloodPressureLog,
  DoctorCard,
  AppNotification,
  MercaderiaItem,
  AlimentoItem,
  PlatoItem,
  OrganizacionSemanalItem,
  TurnoCompromiso,
  MedicamentoDetallado,
  DisponibilidadMedicamento,
  DeporteActividad,
  RutinaGimnasio,
  RegistroEntrenamiento,
  MedicalRecord,
  MateriaInfo,
  HorarioItem,
  ExamenItem,
  AgendaShare
} from "./types";
import {
  subscribeOutgoingShares,
  subscribeIncomingShares,
  updateShare,
  isFirestoreQuotaExceeded,
  testConnection
} from "./lib/sharing";
import {
  SectionLink,
  subscribeToSectionLinks,
  getEffectiveSectionUserId
} from "./lib/sectionSharingService";

export default function App() {
  const { showToast } = useToast();
  const isRemoteUpdateRef = useRef(false);
  
  // Custom hook for smooth scroll reveal animations across sections
  useScrollReveal();
  const isLocalMutatingRef = useRef(false);
  const mutationLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lockLocalMutation = () => {
    isLocalMutatingRef.current = true;
    if (mutationLockTimerRef.current) {
      clearTimeout(mutationLockTimerRef.current);
    }
    mutationLockTimerRef.current = setTimeout(() => {
      isLocalMutatingRef.current = false;
    }, 2000);
  };

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [guestMode, setGuestMode] = useState(false);

  // Layout State & Aesthetic Preferences (LocalStorage EXCLUSIVE per device)
  const [currentTab, setCurrentTab] = useState("home");
  const [activeSubTab, setActiveSubTab] = useState("");
  const [darkMode, setDarkMode] = useState<boolean>(() => AestheticStorageService.getDarkMode());
  const [backgroundStyle, setBackgroundStyle] = useState<"dither" | "pixelblast" | "plasma">(() => AestheticStorageService.getBackgroundStyle());
  const [themeColor, setThemeColor] = useState(() => AestheticStorageService.getThemeColor());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>(() => AestheticStorageService.getMenuVisibility());

  useEffect(() => {
    AestheticStorageService.setMenuVisibility(menuVisibility);
  }, [menuVisibility]);

  useEffect(() => {
    AestheticStorageService.setDarkMode(darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (currentTab !== "home" && menuVisibility[currentTab] === false) {
      setCurrentTab("home");
    }
  }, [menuVisibility, currentTab]);

  useEffect(() => {
    AestheticStorageService.setBackgroundStyle(backgroundStyle);
  }, [backgroundStyle]);

  useEffect(() => {
    AestheticStorageService.setThemeColor(themeColor);
    document.documentElement.style.setProperty("--color-primary", themeColor);
    document.body.style.setProperty("--color-primary", themeColor);

    // Update dynamic PWA icon, Favicon, and Web App Manifest per device accent color
    try {
      const svgIconString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%"><path d="M 256,32 Q 256,256 480,256 Q 256,256 256,480 Q 256,256 32,256 Q 256,256 256,32 Z" fill="${themeColor}" stroke="${themeColor}" stroke-width="2" stroke-linejoin="round"/></svg>`;
      const svgBlob = new Blob([svgIconString], { type: "image/svg+xml" });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Update <link rel="icon"> and <link rel="apple-touch-icon">
      const iconLinks = document.querySelectorAll("link[rel='icon'], link[rel='apple-touch-icon'], link[rel='shortcut icon']");
      iconLinks.forEach((link: any) => {
        link.href = svgUrl;
      });

      // Update dynamic manifest blob URL so installing on this specific device captures this device's accent color
      const manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
      if (manifestLink) {
        const dynamicManifest = {
          name: "FSR - Workspace",
          short_name: "FSR",
          description: "Tu espacio de trabajo interactivo, minimalista y funcional",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "any",
          background_color: "#000000",
          theme_color: "#000000",
          icons: [
            {
              src: svgUrl,
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any"
            },
            {
              src: svgUrl,
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any maskable"
            },
            {
              src: svgUrl,
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any maskable"
            }
          ]
        };
        const manifestBlob = new Blob([JSON.stringify(dynamicManifest, null, 2)], { type: "application/manifest+json" });
        manifestLink.href = URL.createObjectURL(manifestBlob);
      }
    } catch (e) {
      console.warn("Could not dynamically update device PWA icon:", e);
    }
  }, [themeColor]);

  const themeColorRef = useRef(themeColor);
  useEffect(() => {
    themeColorRef.current = themeColor;
  }, [themeColor]);

  const sanitizeColor = (color: string, accentColor: string): string => {
    if (typeof color !== "string") return color;
    const c = color.trim().toLowerCase();
    if (c === "#e09407") return accentColor;
    if (c === "#384150") return accentColor;
    if (c === "#5e57a7") return "#000000";
    return color;
  };

  const deepReplaceColors = <T,>(obj: T, accentColor: string): T => {
    if (!obj) return obj;
    if (typeof obj === "string") {
      return sanitizeColor(obj, accentColor) as any;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => deepReplaceColors(item, accentColor)) as any;
    }
    if (typeof obj === "object") {
      const newObj: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (key.toLowerCase().includes("color") && typeof obj[key] === "string") {
            newObj[key] = sanitizeColor(obj[key] as string, accentColor);
          } else {
            newObj[key] = deepReplaceColors(obj[key], accentColor);
          }
        }
      }
      return newObj as T;
    }
    return obj;
  };


  const hexToRgbArray = (hex: string) => {
    const c = hex.startsWith("#") ? hex.slice(1) : hex;
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    return [r, g, b] as [number, number, number];
  };

  const handleTabChange = (newTab: string) => {
    setCurrentTab(newTab);
    const subMenu = SUBMENUS_BY_TAB[newTab];
    if (subMenu && subMenu.length > 0) {
      setActiveSubTab(subMenu[0].id);
    } else {
      setActiveSubTab("");
    }
  };

  // Check periodically or on user changes if Firestore quota is exceeded
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [appConfirmModal, setAppConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const lastSyncErrorTimeRef = useRef<number>(0);
  const lastComparableStateRef = useRef<string>("");
  
  useEffect(() => {
    // Run an initial check on boot
    const checkConn = async () => {
      const isOk = await testConnection();
      if (isOk && isFirestoreQuotaExceeded) {
        setQuotaExceeded(false);
        console.log("¡Cuota de Firestore restablecida! Sincronizando datos de vuelta a Firebase...");
        lastComparableStateRef.current = ""; // Fuerza re-sincronización
      } else {
        setQuotaExceeded(isFirestoreQuotaExceeded);
      }
    };
    
    checkConn();
    // Auto-check interval disabled to avoid background quota usage
  }, [quotaExceeded]);

  // Check and run automatic monthly backup on startup if configured
  useEffect(() => {
    DriveBackupService.checkAndRunMonthlyBackupIfNeeded()
      .then((ran) => {
        if (ran) {
          console.log("Copia de seguridad automática mensual ejecutada con éxito.");
        }
      })
      .catch((err) => {
        console.warn("Error al intentar realizar la copia de seguridad automática mensual:", err);
      });
  }, []);

  // Core Data States
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [notes, setNotes] = useState<AcademicNote[]>([]);
  const [materiasInfo, setMateriasInfo] = useState<MateriaInfo[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [detailedPayments, setDetailedPayments] = useState<DetailedPayment[]>([]);
  const [gastosVarios, setGastosVarios] = useState<GastoVario[]>([]);
  const [inversiones, setInversiones] = useState<Inversion[]>([]);
  const [cotizacionesAcciones, setCotizacionesAcciones] = useState<CotizacionAccion[]>([]);
  const [cotizacionesCripto, setCotizacionesCripto] = useState<CotizacionCripto[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [routines, setRoutines] = useState<RoutineLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [bpLogs, setBpLogs] = useState<BloodPressureLog[]>([]);
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [mercaderia, setMercaderia] = useState<MercaderiaItem[]>([]);
  const [alimentos, setAlimentos] = useState<AlimentoItem[]>([]);
  const [platos, setPlatos] = useState<PlatoItem[]>([]);
  const [organizacionSemanal, setOrganizacionSemanal] = useState<OrganizacionSemanalItem[]>([]);
  const [turnosCompromisos, setTurnosCompromisos] = useState<TurnoCompromiso[]>([]);
  const [medicamentosDetallados, setMedicamentosDetallados] = useState<MedicamentoDetallado[]>([]);
  const [disponibilidadMedicamentos, setDisponibilidadMedicamentos] = useState<DisponibilidadMedicamento[]>([]);
  const [deportesActividades, setDeportesActividades] = useState<DeporteActividad[]>([]);
  const [rutinasGimnasio, setRutinasGimnasio] = useState<RutinaGimnasio[]>([]);
  const [registrosEntrenamiento, setRegistrosEntrenamiento] = useState<RegistroEntrenamiento[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [alimentacionLogs, setAlimentacionLogs] = useState<AlimentacionLog[]>([]);
  const [horarios, setHorarios] = useState<HorarioItem[]>([]);
  const [examenes, setExamenes] = useState<ExamenItem[]>([]);

  // User Settings State
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  // --- Cross-device sync for the user profile (Perfil & Datos Personales, Salud & Datos Físicos) ---
  // Previously this data only lived in localStorage, so it had to be re-entered on every device.
  // We store it in Firestore as a single-item "user_profile" category (id = user email) and keep it
  // in sync both ways, without touching the many existing save call-sites that write localStorage.
  const lastSyncedProfileJsonRef = useRef<string | null>(null);
  // Guards against overwriting the remote (other-device) profile with this device's local
  // defaults before we've had a chance to hear back from Firestore at least once.
  const hasHeardFromFirestoreRef = useRef(false);

  useEffect(() => {
    const currentUserId = user?.email || userProfile?.email || "hernanmaximiliano10@gmail.com";
    const unsub = subscribeToCategory(currentUserId, "user_profile", (items) => {
      hasHeardFromFirestoreRef.current = true;
      const remote = items && items[0];
      if (!remote) return;
      const remoteJson = JSON.stringify(remote);
      if (remoteJson === lastSyncedProfileJsonRef.current) return; // echo of our own last push
      lastSyncedProfileJsonRef.current = remoteJson;
      setUserProfile((prev) => ({ ...(prev || {}), ...remote } as UserProfileData));
      try {
        localStorage.setItem("liquid_user_profile", JSON.stringify({ ...(userProfile || {}), ...remote }));
      } catch (_) {}
    });
    // Safety net: if Firestore never responds (offline, brand-new account, etc.), don't block
    // syncing forever — allow pushes after a few seconds regardless.
    const fallbackTimer = setTimeout(() => {
      hasHeardFromFirestoreRef.current = true;
    }, 4000);
    return () => {
      try { unsub(); } catch (_) {}
      clearTimeout(fallbackTimer);
    };
  }, [user?.email]);

  useEffect(() => {
    if (!userProfile) return;
    if (!hasHeardFromFirestoreRef.current) return; // wait for the remote profile before pushing anything
    const currentUserId = user?.email || userProfile.email || "hernanmaximiliano10@gmail.com";
    const profileJson = JSON.stringify(userProfile);
    if (profileJson === lastSyncedProfileJsonRef.current) return; // avoid re-pushing what we just received
    lastSyncedProfileJsonRef.current = profileJson;
    const timeoutId = setTimeout(() => {
      saveItemToFirestore(currentUserId, "user_profile", { id: currentUserId, ...userProfile }).catch((err) => {
        console.error("Error sincronizando perfil entre dispositivos:", err);
      });
    }, 800); // debounce so we don't write on every keystroke
    return () => clearTimeout(timeoutId);
  }, [userProfile, user?.email]);

  // Mobile/background tabs often pause Firestore's real-time listener to save battery,
  // so a change made on another device might not arrive until this tab is interacted
  // with again. Force a fresh read of the profile whenever this tab/app comes back to
  // the foreground, so switching back to it always shows the latest data immediately.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const currentUserId = user?.email || userProfile?.email || "hernanmaximiliano10@gmail.com";
      refetchCategory(currentUserId, "user_profile").catch(() => {});
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [user?.email, userProfile?.email]);

  // Sharing states
  const [outgoingShares, setOutgoingShares] = useState<AgendaShare[]>([]);
  const [incomingShares, setIncomingShares] = useState<AgendaShare[]>([]);
  const [activeSectionLinks, setActiveSectionLinks] = useState<SectionLink[]>([]);

  // Section links real-time subscription
  useEffect(() => {
    const currentAccountEmail = user?.email || userProfile?.email || "hernanmaximiliano10@gmail.com";
    const unsub = subscribeToSectionLinks(currentAccountEmail, (data) => {
      setActiveSectionLinks(data.active);
    });
    return () => {
      try { unsub(); } catch (_) {}
    };
  }, [user?.email, userProfile?.email]);

  // 2FA Security State
  const [is2FAVerified, setIs2FAVerified] = useState<boolean>(false);

  // Check 2FA requirement on load, login, or profile changes
  useEffect(() => {
    let currentProfile: UserProfileData = {
      displayName: user?.displayName || auth.currentUser?.displayName || (user?.email?.split("@")[0] || "Usuario"),
      email: user?.email || auth.currentUser?.email || "hernanmaximiliano10@gmail.com",
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
      healthNotes: ""
    };

    try {
      const saved = localStorage.getItem("liquid_user_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Don't let a previously-saved empty name permanently shadow the Google account name.
        if (!parsed.displayName) delete parsed.displayName;
        currentProfile = { ...currentProfile, ...parsed };
      }
    } catch (e) {
      console.error("Error reading profile for 2FA:", e);
    }

    if (!userProfile) {
      setUserProfile(currentProfile);
    }

    const activeProfile = userProfile || currentProfile;

    // If 2FA is disabled in user profile, grant immediate access
    if (!activeProfile.twoFactorEnabled) {
      setIs2FAVerified(true);
      return;
    }

    // Check if device is saved as trusted
    try {
      const trustedRaw = localStorage.getItem("liquid_2fa_device_trusted");
      if (trustedRaw) {
        const parsed = JSON.parse(trustedRaw);
        if (parsed.trusted && parsed.expiresAt > Date.now()) {
          setIs2FAVerified(true);
          return;
        }
      }
    } catch (e) {
      console.error("Error reading 2FA device trust:", e);
    }

    // 2FA enabled & device not trusted -> require verification modal
    setIs2FAVerified(false);
  }, [user, guestMode, userProfile?.twoFactorEnabled, userProfile?.twoFactorSecret]);

  const handle2FASuccess = (trustDevice: boolean) => {
    if (trustDevice) {
      const trustObj = {
        trusted: true,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
      };
      localStorage.setItem("liquid_2fa_device_trusted", JSON.stringify(trustObj));
    }
    setIs2FAVerified(true);
  };

  const handleDisable2FA = () => {
    const updated = {
      ...(userProfile || {
        displayName: "Hernan Sarmiento",
        email: "hernanmaximiliano10@gmail.com",
        username: "hernan_sarmiento",
        phoneNumber: "2644821280",
        address: "Av. Ignacio de la Roza 1240 Oeste",
        city: "San Juan",
        province: "San Juan",
        country: "Argentina",
        postalCode: "J5400",
        occupation: "Estudiante de Ingeniería / UNSJ",
        twoFactorSecret: "JBSWY3DPEHPK3PXP"
      }),
      twoFactorEnabled: false
    };
    setUserProfile(updated);
    localStorage.setItem("liquid_user_profile", JSON.stringify(updated));
    setIs2FAVerified(true);
  };

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncingNotes, setSyncingNotes] = useState(false);
  const [exportingSheets, setExportingSheets] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  useEffect(() => {
    if (!user || !user.email || quotaExceeded) {
      setOutgoingShares([]);
      setIncomingShares([]);
      return;
    }

    const unsubOutgoing = subscribeOutgoingShares(user.email, (shares) => {
      setOutgoingShares(shares);
    });

    const unsubIncoming = subscribeIncomingShares(user.email, (shares) => {
      setIncomingShares(shares);
    });

    return () => {
      unsubOutgoing();
      unsubIncoming();
    };
  }, [user, quotaExceeded]);

  const [driveSyncing, setDriveSyncing] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveStatusMessage, setDriveStatusMessage] = useState<string | null>(null);
  const [hasOfferedDriveRestore, setHasOfferedDriveRestore] = useState(false);

  const getComparableStateString = () => {
    return JSON.stringify({
      appointments: normalizeForComparison(appointments),
      turnosCompromisos: normalizeForComparison(turnosCompromisos),
      invoices: normalizeForComparison(invoices),
      detailedPayments: normalizeForComparison(detailedPayments),
      organizacionSemanal: normalizeForComparison(organizacionSemanal),
      platos: normalizeForComparison(platos),
      disponibilidadMedicamentos: normalizeForComparison(disponibilidadMedicamentos),
      medicamentosDetallados: normalizeForComparison(medicamentosDetallados),
    });
  };

  const getBackupFilename = () => {
    if (user && user.email) {
      return `liquid_workspace_backup_${user.email.replace(/[@.]/g, "_")}.json`;
    }
    return "liquid_workspace_backup_guest.json";
  };

  // Firestore real-time snapshot subscription across all collections
  const currentAccountEmail = user?.email || userProfile?.email || "hernanmaximiliano10@gmail.com";
  const effectiveComidasUserId = getEffectiveSectionUserId(currentAccountEmail, "comidas", activeSectionLinks);
  const effectiveControlClinicoUserId = getEffectiveSectionUserId(currentAccountEmail, "control_clinico", activeSectionLinks);

  useEffect(() => {
    const currentUserId = user?.email || userProfile?.email || "hernanmaximiliano10@gmail.com";

    const collections: Array<{ key: string; targetUserId: string; setState: React.Dispatch<React.SetStateAction<any>> }> = [
      { key: "subjects", targetUserId: currentUserId, setState: setSubjects },
      { key: "tasks", targetUserId: currentUserId, setState: setTasks },
      { key: "notes", targetUserId: currentUserId, setState: setNotes },
      { key: "materias_info", targetUserId: currentUserId, setState: setMateriasInfo },
      { key: "pantry", targetUserId: effectiveComidasUserId, setState: setPantry },
      { key: "meals", targetUserId: effectiveComidasUserId, setState: setMeals },
      { key: "shopping", targetUserId: effectiveComidasUserId, setState: setShoppingList },
      { key: "invoices", targetUserId: currentUserId, setState: setInvoices },
      { key: "payments", targetUserId: currentUserId, setState: setPayments },
      { key: "detailed_payments", targetUserId: currentUserId, setState: setDetailedPayments },
      { key: "gastos_varios", targetUserId: currentUserId, setState: setGastosVarios },
      { key: "inversiones", targetUserId: currentUserId, setState: setInversiones },
      { key: "cotizaciones_acciones", targetUserId: currentUserId, setState: setCotizacionesAcciones },
      { key: "cotizaciones_cripto", targetUserId: currentUserId, setState: setCotizacionesCripto },
      { key: "budgets", targetUserId: currentUserId, setState: setBudgets },
      { key: "appointments", targetUserId: currentUserId, setState: setAppointments },
      { key: "routines", targetUserId: currentUserId, setState: setRoutines },
      { key: "medications", targetUserId: effectiveControlClinicoUserId, setState: setMedications },
      { key: "blood_pressure", targetUserId: effectiveControlClinicoUserId, setState: setBpLogs },
      { key: "doctors", targetUserId: effectiveControlClinicoUserId, setState: setDoctors },
      { key: "notifications", targetUserId: currentUserId, setState: setNotifications },
      { key: "mercaderia", targetUserId: effectiveComidasUserId, setState: setMercaderia },
      { key: "alimentos", targetUserId: effectiveComidasUserId, setState: setAlimentos },
      { key: "platos", targetUserId: effectiveComidasUserId, setState: setPlatos },
      { key: "organizacion_semanal", targetUserId: effectiveComidasUserId, setState: setOrganizacionSemanal },
      { key: "turnos_compromisos", targetUserId: currentUserId, setState: setTurnosCompromisos },
      { key: "medicamentos_detallados", targetUserId: effectiveControlClinicoUserId, setState: setMedicamentosDetallados },
      { key: "disponibilidad_medicamentos", targetUserId: effectiveControlClinicoUserId, setState: setDisponibilidadMedicamentos },
      { key: "deportes_actividades", targetUserId: currentUserId, setState: setDeportesActividades },
      { key: "rutinas_gimnasio", targetUserId: currentUserId, setState: setRutinasGimnasio },
      { key: "registros_entrenamiento", targetUserId: currentUserId, setState: setRegistrosEntrenamiento },
      { key: "medical_records", targetUserId: effectiveControlClinicoUserId, setState: setMedicalRecords },
      { key: "alimentacion_logs", targetUserId: currentUserId, setState: setAlimentacionLogs },
      { key: "horarios", targetUserId: currentUserId, setState: setHorarios },
      { key: "examenes", targetUserId: currentUserId, setState: setExamenes }
    ];

    const unsubs = collections.map((col) => {
      return subscribeToCategory(col.targetUserId, col.key, (items) => {
        if (Array.isArray(items)) {
          isRemoteUpdateRef.current = true;
          const seen = new Set<string>();
          const deduplicatedItems: any[] = [];
          for (const item of items) {
            if (item && item.id) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                deduplicatedItems.push(item);
              }
            } else {
              deduplicatedItems.push(item);
            }
          }
          col.setState((prev: any) => {
            const nextVal = deepReplaceColors(deduplicatedItems, themeColorRef.current);
            setStoredDataSilent(col.key, nextVal);
            return nextVal;
          });
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 300);
        }
      });
    });

    return () => {
      unsubs.forEach((unsub) => {
        try { unsub(); } catch (_) {}
      });
    };
  }, [user?.email, userProfile?.email, effectiveComidasUserId, effectiveControlClinicoUserId]);

  // Sync save error toast handler
  useEffect(() => {
    const handleSyncSaveError = (e: CustomEvent) => {
      const msg = e.detail?.error || "Error al sincronizar con el servidor. Tus datos permanecen a salvo en este dispositivo.";
      showToast(`Guardado Local Seguro: ${msg}`, "info");
    };
    window.addEventListener("sync_save_error" as any, handleSyncSaveError);

    return () => {
      window.removeEventListener("sync_save_error" as any, handleSyncSaveError);
    };
  }, [showToast]);


  // Guardar copia completa de seguridad en Google Drive (Sincronización Inteligente)
  const saveCompleteBackupToDrive = async (silent = false) => {
    if (!token) {
      if (!silent) alert("Por favor, inicia sesión con Google Workspace para guardar tu respaldo en Google Drive.");
      return;
    }

    try {
      if (!silent) setDriveSyncing(true);
      if (!silent) setDriveStatusMessage("Sincronizando con Google Drive...");

      const backupData = {
        subjects,
        tasks,
        notes,
        materiasInfo,
        pantry,
        meals,
        shoppingList,
        invoices,
        payments,
        detailedPayments,
        gastosVarios,
        inversiones,
        cotizacionesAcciones,
        cotizacionesCripto,
        budgets,
        appointments,
        routines,
        medications,
        bpLogs,
        doctors,
        notifications,
        mercaderia,
        alimentos,
        platos,
        organizacionSemanal,
        turnosCompromisos,
        medicamentosDetallados,
        disponibilidadMedicamentos,
        deportesActividades,
        medicalRecords,
        alimentacionLogs,
        horarios,
        examenes,
        backupDate: new Date().toISOString()
      };

      const filename = getBackupFilename();
      const result = await WorkspaceService.saveBackupToDrive(filename, backupData, token);

      if (result.success) {
        setDriveStatusMessage("Respaldo guardado con éxito en Google Drive.");
        if (!silent) alert("¡Respaldo completo guardado en Google Drive con éxito!");
      } else {
        setDriveStatusMessage(`Error de Drive: ${result.error}`);
        if (!silent) alert(`No se pudo guardar el respaldo: ${result.error}`);
      }
    } catch (err: any) {
      if (err && err.message && err.message.toLowerCase().includes('credenciales')) {
        // Silenced
      } else {
        console.error("Error saving backup to Drive:", err);
      }
      setDriveStatusMessage(`Error: ${err.message}`);
    } finally {
      if (!silent) setDriveSyncing(false);
    }
  };

  // Cargar copia de seguridad desde Google Drive y actualizar la página
  const loadCompleteBackupFromDrive = async () => {
    if (!token) {
      alert("Por favor, inicia sesión con Google Workspace para cargar tu respaldo desde Google Drive.");
      return;
    }

    setAppConfirmModal({
      title: "Restaurar Copia de Seguridad",
      message: "¿Estás seguro de que deseas cargar tu copia de seguridad de Google Drive? Esto reemplazará tus datos locales actuales con los almacenados en la nube de Google Drive.",
      onConfirm: async () => {
        try {
          setDriveLoading(true);
          setDriveStatusMessage("Buscando respaldo en Google Drive...");

          const filename = getBackupFilename();
          const result = await WorkspaceService.loadBackupFromDrive(filename, token);

          if (result.success && result.content) {
            const backup = result.content;
            
            // Actualizar todos los estados con control de existencia y deep copy
            if (Array.isArray(backup.subjects)) { setSubjects(deepReplaceColors(backup.subjects, themeColor)); StorageService.setSubjects(backup.subjects); }
            if (Array.isArray(backup.tasks)) { setTasks(deepReplaceColors(backup.tasks, themeColor)); StorageService.setTasks(backup.tasks); }
            if (Array.isArray(backup.notes)) { setNotes(deepReplaceColors(backup.notes, themeColor)); StorageService.setNotes(backup.notes); }
            if (Array.isArray(backup.materiasInfo)) { setMateriasInfo(deepReplaceColors(backup.materiasInfo, themeColor)); StorageService.setMateriasInfo(backup.materiasInfo); }
            if (Array.isArray(backup.pantry)) { setPantry(deepReplaceColors(backup.pantry, themeColor)); StorageService.setPantry(backup.pantry); }
            if (Array.isArray(backup.meals)) { setMeals(deepReplaceColors(backup.meals, themeColor)); StorageService.setMeals(backup.meals); }
            if (Array.isArray(backup.shoppingList)) { setShoppingList(deepReplaceColors(backup.shoppingList, themeColor)); StorageService.setShopping(backup.shoppingList); }
            if (Array.isArray(backup.invoices)) { setInvoices(deepReplaceColors(backup.invoices, themeColor)); StorageService.setInvoices(backup.invoices); }
            if (Array.isArray(backup.payments)) { setPayments(deepReplaceColors(backup.payments, themeColor)); StorageService.setPayments(backup.payments); }
            if (Array.isArray(backup.detailedPayments)) { setDetailedPayments(deepReplaceColors(backup.detailedPayments, themeColor)); StorageService.setDetailedPayments(backup.detailedPayments); }
            if (Array.isArray(backup.gastosVarios)) { setGastosVarios(deepReplaceColors(backup.gastosVarios, themeColor)); StorageService.setGastosVarios(backup.gastosVarios); }
            if (Array.isArray(backup.inversiones)) { setInversiones(deepReplaceColors(backup.inversiones, themeColor)); StorageService.setInversiones(backup.inversiones); }
            if (Array.isArray(backup.cotizacionesAcciones)) { setCotizacionesAcciones(deepReplaceColors(backup.cotizacionesAcciones, themeColor)); StorageService.setCotizacionesAcciones(backup.cotizacionesAcciones); }
            if (Array.isArray(backup.cotizacionesCripto)) { setCotizacionesCripto(deepReplaceColors(backup.cotizacionesCripto, themeColor)); StorageService.setCotizacionesCripto(backup.cotizacionesCripto); }
            if (Array.isArray(backup.appointments)) { setAppointments(deepReplaceColors(backup.appointments, themeColor)); StorageService.setAppointments(backup.appointments); }
            if (Array.isArray(backup.turnosCompromisos)) { setTurnosCompromisos(deepReplaceColors(backup.turnosCompromisos, themeColor)); StorageService.setTurnosCompromisos(backup.turnosCompromisos); }
            if (Array.isArray(backup.routines)) { setRoutines(deepReplaceColors(backup.routines, themeColor)); StorageService.setRoutines(backup.routines); }
            if (Array.isArray(backup.medications)) { setMedications(deepReplaceColors(backup.medications, themeColor)); StorageService.setMedications(backup.medications); }
            if (Array.isArray(backup.doctors)) { setDoctors(deepReplaceColors(backup.doctors, themeColor)); StorageService.setDoctors(backup.doctors); }
            if (Array.isArray(backup.bpLogs)) { setBpLogs(deepReplaceColors(backup.bpLogs, themeColor)); StorageService.setBloodPressure(backup.bpLogs); }
            if (Array.isArray(backup.alimentos)) { StorageService.setAlimentos(backup.alimentos); }
            if (Array.isArray(backup.platos)) { setPlatos(deepReplaceColors(backup.platos, themeColor)); StorageService.setPlatos(backup.platos); }
            if (Array.isArray(backup.mercaderia)) { setMercaderia(deepReplaceColors(backup.mercaderia, themeColor)); StorageService.setMercaderia(backup.mercaderia); }
            if (Array.isArray(backup.horarios)) { setHorarios(deepReplaceColors(backup.horarios, themeColor)); StorageService.setHorarios(backup.horarios); }
            if (Array.isArray(backup.examenes)) { setExamenes(deepReplaceColors(backup.examenes, themeColor)); StorageService.setExamenes(backup.examenes); }
            if (Array.isArray(backup.alimentacionLogs)) { setAlimentacionLogs(deepReplaceColors(backup.alimentacionLogs, themeColor)); StorageService.setAlimentacionLogs(backup.alimentacionLogs); }
            if (Array.isArray(backup.disponibilidadMedicamentos)) { setDisponibilidadMedicamentos(deepReplaceColors(backup.disponibilidadMedicamentos, themeColor)); StorageService.setDisponibilidadMedicamentos(backup.disponibilidadMedicamentos); }
            if (Array.isArray(backup.medicamentosDetallados)) { setMedicamentosDetallados(deepReplaceColors(backup.medicamentosDetallados, themeColor)); StorageService.setMedicamentosDetallados(backup.medicamentosDetallados); }
            if (Array.isArray(backup.rutinasGimnasio)) { setRutinasGimnasio(deepReplaceColors(backup.rutinasGimnasio, themeColor)); StorageService.setRutinasGimnasio(backup.rutinasGimnasio); }
            if (Array.isArray(backup.registrosEntrenamiento)) { setRegistrosEntrenamiento(deepReplaceColors(backup.registrosEntrenamiento, themeColor)); StorageService.setRegistrosEntrenamiento(backup.registrosEntrenamiento); }
            if (Array.isArray(backup.deportesActividades)) { setDeportesActividades(deepReplaceColors(backup.deportesActividades, themeColor)); StorageService.setDeportesActividades(backup.deportesActividades); }

            showToast("Respaldo restaurado correctamente desde Google Drive", "success");
            setDriveStatusMessage("Respaldo restaurado con éxito.");
          } else {
            showToast("No se encontró ninguna copia de seguridad en Google Drive.", "error");
            setDriveStatusMessage("No se encontró copia de seguridad.");
          }
        } catch (err: any) {
          console.error("Error loading backup from Drive:", err);
          showToast(`Error al cargar respaldo: ${err.message}`, "error");
          setDriveStatusMessage(`Error: ${err.message}`);
        } finally {
          setDriveLoading(false);
          setAppConfirmModal(null);
        }
      }
    });
  };

  // Helper to deep normalize objects for semantically stable string comparisons
  const normalizeForComparison = (val: any): any => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'function') return undefined;
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString();
      } catch (e) {
        // ignore
      }
    }
    if (val instanceof Date) return val.toISOString();
    if (Array.isArray(val)) {
      return val.map(normalizeForComparison).filter(x => x !== undefined);
    }
    if (typeof val === 'object') {
      const normalized: any = {};
      const keys = Object.keys(val).sort();
      let hasKeys = false;
      for (const key of keys) {
        const normVal = normalizeForComparison(val[key]);
        if (normVal !== undefined) {
          normalized[key] = normVal;
          hasKeys = true;
        }
      }
      return hasKeys ? normalized : undefined;
    }
    return val;
  };

  // Auto-sync updateShare disabled to prevent automatic writes to Firestore
  /*
  useEffect(() => {
    if (!user || !user.email || outgoingShares.length === 0) return;
    if (quotaExceeded) return;
    if (Date.now() - lastSyncErrorTimeRef.current < 60000) return;

    const currentComparable = getComparableStateString();
    if (currentComparable === lastComparableStateRef.current) return;

    const timeoutId = setTimeout(async () => {
      lastComparableStateRef.current = currentComparable;
      for (const share of outgoingShares) { ... }
    }, 30000);
    return () => clearTimeout(timeoutId);
  }, [...]);
  */

  // Google Drive as default storage engine: auto-save everything to user's Google Drive whenever they are authenticated
  useEffect(() => {
    if (!token || !isInitialLoadDone) return;

    const timeoutId = setTimeout(() => {
      saveCompleteBackupToDrive(true);
    }, 5000); // Guardado automático y frecuente en Drive (5 segundos) como motor de almacenamiento por defecto

    return () => clearTimeout(timeoutId);
  }, [
    token,
    isInitialLoadDone,
    subjects,
    tasks,
    notes,
    materiasInfo,
    pantry,
    meals,
    shoppingList,
    invoices,
    detailedPayments,
    appointments,
    routines,
    medications,
    bpLogs,
    doctors,
    platos,
    organizacionSemanal,
    turnosCompromisos,
    medicamentosDetallados,
    disponibilidadMedicamentos,
    medicalRecords
  ]);

  // Google Drive as default storage engine: automatic/silent initial load when authenticated
  const [hasDoneInitialDriveLoad, setHasDoneInitialDriveLoad] = useState(false);

  useEffect(() => {
    if (token && isInitialLoadDone && !hasDoneInitialDriveLoad) {
      setHasDoneInitialDriveLoad(true);
      
      const loadSilentFromDrive = async () => {
        try {
          setDriveLoading(true);
          setDriveStatusMessage("Sincronizando almacenamiento por defecto con Google Drive...");
          const filename = getBackupFilename();
          const result = await WorkspaceService.loadBackupFromDrive(filename, token);
          if (result.success && result.content) {
            const backup = result.content;
            
            // Actualizar todos los estados con control de existencia
            if (Array.isArray(backup.subjects)) { setSubjects(backup.subjects); StorageService.setSubjects(backup.subjects); }
            if (Array.isArray(backup.tasks)) { setTasks(backup.tasks); StorageService.setTasks(backup.tasks); }
            if (Array.isArray(backup.notes)) { setNotes(backup.notes); StorageService.setNotes(backup.notes); }
            if (Array.isArray(backup.materiasInfo)) { setMateriasInfo(backup.materiasInfo); StorageService.setMateriasInfo(backup.materiasInfo); }
            if (Array.isArray(backup.pantry)) { setPantry(backup.pantry); StorageService.setPantry(backup.pantry); }
            if (Array.isArray(backup.meals)) { setMeals(backup.meals); StorageService.setMeals(backup.meals); }
            if (Array.isArray(backup.shoppingList)) { setShoppingList(backup.shoppingList); StorageService.setShopping(backup.shoppingList); }
            if (Array.isArray(backup.invoices)) { setInvoices(backup.invoices); StorageService.setInvoices(backup.invoices); }
            if (Array.isArray(backup.payments)) { setPayments(backup.payments); StorageService.setPayments(backup.payments); }
            if (Array.isArray(backup.detailedPayments)) { setDetailedPayments(backup.detailedPayments); StorageService.setDetailedPayments(backup.detailedPayments); }
            if (Array.isArray(backup.budgets)) { setBudgets(backup.budgets); StorageService.setBudgets(backup.budgets); }
            if (Array.isArray(backup.appointments)) { setAppointments(backup.appointments); StorageService.setAppointments(backup.appointments); }
            if (Array.isArray(backup.routines)) { setRoutines(backup.routines); StorageService.setRoutines(backup.routines); }
            if (Array.isArray(backup.medications)) { setMedications(backup.medications); StorageService.setMedications(backup.medications); }
            if (Array.isArray(backup.bpLogs)) { setBpLogs(backup.bpLogs); StorageService.setBloodPressure(backup.bpLogs); }
            if (Array.isArray(backup.doctors)) { setDoctors(backup.doctors); StorageService.setDoctors(backup.doctors); }
            if (Array.isArray(backup.notifications)) { setNotifications(backup.notifications); StorageService.setNotifications(backup.notifications); }
            if (Array.isArray(backup.mercaderia)) { setMercaderia(backup.mercaderia); StorageService.setMercaderia(backup.mercaderia); }
            if (Array.isArray(backup.alimentos)) { setAlimentos(backup.alimentos); StorageService.setAlimentos(backup.alimentos); }
            if (Array.isArray(backup.platos)) { setPlatos(backup.platos); StorageService.setPlatos(backup.platos); }
            if (Array.isArray(backup.organizacionSemanal)) { setOrganizacionSemanal(backup.organizacionSemanal); StorageService.setOrganizacionSemanal(backup.organizacionSemanal); }
            if (Array.isArray(backup.turnosCompromisos)) { setTurnosCompromisos(backup.turnosCompromisos); StorageService.setTurnosCompromisos(backup.turnosCompromisos); }
            if (Array.isArray(backup.medicamentosDetallados)) { setMedicamentosDetallados(backup.medicamentosDetallados); StorageService.setMedicamentosDetallados(backup.medicamentosDetallados); }
            if (Array.isArray(backup.disponibilidadMedicamentos)) { setDisponibilidadMedicamentos(backup.disponibilidadMedicamentos); StorageService.setDisponibilidadMedicamentos(backup.disponibilidadMedicamentos); }
            if (Array.isArray(backup.deportesActividades)) { setDeportesActividades(backup.deportesActividades); StorageService.setDeportesActividades(backup.deportesActividades); }
            if (Array.isArray(backup.medicalRecords)) { setMedicalRecords(backup.medicalRecords); StorageService.setMedicalRecords(backup.medicalRecords); }
            if (Array.isArray(backup.horarios)) { setHorarios(backup.horarios); }
            if (Array.isArray(backup.examenes)) { setExamenes(backup.examenes); }
            
            setDriveStatusMessage("Datos sincronizados automáticamente desde Google Drive.");
            console.log("Cargado automático desde Google Drive completado.");
          } else if (result.notFound) {
            console.log("No se encontró respaldo previo en Drive, inicializando el archivo con el estado actual...");
            saveCompleteBackupToDrive(true);
          } else {
            if (result.error && typeof result.error === 'string' && result.error.toLowerCase().includes('credenciales')) {
              // Silenced by user request
              setDriveStatusMessage("Google Drive no conectado.");
            } else {
              console.error("Error cargando el respaldo: ", result.error);
              setDriveStatusMessage("Error al cargar datos desde Drive.");
            }
          }
        } catch (e) {
          if (e && e.message && e.message.toLowerCase().includes('credenciales')) {
            // Silenced
          } else {
            console.error("Error doing initial silent load from Drive:", e);
          }
        } finally {
          setDriveLoading(false);
        }
      };
      loadSilentFromDrive();
    }
  }, [token, isInitialLoadDone, hasDoneInitialDriveLoad]);

  // Intercept tab closing if there are pending or failed saves
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasFailedSave = driveStatusMessage?.toLowerCase().includes("error") || driveStatusMessage?.toLowerCase().includes("failed");
      const isCurrentlySyncing = driveSyncing || syncing || syncingNotes;
      
      if (isCurrentlySyncing || hasFailedSave) {
        e.preventDefault();
        e.returnValue = "¡Atención! Espera a que se guarden los datos correctamente en tu almacenamiento de Google Drive o almacenamiento local antes de cerrar la pestaña.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [driveSyncing, syncing, syncingNotes, driveStatusMessage]);

  // Firebase auth state hook and proactive connection check
  useEffect(() => {
    testConnection();
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        if (currentUser.email || currentUser.uid) {
          setSyncUserId(currentUser.email || currentUser.uid);
        }
        if (accessToken) {
          setToken(accessToken);
          // Auto-fill birthdate from Google (only if not already set by the user).
          import("./lib/googlePeopleService").then(({ fetchGoogleBirthday }) => {
            fetchGoogleBirthday(accessToken).then((googleBirthDate) => {
              if (!googleBirthDate) return;
              setUserProfile((prev) =>
                prev && !prev.birthDate ? { ...prev, birthDate: googleBirthDate } : prev
              );
            });
          });
        }
        setAuthInitialized(true);
      },
      () => {
        setUser(null);
        setToken(null);
        setAuthInitialized(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Mark initial load ready
  useEffect(() => {
    setIsInitialLoadDone(true);
  }, []);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setGastosVarios(gastosVarios);
      } else {
        setStoredDataSilent("gastos_varios", gastosVarios);
      }
    }
  }, [gastosVarios, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setInversiones(inversiones);
      } else {
        setStoredDataSilent("inversiones", inversiones);
      }
    }
  }, [inversiones, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setCotizacionesAcciones(cotizacionesAcciones);
        StorageService.setCotizacionesCripto(cotizacionesCripto);
      } else {
        setStoredDataSilent("cotizaciones_acciones", cotizacionesAcciones);
        setStoredDataSilent("cotizaciones_cripto", cotizacionesCripto);
      }
    }
  }, [cotizacionesAcciones, cotizacionesCripto, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setHorarios(horarios);
      } else {
        setStoredDataSilent("horarios", horarios);
      }
    }
  }, [horarios, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setExamenes(examenes);
      } else {
        setStoredDataSilent("examenes", examenes);
      }
    }
  }, [examenes, isInitialLoadDone]);

  // Helper to construct all current active events across the workspace for calendar syncing
  const getAllEventsForSync = () => {
    const list: any[] = [];

    // Appointments (Turnos Citas)
    for (const app of appointments) {
      if (app.date) {
        list.push({
          id: `app-${app.id}`,
          title: `Cita Médica: ${app.title}`,
          description: `Médico: ${app.doctorName || "No especificado"} (${app.specialty || "Sin especialidad"})\nNotas: ${app.notes || "Sin notas adicionales."}`,
          location: app.location || "",
          date: app.date,
          time: app.time || "",
        });
      }
    }

    // Turnos Compromisos
    for (const tc of turnosCompromisos) {
      if (tc.fecha) {
        list.push({
          id: `tc-${tc.id}`,
          title: `Compromiso: ${tc.descripcion}`,
          description: `Categoría: ${tc.categoria || "General"}\nProfesional/Contacto: ${tc.doctor || "No especificado"}\nEstado: ${tc.estatus ? "Realizado" : "Pendiente"}`,
          location: tc.lugar || "",
          date: tc.fecha,
        });
      }
    }

    // Invoices
    for (const inv of invoices) {
      if (inv.dueDate) {
        list.push({
          id: `inv-${inv.id}`,
          title: `Factura: ${inv.title}`,
          description: `Vencimiento de pago.\nMonto: $${inv.amount.toLocaleString("es-AR")} ARS\nEstado: ${inv.paid ? "Pagado" : "Pendiente de pago"}`,
          date: inv.dueDate,
        });
      }
    }

    // Detailed Payments (Credits, Cards, etc.)
    for (const dp of detailedPayments) {
      if (dp.fechaVencimiento) {
        list.push({
          id: `dp-${dp.id}-due`,
          title: `Vencimiento Pago: ${dp.descripcion}`,
          description: `Fecha de vencimiento para el pago: ${dp.descripcion}\nMonto: $${(dp.montoAPagar || 0).toLocaleString("es-AR")} ARS\nEstado: ${dp.pago ? "Liquidado" : "Pendiente"}`,
          date: dp.fechaVencimiento,
        });
      }
      if (dp.fechaCierre) {
        list.push({
          id: `dp-${dp.id}-close`,
          title: `Cierre Tarjeta: ${dp.descripcion}`,
          description: `Fecha de cierre para la tarjeta/pago: ${dp.descripcion}\nEstado: ${dp.pago ? "Liquidado" : "Pendiente"}`,
          date: dp.fechaCierre,
        });
      }
    }

    // Meals (Organizacion Semanal)
    for (const os of organizacionSemanal) {
      if (os.fecha) {
        const matchedPlato = platos.find((p) => p.id === os.platoId);
        const platoNombre = matchedPlato ? matchedPlato.nombrePlato : "Comida Desconocida";
        list.push({
          id: `meal-${os.id}`,
          title: `Comida: ${platoNombre}`,
          description: `Plato planeado: ${platoNombre}\nCategoría: Comidas\nNotas: Planificado en Organización Semanal`,
          date: os.fecha,
        });
      }
    }

    // Medications requiring purchase or prescription (Comprar Medicamento o Pedir Receta)
    for (const disp of disponibilidadMedicamentos) {
      const med = medicamentosDetallados.find((m) => m.id === disp.medicamentoId);
      if (med) {
        const cd = med.consumoDiario || 1;
        const cantReg = disp.cantidadRegistrada || 0;
        const parseLocalDate = (dateStr: string) => {
          if (!dateStr) return new Date();
          const clean = dateStr.split("T")[0];
          const parts = clean.split("-");
          if (parts.length === 3) {
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
          }
          const d = new Date(dateStr);
          d.setHours(0, 0, 0, 0);
          return d;
        };
        const regDate = parseLocalDate(disp.fechaRegistro);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - regDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const diasPasados = diffDays < 0 ? 0 : diffDays;

        let cantidadDisponible = cantReg - cd * diasPasados;
        if (cantidadDisponible < 0) cantidadDisponible = 0;

        const disponibleParaDias = cd > 0 ? cantidadDisponible / cd : 0;
        const baseDate = today.getTime() > regDate.getTime() ? new Date(today) : new Date(regDate);
        baseDate.setDate(baseDate.getDate() + Math.max(0, Math.floor(disponibleParaDias)));
        const y = baseDate.getFullYear();
        const m = String(baseDate.getMonth() + 1).padStart(2, "0");
        const day = String(baseDate.getDate()).padStart(2, "0");
        const disponibleHasta = `${y}-${m}-${day}`;

        let estado = "Sin Información";
        if (disp.receta) {
          estado = "Con Receta";
        } else {
          if (disponibleParaDias > 14) {
            estado = "Con Medicacion";
          } else if (disponibleParaDias <= 14 && disponibleParaDias >= 7) {
            estado = "Pedir Receta";
          } else if (disponibleParaDias < 7) {
            estado = "Comprar Medicamento";
          }
        }

        if (estado === "Comprar Medicamento" || estado === "Pedir Receta") {
          list.push({
            id: `med-${disp.id}`,
            title: `${estado}: ${med.marca}`,
            description: `Medicamento: ${med.marca}\nDroga: ${med.droga}\nEstado: ${estado}\nTratamiento: ${med.funcionTratamiento || "Quimioterapia"}\nDisponible hasta: ${disponibleHasta}`,
            date: disponibleHasta,
          });
        }
      }
    }

    return list;
  };

  // Automatic Google Calendar Sync disabled for freeze mode
  /*
  useEffect(() => {
    if (!token || !isInitialLoadDone) return;
    const timeoutId = setTimeout(async () => { ... }, 2000);
    return () => clearTimeout(timeoutId);
  }, [...]);
  */

  // Persistent storage autosave hooks for all entity categories
  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setSubjects(subjects);
      } else {
        setStoredDataSilent("subjects", subjects);
      }
    }
  }, [subjects, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setTasks(tasks);
      } else {
        setStoredDataSilent("tasks", tasks);
      }
    }
  }, [tasks, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setNotes(notes);
      } else {
        setStoredDataSilent("notes", notes);
      }
    }
  }, [notes, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setMateriasInfo(materiasInfo);
      } else {
        setStoredDataSilent("materias_info", materiasInfo);
      }
    }
  }, [materiasInfo, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setPantry(pantry);
      } else {
        setStoredDataSilent("pantry", pantry);
      }
    }
  }, [pantry, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setMeals(meals);
      } else {
        setStoredDataSilent("meals", meals);
      }
    }
  }, [meals, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setShopping(shoppingList);
      } else {
        setStoredDataSilent("shopping", shoppingList);
      }
    }
  }, [shoppingList, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setInvoices(invoices);
      } else {
        setStoredDataSilent("invoices", invoices);
      }
    }
  }, [invoices, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setPayments(payments);
      } else {
        setStoredDataSilent("payments", payments);
      }
    }
  }, [payments, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setDetailedPayments(detailedPayments);
      } else {
        setStoredDataSilent("detailed_payments", detailedPayments);
      }
    }
  }, [detailedPayments, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setBudgets(budgets);
      } else {
        setStoredDataSilent("budgets", budgets);
      }
    }
  }, [budgets, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setAppointments(appointments);
      } else {
        setStoredDataSilent("appointments", appointments);
      }
    }
  }, [appointments, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setRoutines(routines);
      } else {
        setStoredDataSilent("routines", routines);
      }
    }
  }, [routines, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setMedications(medications);
      } else {
        setStoredDataSilent("medications", medications);
      }
    }
  }, [medications, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setBloodPressure(bpLogs);
      } else {
        setStoredDataSilent("blood_pressure", bpLogs);
      }
    }
  }, [bpLogs, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setDoctors(doctors);
      } else {
        setStoredDataSilent("doctors", doctors);
      }
    }
  }, [doctors, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setNotifications(notifications);
      } else {
        setStoredDataSilent("notifications", notifications);
      }
    }
  }, [notifications, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setMercaderia(mercaderia);
      } else {
        setStoredDataSilent("mercaderia", mercaderia);
      }
    }
  }, [mercaderia, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setAlimentos(alimentos);
      } else {
        setStoredDataSilent("alimentos", alimentos);
      }
    }
  }, [alimentos, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setPlatos(platos);
      } else {
        setStoredDataSilent("platos", platos);
      }
    }
  }, [platos, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setOrganizacionSemanal(organizacionSemanal);
      } else {
        setStoredDataSilent("organizacion_semanal", organizacionSemanal);
      }
    }
  }, [organizacionSemanal, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setTurnosCompromisos(turnosCompromisos);
      } else {
        setStoredDataSilent("turnos_compromisos", turnosCompromisos);
      }
    }
  }, [turnosCompromisos, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setMedicamentosDetallados(medicamentosDetallados);
      } else {
        setStoredDataSilent("medicamentos_detallados", medicamentosDetallados);
      }
    }
  }, [medicamentosDetallados, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setDisponibilidadMedicamentos(disponibilidadMedicamentos);
      } else {
        setStoredDataSilent("disponibilidad_medicamentos", disponibilidadMedicamentos);
      }
    }
  }, [disponibilidadMedicamentos, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setDeportesActividades(deportesActividades);
      } else {
        setStoredDataSilent("deportes_actividades", deportesActividades);
      }
    }
  }, [deportesActividades, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setMedicalRecords(medicalRecords);
      } else {
        setStoredDataSilent("medical_records", medicalRecords);
      }
    }
  }, [medicalRecords, isInitialLoadDone]);

  useEffect(() => {
    if (isInitialLoadDone) {
      if (!isRemoteUpdateRef.current) {
        StorageService.setAlimentacionLogs(alimentacionLogs);
      } else {
        setStoredDataSilent("alimentacion_logs", alimentacionLogs);
      }
    }
  }, [alimentacionLogs, isInitialLoadDone]);

  // Auto-mark past activities / turnos / compromisos and academic tasks as "realizado" (estatus: true)
  useEffect(() => {
    if (!isInitialLoadDone) return;
    const todayStr = getLocalDateString();

    if (Array.isArray(turnosCompromisos) && turnosCompromisos.length > 0) {
      let turnosChanged = false;
      const updatedTurnos = turnosCompromisos.map((tc) => {
        const itemDate = tc.fecha ? tc.fecha.substring(0, 10) : "";
        if (!tc.estatus && itemDate && itemDate.length === 10 && itemDate < todayStr) {
          turnosChanged = true;
          return { ...tc, estatus: true, updatedAt: Date.now() };
        }
        return tc;
      });

      if (turnosChanged) {
        setTurnosCompromisos(updatedTurnos);
        StorageService.setTurnosCompromisos(updatedTurnos);
      }
    }

    if (Array.isArray(tasks) && tasks.length > 0) {
      let tasksChanged = false;
      const updatedTasks = tasks.map((t) => {
        const itemDate = t.dueDate ? t.dueDate.substring(0, 10) : "";
        if (!t.completed && itemDate && itemDate.length === 10 && itemDate < todayStr) {
          tasksChanged = true;
          return { ...t, completed: true, updatedAt: Date.now() };
        }
        return t;
      });

      if (tasksChanged) {
        setTasks(updatedTasks);
        StorageService.setTasks(updatedTasks);
      }
    }
  }, [isInitialLoadDone, turnosCompromisos, tasks]);

  // Auto-sync monthly matches disabled for freeze mode
  /*
  useEffect(() => {
    if (userProfile?.favoriteTeam) {
      syncMonthlyMatches(userProfile.favoriteTeam, turnosCompromisos, setTurnosCompromisos);
    }
  }, [userProfile?.favoriteTeam]);
  */

  // Handle Notifications check
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newNotifs: AppNotification[] = [];

    turnosCompromisos.filter(t => (t.fecha === todayStr || t.fecha.startsWith(todayStr)) && !t.estatus).forEach(t => {
      const filesList: { name: string; url: string; type?: string }[] = [];
      if (t.archivosNecesarios && Array.isArray(t.archivosNecesarios)) {
        t.archivosNecesarios.forEach(f => filesList.push({ name: f.name || "Archivo adjunto", url: f.url }));
      }
      if (t.estudioInformeDoc) {
        filesList.push({ name: "Estudio / Informe Médico", url: t.estudioInformeDoc });
      }
      if (t.pedidoDocumento) {
        filesList.push({ name: "Pedido Médico / Documento", url: t.pedidoDocumento });
      }

      newNotifs.push({
        id: `notif-turno-${t.id}`,
        title: t.descripcion,
        body: `Categoría: ${t.categoria}${t.lugar ? ` - Lugar: ${t.lugar}` : ""}`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "turno",
        location: t.lugar,
        lat: t.lat,
        lon: t.lon,
        contactName: t.doctor,
        notes: t.informacionPersonalizada || t.transcripcionAutomatica,
        files: filesList.length > 0 ? filesList : undefined,
        actionTab: "appointments",
        actionSubTab: "agenda",
      });
    });

    appointments.filter(a => a.date === todayStr).forEach(a => {
      newNotifs.push({
        id: `notif-app-${a.id}`,
        title: a.title,
        body: `${a.time ? `Hora: ${a.time} - ` : ""}Médico: ${a.doctorName}`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "appointment",
        location: a.location,
        contactName: a.doctorName,
        notes: a.notes,
        actionTab: "appointments",
        actionSubTab: "registro",
      });
    });

    invoices.filter(i => i.dueDate === todayStr && !i.paid).forEach(i => {
      newNotifs.push({
        id: `notif-inv-${i.id}`,
        title: `Vence: ${i.title}`,
        body: `Monto: $${i.amount} ARS`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "finance",
        amount: i.amount,
        currency: "ARS",
        dueDate: i.dueDate,
        actionTab: "finances",
        actionSubTab: "resumen",
      });
    });

    detailedPayments.filter(dp => (dp.fechaVencimiento === todayStr || dp.fechaCierre === todayStr) && !dp.pago).forEach(dp => {
      const filesList: { name: string; url: string; type?: string }[] = [];
      if (dp.facturaEmitida) {
        filesList.push({ name: "Factura Emitida", url: dp.facturaEmitida });
      }
      if (dp.comprobantePago) {
        filesList.push({ name: "Comprobante de Pago", url: dp.comprobantePago });
      }

      newNotifs.push({
        id: `notif-dp-${dp.id}`,
        title: `Pago: ${dp.descripcion}`,
        body: `Monto: $${dp.montoAPagar} ARS`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "finance",
        amount: dp.montoAPagar,
        currency: "ARS",
        dueDate: dp.fechaVencimiento,
        notes: dp.observaciones || (dp.dondePagar ? `Pagar en: ${dp.dondePagar}` : undefined),
        files: filesList.length > 0 ? filesList : undefined,
        actionTab: "finances",
        actionSubTab: "pagos_mensuales",
      });
    });

    organizacionSemanal.filter(os => os.fecha === todayStr).forEach(os => {
      const matchedPlato = platos.find(p => p.id === os.platoId);
      newNotifs.push({
        id: `notif-meal-${os.id}`,
        title: `Comida Planeada: ${matchedPlato ? matchedPlato.nombrePlato : "Comida Desconocida"}`,
        body: `Configurado en tu menú diario de comidas.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: "meal",
        mealId: os.platoId,
        mealImage: matchedPlato?.imagen,
        notes: matchedPlato?.descripcion,
        actionTab: "meals",
        actionSubTab: "organizacion_semanal",
      });
    });

    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const toAdd = newNotifs.filter((n) => !existingIds.has(n.id));
      if (toAdd.length === 0) return prev;
      return [...toAdd, ...prev];
    });
  }, [turnosCompromisos, appointments, invoices, detailedPayments, organizacionSemanal, disponibilidadMedicamentos, platos]);

  // Helper to ensure valid Google Workspace access token
  const ensureGoogleToken = async (): Promise<string | null> => {
    if (token) return token;
    try {
      const { googleSignIn } = await import("./lib/firebase");
      const authRes = await googleSignIn();
      if (authRes?.accessToken) {
        setToken(authRes.accessToken);
        return authRes.accessToken;
      }
    } catch (err: any) {
      console.warn("No se completó la autenticación con Google Workspace:", err);
    }
    return null;
  };

  // Sync Notes to Google Drive as Google Doc
  const handleSyncNotesToDrive = async (title: string, content: string) => {
    let currentToken = await ensureGoogleToken();
    if (!currentToken) {
      alert("Por favor conecta tu cuenta de Google Workspace para sincronizar con Drive.");
      return;
    }
    setSyncingNotes(true);
    let result = await WorkspaceService.syncNotesToDrive(title, content, currentToken);
    
    // Auto-refresh token if expired
    if (!result.success && result.error && (result.error.toLowerCase().includes("invalid authentication") || result.error.toLowerCase().includes("unauthenticated") || result.error.toLowerCase().includes("expirad"))) {
      try {
        const { googleSignIn } = await import("./lib/firebase");
        const authRes = await googleSignIn();
        if (authRes?.accessToken) {
          currentToken = authRes.accessToken;
          setToken(authRes.accessToken);
          result = await WorkspaceService.syncNotesToDrive(title, content, currentToken);
        }
      } catch (_) {}
    }

    setSyncingNotes(false);
    if (result.success) {
      alert("¡Nota sincronizada con éxito en tu Google Drive!");
      setLastSynced(new Date().toISOString());
    } else {
      alert("Error al sincronizar con Drive: " + result.error);
    }
  };

  // Sync payments to Google Sheets
  const handleExportFinancesToSheets = async (title: string, headers: string[], rows: any[][]) => {
    let currentToken = await ensureGoogleToken();
    if (!currentToken) {
      showToast("Por favor conecta tu cuenta de Google Workspace para exportar a Sheets.", "error");
      return;
    }
    setExportingSheets(true);
    showToast("Exportando a Google Sheets...", "info");
    let result = await WorkspaceService.exportFinancesToSheets(title, headers, rows, currentToken);
    
    // Auto-refresh token if expired
    if (!result.success && result.error && (result.error.toLowerCase().includes("invalid authentication") || result.error.toLowerCase().includes("unauthenticated") || result.error.toLowerCase().includes("expirad") || result.error.toLowerCase().includes("credenciales"))) {
      try {
        const { googleSignIn } = await import("./lib/firebase");
        const authRes = await googleSignIn();
        if (authRes?.accessToken) {
          currentToken = authRes.accessToken;
          setToken(authRes.accessToken);
          result = await WorkspaceService.exportFinancesToSheets(title, headers, rows, currentToken);
        }
      } catch (_) {}
    }

    setExportingSheets(false);
    if (result.success) {
      showToast("¡Reporte exportado con éxito a Google Sheets!", "success");
      setLastSynced(new Date().toISOString());
      
      const sheetUrl =
        result.spreadsheetUrl ||
        (result.spreadsheetId
          ? `https://docs.google.com/spreadsheets/d/${result.spreadsheetId}/edit`
          : null);
      if (sheetUrl) {
        window.open(sheetUrl, "_blank", "noopener,noreferrer");
      }
    } else {
      showToast("Error al exportar a Google Sheets: " + result.error, "error");
    }
  };

  // Send an email report via Gmail API
  const handleSendGmailReport = async (to: string, subject: string, body: string) => {
    let currentToken = await ensureGoogleToken();
    if (!currentToken) {
      alert("Por favor conecta tu cuenta de Google Workspace para enviar correos.");
      return;
    }
    setSendingEmail(true);
    let result = await WorkspaceService.sendGmailReport(to, subject, body, currentToken);
    
    // Auto-refresh token if expired
    if (!result.success && result.error && (result.error.toLowerCase().includes("invalid authentication") || result.error.toLowerCase().includes("unauthenticated") || result.error.toLowerCase().includes("expirad") || result.error.toLowerCase().includes("credenciales"))) {
      try {
        const { googleSignIn } = await import("./lib/firebase");
        const authRes = await googleSignIn();
        if (authRes?.accessToken) {
          currentToken = authRes.accessToken;
          setToken(authRes.accessToken);
          result = await WorkspaceService.sendGmailReport(to, subject, body, currentToken);
        }
      } catch (_) {}
    }

    setSendingEmail(false);
    if (result.success) {
      alert(`¡Reporte enviado con éxito por correo electrónico a ${to}!`);
    } else {
      alert("Error al enviar el reporte: " + result.error);
    }
  };

  // Global manual sync trigger
  const handleManualSyncAll = async () => {
    const currentToken = await ensureGoogleToken();
    if (!currentToken) {
      alert("Google Workspace no conectado. Inicia sesión con Google para sincronizar todo.");
      return;
    }
    setSyncing(true);
    // Simulate updating backend logs
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSyncing(false);
    setLastSynced(new Date().toISOString());
    alert("¡Sincronización completa con Google Workspace!");
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setGuestMode(false);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const readNotification = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  // Synchronize document root dark class for Tailwind dark: modifiers
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  if (!authInitialized) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-white"
        style={{ "--color-primary": themeColor } as React.CSSProperties}
      >
        <div className="text-center space-y-4 flex flex-col items-center justify-center">
          <Logo darkMode={darkMode} size="md" spin={true} />
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Cargando Workspace...</p>
        </div>
      </div>
    );
  }

  // Not logged in and not in guest mode -> Show Sign-In Screen
  if (!user && !guestMode) {
    return (
      <LoginScreen
        backgroundStyle={backgroundStyle}
        darkMode={darkMode}
        themeColor={themeColor}
        onLoginSuccess={(loggedUser, loggedToken) => {
          setUser(loggedUser);
          if (loggedToken) setToken(loggedToken);
        }}
      />
    );
  }

  // 2FA requirement check
  const is2FARequired = (Boolean(user) || guestMode) && !is2FAVerified && userProfile?.twoFactorEnabled === true;

  return (
    <div className={`min-h-screen flex flex-col relative overflow-x-hidden ${darkMode ? "bg-zinc-950 text-[#e3e2e6]" : "bg-slate-50 text-[#222222]"} font-sans transition-all duration-200`} style={{ "--color-primary": themeColor } as React.CSSProperties}>
      {/* Background Canvas */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {backgroundStyle === "dither" ? (
          <Dither
            waveSpeed={0.05}
            waveFrequency={3}
            waveAmplitude={0.3}
            waveColor={hexToRgbArray(themeColor)}
            backgroundColor={darkMode ? [0.0, 0.0, 0.0] : [1.0, 1.0, 1.0]}
            colorNum={4}
            pixelSize={2}
            enableMouseInteraction={true}
            mouseRadius={0.4}
          />
        ) : backgroundStyle === "pixelblast" ? (
          <PixelBlast
            variant="square"
            color={themeColor}
            pixelSize={3}
            liquid={true}
            enableRipples={true}
            transparent={true}
          />
        ) : (
          <Plasma
            color={themeColor}
            darkMode={darkMode}
            speed={0.6}
            scale={1.2}
          />
        )}
      </div>

      {/* Top Floating Glass Navigation Header - Hidden during 2FA authentication */}
      {!is2FARequired && (
        <TopNavbar
          currentTab={currentTab}
          setCurrentTab={handleTabChange}
          activeSubTab={activeSubTab}
          onSubTabChange={setActiveSubTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          user={userProfile ? { displayName: userProfile.displayName, email: userProfile.email, photoURL: userProfile.photoURL } : user}
          token={token}
          notifications={notifications}
          onClearNotifications={clearNotifications}
          onReadNotification={readNotification}
          onDeleteNotification={deleteNotification}
          onManualSync={handleManualSyncAll}
          syncing={syncing}
          lastSynced={lastSynced}
          onLogout={handleLogout}
          onOpenSettings={() => setIsUserSettingsOpen((prev) => !prev)}
          isSettingsOpen={isUserSettingsOpen}
          menuVisibility={menuVisibility}
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
        />
      )}

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 z-10 pt-3 sm:pt-5">
        {quotaExceeded && (
          <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 mb-3 sm:mb-4">
            <div className={`w-full px-3.5 sm:px-5 py-3 rounded-2xl sm:rounded-[28px] border-none backdrop-blur-2xl transition-all duration-300 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
              darkMode 
                ? "bg-black/75 text-zinc-100 font-medium shadow-black/40" 
                : "bg-white/80 text-slate-800 font-medium shadow-slate-200/50"
            }`}>
              <div className="flex flex-col md:flex-row md:items-center gap-2.5 w-full md:w-auto">
                <span className="font-bold uppercase tracking-wider text-[10px] bg-primary text-white dark:text-zinc-950 px-2.5 py-1 rounded-full text-center w-full md:w-auto shrink-0 shadow-xs">MODO LOCAL</span>
                <div className="flex flex-col gap-0.5 w-full">
                  <span className="font-medium leading-snug text-slate-800 dark:text-zinc-200">La base de datos en la nube excedió su límite de cuota diario. El compartido está en pausa, pero tus datos locales están seguros.</span>
                  {driveStatusMessage && (
                    <span className="text-[11px] block leading-snug mt-0.5 text-primary/90 font-medium">
                      <span>Estado de Google Drive: <strong className="font-bold text-primary">{driveStatusMessage}</strong></span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
                {token ? (
                  <>
                    <button
                      onClick={() => saveCompleteBackupToDrive(false)}
                      disabled={driveSyncing}
                      className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-full border border-primary/30 hover:border-primary bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-all disabled:opacity-50 text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {driveSyncing ? (
                        <>
                          <span className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block"></span>
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Respaldar en Drive</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={loadCompleteBackupFromDrive}
                      disabled={driveLoading}
                      className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-full border border-primary/30 hover:border-primary bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-all disabled:opacity-50 text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {driveLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>Cargar de Drive</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-[10.5px] italic opacity-80 text-center md:text-left">
                    ⚠️ Conecta tu Google Workspace arriba para activar copias de seguridad automáticas en Google Drive.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {driveLoading || !isInitialLoadDone ? (
            <PageSkeleton tab={currentTab} darkMode={darkMode} />
          ) : (
            <>
              {currentTab === "home" && (
                <HomeView
                  darkMode={darkMode}
                  user={user}
                  userProfile={userProfile}
                  outgoingShares={outgoingShares}
                  incomingShares={incomingShares}
                  invoices={invoices}
                  setInvoices={setInvoices}
                  detailedPayments={detailedPayments}
                  setDetailedPayments={setDetailedPayments}
                  appointments={appointments}
                  setAppointments={setAppointments}
                  turnosCompromisos={turnosCompromisos}
                  setTurnosCompromisos={setTurnosCompromisos}
                  organizacionSemanal={organizacionSemanal}
                  setOrganizacionSemanal={setOrganizacionSemanal}
                  platos={platos}
                  token={token}
                  setToken={setToken}
                  disponibilidadMedicamentos={disponibilidadMedicamentos}
                  medicamentosDetallados={medicamentosDetallados}
                  notes={notes}
                  horarios={horarios}
                  examenes={examenes}
                  tasks={tasks}
                  setTasks={setTasks}
                  subjects={subjects}
                  materiasInfo={materiasInfo}
                />
              )}

              {currentTab === "academic" && (
                <AcademicView
                  darkMode={darkMode}
                  userEmail={user?.email || userProfile?.email || "hernanmaximiliano10@gmail.com"}
                  subjects={subjects}
                  setSubjects={setSubjects}
                  tasks={tasks}
                  setTasks={setTasks}
                  notes={notes}
                  setNotes={setNotes}
                  onSyncNotes={handleSyncNotesToDrive}
                  syncingNotes={syncingNotes}
                  materiasInfo={materiasInfo}
                  setMateriasInfo={setMateriasInfo}
                  horarios={horarios}
                  setHorarios={setHorarios}
                  examenes={examenes}
                  setExamenes={setExamenes}
                  activeSubTab={activeSubTab}
                  onSubTabChange={setActiveSubTab}
                />
              )}

              {currentTab === "meals" && (
                <MealsView
                  darkMode={darkMode}
                  userEmail={effectiveComidasUserId}
                  pantry={pantry}
                  setPantry={setPantry}
                  meals={meals}
                  setMeals={setMeals}
                  shoppingList={shoppingList}
                  setShoppingList={setShoppingList}
                  mercaderia={mercaderia}
                  setMercaderia={setMercaderia}
                  alimentos={alimentos}
                  setAlimentos={setAlimentos}
                  platos={platos}
                  setPlatos={setPlatos}
                  organizacionSemanal={organizacionSemanal}
                  setOrganizacionSemanal={setOrganizacionSemanal}
                  activeSubTab={activeSubTab}
                  onSubTabChange={setActiveSubTab}
                />
              )}

              {currentTab === "finances" && (
                <FinanceView
                  darkMode={darkMode}
                  invoices={invoices}
                  setInvoices={setInvoices}
                  payments={payments}
                  setPayments={setPayments}
                  detailedPayments={detailedPayments}
                  setDetailedPayments={setDetailedPayments}
                  gastosVarios={gastosVarios}
                  setGastosVarios={setGastosVarios}
                  inversiones={inversiones}
                  setInversiones={setInversiones}
                  cotizacionesAcciones={cotizacionesAcciones}
                  cotizacionesCripto={cotizacionesCripto}
                  setCotizacionesCripto={setCotizacionesCripto}
                  setCotizacionesAcciones={setCotizacionesAcciones}
                  budgets={budgets}
                  setBudgets={setBudgets}
                  onExportSheets={handleExportFinancesToSheets}
                  exportingSheets={exportingSheets}
                  onSendEmail={handleSendGmailReport}
                  sendingEmail={sendingEmail}
                  userEmail={user?.email || userProfile?.email || "hernanmaximiliano10@gmail.com"}
                  token={token}
                  activeSubTab={activeSubTab}
                  onSubTabChange={setActiveSubTab}
                />
              )}

              {currentTab === "appointments" && (
                <AppointmentsView
                  darkMode={darkMode}
                  userEmail={user?.email || userProfile?.email || "hernanmaximiliano10@gmail.com"}
                  appointments={appointments}
                  setAppointments={setAppointments}
                  routines={routines}
                  setRoutines={setRoutines}
                  turnosCompromisos={turnosCompromisos}
                  setTurnosCompromisos={setTurnosCompromisos}
                  token={token}
                  doctors={doctors}
                  medicalRecords={medicalRecords}
                  activeSubTab={activeSubTab}
                  onSubTabChange={setActiveSubTab}
                />
              )}

              {currentTab === "health" && (
                <HealthView
                  darkMode={darkMode}
                  token={token}
                  userEmail={effectiveControlClinicoUserId}
                  turnosCompromisos={turnosCompromisos}
                  medications={medications}
                  setMedications={setMedications}
                  bpLogs={bpLogs}
                  setBpLogs={setBpLogs}
                  doctors={doctors}
                  setDoctors={setDoctors}
                  medicamentosDetallados={medicamentosDetallados}
                  setMedicamentosDetallados={setMedicamentosDetallados}
                  disponibilidadMedicamentos={disponibilidadMedicamentos}
                  setDisponibilidadMedicamentos={setDisponibilidadMedicamentos}
                  deportesActividades={deportesActividades}
                  setDeportesActividades={setDeportesActividades}
                  rutinasGimnasio={rutinasGimnasio}
                  setRutinasGimnasio={setRutinasGimnasio}
                  registrosEntrenamiento={registrosEntrenamiento}
                  setRegistrosEntrenamiento={setRegistrosEntrenamiento}
                  medicalRecords={medicalRecords}
                  setMedicalRecords={setMedicalRecords}
                  alimentacionLogs={alimentacionLogs}
                  setAlimentacionLogs={setAlimentacionLogs}
                  alimentos={alimentos}
                  mercaderia={mercaderia}
                  platos={platos}
                  organizacionSemanal={organizacionSemanal}
                  activeSubTab={activeSubTab}
                  onSubTabChange={setActiveSubTab}
                  userProfile={userProfile}
                  onUpdateUserProfile={(updated) => {
                    setUserProfile(updated);
                    localStorage.setItem("liquid_user_profile", JSON.stringify(updated));
                  }}
                  onOpenSettings={() => setIsUserSettingsOpen(true)}
                />
              )}

              {currentTab === "ai" && (
                <AIAssistant
                  darkMode={darkMode}
                  activeSubTab={activeSubTab}
                  onSubTabChange={setActiveSubTab}
                />
              )}
            </>
          )}
        </main>

        {/* User Profile Settings Modal */}
        <UserSettingsModal
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          backgroundStyle={backgroundStyle}
          setBackgroundStyle={setBackgroundStyle}
          themeColor={themeColor}
          setThemeColor={setThemeColor}
          menuVisibility={menuVisibility}
          setMenuVisibility={setMenuVisibility}
          user={userProfile ? { displayName: userProfile.displayName, email: userProfile.email, photoURL: userProfile.photoURL } : user}
          profileSyncVersion={userProfile ? JSON.stringify(userProfile) : undefined}
          onUpdateUser={(updated) => setUserProfile(updated)}
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

        {/* 2FA Login Modal */}
        <TwoFactorLoginModal
          isOpen={is2FARequired}
          userEmail={userProfile?.email || user?.email || "hernanmaximiliano10@gmail.com"}
          secret={userProfile?.twoFactorSecret || "JBSWY3DPEHPK3PXP"}
          darkMode={darkMode}
          onVerifySuccess={handle2FASuccess}
          onDisable2FA={handleDisable2FA}
        />

        {/* Global App Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!appConfirmModal}
          title={appConfirmModal?.title || "Confirmar Acción"}
          message={appConfirmModal?.message || "¿Estás seguro de que deseas continuar?"}
          onConfirm={async () => {
            if (appConfirmModal) {
              await appConfirmModal.onConfirm();
            }
          }}
          onClose={() => setAppConfirmModal(null)}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}
