import { useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import {
  base64Decode,
  base64Encode,
  hashText,
  md5Hex,
  urlDecode,
  urlEncode,
} from '../../../../lib/sentinel/localCrypto';

export default function HashEncodingLab() {
  const [input, setInput] = useState('');
  const [sha256, setSha256] = useState('');
  const [sha1, setSha1] = useState('');
  const [md5, setMd5] = useState('');
  const [b64, setB64] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    try {
      setSha256(await hashText('SHA-256', input));
      setSha1(await hashText('SHA-1', input));
      setMd5(await md5Hex(input));
      setB64(base64Encode(input));
      setUrl(urlEncode(input));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const decodeB64 = () => {
    try {
      setInput(base64Decode(input));
      setError(null);
    } catch {
      setError('Invalid Base64');
    }
  };

  const decodeUrl = () => {
    try {
      setInput(urlDecode(input));
      setError(null);
    } catch {
      setError('Invalid URL encoding');
    }
  };

  return (
    <ToolShell
      title="Hash / Encoding Lab"
      teaches="What this teaches: hashing is one-way, encoding is reversible — neither is encryption by itself."
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
        Everything runs in your browser. Input is never sent to Sentinel API.
      </div>

      <SentinelCard title="Input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-rose-400/40"
          placeholder="Type text to hash or encode…"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void run()}
            className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-sm text-rose-100"
          >
            Compute
          </button>
          <button
            type="button"
            onClick={decodeB64}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300"
          >
            Decode Base64 → input
          </button>
          <button
            type="button"
            onClick={decodeUrl}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300"
          >
            Decode URL → input
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-amber-200">{error}</p>}
      </SentinelCard>

      <div className="grid gap-3 lg:grid-cols-2">
        {[
          ['SHA-256', sha256],
          ['SHA-1 (legacy)', sha1],
          ['MD5 (legacy — not for security)', md5],
          ['Base64', b64],
          ['URL encode', url],
        ].map(([label, value]) => (
          <SentinelCard key={label} title={label}>
            <p className="break-all font-mono text-xs text-zinc-300">{value || '—'}</p>
          </SentinelCard>
        ))}
      </div>
    </ToolShell>
  );
}
