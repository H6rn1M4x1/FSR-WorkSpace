import { SubNav } from "./SubNav";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { generateUniqueId } from "../utils/id";
import { getLocalDateString } from "../utils/date";
import { StorageService } from "../lib/storage";
import { GeminiService } from "../lib/gemini";
import { AudioTranscriptionPlayer } from "./AudioTranscriptionPlayer";
import { FilePreviewModal } from "./FilePreviewModal";
import { getMatchTeamLogos } from "../lib/matchScheduler";
import React, { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import { collection, query, getDocs } from "firebase/firestore";
import { subscribeToCategory, deleteItemFromFirestore, saveItemToFirestore, sanitizeForFirestore, getEffectiveUserId } from "../lib/firestoreSyncService";
import { auth } from "../lib/supabase";
import { db } from "../lib/firebase"; // TODO Fase 2: migrar a Supabase
import { LocationPickerMap } from "./LocationPickerMap";
import { useToast } from "../context/ToastContext";
import { AddressBookModal, loadSavedAddressBook, AddressEntry } from "./AddressBookModal";
import { PillFilterBar } from "./PillFilterBar";
import { ConfirmationModal } from "./ConfirmationModal";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Pencil,
  MapPin,
  Stethoscope,
  Sparkles,
  Award,
  CheckCircle2,
  RefreshCcw,
  Zap,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  FileDown,
  Search,
  ExternalLink,
  Lock,
  AlertTriangle,
  Loader2,
  FileText,
  Paperclip,
  Tag,
  Settings, Filter,
  BookMarked,
  BookmarkPlus,
  Star,
  Mic,
  Square,
  AudioLines,
  Pill,
  Heart,
  DollarSign,
  UtensilsCrossed,
  GraduationCap,
  Shield,
} from "lucide-react";
import {
  Appointment,
  RoutineLog,
  TurnoCompromiso,
  DoctorCard,
  MedicalRecord,
} from "../types";
import { WorkspaceService } from "../lib/workspace";
import { SmartDateTimePicker } from "./SmartDateTimePicker";
import { RichTextEditor } from "./RichTextEditor";

const FALLBACK_PLACES = [
  {
    display_name:
      "Hospital Dr. Guillermo Rawson, Av. Rawson 494 Sur, Capital, San Juan, Argentina",
    lat: "-31.5413",
    lon: "-68.5186",
  },
  {
    display_name:
      "Hospital Dr. Marcial Quiroga, Av. Libertador Gral. San Martín 5400 Oeste, Rivadavia, San Juan, Argentina",
    lat: "-31.5307",
    lon: "-68.5839",
  },
  {
    display_name:
      "Sanatorio San Juan, General Acha 124 Sur, Capital, San Juan, Argentina",
    lat: "-31.5398",
    lon: "-68.5244",
  },
  {
    display_name:
      "Clínica Santa Clara, General Acha 320 Sur, Capital, San Juan, Argentina",
    lat: "-31.5412",
    lon: "-68.5242",
  },
  {
    display_name:
      "Sanatorio Argentino, San Luis 432 Oeste, Capital, San Juan, Argentina",
    lat: "-31.5348",
    lon: "-68.5284",
  },
  {
    display_name:
      "Clínica El Castaño, Lateral Circunvalación 282 Sur, Capital, San Juan, Argentina",
    lat: "-31.5222",
    lon: "-68.5520",
  },
  {
    display_name:
      "Hospital Privado Colegio Médico, Las Heras 444 Sur, Capital, San Juan, Argentina",
    lat: "-31.5415",
    lon: "-68.5350",
  },
  {
    display_name:
      "Instituto de Traumatología, Santiago del Estero 231 Sur, Capital, San Juan, Argentina",
    lat: "-31.5385",
    lon: "-68.5312",
  },
  {
    display_name:
      "Laboratorio Dr. Soria, Mendoza 450 Sur, Capital, San Juan, Argentina",
    lat: "-31.5395",
    lon: "-68.5255",
  },
  {
    display_name:
      "Hospital de Niños, Sarmiento 600 Norte, Capital, San Juan, Argentina",
    lat: "-31.5301",
    lon: "-68.5212",
  },
  {
    display_name:
      "Obra Social Provincia (OSP), Sarmiento 250 Sur, Capital, San Juan, Argentina",
    lat: "-31.5372",
    lon: "-68.5230",
  },
  {
    display_name:
      "Municipalidad de la Ciudad de San Juan, Caseros 298 Sur, Capital, San Juan, Argentina",
    lat: "-31.5388",
    lon: "-68.5218",
  },
  {
    display_name:
      "Centro de Salud Rawson, Villa Krause, Rawson, San Juan, Argentina",
    lat: "-31.5794",
    lon: "-68.5251",
  },
  {
    display_name:
      "OSECAC San Juan, Mendoza 230 Sur, Capital, San Juan, Argentina",
    lat: "-31.5381",
    lon: "-68.5258",
  },
  {
    display_name:
      "PAMI San Juan, Córdoba 350 Oeste, Capital, San Juan, Argentina",
    lat: "-31.5361",
    lon: "-68.5289",
  },
  {
    display_name: "Catedral de San Juan, Capital, San Juan, Argentina",
    lat: "-31.5372",
    lon: "-68.5250",
  },
  {
    display_name: "Parque de Mayo, Capital, San Juan, Argentina",
    lat: "-31.5314",
    lon: "-68.5389",
  },
  {
    display_name: "Terminal de Omnibus San Juan, Capital, San Juan, Argentina",
    lat: "-31.5391",
    lon: "-68.5144",
  },
  {
    display_name:
      "OSDE Filial San Juan, General Acha, Capital, San Juan, Argentina",
    lat: "-31.5355",
    lon: "-68.5246",
  },
  {
    display_name: "SMI San Juan, Capital, San Juan, Argentina",
    lat: "-31.5380",
    lon: "-68.5290",
  },
  {
    display_name: "Swiss Medical San Juan, Capital, San Juan, Argentina",
    lat: "-31.5360",
    lon: "-68.5270",
  },
  {
    display_name: "Hospital Español San Juan, Capital, San Juan, Argentina",
    lat: "-31.5510",
    lon: "-68.5310",
  },
  {
    display_name: "Clínica de la Ciudad, Capital, San Juan, Argentina",
    lat: "-31.5420",
    lon: "-68.5220",
  },
  {
    display_name: "CIMAC San Juan, Capital, San Juan, Argentina",
    lat: "-31.5340",
    lon: "-68.5290",
  },
  {
    display_name: "Laboratorio San Martín, Capital, San Juan, Argentina",
    lat: "-31.5365",
    lon: "-68.5305",
  },
];

const MapComponent = ({
  turnosCompromisos,
  locationCoords,
  darkMode,
}: {
  turnosCompromisos: TurnoCompromiso[];
  locationCoords: { [lugar: string]: { lat: number; lon: number } };
  darkMode: boolean;
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
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
        center: [-31.5375, -68.5364],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      map.scrollWheelZoom.enable();

      // Standard OpenStreetMap Tile Layer
      const osmTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      const tileLayer = L.tileLayer(osmTileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      const markersLayer = L.featureGroup().addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = markersLayer;

      // Trigger immediate resize recalculation
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    } catch (err) {
      console.warn("Map initialization warning:", err);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Leaflet cleanup:", e);
        }
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Handle container resize and theme changes without re-creating map
  useEffect(() => {
    if (!mapInstanceRef.current || !mapContainerRef.current) return;

    const map = mapInstanceRef.current;

    const refreshMap = () => {
      if (map) {
        map.invalidateSize();
      }
    };

    refreshMap();
    const t1 = setTimeout(refreshMap, 50);
    const t2 = setTimeout(refreshMap, 200);

    const resizeObserver = new ResizeObserver(() => {
      refreshMap();
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
    };
  }, [darkMode]);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    try {
      markersLayerRef.current.clearLayers();

    const locationsWithTurnos: { [lugar: string]: TurnoCompromiso[] } = {};
    const seenTcIds = new Set<string>();
    (turnosCompromisos || []).forEach((tc) => {
      const rawLugar = (tc?.lugar || "").trim();
      if (
        !rawLugar ||
        rawLugar.toLowerCase() === "sin dirección" ||
        rawLugar.toLowerCase() === "sin direccion" ||
        rawLugar.toLowerCase() === "sin lugar asignado"
      ) {
        return;
      }

      const idKey = String(tc.id || `${tc.descripcion}_${tc.fecha}`);
      if (seenTcIds.has(idKey)) return;
      seenTcIds.add(idKey);

      if (!locationsWithTurnos[rawLugar]) {
        locationsWithTurnos[rawLugar] = [];
      }
      locationsWithTurnos[rawLugar].push(tc);
    });

    let markerCount = 0;

    const headingColor = darkMode ? "text-zinc-100" : "text-slate-900";
    const subTextColor = darkMode ? "text-zinc-400" : "text-slate-500";
    
    // Card item styles
    const itemBgColor = darkMode ? "bg-zinc-800/60" : "bg-slate-100/60";
    const itemBorderColor = darkMode ? "border-zinc-700/60" : "border-slate-200/60";
    const tagBgColor = darkMode ? "bg-primary/20" : "bg-primary/10";
    const itemTextColor = darkMode ? "text-zinc-300" : "text-slate-700";
    const itemIconColor = darkMode ? "text-zinc-400" : "text-slate-500";
    const doctorTextColor = darkMode ? "text-zinc-400" : "text-slate-600";
    
    // Popup styles
    const popupBgColor = darkMode ? "bg-zinc-900/95" : "bg-white/95";
    const popupBorderColor = darkMode ? "border-zinc-700/60" : "border-slate-200/60";
    const pinBorderColor = darkMode ? "border-zinc-800" : "border-white";

    Object.entries(locationsWithTurnos).forEach(([lugar, tcs]) => {
      const tcWithCoords = tcs.find(
        (tc) =>
          tc.lat !== undefined &&
          tc.lat !== null &&
          tc.lon !== undefined &&
          tc.lon !== null &&
          !isNaN(Number(tc.lat)) &&
          !isNaN(Number(tc.lon)) &&
          (Number(tc.lat) !== 0 || Number(tc.lon) !== 0),
      );

      const coords = tcWithCoords
        ? { lat: Number(tcWithCoords.lat), lon: Number(tcWithCoords.lon) }
        : locationCoords[lugar];

      if (
        !coords ||
        isNaN(coords.lat) ||
        isNaN(coords.lon) ||
        (coords.lat === 0 && coords.lon === 0)
      ) {
        return;
      }

      const { lat, lon } = coords;

      const listHtml = tcs
        .map(
          (tc) => `
                 <div class="p-2.5 rounded-xl ${itemBgColor} border ${itemBorderColor} hover:border-primary/30 transition-colors">
                    <div class="flex items-center justify-between mb-1.5 gap-2">
                      <span class="text-[9px] font-bold uppercase tracking-wider text-primary ${tagBgColor} px-1.5 py-0.5 rounded-md truncate">
                         ${tc.categoria}
                      </span>
                      <span class="flex items-center gap-1 text-[10px] ${itemIconColor} font-medium shrink-0">
                         <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                         ${tc.fecha}
                      </span>
                    </div>
                    <p class="m-0 text-[11px] ${itemTextColor} font-semibold leading-snug">
                       ${tc.descripcion}
                    </p>
                    ${tc.doctor ? `
                      <div class="mt-2 flex items-center gap-1.5 text-[10px] ${doctorTextColor} font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/><circle cx="8" cy="10" r="2"/></svg>
                        ${tc.doctor}
                      </div>
                    ` : ""}
                    ${tc.informacionPersonalizada ? `
                      <div class="mt-2 text-[10px] ${doctorTextColor} italic border-l-2 border-primary/30 pl-2 py-0.5 prose dark:prose-invert prose-sm prose-p:my-0 prose-ul:my-0 prose-ol:my-0 [&_*]:!text-[10px] [&_*]:!text-slate-600 dark:[&_*]:!text-zinc-400 max-h-[80px] overflow-y-auto scrollbar-thin [&_ol_ol]:list-[lower-alpha] [&_ol_ol_ol]:list-[lower-roman]">
                        ${tc.informacionPersonalizada}
                      </div>
                    ` : ""}
                    ${tc.transcripcionAutomatica ? `
                      <div class="mt-2 text-[10px] ${doctorTextColor} italic border-l-2 border-green-500/30 pl-2 py-0.5 max-h-[80px] overflow-y-auto scrollbar-thin">
                        <span class="font-bold uppercase tracking-wider block mb-0.5 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg> Transcripción:</span>
                        ${tc.transcripcionAutomatica}
                      </div>
                    ` : ""}
                 </div>
      `,
        )
        .join("");

      const osmUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(lugar.includes("San Juan") ? lugar : `${lugar}, San Juan, Argentina`)}`;

      const sharedCardHtml = `
        <div class="font-sans w-64 text-left p-0.5">
           <!-- Location Title -->
           <div class="flex items-start gap-2.5 mb-3.5">
             <div class="p-2 ${tagBgColor} text-primary rounded-xl shrink-0 mt-0.5 ring-1 ring-primary/20">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
             </div>
             <div>
               <h4 class="m-0 font-extrabold text-[13px] ${headingColor} leading-tight">
                 ${lugar.split(",")[0]}
               </h4>
               <p class="m-0 mt-1 text-[10px] ${subTextColor} font-medium leading-tight">
                 ${lugar}
               </p>
             </div>
           </div>

           <!-- Events List -->
           <div class="max-h-[140px] overflow-y-auto pr-1.5 space-y-2 scrollbar-thin mb-3.5">
              ${listHtml}
           </div>
           
           <div class="pt-0">
             <a href="${osmUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-[11px] font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto no-underline">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                Abrir en OpenStreetMap
             </a>
           </div>
        </div>
      `;

      const popupHtml = `
        <div class="p-1">
          ${sharedCardHtml}
        </div>
      `;

      const markerHtml = `
        <div class="relative group cursor-pointer inline-block">
          <div class="w-7 h-7 rounded-full bg-primary border-2 ${pinBorderColor} shadow-md flex items-center justify-center transform hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="w-1.5 h-1.5 bg-primary rotate-45 -mt-1 mx-auto rounded-sm"></div>

          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-[9999] p-3 ${popupBgColor} backdrop-blur-md rounded-2xl shadow-xl border ${popupBorderColor} pointer-events-auto">
            ${sharedCardHtml}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "custom-google-pin",
        iconSize: [24, 28],
        iconAnchor: [12, 28],
      });

      const marker = L.marker([lat, lon], { icon: customIcon }).bindPopup(
        popupHtml,
        {
          className: "custom-app-popup",
          closeButton: true,
          autoClose: true,
        },
      );

      markersLayerRef.current.addLayer(marker);
      markerCount++;
    });

      if (markerCount > 0 && mapInstanceRef.current && markersLayerRef.current) {
        try {
          const bounds = markersLayerRef.current.getBounds();
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 16,
              animate: false,
            });
          }
        } catch (err) {
          console.warn("Could not fit bounds on map:", err);
        }
      } else if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.setView([-31.5375, -68.5364], 13, { animate: false });
        } catch (err) {
          console.warn("Could not set view on map:", err);
        }
      }
    } catch (err) {
      console.warn("Error updating markers on map:", err);
    }
  }, [turnosCompromisos, locationCoords, darkMode]);

  return (
    <div className="relative w-full h-[380px] min-h-[380px] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 shadow-md">
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[380px]"
        style={{ zIndex: 1 }}
      />
    </div>
  );
};

