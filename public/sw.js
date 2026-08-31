// Service Worker for FSR Workspace PWA with Native Push & Agenda Central Notifications

const CACHE_NAME = "fsr-workspace-v1";

// Transparent FSR Logo Badge for Android Status Bar (Monochrome white silhouette on transparent background)
const STATUS_BAR_BADGE = "/badge-icon.png";

// Dynamic Category Icon Builder featuring FSR Logo and Device Accent Color
function createCategorySvg(category, accentColor) {
  const accent = accentColor || "#8ab4f8";
  // Embedded FSR Star Watermark
  const fsrWatermark = `<path d="M 104,24 Q 104,40 120,40 Q 104,40 104,56 Q 104,40 88,40 Q 104,40 104,24 Z" fill="#ffffff" opacity="0.9"/>`;

  switch (category) {
    case "turnos":
      return "data:image/svg+xml;utf8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
          <rect width="128" height="128" rx="36" fill="#09090b"/>
          <rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>
          ${fsrWatermark}
          <rect x="28" y="42" width="72" height="58" rx="12" fill="none" stroke="${accent}" stroke-width="7"/>
          <line x1="28" y1="60" x2="100" y2="60" stroke="${accent}" stroke-width="7"/>
          <line x1="44" y1="30" x2="44" y2="44" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
          <line x1="84" y1="30" x2="84" y2="44" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
          <circle cx="48" cy="76" r="4" fill="#ffffff"/>
          <circle cx="64" cy="76" r="4" fill="#ffffff"/>
          <circle cx="80" cy="76" r="4" fill="#ffffff"/>
        </svg>
      `);
    case "finanzas":
      return "data:image/svg+xml;utf8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
          <rect width="128" height="128" rx="36" fill="#09090b"/>
          <rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>
          ${fsrWatermark}
          <circle cx="64" cy="68" r="34" fill="none" stroke="${accent}" stroke-width="7"/>
          <text x="64" y="82" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="#ffffff" text-anchor="middle">$</text>
        </svg>
      `);
    case "universidad":
      return "data:image/svg+xml;utf8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
          <rect width="128" height="128" rx="36" fill="#09090b"/>
          <rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>
          ${fsrWatermark}
          <path d="M64 36 L98 52 L64 68 L30 52 Z" fill="${accent}"/>
          <path d="M42 60 L42 82 Q64 94 86 82 L86 60" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
          <line x1="98" y1="52" x2="98" y2="84" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
        </svg>
      `);
    case "salud":
      return "data:image/svg+xml;utf8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
          <rect width="128" height="128" rx="36" fill="#09090b"/>
          <rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>
          ${fsrWatermark}
          <path d="M64 96 C64 96 32 74 32 52 C32 40 42 32 53 32 C60 32 63 36 64 39 C65 36 68 32 75 32 C86 32 96 40 96 52 C96 74 64 96 64 96 Z" fill="${accent}"/>
        </svg>
      `);
    case "comidas":
      return "data:image/svg+xml;utf8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
          <rect width="128" height="128" rx="36" fill="#09090b"/>
          <rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>
          ${fsrWatermark}
          <circle cx="64" cy="68" r="32" fill="none" stroke="${accent}" stroke-width="6"/>
          <circle cx="64" cy="68" r="20" fill="none" stroke="#ffffff" stroke-width="4"/>
        </svg>
      `);
    default:
      return "data:image/svg+xml;utf8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
          <rect width="128" height="128" rx="36" fill="#09090b"/>
          <rect x="12" y="12" width="104" height="104" rx="28" fill="${accent}" opacity="0.15"/>
          <path d="M 64,28 Q 64,64 100,64 Q 64,64 64,100 Q 64,64 28,64 Q 64,64 64,28 Z" fill="#ffffff"/>
        </svg>
      `);
  }
}

// 1. Installation: activate immediately
self.addEventListener("install", () => {
  self.skipWaiting();
});

// 2. Activation: claim all active clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log("[Service Worker] Activado y controlando clientes para Notificaciones de Agenda.");
    })
  );
});

// 3. Push Event: handle push messages coming from server/cloud
self.addEventListener("push", (event) => {
  let data = {
    title: "Agenda Central Integrada",
    body: "Tienes una tarea o evento pendiente para hoy.",
    category: "general",
    accentColor: "#8ab4f8",
    tag: "agenda-today",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const category = (data.category || "general").toLowerCase();
  const accentColor = data.accentColor || "#8ab4f8";
  const icon = data.icon || createCategorySvg(category, accentColor);
  const badge = data.badge || STATUS_BAR_BADGE;

  const options = {
    body: data.body,
    icon: icon,
    badge: badge,
    color: accentColor, // Native Android notification accent tint
    tag: data.tag || `agenda-${Date.now()}`,
    data: {
      url: data.url || "/",
      category: category,
      accentColor: accentColor,
      timestamp: Date.now(),
      ...(data.data || {}),
    },
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 4. Message Event: allow React client to trigger notifications or sync agenda tasks
self.addEventListener("message", (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  if (type === "SHOW_NOTIFICATION" && payload) {
    const category = (payload.category || "general").toLowerCase();
    const accentColor = payload.accentColor || "#8ab4f8";
    const icon = payload.icon || createCategorySvg(category, accentColor);
    const badge = payload.badge || STATUS_BAR_BADGE;

    const options = {
      body: payload.body || "Tarea o evento pendiente para hoy.",
      icon: icon,
      badge: badge,
      color: accentColor, // Device accent color
      tag: payload.tag || `agenda-${category}-${Date.now()}`,
      data: {
        url: payload.url || "/",
        category: category,
        accentColor: accentColor,
        timestamp: Date.now(),
        ...(payload.data || {}),
      },
      vibrate: [200, 100, 200],
      renotify: true,
      requireInteraction: false,
    };

    event.waitUntil(
      self.registration.showNotification(payload.title || "Agenda Central Integrada", options)
    );
  } else if (type === "PING") {
    event.source?.postMessage({ type: "PONG", time: Date.now() });
  }
});

// 5. Notification Click: focus or open the PWA window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
