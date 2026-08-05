import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { MarkdownText } from '@/src/components/ui/MarkdownText';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { adminApi } from '@/src/lib/adminApi';
import {
  buildEiContext,
  buildFullOverview,
  buildHabitsOverview,
  buildInvestmentOverview,
  buildRemindersOverview,
  buildWeatherOverview,
} from '@/src/lib/eiOverview';
import {
  isCloudChatFailure,
  offlineEiFallback,
  tryLocalEiReply,
} from '@/src/lib/eiLocalAssistant';
import type { InvestmentSnapshot, LifeDashboardPayload, LifeWeather } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

type Message = {
  id: string;
  role: 'ei' | 'you';
  text: string;
};

type EiAssistantCardProps = {
  payload: LifeDashboardPayload;
  investment: InvestmentSnapshot | null;
  weather?: LifeWeather | null;
  onMutate?: () => void;
};

type ChipDef =
  | { id: string; label: string; kind: 'briefing'; prompt: string; build: () => string }
  | { id: string; label: string; kind: 'ask'; prompt: string };

function prefersCloudTools(message: string): boolean {
  return /\b(cv|cvs|curriculum|resume|apply|appl(y|ying|ication)|job search|where should i|update my|add a note|remind me|mark .* habit)\b/i.test(
    message
  );
}

export function EiAssistantCard({
  payload,
  investment,
  weather,
  onMutate,
}: EiAssistantCardProps) {
  const ctx = { payload, investment, weather };
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ei',
      text: [
        "Hello — I'm Ei.",
        '',
        'Type anything: CVs, job search, habits, Vanguard, store hours…',
        'I can read your saved CVs and update the life dashboard when you ask.',
      ].join('\n'),
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const push = (role: Message['role'], text: string) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${role}-${Math.random()}`, role, text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const ask = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setInput('');
    push('you', trimmed);
    setBusy(true);
    try {
      // Prefer on-device answers for practical / dashboard questions — except CV/apply/writes
      if (!prefersCloudTools(trimmed)) {
        const local = await tryLocalEiReply(trimmed, ctx);
        if (local) {
          push('ei', local);
          return;
        }
      }

      try {
        const { reply, didMutate } = await adminApi.eiChat({
          message: trimmed.slice(0, 600),
          context: buildEiContext(payload, weather),
        });
        push('ei', reply);
        if (didMutate) onMutate?.();
      } catch (e) {
        if (isCloudChatFailure(e)) {
          push('ei', await offlineEiFallback(trimmed, ctx));
        } else {
          push('ei', e instanceof Error ? e.message : 'Something went wrong talking to Ei.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const briefing = (label: string, text: string) => {
    push('you', label);
    push('ei', text);
  };

  const chips: ChipDef[] = [
    {
      id: 'overview',
      label: 'Overview',
      kind: 'briefing',
      prompt: 'Give me an overview',
      build: () => buildFullOverview(payload, investment, weather),
    },
    {
      id: 'reminders',
      label: 'Reminders',
      kind: 'briefing',
      prompt: "What's on my list?",
      build: () => buildRemindersOverview(payload),
    },
    {
      id: 'vanguard',
      label: 'Vanguard',
      kind: 'briefing',
      prompt: 'How is Vanguard looking?',
      build: () => buildInvestmentOverview(investment),
    },
    {
      id: 'habits',
      label: 'Habits',
      kind: 'briefing',
      prompt: "How are today's habits?",
      build: () => buildHabitsOverview(payload),
    },
    {
      id: 'weather',
      label: 'Weather',
      kind: 'briefing',
      prompt: "What's the weather?",
      build: () => buildWeatherOverview(payload, weather),
    },
    {
      id: 'city',
      label: 'My city',
      kind: 'ask',
      prompt: 'What city am I in?',
    },
    {
      id: 'ip',
      label: 'My IP',
      kind: 'ask',
      prompt: "What's my IP?",
    },
    {
      id: 'time',
      label: 'Time',
      kind: 'ask',
      prompt: 'What time is it?',
    },
    {
      id: 'hours',
      label: 'Store hours',
      kind: 'ask',
      prompt: 'What time does Asda close in Nottingham?',
    },
    {
      id: 'postcode',
      label: 'Store address',
      kind: 'ask',
      prompt: "What's the postcode for Home Bargains in Nottingham?",
    },
  ];

  return (
    <View>
      <SectionHeader title="Ei" subtitle="Ask freely · works offline too" />
      <Card style={styles.card}>
        <ScrollView
          ref={scrollRef}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.role === 'you' ? styles.bubbleYou : styles.bubbleEi,
              ]}
            >
              <Text style={styles.role}>{msg.role === 'you' ? 'You' : 'Ei'}</Text>
              {msg.role === 'ei' ? (
                <MarkdownText style={styles.bubbleText}>{msg.text}</MarkdownText>
              ) : (
                <Text style={styles.bubbleText}>{msg.text}</Text>
              )}
            </View>
          ))}
          {busy ? (
            <View style={styles.typing}>
              <ActivityIndicator size="small" color={colors.accentLight} />
              <Text style={styles.typingText}>Ei is working…</Text>
            </View>
          ) : null}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {chips.map((chip) => (
            <Chip
              key={chip.id}
              label={chip.label}
              onPress={() => {
                if (chip.kind === 'briefing') briefing(chip.prompt, chip.build());
                else void ask(chip.prompt);
              }}
            />
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything — city, IP, hours, habits…"
            placeholderTextColor={colors.textMuted}
            editable={!busy}
            returnKeyType="send"
            blurOnSubmit
            multiline
            onSubmitEditing={() => {
              if (input.trim()) void ask(input);
            }}
          />
          <Pressable
            style={[styles.send, (!input.trim() || busy) && styles.sendDisabled]}
            onPress={() => void ask(input)}
            disabled={!input.trim() || busy}
          >
            <Ionicons name="send" size={16} color={colors.text} />
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, paddingVertical: 14 },
  thread: { maxHeight: 320 },
  threadContent: { gap: 10, paddingBottom: 4 },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '94%',
  },
  bubbleEi: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  bubbleYou: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  role: {
    color: colors.accentLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  typingText: { color: colors.textMuted, fontSize: 12 },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipText: {
    color: colors.accentLight,
    fontSize: 12,
    fontWeight: '600',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
