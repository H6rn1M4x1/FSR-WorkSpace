// Líneas y paradas principales de la Red Tulum (sistema de colectivos de Gran San Juan,
// Argentina). San Juan no tiene servicio de trenes de pasajeros desde 1993 (por eso esta app solo
// contempla colectivos) y, a diferencia de otras ciudades argentinas, no publica un feed GTFS
// abierto para su red de colectivos — Red Tulum le pasa los datos a Google Maps de forma privada,
// y apps de terceros como Moovit dejaron de darle soporte en 2026. Por eso este es un dataset
// chico, armado a mano a partir de coberturas de prensa (Diario de Cuyo / Tiempo de San Juan) de
// cambios de recorrido de 2020-2025, no un feed en vivo — hay que esperar que quede desactualizado
// con el tiempo, a medida que Red Tulum reorganice recorridos (lo hace con bastante frecuencia).
//
// `approx: true` marca paradas cuya coordenada no se pudo verificar con precisión (se ubicó por
// conocimiento general de la cuadra/barrio, no por una fuente que diera lat/lon exactos) — se
// muestran igual, pero con una aclaración visual en la UI.
export interface TransitStop {
  name: string;
  lat: number;
  lon: number;
  approx?: boolean;
}

export interface TransitLine {
  line: string;
  description: string;
  stops: TransitStop[];
}

