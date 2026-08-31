import React, { useState } from "react";
import { LogIn, UserPlus, ShieldAlert, Sparkles } from "lucide-react";
import { googleSignIn, emailLogin, emailRegister } from "../lib/supabase";
import Dither from "./Dither";
import PixelBlast from "./PixelBlast";
import Plasma from "./Plasma";
import Logo from "./Logo";
import Captcha from "./Captcha";

interface LoginScreenProps {
  onLoginSuccess: (user: any, token: string | null) => void;
  backgroundStyle?: "dither" | "pixelblast" | "plasma";
  darkMode?: boolean;
  themeColor?: string;
}

export default function LoginScreen({
  onLoginSuccess,
  backgroundStyle = "dither",
  darkMode = true,
  themeColor = "#8ab4f8",
}: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    if (!captchaVerified) {
      setError("Por favor resuelve el captcha correctamente antes de iniciar sesión.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const user = await emailRegister(email, password);
        onLoginSuccess(user, null);
      } else {
        const user = await emailLogin(email, password);
        onLoginSuccess(user, null);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        setError("Credenciales incorrectas.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Este correo electrónico ya está registrado.");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else {
        setError(err.message || "Ocurrió un error inesperado.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        onLoginSuccess(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        "No se pudo completar el inicio de sesión con Google. Esto suele deberse a bloqueos de cookies de terceros en el iframe de desarrollo. Puedes usar el modo correo o el modo offline abajo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const hexToRgbArray = (hex: string) => {
    const c = hex.startsWith("#") ? hex.slice(1) : hex;
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    return [r, g, b] as [number, number, number];
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center ${darkMode ? "bg-zinc-950" : "bg-slate-50"} text-text-main relative overflow-hidden font-sans p-4 transition-all duration-300`} style={{ "--color-primary": themeColor } as React.CSSProperties}>
      {/* Background Canvas */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {backgroundStyle === "dither" ? (
          <Dither
            waveSpeed={0.05}
            waveFrequency={3}
            waveAmplitude={0.3}
            waveColor={hexToRgbArray(themeColor)}
            backgroundColor={darkMode ? [0.0, 0.0, 0.0] : [1.0, 1.0, 1.0]}
            colorNum={4}
            pixelSize={2}
            enableMouseInteraction={true}
            mouseRadius={0.4}
          />
        ) : backgroundStyle === "pixelblast" ? (
          <PixelBlast
            variant="square"
            color={themeColor}
            pixelSize={3}
            liquid={true}
            enableRipples={true}
            transparent={true}
          />
        ) : (
          <Plasma
            color={themeColor}
            darkMode={darkMode}
            speed={0.6}
            scale={1.2}
          />
        )}
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-2xl relative z-10 mx-4 transition-all duration-300">
        <div className="text-center mb-8">
          <Logo darkMode={darkMode} size="md" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            FSR - Workspace
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1 font-medium">
            Tu centro de organización y productividad inteligente
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-6 rounded-2xl bg-[#fce8e6] dark:bg-[#5c1d1d]/30 border border-[#d93025]/30 dark:border-[#f28b82]/30 text-danger dark:text-danger text-xs font-medium flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              className="w-full px-4 py-2.5 rounded-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none transition-all text-xs font-medium focus:border-primary dark:focus:border-primary focus:bg-white dark:focus:bg-black"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none transition-all text-xs font-medium focus:border-primary dark:focus:border-primary focus:bg-white dark:focus:bg-black"
              required
            />
          </div>

          <Captcha
            onVerify={setCaptchaVerified}
            darkMode={darkMode}
          />

          <button
            type="submit"
            disabled={loading || !captchaVerified}
            className="w-full py-3 px-4 rounded-full bg-primary hover:bg-[#1557b0] dark:hover:bg-[#a8c7fa] text-white dark:text-blue-950 dark:text-primary-on-container font-bold text-xs tracking-wide uppercase transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white dark:border-[#041e49] border-t-transparent rounded-full animate-spin"></span>
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                Registrarse
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        {/* Google Sign In Option */}
        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-zinc-800"></div>
          </div>
          <span className="relative px-3.5 text-[9px] font-bold tracking-widest text-slate-400 dark:text-zinc-500 bg-white dark:bg-black">
            O CONTINÚA CON
          </span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-full bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 font-bold text-xs text-slate-900 dark:text-white tracking-wide uppercase transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 shadow-2xs"
        >
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="w-4 h-4 shrink-0"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            ></path>
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            ></path>
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            ></path>
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            ></path>
          </svg>
          Sincronizar Google Workspace
        </button>

        <div className="mt-5 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-primary dark:text-primary hover:underline text-xs font-semibold transition-all focus:outline-none"
          >
            {isRegistering
              ? "¿Ya tienes cuenta? Inicia sesión"
              : "¿No tienes cuenta? Regístrate aquí"}
          </button>
        </div>
      </div>
    </div>
  );
}
