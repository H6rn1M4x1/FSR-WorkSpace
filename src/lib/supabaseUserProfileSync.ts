import { createCategorySync, put, Row, TableConfig } from "./supabaseCategorySync";

/**
 * Piloto de migración Firebase -> Supabase, "user_profile" (Ajustes & Configuración de
 * Usuario, ver UserSettingsModal.tsx). Mismo patrón que Turnos/Finanzas/Universidad/Salud/
 * Comidas/Notas/Caja Fuerte (ver supabaseTurnosSync.ts). Reemplaza, solo para esta categoría,
 * el backend de firestoreSyncService.ts.
 *
 * A diferencia de las otras categorías, acá siempre hay UNA sola fila por usuario (id ==
 * user_id, el email) — es un doc de configuración, no una lista de ítems — pero el motor
 * genérico (createCategorySync) funciona igual para ese caso.
 */

const TABLES: Record<string, TableConfig> = {
  user_profile: {
    table: "user_profile",
    toRow: (item, userId) => ({
      id: String(item.id ?? userId),
      user_id: userId,
      display_name: item.displayName ?? null,
      email: item.email ?? null,
      photo_url: item.photoURL ?? null,
      username: item.username ?? null,
      phone_number: item.phoneNumber ?? null,
      address: item.address ?? null,
      lat: item.lat ?? null,
      lon: item.lon ?? null,
      city: item.city ?? null,
      province: item.province ?? null,
      country: item.country ?? null,
      postal_code: item.postalCode ?? null,
      occupation: item.occupation ?? null,
      two_factor_enabled: !!item.twoFactorEnabled,
      two_factor_secret: item.twoFactorSecret ?? null,
      birth_date: item.birthDate ?? null,
      age: item.age != null ? String(item.age) : null,
      gender: item.gender ?? null,
      weight_kg: item.weightKg != null ? String(item.weightKg) : null,
      height_cm: item.heightCm != null ? String(item.heightCm) : null,
      blood_type: item.bloodType ?? null,
      allergies: item.allergies ?? null,
      chronic_conditions: item.chronicConditions ?? null,
      medications_summary: item.medicationsSummary ?? null,
      emergency_contact_name: item.emergencyContactName ?? null,
      emergency_contact_phone: item.emergencyContactPhone ?? null,
      activity_level: item.activityLevel ?? null,
      health_insurance: item.healthInsurance ?? null,
      organ_donor: item.organDonor ?? null,
      health_notes: item.healthNotes ?? null,
      whatsapp_phone_number: item.whatsappPhoneNumber ?? null,
      whatsapp_api_key: item.whatsappApiKey ?? null,
      favorite_team: item.favoriteTeam ?? null,
      created_at_client: item.createdAt ?? null,
      updated_at_client: item.updatedAt ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id };
      put(out, "displayName", row.display_name);
      put(out, "email", row.email);
      put(out, "photoURL", row.photo_url);
      put(out, "username", row.username);
      put(out, "phoneNumber", row.phone_number);
      put(out, "address", row.address);
      put(out, "lat", row.lat);
      put(out, "lon", row.lon);
      put(out, "city", row.city);
      put(out, "province", row.province);
      put(out, "country", row.country);
      put(out, "postalCode", row.postal_code);
      put(out, "occupation", row.occupation);
      out.twoFactorEnabled = !!row.two_factor_enabled;
      put(out, "twoFactorSecret", row.two_factor_secret);
      put(out, "birthDate", row.birth_date);
      put(out, "age", row.age);
      put(out, "gender", row.gender);
      put(out, "weightKg", row.weight_kg);
      put(out, "heightCm", row.height_cm);
      put(out, "bloodType", row.blood_type);
      put(out, "allergies", row.allergies);
      put(out, "chronicConditions", row.chronic_conditions);
      put(out, "medicationsSummary", row.medications_summary);
      put(out, "emergencyContactName", row.emergency_contact_name);
      put(out, "emergencyContactPhone", row.emergency_contact_phone);
      put(out, "activityLevel", row.activity_level);
      put(out, "healthInsurance", row.health_insurance);
      put(out, "organDonor", row.organ_donor);
      put(out, "healthNotes", row.health_notes);
      put(out, "whatsappPhoneNumber", row.whatsapp_phone_number);
      put(out, "whatsappApiKey", row.whatsapp_api_key);
      put(out, "favoriteTeam", row.favorite_team);
      put(out, "createdAt", row.created_at_client);
      put(out, "updatedAt", row.updated_at_client);
      return out;
    },
  },
};

const sync = createCategorySync(TABLES);

export const SUPABASE_MIGRATED_CATEGORIES = sync.SUPABASE_MIGRATED_CATEGORIES;
export const refetchCategorySupabase = sync.refetchCategorySupabase;
export const saveItemToSupabase = sync.saveItemToSupabase;
export const deleteItemFromSupabase = sync.deleteItemFromSupabase;
export const subscribeToCategorySupabase = sync.subscribeToCategorySupabase;
export const bulkImportFromFirestore = sync.bulkImportFromFirestore;
