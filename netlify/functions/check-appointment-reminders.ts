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
const KNOWN_USER_EMAILS = ["hernanmaximiliano10@gmail.com", "jessicasarmiento91@gmail.com"];

const REMINDER_MINUTES_BEFORE = 120; // "al menos 2 horas antes" — only for items with a specific time
const DAILY_SUMMARY_HOUR = 7; // 7 AM, Argentina time
const FINANZAS_REMINDER_HOUR = 12; // pagos que vencen hoy no tienen hora — se avisan individualmente al mediodía
const SALUD_REMINDER_HOUR = 10; // medicamentos por agotarse no tienen hora — aviso individual a las 10am
const COMIDAS_REMINDER_HOUR = 10; // comida planificada no tiene hora — aviso individual a las 10am

async function sendWhatsapp(phone: string, apiKey: string, message: string) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    phone
  )}&apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(message)}`;
  await fetch(url);
}

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
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", email);
  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({ title, body, category: "general" });
  await Promise.allSettled(
    subs.map((s) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload))
  );
}

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
  return { hour: parseInt(get("hour"), 10), dateStr: `${get("year")}-${get("month")}-${get("day")}` };
}

// tc.fecha / examen.fecha are naive "YYYY-MM-DDTHH:MM" strings meant as Argentina local
// time. Without an explicit offset, JS parses them in the SERVER's timezone (UTC on
// Netlify) instead — a 3-hour error. This appends the Argentina offset explicitly.
function parseArgentinaDateTime(fecha: string): Date {
  const withOffset = /[+-]\d{2}:\d{2}$|Z$/.test(fecha) ? fecha : `${fecha}:00-03:00`;
  return new Date(withOffset);
}

function friendlyDateTime(d: Date): { date: string; time: string } {
  const date = d.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const time = d.toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date: date.charAt(0).toUpperCase() + date.slice(1), time };
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

      const send = async (title: string, whatsappBody: string, pushBody: string) => {
        if (hasWhatsapp) {
          try {
            await sendWhatsapp(phone, apiKey, whatsappBody);
          } catch (err) {
            console.error(`Error sending WhatsApp (${title}) for ${email}:`, err);
          }
        }
        try {
          await sendPushToUser(email, title, pushBody);
        } catch (err) {
          console.error(`Error sending push (${title}) for ${email}:`, err);
        }
      };

      const [turnosSnap, paymentsSnap, examenesSnap, tasksSnap, medsSnap, dispSnap, orgSnap, platosSnap] = await Promise.all([
        getDocs(collection(db, "users", email, "turnos_compromisos")),
        getDocs(collection(db, "users", email, "detailed_payments")),
        getDocs(collection(db, "users", email, "examenes")),
        getDocs(collection(db, "users", email, "tasks")),
        getDocs(collection(db, "users", email, "medicamentos_detallados")),
        getDocs(collection(db, "users", email, "disponibilidad_medicamentos")),
        getDocs(collection(db, "users", email, "organizacion_semanal")),
        getDocs(collection(db, "users", email, "platos")),
      ]);

      // ============================= DAILY 7 AM SUMMARY =============================
      // Sent once per day, only if there's at least one thing to report across all 5 sections.
      if (argHour === DAILY_SUMMARY_HOUR && profile?.whatsappLastSummaryDate !== argDateStr) {
        const sections: { title: string; wa: string[]; push: string[] }[] = [];

        // --- Turnos ---
        const turnosHoy = turnosSnap.docs
          .map((d) => d.data() as any)
          .filter((tc) => !tc.estatus && String(tc.fecha || "").startsWith(argDateStr))
          .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
        if (turnosHoy.length > 0) {
          sections.push({
            title: "📅 Turnos",
            wa: turnosHoy.map((tc) => {
              const t = String(tc.fecha).split("T")[1];
              return `• ${t ? `*${t.slice(0, 5)}hs* - ` : ""}${tc.descripcion}${tc.lugar ? ` _(${tc.lugar})_` : ""}`;
            }),
            push: turnosHoy.map((tc) => {
              const t = String(tc.fecha).split("T")[1];
              return `• ${t ? t.slice(0, 5) + "hs - " : ""}${tc.descripcion}${tc.lugar ? ` (${tc.lugar})` : ""}`;
            }),
          });
        }

        // --- Finanzas: pagos que vencen hoy ---
        const pagosHoy = paymentsSnap.docs
          .map((d) => d.data() as any)
          .filter((p) => !p.pago && String(p.fechaVencimiento || "").startsWith(argDateStr));
        if (pagosHoy.length > 0) {
          sections.push({
            title: "💵 Finanzas",
            wa: pagosHoy.map((p) => `• *${p.descripcion}* - $${(p.montoAPagar || 0).toLocaleString("es-AR")} _(${p.categoria || "General"})_`),
            push: pagosHoy.map((p) => `• ${p.descripcion} - $${(p.montoAPagar || 0).toLocaleString("es-AR")} (${p.categoria || "General"})`),
          });
        }

        // --- Universidad: exámenes hoy + trabajos que vencen hoy ---
        const examenesHoy = examenesSnap.docs
          .map((d) => d.data() as any)
          .filter((e) => String(e.fecha || "").startsWith(argDateStr));
        const trabajosHoy = tasksSnap.docs
          .map((d) => d.data() as any)
          .filter((t) => !t.completed && String(t.dueDate || "").startsWith(argDateStr));
        if (examenesHoy.length > 0 || trabajosHoy.length > 0) {
          sections.push({
            title: "🎓 Universidad",
            wa: [
              ...examenesHoy.map((e) => `• *Examen: ${e.materia}*${e.hora ? ` a las ${e.hora}hs` : ""}${e.aula ? ` _(${e.aula})_` : ""}`),
              ...trabajosHoy.map((t) => `• *Trabajo: ${t.title}*`),
            ],
            push: [
              ...examenesHoy.map((e) => `• Examen: ${e.materia}${e.hora ? ` a las ${e.hora}hs` : ""}${e.aula ? ` (${e.aula})` : ""}`),
              ...trabajosHoy.map((t) => `• Trabajo: ${t.title}`),
            ],
          });
        }

        // --- Salud: medicamentos que se agotan hoy o mañana ---
        const medsBajoStock: string[] = [];
        for (const medDoc of medsSnap.docs) {
          const med = medDoc.data() as any;
          if (med.estado !== "Consumiendo") continue;
          const dispEntries = dispSnap.docs.map((d) => d.data() as any).filter((d) => d.medicamentoId === medDoc.id);
          if (dispEntries.length === 0) continue;
          const latest = dispEntries.sort((a, b) => String(b.fechaRegistro).localeCompare(String(a.fechaRegistro)))[0];

          const cd = med.consumoDiario || 1;
          const cantReg = latest.cantidadRegistrada || 0;
          const regDate = new Date(String(latest.fechaRegistro).split("T")[0] + "T00:00:00-03:00");
          const diffDays = Math.max(0, Math.round((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24)));
          const cantidadDisponible = Math.max(0, cantReg - cd * diffDays);
          const disponibleParaDias = cd > 0 ? cantidadDisponible / cd : 0;

          if (disponibleParaDias <= 1) {
            medsBajoStock.push(med.droga || med.marca || "Medicamento");
          }
        }
        if (medsBajoStock.length > 0) {
          sections.push({
            title: "💊 Salud",
            wa: medsBajoStock.map((d) => `• *${d}* se termina hoy o mañana`),
            push: medsBajoStock.map((d) => `• ${d} se termina hoy o mañana`),
          });
        }

        // --- Comidas: qué toca comer hoy ---
        const comidaHoy = orgSnap.docs.map((d) => d.data() as any).filter((o) => o.fecha === argDateStr);
        if (comidaHoy.length > 0) {
          const platoNames = comidaHoy.map((o) => {
            const plato = platosSnap.docs.find((p) => p.id === o.platoId)?.data() as any;
            return plato?.nombrePlato || "Comida planificada";
          });
          sections.push({
            title: "🍽️ Comidas",
            wa: platoNames.map((n) => `• *${n}*`),
            push: platoNames.map((n) => `• ${n}`),
          });
        }

        if (sections.length > 0) {
          const waMessage = `☀️ *Buen día!* Esto es lo que tenés para hoy:\n\n${sections.map((s) => `${s.title}\n${s.wa.join("\n")}`).join("\n\n")}`;
          const pushMessage = sections.map((s) => `${s.title}\n${s.push.join("\n")}`).join("\n\n");
          await send("☀️ Resumen del día", waMessage, `Esto es lo que tenés para hoy:\n\n${pushMessage}`);
        }

        if (profileDocSnap) {
          await updateDoc(doc(db, "users", email, "user_profile", profileDocSnap.id), { whatsappLastSummaryDate: argDateStr });
        }
      }

      // ===================== PER-EVENT REMINDER (things with a specific time) =====================

      // --- Turnos: at least 2 hours before ---
      for (const docSnap of turnosSnap.docs) {
        const tc = docSnap.data() as any;
        if (tc.estatus || tc.whatsappReminderSent || !tc.fecha || !String(tc.fecha).includes("T")) continue;
        const eventTime = parseArgentinaDateTime(tc.fecha);
        if (isNaN(eventTime.getTime())) continue;
        const diffMinutes = (eventTime.getTime() - now.getTime()) / 60000;
        if (diffMinutes > 0 && diffMinutes <= REMINDER_MINUTES_BEFORE) {
          const { date, time } = friendlyDateTime(eventTime);
          const lugarPart = tc.lugar ? ` en ${tc.lugar}` : "";
          const doctorPart = tc.doctor ? ` con ${tc.doctor}` : "";
          await send(
            "⏰ Recordatorio (Turnos)",
            `⏰ *Recordatorio (Turnos)*\n\n*${tc.descripcion}*${lugarPart} el ${date} a las ${time}hs${doctorPart}. _Ver más en FSR Workspace._`,
            `${tc.descripcion}${lugarPart} el ${date} a las ${time}hs${doctorPart}.`
          );
          await updateDoc(doc(db, "users", email, "turnos_compromisos", docSnap.id), { whatsappReminderSent: true });
        }
      }

      // --- Exámenes: at least 2 hours before ---
      for (const docSnap of examenesSnap.docs) {
        const ex = docSnap.data() as any;
        if (ex.whatsappReminderSent || !ex.fecha || !ex.hora) continue;
        const eventTime = parseArgentinaDateTime(`${ex.fecha.split("T")[0]}T${ex.hora}`);
        if (isNaN(eventTime.getTime())) continue;
        const diffMinutes = (eventTime.getTime() - now.getTime()) / 60000;
        if (diffMinutes > 0 && diffMinutes <= REMINDER_MINUTES_BEFORE) {
          const { date, time } = friendlyDateTime(eventTime);
          const aulaPart = ex.aula ? ` en ${ex.aula}` : "";
          await send(
            "⏰ Recordatorio (Universidad)",
            `⏰ *Recordatorio (Universidad)*\n\n*Examen de ${ex.materia}*${aulaPart} el ${date} a las ${time}hs. _Ver más en FSR Workspace._`,
            `Examen de ${ex.materia}${aulaPart} el ${date} a las ${time}hs.`
          );
          await updateDoc(doc(db, "users", email, "examenes", docSnap.id), { whatsappReminderSent: true });
        }
      }

      // --- Finanzas: aviso individual al mediodía por cada pago que vence hoy (no tienen hora) ---
      if (argHour === FINANZAS_REMINDER_HOUR) {
        for (const docSnap of paymentsSnap.docs) {
          const p = docSnap.data() as any;
          if (p.pago || p.whatsappReminderSent || !String(p.fechaVencimiento || "").startsWith(argDateStr)) continue;
          await send(
            "💵 Recordatorio (Finanzas)",
            `💵 *Recordatorio (Finanzas)*\n\nHoy vence: *${p.descripcion}* - $${(p.montoAPagar || 0).toLocaleString("es-AR")} _(${p.categoria || "General"})_. _Ver más en FSR Workspace._`,
            `Hoy vence: ${p.descripcion} - $${(p.montoAPagar || 0).toLocaleString("es-AR")} (${p.categoria || "General"}).`
          );
          await updateDoc(doc(db, "users", email, "detailed_payments", docSnap.id), { whatsappReminderSent: true });
        }
      }

      // --- Comidas: aviso individual a las 10am por lo planificado hoy (no tiene hora) ---
      if (argHour === COMIDAS_REMINDER_HOUR) {
        for (const docSnap of orgSnap.docs) {
          const o = docSnap.data() as any;
          if (o.whatsappReminderSent || o.fecha !== argDateStr) continue;
          const plato = platosSnap.docs.find((p) => p.id === o.platoId)?.data() as any;
          const nombrePlato = plato?.nombrePlato || "Comida planificada";
          await send(
            "🍽️ Recordatorio (Comidas)",
            `🍽️ *Recordatorio (Comidas)*\n\nHoy tenés planificado: *${nombrePlato}*. _Ver más en FSR Workspace._`,
            `Hoy tenés planificado: ${nombrePlato}.`
          );
          await updateDoc(doc(db, "users", email, "organizacion_semanal", docSnap.id), { whatsappReminderSent: true });
        }
      }

      // --- Salud: aviso individual a las 10am por medicamentos que se agotan (no tiene hora) ---
      if (argHour === SALUD_REMINDER_HOUR) {
        for (const medDoc of medsSnap.docs) {
          const med = medDoc.data() as any;
          if (med.estado !== "Consumiendo" || med.whatsappLastLowStockReminderDate === argDateStr) continue;
          const dispEntries = dispSnap.docs.map((d) => d.data() as any).filter((d) => d.medicamentoId === medDoc.id);
          if (dispEntries.length === 0) continue;
          const latest = dispEntries.sort((a, b) => String(b.fechaRegistro).localeCompare(String(a.fechaRegistro)))[0];

          const cd = med.consumoDiario || 1;
          const cantReg = latest.cantidadRegistrada || 0;
          const regDate = new Date(String(latest.fechaRegistro).split("T")[0] + "T00:00:00-03:00");
          const diffDays = Math.max(0, Math.round((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24)));
          const cantidadDisponible = Math.max(0, cantReg - cd * diffDays);
          const disponibleParaDias = cd > 0 ? cantidadDisponible / cd : 0;

          if (disponibleParaDias <= 1) {
            const nombre = med.droga || med.marca || "Medicamento";
            await send(
              "💊 Recordatorio (Salud)",
              `💊 *Recordatorio (Salud)*\n\n*${nombre}* se termina hoy o mañana — te queda menos de un día de stock. _Ver más en FSR Workspace._`,
              `${nombre} se termina hoy o mañana — te queda menos de un día de stock.`
            );
            await updateDoc(doc(db, "users", email, "medicamentos_detallados", medDoc.id), {
              whatsappLastLowStockReminderDate: argDateStr,
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
