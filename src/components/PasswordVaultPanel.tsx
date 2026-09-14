import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  KeyRound,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Dices,
  X,
  Upload,
  Search,
} from "lucide-react";
import { useVault } from "../hooks/useVault";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { verify2FAToken } from "../lib/totp";
import { useToast } from "../context/ToastContext";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  generateStrongPassword,
  estimatePasswordStrength,
  type PasswordGeneratorOptions,
} from "../lib/vaultCrypto";
import type { VaultItemDecrypted } from "../types";

interface PasswordVaultPanelProps {
  userId: string;
  darkMode?: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string;
}

const REVEAL_MS = 5 * 60 * 1000; // an unlocked password auto-hides itself after 5 minutes

const CARD =
  "p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 space-y-4";
const INPUT =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none";
const BTN_PRIMARY =
  "px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50";
const BTN_GHOST =
  "px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5";

function clipboardCopy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
  // Clear the clipboard automatically after 20s so a copied password doesn't linger.
  setTimeout(() => {
    navigator.clipboard?.readText().then((current) => {
      if (current === text) navigator.clipboard.writeText("").catch(() => {});
    }).catch(() => {});
  }, 20000);
}

/**
 * Parses a CSV export of saved passwords (the format Chrome, Edge and Firefox all produce
 * from their own "Export passwords" button — the standard, interoperable way to move
 * passwords between password managers, since no browser lets a website read its password
 * store directly). Column names vary a bit between browsers, so headers are matched loosely.
 */
interface ImportedPasswordRow {
  site: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      fields.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  fields.push(field);
  return fields;
}

function siteNameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || url;
  } catch (_) {
    return url;
  }
}

function parsePasswordsCsv(text: string): ImportedPasswordRow[] {
  // Split on real line breaks only (quoted fields in this format don't legitimately
  // contain newlines for passwords/urls, so this simple split is safe in practice).
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const findCol = (...names: string[]) => headers.findIndex((h) => names.includes(h));

  const nameIdx = findCol("name", "title");
  const urlIdx = findCol("url", "login_uri", "web site");
  const userIdx = findCol("username", "login", "login_username");
  const passIdx = findCol("password", "login_password");
  const noteIdx = findCol("note", "notes", "extra");

  if (passIdx === -1 || (userIdx === -1 && urlIdx === -1 && nameIdx === -1)) {
    return [];
  }

  const rows: ImportedPasswordRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const password = passIdx >= 0 ? (cols[passIdx] || "").trim() : "";
    const url = urlIdx >= 0 ? (cols[urlIdx] || "").trim() : "";
    const rawName = nameIdx >= 0 ? (cols[nameIdx] || "").trim() : "";
    const site = rawName || (url ? siteNameFromUrl(url) : "");
    const username = userIdx >= 0 ? (cols[userIdx] || "").trim() : "";
    const notes = noteIdx >= 0 ? (cols[noteIdx] || "").trim() : "";
    if (!password || !site) continue; // skip incomplete rows instead of failing the whole import
    rows.push({ site, username, password, url, notes });
  }
  return rows;
}

