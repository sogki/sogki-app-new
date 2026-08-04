import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudSun, LayoutDashboard, Mic, MicOff, Sparkles, TrendingUp } from 'lucide-react';
import AdminCard from '../AdminCard';
import AdminButton from '../AdminButton';
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
import { useAdminToast } from '../../../context/AdminToastContext';

const BAND_COUNT = 32;
const EI_NAME = 'Ei';

type SpeechRec = SpeechRecognition;

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type LifeAssistantProps = {
  payload: LifeDashboardPayload;
  expanded?: boolean;
};

export default function LifeAssistant({ payload, expanded }: LifeAssistantProps) {
  const { toast } = useAdminToast();
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speakLevel, setSpeakLevel] = useState(0.45);
  const [speakBands, setSpeakBands] = useState<number[]>([]);
  const [level, setLevel] = useState(0);
  const [bands, setBands] = useState<number[]>([]);
  const [voiceProvider, setVoiceProvider] = useState<string | null>(null);
  const [voiceIdUsed, setVoiceIdUsed] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const speakCtrlRef = useRef<SpeakController | null>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const handlingUtteranceRef = useRef(false);
  const eiSpeakRef = useRef<(text: string) => Promise<void>>(async () => {});

  const stopRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const stopMic = useCallback(() => {
    stopRecognition();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    setListening(false);
    setLevel(0);
    setBands([]);
  }, [stopRecognition]);

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
      setVoiceProvider(result.provider);
      setVoiceIdUsed(result.voiceId ?? null);
      if (result.warning) toast.error(result.warning);
    },
    [stopMic, stopSpeaking, toast]
  );

  useEffect(() => {
    eiSpeakRef.current = eiSpeak;
  }, [eiSpeak]);

  const handleHeard = useCallback(
    async (transcript: string) => {
      const text = transcript.trim();
      if (!text || handlingUtteranceRef.current) return;
      handlingUtteranceRef.current = true;
      setHeard(text);
      setThinking(true);
      stopMic();

      try {
        const { reply } = await adminApi.eiChat({
          message: text,
          context: buildContext(),
        });
        setThinking(false);
        await eiSpeakRef.current(reply);
      } catch (e) {
        setThinking(false);
        toast.error(e instanceof Error ? e.message : 'Ei could not reply');
      } finally {
        handlingUtteranceRef.current = false;
      }
    },
    [buildContext, stopMic, toast]
  );

  const startMic = async () => {
    stopSpeaking();
    handlingUtteranceRef.current = false;
    setHeard(null);

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);

      streamRef.current = stream;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      setListening(true);

      const freq = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        const a = analyserRef.current;
        if (!a) return;
        a.getByteFrequencyData(freq);

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
          next.push(Math.min(1, (sum / Math.max(1, n)) / 140));
        }
        const avg = next.reduce((s, v) => s + v, 0) / next.length;
        setBands(next);
        setLevel(avg);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      const rec = new Ctor();
      rec.lang = 'en-GB';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result) continue;
          const piece = result[0]?.transcript ?? '';
          if (result.isFinal) finalText += piece;
          else interim += piece;
        }
        if (interim) setHeard(interim);
        if (finalText.trim()) {
          void handleHeard(finalText);
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        toast.error(`Listen failed: ${event.error}`);
        stopMic();
      };

      rec.onend = () => {
        // If still in listening mode and we didn't hand off to a reply, restart once.
        if (
          recognitionRef.current === rec &&
          !handlingUtteranceRef.current &&
          streamRef.current
        ) {
          try {
            rec.start();
          } catch {
            stopMic();
          }
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      toast.error('Microphone access denied — Ei can still speak without it.');
      setListening(false);
    }
  };

  const toggleMic = () => {
    if (listening) stopMic();
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
  const orbSize = expanded ? 320 : 220;
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
  const providerLabel =
    voiceProvider === 'elevenlabs'
      ? 'ElevenLabs'
      : voiceProvider === 'openai'
        ? 'OpenAI'
        : voiceProvider === 'browser'
          ? 'Browser'
          : null;

  return (
    <AdminCard id="widget-assistant" title={EI_NAME} className="h-full">
      <div
        className={`flex flex-col items-center gap-4 ${expanded ? 'sm:flex-row sm:items-center sm:gap-8' : ''}`}
      >
        <div className="relative flex shrink-0 flex-col items-center gap-2">
          <div
            className="relative flex items-center justify-center overflow-hidden rounded-full"
            style={{ width: orbSize, height: orbSize }}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-full opacity-70 blur-2xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(56,189,248,0.22) 0%, rgba(14,165,233,0.08) 45%, transparent 70%)',
              }}
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
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-cyan-300/80 font-mono">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                speaking || listening || thinking
                  ? 'bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)] animate-pulse'
                  : 'bg-white/25'
              }`}
            />
            {statusLabel}
            {providerLabel && (
              <span className="normal-case tracking-normal text-gray-500">
                · {providerLabel}
                {voiceIdUsed && voiceProvider === 'elevenlabs'
                  ? ` · ${voiceIdUsed.slice(0, 6)}…`
                  : ''}
              </span>
            )}
          </span>
        </div>

        <div className={`w-full space-y-3 ${expanded ? 'max-w-md text-left' : 'text-center'}`}>
          <div>
            <p className="text-sm text-gray-300">
              {speaking
                ? `${EI_NAME} is speaking…`
                : thinking
                  ? `${EI_NAME} is thinking…`
                  : listening
                    ? heard
                      ? `Heard: “${heard}”`
                      : `${EI_NAME} is listening — say something.`
                    : `${EI_NAME} is online.`}
            </p>
          </div>

          <div className={`flex flex-wrap gap-2 ${expanded ? 'justify-start' : 'justify-center'}`}>
            <AdminButton size="sm" variant="primary" onClick={askEi} disabled={busy}>
              <Sparkles size={14} />
              {speaking ? 'Speaking…' : 'Wake Ei'}
            </AdminButton>
            <AdminButton
              size="sm"
              variant={listening ? 'primary' : 'secondary'}
              onClick={toggleMic}
              disabled={busy && !listening}
            >
              {listening ? <MicOff size={14} /> : <Mic size={14} />}
              {listening ? 'Stop mic' : 'Listen'}
            </AdminButton>
          </div>

          <div className={`flex flex-wrap gap-2 ${expanded ? 'justify-start' : 'justify-center'}`}>
            <AdminButton
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void speakOverview('full')}
            >
              <LayoutDashboard size={14} />
              Overview
            </AdminButton>
            <AdminButton
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void speakOverview('investments')}
            >
              <TrendingUp size={14} />
              VUAG
            </AdminButton>
            <AdminButton
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void speakOverview('weather')}
            >
              <CloudSun size={14} />
              Weather
            </AdminButton>
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
