import { Link } from 'react-router-dom';
import type { SentinelTool } from '../../../lib/sentinel/tools';

const CATEGORY_STYLES = {
  web: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  local: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300',
  core: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  learn: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
};

export default function ToolCard({ tool }: { tool: SentinelTool }) {
  return (
    <Link
      to={tool.to}
      className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-rose-500/30 hover:bg-rose-500/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white">{tool.name}</h3>
        <span
          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${CATEGORY_STYLES[tool.category]}`}
        >
          {tool.category}
        </span>
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">{tool.description}</p>
      <p className="mt-3 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-zinc-600">
        {tool.teaches}
      </p>
    </Link>
  );
}
