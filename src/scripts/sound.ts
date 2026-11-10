// ═══ Sound ═══
// Everything is played by a small synth: no files to fetch. A tune in F major
// on a kalimba-like voice, over soft chords and a round bass, with a new phrase
// every few bars so it never quite repeats. The effects use the same voices.
// Browsers keep audio silent until a first touch or key press, so nothing
// plays before then. The visitor's choice stays in localStorage under 'df-sound'.

const KEY = 'df-sound';
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

let on = read() !== 'off';
let night = false;
let ctx: AudioContext | null = null;
let master: GainNode;
let sfx: GainNode;
let music: GainNode;
let echo: GainNode; // into a soft feedback delay, for the tune
let noiseBuf: AudioBuffer;
const watchers = new Set<(on: boolean) => void>();

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function boot() {
  if (ctx) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = on ? 1 : 0;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -14;
  limit.ratio.value = 6;
  master.connect(limit).connect(ctx.destination);
  sfx = ctx.createGain();
  sfx.gain.value = 0.55;
  sfx.connect(master);
  music = ctx.createGain();
  music.gain.value = 0;
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 2600;
  music.connect(warm).connect(master);
  // a room for the tune: a short echo that darkens as it fades
  echo = ctx.createGain();
  echo.gain.value = 0.32;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.36;
  const back = ctx.createGain();
  back.gain.value = 0.34;
  const dull = ctx.createBiquadFilter();
  dull.type = 'lowpass';
  dull.frequency.value = 1500;
  echo.connect(delay).connect(dull).connect(back).connect(delay);
  dull.connect(music);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

// ── Held sounds ──
// Two that last as long as their cause: the rocket's engine, for the whole
// trip, and the sea lapping round the juice box while it wades.
let engine: { gain: GainNode; filter: BiquadFilterNode; hum: OscillatorNode } | null = null;
let sea: GainNode | null = null;
function loop() {
  const s = ctx!.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.start();
  return s;
}
function holdEngine() {
  if (engine || !ctx) return engine;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  filter.Q.value = 0.9;
  loop().connect(filter).connect(gain);
  // a crackle on top of the roar
  const crackle = ctx.createBiquadFilter();
  crackle.type = 'bandpass';
  crackle.frequency.value = 1800;
  crackle.Q.value = 0.7;
  const cg = ctx.createGain();
  cg.gain.value = 0.25;
  loop().connect(crackle).connect(cg).connect(gain);
  const hum = ctx.createOscillator();
  hum.frequency.value = 46;
  const hg = ctx.createGain();
  hg.gain.value = 0.7;
  hum.connect(hg).connect(gain);
  hum.start();
  gain.connect(sfx);
  return (engine = { gain, filter, hum });
}
function holdSea() {
  if (sea || !ctx) return sea;
  sea = ctx.createGain();
  sea.gain.value = 0;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 650;
  f.Q.value = 0.5;
  // the swell: the level rises and falls every few seconds
  const swell = ctx.createGain();
  swell.gain.value = 0.55;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.22;
  const depth = ctx.createGain();
  depth.gain.value = 0.45;
  lfo.connect(depth).connect(swell.gain);
  lfo.start();
  loop().connect(f).connect(swell).connect(sea).connect(sfx);
  return sea;
}

// The engine at a level from 0 to 1; brighter the harder it burns.
export function setEngine(level: number) {
  if (!ctx || ctx.state !== 'running' || (!engine && level <= 0)) return;
  const e = holdEngine()!;
  const t = ctx.currentTime;
  e.gain.gain.setTargetAtTime(level * 1.6, t, level > 0 ? 0.08 : 0.5);
  e.filter.frequency.setTargetAtTime(260 + level * 1500, t, 0.15);
  e.hum.frequency.setTargetAtTime(40 + level * 40, t, 0.2);
}
// How much of the juice box is in the water, from 0 to 1.
export function setSea(level: number) {
  if (!ctx || ctx.state !== 'running' || (!sea && level <= 0)) return;
  holdSea()!.gain.setTargetAtTime(level * 0.08, ctx.currentTime, 0.35);
}

// ── Voices ──
type Tone = { type?: OscillatorType; gain?: number; at?: number; attack?: number; to?: number; out?: AudioNode };
function tone(freq: number, dur: number, { type = 'sine', gain = 0.2, at = 0, attack = 0.005, to, out }: Tone = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out ?? sfx);
  o.start(t);
  o.stop(t + dur + 0.05);
}
// A struck bar: the note, and a bright partial that dies away first.
function bar(freq: number, dur: number, gain: number, at = 0, out?: AudioNode) {
  tone(freq, dur, { gain, at, out });
  tone(freq * 4, dur * 0.18, { gain: gain * 0.35, at, out });
}
// A voice that bends through several pitches: [seconds, hertz] pairs.
function sweep(points: [number, number][], { type = 'triangle' as OscillatorType, gain = 0.05, at = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const end = points[points.length - 1][0];
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 2400;
  o.type = type;
  points.forEach(([s, hz], i) => (i ? o.frequency.linearRampToValueAtTime(hz, t + s) : o.frequency.setValueAtTime(hz, t + s)));
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.04);
  g.gain.setValueAtTime(gain, t + end * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + end);
  o.connect(f).connect(g).connect(sfx);
  o.start(t);
  o.stop(t + end + 0.05);
}
type Hiss = { gain?: number; at?: number; freq?: number; to?: number; q?: number; kind?: BiquadFilterType; attack?: number };
function hiss(dur: number, { gain = 0.2, at = 0, freq = 1000, to, q = 1, kind = 'bandpass', attack = 0.005 }: Hiss = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = kind;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(sfx);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

// ── The tune ──
// Four bars a turn round Fmaj7, Am7, B♭maj7, C6. The tune keeps to the
// F major pentatonic, so any note sits well over any of them.
const CHORDS = [
  [53, 57, 60, 64],
  [57, 60, 64, 67],
  [58, 62, 65, 69],
  [48, 52, 55, 57],
];
const SCALE = [65, 67, 69, 72, 74, 77, 79, 81, 84]; // F5 to C6, pentatonic
const BEAT = 0.72; // seconds, about 83 bpm
let phrase: (number | null)[] = [];
let barN = 0;
let nextBar = 0;
let timer = 0;

// Eight eighths a bar for four bars: mostly steps, sometimes a leap, with rests.
function compose() {
  const out: (number | null)[] = [];
  let k = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < 32; i++) {
    const strong = i % 4 === 0;
    const breath = i % 8 === 7 || (i >= 28 && i % 2 === 1); // the phrase ends on a held note
    if (breath || Math.random() > (strong ? 0.82 : 0.34) * (night ? 0.7 : 1)) {
      out.push(null);
      continue;
    }
    k += Math.random() < 0.8 ? (Math.random() < 0.5 ? -1 : 1) : Math.random() < 0.5 ? -2 : 2;
    k = Math.max(0, Math.min(SCALE.length - 1, k));
    out.push(SCALE[k]);
  }
  return out;
}

