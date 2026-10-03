import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import WebToolRunner from '../../../../components/admin/sentinel/WebToolRunner';
import { sentinelApi } from '../../../../lib/sentinel/api';

export default function CookieLab() {
  return (
    <WebToolRunner
      title="Cookie Lab"
      teaches="What this teaches: Secure, HttpOnly, SameSite, and cookie prefixes harden session cookies."
      actionLabel="Inspect cookies"
      onRun={(targetId) => sentinelApi.toolCookies({ target_id: targetId })}
    >
      {(raw) => {
        const r = raw as {
          count: number;
          cookies: {
            name: string;
            secure?: boolean;
            httponly?: boolean;
            samesite?: string;
            domain?: string;
            path?: string;
            notes: string[];
          }[];
        };
        return (
          <SentinelCard title={`${r.count} cookie(s)`}>
            {!r.cookies.length ? (
              <p className="text-sm text-zinc-500">No Set-Cookie headers on this response.</p>
            ) : (
              <div className="space-y-2">
                {r.cookies.map((c) => (
                  <div
                    key={c.name}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                  >
                    <p className="font-mono text-rose-200">{c.name}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Secure={String(!!c.secure)} · HttpOnly={String(!!c.httponly)} · SameSite=
                      {c.samesite || '—'} · Domain={c.domain || '—'} · Path={c.path || '—'}
                    </p>
                    {c.notes?.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-xs text-amber-100/90">
                        {c.notes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SentinelCard>
        );
      }}
    </WebToolRunner>
  );
}
