/*
 * Tiny Web Audio sound kit — all effects are synthesized procedurally, so there
 * are no audio assets to bundle and it works offline. Browsers block audio until
 * a user gesture, so call initAudio() from a click handler first.
 */

export type Sfx = 'click' | 'deal' | 'play' | 'trick' | 'turn' | 'trump' | 'win' | 'lose';

const MUTE_KEY = 'muushig:muted';

let ctx: AudioContext | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** Resume/create the AudioContext on a user gesture. Safe to call repeatedly. */
export function initAudio(): void {
  const ac = audioCtx();
  if (ac && ac.state === 'suspended') void ac.resume();
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
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

/** One enveloped oscillator note. */
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
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
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
      note(ac, 300, 0, 0.08, 'triangle', 0.12);
      break;
    case 'play':
      note(ac, 440, 0, 0.12, 'sine', 0.16);
      note(ac, 660, 0.02, 0.12, 'sine', 0.08);
      break;
    case 'turn':
      chord(ac, [587, 784], 0.09, 0.18, 'sine'); // D5, G5
      break;
    case 'trick':
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
