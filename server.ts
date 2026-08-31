import express from "express";
import path from "path";
import http from "http";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";
import { WebSocketServer } from "ws";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const app = express();
const server = http.createServer(app);

// Configure body-parser limit to 50MB BEFORE any route definitions
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 5e7 // 50 MB
});

// Helper to normalize user room format strictly as user_${userId}
function getUserRoom(id: string): string {
  const cleanId = (id || "hernanmaximiliano10@gmail.com").trim();
  return cleanId.startsWith("user_") ? cleanId : `user_${cleanId}`;
}

// Persistent server-side state storage
const STATE_FILE_PATH = path.join(process.cwd(), "user_server_state.json");

function loadServerStates(): Record<string, any> {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const data = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading user_server_state.json:", err);
  }
  return {};
}

const serverUserStates: Record<string, any> = loadServerStates();
const serverDeletedIds: Record<string, Set<string>> = {};

function saveServerStates() {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(serverUserStates, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving user_server_state.json:", err);
  }
}

const AESTHETIC_KEYS = [
  "themeColor", "theme_color",
  "backgroundStyle", "liquid_background_style",
  "darkMode", "dark_mode",
  "menuVisibility", "app_menu_visibility",
  "sidebarOpen", "activeSubTab", "currentTab"
];

function sanitizePayload(data: any): any {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data;
  const cleanObj: any = {};
  for (const key of Object.keys(data)) {
    if (!AESTHETIC_KEYS.includes(key)) {
      cleanObj[key] = data[key];
    }
  }
  return cleanObj;
}

function updateServerUserState(room: string, payload: any, category?: string, action?: string, deletedId?: string | number) {
  if (!serverUserStates[room]) {
    serverUserStates[room] = {
      _lastUpdated: Date.now(),
    };
  }

  const userStore = serverUserStates[room];
  userStore._lastUpdated = Date.now();

  // Strip any legacy aesthetic keys from store
  for (const key of AESTHETIC_KEYS) {
    delete userStore[key];
  }

  const cleanPayload = sanitizePayload(payload);

  const knownCollections = [
    "turnosCompromisos", "appointments", "subjects", "tasks", "notes",
    "materiasInfo", "pantry", "meals", "shoppingList", "invoices",
    "payments", "detailedPayments", "gastosVarios", "inversiones",
    "cotizacionesAcciones", "cotizacionesCripto", "budgets", "routines",
    "medications", "bpLogs", "doctors", "notifications", "mercaderia",
    "alimentos", "platos", "organizacionSemanal", "medicamentosDetallados",
    "disponibilidadMedicamentos", "deportesActividades", "medicalRecords",
    "alimentacionLogs", "horarios", "examenes"
  ];

  const normalizeCategory = (cat?: string): string | null => {
    if (!cat) return null;
    if (cat === "shopping") return "shoppingList";
    if (cat === "turnos") return "turnosCompromisos";
    if (cat === "consultas") return "appointments";
    if (cat === "materias") return "materiasInfo";
    if (cat === "bloodPressure") return "bpLogs";
    if (cat === "deportes") return "deportesActividades";
    if (cat === "estudios") return "medicalRecords";
    if (cat === "alimentacion") return "alimentacionLogs";
    return cat;
  };

  const normCat = normalizeCategory(category);

  if (deletedId) {
    const strId = String(deletedId);
    if (normCat && Array.isArray(userStore[normCat])) {
      userStore[normCat] = userStore[normCat].filter((item: any) => String(item?.id) !== strId);
    } else {
      for (const key of knownCollections) {
        if (Array.isArray(userStore[key])) {
          userStore[key] = userStore[key].filter((item: any) => String(item?.id) !== strId);
        }
      }
    }
  }

  if (cleanPayload && typeof cleanPayload === "object") {
    let updatedAny = false;

    // Check if payload contains collection arrays directly
    for (const key of knownCollections) {
      if (Array.isArray(cleanPayload[key])) {
        userStore[key] = cleanPayload[key];
        updatedAny = true;
      }
    }

    if (!updatedAny && normCat) {
      if (Array.isArray(cleanPayload)) {
        userStore[normCat] = cleanPayload;
        updatedAny = true;
      } else if (cleanPayload[normCat] && Array.isArray(cleanPayload[normCat])) {
        userStore[normCat] = cleanPayload[normCat];
        updatedAny = true;
      } else if (category && cleanPayload[category] && Array.isArray(cleanPayload[category])) {
        userStore[category] = cleanPayload[category];
        updatedAny = true;
      }
    }
  }

  saveServerStates();
  return userStore;
}

io.on("connection", (socket) => {
  const rawUserId =
    socket.handshake.auth?.userId ||
    socket.handshake.query?.userId ||
    "hernanmaximiliano10@gmail.com";

  const userRoom = getUserRoom(rawUserId);

  // Join the user's specific room user_${userId}
  socket.join(userRoom);
  if (rawUserId !== userRoom) {
    socket.join(rawUserId);
  }

  // Handler for joining explicit user room
  socket.on("joinUserRoom", (targetUserId: string) => {
    if (targetUserId) {
      const room = getUserRoom(targetUserId);
      socket.join(room);
      if (targetUserId !== room) socket.join(targetUserId);
    }
  });

  socket.on("join", (targetUserId: string) => {
    if (targetUserId) {
      const room = getUserRoom(targetUserId);
      socket.join(room);
    }
  });

  // Handler for state update mutations
  const handleStateMutation = (eventName: string, data: any) => {
    const targetUserId =
      data?.userId ||
      socket.handshake.auth?.userId ||
      socket.handshake.query?.userId ||
      "hernanmaximiliano10@gmail.com";

    const targetRoom = getUserRoom(targetUserId);
    const rawPayload = data?.payload || data?.details || data;
    const deletedId = data?.deletedId || data?.id || (data?.action === "delete" ? (data?.payload?.id || data?.id) : null);

    updateServerUserState(targetRoom, rawPayload, data?.category, data?.action, deletedId);

    const broadcastPayload = {
      payload: rawPayload,
      category: data?.category || "global",
      action: data?.action || "update",
      deletedId: deletedId,
      id: deletedId,
      userId: targetUserId,
      room: targetRoom,
      senderId: socket.id,
      timestamp: Date.now(),
    };

    // Broadcast state_updated and data_updated to all OTHER sockets in the user's room (excluding sender)
    socket.to(targetRoom).emit("state_updated", broadcastPayload);
    socket.to(targetRoom).emit("dataUpdated", broadcastPayload);
    socket.to(targetRoom).emit("data_updated", broadcastPayload);
  };

  socket.on("state_updated", (data) => handleStateMutation("state_updated", data));
  socket.on("data_updated", (data) => handleStateMutation("data_updated", data));
  socket.on("mutateState", (data) => handleStateMutation("mutateState", data));
  socket.on("update_state", (data) => handleStateMutation("update_state", data));

  socket.on("disconnect", (_reason) => {
  });
});

app.set("io", io);

