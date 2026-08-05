import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Mic, Send, Sparkles } from 'lucide-react';
import AdminCard from '../AdminCard';
import AssistantOrb, { type OrbMode } from './AssistantOrb';
import { adminApi } from '../../../lib/adminApi';
import { speakAsEi, whenVoicesReady, type SpeakController } from '../../../lib/lifeDashboard/eiVoice';
import {
  buildFullOverview,
  buildHabitsOverview,
  buildInvestmentOverview,
  buildRemindersOverview,
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
  "I've hit my cloud limit for now. Overview, Vanguard, and Weather still work offline — try again shortly.";

type Mode = 'chat' | 'voice';
type ChatMsg = { id: string; role: 'ei' | 'you'; text: string };

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

function renderMarkdownLite(text: string) {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s: string) =>
    escape(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(
        /`([^`]+)`/g,
        '<code class="rounded bg-white/10 px-1 text-[12px] text-sky-200">$1</code>'
      );

  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      const t = line.trimStart();
      const h = t.match(/^(#{1,6})\s+(.+)$/);
      if (h) {
        const level = h[1]!.length;
        const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs', 'text-[11px]'];
        const weights = ['font-extrabold', 'font-bold', 'font-bold', 'font-semibold', 'font-semibold', 'font-semibold'];
        const colors = [
          'text-white',
          'text-white',
          'text-violet-200',
          'text-slate-300',
          'text-slate-400',
          'text-slate-500 uppercase tracking-wide',
        ];
        const cls = `${sizes[level - 1]} ${weights[level - 1]} ${colors[level - 1]} mt-2 mb-1`;
        return `<div class="${cls}">${inline(h[2]!)}</div>`;
      }
      if (/^([-*•]|\d+\.)\s+/.test(t)) {
        const body = t.replace(/^([-*•]|\d+\.)\s+/, '');
        return `<div class="flex gap-2 text-[15px] leading-6"><span class="text-violet-300">•</span><span>${inline(body)}</span></div>`;
      }
      if (!t) return '<div class="h-2"></div>';
      return `<div class="text-[15px] leading-6">${inline(t)}</div>`;
    })
    .join('');
}

type LifeAssistantProps = {
  payload: LifeDashboardPayload;
  expanded?: boolean;
  onDashboardMutate?: () => void;
};

export default function LifeAssistant({ payload, expanded, onDashboardMutate }: LifeAssistantProps) {
  const { toast } = useAdminToast();
  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'ei',
      text: "Hello — I'm Ei.\n\nType below, or switch to **Voice** to talk. I can read your CVs and update the life dashboard.",
    },
  ]);
  const [input, setInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speakLevel, setSpeakLevel] = useState(0.45);
  const [speakBands, setSpeakBands] = useState<number[]>([]);
  const [level, setLevel] = useState(0);
  const [bands, setBands] = useState<number[]>([]);
  const [heard, setHeard] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
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

  const buildContext = useCallback(() => {
    const habitsDone = payload.habits.filter((h) => h.completed).length;
    const weather = payload.weather;
    const openReminders = (payload.reminders ?? [])
      .filter((r) => !r.done)
      .map((r) => r.title)
      .slice(0, 5)
      .join(', ');
    return [
      `Weather: ${weather.condition}, ${weather.temperatureC}C in ${weather.location}.`,
      `Habits: ${habitsDone}/${payload.habits.length} done.`,
      `Reminders: ${openReminders || 'none'}.`,
      `Active projects: ${payload.projects.filter((p) => p.status === 'active').map((p) => p.name).join(', ') || 'none'}.`,
    ].join(' ');
  }, [payload]);

  const pushMsg = useCallback((role: ChatMsg['role'], text: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${role}-${Math.random()}`, role, text }]);
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

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

  const askChat = async (raw: string, opts?: { speak?: boolean }) => {
    const trimmed = raw.trim();
    if (!trimmed || chatBusy || thinking) return;
    setInput('');
    pushMsg('you', trimmed);
    setChatBusy(true);
    setThinking(true);
    try {
      let reply = OFFLINE_REPLY;
      if (!shouldSkipOpenAi()) {
        try {
          const chat = await adminApi.eiChat({
            message: trimmed.slice(0, 600),
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
            reply = msg || 'Something went wrong talking to Ei.';
          }
        }
      }
      pushMsg('ei', reply);
      if (opts?.speak || mode === 'voice') await eiSpeakRef.current(reply);
    } finally {
      setChatBusy(false);
      setThinking(false);
    }
  };

  const loadInvestment = async (): Promise<InvestmentSnapshot | null> => {
    try {
      return await fetchVuagQuote('1M');
    } catch {
      return null;
    }
  };

  const briefing = async (label: string, build: () => Promise<string> | string) => {
    pushMsg('you', label);
    setChatBusy(true);
    try {
      const text = await build();
      pushMsg('ei', text);
      if (mode === 'voice') await eiSpeakRef.current(text);
    } finally {
      setChatBusy(false);
    }
  };

  const finishListening = async () => {
    if (handlingUtteranceRef.current) return;
    handlingUtteranceRef.current = true;
    const browserText = browserTranscriptRef.current.trim();
    const rec = recorderRef.current;
    const blobPromise =
      rec && rec.state !== 'inactive'
        ? new Promise<Blob | null>((resolve) => {
            rec.onstop = () => {
              const blob =
                chunksRef.current.length > 0
                  ? new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
                  : null;
              resolve(blob);
            };
            try {
              rec.stop();
            } catch {
              resolve(null);
            }
          })
        : Promise.resolve(null);

    stopSpeechRec();
    stopAnalyser();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setListening(false);

    setThinking(true);
    setHeard(browserText || 'Transcribing…');
    try {
      let text = browserText;
      const blob = await blobPromise;
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
      if (!text) throw new Error("Didn't catch that — speak while Listening, then tap Done.");
      setHeard(text);
      await askChat(text, { speak: true });
    } catch (e) {
      setHeard(null);
      const msg = e instanceof Error ? e.message : 'Ei could not process that';
      if (isQuotaOrBillingError(msg)) markOpenAiQuotaExhausted();
      toast.error(friendlyEiError(msg));
    } finally {
      setThinking(false);
      handlingUtteranceRef.current = false;
    }
  };

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
          const avg = n ? sum / n / 255 : 0;
          next.push(voiceGate ? Math.min(1, avg * 1.8 + rms * 2.2) : avg * 0.25);
        }
        const peak = next.reduce((m, v) => Math.max(m, v), 0);
        setLevel(voiceGate ? Math.min(1, peak * 0.85 + rms * 3) : peak * 0.3);
        setBands(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      const mime = pickRecorderMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.start(250);
      recorderRef.current = recorder;

      const RecCtor = getSpeechRecognitionCtor();
      browserTranscriptRef.current = '';
      if (RecCtor) {
        const rec = new RecCtor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-GB';
        rec.onresult = (event) => {
          let finalText = '';
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i]!;
            if (piece.isFinal) finalText += piece[0].transcript;
            else interim += piece[0].transcript;
          }
          if (finalText) browserTranscriptRef.current = `${browserTranscriptRef.current} ${finalText}`.trim();
          const live = `${browserTranscriptRef.current} ${interim}`.trim();
          if (live) setHeard(live);
        };
        rec.onerror = () => {
          /* Whisper fallback */
        };
        speechRecRef.current = rec;
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    } catch {
      toast.error('Microphone permission is required for voice mode.');
      stopMic();
    }
  };

  const orbMode: OrbMode = speaking ? 'speaking' : listening ? 'listening' : 'idle';
  const orbLevel = speaking ? speakLevel : level;
  const orbBands = speaking ? speakBands : listening ? bands : undefined;
  const busy = chatBusy || thinking || speaking;

  const chips = [
    {
      id: 'overview',
      label: 'Overview',
      run: () =>
        briefing('Give me an overview', async () =>
          buildFullOverview(payload, await loadInvestment())
        ),
    },
    {
      id: 'reminders',
      label: 'Reminders',
      run: () => briefing("What's on my list?", () => buildRemindersOverview(payload)),
    },
    {
      id: 'vanguard',
      label: 'Vanguard',
      run: () =>
        briefing('How is Vanguard looking?', async () =>
          buildInvestmentOverview(await loadInvestment())
        ),
    },
    {
      id: 'habits',
      label: 'Habits',
      run: () => briefing("How are today's habits?", () => buildHabitsOverview(payload)),
    },
    {
      id: 'weather',
      label: 'Weather',
      run: () => briefing("What's the weather?", () => buildWeatherOverview(payload)),
    },
    {
      id: 'cvs',
      label: 'CV advice',
      run: () => void askChat('Where should I apply based on my saved CVs?'),
    },
  ];

  return (
    <AdminCard
      id="widget-assistant"
      title={EI_NAME}
      className={`relative flex flex-col overflow-hidden ${
        expanded ? 'h-full min-h-0' : 'h-[560px] max-h-[560px]'
      }`}
    >
      <div className="relative flex h-full min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <span>Chat · CVs · dashboard tools</span>
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-black/30 p-1">
            <button
              type="button"
              onClick={() => {
                stopMic();
                setMode('chat');
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                mode === 'chat'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Keyboard className="h-3.5 w-3.5" />
              Type
            </button>
            <button
              type="button"
              onClick={() => setMode('voice')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                mode === 'voice'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              Voice
            </button>
          </div>
        </div>

        {mode === 'voice' ? (
          <div className="flex shrink-0 flex-col items-center gap-3 py-2">
            <AssistantOrb
              mode={orbMode}
              size={expanded ? 180 : 140}
              level={orbLevel}
              bands={orbBands}
            />
            <p className="max-w-md text-center text-sm text-slate-300">
              {speaking
                ? 'Speaking…'
                : thinking
                  ? heard
                    ? `“${heard}”`
                    : 'Thinking…'
                  : listening
                    ? heard || 'Speak now — tap Done when finished'
                    : 'Tap the mic, speak, then Done.'}
            </p>
            <div className="flex items-center gap-2">
              {listening ? (
                <button
                  type="button"
                  onClick={() => void finishListening()}
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startMic()}
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Start listening
                </button>
              )}
              {speaking ? (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200"
                >
                  Stop
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          ref={threadRef}
          className="ei-chat-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-black/25 p-3 pr-2"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'you'
                  ? 'ml-8 border-white/10 bg-white/5 text-slate-100'
                  : 'mr-8 border-violet-400/20 bg-violet-500/10 text-slate-100'
              }`}
            >
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                {msg.role === 'you' ? 'You' : 'Ei'}
              </div>
              {msg.role === 'ei' ? (
                <div
                  className="[&_strong]:font-semibold [&_em]:italic"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownLite(msg.text) }}
                />
              ) : (
                <div className="whitespace-pre-wrap">{msg.text}</div>
              )}
            </div>
          ))}
          {chatBusy || thinking ? (
            <div className="text-xs text-slate-400">Ei is working…</div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              disabled={busy}
              onClick={() => void chip.run()}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-white/10 disabled:opacity-40"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <form
          className="flex shrink-0 items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void askChat(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void askChat(input);
              }
            }}
            rows={2}
            placeholder="Message Ei…"
            disabled={busy}
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-400/40"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </AdminCard>
  );
}
