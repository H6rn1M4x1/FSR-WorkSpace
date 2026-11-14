import { createCategorySync, put, Row, TableConfig } from "./supabaseCategorySync";

/**
 * Piloto de migración Firebase -> Supabase, sección Comidas (mismo patrón que Turnos,
 * Finanzas, Universidad y Salud — ver supabaseTurnosSync.ts). Reemplaza, solo para estas 7
 * categorías, el backend de firestoreSyncService.ts.
 */

const TABLES: Record<string, TableConfig> = {
  pantry: {
    table: "pantry",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      name: item.name ?? null,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      min_quantity: item.minQuantity ?? null,
      expiration_date: item.expirationDate ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, name: row.name ?? "", quantity: row.quantity ?? 0, unit: row.unit ?? "", minQuantity: row.min_quantity ?? 0 };
      put(out, "expirationDate", row.expiration_date);
      return out;
    },
  },
  meals: {
    table: "meals",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      day: item.day ?? null,
      breakfast: item.breakfast ?? null,
      lunch: item.lunch ?? null,
      dinner: item.dinner ?? null,
      snack: item.snack ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, day: row.day ?? "", breakfast: row.breakfast ?? "", lunch: row.lunch ?? "", dinner: row.dinner ?? "" };
      put(out, "snack", row.snack);
      return out;
    },
  },
  shopping: {
    table: "shopping",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      name: item.name ?? null,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      checked: !!item.checked,
    }),
    fromRow: (row) => ({
      id: row.id,
      name: row.name ?? "",
      quantity: row.quantity ?? 0,
      unit: row.unit ?? "",
      checked: !!row.checked,
    }),
  },
  mercaderia: {
    table: "mercaderia",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      ingredientes: item.ingredientes ?? null,
      categoria: item.categoria ?? null,
      sector: item.sector ?? null,
      comercio: item.comercio ?? null,
      unidad_medida: item.unidadMedida ?? null,
      precio: item.precio ?? null,
      calorias: item.calorias ?? null,
      valores_nutricionales: item.valoresNutricionales ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, ingredientes: row.ingredientes ?? "", categoria: row.categoria ?? "", sector: row.sector ?? "", comercio: row.comercio ?? "", unidadMedida: row.unidad_medida ?? "" };
      put(out, "precio", row.precio);
      put(out, "calorias", row.calorias);
      put(out, "valoresNutricionales", row.valores_nutricionales);
      return out;
    },
  },
  alimentos: {
    table: "alimentos",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      mercaderia_name: item.mercaderiaName ?? null,
      ingrediente1: item.ingrediente1 ?? null,
      cantidad1: item.cantidad1 ?? null,
      unidad1: item.unidad1 ?? null,
      ingrediente2: item.ingrediente2 ?? null,
      cantidad2: item.cantidad2 ?? null,
      unidad2: item.unidad2 ?? null,
      ingrediente3: item.ingrediente3 ?? null,
      cantidad3: item.cantidad3 ?? null,
      unidad3: item.unidad3 ?? null,
      calorias: item.calorias ?? null,
      valores_nutricionales: item.valoresNutricionales ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, mercaderiaName: row.mercaderia_name ?? "" };
      put(out, "ingrediente1", row.ingrediente1);
      put(out, "cantidad1", row.cantidad1);
      put(out, "unidad1", row.unidad1);
      put(out, "ingrediente2", row.ingrediente2);
      put(out, "cantidad2", row.cantidad2);
      put(out, "unidad2", row.unidad2);
      put(out, "ingrediente3", row.ingrediente3);
      put(out, "cantidad3", row.cantidad3);
      put(out, "unidad3", row.unidad3);
      put(out, "calorias", row.calorias);
      put(out, "valoresNutricionales", row.valores_nutricionales);
      return out;
    },
  },
  platos: {
    table: "platos",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      nombre_plato: item.nombrePlato ?? null,
      descripcion: item.descripcion ?? null,
      alimento_id1: item.alimentoId1 ?? null,
      alimento_id2: item.alimentoId2 ?? null,
      alimento_id3: item.alimentoId3 ?? null,
      calorias: item.calorias ?? null,
      imagen: item.imagen ?? null,
      ingredientes_personalizados: item.ingredientesPersonalizados ?? [],
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, nombrePlato: row.nombre_plato ?? "" };
      put(out, "descripcion", row.descripcion);
      put(out, "alimentoId1", row.alimento_id1);
      put(out, "alimentoId2", row.alimento_id2);
      put(out, "alimentoId3", row.alimento_id3);
      put(out, "calorias", row.calorias);
      put(out, "imagen", row.imagen);
      if (Array.isArray(row.ingredientes_personalizados) && row.ingredientes_personalizados.length > 0) {
        out.ingredientesPersonalizados = row.ingredientes_personalizados;
      }
      return out;
    },
  },
  organizacion_semanal: {
    table: "organizacion_semanal",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      fecha: item.fecha ?? null,
      plato_id: item.platoId ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      fecha: row.fecha ?? "",
      platoId: row.plato_id ?? "",
    }),
  },
  // Personalizaciones de la Lista de Compras (antes solo en localStorage de cada
  // dispositivo, nunca sincronizadas — ver MealsView.tsx).
  shopping_manual_items: {
    table: "shopping_manual_items",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      mercaderia_id: item.mercaderiaId ?? null,
      cantidad: item.cantidad ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      mercaderiaId: row.mercaderia_id ?? "",
      cantidad: row.cantidad ?? 0,
    }),
  },
  shopping_deleted_ingredients: {
    table: "shopping_deleted_ingredients",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      name: item.name ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      name: row.name ?? "",
    }),
  },
  shopping_checked_items: {
    table: "shopping_checked_items",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      name: item.name ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      name: row.name ?? "",
    }),
  },
};

const sync = createCategorySync(TABLES);

export const SUPABASE_MIGRATED_CATEGORIES = sync.SUPABASE_MIGRATED_CATEGORIES;
export const refetchCategorySupabase = sync.refetchCategorySupabase;
export const saveItemToSupabase = sync.saveItemToSupabase;
export const deleteItemFromSupabase = sync.deleteItemFromSupabase;
export const subscribeToCategorySupabase = sync.subscribeToCategorySupabase;
export const bulkImportFromFirestore = sync.bulkImportFromFirestore;