function playBar(t0: number) {
  if (!ctx) return;
  const at = (t: number) => t0 + t - ctx!.currentTime;
  const chord = CHORDS[barN % 4];
  const quiet = barN % 16 >= 14; // every so often, two bars with no tune
  if (barN % 8 === 0) phrase = compose();
  // the round bass, on one and three
  tone(midi(chord[0] - 12), BEAT * 1.8, { gain: 0.16, at: at(0), attack: 0.02, out: music });
  tone(midi(chord[0] - 5), BEAT * 1.6, { gain: 0.09, at: at(BEAT * 2), attack: 0.02, out: music });
  // soft chords, slow to swell
  chord.forEach((n, j) => tone(midi(n), BEAT * 4.2, { type: 'triangle', gain: 0.022, at: at(j * 0.03), attack: BEAT * 1.2, out: music }));
  if (quiet) return;
  const shift = night ? -12 : 0;
  for (let i = 0; i < 8; i++) {
    const n = phrase[(barN % 4) * 8 + i];
    if (n == null) continue;
    const swing = i % 2 ? BEAT * 0.08 : 0;
    const t = at((i * BEAT) / 2 + swing);
    bar(midi(n + shift), 1.1, night ? 0.07 : 0.06, t, music);
    bar(midi(n + shift), 1.1, 0.03, t, echo);
  }
}