interface AppointmentsViewProps {
  darkMode: boolean;
  userEmail?: string;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  routines: RoutineLog[];
  setRoutines: React.Dispatch<React.SetStateAction<RoutineLog[]>>;
  turnosCompromisos: TurnoCompromiso[];
  setTurnosCompromisos: React.Dispatch<React.SetStateAction<TurnoCompromiso[]>>;
  token?: string | null;
  doctors: DoctorCard[];
  medicalRecords?: MedicalRecord[];
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  onSilentFetch?: () => void;
}

// Reusable CustomSelect styled exactly like Finance's Todos los Pagos with Portal support
interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  searchable?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "-- Seleccionar --",
  disabled = false,
  className = "",
  size = "md",
  icon,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placeAbove: boolean;
  }>({
    top: 0,
    left: 0,
    width: 0,
    placeAbove: false,
  });

  const updatePosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < 250 && rect.top > 250;
      const menuWidth = rect.width;
      const left = Math.max(
        8,
        Math.min(rect.left, window.innerWidth - menuWidth - 8),
      );
      setCoords({
        top: placeAbove ? rect.top - 6 : rect.bottom + 6,
        left,
        width: menuWidth,
        placeAbove,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize, true);

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const clickedInsideTrigger =
          dropdownRef.current && dropdownRef.current.contains(target);
        const clickedInsideMenu =
          menuRef.current && menuRef.current.contains(target);
        if (!clickedInsideTrigger && !clickedInsideMenu) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize, true);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div
      ref={dropdownRef}
      className={`relative text-left w-full min-w-0 max-w-full ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
        }}
        className={`w-full flex items-center justify-between font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          size === "sm"
            ? "px-3 h-[34px] rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold focus:border-primary"
            : "px-3.5 h-[42px] rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-black dark:text-white text-xs md:text-sm focus:border-primary"
        }`}
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          {icon && (
            <span className="shrink-0 text-slate-400 dark:text-zinc-500">
              {icon}
            </span>
          )}
          <span
            data-custom-select-selected={!!selectedOption}
            className={`whitespace-nowrap truncate ${
              selectedOption
                ? "font-bold text-black dark:text-white"
                : "text-slate-400 dark:text-zinc-500 font-normal"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${
            size === "sm" ? "w-3.5 h-3.5 ml-1.5" : "w-4 h-4 ml-2"
          }`}
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.placeAbove ? undefined : `${coords.top}px`,
              bottom: coords.placeAbove
                ? `${window.innerHeight - coords.top}px`
                : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-64 animate-fade-in"
          >
            {searchable && (
              <div className="p-2 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md shrink-0 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-primary"
                    autoFocus
                  />
                </div>
              </div>
            )}
            <div className="overflow-y-auto p-1 space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-400 dark:text-zinc-500 text-center">
                  No hay opciones
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-full text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white dark:text-blue-950"
                          : "text-black dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
                      }`}
                    >
                      <span className="truncate pr-2">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

