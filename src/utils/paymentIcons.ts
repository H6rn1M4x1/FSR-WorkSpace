import type { ComponentType } from "react";
import type { DetailedPayment } from "../types";
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
  Scissors,
  Shirt,
  Printer,
  Laptop,
  Trees,
  Umbrella,
  Newspaper,
  Coffee,
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
  siFacebook,
  siInstagram,
  siTiktok,
  siPinterest,
  siReddit,
  siTelegram,
  siDiscord,
  siSnapchat,
  siVimeo,
  siSoundcloud,
  siAudible,
  siLetterboxd,
  siEpicgames,
  siRiotgames,
  siBattledotnet,
  siUbisoft,
  siGogdotcom,
  siNotion,
  siFigma,
  siTrello,
  siAsana,
  siJira,
  siEvernote,
  siZoom,
  siGoogledrive,
  siGooglecloud,
  siGooglephotos,
  siGooglemaps,
  siWaze,
  siPaypal,
  siVisa,
  siExpedia,
  siTripadvisor,
  siLyft,
  siDoordash,
  siInstacart,
  siCoursera,
  siUdemy,
  siSkillshare,
  siCodecademy,
  si1password,
  siLastpass,
  siNordvpn,
  siExpressvpn,
  siNorton,
  siMcafee,
  siAvast,
  siCloudflare,
  siDigitalocean,
  siVercel,
  siStrava,
  siFitbit,
  siGarmin,
  siSamsung,
  siHuawei,
  siXiaomi,
  siSony,
  siLg,
  siNike,
  siAdidas,
  siPuma,
  siHandm,
  siZara,
} from "simple-icons";

