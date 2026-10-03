import { useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { decodeJwt, type JwtDecodeResult } from '../../../../lib/sentinel/localCrypto';

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [result, setResult] = useState<JwtDecodeResult | null>(null);

  const run = async () => {
    setResult(await decodeJwt(token, secret || undefined));
  };

  return (
    <ToolShell
      title="JWT Decoder"
      teaches="What this teaches: JWTs are base64url JSON plus an optional signature — claims are readable unless encrypted."
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
        Decoding is local. Optional HS256 verify uses a secret you paste here — never logged or uploaded.
      </div>

      <SentinelCard title="Token">
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-rose-400/40"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        />
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-zinc-500">HS256 secret (optional)</span>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-rose-400/40"
            placeholder="Only used locally for verification"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          onClick={() => void run()}
          className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm text-rose-100"
        >
          Decode
        </button>
      </SentinelCard>

      {result && (
        <>
          {result.error && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {result.error}
            </div>
          )}
          {result.warnings.length > 0 && (
            <SentinelCard title="Warnings">
              <ul className="list-inside list-disc text-sm text-amber-100/90">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </SentinelCard>
          )}
          {result.verified !== null && (
            <p className="text-sm text-zinc-300">
              HS256 verify:{' '}
              <span className={result.verified ? 'text-emerald-300' : 'text-rose-300'}>
                {result.verified ? 'valid' : 'invalid'}
              </span>
            </p>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            <SentinelCard title="Header">
              <pre className="overflow-auto font-mono text-xs text-zinc-300">
                {JSON.stringify(result.header, null, 2) || '—'}
              </pre>
            </SentinelCard>
            <SentinelCard title="Payload">
              <pre className="overflow-auto font-mono text-xs text-zinc-300">
                {JSON.stringify(result.payload, null, 2) || '—'}
              </pre>
            </SentinelCard>
          </div>
        </>
      )}
    </ToolShell>
  );
}
