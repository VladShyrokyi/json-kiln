import { clampInt } from './utils';

export type RNGFunc = () => number;

export function mulberry32(seed: number): RNGFunc {
  return function rng() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rndInt(rng: RNGFunc, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pickRandom<T>(rng: RNGFunc, arr: T[]): T {
  return arr[rndInt(rng, 0, arr.length - 1)];
}

export function randomWord(rng: RNGFunc) {
  const syll = ['la', 'zo', 'mi', 'tra', 'vel', 'qu', 'ra', 'ne', 'do', 'xi', 'ka', 'mon', 'ar', 'ben', 'tu'];
  const n = rndInt(rng, 2, 4);
  let s = '';
  for (let i = 0; i < n; i++) {
    s += pickRandom(rng, syll);
  }
  return s;
}

export function randomText(rng: RNGFunc, maxLen = 60) {
  const words: string[] = [];
  let len = 0;
  while (len < maxLen) {
    const w = randomWord(rng);
    words.push(w);
    len += w.length + 1;
  }
  return words.join(' ').slice(0, maxLen).trim();
}

export function getRandom(seed?: number) {
  return mulberry32(clampInt(seed ?? Date.now() % 100_000, 0, Number.MAX_SAFE_INTEGER));
}
