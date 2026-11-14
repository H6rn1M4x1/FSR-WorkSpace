import React, { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ArrowRightLeft, CheckCircle2, Loader2, X } from "lucide-react";
import { supabase } from "../lib/supabase";

// Migración piloto puntual para Uso Compartido. A diferencia de MigrationBanner.tsx (pensado
// para categorías bajo users/{id}/...), "shared_items" y "section_links" son colecciones de
// Firestore de nivel superior — por eso este banner aparte, en vez de reusar el genérico.
// Borrar su uso en SharedSectionsManager.tsx una vez confirmado que la migración quedó bien.

interface Props {
  darkMode: boolean;
  userId: string;
}

function norm(email: string): string {
  return (email || "").trim().toLowerCase();
}

export function SharingMigrationBanner({ darkMode, userId }: Props) {
  const DISMISS_KEY = "sharing_migration_dismissed";
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [summary, setSummary] = useState<string>("");

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  const runMigration = async () => {
    setStatus("running");
    try {
      const me = norm(userId);

      // shared_items: dos consultas (dueño / destinatario), Firestore no hace OR entre campos.
      const [ownedSnap, sharedWithMeSnap] = await Promise.all([
        getDocs(query(collection(db, "shared_items"), where("ownerEmail", "==", me))),
        getDocs(query(collection(db, "shared_items"), where("sharedWithEmail", "==", me))),
      ]);
      const itemDocs = new Map<string, any>();
      [...ownedSnap.docs, ...sharedWithMeSnap.docs].forEach((d) => itemDocs.set(d.id, d.data()));
      const itemRows = Array.from(itemDocs.entries()).map(([id, data]) => ({
        id,
        owner_email: data.ownerEmail ?? null,
        shared_with_email: data.sharedWithEmail ?? null,
        category: data.category ?? null,
        item_id: data.itemId ?? null,
        item_label: data.itemLabel ?? null,
        created_at: data.createdAt ?? null,
      }));
      let itemsImported = 0;
      if (itemRows.length > 0) {
        const { error } = await supabase.from("shared_items").upsert(itemRows, { onConflict: "id" });
        if (error) throw error;
        itemsImported = itemRows.length;
      }

      // section_links: mismo criterio, dos consultas (from/to).
      const [fromSnap, toSnap] = await Promise.all([
        getDocs(query(collection(db, "section_links"), where("fromEmail", "==", me))),
        getDocs(query(collection(db, "section_links"), where("toEmail", "==", me))),
      ]);
      const linkDocs = new Map<string, any>();
      [...fromSnap.docs, ...toSnap.docs].forEach((d) => linkDocs.set(d.id, d.data()));
      const linkRows = Array.from(linkDocs.entries()).map(([id, data]) => ({
        id,
        from_email: data.fromEmail ?? null,
        to_email: data.toEmail ?? null,
        section: data.section ?? null,
        status: data.status ?? null,
        shared_db_user_id: data.sharedDbUserId ?? null,
        created_at: data.createdAt ?? null,
        updated_at: data.updatedAt ?? null,
      }));
      let linksImported = 0;
      if (linkRows.length > 0) {
        const { error } = await supabase.from("section_links").upsert(linkRows, { onConflict: "id" });
        if (error) throw error;
        linksImported = linkRows.length;
      }

      setSummary(`shared_items: ${itemsImported} · section_links: ${linksImported}`);
      setStatus("done");
    } catch (error: any) {
      console.error("[SharingMigrationBanner] Error:", error);
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
          <p className="text-xs font-extrabold text-primary">Migración piloto a Supabase (Uso Compartido)</p>
          <p className="text-[11px] opacity-80 mt-0.5">
            {status === "done"
              ? `Listo — importado: ${summary}`
              : status === "error"
              ? `Falló: ${summary}`
              : "Copia tus vínculos e ítems compartidos de Firestore a Supabase. Podés correrlo las veces que quieras, no duplica datos."}
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
