import { getApps, getApp, initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

export const FIRESTORE_DATABASE_ID = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || "ai-studio-fsrworkspace-54088f75-aeab-47ef-aff0-3ed53c6ba118";

// Singleton Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure persistent local session (browserLocalPersistence keeps the user signed in across browser reloads/reopens for 30+ days)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("[Firebase Auth] Error al aplicar persistencia local de sesión:", err);
});

// Singleton Firestore Instance
let firestoreDb: ReturnType<typeof initializeFirestore>;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      experimentalForceLongPolling: true,
    },
    FIRESTORE_DATABASE_ID
  );
} catch (_) {
  firestoreDb = getFirestore(app, FIRESTORE_DATABASE_ID);
}

export const db = firestoreDb;

// Suppress internal Firebase SDK logs completely
try {
  setLogLevel("silent");
} catch (_) {}

const provider = new GoogleAuthProvider();
// Request the Workspace scopes specified by the user
provider.addScope("https://www.googleapis.com/auth/drive");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/calendar");
provider.addScope("https://www.googleapis.com/auth/tasks");
provider.addScope("https://www.googleapis.com/auth/documents");
provider.addScope("https://www.googleapis.com/auth/fitness.activity.read");
provider.addScope("https://www.googleapis.com/auth/fitness.location.read");

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== "undefined" ? localStorage.getItem("google_access_token") : null;

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("google_access_token", token);
    } else {
      localStorage.removeItem("google_access_token");
    }
  }
};

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || (typeof window !== "undefined" ? localStorage.getItem("google_access_token") : null);
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      // Do not clear google_access_token automatically on initial load or transition
      // Explicit sign out / logout already handles setAccessToken(null)
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google sign-in with Workspace scopes
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("No se pudo obtener el token de acceso de Google.");
    }

    setAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error("Error al iniciar sesión con Google:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Email and password login
export const emailLogin = async (email: string, password: string): Promise<User> => {
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  } catch (error: any) {
    console.error("Error en login por email:", error);
    throw error;
  }
};

// Email and password registration
export const emailRegister = async (email: string, password: string): Promise<User> => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    return res.user;
  } catch (error: any) {
    console.error("Error en registro por email:", error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || (typeof window !== "undefined" ? localStorage.getItem("google_access_token") : null);
};

export const logout = async () => {
  await signOut(auth);
  setAccessToken(null);
};

export const sendVerificationEmail = async (): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error("No hay usuario autenticado en Firebase.");
  }
  await sendEmailVerification(auth.currentUser);
};

