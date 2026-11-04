import type { ComponentType } from "react";
import {
  Home,
  Lightbulb,
  Flame,
  Droplet,
  Wifi,
  Car,
  Fuel,
  Bus,
  Bike,
  HeartPulse,
  Pill,
  Stethoscope,
  Dumbbell,
  Film,
  Music,
  Gamepad2,
  Tv,
  ShoppingCart,
  ShoppingBag,
  Gift,
  Briefcase,
  GraduationCap,
  BookOpen,
  Landmark,
  CreditCard,
  PiggyBank,
  Receipt,
  Smartphone,
  Globe,
  Shield,
  Dog,
  Baby,
  Plane,
  Wrench,
} from "lucide-react";
import {
  siNetflix,
  siSpotify,
  siYoutube,
  siYoutubemusic,
  siHbomax,
  siHbo,
  siUber,
  siMercadopago,
  siPlaystation,
  siSteam,
  siApple,
  siApplemusic,
  siIcloud,
  siDeezer,
  siTwitch,
  siGoogle,
  siWhatsapp,
  siMovistar,
  siCrunchyroll,
  siParamountplus,
  siTinder,
  siAirbnb,
  siBookingdotcom,
  siDuolingo,
  siDropbox,
  siGithub,
  siX,
} from "simple-icons";

// Registro central de íconos elegibles para un pago — se usa tanto en el selector (botón al lado
// de "Descripción") como en cualquier lugar que después tenga que dibujar el ícono elegido (fila
// de la tabla, modal de detalle). Dos tipos de fuente:
//  - "lucide": un componente de lucide-react (ya es una dependencia de toda la app) para
//    categorías genéricas (hogar, transporte, salud, etc.).
//  - "brand": el path SVG de simple-icons (licencia CC0) para logos de marcas reales
//    (streaming, billeteras, etc.) — se dibuja con nuestro propio <svg>, así el color elegido
//    siempre pisa el color de marca.
export type PaymentIconDef =
  | { id: string; label: string; source: "lucide"; Icon: ComponentType<{ className?: string; style?: React.CSSProperties }> }
  | { id: string; label: string; source: "brand"; path: string };

export interface PaymentIconCategory {
  id: string;
  label: string;
  icons: PaymentIconDef[];
}

const lucideIcon = (id: string, label: string, Icon: ComponentType<any>): PaymentIconDef => ({
  id,
  label,
  source: "lucide",
  Icon,
});

const brandIcon = (id: string, label: string, icon: { path: string }): PaymentIconDef => ({
  id,
  label,
  source: "brand",
  path: icon.path,
});