// Reusable quick-access addresses row with smooth drag-to-scroll when dragging & instant single-tap selection
const SavedAddressesScrollRow: React.FC<{
  savedAddresses: AddressEntry[];
  onSelect: (addr: AddressEntry) => void;
}> = ({ savedAddresses, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    isDown: boolean;
    startX: number;
    scrollLeft: number;
    hasMoved: boolean;
  }>({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    dragRef.current = {
      isDown: true,
      startX: e.clientX,
      scrollLeft: containerRef.current.scrollLeft,
      hasMoved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDown || !containerRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    if (Math.abs(deltaX) > 5) {
      dragRef.current.hasMoved = true;
      containerRef.current.scrollLeft = dragRef.current.scrollLeft - deltaX;
    }
  };

  const handlePointerUp = () => {
    dragRef.current.isDown = false;
  };

  const handlePillClick = (addr: AddressEntry, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // If user dragged to scroll while holding down, don't trigger selection
    if (dragRef.current.hasMoved) {
      return;
    }
    // Immediate selection on single tap / click
    onSelect(addr);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none cursor-grab active:cursor-grabbing select-none touch-pan-x"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 shrink-0 uppercase tracking-wider flex items-center gap-1 pointer-events-none">
        <BookMarked className="w-3 h-3 text-primary" />
        <span>Guardados:</span>
      </span>
      {savedAddresses.slice(0, 8).map((addr) => (
        <button
          key={addr.id}
          type="button"
          onClick={(e) => handlePillClick(addr, e)}
          title={`Seleccionar ${addr.name}`}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-primary/15 dark:bg-zinc-800/80 dark:hover:bg-primary/20 text-black dark:text-zinc-200 text-[11px] font-bold whitespace-nowrap flex items-center gap-1 border border-slate-200/80 dark:border-zinc-700 transition-all cursor-pointer shrink-0 group select-none active:scale-95 active:bg-primary active:text-white dark:active:text-slate-950"
        >
          <MapPin className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
          <span>{addr.name}</span>
        </button>
      ))}
    </div>
  );
};

export const getTurnoCategoryIcon = (category: string) => {
  const cat = (category || "").toLowerCase().trim();
  if (
    cat.includes("hernan") ||
    cat.includes("modesto") ||
    cat.includes("turno") ||
    cat.includes("médic") ||
    cat.includes("medic") ||
    cat.includes("doctor")
  ) {
    return Stethoscope;
  }
  if (
    cat.includes("medicac") ||
    cat.includes("remedio") ||
    cat.includes("farmacia")
  ) {
    return Pill;
  }
  if (
    cat.includes("tramite") ||
    cat.includes("trámite") ||
    cat.includes("gestion") ||
    cat.includes("gestión") ||
    cat.includes("doc")
  ) {
    return FileText;
  }
  if (
    cat.includes("ocio") ||
    cat.includes("recrea") ||
    cat.includes("viaje") ||
    cat.includes("vacacion") ||
    cat.includes("deporte") ||
    cat.includes("futbol") ||
    cat.includes("fútbol") ||
    cat.includes("partido")
  ) {
    return Sparkles;
  }
  if (
    cat.includes("compromiso") ||
    cat.includes("agenda") ||
    cat.includes("reunion") ||
    cat.includes("reunión") ||
    cat.includes("evento")
  ) {
    return Calendar;
  }
  if (
    cat.includes("pago") ||
    cat.includes("finanz") ||
    cat.includes("impuesto") ||
    cat.includes("tarjeta") ||
    cat.includes("factura")
  ) {
    return DollarSign;
  }
  if (
    cat.includes("comida") ||
    cat.includes("almuerzo") ||
    cat.includes("cena") ||
    cat.includes("nutric")
  ) {
    return UtensilsCrossed;
  }
  if (
    cat.includes("universidad") ||
    cat.includes("facultad") ||
    cat.includes("examen") ||
    cat.includes("académic") ||
    cat.includes("estudio")
  ) {
    return GraduationCap;
  }
  return Calendar;
};

export default function AppointmentsView({
  darkMode,
  userEmail,
  appointments,
  setAppointments,
  routines,
  setRoutines,
  turnosCompromisos,
  setTurnosCompromisos,
  token,
  doctors,
  medicalRecords = [],
  activeSubTab: propActiveSubTab,
  onSubTabChange,
}: AppointmentsViewProps) {
  const { showToast } = useToast();
  const [expandedTurnoId, setExpandedTurnoId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const activeUserId = (userEmail || auth.currentUser?.email || auth.currentUser?.uid || "hernanmaximiliano10@gmail.com").toLowerCase().trim();

  // One-time static getDocs fetch for Turnos, Compromisos, Appointments, and Routines (runs ONCE on mount)
  useEffect(() => {
    const effectiveUserId = getEffectiveUserId(userEmail || auth.currentUser?.email || auth.currentUser?.uid);
    if (!effectiveUserId) return;

    // 1. Static fetch for turnos_compromisos
    getDocs(query(collection(db, "users", effectiveUserId, "turnos_compromisos")))
      .then((snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            ...d,
            id: d.id || docSnap.id,
          };
        }) as TurnoCompromiso[];
        if (setTurnosCompromisos) setTurnosCompromisos(data);
      })
      .catch((error) => {
        console.warn("[AppointmentsView] Static getDocs error (turnos_compromisos):", error);
      });

    // 2. Static fetch for appointments
    getDocs(query(collection(db, "users", effectiveUserId, "appointments")))
      .then((snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            ...d,
            id: d.id || docSnap.id,
          };
        }) as Appointment[];
        if (setAppointments) setAppointments(data);
      })
      .catch((error) => {
        console.warn("[AppointmentsView] Static getDocs error (appointments):", error);
      });

    // 3. Static fetch for routines
    getDocs(query(collection(db, "users", effectiveUserId, "routines")))
      .then((snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            ...d,
            id: d.id || docSnap.id,
          };
        }) as RoutineLog[];
        if (setRoutines) setRoutines(data);
      })
      .catch((error) => {
        console.warn("[AppointmentsView] Static getDocs error (routines):", error);
      });
  }, []);

  // Tabs: "agenda" (existing habits/streaks/agenda list) or "registro" (new Turnos y Compromisos submenu)
  const [localActiveTab, setLocalActiveTab] = useState<"agenda" | "registro">("agenda");
  const activeTab = (propActiveSubTab as "agenda" | "registro") || localActiveTab;
  const setActiveTab = (tab: "agenda" | "registro") => {
    if (onSubTabChange) onSubTabChange(tab);
    setLocalActiveTab(tab);
  };

  useEffect(() => {
    if (propActiveSubTab) {
      setLocalActiveTab(propActiveSubTab as "agenda" | "registro");
    }
  }, [propActiveSubTab]);

  // Existing states
  const [showAddApp, setShowAddApp] = useState(false);
  const [appTitle, setAppTitle] = useState("");
  const [appDate, setAppDate] = useState("");
  const [appTime, setAppTime] = useState("");
  const [appLocation, setAppLocation] = useState("");
  const [appNotes, setAppNotes] = useState("");
  const [appDoctor, setAppDoctor] = useState("");
  const [appSpecialty, setAppSpecialty] = useState("");

  const [showAddRout, setShowAddRout] = useState(false);
  const [routTitle, setRoutTitle] = useState("");
  const [routFreq, setRoutFreq] = useState<"Diario" | "Semanal">("Diario");

  // New features: Registro de Turnos y Compromisos States
  const [showAddTurnoComp, setShowAddTurnoComp] = useState(false);
  const [editingTurnoComp, setEditingTurnoComp] =
    useState<TurnoCompromiso | null>(null);

  const [tcDescripcion, setTcDescripcion] = useState("");
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("Documento Adjunto");

  useLockBodyScroll(
    Boolean(
      showAddTurnoComp ||
        editingTurnoComp ||
        showAddApp ||
        showAddRout ||
        previewFileUrl
    )
  );
  const [tcCategoria, setTcCategoria] =
    useState<TurnoCompromiso["categoria"]>("Compromisos");
  const [tcFecha, setTcFecha] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [tcLugar, setTcLugar] = useState("");
  const [tcInformacionPersonalizada, setTcInformacionPersonalizada] = useState("");
  const [tcArchivosNecesarios, setTcArchivosNecesarios] = useState<{name: string, url: string}[]>([]);
  const [tcTranscripcionAutomatica, setTcTranscripcionAutomatica] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const fileName = `Audio_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.webm`;
          setTcArchivosNecesarios(prev => [...prev, { name: fileName, url: base64data }]);

          // Transcripción automática de audio utilizando Gemini AI
          try {
            setIsTranscribing(true);
            const transcription = await GeminiService.transcribeAudio(base64data, "audio/webm");
            if (transcription) {
              setTcTranscripcionAutomatica(prev => {
                const current = prev ? prev.trim() : '';
                const newText = transcription.trim();
                if (!current) return newText;
                if (current.includes(newText)) return current;
                return `${current}\n${newText}`;
              });
            }
          } catch (e) {
            console.error("Error al transcribir automáticamente con Gemini:", e);
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';

        recognition.onresult = (event: any) => {
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            }
          }
          if (final) {
             setTcTranscripcionAutomatica(prev => {
                const current = prev ? prev.trim() + ' ' : '';
                return current + final.trim();
             });
          }
        };
        recognition.start();
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };
  const [tcDoctor, setTcDoctor] = useState("");
  const [tcEstudio, setTcEstudio] = useState<string | undefined>(undefined);
  const [tcMedicalRecordId, setTcMedicalRecordId] = useState<
    string | undefined
  >(undefined);
  const [tcPedido, setTcPedido] = useState<string | undefined>(undefined);
  const [tcLat, setTcLat] = useState<number | undefined>(undefined);
  const [tcLon, setTcLon] = useState<number | undefined>(undefined);

  // Status Filter state
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [listSearchTerm, setListSearchTerm] = useState("");

  // Places Search API Autocomplete states
  const [lugarQuery, setLugarQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const searchSeqRef = useRef(0);
  const searchDebounceRef = useRef<any>(null);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  // Request browser geolocation on mount to search places near real-time location
  // Address Book (Libro de Direcciones) State
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<AddressEntry[]>([]);

  useEffect(() => {
    setSavedAddresses(loadSavedAddressBook());
  }, [isAddressBookOpen]);

  const handleSelectFromAddressBook = (entry: AddressEntry) => {
    const titleAndAddress = entry.address ? `${entry.name} - ${entry.address}` : entry.name;
    setTcLugar(titleAndAddress);
    setLugarQuery(titleAndAddress);
    setTcLat(entry.lat);
    setTcLon(entry.lon);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.warn(
            "Could not retrieve real-time location. Will default to San Juan, Argentina coords in backend.",
            error,
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    }
  }, []);

  // Upload progress states
  const [uploadingState, setUploadingState] = useState<{
    [key: string]: boolean;
  }>({});

  // Calendar states
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(
    () => new Date(),
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    string | null
  >(() => getLocalDateString());

  const [activeDetailItem, setActiveDetailItem] = useState<{
    type: "turnoCompromiso";
    data: TurnoCompromiso;
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmModal({ title, message, onConfirm });
  };

  // Map coordinate lookup states & cache
  const [locationCoords, setLocationCoords] = useState<{
    [lugar: string]: { lat: number; lon: number };
  }>({});

  useEffect(() => {
    if (!turnosCompromisos) return;
    const uniqueLugares = Array.from(
      new Set(
        turnosCompromisos
          .map((tc) => (tc.lugar || "").trim())
          .filter(
            (l) =>
              Boolean(l) &&
              l.toLowerCase() !== "sin dirección" &&
              l.toLowerCase() !== "sin direccion" &&
              l.toLowerCase() !== "sin lugar asignado",
          ),
      ),
    );

    const missing = uniqueLugares.filter((l) => !locationCoords[l]);
    if (missing.length === 0) return;

    const newCoords = { ...locationCoords };
    let updated = false;

    missing.forEach((l) => {
      // Check if there is any item in turnosCompromisos with this place name having valid lat & lon
      const foundInTc = turnosCompromisos.find(
        (tc) =>
          (tc.lugar || "").trim() === l &&
          tc.lat !== undefined &&
          tc.lat !== null &&
          tc.lon !== undefined &&
          tc.lon !== null &&
          !isNaN(Number(tc.lat)) &&
          !isNaN(Number(tc.lon)) &&
          (Number(tc.lat) !== 0 || Number(tc.lon) !== 0),
      );
      if (foundInTc) {
        const parsedLat = parseFloat(String(foundInTc.lat));
        const parsedLon = parseFloat(String(foundInTc.lon));
        if (!isNaN(parsedLat) && !isNaN(parsedLon) && (parsedLat !== 0 || parsedLon !== 0)) {
          newCoords[l] = { lat: parsedLat, lon: parsedLon };
          updated = true;
        }
      } else {
        // Check for exact name matches in local FALLBACK_PLACES
        const matched = FALLBACK_PLACES.find((fp) => {
          const fpClean = fp.display_name.toLowerCase().trim();
          const fpFirstPart = fpClean.split(",")[0].trim();
          const lClean = l.toLowerCase().trim();
          return fpClean === lClean || fpFirstPart === lClean;
        });
        if (matched) {
          const parsedLat = parseFloat(matched.lat);
          const parsedLon = parseFloat(matched.lon);
          if (!isNaN(parsedLat) && !isNaN(parsedLon) && (parsedLat !== 0 || parsedLon !== 0)) {
            newCoords[l] = { lat: parsedLat, lon: parsedLon };
            updated = true;
          }
        }
      }
    });

    if (updated) {
      setLocationCoords(newCoords);
    }

    // Perform real background geocoding for any unmapped places
    const placesToFetch = missing.filter((l) => !newCoords[l]);
    if (placesToFetch.length > 0) {
      placesToFetch.forEach(async (placeName) => {
        try {
          const query = placeName.toLowerCase().includes("san juan")
            ? placeName
            : `${placeName}, San Juan, Argentina`;
          const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
                setLocationCoords((prev) => ({
                  ...prev,
                  [placeName]: { lat, lon },
                }));
                setTurnosCompromisos((prevList) =>
                  prevList.map((tc) =>
                    (tc.lugar || "").trim() === placeName &&
                    (tc.lat === undefined || tc.lon === undefined || (tc.lat === 0 && tc.lon === 0))
                      ? { ...tc, lat, lon }
                      : tc,
                  ),
                );
              }
            }
          }
        } catch (err) {
          console.error("Geocoding fetch error:", placeName, err);
        }
      });
    }
  }, [turnosCompromisos]);

  const validLocationsCount = useMemo(() => {
    const validPlaces = new Set<string>();
    (turnosCompromisos || []).forEach((tc) => {
      const l = (tc?.lugar || "").trim();
      if (
        !l ||
        l.toLowerCase() === "sin dirección" ||
        l.toLowerCase() === "sin direccion" ||
        l.toLowerCase() === "sin lugar asignado"
      ) {
        return;
      }
      const hasTcCoords =
        tc.lat !== undefined &&
        tc.lat !== null &&
        tc.lon !== undefined &&
        tc.lon !== null &&
        !isNaN(Number(tc.lat)) &&
        !isNaN(Number(tc.lon)) &&
        (Number(tc.lat) !== 0 || Number(tc.lon) !== 0);
      const hasLookupCoords =
        locationCoords[l] &&
        !isNaN(locationCoords[l].lat) &&
        !isNaN(locationCoords[l].lon) &&
        (locationCoords[l].lat !== 0 || locationCoords[l].lon !== 0);

      if (hasTcCoords || hasLookupCoords) {
        validPlaces.add(l);
      }
    });
    return validPlaces.size;
  }, [turnosCompromisos, locationCoords]);

  // Compute status
  const getEstadoLabel = (estatus: boolean, fecha: string) => {
    if (estatus) return "Realizado";
    const todayStr = getLocalDateString();
    const datePortion = fecha ? fecha.substring(0, 10) : "";
    if (datePortion && datePortion.length === 10 && datePortion < todayStr) return "Realizado";
    if (fecha === todayStr || datePortion === todayStr) return "Initinere Diario";
    return "Pendiente";
  };

  // Search Places using Google Maps backend search engine
  const handlePlacesSearch = async (query: string) => {
    setLugarQuery(query);
    setTcLugar(query);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!query || query.trim().length === 0) {
      setTcLat(undefined);
      setTcLon(undefined);
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchingPlaces(false);
      return;
    }

    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchingPlaces(false);
      return;
    }

    setShowSuggestions(true);
    setSearchingPlaces(true);

    searchSeqRef.current++;
    const currentSeq = searchSeqRef.current;

    searchDebounceRef.current = setTimeout(async () => {
      try {
        let url = `/api/places/search?q=${encodeURIComponent(query.trim())}`;
        if (userCoords) {
          url += `&lat=${userCoords.lat}&lon=${userCoords.lon}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (currentSeq === searchSeqRef.current) {
            setSuggestions(
              data.map((item: any) => ({
                title: item.title || item.display_name?.split("-")[0]?.trim() || item.name,
                address: item.address || item.display_name?.split("-")?.slice(1)?.join("-")?.trim() || "",
                name: item.display_name || item.name,
                lat: item.lat,
                lon: item.lon,
              })),
            );
          }
        }
      } catch (err) {
        console.error("Places search error:", err);
      } finally {
        if (currentSeq === searchSeqRef.current) {
          setSearchingPlaces(false);
        }
      }
    }, 250);
  };

  // Google Drive Upload Handler
  const handleFileUpload = async (
    id: string,
    field: "estudioInformeDoc" | "pedidoDocumento",
    file: File,
  ) => {
    const uploadKey = `${id}-${field}`;
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }));

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      if (token) {
        const result = await WorkspaceService.uploadFileToDrive(
          file.name,
          file.type || "application/octet-stream",
          base64Data,
          token,
        );

        if (result.success && result.webViewLink) {
          setTurnosCompromisos((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, [field]: result.webViewLink } : item,
            ),
          );
          alert(`¡Archivo "${file.name}" subido a tu Google Drive con éxito!`);
        } else {
          alert(
            "Error al subir a Google Drive: " + (result.error || "Desconocido"),
          );
        }
      } else {
        // Fallback local storage base64 representation
        setTurnosCompromisos((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, [field]: base64Data } : item,
          ),
        );
        alert(
          `¡Archivo "${file.name}" guardado localmente! (Inicia sesión con Google para guardarlo en Drive).`,
        );
      }
    } catch (err: any) {
      console.error("Upload failed", err);
      alert("Error al subir el archivo: " + err.message);
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }));
    }
  };

  // Google Drive Upload Handler inside the creation/edition Modal
  const handleModalFileUpload = async (
    field: "estudioInformeDoc" | "pedidoDocumento",
    file: File,
  ) => {
    const uploadKey = `modal-${field}`;
    setUploadingState((prev) => ({ ...prev, [uploadKey]: true }));

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      if (token) {
        const result = await WorkspaceService.uploadFileToDrive(
          file.name,
          file.type || "application/octet-stream",
          base64Data,
          token,
        );

        if (result.success && result.webViewLink) {
          if (field === "pedidoDocumento") {
            setTcPedido(result.webViewLink);
          } else {
            setTcEstudio(result.webViewLink);
          }
          alert(`¡Archivo "${file.name}" subido a tu Google Drive con éxito!`);
        } else {
          alert(
            "Error al subir a Google Drive: " + (result.error || "Desconocido"),
          );
        }
      } else {
        // Fallback local storage base64 representation
        if (field === "pedidoDocumento") {
          setTcPedido(base64Data);
        } else {
          setTcEstudio(base64Data);
        }
        alert(
          `¡Archivo "${file.name}" guardado localmente! (Inicia sesión con Google para guardarlo en Drive).`,
        );
      }
    } catch (err: any) {
      console.error("Upload failed", err);
      alert("Error al subir el archivo: " + err.message);
    } finally {
      setUploadingState((prev) => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleOpenNewTurnoCompModal = () => {
    searchSeqRef.current++;
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchingPlaces(false);
    setEditingTurnoComp(null);
    setTcDescripcion("");
    setTcCategoria("Compromisos");
    setTcLugar("");
    setLugarQuery("");
    setTcInformacionPersonalizada("");
    setTcArchivosNecesarios([]);
    setTcTranscripcionAutomatica("");
    setTcDoctor("");
    setTcEstudio(undefined);
    setTcMedicalRecordId(undefined);
    setTcPedido(undefined);
    setTcLat(undefined);
    setTcLon(undefined);
    if (selectedCalendarDate) {
      setTcFecha(selectedCalendarDate);
    } else {
      setTcFecha(new Date().toISOString().split("T")[0]);
    }
    setShowAddTurnoComp(true);
  };

  const handleEditTurnoCompromiso = (tc: TurnoCompromiso) => {
    searchSeqRef.current++;
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchingPlaces(false);
    setEditingTurnoComp(tc);
    setTcDescripcion(tc.descripcion);
    setTcCategoria(tc.categoria);
    setTcFecha(tc.fecha);

    const rawLugar = (tc.lugar || "").trim();
    const cleanLugar =
      rawLugar.toLowerCase() === "sin dirección" ||
      rawLugar.toLowerCase() === "sin direccion" ||
      rawLugar.toLowerCase() === "sin lugar asignado"
        ? ""
        : rawLugar;

    setTcLugar(cleanLugar);
    setLugarQuery(cleanLugar);
    setTcInformacionPersonalizada(tc.informacionPersonalizada || "");
    setTcArchivosNecesarios(tc.archivosNecesarios || []);
    setTcTranscripcionAutomatica(tc.transcripcionAutomatica || "");
    setTcDoctor(tc.doctor || "");
    setTcEstudio(tc.estudioInformeDoc);
    setTcMedicalRecordId(
      tc.medicalRecordId ||
        medicalRecords.find(
          (r) => r.fileData && r.fileData === tc.estudioInformeDoc,
        )?.id ||
        undefined,
    );
    setTcPedido(tc.pedidoDocumento);

    const hasValidCoords =
      Boolean(cleanLugar) &&
      tc.lat !== undefined &&
      tc.lat !== null &&
      tc.lon !== undefined &&
      tc.lon !== null &&
      !isNaN(Number(tc.lat)) &&
      !isNaN(Number(tc.lon)) &&
      (Number(tc.lat) !== 0 || Number(tc.lon) !== 0);

    setTcLat(hasValidCoords ? Number(tc.lat) : undefined);
    setTcLon(hasValidCoords ? Number(tc.lon) : undefined);
    setShowAddTurnoComp(true);
  };

  const handleCloseTurnoCompModal = () => {
    searchSeqRef.current++;
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchingPlaces(false);
    setShowAddTurnoComp(false);
    setEditingTurnoComp(null);
    setTcDescripcion("");
    setTcCategoria("Compromisos");
    setTcFecha(new Date().toISOString().split("T")[0]);
    setTcLugar("");
    setLugarQuery("");
    setTcInformacionPersonalizada("");
    setTcArchivosNecesarios([]);
    setTcTranscripcionAutomatica("");
    setTcDoctor("");
    setTcEstudio(undefined);
    setTcMedicalRecordId(undefined);
    setTcPedido(undefined);
    setTcLat(undefined);
    setTcLon(undefined);
  };

  // Form submission for new or edited Turno/Compromiso
  const handleAddTurnoCompromiso = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log("=== INICIO DE GUARDADO ===");
    console.log("PASO 1: Botón presionado, activando isSaving...");
    setModalError(null);
    setIsSaving(true);

    try {
      console.log("PASO 2: Procesando datos del formulario (Mapa, Audio, Fechas)...");

      // Manual validation to avoid HTML5 silent submit blocks
      if (!tcDescripcion || !tcDescripcion.trim()) {
        alert("Por favor, ingresa una descripción para el turno o compromiso.");
        return;
      }

      if (!tcFecha) {
        alert("Por favor, selecciona una fecha y hora para el turno o compromiso.");
        return;
      }

      if (!activeUserId) {
        alert("Error: Usuario no identificado.");
        return;
      }

      let finalLat = tcLat;
      let finalLon = tcLon;

      const rawLugarInput = (tcLugar || lugarQuery || "").trim();
      const isWithoutAddress =
        !rawLugarInput ||
        rawLugarInput.toLowerCase() === "sin dirección" ||
        rawLugarInput.toLowerCase() === "sin direccion" ||
        rawLugarInput.toLowerCase() === "sin lugar asignado";

      const placeToGeocode = isWithoutAddress ? "" : rawLugarInput;

      if (isWithoutAddress) {
        finalLat = undefined;
        finalLon = undefined;
      } else if (
        (finalLat === undefined || finalLon === undefined || (finalLat === 0 && finalLon === 0)) &&
        placeToGeocode
      ) {
        try {
          console.log("PASO 2.1: Geocodificando dirección:", placeToGeocode);
          const query = placeToGeocode.toLowerCase().includes("san juan")
            ? placeToGeocode
            : `${placeToGeocode}, San Juan, Argentina`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(
            `/api/places/search?q=${encodeURIComponent(query)}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (
              Array.isArray(data) &&
              data.length > 0 &&
              data[0].lat &&
              data[0].lon
            ) {
              const parsedLat = parseFloat(data[0].lat);
              const parsedLon = parseFloat(data[0].lon);
              if (!isNaN(parsedLat) && !isNaN(parsedLon) && (parsedLat !== 0 || parsedLon !== 0)) {
                finalLat = parsedLat;
                finalLon = parsedLon;
              }
            }
          }
        } catch (err) {
          console.warn("Could not geocode place on submit:", err);
        }
      }

      const hasValidFinalCoords =
        !isWithoutAddress &&
        typeof finalLat === "number" &&
        !isNaN(finalLat) &&
        typeof finalLon === "number" &&
        !isNaN(finalLon) &&
        (finalLat !== 0 || finalLon !== 0);

      // Sanitizar datos (Sin undefined)
      const rawPayload = {
        id: editingTurnoComp ? editingTurnoComp.id : generateUniqueId("tc"),
        estatus: editingTurnoComp ? Boolean(editingTurnoComp.estatus) : false,
        descripcion: String(tcDescripcion || "").trim(),
        categoria: String(tcCategoria || "Compromisos"),
        fecha: String(tcFecha || ""),
        lugar: placeToGeocode,
        doctor: String(tcDoctor || "").trim(),
        estudioInformeDoc: String(tcEstudio || ""),
        pedidoDocumento: String(tcPedido || ""),
        lat: hasValidFinalCoords ? finalLat : null,
        lon: hasValidFinalCoords ? finalLon : null,
        medicalRecordId: String(tcMedicalRecordId || ""),
        informacionPersonalizada: String(tcInformacionPersonalizada || ""),
        archivosNecesarios: Array.isArray(tcArchivosNecesarios) ? tcArchivosNecesarios : [],
        transcripcionAutomatica: String(tcTranscripcionAutomatica || ""),
      };

      const payload = sanitizeForFirestore(rawPayload);

      console.log("PASO 3: Datos listos. Guardando en Firestore nativo...", payload);

      // Guardado directo nativo (sin limitadores de timeout)
      await saveItemToFirestore(activeUserId, "turnos_compromisos", payload);

      console.log("PASO 4: Guardado exitoso en la nube. Cerrando modal...");

      if (editingTurnoComp) {
        setTurnosCompromisos((prev) =>
          prev.map((item) => (item.id === editingTurnoComp.id ? payload : item)),
        );
        showToast("Turno/Compromiso actualizado con éxito", "success");
      } else {
        setTurnosCompromisos((prev) => {
          const index = prev.findIndex((item) => String(item.id) === String(payload.id));
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = payload;
            return updated;
          }
          return [...prev, payload];
        });
        showToast("Turno/Compromiso guardado con éxito", "success");

        // Auto-create the matching Google Calendar event.
        (async () => {
          try {
            if (!token) {
              const { silentGoogleReauth } = await import("../lib/supabase");
              await silentGoogleReauth(); // will redirect back here; user can just save again
              return;
            }
            const { WorkspaceService } = await import("../lib/workspace");
            const dateStr = String(payload.fecha || "").split("T")[0];
            if (!dateStr) return;
            const result = await WorkspaceService.syncCalendarEvents(
              [
                {
                  id: `tc-${payload.id}`,
                  title: `Compromiso: ${payload.descripcion}`,
                  description: `Categoría: ${payload.categoria || "General"}\nProfesional/Contacto: ${payload.doctor || "No especificado"}`,
                  location: payload.lugar || "",
                  date: dateStr,
                },
              ],
              token,
            );
            const googleEventId = result.eventIds?.[`tc-${payload.id}`];
            if (googleEventId) {
              const withCalendarId = { ...payload, googleCalendarEventId: googleEventId };
              await saveItemToFirestore(activeUserId, "turnos_compromisos", withCalendarId);
              setTurnosCompromisos((prev) =>
                prev.map((item) => (item.id === payload.id ? withCalendarId : item)),
              );
            }
          } catch (err) {
            console.error("Error creando evento en Google Calendar:", err);
          }
        })();
      }

      if (hasValidFinalCoords && placeToGeocode) {
        setLocationCoords((prev) => ({
          ...prev,
          [placeToGeocode]: { lat: finalLat!, lon: finalLon! },
        }));
      }

      handleCloseTurnoCompModal();
    } catch (error: any) {
      console.error("ERROR CRÍTICO CAPTURADO:", error);
      const msg = error?.message || String(error) || "Error al guardar el turno.";
      setModalError(msg);
      showToast(msg, "error");
      alert("Error al guardar: " + msg);
    } finally {
      console.log("PASO 5: Ejecutando finally. Liberando el botón...");
      setIsSaving(false);
      console.log("=== FIN DE GUARDADO ===");
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);


  const handleDeleteTurnoCompromiso = (id: string) => {
    if (!id) {
      alert("Error: ID de elemento no válido");
      return;
    }
    if (!activeUserId) {
      alert("Error: Usuario no identificado");
      return;
    }
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        try {
          const itemToDelete = turnosCompromisos.find((item) => item.id === id);
          await deleteItemFromFirestore(activeUserId, "turnos_compromisos", id);
          setTurnosCompromisos((prev) => prev.filter((item) => item.id !== id));
          showToast("Registro eliminado con éxito", "success");

          if (itemToDelete?.googleCalendarEventId && token) {
            const { WorkspaceService } = await import("../lib/workspace");
            WorkspaceService.deleteCalendarEvent(itemToDelete.googleCalendarEventId, token).catch((err) => {
              console.error("Error borrando evento de Google Calendar:", err);
            });
          }
        } catch (err: any) {
          alert("Error de Firebase: " + (err?.message || err));
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  // Existing methods
  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      console.log('1. Iniciando guardado, userId:', activeUserId);
      if (!appTitle || !appTitle.trim()) {
        throw new Error("Por favor, ingresa el título de la cita médica.");
      }
      if (!appDate) {
        throw new Error("Por favor, selecciona una fecha para la cita médica.");
      }
      if (!activeUserId) {
        throw new Error("Usuario no identificado");
      }

      const rawApp = {
        id: generateUniqueId("app"),
        title: String(appTitle || "").trim(),
        date: String(appDate || ""),
        time: String(appTime || "00:00"),
        location: String(appLocation || ""),
        notes: String(appNotes || ""),
        doctorName: String(appDoctor || ""),
        specialty: String(appSpecialty || ""),
      };

      const nApp = sanitizeForFirestore(rawApp);

      console.log("Datos listos para subir:", nApp);
      await saveItemToFirestore(activeUserId, "appointments", nApp);
      setAppointments((prev) => {
        const index = prev.findIndex((item) => String(item.id) === String(nApp.id));
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = nApp;
          return updated;
        }
        return [...prev, nApp];
      });
      setAppTitle("");
      setAppDate("");
      setAppTime("");
      setAppLocation("");
      setAppNotes("");
      setAppDoctor("");
      setAppSpecialty("");
      setShowAddApp(false);
      showToast("Cita médica guardada con éxito", "success");
    } catch (err: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', err);
      const msg = err?.message || String(err) || "Error al guardar la cita médica.";
      setModalError(msg);
      showToast(msg, "error");
      alert("Error al guardar: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAppointment = (id: string) => {
    if (!id) {
      alert("Error: ID de elemento no válido");
      return;
    }
    if (!activeUserId) {
      alert("Error: Usuario no identificado");
      return;
    }
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar esta cita médica?",
      async () => {
        setIsDeleting(true);
        try {
          await deleteItemFromFirestore(activeUserId, "appointments", id);
          setAppointments((prev) => prev.filter((a) => a.id !== id));
          showToast("Cita médica eliminada con éxito", "success");
        } catch (err: any) {
          alert("Error de Firebase: " + (err?.message || err));
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const handleAddRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      console.log('1. Iniciando guardado, userId:', activeUserId);
      if (!routTitle || !routTitle.trim()) {
        throw new Error("Por favor, ingresa el título de la rutina.");
      }
      if (!activeUserId) {
        throw new Error("Usuario no identificado");
      }

      const rawRout = {
        id: generateUniqueId("rout"),
        title: String(routTitle || "").trim(),
        frequency: String(routFreq || "Diario"),
        completedDates: [],
        streak: 0,
      };

      const nRout = sanitizeForFirestore(rawRout);

      console.log("Datos listos para subir:", nRout);
      await saveItemToFirestore(activeUserId, "routines", nRout);
      setRoutines((prev) => {
        const index = prev.findIndex((item) => String(item.id) === String(nRout.id));
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = nRout;
          return updated;
        }
        return [...prev, nRout];
      });
      setRoutTitle("");
      setShowAddRout(false);
      showToast("Rutina guardada con éxito", "success");
    } catch (err: any) {
      console.error('3. ERROR CRÍTICO AL GUARDAR:', err);
      const msg = err?.message || String(err) || "Error al guardar la rutina.";
      setModalError(msg);
      showToast(msg, "error");
      alert("Error al guardar: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoutine = (id: string) => {
    if (!id) {
      alert("Error: ID de elemento no válido");
      return;
    }
    if (!activeUserId) {
      alert("Error: Usuario no identificado");
      return;
    }
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar esta rutina?",
      async () => {
        setIsDeleting(true);
        try {
          await deleteItemFromFirestore(activeUserId, "routines", id);
          setRoutines((prev) => prev.filter((r) => r.id !== id));
          showToast("Rutina eliminada con éxito", "success");
        } catch (err: any) {
          alert("Error de Firebase: " + (err?.message || err));
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const handleToggleRoutineToday = (id: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    setRoutines(
      routines.map((r) => {
        if (r.id === id) {
          const completed = r.completedDates.includes(todayStr);
          let newDates = [...r.completedDates];
          let newStreak = r.streak;

          if (completed) {
            newDates = newDates.filter((d) => d !== todayStr);
            newStreak = Math.max(0, newStreak - 1);
          } else {
            newDates.push(todayStr);
            newStreak += 1;
          }

          return {
            ...r,
            completedDates: newDates,
            streak: newStreak,
          };
        }
        return r;
      }),
    );
  };

  // Doctor list items for select options
  const doctorOptions = [
    ...doctors.map((d) => ({
      value: d.name,
      label: d.specialty ? `${d.name} (${d.specialty})` : d.name,
    })),
  ].filter((v, i, self) => self.findIndex((t) => t.value === v.value) === i); // Deduplicate

  const categoryOptions = [
    { value: "Compromisos", label: "Compromisos" },
    { value: "Turno - Hernan", label: "Turno - Hernan" },
    { value: "Turno - Modesto", label: "Turno - Modesto" },
    { value: "Tramites", label: "Trámites" },
    { value: "Medicacion", label: "Medicación" },
    { value: "Ocio", label: "Ocio" },
  ];

  // Deduplicated and sorted Turnos & Compromisos
  const uniqueTurnosCompromisos = useMemo(() => {
    const seen = new Set<string>();
    return (turnosCompromisos || []).filter((item) => {
      if (!item) return false;
      const key = String(item.id || `${item.descripcion}_${item.fecha}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [turnosCompromisos]);

  const sortedTurnosCompromisos = useMemo(() => {
    return [...uniqueTurnosCompromisos].sort((a, b) => {
      return (a.fecha || "").localeCompare(b.fecha || "");
    });
  }, [uniqueTurnosCompromisos]);

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const getHoraFromFecha = (fecha: string) => {
    if (!fecha) return "";
    if (fecha.includes("T")) {
      return fecha.split("T")[1];
    }
    const parts = fecha.split(" ");
    if (parts.length >= 2) {
      return parts[1].replace("hs", "").trim();
    }
    return "";
  };

  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return "";
    let cleanDateStr = dateStr;
    let timeStr = "";

    if (dateStr.includes("T")) {
      const parts = dateStr.split("T");
      cleanDateStr = parts[0];
      timeStr = parts[1];
    } else if (dateStr.includes(" ")) {
      const parts = dateStr.split(" ");
      cleanDateStr = parts[0];
      timeStr = parts.slice(1).join(" ");
    }

    const parts = cleanDateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const dateObj = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    );
    const dayOfWeekNames = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const dayOfWeek = dayOfWeekNames[dateObj.getDay()];
    const dayNum = parts[2];
    const monthName = monthNames[dateObj.getMonth()];
    const yearNum = parts[0];
    
    let result = `${dayOfWeek}, ${dayNum} de ${monthName} de ${yearNum}`;
    if (timeStr) {
      const cleanTime = timeStr.replace("hs", "").trim();
      result += ` - ${cleanTime} hs`;
    }
    return result;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    return days;
  };

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6">
      {!propActiveSubTab && (
        <SubNav
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
          className="mb-6"
          tabs={[
            { id: "agenda", label: "Mi Agenda", icon: Calendar },
            {
              id: "registro",
              label: "Agenda de Turnos",
              icon: Stethoscope,
            },
          ]}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {activeTab === "agenda" ? (
        <div className="space-y-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Calendar Card */}
            <div
              className={`p-6 rounded-3xl border flex flex-col lg:col-span-5 justify-between app-calendar-container ${
                darkMode ? "bg-black/85 backdrop-blur-md border-zinc-800 text-white shadow-lg"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-extrabold text-sm flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary animate-pulse" />
                    <span>Calendario de Turnos</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const newCal = new Date(currentCalendarDate);
                        newCal.setMonth(newCal.getMonth() - 1);
                        setCurrentCalendarDate(newCal);
                      }}
                      className="p-1.5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-primary cursor-pointer transition-colors"
                      title="Mes Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const newCal = new Date(currentCalendarDate);
                        newCal.setMonth(newCal.getMonth() + 1);
                        setCurrentCalendarDate(newCal);
                      }}
                      className="p-1.5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-primary cursor-pointer transition-colors"
                      title="Mes Siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-center font-extrabold text-xs mb-4 text-slate-800 dark:text-zinc-200 uppercase tracking-widest bg-slate-50 dark:bg-black/40 py-2 rounded-xl">
                  {monthNames[currentCalendarDate.getMonth()]}{" "}
                  {currentCalendarDate.getFullYear()}
                </div>

                <div className={`p-4 rounded-3xl ${darkMode ? "bg-zinc-950 shadow-sm" : "bg-white shadow-sm border border-slate-100"}`}>
{/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                  {weekDays.map((wd) => (
                    <div key={wd} className="py-1">
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentCalendarDate).map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="p-1" />;
                    }

                    const dateStr = `${currentCalendarDate.getFullYear()}-${String(
                      currentCalendarDate.getMonth() + 1,
                    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                    const count = uniqueTurnosCompromisos.filter(
                      (tc) => tc.fecha === dateStr || tc.fecha.startsWith(dateStr),
                    ).length;
                    const isSelected = selectedCalendarDate === dateStr;
                    const isToday = getLocalDateString() === dateStr;

                    return (
                      <button
                        key={`day-${day}`}
                        onClick={() => {
                          setSelectedCalendarDate(
                            selectedCalendarDate === dateStr ? null : dateStr,
                          );
                        }}
                        className={`p-1.5 rounded-full flex flex-col items-center justify-center relative cursor-pointer transition-all h-9 w-full font-bold text-xs ${
                          isSelected
                            ? "border-2 border-primary text-primary dark:text-primary bg-primary/10 scale-105 shadow-sm"
                            : isToday
                              ? "bg-primary text-white dark:text-blue-950 shadow-md font-bold"
                              : "hover:bg-primary/10 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        <span>{day}</span>
                        {count > 0 && (
                          <span
                            className={`absolute bottom-1 w-1 h-1 rounded-full ${
                              isSelected
                                ? "bg-primary"
                                : "bg-primary animate-pulse"
                            }`}
                            title={`${count} turno(s)`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
</div>

              {/* Calendar Footer Info */}
              <div className="mt-5 pt-3.5 border-t border-zinc-800/10 dark:border-zinc-800/40 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Fechas con turnos</span>
                </span>
                <button
                  onClick={() => {
                    setCurrentCalendarDate(new Date());
                    setSelectedCalendarDate(null);
                  }}
                  className="text-primary hover:underline cursor-pointer font-bold"
                >
                  Ir a Hoy
                </button>
              </div>
            </div>

            {/* Right Column: Agenda List Card */}
            <div
              className={`p-6 rounded-3xl border flex flex-col lg:col-span-7 justify-between ${
                darkMode ? "bg-black/85 backdrop-blur-md border-zinc-800 text-white shadow-lg"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
              }`}
            >
              <div>
                <div className="flex flex-col gap-4 mb-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <h3 className="font-extrabold text-sm">
                        Agenda de Turnos y Compromisos
                      </h3>
                    </div>
                    <div className="flex shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={handleOpenNewTurnoCompModal}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Cargar Nuevo Turno / Compromiso</span>
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Selected Date Header & Filter Pills Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2.5 px-4 bg-slate-50 dark:bg-black/40 border border-slate-150 dark:border-zinc-800/50 rounded-2xl mb-4 mt-3">
                  <div>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                      Día Seleccionado
                    </p>
                    <p className="text-xs md:text-sm font-extrabold text-black dark:text-zinc-200 mt-0.5">
                      {formatDateFriendly(selectedCalendarDate || getLocalDateString())}
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <PillFilterBar
                    options={[
                      { id: "Todos", label: "Todos" },
                      { id: "Initinere Diario", label: "Initinere" },
                      { id: "Pendiente", label: "Pendientes" },
                      { id: "Realizado", label: "Realizados" },
                    ]}
                    activeValue={statusFilter}
                    onChange={setStatusFilter}
                    layoutIdPrefix="appointmentsStatusFilter"
                    className="self-start sm:self-auto"
                    resetButton={
                      selectedCalendarDate ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCalendarDate(null)}
                          className="px-2 py-1 text-[10px] text-primary font-bold hover:underline cursor-pointer ml-1 whitespace-nowrap shrink-0"
                          title="Ver todos los días"
                        >
                          Ver Todas
                        </button>
                      ) : null
                    }
                  />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={statusFilter}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3 max-h-[380px] overflow-y-auto pr-1"
                  >
                  {sortedTurnosCompromisos.filter((tc) => {
                    const matchesDate =
                      !selectedCalendarDate ||
                      tc.fecha === selectedCalendarDate ||
                      tc.fecha.startsWith(selectedCalendarDate);
                    const estado = getEstadoLabel(tc.estatus, tc.fecha);
                    const matchesStatus =
                      statusFilter === "Todos" ||
                      (statusFilter === "Pendiente"
                        ? estado === "Pendiente" || estado === "Initinere Diario"
                        : estado === statusFilter);
                    
                        const matchesSearch = !listSearchTerm ||
                          tc.descripcion.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                          tc.lugar.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                          (tc.doctor && tc.doctor.toLowerCase().includes(listSearchTerm.toLowerCase()));
                        return matchesDate && matchesStatus && matchesSearch;
                  }).length === 0 ? (
                    <p className="text-zinc-500 text-xs text-center py-10 col-span-full italic">
                      No tienes turnos o compromisos programados{" "}
                      {selectedCalendarDate ? "para este día" : ""}{" "}
                      {statusFilter !== "Todos"
                        ? `con estado "${statusFilter}"`
                        : ""}
                      .
                    </p>
                  ) : (
                    sortedTurnosCompromisos
                      .filter((tc) => {
                        const matchesDate =
                          !selectedCalendarDate ||
                          tc.fecha === selectedCalendarDate ||
                          tc.fecha.startsWith(selectedCalendarDate);
                        const estado = getEstadoLabel(tc.estatus, tc.fecha);
                        const matchesStatus =
                          statusFilter === "Todos" ||
                          (statusFilter === "Pendiente"
                            ? estado === "Pendiente" || estado === "Initinere Diario"
                            : estado === statusFilter);
                        
                        const matchesSearch = !listSearchTerm ||
                          tc.descripcion.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                          tc.lugar.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                          (tc.doctor && tc.doctor.toLowerCase().includes(listSearchTerm.toLowerCase()));
                        return matchesDate && matchesStatus && matchesSearch;
                      })
                      .map((tc, idx) => {
                        const estado = getEstadoLabel(tc.estatus, tc.fecha);
                        const isExpanded = expandedTurnoId === tc.id;
                        return (
                          <div
                            key={`tc-${tc.id}-${idx}`}
                            onClick={() =>
                              setExpandedTurnoId(isExpanded ? null : tc.id)
                            }
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative cursor-pointer group hover:border-primary hover:ring-2 hover:ring-primary/10 duration-200 ${
                              isExpanded
                                ? "border-primary/50 bg-white dark:bg-black/85 backdrop-blur-md shadow-md ring-1 ring-primary/20"
                                : tc.estatus
                                  ? "border border-primary bg-white dark:bg-black hover:bg-zinc-50 dark:hover:bg-zinc-950 shadow-xs"
                                  : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            }`}
                            title="Haga clic para ver toda la información desplegada"
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {/* Left Category Icon */}
                              <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                                {(() => {
                                  const CatIcon = getTurnoCategoryIcon(tc.categoria);
                                  return <CatIcon className="w-4 h-4" />;
                                })()}
                              </div>

                              <div className="min-w-0 flex-1 space-y-1.5">
                                {/* Top Line: Category & Badges & Actions */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {(() => {
                                      const CatIcon = getTurnoCategoryIcon(tc.categoria);
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                          <CatIcon className="w-3 h-3 shrink-0" />
                                          <span>{tc.categoria}</span>
                                        </span>
                                      );
                                    })()}
                                    {tc.estatus && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                        Realizado
                                      </span>
                                    )}
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  </div>

                                  <div
                                    className="flex items-center gap-1 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() =>
                                        handleEditTurnoCompromiso(tc)
                                      }
                                      className="p-1 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                      title="Editar"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteTurnoCompromiso(tc.id)
                                      }
                                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Description & Checkbox */}
                                {(() => {
                                  const CatIcon = getTurnoCategoryIcon(tc.categoria);
                                  const matchLogos = getMatchTeamLogos(tc);
                                  if (matchLogos && (matchLogos.homeLogo || matchLogos.awayLogo)) {
                                    return (
                                      <div className="flex items-center gap-2.5 my-2 py-1.5 w-full justify-start flex-wrap">
                                        {/* Home Team */}
                                        <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-800/40 shrink-0">
                                          {matchLogos.homeLogo ? (
                                            <img
                                              src={matchLogos.homeLogo}
                                              alt={matchLogos.homeTeam || "Home"}
                                              className="w-4 h-4 object-contain shrink-0"
                                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                                            />
                                          ) : (
                                            <Shield className="w-4 h-4 text-zinc-400 shrink-0" />
                                          )}
                                          <span className={`text-[10px] font-bold truncate max-w-[85px] leading-tight ${tc.estatus ? "line-through text-zinc-400" : "text-zinc-900 dark:text-white"}`} style={{ color: tc.estatus ? undefined : (darkMode ? undefined : '#000000') }}>
                                            {matchLogos.homeTeam || "Local"}
                                          </span>
                                        </div>

                                        {/* VS */}
                                        <span className="text-[9px] font-black text-primary px-0.5 shrink-0 select-none">VS</span>

                                        {/* Away Team */}
                                        <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-800/40 shrink-0">
                                          {matchLogos.awayLogo ? (
                                            <img
                                              src={matchLogos.awayLogo}
                                              alt={matchLogos.awayTeam || "Away"}
                                              className="w-4 h-4 object-contain shrink-0"
                                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                                            />
                                          ) : (
                                            <Shield className="w-4 h-4 text-zinc-400 shrink-0" />
                                          )}
                                          <span className={`text-[10px] font-bold truncate max-w-[85px] leading-tight ${tc.estatus ? "line-through text-zinc-400" : "text-zinc-900 dark:text-white"}`} style={{ color: tc.estatus ? undefined : (darkMode ? undefined : '#000000') }}>
                                            {matchLogos.awayTeam || "Visitante"}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex items-center gap-2 mt-1.5 min-w-0">
                                      <div
                                        className="shrink-0 flex items-center justify-center"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={tc.estatus}
                                          onChange={(e) => {
                                            const newChecked = e.target.checked;
                                            setTurnosCompromisos((prev) => {
                                              const updated = prev.map((item) =>
                                                item.id === tc.id
                                                  ? {
                                                      ...item,
                                                      estatus: newChecked,
                                                      updatedAt: Date.now(),
                                                    }
                                                  : item,
                                              );
                                              StorageService.setTurnosCompromisos(updated);
                                              return updated;
                                            });
                                          }}
                                          className="w-4 h-4 accent-primary rounded cursor-pointer block m-0"
                                        />
                                      </div>
                                      <h4
                                        className={`font-extrabold text-xs leading-none truncate flex items-center gap-1.5 ${tc.estatus ? "line-through text-zinc-400 dark:text-zinc-500" : "text-black dark:text-white"}`}
                                        style={{ color: tc.estatus ? undefined : (darkMode ? undefined : '#000000') }}
                                      >
                                        <CatIcon className="w-3.5 h-3.5 text-primary shrink-0 self-center" />
                                        <span className="self-center translate-y-[0.5px] truncate">{tc.descripcion.replace(/⚽\s*/g, "")}</span>
                                      </h4>
                                    </div>
                                  );
                                })()}

                                {/* Location & Details */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400 mt-1.5 font-medium">
                                  {tc.fecha && (
                                    <span className="flex items-center gap-1 text-zinc-400 font-bold">
                                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <span>{formatDateFriendly(tc.fecha)}</span>
                                    </span>
                                  )}
                                  {tc.lugar &&
                                    tc.lugar.trim() &&
                                    tc.lugar.toLowerCase() !== "sin dirección" &&
                                    tc.lugar.toLowerCase() !== "sin direccion" &&
                                    tc.lugar.toLowerCase() !== "sin lugar asignado" && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                                      <span
                                        className="truncate max-w-[200px]"
                                        title={tc.lugar}
                                      >
                                        {tc.lugar}
                                      </span>
                                      <a
                                        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(tc.lugar)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-0.5 text-primary hover:text-primary bg-primary/10 rounded transition-all shrink-0 ml-0.5"
                                        title="Abrir ubicación en OpenStreetMap"
                                      >
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </span>
                                  )}
                                  {tc.doctor && (
                                    <span className="flex items-center gap-1 font-bold text-primary dark:text-primary">
                                      <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                                      <span>{tc.doctor}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                              {/* Expanded Detailed View */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="pt-2 border-t border-primary/20 space-y-2 mt-2 text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                        <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                          Fecha y Hora
                                        </span>
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                          {formatDateFriendly(tc.fecha)}
                                        </span>
                                      </div>

                                      <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                        <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                          Lugar / Ubicación
                                        </span>
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                          {tc.lugar &&
                                          tc.lugar.trim() &&
                                          tc.lugar.toLowerCase() !== "sin dirección" &&
                                          tc.lugar.toLowerCase() !== "sin direccion" &&
                                          tc.lugar.toLowerCase() !== "sin lugar asignado"
                                            ? tc.lugar
                                            : "Sin lugar asignado"}
                                        </span>
                                      </div>

                                      <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                        <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                          Profesional / Asignado
                                        </span>
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                          {tc.doctor || "Sin profesional asignado"}
                                        </span>
                                      </div>

                                      <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                        <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                          Categoría y Estatus
                                        </span>
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                          {tc.categoria} • {estado}
                                        </span>
                                      </div>
                                    </div>

                                    {tc.informacionPersonalizada && (
                                      <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                        <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider mb-1">
                                          Información Personalizada
                                        </span>
                                        <div
                                          className="text-zinc-700 dark:text-zinc-300 italic text-[11px] prose dark:prose-invert prose-sm max-h-[120px] overflow-y-auto"
                                          dangerouslySetInnerHTML={{ __html: tc.informacionPersonalizada }}
                                        />
                                      </div>
                                    )}

                                    {tc.transcripcionAutomatica && (
                                      <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                        <span className="flex items-center gap-1 text-[9px] font-extrabold text-green-500 uppercase tracking-wider mb-1">
                                          <AudioLines className="w-3 h-3" /> Transcripción de Audio
                                        </span>
                                        {(() => {
                                          const audioFile = tc.archivosNecesarios?.find(a => a.name.startsWith('Audio_') && a.url.startsWith('data:audio/'));
                                          if (audioFile) {
                                            return <AudioTranscriptionPlayer audioUrl={audioFile.url} transcript={tc.transcripcionAutomatica} />;
                                          }
                                          return (
                                            <div className="text-zinc-700 dark:text-zinc-300 italic text-[11px] max-h-[100px] overflow-y-auto">
                                              {tc.transcripcionAutomatica}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>

                            {/* Attached Files Section if any */}
                            {(tc.pedidoDocumento || tc.estudioInformeDoc || (tc.archivosNecesarios && tc.archivosNecesarios.length > 0)) && (
                              <div
                                className="mt-3 pt-2.5 border-t border-zinc-800/10 dark:border-zinc-800/40 flex flex-wrap gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {tc.pedidoDocumento && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(tc.pedidoDocumento || null); setPreviewFileName("Pedido / Documento"); }}
                                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline"
                                  >
                                    <FileDown className="w-3 h-3" />
                                    <span>Ver Pedido</span>
                                  </button>
                                )}
                                {tc.estudioInformeDoc && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(tc.estudioInformeDoc || null); setPreviewFileName("Estudio / Informe"); }}
                                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline"
                                  >
                                    <FileDown className="w-3 h-3" />
                                    <span>Ver Estudio</span>
                                  </button>
                                )}
                                {(tc.archivosNecesarios || []).map((archivo, idx) => (
                                  <a
                                    key={`att-${idx}`}
                                    href={archivo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={archivo.name}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-500" />
                                    <span className="max-w-[100px] truncate" title={archivo.name}>{archivo.name}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </motion.div>
              </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Bottom Row: Map Component displaying all marked locations */}
          <div
            className={`p-6 rounded-3xl border ${
              darkMode ? "bg-black/85 backdrop-blur-md border-zinc-800 text-white shadow-lg"
                : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-extrabold text-sm">
                  Mapa de Localizaciones Programadas
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  OpenStreetMap
                </span>
                <span className="text-xs text-zinc-500">
                  ({validLocationsCount} {validLocationsCount === 1 ? "localización guardada" : "localizaciones guardadas"})
                </span>
              </div>
              <motion.a
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                href="https://www.openstreetmap.org/search?query=San+Juan,+Argentina"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto no-underline"
              >
                <MapPin className="w-4 h-4" />
                <span>Abrir en OpenStreetMap</span>
              </motion.a>
            </div>
            <MapComponent
              turnosCompromisos={turnosCompromisos}
              locationCoords={locationCoords}
              darkMode={darkMode}
            />
          </div>
        </div>
      ) : (
        /* Registro de Turnos y Compromisos Submenu View */
        <div
          className={`p-6 rounded-3xl border ${
            darkMode ? "bg-black/85 backdrop-blur-md border-zinc-800 text-white shadow-lg"
              : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
          }`}
        >
          {/* Header Controls */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-md flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Registro de Turnos y Compromisos</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Seguimiento de citas médicas, tareas administrativas y
                  compromisos cotidianos.
                </p>
              </div>
              <div className="flex shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleOpenNewTurnoCompModal}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cargar Nuevo Turno / Compromiso</span>
                </motion.button>
              </div>
            </div>

            {/* Buscador y Status Filter Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full mt-2 sm:mt-0">
              <div className="relative w-full flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Buscar turno o compromiso..."
                    value={listSearchTerm}
                    onChange={(e) => setListSearchTerm(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-none transition-colors ${
                      darkMode
                        ? "bg-zinc-950/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus:border-primary"
                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-primary"
                    }`}
                  />
                </div>
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "Todos", label: "Todos los Estados" },
                    { value: "Initinere Diario", label: "Initinere Diario" },
                    { value: "Pendiente", label: "Pendiente" },
                    { value: "Realizado", label: "Realizado" },
                  ]}
                  icon={<Filter className="w-3.5 h-3.5" />}
                  placeholder="Filtrar por Estado"
                  size="sm"
                  className="w-full sm:w-48"
                      />
                    </div>
                  </div>

          {/* Turnos y Compromisos Table */}
          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-20">
                <tr
                  className={`text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}
                >
                  <th className="px-4 py-3 text-center md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[70px] w-[70px] max-w-[70px]">
                    <span className="flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary" /> Listo</span>
                  </th>
                  <th className="px-4 py-3 md:sticky md:left-[70px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[200px] w-[220px] max-w-[280px]">
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Detalle</span>
                  </th>
                  <th className="px-4 py-3 min-w-[140px]">
                    <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cat.</span>
                  </th>
                  <th className="px-4 py-3 min-w-[150px]">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Fecha</span>
                  </th>
                  <th className="px-4 py-3 ">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Lugar</span>
                  </th>
                  <th className="px-4 py-3 text-center min-w-[110px]">
                    <span className="flex items-center justify-center gap-1"><Zap className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Estado</span>
                  </th>
                  <th className="px-4 py-3 text-center min-w-[130px]">
                    <span className="flex items-center justify-center gap-1"><FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Pedido</span>
                  </th>
                  <th className="px-4 py-3 text-center min-w-[130px]">
                    <span className="flex items-center justify-center gap-1"><FileText className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Informe</span>
                  </th>
                  <th className="px-4 py-3 min-w-[130px]">
                    <span className="flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Doc.</span>
                  </th>
                  <th className="px-4 py-3 text-center w-[90px]">
                    <span className="flex items-center justify-center gap-1"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                  </th>
                </tr>
              </thead>
              <tbody className="">
                {sortedTurnosCompromisos.filter((tc) => {
                  const estado = getEstadoLabel(tc.estatus, tc.fecha);
                  const matchesStatus =
                    statusFilter === "Todos" ||
                    (statusFilter === "Pendiente"
                      ? estado === "Pendiente" || estado === "Initinere Diario"
                      : estado === statusFilter);
                  const matchesSearch = !listSearchTerm ||
                    tc.descripcion.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                    tc.lugar.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                    (tc.doctor && tc.doctor.toLowerCase().includes(listSearchTerm.toLowerCase()));
                  return matchesStatus && matchesSearch;
                }).length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center text-zinc-500 font-medium italic"
                    >
                      No hay registros guardados
                      {statusFilter !== "Todos"
                        ? ` con estado "${statusFilter}"`
                        : ""}
                      . Haz clic en "Cargar Nuevo Turno / Compromiso" para
                      comenzar.
                    </td>
                  </tr>
                ) : (
                  sortedTurnosCompromisos
                    .filter((tc) => {
                      const estado = getEstadoLabel(tc.estatus, tc.fecha);
                      const matchesStatus =
                        statusFilter === "Todos" ||
                        (statusFilter === "Pendiente"
                          ? estado === "Pendiente" || estado === "Initinere Diario"
                          : estado === statusFilter);
                      const matchesSearch = !listSearchTerm ||
                        tc.descripcion.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                        tc.lugar.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                        (tc.doctor && tc.doctor.toLowerCase().includes(listSearchTerm.toLowerCase()));
                      return matchesStatus && matchesSearch;
                    })
                    .map((tc, idx) => {
                      const estado = getEstadoLabel(tc.estatus, tc.fecha);

                      return (
                        <tr
                          key={`tc-row-${tc.id}-${idx}`}
                          className="group hover:bg-slate-50/80 dark:hover:bg-zinc-800/20 transition-colors"
                        >
                          {/* Estatus - editable checkbox */}
                          <td className="px-4 py-3 text-center md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[70px] w-[70px] max-w-[70px]">
                            <input
                              type="checkbox"
                              checked={tc.estatus}
                              onChange={(e) => {
                                const newChecked = e.target.checked;
                                setTurnosCompromisos((prev) => {
                                  const updated = prev.map((item) =>
                                    item.id === tc.id
                                      ? { ...item, estatus: newChecked, updatedAt: Date.now() }
                                      : item,
                                  );
                                  StorageService.setTurnosCompromisos(updated);
                                  return updated;
                                });
                              }}
                              className="w-4.5 h-4.5 accent-primary rounded cursor-pointer"
                            />
                          </td>

                          {/* Descripción - non-editable */}
                          <td className={`px-4 py-3 font-semibold md:sticky md:left-[70px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[200px] w-[220px] max-w-[280px] ${tc.estatus ? "line-through text-zinc-400 dark:text-zinc-500" : "text-slate-800 dark:text-zinc-200"}`} style={{ color: tc.estatus ? undefined : (darkMode ? undefined : '#000000') }}>
                            <div className="flex flex-col gap-1">
                              <span className={tc.estatus ? "line-through text-zinc-400 dark:text-zinc-500" : ""}>{tc.descripcion}</span>
                              {tc.informacionPersonalizada && (
                                <span 
                                  className="text-[10px] text-zinc-500 italic line-clamp-1 prose dark:prose-invert prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-sm [&_*]:!text-[10px] [&_*]:!text-zinc-500 [&_ol_ol]:list-[lower-alpha] [&_ol_ol_ol]:list-[lower-roman]" 
                                  title="Información personalizada adjunta"
                                  dangerouslySetInnerHTML={{ __html: tc.informacionPersonalizada }}
                                />
                              )}
                              {tc.transcripcionAutomatica && (
                                <span 
                                  className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-500 italic line-clamp-1" 
                                  title="Transcripción Automática"
                                >
                                  <AudioLines className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{tc.transcripcionAutomatica}</span>
                                </span>
                              )}
                              {tc.archivosNecesarios && tc.archivosNecesarios.length > 0 && (
                                <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                                  <Paperclip className="w-3 h-3" />
                                  {tc.archivosNecesarios.length} archivo(s)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Categoría - editable select dropdown */}
                          <td className="px-4 py-3">
                            <CustomSelect
                              value={tc.categoria}
                              onChange={(val) => {
                                setTurnosCompromisos((prev) =>
                                  prev.map((item) =>
                                    item.id === tc.id
                                      ? {
                                          ...item,
                                          categoria:
                                            val as TurnoCompromiso["categoria"],
                                        }
                                      : item,
                                  ),
                                );
                              }}
                              options={categoryOptions}
                              size="sm"
                              className="w-full max-w-[140px]"
                            />
                          </td>

                          {/* Fecha - editable datepicker */}
                          <td className="px-4 py-3 min-w-[150px]">
                            <SmartDateTimePicker
                              size="sm"
                              value={tc.fecha}
                              onChange={(val) => {
                                setTurnosCompromisos((prev) =>
                                  prev.map((item) =>
                                    item.id === tc.id
                                      ? { ...item, fecha: val }
                                      : item,
                                  ),
                                );
                              }}
                            />
                          </td>

                          {/* Lugar - non-editable (with beautiful quick link map pin) */}
                          <td className="px-4 py-3 max-w-[180px]">
                            {tc.lugar &&
                            tc.lugar.trim() &&
                            tc.lugar.toLowerCase() !== "sin dirección" &&
                            tc.lugar.toLowerCase() !== "sin direccion" &&
                            tc.lugar.toLowerCase() !== "sin lugar asignado" ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="truncate text-slate-600 dark:text-zinc-400 font-medium"
                                  title={tc.lugar}
                                >
                                  {tc.lugar}
                                </span>
                                <a
                                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(tc.lugar)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-primary hover:text-primary bg-primary/10 rounded-md transition-all shrink-0"
                                  title="Abrir ubicación en OpenStreetMap"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-600 text-xs italic">-</span>
                            )}
                          </td>

                          {/* Estado - derived badge */}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                                estado === "Realizado"
                                  ? "bg-primary/10 text-primary"
                                  : estado === "Initinere Diario"
                                    ? "bg-primary/10 text-primary animate-pulse"
                                    : "bg-primary/10 text-primary"
                              }`}
                            >
                              {estado}
                            </span>
                          </td>

                          {/* Pedido / Documento - Uploadable if doctor is selected */}
                          <td className="px-4 py-3 text-center">
                            {!tc.doctor ? (
                              <div
                                className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 font-medium"
                                title="Debes seleccionar un doctor para poder subir documentos"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Bloqueado</span>
                              </div>
                            ) : uploadingState[`${tc.id}-pedidoDocumento`] ? (
                              <div className="flex items-center justify-center gap-1 text-[10px] text-primary font-bold">
                                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span>Subiendo...</span>
                              </div>
                            ) : tc.pedidoDocumento ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(tc.pedidoDocumento || null); setPreviewFileName("Pedido / Documento"); }}
                                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline"
                                >
                                  <FileDown className="w-3 h-3" />
                                  <span>Ver</span>
                                </button>
                                <button
                                  onClick={() => {
                                    askConfirmation(
                                      "Desvincular Archivo",
                                      "¿Estás seguro de que deseas desvincular este archivo?",
                                      () => {
                                        setTurnosCompromisos((prev) =>
                                          prev.map((item) =>
                                            item.id === tc.id
                                              ? {
                                                  ...item,
                                                  pedidoDocumento: undefined,
                                                }
                                              : item,
                                          ),
                                        );
                                      },
                                    );
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-full text-[10px] font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-all w-fit mx-auto">
                                <Upload className="w-3 h-3" />
                                <span>Subir</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFileUpload(
                                        tc.id,
                                        "pedidoDocumento",
                                        e.target.files[0],
                                      );
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </td>

                          {/* Estudio / Informe / Doc. - Uploadable if doctor is selected */}
                          <td className="px-4 py-3 text-center">
                            {!tc.doctor ? (
                              <div
                                className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 font-medium"
                                title="Debes seleccionar un doctor para poder subir documentos"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Bloqueado</span>
                              </div>
                            ) : uploadingState[`${tc.id}-estudioInformeDoc`] ? (
                              <div className="flex items-center justify-center gap-1 text-[10px] text-primary font-bold">
                                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span>Subiendo...</span>
                              </div>
                            ) : tc.estudioInformeDoc ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(tc.estudioInformeDoc || null); setPreviewFileName("Estudio / Informe"); }}
                                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline"
                                >
                                  <FileDown className="w-3 h-3" />
                                  <span>Ver</span>
                                </button>
                                <button
                                  onClick={() => {
                                    askConfirmation(
                                      "Desvincular Archivo",
                                      "¿Estás seguro de que deseas desvincular este archivo?",
                                      () => {
                                        setTurnosCompromisos((prev) =>
                                          prev.map((item) =>
                                            item.id === tc.id
                                              ? {
                                                  ...item,
                                                  estudioInformeDoc: undefined,
                                                }
                                              : item,
                                          ),
                                        );
                                      },
                                    );
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-full text-[10px] font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-all w-fit mx-auto">
                                <Upload className="w-3 h-3" />
                                <span>Subir</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFileUpload(
                                        tc.id,
                                        "estudioInformeDoc",
                                        e.target.files[0],
                                      );
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </td>

                          {/* Doctor - non-editable text */}
                          <td className="px-4 py-3 font-semibold text-primary dark:text-primary">
                            {tc.doctor ? (
                              <span className="flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5" />
                                <span>{tc.doctor}</span>
                              </span>
                            ) : (
                              <span className="text-zinc-500">-</span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditTurnoCompromiso(tc)}
                                className="p-1 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Editar registro"
                              >
                                <Pencil className="w-4 h-4 mx-auto" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteTurnoCompromiso(tc.id)
                                }
                                className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </motion.div>
      </AnimatePresence>

      {/* Existing Add Appointment form overlay */}
      {showAddApp &&
        createPortal(
          <div
            onClick={() => { if (!isSaving) setShowAddApp(false); }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 cursor-default ${
                darkMode ? "bg-black/85 backdrop-blur-md border-zinc-800 text-white"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <h3 className="font-extrabold text-lg">Agendar Turno / Cita</h3>
              <form noValidate onSubmit={handleAddAppointment} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                    Asunto / Especialidad
                  </label>
                  <input
                    type="text"
                    value={appTitle}
                    onChange={(e) => setAppTitle(e.target.value)}
                    placeholder="Ej: Odontólogo control / Turno ginecología"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans">
                    Fecha y Hora
                  </label>
                  <SmartDateTimePicker
                    value={
                      appDate && appTime ? `${appDate}T${appTime}` : appDate
                    }
                    onChange={(val) => {
                      if (val.includes("T")) {
                        const [d, t] = val.split("T");
                        setAppDate(d);
                        setAppTime(t);
                      } else {
                        setAppDate(val);
                        setAppTime("");
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans">
                    Ubicación / Dirección
                  </label>
                  <input
                    type="text"
                    value={appLocation}
                    onChange={(e) => setAppLocation(e.target.value)}
                    placeholder="Ej: Av. Rivadavia 2500"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans font-medium">
                      Médico
                    </label>
                    <input
                      type="text"
                      value={appDoctor}
                      onChange={(e) => setAppDoctor(e.target.value)}
                      placeholder="Ej: Dr. Pérez"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans font-medium font-medium">
                      Especialidad
                    </label>
                    <input
                      type="text"
                      value={appSpecialty}
                      onChange={(e) => setAppSpecialty(e.target.value)}
                      placeholder="Ej: Odontología"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans">
                    Notas Adicionales
                  </label>
                  <textarea
                    value={appNotes}
                    onChange={(e) => setAppNotes(e.target.value)}
                    placeholder="Ej: Llevar estudios de sangre..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm resize-none h-16"
                  ></textarea>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => { if (!isSaving) setShowAddApp(false); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Existing Add Routine Modal overlay */}
      {showAddRout &&
        createPortal(
          <div
            onClick={() => { if (!isSaving) setShowAddRout(false); }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 cursor-default ${
                darkMode ? "bg-black/85 backdrop-blur-md border-zinc-800 text-white"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <h3 className="font-extrabold text-lg">Crear Hábito / Rutina</h3>
              <form noValidate onSubmit={handleAddRoutine} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans">
                    Hábito a Incorporar
                  </label>
                  <input
                    type="text"
                    value={routTitle}
                    onChange={(e) => setRoutTitle(e.target.value)}
                    placeholder="Ej: Leer 15 páginas / Meditar"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase font-sans">
                    Frecuencia
                  </label>
                  <select
                    value={routFreq}
                    onChange={(e) => setRoutFreq(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm text-zinc-400"
                  >
                    <option value="Diario">Diario</option>
                    <option value="Semanal">Semanal</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => { if (!isSaving) setShowAddRout(false); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* NEW: Add Turno / Compromiso Modal Overlay */}
      {createPortal(
        <AnimatePresence>
          {showAddTurnoComp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { if (!isSaving) handleCloseTurnoCompModal(); }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingTurnoComp
                    ? "Editar Registro de Turno / Compromiso"
                    : "Cargar Registro de Turno y Compromiso"}
                </h3>
                <button
                  disabled={isSaving}
                  onClick={() => { if (!isSaving) handleCloseTurnoCompModal(); }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form
                  noValidate
                  onSubmit={handleAddTurnoCompromiso}
                  className="space-y-4 pb-1"
                >
                  {/* Descripción */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Descripción / Compromiso
                    </label>
                    <input
                      type="text"
                      value={tcDescripcion}
                      onChange={(e) => setTcDescripcion(e.target.value)}
                      placeholder="Ej: Turno Traumatólogo / Renovación carnet conducir"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                    />
                  </div>

                  {/* Categoría & Fecha */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="w-full min-w-0">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Categoría
                      </label>
                      <CustomSelect
                        value={tcCategoria}
                        onChange={(val) => {
                          setTcCategoria(val as any);
                          if (
                            val !== "Turno - Modesto" &&
                            val !== "Turno - Hernan"
                          ) {
                            setTcDoctor("");
                            setTcPedido(undefined);
                            setTcEstudio(undefined);
                          }
                        }}
                        options={categoryOptions}
                        className="w-full"
                      />
                    </div>
                    <div className="w-full min-w-0">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Fecha
                      </label>
                      <SmartDateTimePicker
                        value={tcFecha}
                        onChange={(val) => setTcFecha(val)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Lugar - openstreetmap location buscador */}
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-1.5 w-full">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                        Lugar / Dirección
                      </label>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setIsAddressBookOpen(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-xl sm:rounded-lg bg-primary text-white dark:text-slate-950 font-bold text-xs hover:bg-primary-hover shadow-xs transition-all cursor-pointer"
                      >
                        <BookMarked className="w-3.5 h-3.5" />
                        <span>Libro de Direcciones ({savedAddresses.length})</span>
                      </motion.button>
                    </div>

                    <div className="relative flex gap-2">
                      <div className="relative flex-1 w-full">
                        <input
                          type="text"
                          value={lugarQuery}
                          onChange={(e) => handlePlacesSearch(e.target.value)}
                          onFocus={() => {
                            if (lugarQuery.trim().length >= 2 && suggestions.length > 0) {
                              setShowSuggestions(true);
                            }
                          }}
                          placeholder="Escribe el nombre del sanatorio, clínica, calle o establecimiento..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none text-sm"
                        />
                        <Search className="absolute left-3 top-3.5 w-4 h-4 text-primary" />
                      </div>
                    </div>

                    {/* Quick Access Address Book Chips */}
                    {savedAddresses.length > 0 && (
                      <SavedAddressesScrollRow
                        savedAddresses={savedAddresses}
                        onSelect={handleSelectFromAddressBook}
                      />
                    )}

                    {/* Suggestion list */}
                    {showSuggestions &&
                      lugarQuery.trim().length >= 2 &&
                      (suggestions.length > 0 || searchingPlaces) && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-52 overflow-y-auto p-1 left-0 divide-y divide-slate-100 dark:divide-zinc-800/40">
                          <div className="px-3 py-1.5 bg-slate-50 dark:bg-black/60 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Búsqueda de OpenStreetMap</span>
                            {searchingPlaces && (
                              <div className="flex items-center gap-1 text-primary">
                                <div className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span>Buscando...</span>
                              </div>
                            )}
                          </div>
                          {searchingPlaces && suggestions.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                              <span>Buscando direcciones en OpenStreetMap...</span>
                            </div>
                          ) : (
                              suggestions.map((s, index) => {
                                const fullLoc = s.address && !s.title.toLowerCase().includes(s.address.toLowerCase().split(",")[0])
                                  ? `${s.title} - ${s.address}`
                                  : (s.name || s.title);
                                return (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                      searchSeqRef.current++;
                                      setTcLugar(fullLoc);
                                      setLugarQuery(fullLoc);
                                      setSuggestions([]);
                                      setShowSuggestions(false);
                                      setSearchingPlaces(false);
                                      setTcLat(
                                        s.lat ? parseFloat(s.lat) : undefined,
                                      );
                                      setTcLon(
                                        s.lon ? parseFloat(s.lon) : undefined,
                                      );
                                    }}
                                    className="w-full text-left px-3 py-2.5 text-xs hover:border-primary border border-transparent rounded-xl text-slate-700 dark:text-zinc-300 transition-colors flex items-start gap-2.5 cursor-pointer font-medium group"
                                  >
                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                                      <MapPin className="w-3.5 h-3.5 text-primary stroke-[1.75]" />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-slate-800 dark:text-zinc-100 truncate text-xs">
                                          {s.title || s.name}
                                        </span>
                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 shrink-0">
                                          GPS
                                        </span>
                                      </div>
                                      {s.address && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <MapPin className="w-3 h-3 text-primary shrink-0 stroke-[1.75]" />
                                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate font-normal">
                                            {s.address}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}

                    {/* Interactive Google Maps / Leaflet Location Picker */}
                    <LocationPickerMap
                      lat={tcLat}
                      lon={tcLon}
                      locationName={tcLugar || lugarQuery}
                      onSelectLocation={(selected) => {
                        const titleAndAddress = selected.display_name || selected.address || selected.title || `${selected.lat.toFixed(5)}, ${selected.lon.toFixed(5)}`;
                        setTcLugar(titleAndAddress);
                        setLugarQuery(titleAndAddress);
                        setTcLat(selected.lat);
                        setTcLon(selected.lon);
                      }}
                      heightClass="h-48"
                    />

                    {tcLugar && (
                      <div className="mt-2 p-2 bg-primary/10 rounded-xl flex items-center justify-between gap-2 text-xs text-primary dark:text-primary font-bold">
                        <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0 stroke-[1.75]" />
                          <span className="truncate">{tcLugar}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsAddressBookOpen(true)}
                            className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-black/85 backdrop-blur-md border border-primary/30 text-primary rounded-lg text-[10px] font-bold transition-all hover:bg-primary hover:text-white cursor-pointer"
                            title="Guardar esta ubicación en mi Libro de Direcciones"
                          >
                            <BookmarkPlus className="w-3 h-3" />
                            <span>Guardar</span>
                          </button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tcLugar)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-primary text-white dark:text-slate-950 rounded-lg text-[10px] font-bold shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Abrir Mapa</span>
                          </a>
                        </div>
                      </div>
                    )}

                  </div>

                                    {/* Información Personalizada */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                        Información Personalizada (Opcional)
                      </label>
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isTranscribing}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold transition-all shadow-sm ${
                          isRecording
                            ? 'bg-primary text-white dark:text-blue-950 animate-pulse shadow-md shadow-primary/20 cursor-pointer'
                            : isTranscribing
                            ? 'bg-primary/20 text-primary border border-primary/30 cursor-wait'
                            : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 cursor-pointer'
                        }`}
                      >
                        {isTranscribing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Transcribiendo...</span>
                          </>
                        ) : isRecording ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>Detener Grabación</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3 h-3" />
                            <span>Grabar Audio</span>
                          </>
                        )}
                      </button>
                    </div>
                    <RichTextEditor
                      value={tcInformacionPersonalizada}
                      onChange={setTcInformacionPersonalizada}
                      attachments={tcArchivosNecesarios}
                      onAttachmentsChange={setTcArchivosNecesarios}
                      onPreview={(url, name) => { setPreviewFileUrl(url); setPreviewFileName(name); }}
                      
                      placeholder="Agrega notas, indicaciones especiales, recordatorios..."
                    />
                  </div>

                  {/* Transcripcion Automatica */}
                  {(tcTranscripcionAutomatica || isTranscribing) && (
                    <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl relative">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest">
                          <AudioLines className="w-3.5 h-3.5" />
                          Transcripción Automática
                        </label>
                        {isTranscribing && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-primary animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Transcribiendo con IA...
                          </span>
                        )}
                      </div>
                      {(() => {
                        const audioFile = tcArchivosNecesarios.find(a => a.name.startsWith('Audio_') && a.url.startsWith('data:audio/'));
                        if (audioFile && tcTranscripcionAutomatica) {
                          return (
                            <AudioTranscriptionPlayer 
                               audioUrl={audioFile.url}
                               transcript={tcTranscripcionAutomatica}
                               onTranscriptChange={setTcTranscripcionAutomatica}
                               isEditable={true}
                            />
                          );
                        }
                        return (
                           <textarea
                             value={tcTranscripcionAutomatica}
                             onChange={(e) => setTcTranscripcionAutomatica(e.target.value)}
                             className="w-full text-xs text-slate-700 dark:text-zinc-300 bg-transparent border-none focus:ring-0 resize-y min-h-[60px] p-0 italic"
                             placeholder={isTranscribing ? "Procesando transcripción con Inteligencia Artificial..." : "La transcripción aparecerá aquí..."}
                           />
                        );
                      })()}
                    </div>
                  )}


                  {/* Doctor (Only visible for Turno - Modesto or Turno - Hernan) */}
                  {(tcCategoria === "Turno - Modesto" ||
                    tcCategoria === "Turno - Hernan") && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Médico / Doctor (Habilita cargas de archivo)
                      </label>
                      <CustomSelect
                        value={tcDoctor}
                        onChange={(val) => {
                          setTcDoctor(val);
                          if (!val) {
                            setTcPedido(undefined);
                            setTcEstudio(undefined);
                          }
                        }}
                        options={doctorOptions}
                        placeholder="-- Selecciona Doctor (Opcional) --"
                        className="w-full"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">
                        *Nota: Para adjuntar estudios, informes o pedidos, el
                        compromiso debe tener un Médico asignado.
                      </p>
                    </div>
                  )}

                  {/* File Uploads - Only visible if Doctor is selected */}
                  {(tcCategoria === "Turno - Modesto" ||
                    tcCategoria === "Turno - Hernan") &&
                    tcDoctor && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-zinc-800/40 rounded-2xl">
                        {/* Pedido / Doc. */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                            Pedido / Doc.
                          </label>
                          {uploadingState["modal-pedidoDocumento"] ? (
                            <div className="flex items-center gap-1 text-[11px] text-primary font-bold py-2">
                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                              <span>Subiendo...</span>
                            </div>
                          ) : tcPedido ? (
                            <div onClick={() => { setPreviewFileUrl(tcPedido); setPreviewFileName("Pedido / Documento"); }} className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                              <div className="flex items-center gap-1 text-xs text-primary dark:text-primary font-bold truncate max-w-[120px]">
                                <FileDown className="w-4 h-4 shrink-0" />
                                <span className="truncate text-[10px]">Ver Archivo</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setTcPedido(undefined); }}
                                className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-300 dark:hover:bg-zinc-600 transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700/80 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/50 dark:border-zinc-800/30 rounded-full text-xs font-bold cursor-pointer transition-all w-full justify-center">
                              <Upload className="w-4 h-4" />
                              <span className="text-[11px]">Subir Pedido</span>
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleModalFileUpload(
                                      "pedidoDocumento",
                                      e.target.files[0],
                                    );
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {/* Estudio / Informe */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                            Estudio / Informe
                          </label>
                          <div className="space-y-2">
                            <CustomSelect
                              value={tcMedicalRecordId || ""}
                              onChange={(val) => {
                                setTcMedicalRecordId(val || undefined);
                                const record = medicalRecords.find(
                                  (r) => r.id === val,
                                );
                                if (record && record.fileData) {
                                  setTcEstudio(record.fileData);
                                } else {
                                  setTcEstudio(undefined);
                                }
                              }}
                              options={[
                                {
                                  value: "",
                                  label: "-- Ninguno (Sin Estudio/Informe) --",
                                },
                                ...medicalRecords
                                  .filter((r) => {
                                    const patientName =
                                      tcCategoria === "Turno - Modesto"
                                        ? "Modesto"
                                        : tcCategoria === "Turno - Hernan"
                                          ? "Hernan"
                                          : "";
                                    return (
                                      !patientName || r.patient === patientName
                                    );
                                  })
                                  .map((r) => ({
                                    value: r.id,
                                    label: `${r.type} / ${r.info}`,
                                  })),
                              ]}
                              placeholder="-- Selecciona Tipo / Info --"
                              className="w-full"
                            />
                            {(() => {
                              const matchedRecord = medicalRecords.find(
                                (r) => r.id === tcMedicalRecordId,
                              );
                              return matchedRecord?.fileData ? (
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); setPreviewFileUrl(matchedRecord.fileData); setPreviewFileName(matchedRecord.fileName || "Estudio / Informe"); }}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary text-white dark:text-blue-950 rounded-full text-[11px] font-extrabold transition-all shadow-md shadow-primary/10 cursor-pointer text-center justify-center hover:scale-[1.02] active:scale-[0.98] w-full h-[36px]"
                                >
                                  <FileDown className="w-4 h-4 shrink-0" />
                                  <span>Archivo / Adjunto</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 rounded-xl text-[11px] font-bold border border-slate-200/40 dark:border-zinc-800/20 text-center justify-center cursor-not-allowed select-none w-full h-[36px]">
                                  <X className="w-3.5 h-3.5 shrink-0" />
                                  <span>Archivo / Adjunto (Sin adjunto)</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => { if (!isSaving) handleCloseTurnoCompModal(); }}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-all cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        editingTurnoComp
                          ? "Guardar Cambios"
                          : "Cargar Compromiso"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* DETAILED MODAL POPUP (Mini Menu Desplegado) */}
      {activeDetailItem &&
        activeDetailItem.type === "turnoCompromiso" &&
        createPortal(
          (() => {
            const item = activeDetailItem.data;

            // Find state or helper derived status label if any
            // Since we are inside the component render function, getEstadoLabel is fully accessible!
            // We can define a local inline check or call getEstadoLabel if available
            const estadoLabel =
              typeof getEstadoLabel === "function"
                ? getEstadoLabel(item.estatus, item.fecha)
                : item.estatus
                  ? "Realizado"
                  : "Pendiente";

            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in cursor-pointer"
                onClick={() => setActiveDetailItem(null)}
              >
                <div
                  className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl relative transition-all cursor-default ${
                    darkMode
                      ? "bg-zinc-950 border-zinc-800 text-white shadow-primary/5"
                      : "bg-white border-zinc-200 text-zinc-800 shadow-slate-200"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button */}
                  <button
                    onClick={() => setActiveDetailItem(null)}
                    className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-zinc-500/10 text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold w-fit">
                      <Calendar className="w-4 h-4" />
                      <span>Agenda de Turnos y Compromisos</span>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 pr-8">
                      {item.descripcion}
                    </h3>

                    <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400 font-bold">
                      <div className="bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Categoría
                        </p>
                        <p className="text-slate-800 dark:text-zinc-200 font-extrabold mt-0.5 uppercase tracking-wider">
                          {item.categoria}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Estado
                        </p>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                            estadoLabel === "Realizado"
                              ? "bg-primary/10 text-primary dark:text-primary"
                              : estadoLabel === "Initinere Diario"
                                ? "bg-primary/10 text-primary dark:text-primary animate-pulse"
                                : "bg-primary/10 text-primary dark:text-primary"
                          }`}
                        >
                          {estadoLabel}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 space-y-3.5 text-xs text-slate-600 dark:text-zinc-400 font-medium">
                      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-bold">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                            Fecha Programada
                          </p>
                          <p className="text-slate-800 dark:text-zinc-200 font-extrabold mt-0.5 text-xs">
                            {formatDateFriendly(item.fecha)}
                          </p>
                        </div>
                      </div>

                      {item.lugar &&
                        item.lugar.trim() &&
                        item.lugar.toLowerCase() !== "sin dirección" &&
                        item.lugar.toLowerCase() !== "sin direccion" &&
                        item.lugar.toLowerCase() !== "sin lugar asignado" && (
                        <div className="flex items-start gap-2 text-zinc-500 dark:text-zinc-400 font-bold">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                              Ubicación / Dirección
                            </p>
                            <p className="text-slate-800 dark:text-zinc-200 font-extrabold mt-0.5 text-xs leading-normal">
                              {item.lugar}
                            </p>
                            <a
                              href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(item.lugar)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1 text-[10px] text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Abrir en OpenStreetMap</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {item.doctor && (
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-bold">
                          <Stethoscope className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                              Profesional a cargo
                            </p>
                            <p className="text-primary dark:text-primary font-extrabold mt-0.5 text-xs">
                              {item.doctor}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Attached Files inside popup */}
                    {(item.pedidoDocumento || item.estudioInformeDoc) && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 space-y-2 text-xs">
                        <p className="font-extrabold text-slate-800 dark:text-zinc-200 uppercase text-[9px] tracking-widest">
                          Documentación Adjunta:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {item.pedidoDocumento && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(item.pedidoDocumento || null); setPreviewFileName("Pedido / Documento"); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/10 text-primary dark:text-primary rounded-lg text-xs font-bold transition-colors"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>Ver Pedido</span>
                            </button>
                          )}
                          {item.estudioInformeDoc && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(item.estudioInformeDoc || null); setPreviewFileName("Estudio / Informe"); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/10 text-primary dark:text-primary rounded-lg text-xs font-bold transition-colors"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>Ver Estudio</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setTurnosCompromisos((prev) => {
                            const updated = prev.map((tc) =>
                              tc.id === item.id
                                ? { ...tc, estatus: !tc.estatus, updatedAt: Date.now() }
                                : tc,
                            );
                            StorageService.setTurnosCompromisos(updated);
                            return updated;
                          });
                          setActiveDetailItem(null);
                        }}
                        className={`px-4 py-2.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                          item.estatus
                            ? "bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-500"
                            : "bg-primary hover:bg-primary text-white dark:text-blue-950 shadow-md shadow-primary/10 font-extrabold"
                        }`}
                      >
                        {item.estatus
                          ? "Marcar como Pendiente"
                          : "Marcar como Realizado"}
                      </button>
                      <button
                        onClick={() => setActiveDetailItem(null)}
                        className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-bold cursor-pointer text-primary dark:text-primary transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })(),
          document.body,
        )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL CON ANIMACIÓN & ESTADO ELIMINANDO */}
      <ConfirmationModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || "Confirmar Eliminación"}
        message={confirmModal?.message || "¿Estás seguro de que deseas eliminar este elemento?"}
        onConfirm={async () => {
          if (confirmModal) {
            await confirmModal.onConfirm();
          }
        }}
        onClose={() => setConfirmModal(null)}
        darkMode={darkMode}
      />

      {/* Address Book Modal */}
      <AddressBookModal
        isOpen={isAddressBookOpen}
        onClose={() => setIsAddressBookOpen(false)}
        onSelectAddress={handleSelectFromAddressBook}
        currentSelected={{
          name: tcLugar || lugarQuery,
          address: tcLugar || lugarQuery,
          lat: tcLat,
          lon: tcLon,
        }}
      />
                <FilePreviewModal isOpen={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} fileUrl={previewFileUrl} fileName={previewFileName} />
    </div>
  );
}