// Emergency Direct Disk Save Endpoint (State Fallback)
app.post("/api/workspace/force-save", (req, res) => {
  try {
    const { userId, payload, category, senderId } = req.body || {};
    const targetUserId = userId || "hernanmaximiliano10@gmail.com";
    const targetRoom = getUserRoom(targetUserId);

    if (!payload) {
      return res.status(400).json({ success: false, error: "Falta el payload para guardar." });
    }

    const updatedStore = updateServerUserState(targetRoom, payload, category);
    saveServerStates();

    const broadcastPayload = {
      payload: payload,
      category: category || "global",
      action: "force_save",
      userId: targetUserId,
      room: targetRoom,
      senderId: senderId || "force_save_http",
      timestamp: Date.now(),
    };

    io.to(targetRoom).emit("state_updated", broadcastPayload);
    io.to(targetRoom).emit("dataUpdated", broadcastPayload);

    return res.status(200).json({
      success: true,
      message: "Estado guardado forzosamente en disco de forma directa",
      room: targetRoom,
      data: updatedStore,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Error en POST /api/workspace/force-save:", error);
    return res.status(500).json({ success: false, error: error?.message || "Error al forzar el guardado en disco" });
  }
});

// Lightweight REST Granular Mutations Endpoint (Chunking & Item-Level Updates)
app.post("/api/mutations", (req, res) => {
  try {
    const { userId, category, action, payload, itemId, senderId, chunkIndex, totalChunks } = req.body || {};
    const targetUserId = userId || "hernanmaximiliano10@gmail.com";
    const targetRoom = getUserRoom(targetUserId);

    if (!category) {
      return res.status(400).json({ success: false, error: "Falta la categoría para aplicar la mutación." });
    }

    if (!serverUserStates[targetRoom]) {
      serverUserStates[targetRoom] = {};
    }
    const currentStore = serverUserStates[targetRoom];

    if (action === "DELETE_ITEM" || action === "DELETE") {
      const targetId = itemId || (payload && payload.id);
      if (targetId != null) {
        if (Array.isArray(currentStore[category])) {
          currentStore[category] = currentStore[category].filter((item: any) => item && String(item.id) !== String(targetId));
        }
        if (!serverDeletedIds[targetRoom]) {
          serverDeletedIds[targetRoom] = new Set<string>();
        }
        serverDeletedIds[targetRoom].add(String(targetId));
      }
    } else if (action === "ADD_ITEM" || action === "UPDATE_ITEM") {
      if (payload && typeof payload === "object") {
        if (!Array.isArray(currentStore[category])) {
          currentStore[category] = [];
        }
        const list = currentStore[category];
        const targetId = payload.id || itemId;
        const idx = list.findIndex((item: any) => item && String(item.id) === String(targetId));
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...payload, updatedAt: Date.now() };
        } else {
          list.push({ ...payload, updatedAt: Date.now() });
        }
      }
    } else if (action === "CHUNK_UPDATE") {
      if (Array.isArray(payload)) {
        if (chunkIndex === 0 || !Array.isArray(currentStore[category])) {
          currentStore[category] = [...payload];
        } else {
          const existingMap = new Map<string, any>();
          currentStore[category].forEach((item: any) => {
            if (item && item.id != null) existingMap.set(String(item.id), item);
          });
          payload.forEach((item: any) => {
            if (item && item.id != null) existingMap.set(String(item.id), item);
          });
          currentStore[category] = Array.from(existingMap.values());
        }
      }
    } else {
      if (payload !== undefined) {
        if (typeof payload === "object" && payload !== null && payload[category] !== undefined) {
          currentStore[category] = payload[category];
        } else {
          currentStore[category] = payload;
        }
      }
    }

    serverUserStates[targetRoom] = currentStore;
    saveServerStates();

    const broadcastPayload = {
      category,
      action: action || "mutate",
      payload: payload,
      userId: targetUserId,
      room: targetRoom,
      senderId: senderId || "rest_mutation",
      timestamp: Date.now(),
    };

    io.to(targetRoom).emit("data_updated", broadcastPayload);
    io.to(targetRoom).emit("state_updated", broadcastPayload);
    io.to(targetRoom).emit("dataUpdated", broadcastPayload);

    return res.status(200).json({
      success: true,
      message: "Mutación procesada y guardada correctamente",
      category,
      action,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Error en POST /api/mutations:", error);
    return res.status(500).json({ success: false, error: error?.message || "Error al procesar la mutación" });
  }
});

// Lazy initializer for GoogleGenAI to prevent crashing if GEMINI_API_KEY is not set
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Falta la clave GEMINI_API_KEY. Configúrala en la pestaña Settings > Secrets."
      );
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// REST API Endpoints

// 1. Health & Configuration status check
app.get("/api/status", (req, res) => {
  const apiKeySet = !!process.env.GEMINI_API_KEY;
  res.json({
    status: "ok",
    apiKeyConfigured: apiKeySet,
    message: apiKeySet
      ? "Gemini API está conectada correctamente."
      : "Gemini API no configurada. Configure GEMINI_API_KEY en Settings > Secrets.",
  });
});

// 2. Forced Reconciliation & Synchronization Endpoints
app.get("/api/sync/state", (req, res) => {
  try {
    const rawUserId = (req.query.userId as string) || "hernanmaximiliano10@gmail.com";
    const targetRoom = getUserRoom(rawUserId);
    const userStore = serverUserStates[targetRoom] || null;

    const cleanStore = userStore ? sanitizePayload(userStore) : null;

    res.json({
      success: true,
      room: targetRoom,
      data: cleanStore,
    });
  } catch (error: any) {
    console.error("Error en GET /api/sync/state:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/sync/state", (req, res) => {
  try {
    const { userId, payload, category, senderId } = req.body || {};
    const targetUserId = userId || "hernanmaximiliano10@gmail.com";
    const targetRoom = getUserRoom(targetUserId);

    const updatedStore = updateServerUserState(targetRoom, payload, category);

    const broadcastPayload = {
      payload: payload,
      category: category || "global",
      action: "sync_reconciled",
      userId: targetUserId,
      room: targetRoom,
      senderId: senderId || "server_http",
      timestamp: Date.now(),
    };

    // Broadcast state_updated and data_updated immediately via WebSocket to all clients in targetRoom
    io.to(targetRoom).emit("state_updated", broadcastPayload);
    io.to(targetRoom).emit("dataUpdated", broadcastPayload);
    io.to(targetRoom).emit("data_updated", broadcastPayload);

    res.json({
      success: true,
      message: "Estado sincronizado y retransmitido correctamente por WebSocket",
      room: targetRoom,
      data: updatedStore,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Error en POST /api/sync/state:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// In-memory cache for Places Search queries
const placesCache = new Map<string, any>();

// Fallback search database for San Juan, Argentina (especially medical facilities and key entities)
const FALLBACK_PLACES = [
  { display_name: "Hospital Dr. Guillermo Rawson, Av. Rawson 494 Sur, Capital, San Juan, Argentina", lat: "-31.5413", lon: "-68.5186" },
  { display_name: "Hospital Dr. Marcial Quiroga, Av. Libertador Gral. San Martín 5400 Oeste, Rivadavia, San Juan, Argentina", lat: "-31.5307", lon: "-68.5839" },
  { display_name: "Sanatorio San Juan, General Acha 124 Sur, Capital, San Juan, Argentina", lat: "-31.5398", lon: "-68.5244" },
  { display_name: "Clínica Santa Clara, General Acha 320 Sur, Capital, San Juan, Argentina", lat: "-31.5412", lon: "-68.5242" },
  { display_name: "Sanatorio Argentino, San Luis 432 Oeste, Capital, San Juan, Argentina", lat: "-31.5348", lon: "-68.5284" },
  { display_name: "Clínica El Castaño, Lateral Circunvalación 282 Sur, Capital, San Juan, Argentina", lat: "-31.5222", lon: "-68.5520" },
  { display_name: "Hospital Privado Colegio Médico, Las Heras 444 Sur, Capital, San Juan, Argentina", lat: "-31.5415", lon: "-68.5350" },
  { display_name: "Instituto de Traumatología, Santiago del Estero 231 Sur, Capital, San Juan, Argentina", lat: "-31.5385", lon: "-68.5312" },
  { display_name: "CIMAC San Juan, Rivadavia 580 Oeste, Capital, San Juan, Argentina", lat: "-31.5365", lon: "-68.5310" },
  { display_name: "Laboratorio San Martín, San Martín 350 Oeste, Capital, San Juan, Argentina", lat: "-31.5350", lon: "-68.5280" },
  { display_name: "Laboratorio Dr. Soria, Mendoza 450 Sur, Capital, San Juan, Argentina", lat: "-31.5395", lon: "-68.5255" },
  { display_name: "Hospital de Niños, Sarmiento 600 Norte, Capital, San Juan, Argentina", lat: "-31.5301", lon: "-68.5212" },
  { display_name: "Obra Social Provincia (OSP), Sarmiento 250 Sur, Capital, San Juan, Argentina", lat: "-31.5372", lon: "-68.5230" },
  { display_name: "Municipalidad de la Ciudad de San Juan, Caseros 298 Sur, Capital, San Juan, Argentina", lat: "-31.5388", lon: "-68.5218" },
  { display_name: "Centro de Salud Rawson, Villa Krause, Rawson, San Juan, Argentina", lat: "-31.5794", lon: "-68.5251" },
  { display_name: "OSECAC San Juan, Mendoza 230 Sur, Capital, San Juan, Argentina", lat: "-31.5381", lon: "-68.5258" },
  { display_name: "PAMI San Juan, Córdoba 350 Oeste, Capital, San Juan, Argentina", lat: "-31.5361", lon: "-68.5289" },
  { display_name: "Catedral de San Juan, Capital, San Juan, Argentina", lat: "-31.5372", lon: "-68.5250" },
  { display_name: "Parque de Mayo, Capital, San Juan, Argentina", lat: "-31.5314", lon: "-68.5389" },
  { display_name: "Terminal de Omnibus San Juan, Capital, San Juan, Argentina", lat: "-31.5391", lon: "-68.5144" },
  { display_name: "OSDE Filial San Juan, General Acha 250 Sur, Capital, San Juan, Argentina", lat: "-31.5355", lon: "-68.5246" },
  { display_name: "SMI San Juan, Capital, San Juan, Argentina", lat: "-31.5380", lon: "-68.5290" },
  { display_name: "Swiss Medical San Juan, Av. Ignacio de la Roza 220 Oeste, Capital, San Juan, Argentina", lat: "-31.5360", lon: "-68.5270" },
  { display_name: "Hospital Español San Juan, Av. España 1050 Sur, Capital, San Juan, Argentina", lat: "-31.5510", lon: "-68.5310" },
  { display_name: "Clínica de la Ciudad, Santa Fe 340 Oeste, Capital, San Juan, Argentina", lat: "-31.5420", lon: "-68.5220" }
];

// Real OpenStreetMap Photon API Geocoder (Komoot / OSM)
async function searchPhotonPlaces(query: string, userLat: string, userLon: string) {
  try {
    const searchQuery = query.toLowerCase().includes("san juan") || query.toLowerCase().includes("argentina") ? query : `${query} San Juan Argentina`;
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&lat=${userLat}&lon=${userLon}&lang=es&limit=6`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MyArgentineHomeApp/1.0" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.features && Array.isArray(data.features) && data.features.length > 0) {
        return data.features
          .filter((f: any) => f.geometry?.coordinates)
          .map((f: any) => {
            const p = f.properties || {};
            const coords = f.geometry.coordinates; // [lon, lat]
            const lon = String(coords[0]);
            const lat = String(coords[1]);

            const name = p.name || "";
            const street = p.street || "";
            const houseNumber = p.housenumber || "";
            let streetAddr = [street, houseNumber].filter(Boolean).join(" ");

            const city = p.city || p.district || p.county || p.state || "San Juan";
            const state = p.state || "San Juan";

            const title = name || streetAddr || query;
            const fullAddress = [streetAddr, city, state, "Argentina"].filter(Boolean).join(", ");
            const displayName = name && streetAddr && name.toLowerCase() !== streetAddr.toLowerCase()
              ? `${name} - ${fullAddress}`
              : (streetAddr ? `${streetAddr}, ${city}, San Juan, Argentina` : `${title}, ${city}, San Juan, Argentina`);

            return {
              title,
              address: fullAddress,
              display_name: displayName,
              lat,
              lon,
            };
          });
      }
    }
  } catch (err) {
    console.warn("Photon geocoder error:", err);
  }
  return [];
}

// Real OpenStreetMap Nominatim Geocoder
async function searchNominatimPlaces(query: string, userLat: string, userLon: string) {
  try {
    const searchQuery = query.toLowerCase().includes("san juan") || query.toLowerCase().includes("argentina") ? query : `${query}, San Juan, Argentina`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(searchQuery)}&limit=6&lat=${userLat}&lon=${userLon}&countrycodes=ar&viewbox=-68.70,-31.65,-68.35,-31.40`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MyArgentineHomeApp/1.0 (hernanmaximiliano10@gmail.com)" },
    });
    if (res.ok) {
      const rawData = await res.json();
      if (Array.isArray(rawData) && rawData.length > 0) {
        return rawData.map((item: any) => {
          const addr = item.address || {};
          const road = addr.road || addr.pedestrian || addr.footway || addr.street || "";
          const houseNum = addr.house_number || addr.housenumber || "";
          let streetPart = [road, houseNum].filter(Boolean).join(" ");

          // Fallback: extract street segment from display_name if road is missing
          if (!streetPart && item.display_name) {
            const parts = item.display_name.split(",").map((p: string) => p.trim());
            if (parts.length > 1 && !parts[0].toLowerCase().includes("san juan")) {
              streetPart = parts.slice(0, 2).join(" ");
            }
          }

          const poiName = item.name || addr.amenity || addr.hospital || addr.clinic || addr.shop || addr.building || addr.office || "";
          const cityPart = addr.city || addr.town || addr.suburb || addr.city_district || addr.county || "San Juan";
          const fullAddress = [streetPart, cityPart, "San Juan, Argentina"].filter(Boolean).join(", ");

          const title = poiName || streetPart || item.display_name.split(",")[0];
          const displayName = poiName && streetPart && poiName.toLowerCase() !== streetPart.toLowerCase()
            ? `${poiName} - ${fullAddress}`
            : (streetPart ? `${streetPart}, ${cityPart}, San Juan, Argentina` : item.display_name);

          return {
            title,
            address: fullAddress,
            display_name: displayName,
            lat: String(item.lat),
            lon: String(item.lon),
          };
        });
      }
    }
  } catch (err) {
    console.warn("Nominatim geocoder error:", err);
  }
  return [];
}

// Helper function to geocode using Gemini AI (Google Maps Quality Geocoder)
async function getGeminiPlaces(query: string, userLat?: string, userLon?: string) {
  try {
    const ai = getGeminiClient();
    const prompt = `Eres el buscador geográfico oficial de mapas para San Juan y Argentina.
El usuario está buscando una dirección, sanatorio, hospital, consultorio, comercio o lugar exacto: "${query}".
Coordenadas GPS de referencia: latitud ${userLat || "-31.5375"}, longitud ${userLon || "-68.5364"} (San Juan, Argentina).

INSTRUCCIONES DE ALTA PRECISIÓN:
1. Devuelve entre 3 y 5 opciones geográficas reales en San Juan o Argentina con latitud y longitud exactas.
2. CADA OPCIÓN DEBE INCLUIR LA CALLE Y ALTURA / NÚMERO EXACTO en la dirección (ej: "San Luis 432 Oeste", "General Acha 124 Sur", "Av. Rawson 490 Sur", "Rivadavia 580 Oeste", "Av. Libertador 5400 Oeste").
3. Para cada objeto devuelve exactamente:
   - "title": Nombre principal del lugar o establecimiento (ej: "Sanatorio Argentino" o "Mendoza 400 Sur")
   - "address": Dirección completa con calle, altura, departamento/localidad y provincia (ej: "San Luis 432 Oeste, Capital, San Juan, Argentina")
   - "display_name": Nombre completo con dirección (ej: "Sanatorio Argentino - San Luis 432 Oeste, Capital, San Juan, Argentina")
   - "lat": Latitud decimal precisa como string (ej: "-31.5348")
   - "lon": Longitud decimal precisa como string (ej: "-68.5284")`;

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          address: { type: Type.STRING },
          display_name: { type: Type.STRING },
          lat: { type: Type.STRING },
          lon: { type: Type.STRING },
        },
        required: ["title", "address", "display_name", "lat", "lon"],
      },
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
    } catch (e: any) {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
    }

    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("quota") || err?.status === 503) {
      console.warn("Gemini places search rate limited, using secondary geocoder.");
    } else {
      console.error("Error fetching places from Gemini:", err);
    }
  }
  return null;
}

// Proxy for Places Search with Google Maps intelligence, Nominatim fallback & caching
app.get("/api/places/search", async (req, res) => {
  const { q, lat, lon } = req.query;
  if (!q || typeof q !== "string" || q.trim().length < 2) {
    return res.json([]);
  }

  const queryClean = q.trim().toLowerCase();
  const cacheKey = `${queryClean}_${lat || ""}_${lon || ""}`;

  // Check in-memory cache first
  if (placesCache.has(cacheKey)) {
    return res.json(placesCache.get(cacheKey));
  }

  const latitude = lat ? String(lat) : "-31.5375";
  const longitude = lon ? String(lon) : "-68.5364";

  // Check curated fallback list for direct matches first
  const matchedCurated = FALLBACK_PLACES.filter((place) => {
    const dClean = place.display_name.toLowerCase();
    return dClean.includes(queryClean) || queryClean.includes(dClean.split(",")[0].toLowerCase());
  }).map((p) => {
    const parts = p.display_name.split(",");
    const title = parts[0].trim();
    const address = parts.slice(1).join(",").trim();
    return {
      title,
      address,
      display_name: p.display_name,
      lat: p.lat,
      lon: p.lon,
    };
  });

  try {
    // Execute Gemini AI (Google Maps Quality) + Photon + Nominatim in parallel
    const [geminiData, photonResults, nominatimResults] = await Promise.all([
      getGeminiPlaces(String(q), latitude, longitude),
      searchPhotonPlaces(String(q), latitude, longitude),
      searchNominatimPlaces(String(q), latitude, longitude),
    ]);

    const combinedResults: any[] = [];

    const addUnique = (item: any) => {
      if (!item || !item.lat || !item.lon) return;
      const key = `${parseFloat(item.lat).toFixed(4)}_${parseFloat(item.lon).toFixed(4)}`;
      const titleKey = (item.title || "").toLowerCase().trim();

      const exists = combinedResults.some((existing) => {
        const eKey = `${parseFloat(existing.lat).toFixed(4)}_${parseFloat(existing.lon).toFixed(4)}`;
        const eTitle = (existing.title || "").toLowerCase().trim();
        return eKey === key || (eTitle.length > 4 && eTitle === titleKey);
      });

      if (!exists) {
        combinedResults.push(item);
      }
    };

    // 1. Add Gemini AI results first (highest quality, exact street numbers)
    if (geminiData && Array.isArray(geminiData)) {
      geminiData.forEach(addUnique);
    }

    // 2. Add Curated matches
    matchedCurated.forEach(addUnique);

    // 3. Add OSM Photon + Nominatim
    photonResults.forEach(addUnique);
    nominatimResults.forEach(addUnique);

    const finalResults = combinedResults.length > 0 ? combinedResults : [
      {
        title: String(q),
        address: "San Juan, Argentina",
        display_name: `${q}, San Juan, Argentina`,
        lat: latitude,
        lon: longitude,
      },
    ];

    placesCache.set(cacheKey, finalResults);
    return res.json(finalResults);
  } catch (error: any) {
    console.error("Error in places search proxy:", error);
    const fallbackData = matchedCurated.length > 0 ? matchedCurated : [
      {
        title: String(q),
        address: "San Juan, Argentina",
        display_name: `${q}, San Juan, Argentina`,
        lat: latitude,
        lon: longitude,
      },
    ];
    return res.json(fallbackData);
  }
});

// Proxy for Reverse Geocoding (lat/lon to address) with Nominatim + Gemini fallback
app.get("/api/reverse-geocode", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }

  const latitude = String(lat);
  const longitude = String(lon);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "MyArgentineHomeApp/1.0 (hernanmaximiliano10@gmail.com)",
      },
    });

    if (response.ok) {
      const item = await response.json();
      if (item && item.address) {
        const addr = item.address;
        const road = addr.road || addr.pedestrian || addr.footway || addr.street || "";
        const houseNum = addr.house_number || addr.housenumber || "";
        const streetPart = [road, houseNum].filter(Boolean).join(" ");
        const poiName = item.name || addr.amenity || addr.hospital || addr.clinic || addr.shop || addr.building || addr.office || "";
        const cityPart = addr.city || addr.town || addr.suburb || addr.city_district || addr.county || "San Juan";
        const fullAddress = [streetPart, cityPart, "San Juan, Argentina"].filter(Boolean).join(", ");
        
        const title = poiName || streetPart || (item.display_name ? item.display_name.split(",")[0] : "Ubicación Seleccionada");
        const displayName = poiName && streetPart && poiName.toLowerCase() !== streetPart.toLowerCase()
          ? `${poiName} - ${fullAddress}`
          : (streetPart ? `${streetPart}, ${cityPart}, San Juan, Argentina` : item.display_name || `${latitude}, ${longitude}`);

        return res.json({
          title,
          address: fullAddress,
          display_name: displayName,
          lat: latitude,
          lon: longitude,
        });
      }
    }
  } catch (err) {
    console.warn("Reverse geocode error:", err);
  }

  return res.json({
    title: `Ubicación (${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)})`,
    address: "San Juan, Argentina",
    display_name: `Ubicación Seleccionada, San Juan, Argentina`,
    lat: latitude,
    lon: longitude,
  });
});