function schedule() {
  if (!ctx) return;
  while (nextBar < ctx.currentTime + 0.6) {
    playBar(nextBar);
    nextBar += BEAT * 4;
    barN++;
  }
}

function startMusic() {
  if (!ctx || timer) return;
  nextBar = ctx.currentTime + 0.15;
  barN = 0;
  timer = window.setInterval(schedule, 200);
  schedule();
  music.gain.cancelScheduledValues(ctx.currentTime);
  music.gain.setValueAtTime(music.gain.value, ctx.currentTime);
  music.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 5);
}
function stopMusic() {
  clearInterval(timer);
  timer = 0;
  if (ctx) {
    music.gain.cancelScheduledValues(ctx.currentTime);
    music.gain.setValueAtTime(0, ctx.currentTime);
  }
}

// Wake on the first touch or key; rest while the tab is hidden.
function wake() {
  boot();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  if (on && !document.hidden) startMusic();
}
if (typeof window !== 'undefined') {
  // A finger only counts as a go-ahead once it lifts, and a swipe may not
  // count at all, so keep asking on every touch until the audio is running.
  const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;
  const first = () => {
    wake();
    if (ctx?.state !== 'running') return void ctx?.resume().then(() => ctx!.state === 'running' && quit(), () => {});
    quit();
  };
  const quit = () => GESTURES.forEach((g) => removeEventListener(g, first, true));
  GESTURES.forEach((g) => addEventListener(g, first, true));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      stopMusic();
      void ctx.suspend();
    } else if (on) wake();
  });
}

