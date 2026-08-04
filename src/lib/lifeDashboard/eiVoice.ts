/** Ei speech helpers — phonetic text + neural TTS with browser fallback. */

import {
  isQuotaOrBillingError,
  markOpenAiQuotaExhausted,
  shouldSkipOpenAi,
} from './eiErrors';

const PREFERRED_VOICE_PATTERNS: RegExp[] = [
  /aria.*neural/i,
  /aria.*natural/i,
  /microsoft\s+aria/i,
  /jenny.*neural/i,
  /microsoft\s+jenny/i,
  /sara.*neural/i,
  /microsoft\s+sara/i,
  /natasha/i,
  /google\s+uk\s+english\s+female/i,
  /google\s+us\s+english\s+female/i,
  /samantha/i,
  /karen/i,
  /moira/i,
  /fiona/i,
  /tessa/i,
  /victoria/i,
  /zira/i,
  /susan/i,
  /hazel/i,
  /female/i,
];

const MALE_HINT = /\b(male|david|mark|daniel|george|fred|alex|ryan|guy|tony|james|thomas|ravi)\b/i;

export type SpeakHandlers = {
  onStart?: () => void;
  onLevel?: (level: number, bands: number[]) => void;
  onEnd?: () => void;
  onError?: (message?: string) => void;
};

export type SpeakController = {
  stop: () => void;
};

/** Written "Ei" → spoken "Aye"; VUAG → Vanguard for clear TTS. */
export function toSpokenText(text: string): string {
  return text
    .replace(/\bEi\b/g, 'Aye')
    .replace(/\bEI\b/g, 'Aye')
    .replace(/\bVUAG\.L\b/gi, 'Vanguard')
    .replace(/\bVUAG\b/gi, 'Vanguard');
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const label = `${voice.name} ${voice.lang}`;
  if (MALE_HINT.test(label) && !/female/i.test(label)) return -100;

  let score = 0;
  for (let i = 0; i < PREFERRED_VOICE_PATTERNS.length; i++) {
    if (PREFERRED_VOICE_PATTERNS[i].test(label)) {
      score += 100 - i;
      break;
    }
  }

  if (/en[-_]?(gb|us|au|ie)/i.test(voice.lang)) score += 20;
  else if (/^en/i.test(voice.lang)) score += 10;
  if (/neural|natural|online|premium|enhanced/i.test(label)) score += 40;
  if (voice.localService === false) score += 15;
  return score;
}

export function pickEiVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const voice of voices) {
    const s = scoreVoice(voice);
    if (s > bestScore) {
      bestScore = s;
      best = voice;
    }
  }
  return bestScore > 0 ? best : voices.find((v) => /^en/i.test(v.lang)) ?? voices[0] ?? null;
}

export function whenVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const ready = window.speechSynthesis.getVoices();
    if (ready.length) {
      resolve(ready);
      return;
    }
    const onChange = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
      resolve(window.speechSynthesis.getVoices());
    }, 1500);
  });
}

function speakBrowser(text: string, handlers: SpeakHandlers): SpeakController {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(toSpokenText(text));
  const voice = pickEiVoice();
  if (voice) utter.voice = voice;
  utter.rate = 0.92;
  utter.pitch = 1.08;
  utter.volume = 1;

  let raf = 0;
  const pulse = () => {
    const t = performance.now() / 1000;
    const level =
      0.28 +
      Math.abs(Math.sin(t * 5.2)) * 0.32 +
      Math.abs(Math.sin(t * 2.1)) * 0.18;
    handlers.onLevel?.(level, []);
    raf = requestAnimationFrame(pulse);
  };

  utter.onstart = () => {
    handlers.onStart?.();
    raf = requestAnimationFrame(pulse);
  };
  utter.onend = () => {
    cancelAnimationFrame(raf);
    handlers.onEnd?.();
  };
  utter.onerror = () => {
    cancelAnimationFrame(raf);
    handlers.onError?.('Browser speech failed');
  };

  window.speechSynthesis.speak(utter);
  return {
    stop: () => {
      cancelAnimationFrame(raf);
      window.speechSynthesis.cancel();
    },
  };
}

/**
 * Prefer ElevenLabs / OpenAI neural TTS (via admin edge function). Falls back to browser voices.
 * `fetchAudio` should return mp3 bytes, or throw.
 */
export async function speakAsEi(
  text: string,
  handlers: SpeakHandlers,
  fetchAudio?: (
    spokenText: string
  ) => Promise<{ buffer: ArrayBuffer; provider: string; voiceId?: string }>
): Promise<SpeakController & { provider: string; voiceId?: string; warning?: string }> {
  const spoken = toSpokenText(text);

  if (fetchAudio && !shouldSkipOpenAi()) {
    try {
      const { buffer, provider, voiceId } = await fetchAudio(spoken);
      const ctrl = await playNeuralBuffer(buffer, handlers);
      return { ...ctrl, provider, voiceId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Neural TTS unavailable';
      if (isQuotaOrBillingError(msg)) markOpenAiQuotaExhausted();
      console.warn('[Ei]', msg, '— using browser voice');
      await whenVoicesReady();
      const ctrl = speakBrowser(spoken, handlers);
      // Silent fallback — don't surface ElevenLabs/OpenAI paywall noise every click
      return { ...ctrl, provider: 'browser' };
    }
  }

  await whenVoicesReady();
  return {
    ...speakBrowser(spoken, handlers),
    provider: 'browser',
  };
}

async function playNeuralBuffer(
  arrayBuffer: ArrayBuffer,
  handlers: SpeakHandlers
): Promise<SpeakController> {
  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.35;
  source.connect(analyser);
  analyser.connect(ctx.destination);

  const freq = new Uint8Array(analyser.frequencyBinCount);
  const wave = new Uint8Array(analyser.fftSize);
  let raf = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(wave);

    // RMS of waveform — punchy speech amplitude
    let sumSq = 0;
    for (let i = 0; i < wave.length; i++) {
      const v = (wave[i]! - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / wave.length);
    const level = Math.min(1, rms * 4.2);

    const bands: number[] = [];
    const slice = freq.slice(1, 65);
    for (let i = 0; i < 32; i++) {
      const i0 = Math.floor((i / 32) * slice.length);
      const i1 = Math.floor(((i + 1) / 32) * slice.length);
      let sum = 0;
      let n = 0;
      for (let j = i0; j < i1; j++) {
        sum += slice[j] ?? 0;
        n++;
      }
      bands.push(Math.min(1, (sum / Math.max(1, n)) / 140 + level * 0.35));
    }
    handlers.onLevel?.(level, bands);
    raf = requestAnimationFrame(tick);
  };

  const cleanup = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
    void ctx.close();
  };

  source.onended = () => {
    cleanup();
    handlers.onEnd?.();
  };

  handlers.onStart?.();
  source.start(0);
  raf = requestAnimationFrame(tick);

  return { stop: cleanup };
}