// 2. Chatbot with grounding, system instructions and models selection
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, model, systemInstruction, enableSearch, enableMaps, userLocation } = req.body;
    const ai = getGeminiClient();

    const selectedModel = model || "gemini-3.5-flash";
    const tools: any[] = [];

    if (enableSearch) {
      tools.push({ googleSearch: {} });
    } else if (enableMaps) {
      tools.push({ googleMaps: {} });
    }

    const toolConfig: any = {};
    if (enableMaps && userLocation) {
      toolConfig.retrievalConfig = {
        latLng: {
          latitude: parseFloat(userLocation.latitude),
          longitude: parseFloat(userLocation.longitude),
        },
      };
    }

    const config: any = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (tools.length > 0) config.tools = tools;
    if (enableMaps && userLocation) config.toolConfig = toolConfig;

    // We can use chats.create or generateContent. Let's rebuild chat history or run generateContent
    // Since we support grounding, generateContent with complete history array is simpler and extremely reliable
    const formattedContents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        formattedContents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }

    formattedContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: formattedContents,
        config,
      });
    } catch (e: any) {
      console.warn(`Model ${selectedModel} busy (503). Retrying with gemini-3.5-flash-lite...`);
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: formattedContents,
        config,
      });
    }

    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    res.json({ text, groundingChunks: chunks });
  } catch (error: any) {
    console.error("Error in /api/gemini/chat:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Text to Speech (TTS)
app.post("/api/gemini/tts", async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Di con tono cálido, profesional y amigable en español: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No se pudo obtener el audio de Gemini TTS");
    }

    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("Error in /api/gemini/tts:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Image Generation and Editing
app.post("/api/gemini/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio, imageSize } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
          imageSize: imageSize || "1K",
        },
      },
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("No se pudo generar la imagen de Gemini.");
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Error in /api/gemini/generate-image:", error);
    res.status(500).json({ error: error.message });
  }
});

