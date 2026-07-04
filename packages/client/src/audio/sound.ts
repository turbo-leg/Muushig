/*
 * Tiny Web Audio sound kit — all effects are synthesized procedurally, so there
 * are no audio assets to bundle and it works offline. Browsers block audio until
 * a user gesture, so call initAudio() from a click handler first.
 *
 * Routing: everything flows through persistent buses —
 *   sfxGain ─┐
 *            ├─ masterGain ─ destination
 *  musicGain ┘
 * Volume sliders drive the bus gains; mute drives the master.
 */

export type Sfx = 'click' | 'deal' | 'play' | 'trick' | 'turn' | 'trump' | 'win' | 'lose';

const MUTE_KEY = 'muushig:muted';
const SFX_VOL_KEY = 'muushig:vol:sfx';
const MUSIC_VOL_KEY = 'muushig:vol:music';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBusNode: GainNode | null = null;

let muted = readMuted();
let sfxVolume = readVolume(SFX_VOL_KEY, 0.8);
let musicVolume = readVolume(MUSIC_VOL_KEY, 0.5);

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function readVolume(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
  } catch {
    return fallback;
  }
}

function writeVolume(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxVolume;
    sfxBus.connect(master);
    musicBusNode = ctx.createGain();
    musicBusNode.gain.value = musicVolume;
    musicBusNode.connect(master);
  }
  return ctx;
}

/** Resume/create the AudioContext on a user gesture. Safe to call repeatedly. */
export function initAudio(): void {
  const ac = audioCtx();
  if (ac && ac.state === 'suspended') void ac.resume();
}

/** The shared context + music bus for the generative music engine. */
export function musicBus(): { ctx: AudioContext; bus: GainNode } | null {
  const ac = audioCtx();
  if (!ac || !musicBusNode) return null;
  return { ctx: ac, bus: musicBusNode };
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (master) master.gain.value = value ? 0 : 1;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export function getSfxVolume(): number {
  return sfxVolume;
}

export function setSfxVolume(value: number): void {
  sfxVolume = Math.min(1, Math.max(0, value));
  if (sfxBus) sfxBus.gain.value = sfxVolume;
  writeVolume(SFX_VOL_KEY, sfxVolume);
}

export function getMusicVolume(): number {
  return musicVolume;
}

export function setMusicVolume(value: number): void {
  musicVolume = Math.min(1, Math.max(0, value));
  if (musicBusNode) musicBusNode.gain.value = musicVolume;
  writeVolume(MUSIC_VOL_KEY, musicVolume);
}

/** One enveloped oscillator note (onto the SFX bus). */
function note(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'sine',
  peak = 0.18,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  // Quick attack, smooth exponential release to avoid clicks.
  gain.gain.setValueAtTime(0.0001, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(peak, ac.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(gain).connect(sfxBus ?? ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

/** A short bandpass-filtered noise burst — the "swish" under card sounds. */
function swish(ac: AudioContext, start: number, dur: number, centerHz: number, peak = 0.1): void {
  const frames = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = centerHz;
  filter.Q.value = 0.9;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(peak, ac.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  src
    .connect(filter)
    .connect(gain)
    .connect(sfxBus ?? ac.destination);
  src.start(ac.currentTime + start);
}

function chord(
  ac: AudioContext,
  freqs: number[],
  gap: number,
  dur: number,
  type: OscillatorType = 'sine',
): void {
  freqs.forEach((f, i) => note(ac, f, i * gap, dur, type, 0.16));
}

export function play(sfx: Sfx): void {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume();

  switch (sfx) {
    case 'click':
      note(ac, 520, 0, 0.06, 'triangle', 0.12);
      break;
    case 'deal':
      swish(ac, 0, 0.09, 2400, 0.12);
      note(ac, 300, 0.01, 0.08, 'triangle', 0.1);
      break;
    case 'play':
      swish(ac, 0, 0.08, 1800, 0.1);
      note(ac, 440, 0.01, 0.12, 'sine', 0.14);
      note(ac, 660, 0.03, 0.12, 'sine', 0.07);
      break;
    case 'turn':
      chord(ac, [587, 784], 0.09, 0.18, 'sine'); // D5, G5
      break;
    case 'trick':
      swish(ac, 0, 0.07, 1200, 0.06);
      chord(ac, [523, 659, 784], 0.07, 0.22, 'sine'); // C major up
      break;
    case 'trump':
      chord(ac, [392, 523, 659, 880], 0.08, 0.5, 'sine'); // rising shimmer
      break;
    case 'win':
      chord(ac, [523, 659, 784, 1047], 0.1, 0.6, 'triangle'); // C major arpeggio
      break;
    case 'lose':
      chord(ac, [440, 370, 294], 0.12, 0.5, 'sine'); // descending
      break;
  }
}
