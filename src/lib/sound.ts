// Soft, tactile audio feedback — everything synthesized, nothing loaded.
// Volumes are deliberately quiet; pitch is randomized ±3% so sounds stay organic.

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const drift = (f: number) => f * (1 + (Math.random() - 0.5) * 0.06);

interface Blip {
  freq: number;
  type?: OscillatorType;
  dur?: number;
  vol?: number;
  sweep?: number; // Hz delta over the duration
  delay?: number;
  jitter?: boolean; // pitch drift; off when a caller pre-drifts a chord
}

function blip({ freq, type = "sine", dur = 0.08, vol = 0.1, sweep = 0, delay = 0, jitter = true }: Blip) {
  if (!enabled) return;
  const c = ac();
  const t0 = c.currentTime + delay;
  const f = jitter ? drift(freq) : freq;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(40, f + sweep), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// A tiny filtered-noise tap — the "physical" layer (finger on wood).
function tap(vol = 0.05, cutoff = 2000, dur = 0.03, delay = 0) {
  if (!enabled) return;
  const c = ac();
  const t0 = c.currentTime + delay;
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

// Marimba-ish note: drifted fundamental + soft octave partial (drifted together).
function note(freq: number, { delay = 0, dur = 0.18, vol = 0.1 } = {}) {
  const f = drift(freq);
  blip({ freq: f, dur, vol, delay, jitter: false });
  blip({ freq: f * 2, dur: dur * 0.5, vol: vol * 0.22, delay, jitter: false });
}

// C major, C5..C6 — each completion today climbs one step.
const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];

export const sfx = {
  /** Hero: task completed — soft pop + rising fifth, one scale step higher per win today. */
  complete(step = 0) {
    const root = SCALE[Math.max(0, step) % SCALE.length];
    tap(0.05, 3500);
    note(root, { vol: 0.1, dur: 0.16 });
    note(root * 1.5, { delay: 0.09, vol: 0.11, dur: 0.22 });
  },
  /** Last todo of the day done — gentle C–E–G–C arpeggio. The all-clear. */
  allDone() {
    tap(0.05, 3500);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      note(f, { delay: i * 0.09, vol: 0.09 + i * 0.006, dur: 0.26 })
    );
  },
  /** Timer starts — warm rising fourth: an invitation, not an alarm. */
  start() {
    note(392, { vol: 0.07, dur: 0.12 });
    note(523.25, { delay: 0.06, vol: 0.09, dur: 0.16 });
  },
  /** Timer pauses — tick down. */
  stop() {
    blip({ freq: 480, sweep: -100, dur: 0.07, vol: 0.08 });
  },
  /** Task added — tiny plip. */
  add() {
    blip({ freq: 720, type: "triangle", dur: 0.05, vol: 0.07 });
  },
  /** Idle sheet resolved — settling cadence. */
  resolve() {
    blip({ freq: 660, dur: 0.06, vol: 0.09 });
    blip({ freq: 520, dur: 0.06, vol: 0.09, delay: 0.07 });
    blip({ freq: 440, dur: 0.1, vol: 0.08, delay: 0.14 });
  },
  /** Reorder drop — soft thunk. */
  drop() {
    tap(0.08, 900);
    blip({ freq: 180, dur: 0.06, vol: 0.12 });
  },
  /** Any button press — near-inaudible key tick. */
  tick() {
    tap(0.025, 2500, 0.02);
  },
};