export const RED_TULUM_LINES: TransitLine[] = [
  {
    line: "TNS (Troncal Norte-Sur)",
    description: "Columna vertebral norte-sur de la Red Tulum: une Chimbas con Villa Krause (Rawson) atravesando el microcentro de Capital. Operada por El Triunfo S.A.",
    stops: [
      { name: "Plaza departamental de Chimbas", lat: -31.4931, lon: -68.5319 },
      { name: "Estación de Transbordo Córdoba (Capital)", lat: -31.53, lon: -68.524, approx: true },
      { name: "Microcentro / Plaza 25 de Mayo, Capital", lat: -31.5375, lon: -68.5364 },
      { name: "Villa Krause, cabecera de Rawson", lat: -31.5828, lon: -68.5415 },
    ],
  },
  {
    line: "TEO (Troncal Este-Oeste)",
    description: "Une La Bebida (Rivadavia, oeste) con la plaza departamental de Santa Lucía (este) por el microcentro de Capital. Pasa cerca del Hospital Rawson y la Terminal de Ómnibus. Operada por UTE La Marina S.A.-La Positiva S.A.",
    stops: [
      { name: "Rivadavia (cabecera departamental)", lat: -31.5303, lon: -68.5947 },
      { name: "Hospital Dr. Guillermo Rawson (Capital)", lat: -31.546, lon: -68.539, approx: true },
      { name: "Terminal de Ómnibus de San Juan", lat: -31.544, lon: -68.533, approx: true },
      { name: "Plaza departamental de Santa Lucía", lat: -31.54, lon: -68.495, approx: true },
    ],
  },
  {
    line: "Corredor A - Inter-Hospitalario",
    description: "Une el Hospital Marcial Quiroga (Rivadavia) con el Hospital Rawson (Capital). Operado por El Libertador.",
    stops: [
      { name: "Hospital Dr. Marcial Quiroga (Rivadavia)", lat: -31.555, lon: -68.61, approx: true },
      { name: "Hospital Dr. Guillermo Rawson (Capital)", lat: -31.546, lon: -68.539, approx: true },
    ],
  },
  {
    line: "Corredor D - Alto de Sierra",
    description: "Une semirruralmente la zona de Santa Lucía con la de Chimbas. Operado por Alto de Sierra.",
    stops: [
      { name: "Estación de Transbordo Córdoba", lat: -31.53, lon: -68.524, approx: true },
      { name: "Av. Sarmiento y Fray Justo Santa María de Oro", lat: -31.542, lon: -68.51, approx: true },
    ],
  },
  {
    line: "Línea 101",
    description: "Capital: conecta ATE-API y Aramburu con el microcentro y el Hospital Rawson.",
    stops: [
      { name: "Hospital Dr. Guillermo Rawson", lat: -31.546, lon: -68.539, approx: true },
      { name: "Microcentro / Plaza 25 de Mayo", lat: -31.5375, lon: -68.5364 },
    ],
  },
  {
    line: "Línea 123",
    description: "Rivadavia-Capital, directa por Av. Libertador. Sirve al Hospital Marcial Quiroga. Operada por UTE La Marina S.A.-La Positiva S.A.",
    stops: [
      { name: "Hospital Dr. Marcial Quiroga (Rivadavia)", lat: -31.555, lon: -68.61, approx: true },
      { name: "Microcentro Capital (Av. Libertador)", lat: -31.5375, lon: -68.5364 },
    ],
  },
  {
    line: "Línea 125",
    description: "Rivadavia-Capital. Sirve a la Facultad de Ingeniería (UNSJ) y a la Terminal de Ómnibus.",
    stops: [
      { name: "Facultad de Ingeniería, UNSJ (Capital)", lat: -31.5395, lon: -68.5155, approx: true },
      { name: "Terminal de Ómnibus de San Juan", lat: -31.544, lon: -68.533, approx: true },
    ],
  },
  {
    line: "Línea 103",
    description: "Capital/Rivadavia, zona suroeste, por Av. Rawson y Lateral de Circunvalación.",
    stops: [
      { name: "Av. Rawson y Lateral de Circunvalación", lat: -31.55, lon: -68.545, approx: true },
      { name: "Perú y San Lorenzo", lat: -31.552, lon: -68.548, approx: true },
    ],
  },
  {
    line: "Línea 200",
    description: "Pocito-Capital. Une Calle 10 y Alfonso XIII (Pocito) con Av. Rawson y 9 de Julio (Capital). Empresa Mayo.",
    stops: [
      { name: "Calle 10 y Alfonso XIII, Pocito", lat: -31.63, lon: -68.595, approx: true },
      { name: "Av. Guillermo Rawson y 9 de Julio, Capital", lat: -31.542, lon: -68.534, approx: true },
    ],
  },
  {
    line: "Línea 247",
    description: "Rawson-Capital. Une el Hospital Federico Cantoni (Rawson) con Av. Córdoba y Av. Rawson (Capital), vía Estación de Transbordo Córdoba. Empresa Mayo.",
    stops: [
      { name: "Hospital Dr. Federico Cantoni (Rawson)", lat: -31.565, lon: -68.535, approx: true },
      { name: "Estación de Transbordo Córdoba", lat: -31.53, lon: -68.524, approx: true },
    ],
  },
  {
    line: "Línea 206",
    description: "Rawson-Capital. Une la Plaza del Barrio Lagares (Rawson) con Salta y Av. Libertador (Capital). Empresa Mayo.",
    stops: [
      { name: "Plaza Barrio Lagares (Rawson)", lat: -31.575, lon: -68.53, approx: true },
      { name: "Salta y Av. Libertador, Capital", lat: -31.539, lon: -68.533, approx: true },
    ],
  },
  {
    line: "Línea 407",
    description: "Chimbas-Capital, por Villa Mariano Moreno y B° 2 de Abril hasta el microcentro.",
    stops: [
      { name: "Villa Mariano Moreno (Chimbas)", lat: -31.505, lon: -68.545, approx: true },
      { name: "Microcentro Capital (Av. Rawson)", lat: -31.54, lon: -68.542, approx: true },
    ],
  },
  {
    line: "Línea 408",
    description: "Chimbas-Capital. Conecta Chimbas con el Hospital Rawson y la Terminal de Ómnibus.",
    stops: [
      { name: "Plaza departamental de Chimbas", lat: -31.4931, lon: -68.5319 },
      { name: "Hospital Dr. Guillermo Rawson", lat: -31.546, lon: -68.539, approx: true },
      { name: "Terminal de Ómnibus de San Juan", lat: -31.544, lon: -68.533, approx: true },
    ],
  },
  {
    line: "Línea 248 / 248-E",
    description: "Pocito. La extensión 248-E conecta distritos de Pocito sin servicio previo. Empresa Mayo.",
    stops: [
      { name: "Villa Aberastain / Plaza Libertad (Pocito)", lat: -31.65, lon: -68.5833, approx: true },
      { name: "Calle 8 y Chacabuco, Pocito", lat: -31.64, lon: -68.59, approx: true },
      { name: "Ruta 40 y Calle 11, Pocito", lat: -31.645, lon: -68.595, approx: true },
    ],
  },
  {
    line: "Línea 20 (Perimetral Sureste)",
    description: "Perimetral, no entra al microcentro. Conecta barrios periféricos entre Rawson, Santa Lucía y Capital.",
    stops: [
      { name: "Barrio 7 de Septiembre", lat: -31.56, lon: -68.505, approx: true },
      { name: "Barrio La Ramada", lat: -31.565, lon: -68.51, approx: true },
    ],
  },
];
