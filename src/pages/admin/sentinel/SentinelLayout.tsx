import { NavLink, Outlet } from 'react-router-dom';
import { Shield } from 'lucide-react';
import SentinelNavDropdown from '../../../components/admin/sentinel/SentinelNavDropdown';
import { OPERATIONS_NAV, TOOLS_NAV } from '../../../lib/sentinel/tools';

const PRIORITY = [
  { to: '/admin/sentinel', end: true, label: 'Centre' },
  { to: '/admin/sentinel/scanner', label: 'Scanner' },
  { to: '/admin/sentinel/targets', label: 'Targets' },
  { to: '/admin/sentinel/findings', label: 'Findings' },
];

export default function SentinelLayout() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-2.5">
            <Shield className="text-rose-300" size={20} />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-rose-300/80">
              Sentinel
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">
              Security Tool Centre
            </h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-500">
              Private workstation for passive web assessment labs and local security utilities.
            </p>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap items-center gap-1 border-b border-white/5 pb-3">
        {PRIORITY.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-rose-500/15 text-rose-200'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <SentinelNavDropdown label="Tools" items={TOOLS_NAV} />
        <SentinelNavDropdown label="Operations" items={OPERATIONS_NAV} />
      </nav>

      <Outlet />
    </div>
  );
}
