// Generates synthetic, voice-like WAV placeholders (D10) until the team records real clips.
// Usage: node scripts/generate-sample-audio.mjs
//   → public/sample-audio/{aah,read,chat}.wav                (seeded patients, simulated session)
//   → public/sample-device/VOXWAVE/audio/*.wav               (every file sessions.json references, D58)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const RATE = 16000;
/** Device clips are telephone quality to keep the sample drive small; the real Pi writes its own. */
const DEVICE_RATE = 8000;

/** Mulberry32, so the files are identical on every run. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A glottal-ish source (harmonics with falling amplitude) at f0 with slow drift and a little vibrato,
 * shaped by an amplitude envelope. `syllables` > 0 chops it into speech-like bursts with pauses.
 */
function voice({ seconds, f0, syllables = 0, seed = 1, rate = RATE }) {
  const r = rng(seed);
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  // Syllable timeline: [start, end] in samples.
  const bursts = [];
  if (syllables > 0) {
    let t = 0.25 * rate;
    while (t < n - 0.3 * rate) {
      const len = (0.12 + r() * 0.16) * rate;
      bursts.push([t, t + len]);
      // Word gaps are short; every few syllables a longer pause.
      t += len + (r() < 0.22 ? (0.25 + r() * 0.35) * rate : (0.03 + r() * 0.06) * rate);
    }
  }
  let phase = 0;
  let b = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let env;
    if (syllables > 0) {
      while (b < bursts.length && i >= bursts[b][1]) b++;
      const cur = bursts[b];
      env = cur && i >= cur[0] ? Math.sin(((i - cur[0]) / (cur[1] - cur[0])) * Math.PI) ** 0.8 : 0;
    } else {
      env = Math.min(1, t / 0.15) * Math.min(1, (seconds - t) / 0.25);
    }
    const pitch = f0 * (1 + 0.02 * Math.sin(2 * Math.PI * 5.2 * t) + 0.04 * Math.sin(2 * Math.PI * 0.35 * t));
    phase += (2 * Math.PI * pitch) / rate;
    let s = 0;
    for (let h = 1; h <= 12; h++) {
      // Two broad formant bumps (~700 Hz and ~1200 Hz) so it sounds vowel-like rather than a buzzer.
      const f = pitch * h;
      if (f > rate / 2) break;
      const formant = Math.exp(-(((f - 700) / 260) ** 2)) + 0.6 * Math.exp(-(((f - 1200) / 320) ** 2)) + 0.15;
      s += (formant / h) * Math.sin(h * phase);
    }
    out[i] = s * env * 0.32 + (r() - 0.5) * 0.004; // faint room noise
  }
  return out;
}

function wav(samples, rate = RATE) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return buf;
}

// --- Seed clips -------------------------------------------------------------------------------------------
const dir = 'public/sample-audio';
mkdirSync(dir, { recursive: true });
const clips = {
  'aah.wav': voice({ seconds: 5, f0: 128, seed: 11 }),
  'read.wav': voice({ seconds: 6, f0: 132, syllables: 1, seed: 22 }),
  'chat.wav': voice({ seconds: 12, f0: 126, syllables: 1, seed: 33 }),
};
for (const [name, samples] of Object.entries(clips)) {
  writeFileSync(`${dir}/${name}`, wav(samples));
  console.log(`${dir}/${name}`, `${(samples.length / RATE).toFixed(1)}s`);
}

// --- Device clips: one per activity referenced by the sample drive ----------------------------------------
const deviceRoot = 'public/sample-device/VOXWAVE/';
const { sessions } = JSON.parse(readFileSync(`${deviceRoot}sessions.json`, 'utf8'));
let total = 0;
sessions.forEach((s, si) => {
  s.activities.forEach((a, ai) => {
    if (!a.audio) return;
    const samples = voice({
      seconds: a.durationSec,
      f0: 126 + si,
      syllables: a.type === 'sustained_vowel' ? 0 : 1,
      seed: 1000 + si * 10 + ai,
      rate: DEVICE_RATE,
    });
    const path = deviceRoot + a.audio;
    mkdirSync(dirname(path), { recursive: true });
    const data = wav(samples, DEVICE_RATE);
    writeFileSync(path, data);
    total += data.length;
  });
});
console.log(`${deviceRoot}audio/: ${sessions.length * 3} files, ${(total / 1e6).toFixed(1)} MB`);
