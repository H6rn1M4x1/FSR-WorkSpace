import React, { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ArrowRightLeft, CheckCircle2, Loader2, X } from "lucide-react";
import { refetchCategory } from "../lib/firestoreSyncService";

// Banner temporal (piloto de migración Firestore -> Supabase, por sección). Se corre UNA sola
// vez desde el navegador ya logueado del usuario — usa la sesión de Firestore que la app ya
// tiene abierta, así que no necesita ninguna credencial de administrador. Borrar su uso en la
// vista correspondiente una vez confirmado que la migración de esa sección quedó bien.

interface Props {
  darkMode: boolean;
  userId: string;
  title: string;
  categories: string[];
  bulkImport: (userId: string, category: string, items: any[]) => Promise<number>;
  dismissKey: string;
}

export function MigrationBanner({ darkMode, userId, title, categories, bulkImport, dismissKey }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(dismissKey) === "1";
    } catch {
      return false;
    }
  });
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [summary, setSummary] = useState<string>("");

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {}
    setDismissed(true);
  };

  const runMigration = async () => {
    setStatus("running");
    try {
      const counts: string[] = [];
      for (const category of categories) {
        const snapshot = await getDocs(collection(db, "users", userId, category));
        const items = snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.data()?.id || docSnap.id }));
        const imported = await bulkImport(userId, category, items);
        counts.push(`${category}: ${imported}`);
        await refetchCategory(userId, category).catch(() => {});
      }
      setSummary(counts.join(" · "));
      setStatus("done");
    } catch (error: any) {
      console.error("[MigrationBanner] Error:", error);
      setSummary(error?.message || "Error desconocido");
      setStatus("error");
    }
  };

  return (
    <div
      className={`rounded-2xl border-2 border-primary p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
        darkMode ? "bg-black text-white" : "bg-white text-zinc-800"
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <ArrowRightLeft className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-primary">{title}</p>
          <p className="text-[11px] opacity-80 mt-0.5">
            {status === "done"
              ? `Listo — importado: ${summary}`
              : status === "error"
              ? `Falló: ${summary}`
              : "Copia estos datos de Firestore a Supabase. Podés correrlo las veces que quieras, no duplica datos."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={runMigration}
          disabled={status === "running"}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-primary hover:bg-primary-hover text-white dark:text-blue-950 transition-all disabled:opacity-50 cursor-pointer"
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
          className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
