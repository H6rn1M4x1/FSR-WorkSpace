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
export const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.provider_token ?? null;
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
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      const u = toFirebaseLikeUser(data.session.user);
      auth.currentUser = u;
      onAuthSuccess?.(u, data.session.provider_token ?? null);
    } else {
      auth.currentUser = null;
      onAuthFailure?.();
    }
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const u = toFirebaseLikeUser(session.user);
      auth.currentUser = u;
      onAuthSuccess?.(u, session.provider_token ?? null);
    } else {
      auth.currentUser = null;
      onAuthFailure?.();
    }
  });

  return () => listener.subscription.unsubscribe();
};
