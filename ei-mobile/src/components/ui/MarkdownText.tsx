import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '@/src/theme/colors';

type MarkdownTextProps = {
  children: string;
  style?: StyleProp<TextStyle>;
};

type InlineSeg =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string };

/**
 * Lightweight markdown for Ei chat bubbles (bold / italic / code / lists / headings).
 * Avoids a native markdown dependency so Expo Go OTA stays simple.
 */
export function MarkdownText({ children, style }: MarkdownTextProps) {
  const source = (children ?? '').replace(/\r\n/g, '\n');
  const lines = source.split('\n');

  return (
    <View style={styles.block}>
      {lines.map((line, i) => {
        const trimmed = line.trimStart();
        const key = `l-${i}`;

        if (!trimmed) {
          return <View key={key} style={styles.blank} />;
        }

        if (/^#{1,3}\s+/.test(trimmed)) {
          const text = trimmed.replace(/^#{1,3}\s+/, '');
          return (
            <Text key={key} style={[styles.heading, style]}>
              {renderInline(text)}
            </Text>
          );
        }

        const bullet = trimmed.match(/^([-*•]|\d+\.)\s+(.*)$/);
        if (bullet) {
          return (
            <View key={key} style={styles.listRow}>
              <Text style={[styles.bullet, style]}>•</Text>
              <Text style={[styles.body, styles.listText, style]}>{renderInline(bullet[2]!)}</Text>
            </View>
          );
        }

        return (
          <Text key={key} style={[styles.body, style]}>
            {renderInline(trimmed)}
          </Text>
        );
      })}
    </View>
  );
}

function renderInline(input: string): React.ReactNode[] {
  const segs = parseInline(input);
  return segs.map((seg, i) => {
    if (seg.type === 'bold') {
      return (
        <Text key={i} style={styles.bold}>
          {seg.value}
        </Text>
      );
    }
    if (seg.type === 'italic') {
      return (
        <Text key={i} style={styles.italic}>
          {seg.value}
        </Text>
      );
    }
    if (seg.type === 'code') {
      return (
        <Text key={i} style={styles.code}>
          {seg.value}
        </Text>
      );
    }
    return <Text key={i}>{seg.value}</Text>;
  });
}

function parseInline(input: string): InlineSeg[] {
  const out: InlineSeg[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    if (m.index > last) out.push({ type: 'text', value: input.slice(last, m.index) });
    const token = m[0]!;
    if (token.startsWith('**')) {
      out.push({ type: 'bold', value: token.slice(2, -2) });
    } else if (token.startsWith('`')) {
      out.push({ type: 'code', value: token.slice(1, -1) });
    } else {
      out.push({ type: 'italic', value: token.slice(1, -1) });
    }
    last = m.index + token.length;
  }
  if (last < input.length) out.push({ type: 'text', value: input.slice(last) });
  return out.length ? out : [{ type: 'text', value: input }];
}

/** Strip markdown markers for TTS / plain fallbacks. */
export function stripMarkdown(input: string): string {
  return input
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*•]\s+/gm, '• ')
    .trim();
}

const styles = StyleSheet.create({
  block: {
    gap: 4,
  },
  blank: {
    height: 6,
  },
  body: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  heading: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingRight: 4,
  },
  bullet: {
    color: colors.accentLight,
    fontSize: 14,
    lineHeight: 20,
    width: 12,
  },
  listText: {
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: colors.accentLight,
  },
});
