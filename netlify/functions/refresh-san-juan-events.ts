import { schedule } from "@netlify/functions";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { parseSanJuanEvents } from "./_lib/sanJuanParser";

// Same Firebase project/config as the rest of the serverless functions (see
// check-appointment-reminders.ts) — kept in sync manually since there's no shared env var
// for it in this repo.
const firebaseConfig = {
  apiKey: "AIzaSyAdw038U48NW7DLzaXYkd09OkAYGA2zrEM",
  authDomain: "credible-bee-h5fd2.firebaseapp.com",
  projectId: "credible-bee-h5fd2",
  storageBucket: "credible-bee-h5fd2.firebasestorage.app",
  messagingSenderId: "697508839386",
  appId: "1:697508839386:web:1191400cd74be371d54ae3",
};
const FIRESTORE_DATABASE_ID = "ai-studio-fsrworkspace-54088f75-aeab-47ef-aff0-3ed53c6ba118";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Keeps `shared_data/san_juan_events` warm proactively, instead of leaving the first user to
 * open the "Eventos" tab each month to pay for the scrape (which could take a while and made
 * that first visit feel broken). Runs daily — well inside the "once a month" cadence the tab
 * itself expects — so by the time any real user opens the tab, `getSanJuanEvents()` in
 * eventsService.ts finds this month's cache already populated and returns instantly, with no
 * network round-trip to yendly.com from the browser at all.
 */
const handlerFn = async () => {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app, FIRESTORE_DATABASE_ID);

  try {
    const pageRes = await fetch("https://sanjuan.yendly.com/este-mes", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FSRWorkspaceBot/1.0)" },
    });
    if (!pageRes.ok) throw new Error(`yendly.com respondió ${pageRes.status}`);

    const html = await pageRes.text();
    const items = parseSanJuanEvents(html);
    console.log(`[refresh-san-juan-events] parsed ${items.length} event(s)`);

    if (items.length > 0) {
      await setDoc(doc(db, "shared_data", "san_juan_events"), {
        items,
        monthKey: currentMonthKey(),
        fetchedAt: Date.now(),
      });
    }

    return { statusCode: 200, body: `OK (${items.length} eventos)` };
  } catch (error: any) {
    console.error("Error in refresh-san-juan-events:", error);
    // Leave whatever was cached before untouched — a failed refresh should never blank out
    // a working cache, per the same reasoning as the on-demand endpoint.
    return { statusCode: 200, body: `error: ${error?.message || "unknown"}` };
  }
};

// Runs once a day — the tab itself only expects a monthly refresh, so this keeps well ahead
// of that without hammering yendly.com.
export const handler = schedule("0 9 * * *", handlerFn);
