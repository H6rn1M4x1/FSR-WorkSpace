// Sonidos de interfaz sintetizados con Web Audio API — sin archivos de audio, así que no pesan
// nada en el bundle ni tardan en cargar. Pensados para ser discretos (volumen bajo, duración
// corta): el objetivo es que se "sientan" las acciones, no que suenen como una alarma. Cada
// acción tiene un timbre propio (altura, forma de onda, si el tono sube o baja) para que se
// puedan distinguir de oído sin mirar la pantalla: navegar, guardar, eliminar, editar, elegir
// una fecha y abrir un detalle en grande sí suenan distinto entre sí.
//
// El AudioContext recién se crea la primera vez que se reproduce un sonido (siempre dentro de
// un handler de click/tecla, nunca en un efecto automático) porque los navegadores bloquean el
// audio hasta que hay un gesto real del usuario.

const SOUND_PREF_KEY = "ui_sound_enabled";

let audioCtx: AudioContext | null = null;
const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
};

export const isUiSoundEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(SOUND_PREF_KEY);
    return stored !== null ? stored === "true" : true; // sonido activado por defecto
  } catch {
    return true;
  }
};

export const setUiSoundEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SOUND_PREF_KEY, enabled ? "true" : "false");
  } catch {}
};

type Tone = {
  freq: number;
  at: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
  // Si está presente, la frecuencia desliza de `freq` a `rampTo` durante la nota (en vez de
  // quedarse fija) — da el efecto de "whoop" ascendente o "swoosh" descendente.
  rampTo?: number;
};

// Vibración breve en celulares cada vez que suena algo de la interfaz — el mismo pulso para
// cualquier sonido, ya que el pedido es "que vibre cuando sale un sonido", no un patrón distinto
// por acción. navigator.vibrate no existe en desktop ni en iOS Safari: el chequeo lo vuelve un
// no-op inofensivo ahí, no hace falta detectar el dispositivo a mano.
const VIBRATE_MS = 12;
const vibrate = () => {
  try {
    navigator.vibrate?.(VIBRATE_MS);
  } catch {}
};

// Reproduce una secuencia corta de tonos con una envolvente simple (ataque rápido, decaimiento
// exponencial) para que cada nota suene como un "pop" suave en vez de un pitido plano.
const playTones = (tones: Tone[]) => {
  if (!isUiSoundEnabled()) return;
  vibrate();
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    const now = ctx.currentTime;
    tones.forEach(({ freq, at, duration, gain, type = "sine", rampTo }) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.connect(env);
      env.connect(master);

      const startAt = now + at;
      const endAt = startAt + duration;
      osc.frequency.setValueAtTime(freq, startAt);
      if (rampTo) osc.frequency.linearRampToValueAtTime(rampTo, endAt);

      env.gain.setValueAtTime(0, startAt);
      env.gain.linearRampToValueAtTime(gain, startAt + Math.min(0.012, duration / 4));
      env.gain.exponentialRampToValueAtTime(0.0001, endAt);

      osc.start(startAt);
      osc.stop(endAt + 0.02);
    });
  } catch {
    // Si el navegador bloquea el audio (sin gesto del usuario, política de autoplay, etc.) la
    // app sigue funcionando igual sin sonido — nunca debe romper la interacción real.
  }
};

export const uiSounds = {
  // Click genérico: cualquier botón que no tenga un sonido más específico asignado.
  click: () => playTones([{ freq: 720, at: 0, duration: 0.05, gain: 0.05, type: "sine" }]),

  // Cambio de sección/pestaña o submenú (a cualquier nivel): un barrido de dos notas
  // ascendente, muy breve.
  navigate: () =>
    playTones([
      { freq: 520, at: 0, duration: 0.06, gain: 0.045, type: "sine" },
      { freq: 760, at: 0.04, duration: 0.07, gain: 0.045, type: "sine" },
    ]),

  // Tildar un checkbox / activar un switch.
  toggle: () => playTones([{ freq: 880, at: 0, duration: 0.045, gain: 0.045, type: "triangle" }]),

  // Confirmación / acción exitosa genérica (toasts) — acorde ascendente breve.
  success: () =>
    playTones([
      { freq: 660, at: 0, duration: 0.09, gain: 0.055, type: "sine" },
      { freq: 990, at: 0.06, duration: 0.12, gain: 0.055, type: "sine" },
    ]),

  // Error (toasts) — dos notas graves y cortas, sin llegar a sonar como una alarma.
  error: () =>
    playTones([
      { freq: 310, at: 0, duration: 0.08, gain: 0.05, type: "sine" },
      { freq: 230, at: 0.07, duration: 0.11, gain: 0.05, type: "sine" },
    ]),

  // Guardar: un solo tono que sube de altura ("whoop" de confirmación), distinto del acorde de
  // success genérico — pensado específicamente para botones de "Guardar".
  save: () => playTones([{ freq: 520, rampTo: 760, at: 0, duration: 0.11, gain: 0.06, type: "sine" }]),

  // Eliminar: tono que baja de altura, corto y seco — sensación de "algo se va".
  delete: () =>
    playTones([{ freq: 540, rampTo: 260, at: 0, duration: 0.1, gain: 0.055, type: "sine" }]),

  // Editar: dos notas muy cercanas y rápidas (como un "tap-tap" de lápiz), tono medio.
  edit: () =>
    playTones([
      { freq: 700, at: 0, duration: 0.035, gain: 0.045, type: "triangle" },
      { freq: 820, at: 0.045, duration: 0.04, gain: 0.04, type: "triangle" },
    ]),

  // Elegir una fecha en un calendario: un tick corto y agudo, distinto del click genérico.
  selectDate: () => playTones([{ freq: 1040, at: 0, duration: 0.04, gain: 0.045, type: "square" }]),

  // Abrir una nota/ítem en grande (lupa / "ver detalles"): un "pop" breve que sube de altura,
  // como si algo se expandiera.
  expand: () => playTones([{ freq: 460, rampTo: 680, at: 0, duration: 0.08, gain: 0.05, type: "sine" }]),
};