// Edit existing image using text instructions
app.post("/api/gemini/edit-image", async (req, res) => {
  try {
    const { base64Image, mimeType, instruction } = req.body;
    const ai = getGeminiClient();

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || "image/png",
            },
          },
          {
            text: instruction || "Modifica la imagen de forma creativa.",
          },
        ],
      },
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("No se pudo editar la imagen de Gemini.");
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Error in /api/gemini/edit-image:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Video Generation with Veo
app.post("/api/gemini/generate-video", async (req, res) => {
  try {
    const { prompt, aspectRatio, resolution } = req.body;
    const ai = getGeminiClient();

    const operation = await ai.models.generateVideos({
      model: "veo-3.1-lite-generate-preview",
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution || "1080p",
        aspectRatio: aspectRatio || "16:9",
      },
    });

    res.json({ operationName: operation.name });
  } catch (error: any) {
    console.error("Error in /api/gemini/generate-video:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/video-status", async (req, res) => {
  try {
    const { operationName } = req.body;
    const ai = getGeminiClient();

    const { GenerateVideosOperation } = await import("@google/genai");
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    res.json({ done: updated.done, response: updated.response });
  } catch (error: any) {
    console.error("Error in /api/gemini/video-status:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/video-download", async (req, res) => {
  try {
    const { operationName } = req.body;
    const ai = getGeminiClient();

    const { GenerateVideosOperation } = await import("@google/genai");
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).json({ error: "Video no disponible o no finalizado." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const videoRes = await fetch(uri, {
      headers: { "x-goog-api-key": apiKey || "" },
    });

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", 'attachment; filename="generated-video.mp4"');

    // Express piping of the video streaming binary response
    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error: any) {
    console.error("Error in /api/gemini/video-download:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Transcribe Audio (Mic webm input)
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { base64Audio, mimeType } = req.body;
    const ai = getGeminiClient();

    const cleanBase64 = base64Audio.replace(/^data:audio\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || "audio/webm",
          },
        },
        {
          text: "Transcripción de este audio. Responde ÚNICAMENTE con el texto transcrito de forma exacta en español. No agregues saludos, introducciones ni explicaciones.",
        },
      ],
    });

    res.json({ text: response.text?.trim() || "" });
  } catch (error: any) {
    console.error("Error in /api/gemini/transcribe:", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Video Content Analysis (Pro-preview)
app.post("/api/gemini/analyze-video", async (req, res) => {
  try {
    const { base64Video, mimeType, question } = req.body;
    const ai = getGeminiClient();

    const cleanBase64 = base64Video.replace(/^data:video\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || "video/mp4",
          },
        },
        {
          text: question || "Analiza detalladamente lo que ocurre en este video.",
        },
      ],
    });

    res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Error in /api/gemini/analyze-video:", error);
    res.status(500).json({ error: error.message });
  }
});


// 8. Google Drive / Docs / Sheets API proxies using the OAuth token of the user

// Sync text notes to Google Drive as a Google Doc
app.post("/api/workspace/sync-drive", async (req, res) => {
  try {
    const token = req.headers.authorization; // Bearer token
    if (!token) {
      return res.status(200).json({ success: false, reason: "unauthenticated", error: "Falta el token de autorización de Google" });
    }

    const { filename, content } = req.body;

    const metadata = {
      name: filename || "FSR Workspace Notes",
      mimeType: "application/vnd.google-apps.document",
    };

    const driveRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    });

    if (driveRes.status === 401 || driveRes.status === 403) {
      return res.status(200).json({ success: false, reason: "unauthenticated", error: "Error de credenciales en Google Drive" });
    }

    const fileData = await driveRes.json();
    if (fileData.error) {
      return res.status(200).json({ success: false, error: fileData.error.message || "Error al crear archivo en Drive" });
    }

    const docId = fileData.id;
    const docsRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content || "Creado automáticamente desde tu espacio de trabajo Liquid Workspace.",
            },
          },
        ],
      }),
    });

    const docData = await docsRes.json();
    return res.json({ success: true, fileId: docId, document: docData });
  } catch (error: any) {
    console.error("Error in Drive sync:", error);
    return res.status(200).json({ success: false, error: error?.message || "Error de credenciales en Google Drive" });
  }
});

