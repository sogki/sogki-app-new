import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminPageLayout from './AdminPageLayout';
import DashboardBoard from '../../components/admin/life/DashboardBoard';
import { fetchLifeDashboard, saveLifeDashboard } from '../../lib/lifeDashboard/api';
import {
  defaultDashboardLayout,
  defaultLifeDashboardPayload,
} from '../../lib/lifeDashboard/defaults';
import type {
  DashboardLayout,
  DashboardWidgetId,
  InvestmentSnapshot,
  LifeDashboardPayload,
} from '../../lib/lifeDashboard/types';
import { useAdminToast } from '../../context/AdminToastContext';

function emptyInvestment(): InvestmentSnapshot {
  return {
    symbol: 'VUAG',
    name: 'Vanguard S&P 500 UCITS ETF Acc (LSE)',
    currency: 'GBP',
    price: 0,
    dailyChangePct: 0,
    portfolioValue: 0,
    todayGainLoss: 0,
    holdings: 0,
    series: { '1D': [], '1W': [], '1M': [], '6M': [], '1Y': [], ALL: [] },
  };
}

const WIDGET_IDS: DashboardWidgetId[] = [
  'welcome',
  'assistant',
  'investments',
  'goals',
  'habits',
  'reading',
  'jobSearch',
  'projects',
  'notes',
  'weather',
  'siteTools',
  'quickActions',
];

export default function AdminDashboard() {
  const { toast } = useAdminToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payload, setPayload] = useState<LifeDashboardPayload | null>(null);
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const latest = useRef<{ payload: LifeDashboardPayload; layout: DashboardLayout } | null>(
    null
  );

  const focusParam = searchParams.get('focus');
  const expandedId =
    focusParam && WIDGET_IDS.includes(focusParam as DashboardWidgetId)
      ? (focusParam as DashboardWidgetId)
      : null;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await fetchLifeDashboard();
      setPayload(state.payload);
      setLayout(state.layout);
      latest.current = { payload: state.payload, layout: state.layout };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard';
      setError(msg);
      const fallbackPayload = defaultLifeDashboardPayload();
      const fallbackLayout = defaultDashboardLayout();
      setPayload(fallbackPayload);
      setLayout(fallbackLayout);
      latest.current = { payload: fallbackPayload, layout: fallbackLayout };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const scheduleSave = useCallback(() => {
    if (!latest.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const snap = latest.current;
      if (!snap) return;
      void saveLifeDashboard({ payload: snap.payload, layout: snap.layout }).catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to save dashboard');
      });
    }, 600);
  }, [toast]);

  const onPayloadChange = (next: LifeDashboardPayload) => {
    setPayload(next);
    setError(null);
    if (!layout) return;
    latest.current = { payload: next, layout };
    scheduleSave();
  };

  const onLayoutChange = (next: DashboardLayout) => {
    setLayout(next);
    setError(null);
    if (!payload) return;
    latest.current = { payload, layout: next };
    scheduleSave();
  };

  const reloadQuiet = useCallback(async () => {
    try {
      const state = await fetchLifeDashboard();
      setPayload(state.payload);
      setLayout(state.layout);
      latest.current = { payload: state.payload, layout: state.layout };
      setError(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to refresh dashboard');
    }
  }, [toast]);

  const onExpand = (id: DashboardWidgetId | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('focus', id);
    else next.delete('focus');
    setSearchParams(next, { replace: true });
  };

  // When API failed but we have local defaults, still render the board (banner via toast once).
  const hardBlock = loading && !payload;

  return (
    <AdminPageLayout hideHeader loading={hardBlock} error={null} onRetry={load}>
      {error && payload && (
        <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Could not sync from database ({error}). Showing local defaults — edits may not persist
          until the API is reachable.
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}
      {payload && layout && (
        <DashboardBoard
          payload={payload}
          layout={layout}
          investmentFallback={emptyInvestment()}
          onPayloadChange={onPayloadChange}
          onLayoutChange={onLayoutChange}
          expandedId={expandedId}
          onExpand={onExpand}
          onDashboardMutate={() => void reloadQuiet()}
        />
      )}
    </AdminPageLayout>
  );
}