export function PasswordVaultPanel({
  userId,
  darkMode = false,
  twoFactorEnabled,
  twoFactorSecret,
}: PasswordVaultPanelProps) {
  const vault = useVault(userId);
  const { showToast } = useToast();
  const [masterPwInput, setMasterPwInput] = useState("");
  const [confirmPwInput, setConfirmPwInput] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [usingRecovery, setUsingRecovery] = useState<boolean | "reset-password">(false);
  const [newRecoveryPhrase, setNewRecoveryPhrase] = useState<string | null>(null);
  const [savedPhraseConfirmed, setSavedPhraseConfirmed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<Partial<VaultItemDecrypted> | null>(null);
  const [showPasswordInForm, setShowPasswordInForm] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [totpGateFor, setTotpGateFor] = useState<{
    id: string;
    action: "reveal" | "copy" | "disable-gate";
  } | null>(null);
  const [totpCodeInput, setTotpCodeInput] = useState("");
  const [totpError, setTotpError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Import from a browser's "Export passwords" CSV file.
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ImportedPasswordRow[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Freeze the page behind whichever modal is open, so the background never scrolls
  // (and drags along) while one of these is up.
  useLockBodyScroll(Boolean(editingItem || totpGateFor || deleteConfirmId || pendingImport));

  // Search + pagination (same 15-per-page pattern used elsewhere in the app), so a large
  // vault doesn't render/decrypt hundreds of items onto the screen at once.
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultPage, setVaultPage] = useState(1);
  const VAULT_PAGE_SIZE = 15;

  // Auto-hide timers per revealed item id, so "ver contraseña" only lasts 5 minutes
  // before it hides itself again (independent of the vault's own unlock state).
  const revealTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const timers = revealTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const hideItem = (id: string) => {
    if (revealTimersRef.current[id]) {
      clearTimeout(revealTimersRef.current[id]);
      delete revealTimersRef.current[id];
    }
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const showItem = (id: string) => {
    if (revealTimersRef.current[id]) clearTimeout(revealTimersRef.current[id]);
    revealTimersRef.current[id] = setTimeout(() => {
      delete revealTimersRef.current[id];
      setRevealedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, REVEAL_MS);
    setRevealedIds((prev) => new Set(prev).add(id));
  };

  const strength = editingItem?.password ? estimatePasswordStrength(editingItem.password) : null;

  const handleSetup = async () => {
    setLocalError(null);
    if (masterPwInput.length < 8) {
      setLocalError("La clave maestra debe tener al menos 8 caracteres.");
      return;
    }
    if (masterPwInput !== confirmPwInput) {
      setLocalError("Las claves no coinciden.");
      return;
    }
    const result = await vault.setupVault(masterPwInput);
    if (result) {
      setNewRecoveryPhrase(result.recoveryPhrase);
      setMasterPwInput("");
      setConfirmPwInput("");
    }
  };

  const handleUnlock = async () => {
    setLocalError(null);
    if (usingRecovery) {
      const ok = await vault.unlockWithRecoveryPhrase(recoveryInput);
      if (!ok) return;
      setRecoveryInput("");
      // Force setting a fresh master password since they had to use the recovery phrase.
      setEditingItem(null);
      setMasterPwInput("");
      setConfirmPwInput("");
      setUsingRecovery("reset-password"); // repurpose to show reset form below
    } else {
      await vault.unlockWithPassword(masterPwInput);
      setMasterPwInput("");
    }
  };

  const handleResetPasswordAfterRecovery = async () => {
    setLocalError(null);
    if (masterPwInput.length < 8) {
      setLocalError("La nueva clave maestra debe tener al menos 8 caracteres.");
      return;
    }
    if (masterPwInput !== confirmPwInput) {
      setLocalError("Las claves no coinciden.");
      return;
    }
    const ok = await vault.changeMasterPassword(masterPwInput);
    if (ok) {
      setUsingRecovery(false);
      setMasterPwInput("");
      setConfirmPwInput("");
    }
  };

  const requestReveal = (id: string) => {
    if (vault.config?.requireTotpToReveal && twoFactorEnabled) {
      setTotpGateFor({ id, action: "reveal" });
      setTotpCodeInput("");
      setTotpError(null);
    } else {
      showItem(id);
    }
  };

  const requestCopy = (id: string, password: string) => {
    if (vault.config?.requireTotpToReveal && twoFactorEnabled) {
      setTotpGateFor({ id, action: "copy" });
      setTotpCodeInput("");
      setTotpError(null);
    } else {
      clipboardCopy(password);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const confirmTotpGate = async () => {
    if (!totpGateFor) return;
    const ok = await verify2FAToken(totpCodeInput, twoFactorSecret);
    if (!ok) {
      setTotpError("Código incorrecto o expirado.");
      return;
    }
    if (totpGateFor.action === "reveal") {
      const item = vault.items.find((i) => i.id === totpGateFor.id);
      showItem(totpGateFor.id);
      showToast(`Mostrando la contraseña de ${item?.site || "este sitio"} durante 5 minutos.`, "success");
    } else if (totpGateFor.action === "copy") {
      const item = vault.items.find((i) => i.id === totpGateFor.id);
      if (item) {
        clipboardCopy(item.password);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 1500);
      }
    } else if (totpGateFor.action === "disable-gate") {
      await vault.setRequireTotpToReveal(false);
      showToast("Verificación con Google Authenticator desactivada para revelar contraseñas.", "success");
    }
    setTotpGateFor(null);
    setTotpCodeInput("");
  };

  const handleToggleRequireTotp = async (checked: boolean) => {
    if (checked) {
      await vault.setRequireTotpToReveal(true);
      showToast("Verificación con Google Authenticator activada para ver o copiar contraseñas.", "success");
    } else {
      // Disabling this protection is itself sensitive, so it requires a live 2FA code too.
      setTotpGateFor({ id: "", action: "disable-gate" });
      setTotpCodeInput("");
      setTotpError(null);
    }
  };

  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      const rows = parsePasswordsCsv(text);
      if (rows.length === 0) {
        setImportError(
          "No se encontraron contraseñas válidas en ese archivo. Exportalo desde tu navegador (Chrome/Edge/Firefox: Contraseñas → Exportar contraseñas) y probá de nuevo."
        );
        return;
      }
      setPendingImport(rows);
    } catch (err: any) {
      setImportError("No se pudo leer el archivo: " + (err?.message || String(err)));
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setImporting(true);
    let ok = 0;
    for (let i = 0; i < pendingImport.length; i++) {
      const row = pendingImport[i];
      try {
        await vault.saveItem({
          id: `vault_import_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          site: row.site,
          username: row.username,
          password: row.password,
          url: row.url,
          notes: row.notes,
        });
        ok++;
      } catch (_) {
        // keep going with the rest of the batch
      }
    }
    setImporting(false);
    setPendingImport(null);
    showToast(
      ok === pendingImport.length
        ? `Se importaron ${ok} contraseña${ok === 1 ? "" : "s"} correctamente.`
        : `Se importaron ${ok} de ${pendingImport.length} contraseñas (algunas fallaron).`,
      ok > 0 ? "success" : "error"
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    const item = vault.items.find((i) => i.id === deleteConfirmId);
    hideItem(deleteConfirmId); // clears any pending auto-hide timer for the deleted item
    await vault.deleteItem(deleteConfirmId);
    showToast(`Se eliminó la contraseña de ${item?.site || "el sitio"} correctamente.`, "success");
  };

  const handleSaveItem = async () => {
    if (!editingItem?.site?.trim() || !editingItem?.password) return;
    await vault.saveItem({
      id: editingItem.id || `vault_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      site: editingItem.site.trim(),
      username: editingItem.username?.trim() || "",
      password: editingItem.password,
      url: editingItem.url?.trim() || "",
      notes: editingItem.notes?.trim() || "",
      createdAt: editingItem.createdAt,
    });
    setEditingItem(null);
  };

  const genOptions: PasswordGeneratorOptions = {
    length: 20,
    useUpper: true,
    useLower: true,
    useDigits: true,
    useSymbols: true,
  };

  // Smart search: splits the query into words and requires every word to appear somewhere
  // in the item (site, usuario, URL or notas) — so "netflix hernan" finds the Netflix entry
  // for that specific account, in any word order, without needing an exact phrase match.
  const sortedItems = useMemo(
    () => vault.items.slice().sort((a, b) => a.site.localeCompare(b.site)),
    [vault.items]
  );
  const filteredVaultItems = useMemo(() => {
    const terms = vaultSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return sortedItems;
    return sortedItems.filter((item) => {
      const haystack = `${item.site} ${item.username} ${item.url || ""} ${item.notes || ""}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [sortedItems, vaultSearch]);
  const vaultTotalPages = Math.max(1, Math.ceil(filteredVaultItems.length / VAULT_PAGE_SIZE));
  const safeVaultPage = Math.min(vaultPage, vaultTotalPages);
  const paginatedVaultItems = useMemo(() => {
    const start = (safeVaultPage - 1) * VAULT_PAGE_SIZE;
    return filteredVaultItems.slice(start, start + VAULT_PAGE_SIZE);
  }, [filteredVaultItems, safeVaultPage]);
  useEffect(() => {
    setVaultPage(1);
  }, [vaultSearch]);

  // ---------- NOT SET UP ----------
  if (vault.status === "not_setup") {
    return (
      <div className={CARD}>
        <div className="flex items-center gap-3">
          <KeyRound className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
              Caja Fuerte de Contraseñas
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Guardá las contraseñas de otros sitios, cifradas de punta a punta. Ni el servidor
              ni nadie más puede leerlas — solo vos, con tu clave maestra.
            </p>
          </div>
        </div>

        {!newRecoveryPhrase ? (
          <div className="space-y-3 max-w-md">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Clave maestra (mín. 8 caracteres)</label>
              <input
                type="password"
                value={masterPwInput}
                onChange={(e) => setMasterPwInput(e.target.value)}
                className={INPUT}
                placeholder="Clave maestra nueva"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Confirmar clave maestra</label>
              <input
                type="password"
                value={confirmPwInput}
                onChange={(e) => setConfirmPwInput(e.target.value)}
                className={INPUT}
                placeholder="Repetí la clave"
                autoComplete="new-password"
              />
            </div>
            {(localError || vault.error) && (
              <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {localError || vault.error}
              </p>
            )}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Importante: esta clave <b>no se guarda en ningún lado</b>. Si la olvidás, vas a
              necesitar la frase de recuperación de 12 palabras que te vamos a mostrar después.
            </p>
            <button type="button" onClick={handleSetup} className={BTN_PRIMARY}>
              <ShieldCheck className="w-4 h-4" />
              <span>Crear Caja Fuerte</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-md">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Guardá esta frase de recuperación ahora
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                Es la única forma de recuperar el acceso si olvidás tu clave maestra. Anotala en
                papel o en un lugar seguro — no la vamos a volver a mostrar.
              </p>
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 font-mono text-sm font-bold text-primary text-center leading-relaxed">
                {newRecoveryPhrase}
              </div>
              <button
                type="button"
                onClick={() => clipboardCopy(newRecoveryPhrase)}
                className={BTN_GHOST}
              >
                <Copy className="w-3.5 h-3.5" /> Copiar frase
              </button>
            </div>
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={savedPhraseConfirmed}
                onChange={(e) => setSavedPhraseConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Ya guardé mi frase de recuperación en un lugar seguro.
              </span>
            </label>
            <button
              type="button"
              disabled={!savedPhraseConfirmed}
              onClick={() => {
                setNewRecoveryPhrase(null);
                setSavedPhraseConfirmed(false);
              }}
              className={BTN_PRIMARY}
            >
              <Check className="w-4 h-4" /> Listo, continuar
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------- LOCKED ----------
  if (vault.status === "locked") {
    const resettingAfterRecovery = usingRecovery === "reset-password";
    return (
      <div className={CARD}>
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
              Caja Fuerte de Contraseñas (Bloqueada)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Ingresá tu clave maestra para desbloquear.
            </p>
          </div>
        </div>

        {resettingAfterRecovery ? (
          <div className="space-y-3 max-w-md">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Frase de recuperación válida. Definí una nueva clave maestra.
            </p>
            <input
              type="password"
              value={masterPwInput}
              onChange={(e) => setMasterPwInput(e.target.value)}
              className={INPUT}
              placeholder="Nueva clave maestra"
              autoComplete="new-password"
            />
            <input
              type="password"
              value={confirmPwInput}
              onChange={(e) => setConfirmPwInput(e.target.value)}
              className={INPUT}
              placeholder="Repetir nueva clave"
              autoComplete="new-password"
            />
            {(localError || vault.error) && (
              <p className="text-xs font-bold text-red-600 dark:text-red-400">{localError || vault.error}</p>
            )}
            <button type="button" onClick={handleResetPasswordAfterRecovery} className={BTN_PRIMARY}>
              <ShieldCheck className="w-4 h-4" /> Guardar nueva clave
            </button>
          </div>
        ) : !usingRecovery ? (
          <div className="space-y-3 max-w-md">
            <input
              type="password"
              value={masterPwInput}
              onChange={(e) => setMasterPwInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className={INPUT}
              placeholder="Clave maestra"
              autoComplete="current-password"
              autoFocus
            />
            {(localError || vault.error) && (
              <p className="text-xs font-bold text-red-600 dark:text-red-400">{localError || vault.error}</p>
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleUnlock} className={BTN_PRIMARY}>
                <Unlock className="w-4 h-4" /> Desbloquear
              </button>
              <button
                type="button"
                onClick={() => setUsingRecovery(true)}
                className="text-xs text-zinc-500 hover:text-primary underline font-semibold"
              >
                Olvidé mi clave maestra
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-md">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Frase de recuperación (12 palabras)
            </label>
            <textarea
              value={recoveryInput}
              onChange={(e) => setRecoveryInput(e.target.value)}
              className={INPUT}
              rows={2}
              placeholder="palabra1 palabra2 palabra3 ..."
            />
            {(localError || vault.error) && (
              <p className="text-xs font-bold text-red-600 dark:text-red-400">{localError || vault.error}</p>
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleUnlock} className={BTN_PRIMARY}>
                <Unlock className="w-4 h-4" /> Usar frase de recuperación
              </button>
              <button
                type="button"
                onClick={() => setUsingRecovery(false)}
                className="text-xs text-zinc-500 hover:text-primary underline font-semibold"
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- UNLOCKED ----------
  if (vault.status === "unlocked") {
    return (
      <div className={CARD}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Unlock className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                Caja Fuerte de Contraseñas
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {vault.items.length} {vault.items.length === 1 ? "contraseña guardada" : "contraseñas guardadas"}. Cifrado de punta a punta.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => vault.lock()} className={BTN_GHOST}>
              <Lock className="w-3.5 h-3.5" /> Bloquear
            </button>
            <button
              type="button"
              onClick={() => importFileInputRef.current?.click()}
              className={BTN_GHOST}
              title="Importar contraseñas exportadas desde tu navegador (Chrome, Edge, Firefox)"
            >
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportFileSelected}
            />
            <button
              type="button"
              onClick={() =>
                setEditingItem({ site: "", username: "", password: "", url: "", notes: "" })
              }
              className={BTN_PRIMARY}
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
        </div>

        {importError && (
          <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {importError}
          </p>
        )}

        {/* 2FA reveal-gate toggle */}
        <label
          className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
            twoFactorEnabled
              ? "border-slate-200 dark:border-zinc-800 cursor-pointer"
              : "border-slate-200 dark:border-zinc-800 opacity-60"
          }`}
        >
          <input
            type="checkbox"
            checked={!!vault.config?.requireTotpToReveal}
            disabled={!twoFactorEnabled}
            onChange={(e) => handleToggleRequireTotp(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
              Pedir código de Google Authenticator para ver o copiar una contraseña
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
              {twoFactorEnabled
                ? "Capa extra: aunque la caja esté desbloqueada, cada revelado pide el código de 6 dígitos y se vuelve a ocultar solo a los 5 minutos."
                : "Activá primero el 2FA (arriba en esta misma pestaña) para poder usar esta opción."}
            </span>
          </span>
        </label>

        {/* Search */}
        {vault.items.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input
              type="text"
              value={vaultSearch}
              onChange={(e) => setVaultSearch(e.target.value)}
              placeholder="Buscar por sitio, usuario, URL o notas..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
            />
          </div>
        )}

        {/* Items list */}
        <div className="space-y-2">
          {vault.items.length === 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-6">
              Todavía no guardaste ninguna contraseña.
            </p>
          )}
          {vault.items.length > 0 && filteredVaultItems.length === 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-6">
              Ninguna contraseña coincide con "{vaultSearch}".
            </p>
          )}
          {paginatedVaultItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {item.site}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{item.username}</p>
                  <p className="text-xs font-mono mt-1 text-zinc-700 dark:text-zinc-300">
                    {revealedIds.has(item.id) ? item.password : "••••••••••••"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      revealedIds.has(item.id) ? hideItem(item.id) : requestReveal(item.id)
                    }
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500"
                    title="Mostrar/ocultar"
                  >
                    {revealedIds.has(item.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestCopy(item.id, item.password)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500"
                    title="Copiar contraseña"
                  >
                    {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem(item)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-500"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>

        {vaultTotalPages > 1 && (
          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>
              Mostrando {paginatedVaultItems.length} de {filteredVaultItems.length} contraseñas (Página {safeVaultPage} de {vaultTotalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safeVaultPage === 1}
                onClick={() => setVaultPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={safeVaultPage === vaultTotalPages}
                onClick={() => setVaultPage((p) => Math.min(vaultTotalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all font-bold cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* Add/Edit modal — portaled to <body> so it's fixed to the real viewport, not to
            whatever animated (transformed) ancestor happens to wrap this panel. */}
        {editingItem && createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div
              className={`w-full max-w-md rounded-2xl border p-5 space-y-3 ${
                darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm">
                  {editingItem.id ? "Editar contraseña" : "Nueva contraseña"}
                </h4>
                <button type="button" onClick={() => setEditingItem(null)} className="p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                className={INPUT}
                placeholder="Sitio (ej. Netflix)"
                value={editingItem.site || ""}
                onChange={(e) => setEditingItem({ ...editingItem, site: e.target.value })}
              />
              <input
                className={INPUT}
                placeholder="Usuario / email"
                value={editingItem.username || ""}
                onChange={(e) => setEditingItem({ ...editingItem, username: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <input
                  type={showPasswordInForm ? "text" : "password"}
                  className={INPUT}
                  placeholder="Contraseña"
                  value={editingItem.password || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordInForm((v) => !v)}
                  className="p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 shrink-0"
                >
                  {showPasswordInForm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  title="Generar contraseña fuerte"
                  onClick={() =>
                    setEditingItem({ ...editingItem, password: generateStrongPassword(genOptions) })
                  }
                  className="p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 shrink-0"
                >
                  <Dices className="w-4 h-4" />
                </button>
              </div>
              {strength && (
                <p
                  className={`text-[10px] font-bold ${
                    strength.score >= 3 ? "text-emerald-500" : strength.score >= 2 ? "text-amber-500" : "text-red-500"
                  }`}
                >
                  Seguridad: {strength.label}
                </p>
              )}
              <input
                className={INPUT}
                placeholder="URL (opcional)"
                value={editingItem.url || ""}
                onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
              />
              <textarea
                className={INPUT}
                placeholder="Notas (opcional)"
                rows={2}
                value={editingItem.notes || ""}
                onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
              />
              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={handleSaveItem} className={BTN_PRIMARY}>
                  <Check className="w-4 h-4" /> Guardar
                </button>
                <button type="button" onClick={() => setEditingItem(null)} className={BTN_GHOST}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* TOTP reveal gate — also portaled, same reason as above. */}
        {totpGateFor && createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div
              className={`w-full max-w-sm rounded-2xl border p-5 space-y-3 ${
                darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h4 className="font-extrabold text-sm">Confirmá con Google Authenticator</h4>
              </div>
              {totpGateFor.action === "disable-gate" && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Para desactivar el pedido de código al revelar contraseñas, ingresá tu código
                  de Google Authenticator una última vez.
                </p>
              )}
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={totpCodeInput}
                onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && confirmTotpGate()}
                placeholder="000000"
                className={`${INPUT} text-center font-mono text-xl tracking-[0.4em]`}
              />
              {totpError && <p className="text-xs font-bold text-red-600 dark:text-red-400">{totpError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirmTotpGate}
                  disabled={totpCodeInput.length !== 6}
                  className={BTN_PRIMARY}
                >
                  <Check className="w-4 h-4" /> Confirmar
                </button>
                <button type="button" onClick={() => setTotpGateFor(null)} className={BTN_GHOST}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        <ConfirmationModal
          isOpen={!!deleteConfirmId}
          title="Eliminar contraseña"
          message="¿Seguro que querés eliminar esta contraseña guardada? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          darkMode={darkMode}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={handleConfirmDelete}
        />

        <ConfirmationModal
          isOpen={!!pendingImport}
          title="Importar contraseñas"
          message={`Se encontraron ${pendingImport?.length || 0} contraseña${
            pendingImport?.length === 1 ? "" : "s"
          } en el archivo. Se van a agregar a tu caja fuerte, cifradas igual que las demás. ¿Confirmás?`}
          confirmText={importing ? "Importando..." : "Importar"}
          cancelText="Cancelar"
          darkMode={darkMode}
          onClose={() => !importing && setPendingImport(null)}
          onConfirm={handleConfirmImport}
        />
      </div>
    );
  }

  // ---------- LOADING ----------
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <RefreshCw className="w-4 h-4 animate-spin" /> Cargando caja fuerte...
      </div>
    </div>
  );
}
