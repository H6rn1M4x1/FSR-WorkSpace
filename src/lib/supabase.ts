import { createClient, type User } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://pfqlpmvwpsfpuxwunnpz.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_48cPYVmkUvyciTujd5YKkA_IFnWn6zn";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Google scopes your app needs for Drive/Gmail/Calendar/Tasks/Fit features.
// These are requested through Supabase's Google provider (configured in the Supabase dashboard).
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.location.read",
  "https://www.googleapis.com/auth/user.birthday.read",
].join(" ");

export const googleSignIn = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: GOOGLE_SCOPES,
      queryParams: {
        access_type: "offline", // needed to get a refresh token for Drive/Gmail
        prompt: "consent",
      },
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
};

export const emailLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
};

export const emailRegister = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
};

export const sendVerificationEmail = async (): Promise<void> => {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) throw new Error("No hay usuario autenticado en Supabase.");
  const { error } = await supabase.auth.resend({ type: "signup", email: data.user.email });
  if (error) throw error;
};

export const logout = async () => {
  await supabase.auth.signOut();
};

// The Google access token (for Drive/Gmail/Calendar calls) lives on the session's provider_token
// Google access tokens expire (~1 hour) and Supabase doesn't refresh them automatically.
// Supabase's provider_token is ALSO only returned right after the OAuth redirect — on
// any later page load or session refresh it comes back empty, even if the token itself
// is technically still valid. We cache it in localStorage so it survives reloads for the
// rest of its natural lifetime, instead of silently disappearing on every refresh.
const GOOGLE_TOKEN_CACHE_KEY = "liquid_google_access_token";
const GOOGLE_TOKEN_FETCHED_AT_KEY = "liquid_google_access_token_fetched_at";

const cacheProviderToken = (token: string | null | undefined) => {
  try {
    if (token) {
      localStorage.setItem(GOOGLE_TOKEN_CACHE_KEY, token);
      localStorage.setItem(GOOGLE_TOKEN_FETCHED_AT_KEY, String(Date.now()));
    }
  } catch (_) {}
};

const readCachedProviderToken = (): string | null => {
  try {
    return localStorage.getItem(GOOGLE_TOKEN_CACHE_KEY);
  } catch (_) {
    return null;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.provider_token ?? readCachedProviderToken();
};

// Google access tokens expire (~1 hour) and Supabase doesn't refresh them automatically.
// This silently re-runs the Google OAuth flow with prompt=none, so if the browser still
// has an active Google session it comes back with a fresh token without showing any
// consent screen — no need to manually log out and back in.
export const silentGoogleReauth = async (): Promise<void> => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: GOOGLE_SCOPES,
      queryParams: {
        access_type: "offline",
        prompt: "none",
      },
      // Mismo redirectTo exacto que usa el login normal (googleSignIn, más abajo): si el
      // allow-list de Supabase solo tiene registrado el origin (sin barra final ni query),
      // usar window.location.href acá podía no calzar y hacer que el round-trip fallara en
      // silencio, sin refrescar nada.
      redirectTo: window.location.origin,
    },
  });
};

const TOKEN_MAX_AGE_MS = 50 * 60 * 1000; // refrescar antes de los ~60 min reales de vida
const REDIRECT_PENDING_KEY = "google_silent_reauth_pending";
const LAST_ATTEMPT_KEY = "google_silent_reauth_last_attempt";
// Si Google no puede renovar en silencio (por ejemplo, exige elegir cuenta o volver a dar
// consentimiento), reintentarlo sin pausa recargaría la página en loop sin arreglar nada. Este
// enfriamiento evita ese loop: después de un intento, hay que esperar este tiempo antes de
// volver a probar uno nuevo.
const REAUTH_COOLDOWN_MS = 2 * 60 * 1000;

const tokenAgeMs = (): number => {
  try {
    const fetchedAt = Number(localStorage.getItem(GOOGLE_TOKEN_FETCHED_AT_KEY) || 0);
    return fetchedAt ? Date.now() - fetchedAt : Infinity;
  } catch {
    return Infinity;
  }
};