// Sincronizar un archivo de respaldo en Google Drive de forma inteligente (crear o actualizar si ya existe)
// Sincronizar un archivo de respaldo en Google Drive de forma inteligente (crear o actualizar si ya existe)
const handleSyncBackupDrive = async (req: express.Request, res: express.Response) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(200).json({ success: false, reason: "unauthenticated", error: "Falta el token de autorización de Google" });
    }

    const { filename, content } = req.body;
    if (!filename || content === undefined) {
      return res.status(200).json({ success: false, error: "Faltan parámetros requeridos: filename o content" });
    }

    // 0. Validar la serialización de JSON y el tamaño del payload
    let stringifiedContent = "";
    try {
      stringifiedContent = typeof content === "string" ? content : JSON.stringify(content);
    } catch (serErr: any) {
      return res.status(200).json({
        success: false,
        error: `Error de serialización JSON en el respaldo: ${serErr.message}`,
      });
    }

    if (stringifiedContent.length > 10 * 1024 * 1024) {
      return res.status(200).json({
        success: false,
        error: "El tamaño del contenido del respaldo excede el límite permitido de 10MB.",
      });
    }

    // Helper fetch with timeout
    const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 15000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };

    // 1. Buscar si el archivo ya existe
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name = '${filename.replace(/'/g, "\\'")}' and trashed = false`
    )}&fields=files(id)`;
    
    let searchRes;
    try {
      searchRes = await fetchWithTimeout(searchUrl, {
        method: "GET",
        headers: {
          "Authorization": token,
        },
      });
    } catch (netErr: any) {
      return res.status(200).json({
        success: false,
        error: `No se pudo conectar con Google Drive: ${netErr.message}`,
      });
    }

    if (searchRes.status === 401 || searchRes.status === 403) {
      return res.status(200).json({
        success: false,
        reason: "unauthenticated",
        error: "Error de credenciales en Google Drive",
      });
    }

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return res.status(200).json({
        success: false,
        error: `Error al buscar archivo en Google Drive (HTTP ${searchRes.status}): ${errText}`,
      });
    }

    const searchData: any = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];
    let fileId = existingFile ? existingFile.id : null;

    if (!fileId) {
      // 2a. Si no existe, crear los metadatos del archivo
      let createRes;
      try {
        createRes = await fetchWithTimeout("https://www.googleapis.com/drive/v3/files", {
          method: "POST",
          headers: {
            "Authorization": token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: filename,
            mimeType: "application/json",
          }),
        });
      } catch (netErr: any) {
        return res.status(200).json({
          success: false,
          error: `Error al crear archivo en Google Drive: ${netErr.message}`,
        });
      }

      if (createRes.status === 401 || createRes.status === 403) {
        return res.status(200).json({
          success: false,
          reason: "unauthenticated",
          error: "Error de credenciales en Google Drive",
        });
      }

      if (!createRes.ok) {
        const errText = await createRes.text();
        return res.status(200).json({
          success: false,
          error: `Error al crear metadatos en Google Drive (HTTP ${createRes.status}): ${errText}`,
        });
      }

      const createData: any = await createRes.json();
      fileId = createData.id;
    }

    // 3. Subir/actualizar el contenido del archivo
    let uploadRes;
    try {
      uploadRes = await fetchWithTimeout(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
        },
        body: stringifiedContent,
      });
    } catch (netErr: any) {
      return res.status(200).json({
        success: false,
        error: `Error al transferir datos a Google Drive: ${netErr.message}`,
      });
    }

    if (uploadRes.status === 401 || uploadRes.status === 403) {
      return res.status(200).json({
        success: false,
        reason: "unauthenticated",
        error: "Error de credenciales en Google Drive",
      });
    }

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return res.status(200).json({
        success: false,
        error: `Error al actualizar contenido en Google Drive (HTTP ${uploadRes.status}): ${errText}`,
      });
    }

    io.emit("dataUpdated", { category: "backup", action: "sync", filename });

    return res.json({ success: true, fileId });
  } catch (error: any) {
    console.error("Error in sync-backup-drive:", error);
    return res.status(200).json({
      success: false,
      error: error?.message || "Error de credenciales en Google Drive",
    });
  }
};

app.post("/api/workspace/sync-backup-drive", handleSyncBackupDrive);
app.post("/api/workspace/sync-backup", handleSyncBackupDrive);

// Descargar un archivo de respaldo desde Google Drive por nombre (/get-backup y /get-backup-drive)
const handleGetBackupDrive = async (req: express.Request, res: express.Response) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(200).json({ success: false, reason: "unauthenticated", error: "Error de credenciales en Google Drive" });
    }

    const filename = (req.query.filename as string) || (req.body?.filename as string);
    if (!filename) {
      return res.status(200).json({ success: false, error: "Falta el parámetro filename" });
    }

    // Helper fetch with timeout
    const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 15000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };

    // 1. Buscar archivo
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name = '${filename.replace(/'/g, "\\'")}' and trashed = false`
    )}&fields=files(id)`;

    let searchRes;
    try {
      searchRes = await fetchWithTimeout(searchUrl, {
        method: "GET",
        headers: {
          "Authorization": token,
        },
      });
    } catch (netErr: any) {
      return res.status(200).json({ success: false, error: `Error conectando con Google Drive: ${netErr.message}` });
    }

    if (searchRes.status === 401 || searchRes.status === 403) {
      return res.status(200).json({ success: false, reason: "unauthenticated", error: "Error de credenciales en Google Drive" });
    }

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return res.status(200).json({ success: false, error: `Error buscando archivo en Drive: ${errText}` });
    }

    const searchData: any = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];

    if (!existingFile) {
      return res.status(200).json({ success: false, notFound: true, error: "Archivo no encontrado en Drive" });
    }

    // 2. Descargar contenido
    const fileId = existingFile.id;
    let downloadRes;
    try {
      downloadRes = await fetchWithTimeout(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        method: "GET",
        headers: {
          "Authorization": token,
        },
      });
    } catch (netErr: any) {
      return res.status(200).json({ success: false, error: `Error conectando para descargar archivo: ${netErr.message}` });
    }

    if (downloadRes.status === 401 || downloadRes.status === 403) {
      return res.status(200).json({ success: false, reason: "unauthenticated", error: "Error de credenciales en Google Drive" });
    }

    if (!downloadRes.ok) {
      const errText = await downloadRes.text();
      return res.status(200).json({ success: false, error: `Error descargando contenido de Drive: ${errText}` });
    }

    const content = await downloadRes.text();
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      parsedContent = content;
    }

    return res.json({ success: true, fileId, content: parsedContent });
  } catch (error: any) {
    console.error("Error in get-backup-drive:", error);
    return res.status(200).json({ success: false, error: error?.message || "Error de credenciales en Google Drive" });
  }
};

app.get("/api/workspace/get-backup-drive", handleGetBackupDrive);
app.get("/api/workspace/get-backup", handleGetBackupDrive);
app.post("/api/workspace/get-backup", handleGetBackupDrive);

// Upload any binary file directly to Google Drive
app.post("/api/workspace/upload-file", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(200).json({ success: false, reason: "unauthenticated", error: "Falta el token de autorización de Google" });
    }

    const { filename, mimeType, base64Data } = req.body;
    if (!filename || !mimeType || !base64Data) {
      return res.status(200).json({ success: false, error: "Faltan parámetros: filename, mimeType o base64Data" });
    }

    const cleanBase64 = base64Data.replace(/^data:[a-zA-Z0-9/\-+.]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    // 1. Create file metadata in Google Drive v3
    const driveRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: filename,
        mimeType: mimeType,
      }),
    });

    if (driveRes.status === 401 || driveRes.status === 403) {
      return res.status(200).json({ success: false, reason: "unauthenticated", error: "Error de credenciales en Google Drive" });
    }

    const fileData = await driveRes.json();
    if (fileData.error) {
      return res.status(200).json({ success: false, error: fileData.error.message || "Error al crear archivo en Drive" });
    }

    const fileId = fileData.id;

    // 2. Upload the file media content
    const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        "Authorization": token,
        "Content-Type": mimeType,
      },
      body: buffer,
    });

    if (uploadRes.status === 401 || uploadRes.status === 403) {
      return res.status(200).json({ success: false, reason: "unauthenticated", error: "Error de credenciales en Google Drive" });
    }

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.json();
      return res.status(200).json({ success: false, error: uploadErr.error?.message || "Error al subir contenido del archivo a Drive" });
    }

    // 3. Set permission so anyone with the link can read it
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      });
    } catch (permErr) {
      console.warn("Could not set public read permission on uploaded file:", permErr);
    }

    // 4. Retrieve the webViewLink
    const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
      method: "GET",
      headers: {
        "Authorization": token,
      },
    });

    const getData = await getRes.json();
    const webViewLink = getData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return res.json({ success: true, fileId, webViewLink });
  } catch (error: any) {
    console.error("Error in upload-file to Drive:", error);
    return res.status(200).json({ success: false, error: error?.message || "Error de credenciales en Google Drive" });
  }
});

// Sync expenses / payments data to Google Sheets
app.post("/api/workspace/sync-sheets", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "Falta el token de autorización de Google Workspace. Por favor vuelve a conectar tu cuenta." });
    }

    const { title, headers, rows } = req.body;

    // 1. Create a new Spreadsheet
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: title || "Liquid Workspace - Reporte de Finanzas",
        },
      }),
    });

    const sheetData = await createRes.json();
    if (sheetData.error) {
      const isAuthError = createRes.status === 401 || (sheetData.error.message && sheetData.error.message.toLowerCase().includes("authentication"));
      return res.status(isAuthError ? 401 : 400).json({ 
        error: isAuthError 
          ? "Credenciales de Google expiradas o inválidas. Por favor vuelve a conectar tu cuenta de Google."
          : (sheetData.error.message || "Error al crear hoja de cálculo"),
        code: isAuthError ? "UNAUTHENTICATED" : "SHEETS_ERROR"
      });
    }

    const spreadsheetId = sheetData.spreadsheetId;

    // 2. Add header rows and value rows using append
    const values = [headers, ...rows];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values,
        }),
      }
    );

    const appendData = await appendRes.json();
    if (appendData.error) {
      const isAuthError = appendRes.status === 401 || (appendData.error.message && appendData.error.message.toLowerCase().includes("authentication"));
      return res.status(isAuthError ? 401 : 400).json({ 
        error: isAuthError 
          ? "Credenciales de Google expiradas o inválidas. Por favor vuelve a conectar tu cuenta de Google."
          : (appendData.error.message || "Error al añadir datos a la hoja de cálculo"),
        code: isAuthError ? "UNAUTHENTICATED" : "SHEETS_ERROR"
      });
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    res.json({ success: true, spreadsheetId, spreadsheetUrl, details: appendData });
  } catch (error: any) {
    console.warn("Sheets sync notice:", error?.message || error);
    res.status(500).json({ error: error.message || "Error inesperado al sincronizar con Google Sheets" });
  }
});

// Send email with report / information using Gmail API
app.post("/api/workspace/send-email", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "Falta el token de autorización de Google" });
    }

    const { to, subject, body } = req.body;

    // Construct MIME email string
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject || "Reporte de Liquid Workspace").toString("base64")}?=`;
    const messageParts = [
      `To: ${to}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: ${utf8Subject}`,
      "",
      body || "Vacío",
    ];
    const message = messageParts.join("\n");

    // The body needs to be base64url encoded
    const encodedEmail = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    });

    const gmailData = await gmailRes.json();
    if (gmailData.error) {
      throw new Error(gmailData.error.message || "Error al enviar el correo");
    }

    res.json({ success: true, messageId: gmailData.id });
  } catch (error: any) {
    console.error("Error in Gmail sending:", error);
    res.status(500).json({ error: error.message });
  }
});

