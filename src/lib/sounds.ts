// Sonidos de interfaz sintetizados con Web Audio API — sin archivos de audio, así que no pesan
// nada en el bundle ni tardan en cargar. Pensados para ser discretos (volumen bajo, duración
// corta): el objetivo es que se "sientan" las acciones, no que suenen como una alarma.
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

type Tone = { freq: number; at: number; duration: number; gain: number; type?: OscillatorType };

// Reproduce una secuencia corta de tonos con una envolvente simple (ataque rápido, decaimiento
// exponencial) para que cada nota suene como un "pop" suave en vez de un pitido plano.
const playTones = (tones: Tone[]) => {
  if (!isUiSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    const now = ctx.currentTime;
    tones.forEach(({ freq, at, duration, gain, type = "sine" }) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(env);
      env.connect(master);

      const startAt = now + at;
      const endAt = startAt + duration;
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
  // Click genérico: botones, pestañas, elegir una opción.
  click: () => playTones([{ freq: 720, at: 0, duration: 0.05, gain: 0.05, type: "sine" }]),

  // Cambio de sección/pestaña principal: un barrido de dos notas ascendente, muy breve.
  navigate: () =>
    playTones([
      { freq: 520, at: 0, duration: 0.06, gain: 0.045, type: "sine" },
      { freq: 760, at: 0.04, duration: 0.07, gain: 0.045, type: "sine" },
    ]),

  // Tildar un checkbox / activar un switch.
  toggle: () => playTones([{ freq: 880, at: 0, duration: 0.045, gain: 0.045, type: "triangle" }]),

  // Confirmación / acción exitosa (guardado, pago registrado, etc.) — acorde ascendente breve.
  success: () =>
    playTones([
      { freq: 660, at: 0, duration: 0.09, gain: 0.055, type: "sine" },
      { freq: 990, at: 0.06, duration: 0.12, gain: 0.055, type: "sine" },
    ]),

  // Error — dos notas graves y cortas, sin llegar a sonar como una alarma.
  error: () =>
    playTones([
      { freq: 310, at: 0, duration: 0.08, gain: 0.05, type: "sine" },
      { freq: 230, at: 0.07, duration: 0.11, gain: 0.05, type: "sine" },
    ]),
};
