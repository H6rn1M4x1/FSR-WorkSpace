// Notification Service for Agenda Central Integrada (PWA Push & Local Notifications with Device Accent Color)

export type AgendaCategory = "turnos" | "finanzas" | "universidad" | "salud" | "comidas" | "general";

/**
 * Format any date string (e.g. YYYY-MM-DD or ISO) into dd/mm/aaaa.
 */
export function formatDateToDDMMAAAA(dateInput?: string | Date): string {
  if (!dateInput) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  }
  if (dateInput instanceof Date) {
    const d = String(dateInput.getDate()).padStart(2, "0");
    const m = String(dateInput.getMonth() + 1).padStart(2, "0");
    const y = dateInput.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const str = String(dateInput).trim();
  const dateOnly = str.includes("T") ? str.split("T")[0] : str;
  const parts = dateOnly.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const y = parts[0];
    const m = parts[1].padStart(2, "0");
    const d = parts[2].padStart(2, "0");
    return `${d}/${m}/${y}`;
  }
  return str;
}

/**
 * Get the current device's configured accent color from localStorage or CSS variables.
 */
export function getDeviceAccentColor(): string {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme_color");
      if (stored) return stored.trim();
      const computed = window.getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim();
      if (computed) return computed;
    }
  } catch {
    // fallback
  }
  return "#8ab4f8";
}

/**
 * Helper to encode SVG string safely to Base64 or standard URI format for native mobile NotificationManager.
 */
