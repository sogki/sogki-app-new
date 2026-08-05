import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '@/src/theme/colors';

type MarkdownTextProps = {
  children: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Discord-style markdown for Ei chat:
 * # largest heading … ###### smallest; **bold**, *italic*, `code`, bullets.
 */
export function MarkdownText({ children, style }: MarkdownTextProps) {
  const source = (children ?? '').replace(/\r\n/g, '\n').trimEnd();
  const lines = source.split('\n');

  return (
    <View style={styles.block}>
      {lines.map((line, i) => {
        const key = `l-${i}`;
        if (!line.trim()) {
          return <Text key={key} style={styles.blank}>{' '}</Text>;
        }

        const trimmed = line.trimStart();
        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
          const level = heading[1]!.length;
          const text = heading[2]!;
          return (
            <Text key={key} style={[styles.line, headingStyle(level), style]}>
              {inlineNodes(text)}
            </Text>
          );
        }

        const bullet = trimmed.match(/^([-*•]|\d+\.)\s+(.*)$/);
        if (bullet) {
          return (
            <Text key={key} style={[styles.line, style]}>
              <Text style={styles.bulletMark}>{'•  '}</Text>
              {inlineNodes(bullet[2]!)}
            </Text>
          );
        }

        return (
          <Text key={key} style={[styles.line, style]}>
            {inlineNodes(trimmed)}
          </Text>
        );
      })}
    </View>
  );
}

function headingStyle(level: number): TextStyle {
  switch (level) {
    case 1:
      return styles.h1;
    case 2:
      return styles.h2;
    case 3:
      return styles.h3;
    case 4:
      return styles.h4;
    case 5:
      return styles.h5;
    default:
      return styles.h6;
  }
}

function inlineNodes(input: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(input))) {
    if (m.index > last) nodes.push(input.slice(last, m.index));
    const token = m[0]!;
    if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <Text key={`b${i++}`} style={styles.bold}>
          {token.slice(2, -2)}
        </Text>
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <Text key={`c${i++}`} style={styles.code}>
          {token.slice(1, -1)}
        </Text>
      );
    } else {
      nodes.push(
        <Text key={`i${i++}`} style={styles.italic}>
          {token.slice(1, -1)}
        </Text>
      );
    }
    last = m.index + token.length;
  }
  if (last < input.length) nodes.push(input.slice(last));
  return nodes.length ? nodes : input;
}

/** Strip markdown markers for TTS / plain fallbacks. */
export function stripMarkdown(input: string): string {
  return input
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*•]\s+/gm, '• ')
    .trim();
}

const styles = StyleSheet.create({
  block: {
    alignSelf: 'stretch',
    width: '100%',
  },
  line: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
    textAlign: 'left',
    writingDirection: 'ltr',
    marginBottom: 2,
  },
  blank: {
    height: 10,
    fontSize: 8,
    lineHeight: 8,
  },
  h1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 2,
  },
  h3: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.accentLight,
    marginTop: 6,
  },
  h4: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  h5: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  h6: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bulletMark: {
    color: colors.accentLight,
    fontWeight: '700',
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