// Sync events with Google Calendar
app.post("/api/workspace/sync-calendar", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "Falta el token de autorización de Google" });
    }

    const { events } = req.body;
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.json({ success: true, syncedCount: 0, message: "No hay eventos para sincronizar" });
    }

    // Determine min/max dates to query Google Calendar
    let minDate = events[0].date;
    let maxDate = events[0].date;
    for (const ev of events) {
      if (ev.date < minDate) minDate = ev.date;
      if (ev.date > maxDate) maxDate = ev.date;
    }

    // Call Google Calendar API to fetch existing events in this range
    // Format range: minDateT00:00:00Z to maxDateT23:59:59Z
    const listRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${minDate}T00:00:00Z&timeMax=${maxDate}T23:59:59Z&maxResults=250`,
      {
        method: "GET",
        headers: {
          "Authorization": token,
        },
      }
    );

    let existingEvents: any[] = [];
    if (listRes.ok) {
      const listData = await listRes.json();
      existingEvents = listData.items || [];
    } else {
      console.warn("Could not list Google Calendar events to check duplicates:", await listRes.text());
    }

    let syncedCount = 0;
    const errors: string[] = [];

    for (const ev of events) {
      const signature = `[ID: LW-${ev.id}]`;
      const alreadyExists = existingEvents.some(
        (item: any) =>
          item.description && item.description.includes(signature)
      );

      if (alreadyExists) {
        continue; // Skip duplicate
      }

      // Build Google Calendar event payload
      const cleanTime = ev.time ? ev.time.trim().replace(/\s*hs/i, "") : "";
      const hasTime = /^(\d{1,2}):(\d{2})$/.test(cleanTime);
      const eventStart = hasTime
        ? { dateTime: `${ev.date}T${cleanTime}:00`, timeZone: "America/Argentina/Buenos_Aires" }
        : { date: ev.date };

      const eventEnd = hasTime
        ? {
            dateTime: (() => {
              const [h, m] = cleanTime.split(":");
              // Set 1 hour later
              let hour = parseInt(h) + 1;
              let minute = parseInt(m);
              let nextDateStr = ev.date;
              if (hour >= 24) {
                hour = hour - 24;
                // Calculate next date
                const dateObj = new Date(ev.date + "T00:00:00");
                dateObj.setDate(dateObj.getDate() + 1);
                const pad = (n: number) => String(n).padStart(2, "0");
                nextDateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
              }
              const pad = (n: number) => String(n).padStart(2, "0");
              return `${nextDateStr}T${pad(hour)}:${pad(minute)}:00`;
            })(),
            timeZone: "America/Argentina/Buenos_Aires",
          }
        : {
            date: (() => {
              // Next day for all-day events
              const dateObj = new Date(ev.date + "T00:00:00");
              dateObj.setDate(dateObj.getDate() + 1);
              const pad = (n: number) => String(n).padStart(2, "0");
              return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
            })(),
          };

      const description = `${ev.description || ""}\n\n${signature}`;

      const insertBody: any = {
        summary: ev.title,
        description,
        start: eventStart,
        end: eventEnd,
      };

      if (ev.location) {
        insertBody.location = ev.location;
      }

      const insertRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(insertBody),
      });

      if (insertRes.ok) {
        syncedCount++;
      } else {
        const errorText = await insertRes.text();
        console.error(`Failed to insert event LW-${ev.id}:`, errorText);
        errors.push(`Error al insertar ${ev.title}: ${errorText}`);
      }
    }

    res.json({ success: true, syncedCount, errors });
  } catch (error: any) {
    console.error("Error in calendar sync proxy:", error);
    res.status(500).json({ error: error.message });
  }
});

function normalizeQuery(query: string): string {
  const q = query.trim();
  const qLower = q.toLowerCase();

  if (qLower === "atado de acelga") return "Acelga";
  if (qLower === "atado de veteraba") return "Veteraba";
  if (qLower === "bife de nalga") return "Nalga";
  if (qLower === "bifes de cerdo") return "Nalga De Cerdo";
  if (qLower === "bifes de pollo") return "Pechuga de Pollo";
  if (qLower === "cebolla blanca") return "cebolla";
  if (qLower === "camote") return "batata";
  if (qLower === "costeletas de cerdo") return "Chuleta De Paleta De Cerdo";
  if (qLower === "costeletas de carne") return "bife de chorizo con hueso";
  
  if (qLower.includes("desodorante") && (
    qLower.includes("gladys") || 
    qLower.includes("hernan") || 
    qLower.includes("jessica") || 
    qLower.includes("modesto") || 
    qLower.includes("48hs") || 
    qLower.includes("72hs")
  )) {
    return "Desodorante";
  }

  if (qLower === "dicroicas") return "Lampara led";
  if (qLower === "fideos coditos") return "fiedeos codito";
  if (qLower === "fideos moñito") return "Fideos Mostachol";
  
  if (qLower === "galletas de avena" || qLower === "galletas de miel" || qLower === "galletitas de avena" || qLower === "galletitas de miel") {
    return "Galletas o Galletitas GRANIX";
  }

  if (qLower === "jugos en sobre") return "Jugo en polvo";
  
  if (qLower.includes("ketchup")) return "Ketchup";

  if (qLower === "levadura seca (10gr.)" || qLower === "levadura seca") return "Levadura Seca";
  if (qLower === "matambre de carne") return "Matambre";
  if (qLower === "lomo de cerdo") return "Lomo de Cerdo";
  if (qLower === "lomo de carne") return "Lomo";
  
  if (qLower.includes("mayonesa")) return "Mayonesa";
  if (qLower === "merluza (pescado)") return "Filete De Merluza";
  
  if (qLower === "molida comun" || qLower === "molida especial") return "Carne Picada Especial";
  
  if (qLower.includes("mostaza")) return "Mostaza";
  if (qLower === "nido de spaghetti") return "Fid.Nido";
  if (qLower === "panes de hamburgesas" || qLower === "pan de hamburguesa" || qLower === "panes de hamburguesas") return "Pan Para Hamburguesa";
  if (qLower === "papel de cocina") return "rollo de cocina";
  if (qLower === "pata muslo") return "Pata Muslo con Piel";
  if (qLower === "pimiento verde") return "morron verde";
  if (qLower === "pimienton rojo (dulce)") return "Condimento Pimienta";
  if (qLower === "queso chedar") return "Queso Cheddar";
  if (qLower === "queso mantecoso") return "Queso Cremosos";
  if (qLower === "queso muzzarella") return "Muzzarella";
  if (qLower === "queso rayado") return "Queso Rallado";
  if (qLower === "salchicas") return "Salchichas";
  if (qLower === "zapallitos") return "Zapallito";

  return q;
}

app.get("/api/prices/search", async (req, res) => {
  try {
    const rawQuery = req.query.q as string;
    const category = req.query.category as string;
    if (!rawQuery) return res.status(400).json({ error: "Missing query" });

    const query = normalizeQuery(rawQuery);
    let price = null;

    // 1. Prioritize verdepuro for Fruta and Verdura
    if (category === "Fruta" || category === "Verdura") {
      try {
        const vpRes = await fetch(`https://verdepuro.com.ar/wp-json/wc/store/products?search=${encodeURIComponent(query)}`);
        if (vpRes.ok) {
          const vpData = await vpRes.json();
          if (vpData && vpData.length > 0) {
            price = parseInt(vpData[0].prices.price, 10) / 100;
          }
        }
      } catch (e) {
        console.error("Error searching verdepuro:", e);
      }
    }

    // 2. Fallback to masonline
    if (price === null) {
      try {
        const fetchRes = await fetch(`https://www.masonline.com.ar/api/catalog_system/pub/products/search/${encodeURIComponent(query)}`);
        if (fetchRes.ok) {
          const text = await fetchRes.text();
          if (text && !text.startsWith("Bad Request")) {
            const data = JSON.parse(text);
            if (data && data.length > 0) {
              price = data[0]?.items?.[0]?.sellers?.[0]?.commertialOffer?.Price || null;
            }
          }
        }
      } catch (e) {
        console.error("Error searching masonline:", e);
      }
    }

    return res.json({ price });
  } catch (error: any) {
    console.error("Error in /api/prices/search:", error);
    res.status(500).json({ error: error.message });
  }
});

