/*
 * Generative tavern music: a slow A-minor-pentatonic pluck line over a soft
 * drone, phrases shuffled so it doesn't fatigue. Pure Web Audio on the shared
 * music bus — no assets. Default OFF; start() must come from a user gesture
 * (the settings toggle), which satisfies autoplay policies. Session-only.
 */
import { musicBus, initAudio } from './sound';

// A pentatonic minor across two octaves (A3 root).
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];

// Phrase patterns as scale-degree indices; -1 is a rest.
const PHRASES: number[][] = [
  [0, 2, 4, -1, 3, 2, 0, -1],
  [4, 5, 4, 2, -1, 0, -1, -1],
  [0, 1, 2, 3, 4, -1, 2, -1],
  [5, 4, 2, -1, 4, 2, 1, 0],
  [-1, 0, 2, -1, 0, 2, 3, -1],
];

const STEP_S = 0.42; // ~ relaxed eighth notes
const LOOKAHEAD_S = 1.2;
const TICK_MS = 250;

let running = false;
let timer: number | null = null;
let nextNoteTime = 0;
let phrase: number[] = [];
let phraseIndex = 0;
let drone: { osc: OscillatorNode; gain: GainNode } | null = null;

function pluck(ctx: AudioContext, bus: GainNode, freq: number, when: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.11, when + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + STEP_S * 1.7);
  osc.connect(gain).connect(bus);
  osc.start(when);
  osc.stop(when + STEP_S * 1.8);
}

function nextStep(): number {
  if (phraseIndex >= phrase.length) {
    phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)]!;
    phraseIndex = 0;
  }
  return phrase[phraseIndex++]!;
}

function tick(): void {
  const audio = musicBus();
  if (!audio || !running) return;
  const { ctx, bus } = audio;
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD_S) {
    const degree = nextStep();
    if (degree >= 0) {
      pluck(ctx, bus, SCALE[degree]!, nextNoteTime);
      // Occasional soft octave shimmer.
      if (Math.random() < 0.15 && SCALE[degree + 3]) {
        pluck(ctx, bus, SCALE[degree + 3]!, nextNoteTime + STEP_S * 0.5);
      }
    }
    nextNoteTime += STEP_S;
  }
}

export function isMusicOn(): boolean {
  return running;
}

/** Idempotent. Call from a user gesture (the settings toggle). */
export function startMusic(): void {
  if (running) return;
  initAudio();
  const audio = musicBus();
  if (!audio) return;
  running = true;

  const { ctx, bus } = audio;
  // Soft root drone under the plucks.
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 110; // A2
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 2);
  osc.connect(gain).connect(bus);
  osc.start();
  drone = { osc, gain };

  nextNoteTime = ctx.currentTime + 0.2;
  phrase = [];
  phraseIndex = 0;
  timer = window.setInterval(tick, TICK_MS);
  tick();
}

/** Idempotent. */
export function stopMusic(): void {
  if (!running) return;
  running = false;
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
  if (drone) {
    const audio = musicBus();
    if (audio) {
      drone.gain.gain.exponentialRampToValueAtTime(0.0001, audio.ctx.currentTime + 0.6);
      drone.osc.stop(audio.ctx.currentTime + 0.7);
    } else {
      drone.osc.stop();
    }
    drone = null;
  }
}

export function toggleMusic(): boolean {
  if (running) stopMusic();
  else startMusic();
  return running;
}
