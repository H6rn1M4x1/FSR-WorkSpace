import { schedule } from "@netlify/functions";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const firebaseConfig = {
  apiKey: "AIzaSyAdw038U48NW7DLzaXYkd09OkAYGA2zrEM",
  authDomain: "credible-bee-h5fd2.firebaseapp.com",
  projectId: "credible-bee-h5fd2",
  storageBucket: "credible-bee-h5fd2.firebasestorage.app",
  messagingSenderId: "697508839386",
  appId: "1:697508839386:web:1191400cd74be371d54ae3",
};
const FIRESTORE_DATABASE_ID = "ai-studio-fsrworkspace-54088f75-aeab-47ef-aff0-3ed53c6ba118";

// Every user who wants automatic reminders needs their email listed here — this app is
// used by a small, known set of people (not a public multi-tenant service), so a fixed
// list is simpler and safer than trying to auto-discover every account in Firestore.
// Add a new line for each person once they've saved their WhatsApp/push settings.
const KNOWN_USER_EMAILS = ["hernanmaximiliano10@gmail.com", "jessicasarmiento91@gmail.com"];

const REMINDER_MINUTES_BEFORE = 120; // "al menos 2 horas antes"
const DAILY_SUMMARY_HOUR = 7; // 7 AM, Argentina time

async function sendWhatsapp(phone: string, apiKey: string, message: string) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    phone
  )}&apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(message)}`;
  await fetch(url);
}

// Sends a push notification to every device this user has activated push on. Silently
// does nothing if push isn't configured for this deploy, or the user has no subscriptions.
async function sendPushToUser(email: string, title: string, body: string) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hernanmaximiliano10@gmail.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", email);

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({ title, body, category: "general" });
  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
    )
  );
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
      const hasWhatsapp = !!(phone && apiKey);

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
          const summaryBody = `Esto es lo que tenés para hoy:\n\n${lines.join("\n")}`;
          if (hasWhatsapp) {
            try {
              await sendWhatsapp(phone, apiKey, `☀️ Buen día! ${summaryBody}`);
            } catch (err) {
              console.error(`Error sending WhatsApp daily summary for ${email}:`, err);
            }
          }
          try {
            await sendPushToUser(email, "☀️ Resumen del día", summaryBody);
          } catch (err) {
            console.error(`Error sending push daily summary for ${email}:`, err);
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

        // tc.fecha is a naive "YYYY-MM-DDTHH:MM" string meant as Argentina local time.
        // Without an explicit offset, JS would parse it as the SERVER's timezone (UTC on
        // Netlify) instead — a 3-hour error. Append the Argentina offset explicitly.
        const fechaWithOffset = /[+-]\d{2}:\d{2}$|Z$/.test(tc.fecha) ? tc.fecha : `${tc.fecha}:00-03:00`;
        const eventTime = new Date(fechaWithOffset);
        if (isNaN(eventTime.getTime())) continue;
        const diffMinutes = (eventTime.getTime() - now.getTime()) / 60000;

        if (diffMinutes > 0 && diffMinutes <= REMINDER_MINUTES_BEFORE) {
          const reminderBody = `"${tc.descripcion}" en ${Math.round(diffMinutes)} minutos${
            tc.lugar ? ` (${tc.lugar})` : ""
          }.`;
          let anySent = false;
          if (hasWhatsapp) {
            try {
              await sendWhatsapp(phone, apiKey, `⏰ Recordatorio: ${reminderBody}`);
              anySent = true;
            } catch (err) {
              console.error(`Error sending WhatsApp reminder for ${email} / ${docSnap.id}:`, err);
            }
          }
          try {
            await sendPushToUser(email, "⏰ Recordatorio", reminderBody);
            anySent = true;
          } catch (err) {
            console.error(`Error sending push reminder for ${email} / ${docSnap.id}:`, err);
          }
          if (anySent) {
            await updateDoc(doc(db, "users", email, "turnos_compromisos", docSnap.id), {
              whatsappReminderSent: true,
            });
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