// Exportada para que quien detecte un 401 de Google en una llamada puntual (por ejemplo,
// WorkspaceService.uploadFileToDrive) pueda disparar el refresco ahora mismo en vez de
// esperar al próximo chequeo periódico, aunque la llamada en curso ya no se pueda completar
// (la pestaña va a navegar y volver). Devuelve false si no disparó nada (ya hay uno en curso,
// o ya se intentó hace poco y no ayudó) — en ese caso el que llama debería ofrecer reconectar
// a mano en vez de asumir que esto lo va a arreglar solo.
export const triggerSilentReauth = (): boolean => {
  try {
    if (sessionStorage.getItem(REDIRECT_PENDING_KEY)) return false; // ya hay uno en curso
    const lastAttempt = Number(sessionStorage.getItem(LAST_ATTEMPT_KEY) || 0);
    if (Date.now() - lastAttempt < REAUTH_COOLDOWN_MS) return false; // ya se probó hace poco
    sessionStorage.setItem(REDIRECT_PENDING_KEY, "1");
    sessionStorage.setItem(LAST_ATTEMPT_KEY, String(Date.now()));
  } catch {}
  silentGoogleReauth().catch(() => {
    try {
      sessionStorage.removeItem(REDIRECT_PENDING_KEY);
    } catch {}
  });
  return true;
};

let backgroundRefreshStarted = false;
// El access token de Google (provider_token) dura ~1 hora y Supabase no lo renueva solo, así
// que sin esto cualquier llamada a Drive después de esa hora fallaba con 401 y obligaba a
// reconectar la cuenta a mano. Esto arranca (una sola vez) un chequeo periódico que lo refresca
// en segundo plano antes de que venza. Como silentGoogleReauth navega la misma pestaña (no
// abre pop-up, así que nunca lo bloquea el navegador), se prioriza hacerlo mientras la pestaña
// está oculta para que el usuario ni note el ida y vuelta de la recarga.
const ensureBackgroundTokenRefresh = () => {
  if (backgroundRefreshStarted || typeof window === "undefined") return;
  backgroundRefreshStarted = true;

  const maybeRefresh = (onlyIfHidden: boolean) => {
    if (!readCachedProviderToken()) return;
    if (onlyIfHidden && document.visibilityState !== "hidden") return;
    if (tokenAgeMs() > TOKEN_MAX_AGE_MS) {
      triggerSilentReauth();
    }
  };

  document.addEventListener("visibilitychange", () => maybeRefresh(true));
  // Respaldo: si la pestaña nunca pasa a segundo plano durante una sesión muy larga, refresca
  // de todos modos pasados ~55 min para no dejar que el token llegue a expirar de verdad.
  setInterval(() => {
    if (tokenAgeMs() > TOKEN_MAX_AGE_MS + 5 * 60 * 1000) {
      maybeRefresh(false);
    } else {
      maybeRefresh(true);
    }
  }, 5 * 60 * 1000);
};

// Firebase's `User` object exposes uid/displayName/photoURL. The app has ~70 call sites
// relying on that exact shape, so instead of touching every file we adapt the Supabase
// user into the same shape. `FirebaseLikeUser` is what the rest of the app should keep using.
export type FirebaseLikeUser = User & {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
};

const toFirebaseLikeUser = (user: User): FirebaseLikeUser => ({
  ...user,
  uid: user.id,
  displayName: (user.user_metadata?.full_name || user.user_metadata?.name || null) as string | null,
  photoURL: (user.user_metadata?.avatar_url || user.user_metadata?.picture || null) as string | null,
  emailVerified: !!user.email_confirmed_at,
});

// Lightweight stand-in for Firebase's `auth.currentUser`, kept in sync via initAuth below.
export const auth: { currentUser: FirebaseLikeUser | null } = { currentUser: null };

export const initAuth = (
  onAuthSuccess?: (user: FirebaseLikeUser, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  // Se llega hasta acá después de cualquier redirect (incluido el del refresco silencioso), así
  // que esta primera resolución de la sesión siempre libera el flag de "hay uno en curso",
  // haya salido bien o mal, para no dejar el refresco bloqueado el resto de la pestaña.
  try {
    sessionStorage.removeItem(REDIRECT_PENDING_KEY);
  } catch {}

  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      const u = toFirebaseLikeUser(data.session.user);
      auth.currentUser = u;
      cacheProviderToken(data.session.provider_token);
      ensureBackgroundTokenRefresh();
      onAuthSuccess?.(u, data.session.provider_token ?? readCachedProviderToken());
    } else {
      auth.currentUser = null;
      onAuthFailure?.();
    }
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const u = toFirebaseLikeUser(session.user);
      auth.currentUser = u;
      cacheProviderToken(session.provider_token);
      ensureBackgroundTokenRefresh();
      onAuthSuccess?.(u, session.provider_token ?? readCachedProviderToken());
    } else {
      auth.currentUser = null;
      onAuthFailure?.();
    }
  });

  return () => listener.subscription.unsubscribe();
};