export const PAYMENT_ICON_CATEGORIES: PaymentIconCategory[] = [
  {
    id: "marcas",
    label: "Marcas",
    icons: [
      brandIcon("netflix", "Netflix", siNetflix),
      brandIcon("spotify", "Spotify", siSpotify),
      brandIcon("youtube", "YouTube", siYoutube),
      brandIcon("youtube-music", "YouTube Music", siYoutubemusic),
      brandIcon("hbo-max", "HBO Max", siHbomax),
      brandIcon("hbo", "HBO", siHbo),
      brandIcon("paramount-plus", "Paramount+", siParamountplus),
      brandIcon("crunchyroll", "Crunchyroll", siCrunchyroll),
      brandIcon("apple", "Apple", siApple),
      brandIcon("apple-music", "Apple Music", siApplemusic),
      brandIcon("icloud", "iCloud", siIcloud),
      brandIcon("google", "Google", siGoogle),
      brandIcon("dropbox", "Dropbox", siDropbox),
      brandIcon("deezer", "Deezer", siDeezer),
      brandIcon("twitch", "Twitch", siTwitch),
      brandIcon("playstation", "PlayStation", siPlaystation),
      brandIcon("steam", "Steam", siSteam),
      brandIcon("whatsapp", "WhatsApp", siWhatsapp),
      brandIcon("movistar", "Movistar", siMovistar),
      brandIcon("uber", "Uber", siUber),
      brandIcon("mercado-pago", "Mercado Pago", siMercadopago),
      brandIcon("tinder", "Tinder", siTinder),
      brandIcon("airbnb", "Airbnb", siAirbnb),
      brandIcon("booking", "Booking.com", siBookingdotcom),
      brandIcon("duolingo", "Duolingo", siDuolingo),
      brandIcon("github", "GitHub", siGithub),
      brandIcon("x", "X", siX),
    ],
  },
  {
    id: "hogar",
    label: "Hogar",
    icons: [
      lucideIcon("home", "Alquiler/Expensas", Home),
      lucideIcon("lightbulb", "Luz", Lightbulb),
      lucideIcon("flame", "Gas", Flame),
      lucideIcon("droplet", "Agua", Droplet),
      lucideIcon("wifi", "Internet", Wifi),
      lucideIcon("wrench", "Mantenimiento", Wrench),
    ],
  },
  {
    id: "transporte",
    label: "Transporte",
    icons: [
      lucideIcon("car", "Auto", Car),
      lucideIcon("fuel", "Nafta", Fuel),
      lucideIcon("bus", "Colectivo", Bus),
      lucideIcon("bike", "Bici/Moto", Bike),
      lucideIcon("plane", "Viajes", Plane),
    ],
  },
  {
    id: "salud",
    label: "Salud",
    icons: [
      lucideIcon("heart-pulse", "Obra Social", HeartPulse),
      lucideIcon("pill", "Farmacia", Pill),
      lucideIcon("stethoscope", "Médico", Stethoscope),
      lucideIcon("dumbbell", "Gimnasio", Dumbbell),
    ],
  },
  {
    id: "entretenimiento",
    label: "Entretenimiento",
    icons: [
      lucideIcon("film", "Streaming", Film),
      lucideIcon("music", "Música", Music),
      lucideIcon("gamepad", "Juegos", Gamepad2),
      lucideIcon("tv", "TV/Cable", Tv),
    ],
  },
  {
    id: "compras",
    label: "Compras",
    icons: [
      lucideIcon("shopping-cart", "Supermercado", ShoppingCart),
      lucideIcon("shopping-bag", "Compras", ShoppingBag),
      lucideIcon("gift", "Regalos", Gift),
    ],
  },
  {
    id: "finanzas",
    label: "Finanzas",
    icons: [
      lucideIcon("landmark", "Banco", Landmark),
      lucideIcon("credit-card", "Tarjeta", CreditCard),
      lucideIcon("piggy-bank", "Ahorro", PiggyBank),
      lucideIcon("receipt", "Impuestos", Receipt),
      lucideIcon("shield", "Seguro", Shield),
    ],
  },
  {
    id: "otros",
    label: "Otros",
    icons: [
      lucideIcon("briefcase", "Trabajo", Briefcase),
      lucideIcon("graduation-cap", "Educación", GraduationCap),
      lucideIcon("book-open", "Cursos", BookOpen),
      lucideIcon("dog", "Mascotas", Dog),
      lucideIcon("baby", "Hijos", Baby),
      lucideIcon("smartphone", "Celular", Smartphone),
      lucideIcon("globe", "Otro servicio", Globe),
    ],
  },
];

const ALL_ICONS: PaymentIconDef[] = PAYMENT_ICON_CATEGORIES.flatMap((c) => c.icons);
const ICON_BY_ID = new Map(ALL_ICONS.map((i) => [i.id, i]));

export function getPaymentIconDef(id?: string | null): PaymentIconDef | undefined {
  if (!id) return undefined;
  return ICON_BY_ID.get(id);
}

// Paleta fija para el preview de colores al tocar un ícono — "accent" no es un color concreto,
// sino "seguí usando el color de acento de la app" (se guarda sin iconoColor, así el ícono
// acompaña el tema si el usuario después cambia el color de acento general).
export const PAYMENT_ICON_COLORS: { id: string; label: string; hex: string | null }[] = [
  { id: "accent", label: "Acento", hex: null },
  { id: "red", label: "Rojo", hex: "#ef4444" },
  { id: "orange", label: "Naranja", hex: "#f97316" },
  { id: "amber", label: "Ámbar", hex: "#f59e0b" },
  { id: "green", label: "Verde", hex: "#22c55e" },
  { id: "teal", label: "Verde azulado", hex: "#14b8a6" },
  { id: "blue", label: "Azul", hex: "#3b82f6" },
  { id: "violet", label: "Violeta", hex: "#8b5cf6" },
  { id: "pink", label: "Rosa", hex: "#ec4899" },
  { id: "slate", label: "Gris", hex: "#64748b" },
];