// ── Effects ──
const PENTA = [72, 74, 77, 79, 81, 84, 86];
const EFFECTS = {
  // a soft pop, for buttons and things picked
  tap: () => tone(760, 0.09, { to: 520, gain: 0.18 }),
  // one syllable of the juice box's voice
  blip: () => tone(midi(PENTA[Math.floor(Math.random() * 5)] - 12) * (0.97 + Math.random() * 0.06), 0.06, { type: 'square', gain: 0.035 }),
  // feet: grass at home, a click on the circuit board, a ring on the station's hull
  step: (where = 'earth') =>
    where === 'chip'
      ? tone(2200 + Math.random() * 300, 0.03, { type: 'triangle', gain: 0.03 })
      : where === 'hull'
        ? bar(900 + Math.random() * 80, 0.12, 0.025)
        : hiss(0.07, { freq: 700 + Math.random() * 400, q: 1.6, gain: 0.12 }),
  // a step in the shallows: a slosh and a little plop
  splash: () => {
    hiss(0.22, { freq: 1600 + Math.random() * 600, to: 500, q: 1.2, gain: 0.22 });
    tone(380 + Math.random() * 120, 0.09, { to: 900, gain: 0.06, at: 0.03 });
  },
  // into the water, or landing in it from a jump
  plunge: () => {
    hiss(0.6, { freq: 2200, to: 300, q: 0.8, gain: 0.45 });
    [0, 0.07, 0.15, 0.26].forEach((at, i) => tone(300 + i * 140 + Math.random() * 80, 0.1, { to: 1000, gain: 0.07, at: at + 0.05 }));
  },
  // the passers-by: a cat's mew, gulls calling over the water, a mouse
  meow: () => sweep([[0, 560], [0.12, 820], [0.42, 600], [0.55, 470]], { type: 'sawtooth', gain: 0.035 }),
  gull: () => [0, 0.32, 0.6].forEach((at, i) => sweep([[0, 1300 - i * 60], [0.07, 1850 - i * 80], [0.24, 1150]], { type: 'sawtooth', gain: 0.022, at })),
  squeak: () => [0, 0.11].forEach((at) => tone(2700 + Math.random() * 400, 0.06, { to: 3300, gain: 0.03, at })),
  jump: () => tone(330, 0.2, { type: 'triangle', to: 780, gain: 0.12 }),
  open: () => {
    bar(midi(77), 0.5, 0.12);
    bar(midi(84), 0.7, 0.1, 0.07);
  },
  close: () => {
    bar(midi(81), 0.4, 0.08);
    bar(midi(72), 0.5, 0.07, 0.06);
  },
  // the deck turning past a card
  flip: () => tone(1500 + Math.random() * 200, 0.035, { type: 'triangle', gain: 0.045 }),
  // a run of notes down into the screen, and back up out of it
  dive: () => {
    [86, 84, 81, 79, 77, 74, 72, 69].forEach((n, i) => bar(midi(n), 0.4, 0.07, i * 0.07));
    tone(900, 1.1, { to: 140, gain: 0.05, at: 0.1 });
  },
  surface: () => [69, 72, 74, 77, 79, 81, 84].forEach((n, i) => bar(midi(n), 0.4, 0.07, i * 0.06)),
  // ignition: a bang and a burst; the roar itself is the held engine
  launch: () => {
    hiss(0.35, { kind: 'lowpass', freq: 1400, to: 160, gain: 0.9 });
    tone(70, 0.5, { to: 30, gain: 0.7 });
    hiss(2.4, { kind: 'lowpass', freq: 160, to: 1800, gain: 0.7, attack: 0.35 });
  },
  // the engine braking all the way down, a thump on the pad, and a chime
  land: () => {
    hiss(1.3, { kind: 'lowpass', freq: 1600, to: 220, gain: 0.6, attack: 0.15 });
    tone(110, 1.2, { to: 48, gain: 0.25, attack: 0.15 });
    tone(85, 0.5, { to: 32, gain: 0.8, at: 1.2 });
    hiss(0.5, { kind: 'lowpass', freq: 700, to: 110, gain: 0.8, at: 1.2 });
    bar(midi(77), 0.6, 0.08, 1.45);
    bar(midi(81), 0.7, 0.07, 1.53);
  },
  // the jump between worlds, a whoosh across the sky
  warp: () => hiss(1.3, { freq: 300, to: 3000, q: 4, gain: 0.16, attack: 0.6 }),
  // to night, three notes falling; to day, three rising
  night: () => [84, 79, 72].forEach((n, i) => bar(midi(n), 0.7, 0.08, i * 0.11)),
  day: () => [72, 79, 84].forEach((n, i) => bar(midi(n), 0.7, 0.08, i * 0.11)),
};
export type Effect = keyof typeof EFFECTS;

export function play(name: Effect, arg?: string) {
  if (!on || !ctx || ctx.state !== 'running') return;
  (EFFECTS[name] as (a?: string) => void)(arg);
}

export const soundOn = () => on;

export function setSound(next: boolean) {
  on = next;
  try {
    localStorage.setItem(KEY, next ? 'on' : 'off');
  } catch {}
  if (next) {
    wake();
    if (ctx) {
      master.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
      play('tap');
    }
  } else if (ctx) {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    window.setTimeout(() => !on && stopMusic(), 400);
  }
  watchers.forEach((f) => f(on));
}

export function onSound(f: (on: boolean) => void) {
  watchers.add(f);
  f(on);
}

// The tune drops an octave and thins out after dark.
export function setSoundNight(n: boolean) {
  night = n;
}
