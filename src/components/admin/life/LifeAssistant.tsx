import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudSun, LayoutDashboard, Mic, MicOff, Sparkles, TrendingUp } from 'lucide-react';
import AdminCard from '../AdminCard';
import AssistantOrb, { type OrbMode } from './AssistantOrb';
import { adminApi } from '../../../lib/adminApi';
import { speakAsEi, whenVoicesReady, type SpeakController } from '../../../lib/lifeDashboard/eiVoice';
import {
  buildFullOverview,
  buildInvestmentOverview,
  buildWeatherOverview,
} from '../../../lib/lifeDashboard/eiOverview';
import { fetchVuagQuote } from '../../../lib/lifeDashboard/fetchVuag';
import type { InvestmentSnapshot, LifeDashboardPayload } from '../../../lib/lifeDashboard/types';
import {
  friendlyEiError,
  isQuotaOrBillingError,
  markOpenAiQuotaExhausted,
  shouldSkipOpenAi,
} from '../../../lib/lifeDashboard/eiErrors';
import { useAdminToast } from '../../../context/AdminToastContext';

const BAND_COUNT = 32;
const EI_NAME = 'Ei';

const OFFLINE_REPLY =
  "I've hit my cloud limit for now. Overview, Vanguard, and Weather still work offline — try again shortly and I'll be sharp again.";

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pickRecorderMime(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  if (typeof MediaRecorder === 'undefined') return undefined;
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

type LifeAssistantProps = {
  payload: LifeDashboardPayload;
  expanded?: boolean;
  onDashboardMutate?: () => void;
};

export default function LifeAssistant({ payload, expanded, onDashboardMutate }: LifeAssistantProps) {
  const { toast } = useAdminToast();
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speakLevel, setSpeakLevel] = useState(0.45);
  const [speakBands, setSpeakBands] = useState<number[]>([]);
  const [level, setLevel] = useState(0);
  const [bands, setBands] = useState<number[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const speakCtrlRef = useRef<SpeakController | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const handlingUtteranceRef = useRef(false);
  const eiSpeakRef = useRef<(text: string) => Promise<void>>(async () => {});
  const speechRecRef = useRef<SpeechRec | null>(null);
  const browserTranscriptRef = useRef('');

  const stopSpeechRec = useCallback(() => {
    const rec = speechRecRef.current;
    speechRecRef.current = null;
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.stop();
    } catch {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const stopAnalyser = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLevel(0);
    setBands([]);
  }, []);

  const stopMic = useCallback(() => {
    stopSpeechRec();
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    stopAnalyser();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setListening(false);
  }, [stopAnalyser, stopSpeechRec]);

  const stopSpeaking = useCallback(() => {
    speakCtrlRef.current?.stop();
    speakCtrlRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setSpeakLevel(0);
    setSpeakBands([]);
  }, []);

  useEffect(
    () => () => {
      stopMic();
      stopSpeaking();
    },
    [stopMic, stopSpeaking]
  );

  useEffect(() => {
    void whenVoicesReady();
  }, []);

  const buildContext = useCallback(() => {
    const habitsDone = payload.habits.filter((h) => h.completed).length;
    const weather = payload.weather;
    return [
      `Weather: ${weather.condition}, ${weather.temperatureC}C in ${weather.location}.`,
      `Habits: ${habitsDone}/${payload.habits.length} done.`,
      `Active projects: ${payload.projects.filter((p) => p.status === 'active').map((p) => p.name).join(', ') || 'none'}.`,
    ].join(' ');
  }, [payload]);

  const eiSpeak = useCallback(
    async (displayText: string) => {
      stopMic();
      stopSpeaking();
      setSpeaking(true);
      setHeard(null);

      const result = await speakAsEi(
        displayText,
        {
          onStart: () => setSpeaking(true),
          onLevel: (lvl, b) => {
            setSpeakLevel(lvl);
            setSpeakBands(b);
          },
          onEnd: () => {
            speakCtrlRef.current = null;
            setSpeaking(false);
            setSpeakLevel(0);
            setSpeakBands([]);
          },
          onError: () => {
            speakCtrlRef.current = null;
            setSpeaking(false);
            setSpeakLevel(0);
            setSpeakBands([]);
          },
        },
        async (spokenText) => adminApi.eiSpeakAudio(spokenText)
      );

      speakCtrlRef.current = result;
    },
    [stopMic, stopSpeaking]
  );

  useEffect(() => {
    eiSpeakRef.current = eiSpeak;
  }, [eiSpeak]);

  const startMic = async () => {
    stopSpeaking();
    handlingUtteranceRef.current = false;
    chunksRef.current = [];
    setHeard(null);

    if (typeof MediaRecorder === 'undefined') {
      toast.error('Recording is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.45;
      source.connect(analyser);

      streamRef.current = stream;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      setListening(true);
      setHeard('Listening…');

      const freq = new Uint8Array(analyser.frequencyBinCount);
      const wave = new Uint8Array(analyser.fftSize);
      const tick = () => {
        const a = analyserRef.current;
        if (!a) return;
        a.getByteFrequencyData(freq);
        a.getByteTimeDomainData(wave);

        let sumSq = 0;
        for (let i = 0; i < wave.length; i++) {
          const v = (wave[i]! - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / wave.length);
        const voiceGate = rms > 0.025;

        const start = 2;
        const usable = freq.slice(start, start + BAND_COUNT * 2);
        const next: number[] = [];
        for (let i = 0; i < BAND_COUNT; i++) {
          const i0 = Math.floor((i / BAND_COUNT) * usable.length);
          const i1 = Math.floor(((i + 1) / BAND_COUNT) * usable.length);
          let sum = 0;
          let n = 0;
          for (let j = i0; j < i1; j++) {
            sum += usable[j] ?? 0;
            n++;
          }
          const raw = Math.min(1, (sum / Math.max(1, n)) / 130);
          next.push(voiceGate ? raw : raw * 0.12);
        }
        setBands(next);
        setLevel(voiceGate ? next.reduce((s, v) => s + v, 0) / next.length : 0.08);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      const mime = pickRecorderMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.start(200);

      // Parallel browser STT — used when Whisper hits quota / is unreachable
      browserTranscriptRef.current = '';
      const Ctor = getSpeechRecognitionCtor();
      if (Ctor) {
        try {
          const recognition = new Ctor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-GB';
          recognition.onresult = (event) => {
            let finalText = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              if (!result) continue;
              const piece = result[0]?.transcript ?? '';
              if (result.isFinal) finalText += piece;
              else interim += piece;
            }
            if (finalText) {
              browserTranscriptRef.current = `${browserTranscriptRef.current} ${finalText}`.trim();
            }
            const live = `${browserTranscriptRef.current} ${interim}`.trim();
            if (live) setHeard(live);
          };
          recognition.onerror = () => {
            /* Whisper or empty transcript handles failure */
          };
          speechRecRef.current = recognition;
          recognition.start();
        } catch {
          /* optional fallback */
        }
      }
    } catch {
      toast.error('Microphone access denied — allow mic permission, then try Listen again.');
      setListening(false);
    }
  };

  const finishListening = async () => {
    if (handlingUtteranceRef.current) return;
    handlingUtteranceRef.current = true;

    const recorder = recorderRef.current;
    const stream = streamRef.current;
    const mime = recorder?.mimeType || 'audio/webm';

    stopSpeechRec();
    const browserText = browserTranscriptRef.current.trim();

    const blob = await new Promise<Blob | null>((resolve) => {
      if (!recorder || recorder.state === 'inactive') {
        resolve(
          chunksRef.current.length ? new Blob(chunksRef.current, { type: mime }) : null
        );
        return;
      }
      recorder.onstop = () => {
        resolve(
          chunksRef.current.length ? new Blob(chunksRef.current, { type: mime }) : null
        );
      };
      try {
        if (recorder.state === 'recording') recorder.requestData();
        recorder.stop();
      } catch {
        resolve(
          chunksRef.current.length ? new Blob(chunksRef.current, { type: mime }) : null
        );
      }
    });

    stopAnalyser();
    stream?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setListening(false);

    setThinking(true);
    setHeard(browserText || 'Transcribing…');

    try {
      let text = browserText;

      if (!shouldSkipOpenAi() && blob && blob.size >= 800) {
        try {
          const result = await adminApi.eiTranscribe(blob);
          if (result.text.trim()) text = result.text.trim();
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (isQuotaOrBillingError(msg)) markOpenAiQuotaExhausted();
          if (!text) throw e;
        }
      }

      if (!text) {
        throw new Error("Didn't catch that — speak while Listening, then tap Done.");
      }

      setHeard(text);

      let reply = OFFLINE_REPLY;
      if (!shouldSkipOpenAi()) {
        try {
          const chat = await adminApi.eiChat({
            message: text,
            context: buildContext(),
          });
          reply = chat.reply;
          if (chat.didMutate) onDashboardMutate?.();
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (isQuotaOrBillingError(msg)) {
            markOpenAiQuotaExhausted();
            toast.error(friendlyEiError(msg));
          } else {
            throw e;
          }
        }
      }

      setThinking(false);
      await eiSpeakRef.current(reply);
    } catch (e) {
      setThinking(false);
      setHeard(null);
      const msg = e instanceof Error ? e.message : 'Ei could not process that';
      if (isQuotaOrBillingError(msg)) markOpenAiQuotaExhausted();
      toast.error(friendlyEiError(msg));
    } finally {
      handlingUtteranceRef.current = false;
    }
  };

  const toggleMic = () => {
    if (listening) void finishListening();
    else void startMic();
  };

  const loadInvestment = async (): Promise<InvestmentSnapshot | null> => {
    try {
      return await fetchVuagQuote('1M');
    } catch {
      return null;
    }
  };

  const askEi = () => {
    const hour = new Date().getHours();
    const timeBit =
      hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const lines = [
      `Welcome back. What can I do for you?`,
      `${timeBit}. What can I do for you?`,
      `I'm here. What do you need?`,
      `Ready when you are.`,
    ];
    void eiSpeak(lines[Math.floor(Math.random() * lines.length)]!);
  };

  const speakOverview = async (kind: 'full' | 'investments' | 'weather') => {
    setOverviewLoading(true);
    try {
      const inv = kind === 'weather' ? null : await loadInvestment();
      const script =
        kind === 'full'
          ? buildFullOverview(payload, inv)
          : kind === 'investments'
            ? buildInvestmentOverview(inv)
            : buildWeatherOverview(payload);
      await eiSpeak(script);
    } finally {
      setOverviewLoading(false);
    }
  };

  const mode: OrbMode = speaking ? 'speaking' : listening ? 'listening' : 'idle';
  const orbSize = expanded ? 300 : 200;
  const statusLabel = speaking
    ? 'Speaking'
    : thinking
      ? 'Thinking'
      : listening
        ? 'Listening'
        : 'Standby';
  const orbLevel = speaking ? speakLevel : level;
  const orbBands = speaking ? speakBands : listening ? bands : undefined;
  const busy = speaking || overviewLoading || thinking;
  const active = speaking || listening || thinking;
  const statusCopy = speaking
    ? 'Speaking…'
    : thinking
      ? heard
        ? `“${heard}”`
        : 'Thinking…'
      : listening
        ? heard || 'Speak now — tap Done when finished'
        : 'Ready when you are';

  const glow =
    mode === 'speaking'
      ? 'rgba(34,211,238,0.35)'
      : mode === 'listening'
        ? 'rgba(56,189,248,0.42)'
        : 'rgba(14,165,233,0.18)';

  return (
    <AdminCard
      id="widget-assistant"
      title={EI_NAME}
      className="relative h-full overflow-hidden"
    >
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(ellipse 80% 55% at 50% 18%, rgba(8,47,73,0.55) 0%, transparent 62%)',
          }}
        />
        <motion.div
          className="absolute left-1/2 top-[18%] h-[55%] w-[70%] -translate-x-1/2 rounded-full blur-3xl"
          animate={{
            opacity: active ? [0.35, 0.55, 0.35] : [0.18, 0.28, 0.18],
            scale: active ? [1, 1.06, 1] : [1, 1.03, 1],
          }}
          transition={{ duration: active ? 2.4 : 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 75%)',
          }}
        />
      </div>

      <div
        className={`relative flex flex-col ${
          expanded ? 'sm:flex-row sm:items-center sm:gap-10' : 'items-stretch'
        }`}
      >
        {/* Orb stage */}
        <div
          className={`flex flex-col items-center ${
            expanded ? 'shrink-0 sm:w-[320px]' : 'w-full'
          }`}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ width: orbSize, height: orbSize }}
          >
            <div
              className="pointer-events-none absolute inset-[8%] rounded-full border border-cyan-400/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-[4%] rounded-full border border-white/[0.04]"
              aria-hidden
            />
            <motion.div
              className="pointer-events-none absolute inset-[12%] rounded-full"
              animate={{
                boxShadow: active
                  ? [
                      `0 0 40px ${glow}`,
                      `0 0 64px ${glow}`,
                      `0 0 40px ${glow}`,
                    ]
                  : [`0 0 28px ${glow}`, `0 0 36px ${glow}`, `0 0 28px ${glow}`],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <AssistantOrb
              mode={mode}
              level={orbLevel}
              bands={orbBands}
              size={orbSize}
              className="relative"
            />
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                active
                  ? 'bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.95)] animate-pulse'
                  : 'bg-white/20'
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Console */}
        <div
          className={`mt-5 flex w-full flex-1 flex-col ${
            expanded ? 'sm:mt-0 sm:max-w-md sm:justify-center' : ''
          }`}
        >
          <div className="mb-4 min-h-[2.5rem] text-center sm:text-left">
            <AnimatePresence mode="wait">
              <motion.p
                key={statusCopy}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="whitespace-pre-line text-left text-sm leading-relaxed text-gray-300"
              >
                {statusCopy}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Primary actions — equal split */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={askEi}
              className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-gray-200 transition
                hover:border-cyan-400/25 hover:bg-cyan-400/[0.07] hover:text-white
                disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles size={14} className="text-cyan-300/80 transition group-hover:text-cyan-200" />
              {speaking ? 'Speaking…' : 'Wake'}
            </button>
            <button
              type="button"
              disabled={busy && !listening}
              onClick={toggleMic}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition
                disabled:cursor-not-allowed disabled:opacity-40 ${
                  listening
                    ? 'border-cyan-300/50 bg-cyan-400/20 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                    : 'border-cyan-400/30 bg-cyan-500/15 text-cyan-50 hover:border-cyan-300/50 hover:bg-cyan-400/25'
                }`}
            >
              {listening ? <MicOff size={14} /> : <Mic size={14} />}
              {listening ? 'Done' : 'Listen'}
            </button>
          </div>

          {/* Briefings — one segmented control */}
          <div className="mt-3">
            <p className="mb-1.5 px-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
              Briefings
            </p>
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-black/25">
              {(
                [
                  {
                    id: 'full' as const,
                    label: 'Overview',
                    icon: LayoutDashboard,
                  },
                  {
                    id: 'investments' as const,
                    label: 'Vanguard',
                    icon: TrendingUp,
                  },
                  {
                    id: 'weather' as const,
                    label: 'Weather',
                    icon: CloudSun,
                  },
                ] as const
              ).map(({ id, label, icon: Icon }, i) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => void speakOverview(id)}
                  className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-medium text-gray-400 transition
                    hover:bg-white/[0.06] hover:text-cyan-100
                    disabled:cursor-not-allowed disabled:opacity-40
                    ${i > 0 ? 'border-l border-white/10' : ''}`}
                >
                  <Icon size={14} className="text-cyan-400/70" />
                  <span className="leading-none">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
