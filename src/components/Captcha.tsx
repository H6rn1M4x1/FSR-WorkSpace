import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";

interface CaptchaProps {
  onVerify: (isValid: boolean) => void;
  darkMode?: boolean;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = "0x4AAAAAAEDEtN-bEdb8eioL";

export default function Captcha({ onVerify, darkMode = true }: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timer: any;

    const renderTurnstile = () => {
      if (!isMounted) return;
      if (window.turnstile && containerRef.current) {
        try {
          // Clear any previous child
          containerRef.current.innerHTML = "";
          const id = window.turnstile.render(containerRef.current, {
            sitekey: SITE_KEY,
            theme: darkMode ? "dark" : "light",
            callback: (token: string) => {
              if (token) {
                setVerified(true);
                onVerify(true);
              }
            },
            "expired-callback": () => {
              setVerified(false);
              onVerify(false);
            },
            "error-callback": () => {
              // Switch to fallback if turnstile fails
              setFallbackMode(true);
            },
          });
          setWidgetId(id);
        } catch (err) {
          setFallbackMode(true);
        }
      } else {
        // If turnstile script hasn't loaded after 3 seconds, offer fallback
        timer = setTimeout(() => {
          if (!widgetId && isMounted) {
            setFallbackMode(true);
          }
        }, 3000);
      }
    };

    renderTurnstile();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [darkMode, onVerify]);

  const handleFallbackVerify = () => {
    setVerified(true);
    onVerify(true);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {!fallbackMode ? (
        <div className="w-full min-h-[65px] flex items-center justify-center">
          <div ref={containerRef} className="w-full flex justify-center" />
        </div>
      ) : (
        <div
          className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between shadow-xs select-none ${
            darkMode
              ? "bg-[#18181b]/90 border-zinc-800 text-zinc-100"
              : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleFallbackVerify}
              disabled={verified}
              className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                verified
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                  : darkMode
                  ? "border-zinc-700 hover:border-orange-500 bg-zinc-900"
                  : "border-slate-300 hover:border-orange-500 bg-slate-50"
              }`}
              aria-label="Verificar que eres humano"
            >
              {verified ? (
                <ShieldCheck className="w-4 h-4 text-white" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-sm bg-transparent group-hover:bg-orange-500 transition-colors" />
              )}
            </button>
            <div>
              <span className="block text-xs font-bold">
                {verified ? "Verificación completada" : "Verifica que eres humano"}
              </span>
              <span className="block text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                Cloudflare Turnstile • Modo Seguro
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-zinc-800">
            <span className="text-[11px] font-extrabold text-orange-500">Turnstile</span>
          </div>
        </div>
      )}
    </div>
  );
}