// Registro central de íconos elegibles para un pago — se usa tanto en el selector (botón al lado
// de "Descripción") como en cualquier lugar que después tenga que dibujar el ícono elegido (fila
// de la tabla, modal de detalle, widgets de Facturas/Historial). Dos tipos de fuente:
//  - "lucide": un componente de lucide-react (ya es una dependencia de toda la app) para
//    categorías genéricas (hogar, transporte, salud, etc.).
//  - "brand": el path SVG de simple-icons (licencia CC0) para logos de marcas reales
//    (streaming, redes, billeteras, etc.) — se dibuja con nuestro propio <svg>, así el color
//    elegido siempre pisa el color de marca.
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
    id: "streaming",
    label: "Streaming y Música",
    icons: [
      brandIcon("netflix", "Netflix", siNetflix),
      brandIcon("spotify", "Spotify", siSpotify),
      brandIcon("youtube", "YouTube", siYoutube),
      brandIcon("youtube-music", "YouTube Music", siYoutubemusic),
      brandIcon("hbo-max", "HBO Max", siHbomax),
      brandIcon("hbo", "HBO", siHbo),
      brandIcon("paramount-plus", "Paramount+", siParamountplus),
      brandIcon("crunchyroll", "Crunchyroll", siCrunchyroll),
      brandIcon("apple-music", "Apple Music", siApplemusic),
      brandIcon("deezer", "Deezer", siDeezer),
      brandIcon("soundcloud", "SoundCloud", siSoundcloud),
      brandIcon("audible", "Audible", siAudible),
      brandIcon("twitch", "Twitch", siTwitch),
      brandIcon("vimeo", "Vimeo", siVimeo),
      brandIcon("letterboxd", "Letterboxd", siLetterboxd),
    ],
  },
  {
    id: "redes",
    label: "Redes Sociales",
    icons: [
      brandIcon("facebook", "Facebook", siFacebook),
      brandIcon("instagram", "Instagram", siInstagram),
      brandIcon("tiktok", "TikTok", siTiktok),
      brandIcon("x", "X", siX),
      brandIcon("pinterest", "Pinterest", siPinterest),
      brandIcon("reddit", "Reddit", siReddit),
      brandIcon("telegram", "Telegram", siTelegram),
      brandIcon("discord", "Discord", siDiscord),
      brandIcon("snapchat", "Snapchat", siSnapchat),
      brandIcon("whatsapp", "WhatsApp", siWhatsapp),
    ],
  },
  {
    id: "juegos",
    label: "Juegos",
    icons: [
      brandIcon("playstation", "PlayStation", siPlaystation),
      brandIcon("steam", "Steam", siSteam),
      brandIcon("epic-games", "Epic Games", siEpicgames),
      brandIcon("riot-games", "Riot Games", siRiotgames),
      brandIcon("battlenet", "Battle.net", siBattledotnet),
      brandIcon("ubisoft", "Ubisoft", siUbisoft),
      brandIcon("gog", "GOG.com", siGogdotcom),
    ],
  },
  {
    id: "trabajo",
    label: "Trabajo y Productividad",
    icons: [
      brandIcon("notion", "Notion", siNotion),
      brandIcon("figma", "Figma", siFigma),
      brandIcon("trello", "Trello", siTrello),
      brandIcon("asana", "Asana", siAsana),
      brandIcon("jira", "Jira", siJira),
      brandIcon("evernote", "Evernote", siEvernote),
      brandIcon("zoom", "Zoom", siZoom),
      brandIcon("dropbox", "Dropbox", siDropbox),
      brandIcon("google-drive", "Google Drive", siGoogledrive),
      brandIcon("google-cloud", "Google Cloud", siGooglecloud),
      brandIcon("google-photos", "Google Photos", siGooglephotos),
      brandIcon("icloud", "iCloud", siIcloud),
      brandIcon("github", "GitHub", siGithub),
    ],
  },
  {
    id: "compras-viajes",
    label: "Compras y Viajes",
    icons: [
      brandIcon("mercado-pago", "Mercado Pago", siMercadopago),
      brandIcon("paypal", "PayPal", siPaypal),
      brandIcon("visa", "Visa", siVisa),
      brandIcon("uber", "Uber", siUber),
      brandIcon("lyft", "Lyft", siLyft),
      brandIcon("doordash", "DoorDash", siDoordash),
      brandIcon("instacart", "Instacart", siInstacart),
      brandIcon("airbnb", "Airbnb", siAirbnb),
      brandIcon("booking", "Booking.com", siBookingdotcom),
      brandIcon("expedia", "Expedia", siExpedia),
      brandIcon("tripadvisor", "Tripadvisor", siTripadvisor),
      brandIcon("google-maps", "Google Maps", siGooglemaps),
      brandIcon("waze", "Waze", siWaze),
      brandIcon("tinder", "Tinder", siTinder),
    ],
  },
  {
    id: "educacion-marcas",
    label: "Educación",
    icons: [
      brandIcon("duolingo", "Duolingo", siDuolingo),
      brandIcon("coursera", "Coursera", siCoursera),
      brandIcon("udemy", "Udemy", siUdemy),
      brandIcon("skillshare", "Skillshare", siSkillshare),
      brandIcon("codecademy", "Codecademy", siCodecademy),
    ],
  },
  {
    id: "seguridad-nube",
    label: "Seguridad y Nube",
    icons: [
      brandIcon("1password", "1Password", si1password),
      brandIcon("lastpass", "LastPass", siLastpass),
      brandIcon("nordvpn", "NordVPN", siNordvpn),
      brandIcon("expressvpn", "ExpressVPN", siExpressvpn),
      brandIcon("norton", "Norton", siNorton),
      brandIcon("mcafee", "McAfee", siMcafee),
      brandIcon("avast", "Avast", siAvast),
      brandIcon("cloudflare", "Cloudflare", siCloudflare),
      brandIcon("digitalocean", "DigitalOcean", siDigitalocean),
      brandIcon("vercel", "Vercel", siVercel),
    ],
  },
  {
    id: "deporte-marcas",
    label: "Deporte y Salud",
    icons: [
      brandIcon("strava", "Strava", siStrava),
      brandIcon("fitbit", "Fitbit", siFitbit),
      brandIcon("garmin", "Garmin", siGarmin),
      brandIcon("nike", "Nike", siNike),
      brandIcon("adidas", "Adidas", siAdidas),
      brandIcon("puma", "Puma", siPuma),
    ],
  },
  {
    id: "tecnologia",
    label: "Tecnología",
    icons: [
      brandIcon("apple", "Apple", siApple),
      brandIcon("google", "Google", siGoogle),
      brandIcon("samsung", "Samsung", siSamsung),
      brandIcon("huawei", "Huawei", siHuawei),
      brandIcon("xiaomi", "Xiaomi", siXiaomi),
      brandIcon("sony", "Sony", siSony),
      brandIcon("lg", "LG", siLg),
    ],
  },
  {
    id: "moda",
    label: "Moda",
    icons: [
      brandIcon("hm", "H&M", siHandm),
      brandIcon("zara", "Zara", siZara),
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
      lucideIcon("trees", "Jardín", Trees),
      lucideIcon("printer", "Impresora", Printer),
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
      lucideIcon("umbrella", "Seguro", Umbrella),
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
      lucideIcon("newspaper", "Diario/Revista", Newspaper),
      lucideIcon("coffee", "Salidas", Coffee),
    ],
  },
  {
    id: "compras",
    label: "Compras",
    icons: [
      lucideIcon("shopping-cart", "Supermercado", ShoppingCart),
      lucideIcon("shopping-bag", "Compras", ShoppingBag),
      lucideIcon("gift", "Regalos", Gift),
      lucideIcon("shirt", "Ropa", Shirt),
      lucideIcon("scissors", "Peluquería", Scissors),
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
      lucideIcon("laptop", "Computadora", Laptop),
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

// Ícono por defecto de cada categoría de pago — el que aparece cuando el usuario todavía no
// eligió uno a mano (ver getEffectivePaymentIconId). Las claves son exactamente los valores de
// DetailedPayment["categoria"].
export const CATEGORY_DEFAULT_ICON: Record<DetailedPayment["categoria"], string> = {
  Impuestos: "receipt",
  Prestamos: "landmark",
  "Telefonia e Internet": "wifi",
  "Servicios Digitales": "tv",
  "Obra Social": "heart-pulse",
  "Tarjeta de Credito": "credit-card",
  "Servicios Esenciales": "home",
};

// El ícono que realmente hay que dibujar para un pago: el que el usuario eligió a mano si hay
// uno, y si no, el de su categoría — así nunca queda un pago sin ícono.
export function getEffectivePaymentIconId(payment: { icono?: string; categoria: DetailedPayment["categoria"] }): string {
  return payment.icono || CATEGORY_DEFAULT_ICON[payment.categoria] || "receipt";
}