// OpenFoodFacts search proxy endpoint with 2-step enrichment (Search-a-licious + Product v2 API)
app.get("/api/openfoodfacts/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: "Missing query" });
    }

    const headers = {
      "User-Agent": "AIStudioApp/1.0 (contact@aistudio.app)",
      "Accept": "application/json",
    };

    let productsList: any[] = [];

    // Step 1: Search using Search-a-licious or fallback search endpoint
    try {
      const searchUrl = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=8`;
      const searchRes = await fetch(searchUrl, { headers });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        productsList = searchData.hits || searchData.products || [];
      }
    } catch (e) {
      console.warn("Search-a-licious failed, trying fallback search:", e);
    }

    // Fallback if Search-a-licious returned no results or failed
    if (!productsList || productsList.length === 0) {
      const fallbackUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8`;
      const fallbackRes = await fetch(fallbackUrl, { headers });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        productsList = fallbackData.products || [];
      }
    }

    if (!productsList || productsList.length === 0) {
      return res.json({ products: [] });
    }

    // Step 2: Enrich products using the v2 API per product barcode
    const enrichedProducts = await Promise.all(
      productsList.slice(0, 8).map(async (item: any) => {
        const barcode = item.code || item.id || item._id;
        if (!barcode) return item;

        try {
          const detailUrl = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
          const detailRes = await fetch(detailUrl, { headers });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData && detailData.product) {
              return {
                ...item,
                ...detailData.product,
                nutriments: {
                  ...(item.nutriments || {}),
                  ...(detailData.product.nutriments || {}),
                },
              };
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch v2 product detail for barcode ${barcode}:`, e);
        }
        return item;
      })
    );

    return res.json({ products: enrichedProducts });
  } catch (error: any) {
    console.error("Error in /api/openfoodfacts/search:", error);
    res.status(500).json({ error: error.message || "Failed to fetch from OpenFoodFacts" });
  }
});

// Card summary statement AI parser endpoint
app.post("/api/parse-card-statement", async (req, res) => {
  try {
    const { fileData, mimeType, cardName } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: "No se proporcionaron datos del archivo." });
    }

    const ai = getGeminiClient();
    let parts: any[] = [];

    if (mimeType && (mimeType.startsWith("image/") || mimeType === "application/pdf")) {
      const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, "");
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType,
        },
      });
    } else {
      parts.push({
        text: typeof fileData === "string" ? fileData : JSON.stringify(fileData),
      });
    }

    const promptText = `Analiza detenidamente este resumen de tarjeta de crédito, resumen bancario o extracto de cuenta.
Extrae la lista completa de todos los consumos, compras y gastos individuales reportados.
Para cada ítem de gasto extrae:
1. "descripcion": Texto claro del nombre del comercio, tienda o concepto de la compra.
2. "categoria": Clasificación (Ejemplos: "Supermercado", "Restaurante y Comida", "Servicios Digitales", "Combustible", "Salud y Farmacia", "Indumentaria", "Entretenimiento", "Hogar y Servicios", "Impuestos y Tasas", "Varios").
3. "fecha": Fecha de la compra/transacción en formato YYYY-MM-DD. Si solo figura día y mes (ej: 14/07), asume el año actual 2026.
4. "metodo": Nombre de la tarjeta o medio de pago (usa "${cardName || 'Tarjeta de Crédito'}" si aplica).
5. "monto": Monto exacto consumido como número decimal positivo. Omite pagos de resumen, saldos anteriores o intereses globales, solo extrae consumos de compras individuales.

Responde únicamente con un arreglo JSON con las propiedades requeridas: descripcion, categoria, fecha, metodo, monto.`;

    parts.push({ text: promptText });

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                descripcion: { type: Type.STRING },
                categoria: { type: Type.STRING },
                fecha: { type: Type.STRING },
                metodo: { type: Type.STRING },
                monto: { type: Type.NUMBER },
              },
              required: ["descripcion", "categoria", "fecha", "metodo", "monto"],
            },
          },
        },
      });
    } catch (e: any) {
      console.warn("gemini-3.6-flash busy (503). Retrying with gemini-3.5-flash-lite...");
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                descripcion: { type: Type.STRING },
                categoria: { type: Type.STRING },
                fecha: { type: Type.STRING },
                metodo: { type: Type.STRING },
                monto: { type: Type.NUMBER },
              },
              required: ["descripcion", "categoria", "fecha", "metodo", "monto"],
            },
          },
        },
      });
    }

    const parsed = JSON.parse(response.text || "[]");
    return res.json({ items: parsed });
  } catch (error: any) {
    console.error("Error in /api/parse-card-statement:", error);
    res.status(500).json({ error: error.message || "Error al procesar el resumen de la tarjeta con IA." });
  }
});


// Mounting Vite middleware or static serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Create WebSocket Server for Gemini Live Audio Session
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    if (pathname === "/api/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs) => {
    console.log("Client connected to Live Audio WebSocket");
    let session: any = null;

    try {
      const ai = getGeminiClient();

      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction:
            "Eres un copiloto personal de organización inteligente en español. Responde de manera corta, amigable, cálida e interactiva. Apoya al usuario en sus tareas del día.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (err) {
          console.error("Error processing client WS message:", err);
        }
      });
    } catch (err: any) {
      console.error("Live session connection error:", err);
      clientWs.send(JSON.stringify({ error: err.message }));
    }

    clientWs.on("close", () => {
      console.log("Client disconnected from Live WebSocket");
      if (session) {
        try {
          session.close();
        } catch (e) {
          // ignore
        }
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Liquid Workspace Server] Ready on http://localhost:${PORT}`);
  });
}

start();
