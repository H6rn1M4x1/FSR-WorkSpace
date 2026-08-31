import React, { useState } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import {
  Shield,
  Key,
  CheckCircle,
  AlertTriangle,
  Lock,
  Smartphone,
} from "lucide-react";
import { verify2FAToken } from "../lib/totp";

interface TwoFactorLoginModalProps {
  isOpen: boolean;
  userEmail: string;
  secret: string;
  darkMode: boolean;
  onVerifySuccess: (trustDevice: boolean) => void;
  onDisable2FA: () => void;
}

export function TwoFactorLoginModal({
  isOpen,
  userEmail,
  secret,
  darkMode,
  onVerifySuccess,
  onDisable2FA,
}: TwoFactorLoginModalProps) {
  useLockBodyScroll(isOpen);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setErrorMsg("Ingresa los 6 dígitos del código de Google Authenticator.");
      return;
    }

    setVerifying(true);
    try {
      const isValid = await verify2FAToken(cleanCode, secret);
      if (isValid) {
        onVerifySuccess(trustDevice);
      } else {
        setErrorMsg(
          "Código de 6 dígitos incorrecto o expirado. Revisa la hora de tu teléfono y vuelve a intentar.",
        );
      }
    } catch (err) {
      console.error("Error al verificar 2FA:", err);
      setErrorMsg("Ocurrió un error al validar el código. Intenta nuevamente.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 ${
          darkMode
            ? "bg-zinc-950 border-zinc-800 text-zinc-100"
            : "bg-white border-zinc-200 text-zinc-900"
        }`}
      >
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-4 rounded-3xl bg-primary text-white dark:text-blue-950 shadow-xl shadow-primary/20 ring-8 ring-primary/20">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Verificación de Seguridad (2FA)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Ingresa el código de 6 dígitos de tu app{" "}
              <b>Google Authenticator</b> para acceder a FSR - Workspace.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary-container text-primary dark:text-primary border border-primary/30 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />{" "}
            {userEmail || "hernanmaximiliano10@gmail.com"}
          </span>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Código de Seguridad (6 dígitos)</span>
              <span className="text-[10px] text-zinc-400 font-normal">
                Google Authenticator / Authy
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full py-3.5 px-4 rounded-2xl border border-slate-300 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-center font-mono text-2xl font-black tracking-[0.5em] text-primary dark:text-primary focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-normal"
              />
              <Key className="w-5 h-5 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-start gap-2.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Trust Device Option */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 flex items-start gap-3">
            <input
              type="checkbox"
              id="trustDeviceCheck"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700 cursor-pointer"
            />
            <label
              htmlFor="trustDeviceCheck"
              className="text-xs cursor-pointer leading-tight"
            >
              <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                Confiar en este dispositivo por 30 días
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                No se volverá a solicitar el código de 2FA en este navegador
                durante un mes.
              </span>
            </label>
          </div>

          {/* Emergency / Reset Option */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={onDisable2FA}
              className="text-xs text-zinc-500 hover:text-primary dark:hover:text-primary underline font-semibold transition-all cursor-pointer"
            >
              ¿Aún no configuraste Google Authenticator? Desactivar 2FA e
              Ingresar
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={verifying || code.trim().length !== 6}
            className="w-full py-3.5 rounded-full bg-primary hover:bg-primary disabled:opacity-50 text-white dark:text-blue-950 font-extrabold text-sm shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {verifying ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verificando...</span>
              </span>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Verificar e Ingresar</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-200 dark:border-zinc-800">
          <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Sincronizado con Google Authenticator</span>
          </p>
        </div>
      </div>
    </div>
  );
}
