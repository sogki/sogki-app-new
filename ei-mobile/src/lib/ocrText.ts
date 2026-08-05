/**
 * Reflow OCR text that arrives as one-word-per-line (or similarly broken wraps)
 * into readable paragraphs while keeping real structure (bullets, blanks, headers).
 */
export function normalizeOcrText(raw: string): string {
  const lines = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim());

  const out: string[] = [];
  let buf = '';

  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = '';
    }
  };

  const isStructural = (line: string) =>
    /^([-*•▪◦]|\d+[.)])\s+/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    (/^[A-Z0-9][A-Z0-9 &/–—-]{2,}$/.test(line) && line.length <= 48);

  for (const line of lines) {
    if (!line) {
      flush();
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }

    if (isStructural(line)) {
      flush();
      out.push(line);
      continue;
    }

    if (!buf) {
      buf = line;
    } else if (/[-–—]$/.test(buf) && /^[a-z]/.test(line)) {
      buf = `${buf.replace(/[-–—]$/, '')}${line}`;
    } else {
      buf = `${buf} ${line}`;
    }

    // End soft-wrapped sentence blocks so paragraphs stay readable.
    if (/[.!?:]"?$/.test(line) && buf.length > 48) {
      flush();
    }
  }

  flush();
  return out
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
