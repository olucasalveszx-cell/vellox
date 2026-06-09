export const SOUND_KEY = "vellox-notification-sound";

export type SoundId =
  | "caixa" | "moedas" | "vitoria" | "levelup" | "estrela"
  | "arcade" | "champanhe" | "pix" | "fanfarra" | "pop"
  | "sino" | "bipes" | "melodia";

export const SOUNDS: { id: SoundId; label: string; desc: string }[] = [
  { id: "caixa",     label: "Ka-ching",   desc: "Caixa registradora clássica" },
  { id: "moedas",    label: "Moedas",     desc: "Moedas caindo" },
  { id: "vitoria",   label: "Vitória",    desc: "Jingle de vitória" },
  { id: "levelup",   label: "Level up",   desc: "Arpejo ascendente" },
  { id: "estrela",   label: "Estrela",    desc: "Coleta de estrela" },
  { id: "arcade",    label: "Arcade",     desc: "Coleta retrô" },
  { id: "champanhe", label: "Champanhe",  desc: "Pop + bolhas ascendentes" },
  { id: "pix",       label: "PIX",        desc: "Notificação rápida" },
  { id: "fanfarra",  label: "Fanfarra",   desc: "Mini fanfarra" },
  { id: "pop",       label: "Pop",        desc: "Toque suave e satisfatório" },
  { id: "sino",      label: "Sino",       desc: "Um toque suave e prolongado" },
  { id: "bipes",     label: "Dois bipes", desc: "Alerta rápido e direto" },
  { id: "melodia",   label: "Melodia",    desc: "Três notas ascendentes" },
];

export function getSoundId(): SoundId {
  try {
    const v = localStorage.getItem(SOUND_KEY) as SoundId | null;
    if (v && SOUNDS.some(s => s.id === v)) return v;
  } catch {}
  return "caixa";
}

function note(
  ctx: AudioContext,
  freq: number, start: number, dur: number,
  vol = 0.42,
  type: OscillatorType = "sine",
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.value = freq; osc.type = type;
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

function ramp(
  ctx: AudioContext,
  f0: number, f1: number, start: number, dur: number,
  vol = 0.5,
  type: OscillatorType = "sine",
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(f0, ctx.currentTime + start);
  osc.frequency.exponentialRampToValueAtTime(f1, ctx.currentTime + start + dur);
  gain.gain.setValueAtTime(vol, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

export function playSound(ctx: AudioContext, id: SoundId) {
  switch (id) {
    case "caixa":
      // Ding metálico (triangle) + sino sustentado
      note(ctx, 1319, 0,    0.04, 0.50, "triangle");
      note(ctx, 1047, 0.03, 0.65, 0.38, "sine");
      break;

    case "moedas":
      // 4 notas rápidas, sobe alto no fim
      note(ctx, 1568, 0,    0.07, 0.40, "sine");
      note(ctx, 1319, 0.09, 0.07, 0.40, "sine");
      note(ctx, 1568, 0.18, 0.07, 0.40, "sine");
      note(ctx, 2093, 0.27, 0.20, 0.45, "sine");
      break;

    case "vitoria":
      // C5 E5 G5 C6 — vitória clássica
      note(ctx, 523,  0,    0.10, 0.40, "sine");
      note(ctx, 659,  0.12, 0.10, 0.40, "sine");
      note(ctx, 784,  0.24, 0.10, 0.40, "sine");
      note(ctx, 1047, 0.36, 0.44, 0.50, "sine");
      break;

    case "levelup":
      // C4 D4 E4 G4 C5 — arpejo rápido
      note(ctx, 261, 0,    0.09, 0.35, "sine");
      note(ctx, 294, 0.10, 0.09, 0.35, "sine");
      note(ctx, 330, 0.20, 0.09, 0.35, "sine");
      note(ctx, 392, 0.30, 0.09, 0.38, "sine");
      note(ctx, 523, 0.40, 0.34, 0.45, "sine");
      break;

    case "estrela":
      // B5 E6 G6 B6 E7 — coleta de estrela
      note(ctx, 988,  0,    0.06, 0.38, "sine");
      note(ctx, 1319, 0.07, 0.06, 0.38, "sine");
      note(ctx, 1568, 0.14, 0.06, 0.38, "sine");
      note(ctx, 1976, 0.21, 0.06, 0.40, "sine");
      note(ctx, 2637, 0.28, 0.22, 0.42, "sine");
      break;

    case "arcade":
      // Square wave retrô ascendente
      note(ctx, 440, 0,    0.06, 0.30, "square");
      note(ctx, 554, 0.07, 0.06, 0.30, "square");
      note(ctx, 659, 0.14, 0.06, 0.30, "square");
      note(ctx, 880, 0.21, 0.16, 0.35, "square");
      break;

    case "champanhe":
      // Pop grave + bolhas subindo
      ramp(ctx, 180, 40, 0, 0.10, 0.50, "sine");
      note(ctx, 659,  0.12, 0.07, 0.28, "sine");
      note(ctx, 880,  0.21, 0.07, 0.28, "sine");
      note(ctx, 1047, 0.30, 0.07, 0.28, "sine");
      note(ctx, 1319, 0.39, 0.20, 0.35, "sine");
      break;

    case "pix":
      // Dois tons rápidos — vibe PIX
      note(ctx, 880,  0,    0.07, 0.42, "sine");
      note(ctx, 1047, 0.09, 0.20, 0.45, "sine");
      break;

    case "fanfarra":
      // Sawtooth G4 C5 E5 G5 — mini fanfarra
      note(ctx, 392, 0,    0.09, 0.30, "sawtooth");
      note(ctx, 523, 0.11, 0.09, 0.30, "sawtooth");
      note(ctx, 659, 0.22, 0.09, 0.30, "sawtooth");
      note(ctx, 784, 0.33, 0.28, 0.38, "sawtooth");
      break;

    case "pop":
      // Frequency drop suave — bolha estourando
      ramp(ctx, 500, 120, 0, 0.16, 0.48, "sine");
      break;

    case "sino":
      note(ctx, 1047, 0, 0.90, 0.38, "sine");
      break;

    case "bipes":
      note(ctx, 880, 0,    0.11, 0.45, "sine");
      note(ctx, 880, 0.22, 0.11, 0.45, "sine");
      break;

    case "melodia":
      note(ctx, 523, 0,    0.12, 0.45, "sine");
      note(ctx, 659, 0.16, 0.12, 0.45, "sine");
      note(ctx, 784, 0.32, 0.22, 0.45, "sine");
      break;
  }
}