function svgToBase64Uri(svgString: string): string {
  try {
    if (typeof window !== "undefined" && typeof window.btoa === "function") {
      const cleanSvg = svgString.replace(/\s+/g, " ").trim();
      return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(cleanSvg)))}`;
    }
  } catch {
    // Fallback
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

/**
 * Generate category icon SVG Data URI tinted with the device accent color and embedding FSR logo.
 */
export function getCategoryIconWithAccent(category: AgendaCategory, customColor?: string): string {
  const accent = customColor || getDeviceAccentColor();
  const fsrWatermark = `<path d="M 104,24 Q 104,40 120,40 Q 104,40 104,56 Q 104,40 88,40 Q 104,40 104,24 Z" fill="#ffffff" opacity="0.9"/>`;
  
  let rawSvg = "";
  switch (category) {
    case "turnos":
      rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="36" fill="#09090b"/><rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>${fsrWatermark}<rect x="28" y="42" width="72" height="58" rx="12" fill="none" stroke="${accent}" stroke-width="7"/><line x1="28" y1="60" x2="100" y2="60" stroke="${accent}" stroke-width="7"/><line x1="44" y1="30" x2="44" y2="44" stroke="${accent}" stroke-width="7" stroke-linecap="round"/><line x1="84" y1="30" x2="84" y2="44" stroke="${accent}" stroke-width="7" stroke-linecap="round"/><circle cx="48" cy="76" r="4" fill="#ffffff"/><circle cx="64" cy="76" r="4" fill="#ffffff"/><circle cx="80" cy="76" r="4" fill="#ffffff"/></svg>`;
      break;

    case "finanzas":
      rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="36" fill="#09090b"/><rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>${fsrWatermark}<circle cx="64" cy="68" r="34" fill="none" stroke="${accent}" stroke-width="7"/><text x="64" y="82" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="#ffffff" text-anchor="middle">$</text></svg>`;
      break;

    case "universidad":
      rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="36" fill="#09090b"/><rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>${fsrWatermark}<path d="M64 36 L98 52 L64 68 L30 52 Z" fill="${accent}"/><path d="M42 60 L42 82 Q64 94 86 82 L86 60" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/><line x1="98" y1="52" x2="98" y2="84" stroke="${accent}" stroke-width="5" stroke-linecap="round"/></svg>`;
      break;

    case "salud":
      rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="36" fill="#09090b"/><rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>${fsrWatermark}<path d="M64 96 C64 96 32 74 32 52 C32 40 42 32 53 32 C60 32 63 36 64 39 C65 36 68 32 75 32 C86 32 96 40 96 52 C96 74 64 96 64 96 Z" fill="${accent}"/></svg>`;
      break;

    case "comidas":
      rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="36" fill="#09090b"/><rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>${fsrWatermark}<circle cx="64" cy="68" r="32" fill="none" stroke="${accent}" stroke-width="6"/><circle cx="64" cy="68" r="20" fill="none" stroke="#ffffff" stroke-width="4"/></svg>`;
      break;

    default:
      rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="36" fill="#09090b"/><rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/><path d="M 64,28 Q 64,64 100,64 Q 64,64 64,100 Q 64,64 28,64 Q 64,64 64,28 Z" fill="#ffffff"/></svg>`;
      break;
  }

  return svgToBase64Uri(rawSvg);
}

export interface NotificationPayload {
  title: string;
  body: string;
  category: AgendaCategory;
  tag?: string;
  accentColor?: string;
  data?: Record<string, any>;
}

/**
 * Register the Service Worker in the browser.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    
    // Ensure active service worker is ready
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error("Error registering Service Worker:", error);
    return null;
  }
}

/**
 * Check if the browser supports notifications.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current notification permission status.
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) {
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registerServiceWorker();
    }
    return permission;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return "denied";
  }
}

/**
 * Send a notification through the Service Worker with the device's accent color.
 * Highly robust for mobile PWA standalone mode and desktop browsers.
 */
export async function showAgendaNotification({
  title,
  body,
  category,
  tag,
  accentColor: customAccent,
  data = {},
}: NotificationPayload): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  if (Notification.permission !== "granted") {
    const perm = await requestNotificationPermission();
    if (perm !== "granted") return false;
  }

  const deviceAccent = customAccent || getDeviceAccentColor();
  const iconUrl = getCategoryIconWithAccent(category, deviceAccent);

  const options: any = {
    body,
    icon: iconUrl,
    badge: "/badge-icon.png",
    tag: tag || `agenda-${category}-${Date.now()}`,
    color: deviceAccent, // Native Android / Chrome notification accent tint
    data: {
      url: "/",
      category,
      accentColor: deviceAccent,
      timestamp: Date.now(),
      ...data,
    },
    vibrate: [250, 100, 250],
    renotify: true,
    requireInteraction: false,
    silent: false,
  };

  let shown = false;

  // 1. Primary strategy for Mobile PWA and Web: ServiceWorkerRegistration.showNotification()
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      }

      if (reg) {
        if (!reg.active) {
          try {
            await Promise.race([
              navigator.serviceWorker.ready,
              new Promise((resolve) => setTimeout(resolve, 800)),
            ]);
          } catch {
            // ignore timeout
          }
        }

        if (reg.showNotification) {
          await reg.showNotification(title, options);
          shown = true;
        }

        // Also post message to SW
        if (reg.active) {
          reg.active.postMessage({
            type: "SHOW_NOTIFICATION",
            payload: {
              title,
              body,
              category,
              accentColor: deviceAccent,
              icon: iconUrl,
              tag: options.tag,
              data: options.data,
            },
          });
        }
      }
    } catch (swError) {
      console.warn("[NotificationService] SW showNotification error:", swError);
    }
  }

  // 2. Secondary strategy: Window Notification API (Desktop / fallback where permitted)
  if (!shown) {
    try {
      new Notification(title, options);
      shown = true;
    } catch {
      // Handled above for Android PWA
    }
  }

  return shown;
}

/**
 * Map an agenda item type from HomeView to an AgendaCategory and format exact user-specified text:
 *
 * 1. Comida: "Plato Planeado: <Nombre del Plato>"
 * 2. Finanzas:
 *    - Titulo: "Vencimiento de <Descripcion/Nombre>"
 *    - Cuerpo: "Compromiso de pago para hoy por AR$<monto> con vencimiento el dia dd/mm/aaaa"
 * 3. Turnos:
 *    - Cuerpo:
 *      - Si hay direccion y hora: "Dia dd/mm/aaaa en <Direccion> a las <hh:mm>"
 *      - Si hay direccion pero no hora: "Dia dd/mm/aaaa en <Direccion>"
 *      - Si hay hora pero no direccion: "Dia dd/mm/aaaa a las <hh:mm>"
 *      - Si no hay direccion ni hora: "Dia dd/mm/aaaa"
 * 4. Universidad:
 *    - Examen: "Hoy tienes Evaluacion de <Materia> (<Instancia>) en el Aula <Aula>"
 */
export function formatAgendaItemNotification(item: {
  itemType: string;
  data: any;
}): NotificationPayload | null {
  const { itemType, data } = item;
  if (!data) return null;
  const accentColor = getDeviceAccentColor();

  switch (itemType) {
    case "comida":
    case "meal": {
      // Requirement: "Plato Planeado: Pollo al Horno con Papa y Zanahoria"
      const nombrePlato = (
        data.nombrePlato ||
        data.platoName ||
        data.name ||
        data.title ||
        "Menú Planificado"
      ).trim();

      return {
        title: `Plato Planeado: ${nombrePlato}`,
        body: "Menú programado para el día de hoy.",
        category: "comidas",
        tag: `meal-${data.id || nombrePlato}`,
        accentColor,
        data: { id: data.id, type: itemType, nombrePlato },
      };
    }

    case "finanzas":
    case "detailedPayment": {
      // Requirement:
      // Titulo: "Vencimiento de Pago Noti"
      // Cuerpo: "Compromiso de pago para hoy por AR$2.222 con vencimiento el dia dd/mm/aaaa"
      const desc = (data.descripcion || data.title || data.concept || "Pago").trim();
      const title = `Vencimiento de ${desc}`;

      const amountFormatted = (data.montoAPagar !== undefined && data.montoAPagar !== null)
        ? `por AR$${Number(data.montoAPagar).toLocaleString("es-AR")} `
        : "";
      const dateVenc = formatDateToDDMMAAAA(data.fechaVencimiento || data.fecha);
      const body = `Compromiso de pago para hoy ${amountFormatted}con vencimiento el dia ${dateVenc}`.replace(/\s+/g, " ").trim();

      return {
        title,
        body,
        category: "finanzas",
        tag: `payment-${data.id || desc}`,
        accentColor,
        data: { id: data.id, type: itemType, desc },
      };
    }

    case "invoice": {
      // Requirement:
      // Titulo: "Vencimiento de <Nombre Factura>"
      // Cuerpo: "Compromiso de pago para hoy por AR$<monto> con vencimiento el dia dd/mm/aaaa"
      const titleName = (data.title || data.name || data.service || "Factura").trim();
      const title = `Vencimiento de ${titleName}`;

      const amountFormatted = (data.amount !== undefined && data.amount !== null)
        ? `por AR$${Number(data.amount).toLocaleString("es-AR")} `
        : "";
      const dateVenc = formatDateToDDMMAAAA(data.dueDate || data.fecha);
      const body = `Compromiso de pago para hoy ${amountFormatted}con vencimiento el dia ${dateVenc}`.replace(/\s+/g, " ").trim();

      return {
        title,
        body,
        category: "finanzas",
        tag: `invoice-${data.id || titleName}`,
        accentColor,
        data: { id: data.id, type: itemType, title: titleName },
      };
    }

    case "turno":
    case "turnos":
    case "appointment": {
      // Requirement:
      // Titulo: Nombre del turno / compromiso
      // Cuerpo:
      // "Dia dd/mm/aaaa en Sin Direccion a las hh:mm"
      // "Dia dd/mm/aaaa en Sin Direccion"
      // "Dia dd/mm/aaaa a las hh:mm"
      // "Dia dd/mm/aaaa"
      const title = (
        data.descripcion ||
        data.title ||
        data.specialty ||
        data.categoria ||
        "Turno"
      ).replace(/⚽\s*/g, "").trim();

      const dateStr = formatDateToDDMMAAAA(data.fecha || data.date);
      const rawLugar = (data.lugar || data.direccion || data.location || "").trim();
      const hasLugar = rawLugar.length > 0;

      let rawHora = (data.hora || data.time || "").trim();
      if (!rawHora && data.fecha && data.fecha.includes("T")) {
        const timePart = data.fecha.split("T")[1]?.slice(0, 5);
        if (timePart && timePart !== "00:00") {
          rawHora = timePart;
        }
      }
      const hasHora = rawHora.length > 0;

      let body = `Dia ${dateStr}`;
      if (hasLugar && hasHora) {
        body = `Dia ${dateStr} en ${rawLugar} a las ${rawHora}`;
      } else if (hasLugar && !hasHora) {
        body = `Dia ${dateStr} en ${rawLugar}`;
      } else if (!hasLugar && hasHora) {
        body = `Dia ${dateStr} a las ${rawHora}`;
      } else {
        body = `Dia ${dateStr}`;
      }

      return {
        title,
        body,
        category: "turnos",
        tag: `turno-${data.id || title}`,
        accentColor,
        data: { id: data.id, type: itemType, title },
      };
    }

    case "examen":
    case "examenes": {
      // Requirement: "Hoy tienes Evaluacion de Concursos y Quiebras (Segundo) en el Aula 22"
      const materia = (data.materia || data.subject || data.title || "Examen").trim();
      const estado = (data.estado || "").trim();
      const title = materia ? (estado ? `${materia} (${estado})` : materia) : "Evaluación Universitaria";

      const instancia = (data.instancia || data.estado || "").trim();
      const instanciaPart = instancia ? ` (${instancia})` : "";
      const aula = (data.aula || data.aulas || data.room || "").trim();
      const aulaPart = aula ? ` en el Aula ${aula}` : "";
      
      const body = `Hoy tienes Evaluacion de ${materia}${instanciaPart}${aulaPart}`.trim();

      return {
        title,
        body,
        category: "universidad",
        tag: `examen-${data.id || materia}`,
        accentColor,
        data: { id: data.id, type: itemType, materia, estado },
      };
    }

    case "clase": {
      const materia = (data.materia || data.subject || data.name || "Clase Universitaria").trim();
      const title = `Clase: ${materia}`;
      const horaPart = data.horaInicio ? ` a las ${data.horaInicio} hs` : "";
      const aulaPart = data.aulas ? ` en el Aula ${data.aulas}` : "";
      const body = `Tienes clase de ${materia}${horaPart}${aulaPart}`.trim();

      return {
        title,
        body,
        category: "universidad",
        tag: `clase-${data.id || materia}`,
        accentColor,
        data: { id: data.id, type: itemType, materia },
      };
    }

    case "trabajo": {
      const titleName = (data.title || "Tarea / Entrega").trim();
      const type = data.type || "Entrega";
      return {
        title: `${type}: ${titleName}`,
        body: `Vence hoy la entrega de ${titleName}.`,
        category: "universidad",
        tag: `trabajo-${data.id || titleName}`,
        accentColor,
        data: { id: data.id, type: itemType, title: titleName },
      };
    }

    case "medication": {
      const disp = data.disp || data;
      const details = data.details || {};
      const nombreMed = (details.marca || details.droga || disp.name || "Medicamento").trim();
      const mgPart = details.mg ? ` ${details.mg}mg` : "";
      const estado = details.estado || "Control de Medicación";
      const dispPart = details.disponibleHasta ? ` • Disponible hasta ${details.disponibleHasta}` : "";

      return {
        title: `Medicamento: ${nombreMed}${mgPart}`,
        body: `${estado} para hoy${dispPart}.`,
        category: "salud",
        tag: `medication-${disp.id || nombreMed}`,
        accentColor,
        data: { id: disp.id, type: itemType, nombreMed },
      };
    }

    default:
      return null;
  }
}

/**
 * Helper to extract assigned hour and minute from an agenda item.
 */
export function getItemAssignedTime(item: { itemType: string; data: any }): { hours: number; minutes: number; timeStr: string } | null {
  const { data } = item;
  if (!data) return null;

  let rawTime = (data.hora || data.time || data.horaInicio || "").toString().trim();
  
  if (!rawTime && data.fecha && typeof data.fecha === "string" && data.fecha.includes("T")) {
    const timePart = data.fecha.split("T")[1]?.slice(0, 5);
    if (timePart && timePart !== "00:00") {
      rawTime = timePart;
    }
  }

  if (!rawTime) return null;

  // Extract HH:mm using regex
  const match = rawTime.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      return { hours, minutes, timeStr };
    }
  }

  return null;
}

/**
 * Evaluate items for today's agenda and notify pending tasks according to scheduled timing:
 * 1. Without assigned time: Notified automatically at 8:00 AM (or whenever active at/after 8:00 AM).
 * 2. With assigned time:
 *    - 1st notice: 2 hours before the assigned time.
 *    - 2nd notice: 1 hour before the assigned time.
 *    - 3rd notice: Exactly at the assigned time.
 */
export async function evaluateAndNotifyTodayAgenda(
  agendaItems: Array<{ itemType: string; data: any }>,
  isToday: boolean,
  forceNotifyAll: boolean = false
): Promise<{ count: number; notifiedTitles: string[] }> {
  if (!isToday || !agendaItems || agendaItems.length === 0) {
    return { count: 0, notifiedTitles: [] };
  }

  const permission = getNotificationPermission();
  if (permission !== "granted") {
    return { count: 0, notifiedTitles: [] };
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const notifiedTitles: string[] = [];

  for (const item of agendaItems) {
    const payload = formatAgendaItemNotification(item);
    if (!payload) continue;

    const assignedTime = getItemAssignedTime(item);

    if (forceNotifyAll) {
      // Direct manual trigger / test mode
      const success = await showAgendaNotification(payload);
      if (success) {
        notifiedTitles.push(payload.title);
      }
      continue;
    }

    if (!assignedTime) {
      // Rule 1: No assigned time -> Notify at 8:00 AM or after (currentMinutes >= 8 * 60 = 480)
      if (currentMinutes >= 480) {
        const storageKey = `notif_sent_${todayStr}_${payload.tag}_8am`;
        if (!localStorage.getItem(storageKey)) {
          const success = await showAgendaNotification({
            ...payload,
            tag: `${payload.tag}-8am`,
          });
          if (success) {
            localStorage.setItem(storageKey, "true");
            notifiedTitles.push(payload.title);
          }
        }
      }
    } else {
      // Rule 2: Assigned time -> 2 hours before, 1 hour before, and at exact time
      const eventMinutes = assignedTime.hours * 60 + assignedTime.minutes;
      const minutesDiff = eventMinutes - currentMinutes;

      // 2.1: Exactly at the assigned time (or within 30 min window after)
      if (currentMinutes >= eventMinutes && currentMinutes <= eventMinutes + 30) {
        const storageKey = `notif_sent_${todayStr}_${payload.tag}_exact`;
        if (!localStorage.getItem(storageKey)) {
          const success = await showAgendaNotification({
            ...payload,
            tag: `${payload.tag}-exact`,
            body: `${payload.body} (¡Es ahora! - ${assignedTime.timeStr} hs)`,
          });
          if (success) {
            localStorage.setItem(storageKey, "true");
            notifiedTitles.push(`${payload.title} (Ahora)`);
          }
        }
      }

      // 2.2: 1 hour before the assigned time (between -60m and -1m)
      if (minutesDiff <= 60 && minutesDiff > 0) {
        const storageKey = `notif_sent_${todayStr}_${payload.tag}_1h_before`;
        if (!localStorage.getItem(storageKey)) {
          const success = await showAgendaNotification({
            ...payload,
            tag: `${payload.tag}-1h`,
            body: `${payload.body} (En 1 hora - ${assignedTime.timeStr} hs)`,
          });
          if (success) {
            localStorage.setItem(storageKey, "true");
            notifiedTitles.push(`${payload.title} (En 1h)`);
          }
        }
      }

      // 2.3: 2 hours before the assigned time (between -120m and -60m)
      if (minutesDiff <= 120 && minutesDiff > 60) {
        const storageKey = `notif_sent_${todayStr}_${payload.tag}_2h_before`;
        if (!localStorage.getItem(storageKey)) {
          const success = await showAgendaNotification({
            ...payload,
            tag: `${payload.tag}-2h`,
            body: `${payload.body} (En 2 horas - ${assignedTime.timeStr} hs)`,
          });
          if (success) {
            localStorage.setItem(storageKey, "true");
            notifiedTitles.push(`${payload.title} (En 2h)`);
          }
        }
      }
    }
  }

  return { count: notifiedTitles.length, notifiedTitles };
}
