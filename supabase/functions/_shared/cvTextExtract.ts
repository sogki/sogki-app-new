/** Shared CV plain-text extraction for admin-api + ei-chat (Deno). */

export const MAX_EXTRACTED_CHARS = 100_000;
const BUCKET = 'cv-documents';

export async function extractTextFromBytes(
  bytes: Uint8Array,
  mimeType: string,
  fileName: string
): Promise<string> {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  try {
    if (ext === 'txt' || mime.startsWith('text/plain')) {
      return cap(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
    }
    if (ext === 'rtf' || mime.includes('rtf')) {
      return cap(stripRtf(new TextDecoder('utf-8', { fatal: false }).decode(bytes)));
    }
    if (ext === 'docx' || mime.includes('wordprocessingml') || mime.includes('officedocument.wordprocessingml')) {
      return cap(await extractDocx(bytes));
    }
    if (ext === 'pdf' || mime === 'application/pdf') {
      return cap(await extractPdf(bytes));
    }
    if (ext === 'doc') {
      // Legacy binary .doc — best-effort Latin-1 scan for readable runs
      return cap(extractLegacyDocHeuristic(bytes));
    }
  } catch (err) {
    console.error('CV extract failed:', fileName, err);
    return '';
  }
  return '';
}

export async function extractAndStoreCvText(
  supabase: {
    storage: {
      from: (b: string) => {
        download: (path: string) => Promise<{ data: Blob | null; error: { message: string } | null }>;
      };
    };
    from: (t: string) => any;
  },
  row: {
    id: string;
    file_path: string;
    mime_type?: string | null;
    file_name?: string | null;
  }
): Promise<{ extracted_text: string; extracted_at: string }> {
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(row.file_path);
  if (error || !blob) {
    throw new Error(error?.message || 'Failed to download CV for extraction');
  }
  const buf = new Uint8Array(await blob.arrayBuffer());
  const text = await extractTextFromBytes(
    buf,
    row.mime_type || '',
    row.file_name || row.file_path
  );
  const extracted_at = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('cv_documents')
    .update({ extracted_text: text || null, extracted_at })
    .eq('id', row.id);
  if (updErr) throw new Error(updErr.message);
  return { extracted_text: text, extracted_at };
}

function cap(text: string): string {
  const cleaned = text.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (cleaned.length <= MAX_EXTRACTED_CHARS) return cleaned;
  return cleaned.slice(0, MAX_EXTRACTED_CHARS) + '\n\n[…truncated…]';
}

function stripRtf(rtf: string): string {
  return rtf
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-zA-Z]+\d* ?/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import('https://esm.sh/unpdf@0.12.1');
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return typeof text === 'string' ? text : Array.isArray(text) ? text.join('\n') : String(text ?? '');
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
  const zip = await JSZip.loadAsync(bytes);
  const doc = zip.file('word/document.xml');
  if (!doc) return '';
  const xml = await doc.async('string');
  return xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br[^/]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function extractLegacyDocHeuristic(bytes: Uint8Array): string {
  const raw = new TextDecoder('latin1').decode(bytes);
  const matches = raw.match(/[\x20-\x7E\n\r\t]{4,}/g) ?? [];
  return matches.join(' ').replace(/\s+/g, ' ').trim();
}
