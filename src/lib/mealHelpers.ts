import { PlatoItem, AlimentoItem } from "../types";

export interface MealIngredientDetail {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  alimentoName?: string;
  calories?: number;
}

/**
 * Returns a high-definition, appetizing photography URL matching the dish name or custom image.
 */
export const getMealImage = (platoName?: string, customImage?: string): string => {
  if (customImage && customImage.trim() !== "") {
    return customImage;
  }

  const name = (platoName || "").toLowerCase().trim();

  if (name.includes("croqueta")) {
    return "https://images.unsplash.com/photo-1541529086526-db283c563270?w=900&auto=format&fit=crop&q=80";
  }
  if (name.includes("milanesa") || name.includes("suprema") || name.includes("escalope")) {
    return "https://images.unsplash.com/photo-1599921841143-8190253a93bb?w=900&auto=format&fit=crop&q=80";
  }
  if (
    name.includes("fideo") ||
    name.includes("pasta") ||
    name.includes("tallarin") ||
    name.includes("ravioles") ||
    name.includes("canelones") ||
    name.includes("lasagna") ||
    name.includes("ñoqui") ||
    name.includes("gnocchi")
  ) {
    return "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&auto=format&fit=crop&q=80";
  }
  if (name.includes("arroz") || name.includes("risotto") || name.includes("paella")) {
    return "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=900&auto=format&fit=crop&q=80";
  }
  if (name.includes("papa") || name.includes("pure") || name.includes("patata") || name.includes("horno")) {
    return "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=900&auto=format&fit=crop&q=80";
  }
  if (
    name.includes("asado") ||
    name.includes("bife") ||
    name.includes("carne") ||
    name.includes("cuadril") ||
    name.includes("lomo") ||
    name.includes("costilla") ||
    name.includes("entraña") ||
    name.includes("vacio")
  ) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?w=900&auto=format&fit=crop&q=80";
  }
  if (name.includes("pollo") || name.includes("pechuga") || name.includes("pata") || name.includes("muslo")) {
    return "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=900&auto=format&fit=crop&q=80";
  }
  if (
    name.includes("ensalada") ||
    name.includes("lechuga") ||
    name.includes("tomate") ||
    name.includes("zanahoria") ||
    name.includes("verde")
  ) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&auto=format&fit=crop&q=80";
  }
  if (name.includes("guiso") || name.includes("estofado") || name.includes("lenteja") || name.includes("cazuela") || name.includes("sopa")) {
    return "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=900&auto=format&fit=crop&q=80";
  }
  if (name.includes("tortilla") || name.includes("omelette") || name.includes("huevo")) {
    return "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&auto=format&fit=crop&q=80";
  }
  if (name.includes("empanada")) {
    return "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=900&auto=format&fit=crop&q=80";
  }
  if (
    name.includes("hamburguesa") ||
    name.includes("sandwich") ||
    name.includes("lomito") ||
    name.includes("choripan") ||
    name.includes("pan")
  ) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80";
  }
  if (name.includes("pescado") || name.includes("atun") || name.includes("merluza") || name.includes("salmon")) {
    return "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900&auto=format&fit=crop&q=80";
  }
  if (name.includes("tarta") || name.includes("quiche") || name.includes("pascualina")) {
    return "https://images.unsplash.com/photo-1519869325930-281384150729?w=900&auto=format&fit=crop&q=80";
  }

  // Fallback gourmet meal presentation
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&auto=format&fit=crop&q=80";
};

/**
 * Resolves the structured ingredient breakdown for a given plato and alimentos database.
 */
export const getMealIngredients = (
  plato: PlatoItem | undefined,
  alimentos: AlimentoItem[] = []
): MealIngredientDetail[] => {
  if (!plato) return [];
  const results: MealIngredientDetail[] = [];

  const alimentoIds = [plato.alimentoId1, plato.alimentoId2, plato.alimentoId3].filter(Boolean) as string[];

  alimentoIds.forEach((aliId, idx) => {
    const ali = alimentos.find((a) => a.id === aliId);
    if (!ali) return;

    if (ali.ingrediente1) {
      results.push({
        id: `${ali.id}-ing1-${idx}`,
        name: ali.ingrediente1,
        amount: ali.cantidad1,
        unit: ali.unidad1 || "",
        alimentoName: ali.mercaderiaName,
        calories: ali.calorias,
      });
    }
    if (ali.ingrediente2) {
      results.push({
        id: `${ali.id}-ing2-${idx}`,
        name: ali.ingrediente2,
        amount: ali.cantidad2,
        unit: ali.unidad2 || "",
        alimentoName: ali.mercaderiaName,
      });
    }
    if (ali.ingrediente3) {
      results.push({
        id: `${ali.id}-ing3-${idx}`,
        name: ali.ingrediente3,
        amount: ali.cantidad3,
        unit: ali.unidad3 || "",
        alimentoName: ali.mercaderiaName,
      });
    }
    if (!ali.ingrediente1 && !ali.ingrediente2 && !ali.ingrediente3 && ali.mercaderiaName) {
      results.push({
        id: `${ali.id}-merc-${idx}`,
        name: ali.mercaderiaName,
        alimentoName: ali.mercaderiaName,
        calories: ali.calorias,
      });
    }
  });

  return results;
};
