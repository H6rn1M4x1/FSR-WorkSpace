import {
  Calendar,
  Stethoscope,
  Pill,
  FileText,
  Sparkles,
  Home,
  Car,
  Wallet,
  GraduationCap,
  Dumbbell,
  Briefcase,
  ShoppingBag,
  Plane,
  Heart,
  Users,
  PawPrint,
  Wrench,
  Phone,
  Mail,
  Coffee,
  Music,
  Camera,
  Book,
  Gift,
  CreditCard,
  Clock,
  MapPin,
  Star,
  Tag,
  ClipboardList,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { TurnoCategoriaDef } from "../types";

// Íconos disponibles para el selector manual de categorías, en el color de acento del tema.
// El nombre (string) es lo que se guarda en TurnoCategoriaDef.icon.
export const TURNO_CATEGORY_ICON_CHOICES: { name: string; icon: LucideIcon }[] = [
  { name: "Calendar", icon: Calendar },
  { name: "Stethoscope", icon: Stethoscope },
  { name: "Pill", icon: Pill },
  { name: "FileText", icon: FileText },
  { name: "Sparkles", icon: Sparkles },
  { name: "Home", icon: Home },
  { name: "Car", icon: Car },
  { name: "Wallet", icon: Wallet },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "Dumbbell", icon: Dumbbell },
  { name: "Briefcase", icon: Briefcase },
  { name: "ShoppingBag", icon: ShoppingBag },
  { name: "Plane", icon: Plane },
  { name: "Heart", icon: Heart },
  { name: "Users", icon: Users },
  { name: "PawPrint", icon: PawPrint },
  { name: "Wrench", icon: Wrench },
  { name: "Phone", icon: Phone },
  { name: "Mail", icon: Mail },
  { name: "Coffee", icon: Coffee },
  { name: "Music", icon: Music },
  { name: "Camera", icon: Camera },
  { name: "Book", icon: Book },
  { name: "Gift", icon: Gift },
  { name: "CreditCard", icon: CreditCard },
  { name: "Clock", icon: Clock },
  { name: "MapPin", icon: MapPin },
  { name: "Star", icon: Star },
  { name: "Tag", icon: Tag },
  { name: "ClipboardList", icon: ClipboardList },
  { name: "Building2", icon: Building2 },
];

const ICON_BY_NAME: Record<string, LucideIcon> = TURNO_CATEGORY_ICON_CHOICES.reduce(
  (acc, { name, icon }) => {
    acc[name] = icon;
    return acc;
  },
  {} as Record<string, LucideIcon>
);

// Devuelve el componente de ícono para una categoría; si el nombre guardado no está en el
// listado (dato legacy o corrupto), cae a Tag en vez de romper el render.
export function getTurnoCategoryIconComponent(iconName: string | undefined | null): LucideIcon {
  return (iconName && ICON_BY_NAME[iconName]) || Tag;
}

// Devuelve la etiqueta legible de una categoría a partir del valor guardado en
// TurnoCompromiso.categoria (que es el `id` de la definición, no necesariamente texto legible
// — p.ej. las categorías creadas con el administrador de categorías). Si no hay ninguna
// definición que matchee (dato legacy/huérfano), muestra el valor guardado tal cual en vez de
// romper el render.
export function getTurnoCategoryLabel(
  categoria: string | undefined | null,
  categorias: TurnoCategoriaDef[]
): string {
  const found = categorias.find((c) => c.id === categoria);
  return found ? found.label : String(categoria || "");
}

// Normaliza sacando acentos y pasando a minúsculas, para comparar nombres de categoría sin
// importar mayúsculas/acentos (p.ej. "Medicación" / "Medicacion" / "medicamentos").
export function normalizeCategoriaText(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Orden manual de categorías (menor `order` primero). Se usa tanto en el administrador de
// categorías como en el selector del formulario, para que ambos muestren siempre el mismo
// orden que el usuario definió arrastrando.
export function sortTurnoCategorias(list: TurnoCategoriaDef[]): TurnoCategoriaDef[] {
  return [...list].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
}

// Semilla con las 6 categorías que ya existían hardcodeadas antes de este selector, con el
// mismo ícono que ya se les mostraba (vía la heurística de getTurnoCategoryIcon en
// AppointmentsView.tsx) para que la migración sea 100% visualmente idéntica. El `id` de cada
// una es exactamente el string que ya se guarda en TurnoCompromiso.categoria para los
// registros existentes — nunca debe cambiar.
export const DEFAULT_TURNO_CATEGORIAS: TurnoCategoriaDef[] = [
  { id: "Compromisos", label: "Compromisos", icon: "Calendar", isDefault: true },
  { id: "Turno - Hernan", label: "Turno - Hernan", icon: "Stethoscope" },
  { id: "Turno - Modesto", label: "Turno - Modesto", icon: "Stethoscope" },
  { id: "Tramites", label: "Trámites", icon: "FileText" },
  { id: "Medicacion", label: "Medicación", icon: "Stethoscope" },
  { id: "Ocio", label: "Ocio", icon: "Sparkles" },
];
