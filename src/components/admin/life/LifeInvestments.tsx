import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, RefreshCw } from 'lucide-react';
import AdminCard from '../AdminCard';
import AdminButton from '../AdminButton';
import { AdminInput, AdminLabel } from '../AdminField';
import LifeLineChart from './LifeLineChart';
import type { InvestmentRange, InvestmentSnapshot } from '../../../lib/lifeDashboard/types';
import { formatMoney, formatPct } from '../../../lib/lifeDashboard/format';
import { fetchVuagQuote } from '../../../lib/lifeDashboard/fetchVuag';
import {
  fetchVuagConfig,
  getInvested,
  loadVuagConfig,
  saveVuagConfig,
  type VuagConfig,
} from '../../../lib/lifeDashboard/vuagConfig';
import { useAdminToast } from '../../../context/AdminToastContext';

const RANGES: InvestmentRange[] = ['1D', '1W', '1M', '6M', '1Y', 'ALL'];
const MIGRATE_FLAG = 'life-dashboard-vuag-migrated';

type LifeInvestmentsProps = {
  fallback: InvestmentSnapshot;
  expanded?: boolean;
};

export default function LifeInvestments({ fallback, expanded }: LifeInvestmentsProps) {
  const { toast } = useAdminToast();
  const [range, setRange] = useState<InvestmentRange>('1M');
  const [data, setData] = useState<InvestmentSnapshot>(fallback);
  const [config, setConfig] = useState<VuagConfig>(() => loadVuagConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [live, setLive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [unitsDraft, setUnitsDraft] = useState(() => {
    const h = loadVuagConfig().holdings;
    return h > 0 ? String(h) : '';
  });
  const [investedDraft, setInvestedDraft] = useState(() => {
    const invested = getInvested(loadVuagConfig());
    return invested != null ? String(invested) : '';
  });
  const [valueDraft, setValueDraft] = useState('');

  const syncDrafts = (next: VuagConfig) => {
    setConfig(next);
    setUnitsDraft(next.holdings > 0 ? String(next.holdings) : '');
    const invested = getInvested(next);
    setInvestedDraft(invested != null ? String(invested) : '');
  };

  const maybeMigrateLocalToDb = async () => {
    try {
      if (localStorage.getItem(MIGRATE_FLAG)) return;
      const local = loadVuagConfig();
      if (!(local.holdings > 0)) {
        localStorage.setItem(MIGRATE_FLAG, '1');
        return;
      }
      const remote = await fetchVuagConfig();
      if (remote.holdings > 0) {
        localStorage.setItem(MIGRATE_FLAG, '1');
        return;
      }
      await saveVuagConfig(local);
      localStorage.setItem(MIGRATE_FLAG, '1');
    } catch {
      /* ignore migrate failures */
    }
  };

  const loadQuote = useCallback(
    async (nextRange: InvestmentRange) => {
      setLoading(true);
      try {
        await maybeMigrateLocalToDb();
        try {
          const remote = await fetchVuagConfig();
          syncDrafts(remote);
        } catch {
          /* use cache */
        }
        const quote = await fetchVuagQuote(nextRange);
        setData(quote);
        setLive(true);
        // Auto-open editor when holdings not set
        if (quote.holdings <= 0) {
          setEditing(true);
        }
      } catch (e) {
        const cached = loadVuagConfig();
        setData((prev) => {
          const base = prev.price ? prev : fallback;
          const prevClose = base.price / (1 + (base.dailyChangePct || 0) / 100);
          return {
            ...base,
            holdings: cached.holdings,
            portfolioValue: cached.holdings * base.price,
            todayGainLoss: cached.holdings * (base.price - prevClose),
          };
        });
        setLive(false);
        toast.error(e instanceof Error ? e.message : 'Could not load live VUAG quote');
      } finally {
        setLoading(false);
      }
    },
    [fallback, toast]
  );

  useEffect(() => {
    void loadQuote(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const points = data.series[range] ?? [];
  const invested = getInvested(config);
  const unrealized =
    invested != null && config.holdings > 0 ? data.portfolioValue - invested : null;
  const unrealizedPct =
    unrealized != null && invested != null && invested > 0
      ? (unrealized / invested) * 100
      : null;
  const rateOfReturn = unrealizedPct;
  const positiveDay = data.dailyChangePct >= 0;
  const positiveToday = data.todayGainLoss >= 0;
  const positiveUnrealized = unrealized == null ? true : unrealized >= 0;
  const needsHoldings = data.holdings <= 0;

  const rangePositive = useMemo(() => {
    if (points.length < 2) return positiveDay;
    return points[points.length - 1].value >= points[0].value;
  }, [points, positiveDay]);

  const applyValueToUnits = () => {
    const value = Number(valueDraft);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter your current portfolio value (e.g. 16.17).');
      return;
    }
    if (!data.price || data.price <= 0) {
      toast.error('Live price not loaded yet — wait for Live, then try again.');
      return;
    }
    const units = value / data.price;
    setUnitsDraft(units.toFixed(6).replace(/\.?0+$/, ''));
    toast.success(`Set units from £${value.toFixed(2)} ÷ £${data.price.toFixed(3)}.`);
  };

  const saveHoldings = async () => {
    const holdings = Number(unitsDraft);
    const investedAmount =
      investedDraft.trim() === '' ? undefined : Number(investedDraft);

    if (!Number.isFinite(holdings) || holdings < 0) {
      toast.error('Enter a valid units amount (fractional OK).');
      return;
    }
    if (
      investedAmount != null &&
      (!Number.isFinite(investedAmount) || investedAmount < 0)
    ) {
      toast.error('Amount invested must be a valid number.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveVuagConfig({
        symbol: 'VUAG.L',
        name: 'Vanguard S&P 500 UCITS ETF Acc (LSE)',
        exchange: 'LSE',
        holdings,
        invested: investedAmount,
      });
      syncDrafts(saved);
      setEditing(false);
      toast.success('VUAG holdings saved to database.');
      await loadQuote(range);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save holdings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminCard
      id="widget-investments"
      title="Investments"
      className="h-full"
      actions={
        <div className="mr-14 flex flex-wrap items-center gap-1">
          <AdminButton size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            <Pencil size={12} />
            Holdings
          </AdminButton>
          <AdminButton
            size="sm"
            variant="ghost"
            disabled={loading}
            onClick={() => void loadQuote(range)}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </AdminButton>
          {RANGES.map((r) => (
            <AdminButton
              key={r}
              size="sm"
              variant={range === r ? 'primary' : 'ghost'}
              onClick={() => setRange(r)}
            >
              {r}
            </AdminButton>
          ))}
        </div>
      }
    >
      <div className={`space-y-4 ${expanded ? 'max-w-4xl' : ''}`}>
        {(editing || needsHoldings) && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 space-y-3">
            <p className="text-xs text-gray-300">
              {needsHoldings
                ? 'Holdings not set yet — portfolio shows £0 until you save units. LSE ticker VUAG.L.'
                : 'Update LSE VUAG.L holdings. Synced to the database for desktop and mobile.'}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AdminLabel>Current value (£) → units helper</AdminLabel>
                <div className="flex gap-2">
                  <AdminInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={valueDraft}
                    onChange={(e) => setValueDraft(e.target.value)}
                    placeholder="e.g. 16.17"
                  />
                  <AdminButton size="sm" variant="ghost" onClick={applyValueToUnits}>
                    Convert
                  </AdminButton>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Live LSE price {data.price > 0 ? formatMoney(data.price, '£', 3) : '—'}/unit
                </p>
              </div>
              <div>
                <AdminLabel>Units held</AdminLabel>
                <AdminInput
                  type="number"
                  min="0"
                  step="any"
                  value={unitsDraft}
                  onChange={(e) => setUnitsDraft(e.target.value)}
                  placeholder="e.g. 0.1473"
                />
              </div>
              <div>
                <AdminLabel>Amount invested (£)</AdminLabel>
                <AdminInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={investedDraft}
                  onChange={(e) => setInvestedDraft(e.target.value)}
                  placeholder="e.g. 16.00"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {!needsHoldings && (
                <AdminButton size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </AdminButton>
              )}
              <AdminButton
                size="sm"
                variant="primary"
                disabled={saving}
                onClick={() => void saveHoldings()}
              >
                {saving ? 'Saving…' : 'Save holdings'}
              </AdminButton>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">VUAG · LSE</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  live
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/20'
                    : 'bg-white/5 text-gray-500 border border-white/10'
                }`}
              >
                {live ? 'Live' : 'Offline'}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-400">{data.name}</p>
            <p className="mt-2 text-2xl font-semibold text-white font-mono tabular-nums">
              {formatMoney(data.portfolioValue, '£', 2)}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {formatMoney(data.price, '£', 3)}/unit
              {data.holdings > 0
                ? ` · ${data.holdings.toLocaleString('en-GB', { maximumFractionDigits: 4 })} units`
                : ' · holdings not set'}
            </p>
            <p className="mt-1 text-[11px] text-gray-600">
              Delayed LSE quote for VUAG.L (public market data).
            </p>
          </div>
          <div className="text-right">
            {unrealized == null ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-emerald-300 hover:text-emerald-200"
              >
                Set holdings
              </button>
            ) : (
              <p
                className={`text-sm font-medium tabular-nums ${
                  positiveUnrealized ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {`${formatMoney(unrealized, '£', 2, { signed: true })} (${formatPct(unrealizedPct ?? 0)})`}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">Unrealised result</p>
          </div>
        </div>

        <LifeLineChart points={points} positive={rangePositive} />

        <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4 sm:grid-cols-4">
          <Stat label="Value" value={formatMoney(data.portfolioValue, '£', 2)} />
          <Stat
            label="Unrealised"
            value={
              unrealized == null
                ? '—'
                : `${formatMoney(unrealized, '£', 2, { signed: true })} (${formatPct(unrealizedPct ?? 0)})`
            }
            tone={unrealized == null ? undefined : positiveUnrealized ? 'good' : 'bad'}
          />
          <Stat
            label="Rate of return"
            value={rateOfReturn == null ? '—' : formatPct(rateOfReturn)}
            tone={rateOfReturn == null ? undefined : rateOfReturn >= 0 ? 'good' : 'bad'}
          />
          <Stat
            label="Last 24h"
            value={formatMoney(data.todayGainLoss, '£', 2, { signed: true })}
            tone={positiveToday ? 'good' : 'bad'}
          />
        </div>
      </div>
    </AdminCard>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
}) {
  const valueClass =
    tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-red-300' : 'text-white';
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-medium font-mono tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}
