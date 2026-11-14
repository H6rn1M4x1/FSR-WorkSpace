import React, { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Bell, ChevronDown, ChevronUp, ExternalLink, Search } from "lucide-react";
import { PaymentListener, InstalledApp } from "../lib/paymentListenerPlugin";
import { categorizeAppLabel, isSuggestedApp, cacheMonitoredAppLabels, PaymentAppGroup } from "../lib/paymentApps";

interface Props {
  darkMode: boolean;
}

const GROUP_ORDER: PaymentAppGroup[] = ["Bancos", "Billeteras y Fintech", "Exchanges de cripto", "Otras"];

/**
 * Settings de "Detección automática de pagos" (solo Android nativo): activar/desactivar,
 * otorgar el permiso especial de acceso a notificaciones, y elegir qué apps instaladas
 * monitorear. Ver usePaymentAutoLogger.ts para qué pasa con lo que detecta.
 */
export function PaymentAutoDetectSettings({ darkMode }: Props) {
  const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

  const [expanded, setExpanded] = useState(false);
  const [systemGranted, setSystemGranted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [monitored, setMonitored] = useState<Set<string>>(new Set());
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  const refreshStatus = async () => {
    try {
      const status = await PaymentListener.isEnabled();
      setSystemGranted(status.systemGranted);
      setEnabled(status.enabled);
      const pkgs = await PaymentListener.getMonitoredPackages();
      setMonitored(new Set(pkgs.packages));
    } catch (err) {
      console.error("[PaymentAutoDetectSettings] Error leyendo estado:", err);
    }
  };

  useEffect(() => {
    if (!isAndroid || !expanded) return;
    refreshStatus();
  }, [isAndroid, expanded]);

  if (!isAndroid) return null;

  const loadApps = async () => {
    if (apps) {
      setShowPicker(true);
      return;
    }
    setLoadingApps(true);
    try {
      const result = await PaymentListener.listInstalledApps();
      const sorted = [...result.apps].sort((a, b) => a.label.localeCompare(b.label));
      setApps(sorted);
      setShowPicker(true);
    } catch (err) {
      console.error("[PaymentAutoDetectSettings] Error listando apps instaladas:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  const toggleEnabled = async () => {
    const next = !enabled;
    try {
      await PaymentListener.setEnabled({ enabled: next });
      setEnabled(next);
    } catch (err) {
      console.error("[PaymentAutoDetectSettings] Error activando/desactivando:", err);
    }
  };

  const toggleApp = (pkg: string) => {
    setMonitored((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  };

  const saveMonitored = async () => {
    try {
      await PaymentListener.setMonitoredPackages({ packages: Array.from(monitored) });
      if (apps) {
        cacheMonitoredAppLabels(apps.filter((a) => monitored.has(a.packageName)));
      }
      setShowPicker(false);
    } catch (err) {
      console.error("[PaymentAutoDetectSettings] Error guardando apps monitoreadas:", err);
    }
  };

  const grouped = useMemo(() => {
    if (!apps) return [];
    const lowerSearch = search.trim().toLowerCase();
    const filtered = lowerSearch ? apps.filter((a) => a.label.toLowerCase().includes(lowerSearch)) : apps;
    const byGroup = new Map<PaymentAppGroup, InstalledApp[]>();
    filtered.forEach((app) => {
      const group = categorizeAppLabel(app.label);
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group)!.push(app);
    });
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, apps: byGroup.get(g)! }));
  }, [apps, search]);

  return (
    <div
      className={`rounded-2xl border p-4 ${
        darkMode ? "bg-zinc-900/60 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-800"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Bell className="w-4 h-4 shrink-0 text-primary" />
          <div className="min-w-0 text-left">
            <p className="text-xs font-extrabold">Detección automática de pagos</p>
            <p className="text-[11px] opacity-70">
              {enabled ? `Activada · ${monitored.size} app(s) monitoreadas` : "Desactivada"}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 text-xs">
          <p className="opacity-70">
            Lee las notificaciones de las apps que elijas (bancos, billeteras, exchanges) y registra automáticamente
            cada pago detectado en Gastos Varios, marcado como "detectado automáticamente". Es de mejor esfuerzo: el
            formato de cada notificación puede cambiar sin aviso, así que conviene revisar de vez en cuando esos
            gastos.
          </p>

          {!systemGranted && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-2">
              <p className="font-semibold">Falta otorgar el permiso especial de acceso a notificaciones.</p>
              <button
                type="button"
                onClick={() => PaymentListener.openNotificationSettings().then(refreshStatus)}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg font-extrabold bg-primary hover:bg-primary-hover text-white dark:text-blue-950 cursor-pointer"
              >
                Abrir ajustes <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Activar detección automática</span>
            <button
              type="button"
              disabled={!systemGranted}
              onClick={toggleEnabled}
              className={`w-11 h-6 rounded-full transition-colors relative disabled:opacity-40 cursor-pointer ${
                enabled ? "bg-primary" : darkMode ? "bg-zinc-700" : "bg-zinc-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Apps a monitorear ({monitored.size})</span>
            <button
              type="button"
              onClick={loadApps}
              disabled={loadingApps}
              className={`px-3 py-1.5 rounded-lg font-extrabold cursor-pointer disabled:opacity-50 ${
                darkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-white hover:bg-zinc-100 border border-zinc-200"
              }`}
            >
              {loadingApps ? "Cargando..." : "Elegir apps"}
            </button>
          </div>

          {showPicker && apps && (
            <div
              className={`rounded-xl border p-3 space-y-3 max-h-80 overflow-y-auto ${
                darkMode ? "border-zinc-700" : "border-zinc-200"
              }`}
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar app instalada..."
                  className={`w-full pl-8 pr-2 py-1.5 rounded-lg text-xs outline-none ${
                    darkMode ? "bg-zinc-800 border border-zinc-700" : "bg-white border border-zinc-200"
                  }`}
                />
              </div>

              {grouped.map(({ group, apps: groupApps }) => (
                <div key={group}>
                  <p className="font-extrabold opacity-60 uppercase text-[10px] mb-1">{group}</p>
                  <div className="space-y-1">
                    {groupApps.map((app) => (
                      <label
                        key={app.packageName}
                        className="flex items-center gap-2 py-1 cursor-pointer"
                        title={app.packageName}
                      >
                        <input
                          type="checkbox"
                          checked={monitored.has(app.packageName)}
                          onChange={() => toggleApp(app.packageName)}
                          className="accent-primary w-4 h-4 shrink-0"
                        />
                        <span className="truncate">
                          {app.label}
                          {isSuggestedApp(app.label) && <span className="text-primary"> ★</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={saveMonitored}
                className="w-full px-3 py-2 rounded-lg font-extrabold bg-primary hover:bg-primary-hover text-white dark:text-blue-950 cursor-pointer"
              >
                Guardar selección
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
