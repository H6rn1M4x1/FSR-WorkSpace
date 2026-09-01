import { schedule } from "@netlify/functions";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAdw038U48NW7DLzaXYkd09OkAYGA2zrEM",
  authDomain: "credible-bee-h5fd2.firebaseapp.com",
  projectId: "credible-bee-h5fd2",
  storageBucket: "credible-bee-h5fd2.firebasestorage.app",
  messagingSenderId: "697508839386",
  appId: "1:697508839386:web:1191400cd74be371d54ae3",
};
const FIRESTORE_DATABASE_ID = "ai-studio-fsrworkspace-54088f75-aeab-47ef-aff0-3ed53c6ba118";

// Every user who wants WhatsApp reminders needs their email listed here — this app is
// used by a small, known set of people (not a public multi-tenant service), so a fixed
// list is simpler and safer than trying to auto-discover every account in Firestore.
// Add a new line for each person once they've saved their WhatsApp number + APIKEY in
// Configuración.
const KNOWN_USER_EMAILS = ["hernanmaximiliano10@gmail.com", "jessicasarmiento91@gmail.com"];

const REMINDER_MINUTES_BEFORE = 120; // "al menos 2 horas antes"
const DAILY_SUMMARY_HOUR = 7; // 7 AM, Argentina time

async function sendWhatsapp(phone: string, apiKey: string, message: string) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    phone
  )}&apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(message)}`;
  await fetch(url);
}

// Returns the current hour (0-23) and date ("YYYY-MM-DD") in Argentina time, regardless
// of what timezone the server itself runs in.
function getArgentinaNow(): { hour: number; dateStr: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return {
    hour: parseInt(get("hour"), 10),
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

const handlerFn = async () => {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app, FIRESTORE_DATABASE_ID);
  const now = new Date();
  const { hour: argHour, dateStr: argDateStr } = getArgentinaNow();

  for (const email of KNOWN_USER_EMAILS) {
    try {
      const profileSnap = await getDocs(collection(db, "users", email, "user_profile"));
      const profileDocSnap = profileSnap.docs[0];
      const profile = profileDocSnap?.data();
      const phone = profile?.whatsappPhoneNumber;
      const apiKey = profile?.whatsappApiKey;
      if (!phone || !apiKey) continue; // this user hasn't set up WhatsApp reminders

      const turnosSnap = await getDocs(collection(db, "users", email, "turnos_compromisos"));

      // --- Daily 7 AM summary (only sent once per day, only if there's something pending) ---
      if (argHour === DAILY_SUMMARY_HOUR && profile?.whatsappLastSummaryDate !== argDateStr) {
        const todayItems = turnosSnap.docs
          .map((d) => d.data() as any)
          .filter((tc) => !tc.estatus && String(tc.fecha || "").startsWith(argDateStr));

        if (todayItems.length > 0) {
          const lines = todayItems
            .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
            .map((tc) => {
              const timePart = String(tc.fecha).split("T")[1];
              return `• ${timePart ? timePart.slice(0, 5) + " - " : ""}${tc.descripcion}`;
            });
          const summaryMessage = `☀️ Buen día! Esto es lo que tenés para hoy:\n\n${lines.join("\n")}`;
          try {
            await sendWhatsapp(phone, apiKey, summaryMessage);
          } catch (err) {
            console.error(`Error sending daily summary for ${email}:`, err);
          }
        }
        // Mark the summary as "handled" for today either way (sent or nothing to report),
        // so we don't check/send again until tomorrow.
        if (profileDocSnap) {
          await updateDoc(doc(db, "users", email, "user_profile", profileDocSnap.id), {
            whatsappLastSummaryDate: argDateStr,
          });
        }
      }

      // --- Per-event reminder, at least 2 hours before ---
      for (const docSnap of turnosSnap.docs) {
        const tc = docSnap.data() as any;
        if (tc.estatus) continue; // already done, no reminder needed
        if (tc.whatsappReminderSent) continue; // already reminded once
        if (!tc.fecha || !String(tc.fecha).includes("T")) continue; // needs a specific time to know "a bit before"

        const eventTime = new Date(tc.fecha);
        if (isNaN(eventTime.getTime())) continue;
        const diffMinutes = (eventTime.getTime() - now.getTime()) / 60000;

        if (diffMinutes > 0 && diffMinutes <= REMINDER_MINUTES_BEFORE) {
          const message = `⏰ Recordatorio: "${tc.descripcion}" en ${Math.round(diffMinutes)} minutos${
            tc.lugar ? ` (${tc.lugar})` : ""
          }.`;
          try {
            await sendWhatsapp(phone, apiKey, message);
            await updateDoc(doc(db, "users", email, "turnos_compromisos", docSnap.id), {
              whatsappReminderSent: true,
            });
          } catch (err) {
            console.error(`Error sending WhatsApp reminder for ${email} / ${docSnap.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error(`Error checking reminders for ${email}:`, err);
    }
  }

  return { statusCode: 200, body: "OK" };
};

// Runs every 10 minutes.
export const handler = schedule("*/10 * * * *", handlerFn);
