import React, { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ArrowRightLeft, CheckCircle2, Loader2, X } from "lucide-react";
import { bulkImportFromFirestore, SUPABASE_MIGRATED_CATEGORIES } from "../lib/supabaseTurnosSync";
import { refetchCategory } from "../lib/firestoreSyncService";

// Botón temporal (piloto de migración Firestore -> Supabase, sección Turnos). Se corre UNA
// sola vez desde el navegador ya logueado del usuario — usa la sesión de Firestore que la app
// ya tiene abierta, así que no necesita ninguna credencial de administrador. Borrar este
// archivo y su uso en AppointmentsView.tsx una vez confirmado que la migración quedó bien.

const DISMISSED_KEY = "turnos_migration_dismissed";

interface Props {
  darkMode: boolean;
  userId: string;
}

export function MigrateTurnosBanner({ darkMode, userId }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [summary, setSummary] = useState<string>("");

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  const runMigration = async () => {
    setStatus("running");
    try {
      const counts: string[] = [];
      for (const category of SUPABASE_MIGRATED_CATEGORIES) {
        const snapshot = await getDocs(collection(db, "users", userId, category));
        const items = snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.data()?.id || docSnap.id }));
        const imported = await bulkImportFromFirestore(userId, category, items);
        counts.push(`${category}: ${imported}`);
        await refetchCategory(userId, category).catch(() => {});
      }
      setSummary(counts.join(" · "));
      setStatus("done");
    } catch (error: any) {
      console.error("[MigrateTurnosBanner] Error:", error);
      setSummary(error?.message || "Error desconocido");
      setStatus("error");
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
        darkMode ? "bg-amber-500/10 border-amber-500/30 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <ArrowRightLeft className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-extrabold">Migración piloto a Supabase (Turnos)</p>
          <p className="text-[11px] opacity-80 mt-0.5">
            {status === "done"
              ? `Listo — importado: ${summary}`
              : status === "error"
              ? `Falló: ${summary}`
              : "Copia tus turnos, compromisos, categorías, agenda y libro de direcciones de Firestore a Supabase. Podés correrlo las veces que quieras, no duplica datos."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={runMigration}
          disabled={status === "running"}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-amber-500 text-black hover:bg-amber-400 transition-all disabled:opacity-50 cursor-pointer"
        >
          {status === "running" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : status === "done" ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : null}
          {status === "running" ? "Migrando..." : status === "done" ? "Migrar de nuevo" : "Migrar ahora"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          title="Ocultar"
          className="p-2 rounded-xl text-amber-700 dark:text-amber-200 hover:bg-amber-500/20 transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
