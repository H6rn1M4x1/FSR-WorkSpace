import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Bot, CheckCircle2, ExternalLink, Mic, Search } from "lucide-react";
import { JarvisAssistant, JarvisAssistantStatus } from "../lib/jarvisAssistantPlugin";

interface Props {
  darkMode: boolean;
}

/**
 * Configuración de "Jarvis", el asistente de voz de la app (solo Android nativo). v1: deja que el
 * usuario lo registre como App de asistente digital predeterminada del sistema (reemplazando a
 * Google Assistant/Gemini) y le da permiso de micrófono — la conversación en sí (entender voz,
 * buscar en internet, responder) vive del lado nativo, ver JarvisVoiceInteractionSession.java.
 *
 * Importante ser honesto acá sobre las limitaciones reales de Android, no dar a entender que se
 * puede más de lo que se puede: ninguna app externa puede tomar el botón físico de
 * encendido/bloqueo (Android lo reserva para el menú de apagado), así que Jarvis se invoca con el
 * gesto real de asistente (deslizar desde la esquina / mantener Home), no con ese botón. Tampoco
 * incluye todavía "Okey Jarvis" con el oído siempre encendido (eso implica un servicio en primer
 * plano permanente, con notificación fija, y mayor consumo de batería) — se puede agregar después
 * si se quiere.
 */
export function JarvisAssistantSettings({ darkMode }: Props) {
  const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

  const [status, setStatus] = useState<JarvisAssistantStatus | null>(null);
  const [requesting, setRequesting] = useState(false);

  const refreshStatus = async () => {
    try {
      const result = await JarvisAssistant.getStatus();
      setStatus(result);
    } catch (err) {
      console.error("[JarvisAssistantSettings] Error leyendo estado:", err);
    }
  };

  useEffect(() => {
    if (!isAndroid) return;
    refreshStatus();
  }, [isAndroid]);

  // El usuario puede cambiar el asistente predeterminado desde Ajustes sin volver a esta pantalla
  // — releer el estado real al volver a primer plano evita mostrar "Jarvis activado" cuando en los
  // hechos ya no lo es (o viceversa).
  useEffect(() => {
    if (!isAndroid) return;
    const handlePromise = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) refreshStatus();
    });
    return () => {
      handlePromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [isAndroid]);

  if (!isAndroid) {
    return (
      <div
        className={`rounded-2xl border p-5 text-xs ${
          darkMode ? "bg-zinc-900/60 border-zinc-700 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-500"
        }`}
      >
        Jarvis solo está disponible en la app de Android.
      </div>
    );
  }

  const handleRequestAssistant = async () => {
    setRequesting(true);
    try {
      const result = await JarvisAssistant.requestDefaultAssistant();
      setStatus((prev) => (prev ? { ...prev, isDefaultAssistant: result.isDefaultAssistant } : prev));
      await refreshStatus();
    } catch (err) {
      console.error("[JarvisAssistantSettings] Error pidiendo rol de asistente:", err);
    } finally {
      setRequesting(false);
    }
  };

  const handleRequestMic = async () => {
    try {
      await JarvisAssistant.requestMicPermission();
    } catch (err) {
      console.error("[JarvisAssistantSettings] Error pidiendo permiso de micrófono:", err);
    } finally {
      refreshStatus();
    }
  };

  return (
    <div
      className={`rounded-2xl border p-5 space-y-4 ${
        darkMode ? "bg-zinc-900/60 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-primary text-white dark:text-blue-950 shadow-md shrink-0">
          <Bot className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold">Asistente Inteligente (Jarvis)</p>
          <p className="text-[11px] opacity-70">
            {status?.isDefaultAssistant
              ? "Jarvis es tu asistente de voz predeterminado"
              : "Todavía no es tu asistente predeterminado"}
          </p>
        </div>
        {status?.isDefaultAssistant && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 ml-auto" />}
      </div>

      <p className="text-xs opacity-70 leading-relaxed">
        Jarvis entiende lo que le decís por voz, busca en internet si le preguntás algo, y responde
        sobre temas generales. Cuando lo configurás como asistente predeterminado, se abre encima
        de cualquier app con el mismo gesto que hoy abre a Google Assistant.
      </p>

      <div
        className={`rounded-xl border p-3 space-y-1.5 text-[11px] ${
          darkMode ? "border-zinc-700 bg-black/20" : "border-zinc-200 bg-white"
        }`}
      >
        <p className="font-bold opacity-80">Cómo invocarlo, una vez configurado:</p>
        <p className="opacity-70">
          Deslizá el dedo desde una esquina inferior de la pantalla (navegación por gestos), o
          mantené presionado el botón Home (navegación de 3 botones) — igual que hoy abrís a
          Google Assistant.
        </p>
        <p className="opacity-60 italic">
          Android no permite que ninguna app de terceros use el botón físico de encendido para
          esto — es una restricción del propio sistema, no de la app.
        </p>
      </div>

      {!status?.roleApiSupported && (
        <p className="text-[11px] opacity-60 italic">
          Tu versión de Android es anterior a Android 10: no se puede verificar automáticamente si
          Jarvis ya es tu asistente predeterminado. Elegilo a mano desde Ajustes.
        </p>
      )}

      <button
        type="button"
        onClick={handleRequestAssistant}
        disabled={requesting || !!status?.isDefaultAssistant}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs bg-primary hover:bg-primary-hover text-white dark:text-blue-950 disabled:opacity-50 cursor-pointer transition-all"
      >
        <Search className="w-3.5 h-3.5" />
        <span>
          {status?.isDefaultAssistant
            ? "Jarvis ya es tu asistente predeterminado"
            : requesting
            ? "Abriendo..."
            : "Configurar a Jarvis como asistente predeterminado"}
        </span>
      </button>

      {!status?.micPermissionGranted && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-2">
          <p className="font-semibold text-[11px]">Falta el permiso de micrófono para que Jarvis pueda escucharte.</p>
          <button
            type="button"
            onClick={handleRequestMic}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-extrabold bg-primary hover:bg-primary-hover text-white dark:text-blue-950 cursor-pointer"
          >
            <Mic className="w-3 h-3" /> Conceder
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => JarvisAssistant.openAssistantSettings()}
        className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold cursor-pointer ${
          darkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-white hover:bg-zinc-100 border border-zinc-200"
        }`}
      >
        Abrir Ajustes del sistema manualmente <ExternalLink className="w-3 h-3" />
      </button>

      <p className="text-[10px] opacity-50 italic">
        Por ahora, Jarvis todavía no puede agendar turnos, pagos o tareas directamente desde la voz
        (eso se está terminando de conectar) — sí puede responder preguntas y buscar en internet.
        Tampoco tiene todavía la palabra de activación "Okey Jarvis" con el oído siempre encendido.
      </p>
    </div>
  );
}
