import type { Handler } from "@netlify/functions";

// Geocodificación inversa (lat/lon -> dirección legible) vía Nominatim. Sin esta función, el
// fetch a /api/reverse-geocode devolvía 404 en producción (no existía ni la función ni el
// redirect) y LocationPickerMap.tsx caía siempre al fallback de mostrar las coordenadas crudas
// como "dirección" — este es el motivo por el que "Dirección Personal" terminaba mostrando algo
// como "-31.55517, -68.56393" en vez de una dirección legible.
export const handler: Handler = async (event) => {
  const lat = event.queryStringParameters?.lat;
  const lon = event.queryStringParameters?.lon;
  if (!lat || !lon) {
    return { statusCode: 400, body: JSON.stringify({ error: "lat and lon are required" }) };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "FSR-Workspace/1.0 (hernanmaximiliano10@gmail.com)" },
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
          : streetPart
          ? `${streetPart}, ${cityPart}, San Juan, Argentina`
          : item.display_name || `${lat}, ${lon}`;

        return {
          statusCode: 200,
          body: JSON.stringify({ title, address: fullAddress, display_name: displayName, lat, lon }),
        };
      }
    }
  } catch (err) {
    console.warn("Reverse geocode error:", err);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      title: `Ubicación (${parseFloat(String(lat)).toFixed(4)}, ${parseFloat(String(lon)).toFixed(4)})`,
      address: "San Juan, Argentina",
      display_name: "Ubicación Seleccionada, San Juan, Argentina",
      lat,
      lon,
    }),
  };
};
