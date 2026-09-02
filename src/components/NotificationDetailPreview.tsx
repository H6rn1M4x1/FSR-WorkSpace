import React, { useEffect, useRef, useState } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import L from "leaflet";
import { motion } from "motion/react";
import {
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  User,
  DollarSign,
  Receipt,
  UtensilsCrossed,
  GraduationCap,
  Heart,
  Pill,
  Bell,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Phone,
  MessageCircle,
  ChefHat,
  Flame,
  Layers,
  Sparkles,
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
import { FilePreviewModal } from "./FilePreviewModal";
import { getMealImage, getMealIngredients } from "../lib/mealHelpers";

interface NotificationDetailPreviewProps {
  notification: AppNotification | null;
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
  darkMode: boolean;
  onNavigateToSection?: (tab: string, subTab?: string) => void;
  onClose?: () => void;
}

// Custom Leaflet marker pin
const customPinIcon = L.divIcon({
  className: "custom-notif-pin",
  html: `<div style="
    background: var(--color-primary, #1a73e8);
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(26, 115, 232, 0.45);
    border: 2px solid white;
  ">
    <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
      <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
    </div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

// Mini Leaflet Map sub-component
const NotificationMiniMap: React.FC<{
  lat?: number;
  lon?: number;
  locationName: string;
  darkMode: boolean;
}> = ({ lat, lon, locationName, darkMode }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const effectiveLat = typeof lat === "number" && !isNaN(lat) && lat !== 0 ? lat : -31.5375;
  const effectiveLon = typeof lon === "number" && !isNaN(lon) && lon !== 0 ? lon : -68.5364;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.stop();
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn("Leaflet cleanup:", e);
      }
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [effectiveLat, effectiveLon],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      // OpenStreetMap tiles don't require an API key — CartoDB's "voyager" tiles used to
      // be free too but now require registration, so we use the same free source for
      // both light and dark mode instead of depending on a key we don't have.
      const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

      const marker = L.marker([effectiveLat, effectiveLon], { icon: customPinIcon }).addTo(map);
      if (locationName) {
        marker.bindTooltip(locationName, { permanent: false, direction: "top" });
      }

      mapInstanceRef.current = map;

      const timer1 = setTimeout(() => {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch {}
        }
      }, 150);
      const timer2 = setTimeout(() => {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch {}
        }
      }, 400);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.stop();
            mapInstanceRef.current.off();
            mapInstanceRef.current.remove();
          } catch (e) {
            console.warn("Leaflet cleanup:", e);
          }
          mapInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.warn("Leaflet mini-map initialization error:", err);
    }
  }, [effectiveLat, effectiveLon, locationName, darkMode]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-36 sm:h-40 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative z-0 shadow-inner"
    />
  );
};

export const NotificationDetailPreview: React.FC<NotificationDetailPreviewProps> = ({
  notification,
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
  darkMode,
  onNavigateToSection,
  onClose,
}) => {
  useLockBodyScroll(Boolean(notification));
  const [copied, setCopied] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  if (!notification) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400 dark:text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
        <div className="w-12 h-12 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
          <Bell className="w-6 h-6 text-zinc-400" />
        </div>
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Selecciona una notificación
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">
          Haz clic en cualquier notificación de la lista para ver todos sus detalles, mapas, fotos y archivos adjuntos aquí.
        </p>
      </div>
    );
  }

  // Resolve matching entity if available
  let matchedTurno: TurnoCompromiso | undefined;
  let matchedApp: Appointment | undefined;
  let matchedDetailedPayment: DetailedPayment | undefined;
  let matchedInvoice: Invoice | undefined;
  let matchedPlato: PlatoItem | undefined;

  if (notification.id.startsWith("notif-turno-")) {
    const turnoId = notification.id.replace("notif-turno-", "");
    matchedTurno = turnosCompromisos.find((t) => t.id === turnoId);
  } else if (notification.id.startsWith("notif-app-")) {
    const appId = notification.id.replace("notif-app-", "");
    matchedApp = appointments.find((a) => a.id === appId);
  } else if (notification.id.startsWith("notif-dp-")) {
    const dpId = notification.id.replace("notif-dp-", "");
    matchedDetailedPayment = detailedPayments.find((dp) => dp.id === dpId);
  } else if (notification.id.startsWith("notif-inv-")) {
    const invId = notification.id.replace("notif-inv-", "");
    matchedInvoice = invoices.find((i) => i.id === invId);
  } else if (notification.id.startsWith("notif-meal-") || notification.type === "meal") {
    if (notification.mealId) {
      matchedPlato = platos.find((p) => p.id === notification.mealId);
    }
    if (!matchedPlato && organizacionSemanal.length > 0) {
      const osId = notification.id.replace("notif-meal-", "");
      const matchedOs = organizacionSemanal.find((os) => os.id === osId);
      if (matchedOs) {
        matchedPlato = platos.find((p) => p.id === matchedOs.platoId);
      }
    }
    if (!matchedPlato) {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/^comida planeada:\s*/i, "")
          .replace(/[^a-z0-9]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      const notifClean = normalize(notification.title);
      matchedPlato = platos.find((p) => {
        const pClean = normalize(p.nombrePlato);
        return notifClean.includes(pClean) || pClean.includes(notifClean);
      });
    }
  }

  const isMeal = notification.type === "meal" || Boolean(matchedPlato) || notification.id.startsWith("notif-meal-");
  const mealImageUrl = isMeal
    ? getMealImage(matchedPlato?.nombrePlato || notification.title, matchedPlato?.imagen || notification.mealImage)
    : null;
  const mealIngredientsList = isMeal
    ? getMealIngredients(matchedPlato, alimentos)
    : [];

  // Extract location information
  let locationStr = notification.location || matchedTurno?.lugar || matchedApp?.location || "";
  if (!locationStr && notification.body) {
    const locMatch = notification.body.match(/Lugar:\s*([^-\n,]+(?:,\s*[^-\n,]+)*)/i);
    if (locMatch && locMatch[1]) {
      locationStr = locMatch[1].trim();
    }
  }

  const lat = notification.lat ?? matchedTurno?.lat;
  const lon = notification.lon ?? matchedTurno?.lon;
  const hasMap = Boolean(locationStr || (lat && lon));

  // Extract files & photos
  const attachedFiles: { name: string; url: string; type?: string }[] = [
    ...(notification.files || []),
  ];

  if (matchedTurno?.archivosNecesarios && Array.isArray(matchedTurno.archivosNecesarios)) {
    matchedTurno.archivosNecesarios.forEach((f) => {
      if (!attachedFiles.some((item) => item.url === f.url)) {
        attachedFiles.push({ name: f.name || "Archivo adjunto", url: f.url });
      }
    });
  }
  if (matchedTurno?.estudioInformeDoc && !attachedFiles.some((f) => f.url === matchedTurno?.estudioInformeDoc)) {
    attachedFiles.push({ name: "Estudio / Informe Médico", url: matchedTurno.estudioInformeDoc });
  }
  if (matchedTurno?.pedidoDocumento && !attachedFiles.some((f) => f.url === matchedTurno?.pedidoDocumento)) {
    attachedFiles.push({ name: "Pedido Médico / Receta", url: matchedTurno.pedidoDocumento });
  }
  if (matchedDetailedPayment?.facturaEmitida && !attachedFiles.some((f) => f.url === matchedDetailedPayment?.facturaEmitida)) {
    attachedFiles.push({ name: "Factura Emitida", url: matchedDetailedPayment.facturaEmitida });
  }
  if (matchedDetailedPayment?.comprobantePago && !attachedFiles.some((f) => f.url === matchedDetailedPayment?.comprobantePago)) {
    attachedFiles.push({ name: "Comprobante de Pago", url: matchedDetailedPayment.comprobantePago });
  }

  // Check doctor / contact info
  const doctorName =
    notification.contactName ||
    matchedTurno?.doctor ||
    matchedApp?.doctorName ||
    "";
  const matchedDoctorObj = doctorName
    ? doctors.find((d) => d.name.toLowerCase().includes(doctorName.toLowerCase()) || doctorName.toLowerCase().includes(d.name.toLowerCase()))
    : undefined;

  // Match Info Resolution
  let matchDetails: {
    homeTeam?: string;
    homeLogo?: string;
    awayTeam?: string;
    awayLogo?: string;
    competition?: string;
  } | null = null;

  const notesSource = notification.notes || matchedTurno?.informacionPersonalizada || "";
  if (notesSource) {
    try {
      const trimmed = notesSource.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const parsed = JSON.parse(trimmed);
        if (parsed && (parsed.homeTeam || parsed.awayTeam)) {
          matchDetails = parsed;
        }
      }
    } catch (e) {}
  }

  // Fallback to title parsing if title has ' vs ' or ' VS '
  if (!matchDetails && notification.title && (notification.title.includes(" vs ") || notification.title.includes(" VS "))) {
    const parts = notification.title.split(/ vs | VS /i);
    if (parts.length === 2) {
      matchDetails = {
        homeTeam: parts[0].trim(),
        awayTeam: parts[1].trim(),
      };
    }
  }

  const isMatchJson = Boolean(matchDetails && notesSource && notesSource.trim().startsWith("{"));
  const notesToShow = isMatchJson ? "" : (notification.notes || matchedTurno?.informacionPersonalizada || matchedTurno?.transcripcionAutomatica || "");

  // Category and Icon
  const typeStr = notification.type?.toLowerCase() || "";
  let categoryLabel = "Notificación";
  let CategoryIcon = Bell;
  let targetTab = notification.actionTab || "";
  let targetSubTab = notification.actionSubTab || "";

  if (typeStr.includes("turno") || typeStr.includes("appointment")) {
    categoryLabel = matchedTurno?.categoria || "Turno / Cita";
    CategoryIcon = Calendar;
    if (!targetTab) {
      targetTab = "appointments";
      targetSubTab = "agenda";
    }
  } else if (typeStr.includes("finance") || typeStr.includes("pago")) {
    categoryLabel = "Finanzas";
    CategoryIcon = DollarSign;
    if (!targetTab) {
      targetTab = "finances";
      targetSubTab = "pagos_mensuales";
    }
  } else if (typeStr.includes("meal") || typeStr.includes("comida")) {
    categoryLabel = "Comidas";
    CategoryIcon = UtensilsCrossed;
    if (!targetTab) {
      targetTab = "meals";
      targetSubTab = "organizacion_semanal";
    }
  } else if (typeStr.includes("academic")) {
    categoryLabel = "Académico";
    CategoryIcon = GraduationCap;
    if (!targetTab) {
      targetTab = "academic";
      targetSubTab = "horario";
    }
  } else if (typeStr.includes("health") || typeStr.includes("salud")) {
    categoryLabel = "Salud";
    CategoryIcon = Heart;
    if (!targetTab) {
      targetTab = "health";
      targetSubTab = "control_clinico";
    }
  }

  const handleCopyAddress = () => {
    if (!locationStr) return;
    navigator.clipboard.writeText(locationStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNavigate = () => {
    if (targetTab && onNavigateToSection) {
      onNavigateToSection(targetTab, targetSubTab);
      if (onClose) onClose();
    }
  };

  return (
    <motion.div
      key={notification.id}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col h-full bg-white dark:bg-black rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 sm:p-4 overflow-y-auto space-y-3 shadow-xs"
    >
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-primary/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-primary/10 text-primary border-primary/20">
            <CategoryIcon className="w-3 h-3" />
            <span>{categoryLabel}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(notification.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              - {new Date(notification.timestamp).toLocaleDateString([], { day: "2-digit", month: "short" })}
            </span>
          </div>
        </div>

        {targetTab && onNavigateToSection && (
          <button
            onClick={handleNavigate}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-colors cursor-pointer"
            title="Ir a la sección correspondiente"
          >
            <span>Ver en sección</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Main Title & Body */}
      <div className="space-y-2">
        {matchDetails ? (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex items-center gap-3 flex-wrap text-sm sm:text-[15px] font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
              <div className="flex items-center gap-2">
                {matchDetails.homeLogo ? (
                  <img
                    src={matchDetails.homeLogo}
                    alt={matchDetails.homeTeam}
                    className="w-6 h-6 object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <Shield className="w-6 h-6 text-zinc-400" />
                )}
                <span>{matchDetails.homeTeam}</span>
              </div>
              <span className="text-primary font-black px-1 text-xs select-none">VS</span>
              <div className="flex items-center gap-2">
                {matchDetails.awayLogo ? (
                  <img
                    src={matchDetails.awayLogo}
                    alt={matchDetails.awayTeam}
                    className="w-6 h-6 object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <Shield className="w-6 h-6 text-zinc-400" />
                )}
                <span>{matchDetails.awayTeam}</span>
              </div>
            </div>
            {matchDetails.competition && (
              <span className="text-[10.5px] uppercase tracking-wider text-zinc-500 font-extrabold block">
                {matchDetails.competition}
              </span>
            )}
          </div>
        ) : (
          <h2 className="text-sm sm:text-[15px] font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
            {notification.title}
          </h2>
        )}
        <p className="text-[11.5px] sm:text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed whitespace-pre-line">
          {notification.body}
        </p>
      </div>

      {/* Meal Image & Recipe Ingredients (Square image on left, ingredients on right) */}
      {isMeal && (
        <div className="pt-0.5">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            {/* Meal Square Image Banner */}
            {mealImageUrl && (
              <div
                onClick={() =>
                  setPreviewFile({
                    url: mealImageUrl,
                    name: matchedPlato?.nombrePlato || notification.title,
                  })
                }
                className="relative w-full sm:w-44 md:w-52 aspect-square rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group cursor-pointer shadow-xs bg-zinc-100 dark:bg-zinc-900 shrink-0"
              >
                <img
                  src={mealImageUrl}
                  alt={matchedPlato?.nombrePlato || notification.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Floating Top Badges */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[9.5px] font-bold border border-white/10 shadow-xs">
                    <UtensilsCrossed className="w-2.5 h-2.5 text-primary" />
                    <span>Plato del Día</span>
                  </div>

                  {matchedPlato?.calorias ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-md text-white text-[9.5px] font-bold shadow-xs">
                      <Flame className="w-2.5 h-2.5" />
                      <span>{matchedPlato.calorias} kcal</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white/90 text-[9px] font-medium border border-white/10">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      <span>Saludable</span>
                    </div>
                  )}
                </div>

                {/* Bottom Dish Name Banner */}
                <div className="absolute bottom-2 left-2 right-2 text-white pointer-events-none">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-300">
                    Menú Planeado
                  </p>
                  <p className="text-[11px] sm:text-xs font-bold text-white leading-tight line-clamp-2">
                    {matchedPlato?.nombrePlato || notification.title.replace(/^comida planeada:\s*/i, "")}
                  </p>
                </div>
              </div>
            )}

            {/* Ingredients List on the Right */}
            <div className="flex-1 flex flex-col justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 min-w-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-zinc-900 dark:text-zinc-100">
                    <div className="p-1 rounded-md bg-primary/10 text-primary">
                      <ChefHat className="w-3.5 h-3.5" />
                    </div>
                    <span>Ingredientes</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {mealIngredientsList.length > 0
                      ? `${mealIngredientsList.length} ingrediente${mealIngredientsList.length !== 1 ? "s" : ""}`
                      : "Porciones calculadas"}
                  </span>
                </div>

                {mealIngredientsList.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 sm:max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
                    {mealIngredientsList.map((ing, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white dark:bg-black/60 border border-zinc-200/70 dark:border-zinc-800/80 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {ing.name}
                            </p>
                            {ing.alimentoName && ing.alimentoName !== ing.name && (
                              <p className="text-[9.5px] text-zinc-500 truncate">
                                {ing.alimentoName}
                              </p>
                            )}
                          </div>
                        </div>
                        {ing.amount !== undefined && ing.amount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold shrink-0 border border-primary/20">
                            {ing.amount} {ing.unit || ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                      {matchedPlato?.descripcion || "Plato completo preparado según la planificación semanal."}
                    </p>
                    {/* Fallback tags parsed from name */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(matchedPlato?.nombrePlato || notification.title)
                        .replace(/^comida planeada:\s*/i, "")
                        .split(/[\s,]+con[\s,]+|[\s,]+y[\s,]+|,/i)
                        .map((item, idx) => item.trim())
                        .filter((item) => item.length > 2)
                        .map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-black/60 border border-zinc-200 dark:border-zinc-800 text-[10.5px] font-semibold text-zinc-800 dark:text-zinc-200"
                          >
                            ✓ {item}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Notes or Instructions on Plato */}
              {matchedPlato?.ingredientesPersonalizados && (
                <div className="pt-2 mt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
                    Notas de Ingredientes
                  </p>
                  <p className="text-[10.5px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {matchedPlato.ingredientesPersonalizados}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Doctor / Professional / Contact Info */}
      {(doctorName || matchedDoctorObj) && (
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {doctorName || matchedDoctorObj?.name}
              </p>
              {matchedDoctorObj?.specialty && (
                <p className="text-[10px] text-zinc-500 font-medium truncate">
                  Especialidad: {matchedDoctorObj.specialty}
                </p>
              )}
            </div>
          </div>

          {matchedDoctorObj?.phone && (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={`tel:${matchedDoctorObj.phone}`}
                className="p-1.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
                title="Llamar"
              >
                <Phone className="w-3 h-3" />
              </a>
              <a
                href={`https://wa.me/${matchedDoctorObj.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                title="WhatsApp"
              >
                <MessageCircle className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Finance Extra Details */}
      {(notification.amount || matchedDetailedPayment || matchedInvoice) && (
        <div className="p-2.5 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                Monto a pagar
              </p>
              <p className="text-xs sm:text-sm font-extrabold text-primary">
                ${(notification.amount || matchedDetailedPayment?.montoAPagar || matchedInvoice?.amount || 0).toLocaleString("es-AR")} ARS
              </p>
            </div>
          </div>

          {(matchedDetailedPayment?.dondePagar || matchedDetailedPayment?.conQuePagar) && (
            <div className="text-right text-[10.5px] text-zinc-600 dark:text-zinc-400">
              {matchedDetailedPayment.dondePagar && (
                <p>
                  <strong>Lugar:</strong> {matchedDetailedPayment.dondePagar}
                </p>
              )}
              {matchedDetailedPayment.conQuePagar && (
                <p>
                  <strong>Medio:</strong> {matchedDetailedPayment.conQuePagar}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Custom Notes / Instructions / Transcription */}
      {!isMatchJson && notesToShow && (
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
            Información Adicional / Notas
          </p>
          <p className="text-[11px] text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
            {notesToShow}
          </p>
        </div>
      )}

      {/* Attached Files & Photos Preview */}
      {attachedFiles.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
            <ImageIcon className="w-3.5 h-3.5 text-primary" />
            <span>Archivos y Fotos Adjuntos ({attachedFiles.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachedFiles.map((file, idx) => {
              const isImg = file.url.startsWith("data:image/") || file.url.match(/\.(jpeg|jpg|gif|png|webp)$/i);

              return (
                <div
                  key={idx}
                  onClick={() => setPreviewFile(file)}
                  className="group p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 cursor-pointer hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isImg ? (
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-zinc-100">
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-primary transition-colors">
                        {file.name}
                      </p>
                      <span className="text-[9.5px] text-zinc-500 font-medium">
                        {isImg ? "Imagen / Foto" : "Documento"}
                      </span>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                    <Eye className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Map & Location Card */}
      {hasMap && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>Ubicación y Mapa</span>
            </div>

            {locationStr && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationStr)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10.5px] font-bold text-primary hover:underline"
              >
                <span>Abrir en Google Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          {/* Leaflet Interactive Map */}
          <NotificationMiniMap lat={lat} lon={lon} locationName={locationStr} darkMode={darkMode} />

          {/* Address Bar with Copy Action */}
          {locationStr && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
              <div className="flex items-start gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium truncate">
                  {locationStr}
                </span>
              </div>

              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                title="Copiar dirección"
              >
                {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
        />
      )}
    </motion.div>
  );
};
