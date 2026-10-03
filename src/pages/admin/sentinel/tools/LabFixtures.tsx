import ToolShell from '../../../../components/admin/sentinel/ToolShell';
import SentinelCard from '../../../../components/admin/sentinel/SentinelCard';

export default function LabFixtures() {
  return (
    <ToolShell
      title="Lab Fixtures"
      teaches="What this teaches: repeatable local targets beat improvising against production."
    >
      <SentinelCard title="Local fixture server">
        <p className="text-sm leading-relaxed text-zinc-300">
          Run a tiny demo HTTP server that returns intentionally weak and hardened responses for
          Sentinel labs.
        </p>
        <pre className="mt-3 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-zinc-300">
          {`cd sentinel
py -3 labfixtures/server.py
# listens on http://127.0.0.1:8791`}
        </pre>
      </SentinelCard>
      <SentinelCard title="Suggested targets">
        <ul className="list-inside list-disc space-y-2 text-sm text-zinc-300">
          <li>
            <code className="font-mono text-rose-200">http://127.0.0.1:8791/</code> — weak headers,
            CORS *, third-party/mixed assets
          </li>
          <li>
            <code className="font-mono text-rose-200">http://127.0.0.1:8791/secure</code> — stronger
            header set for contrast
          </li>
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Add these under Targets, then use Scanner / Header Lab / Asset Inventory / Method Probe.
          See docs/sentinel/lab-fixtures.md.
        </p>
      </SentinelCard>
    </ToolShell>
  );
}
