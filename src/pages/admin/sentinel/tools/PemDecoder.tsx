import { useMemo, useState } from 'react';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';
import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import { decodePem } from '../../../../lib/sentinel/localLabs';

const SAMPLE = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHBf...
-----END CERTIFICATE-----`;

export default function PemDecoder() {
  const [pem, setPem] = useState(SAMPLE);
  const result = useMemo(() => decodePem(pem), [pem]);

  return (
    <ToolShell
      title="Certificate PEM Decoder"
      teaches="What this teaches: PEM is just labeled base64 around DER — readable without contacting a host."
    >
      <SentinelCard title="PEM">
        <textarea
          value={pem}
          onChange={(e) => setPem(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-100"
        />
      </SentinelCard>
      <SentinelCard title="Decoded">
        {!result.ok ? (
          <p className="text-sm text-amber-200">{result.error}</p>
        ) : (
          <pre className="overflow-auto font-mono text-xs text-zinc-300">
            {JSON.stringify(result.fields, null, 2)}
          </pre>
        )}
      </SentinelCard>
    </ToolShell>
  );
}
