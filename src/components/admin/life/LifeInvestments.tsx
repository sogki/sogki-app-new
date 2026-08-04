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
  investedFromReturn,
  loadVuagConfig,
  rateOfReturnPct,
  saveVuagConfig,
  type VuagConfig,
} from '../../../lib/lifeDashboard/vuagConfig';
import { marketSessionBadge, resolveMarketSession } from '../../../lib/lifeDashboard/marketHours';
import { useAdminToast } from '../../../context/AdminToastContext';

const RANGES: InvestmentRange[] = ['1D', '1W', '1M', '6M', '1Y', 'ALL'];

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

  const [valueDraft, setValueDraft] = useState('');
  const [investedDraft, setInvestedDraft] = useState('');
  const [returnDraft, setReturnDraft] = useState('');

  const syncDrafts = (next: VuagConfig, livePrice?: number) => {
    setConfig(next);
    const price = livePrice && livePrice > 0 ? livePrice : undefined;
    if (next.holdings > 0 && price) {
      setValueDraft((next.holdings * price).toFixed(2));
    } else if (next.holdings > 0) {
      setValueDraft('');
    } else {
      setValueDraft('');
    }
    const invested = getInvested(next);
    setInvestedDraft(invested != null ? String(Number(invested.toFixed(4))) : '');
    if (next.holdings > 0 && price && invested != null && invested > 0) {
      const r = rateOfReturnPct(next.holdings * price, invested);
      setReturnDraft(r != null ? String(Number(r.toFixed(2))) : '');
    } else {
      setReturnDraft('');
    }
  };

  const needsSetup = !(config.holdings > 0);

  const loadQuote = useCallback(
    async (nextRange: InvestmentRange) => {
      setLoading(true);
      try {
        try {
          const remote = await fetchVuagConfig();
          setConfig(remote);
        } catch {
          /* cache */
        }
        const quote = await fetchVuagQuote(nextRange);
        setData(quote);
        setLive(true);
        syncDrafts(loadVuagConfig(), quote.price);
        if (!(quote.holdings > 0)) setEditing(true);
      } catch (e) {
        setLive(false);
        toast.error(e instanceof Error ? e.message : 'Could not load VUAG.L feed');
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    void loadQuote(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const points = data.series[range] ?? [];
  const invested = data.invested ?? getInvested(config);
  const unrealized =
    invested != null && data.holdings > 0 ? data.portfolioValue - invested : null;
  const unrealizedPct =
    unrealized != null && invested != null && invested > 0
      ? (unrealized / invested) * 100
      : null;
  const positiveToday = data.todayGainLoss >= 0;
  const positiveUnrealized = unrealized == null ? true : unrealized >= 0;
  const positiveDay = data.dailyChangePct >= 0;
  const marketSession = data.marketSession ?? resolveMarketSession(data.marketState);
  const marketBadge = marketSessionBadge(marketSession);

  const rangePositive = useMemo(() => {
    if (points.length < 2) return positiveDay;
    return points[points.length - 1].value >= points[0].value;
  }, [points, positiveDay]);

  const onReturnChange = (raw: string) => {
    setReturnDraft(raw);
    const value = Number(valueDraft);
    const r = Number(raw);
    if (Number.isFinite(value) && value > 0 && Number.isFinite(r)) {
      setInvestedDraft(investedFromReturn(value, r).toFixed(4));
    }
  };

  const onInvestedChange = (raw: string) => {
    setInvestedDraft(raw);
    const value = Number(valueDraft);
    const inv = Number(raw);
    if (Number.isFinite(value) && value > 0 && Number.isFinite(inv) && inv > 0) {
      const r = rateOfReturnPct(value, inv);
      if (r != null) setReturnDraft(r.toFixed(2));
    }
  };

  const onValueChange = (raw: string) => {
    setValueDraft(raw);
    const value = Number(raw);
    const r = Number(returnDraft);
    if (Number.isFinite(value) && value > 0 && Number.isFinite(r)) {
      setInvestedDraft(investedFromReturn(value, r).toFixed(4));
    }
  };

  const saveIsa = async () => {
    const accountValue = Number(valueDraft);
    const returnPct = returnDraft.trim() === '' ? undefined : Number(returnDraft);
    let investedAmount = investedDraft.trim() === '' ? undefined : Number(investedDraft);

    if (!Number.isFinite(accountValue) || accountValue <= 0) {
      toast.error('Enter your account / ISA value (e.g. 21.23).');
      return;
    }
    if (!data.price || data.price <= 0) {
      toast.error('Wait for the live VUAG.L price, then save again.');
      return;
    }
    if (returnPct != null && Number.isFinite(returnPct) && investedAmount == null) {
      investedAmount = investedFromReturn(accountValue, returnPct);
    }
    if (investedAmount != null && (!Number.isFinite(investedAmount) || investedAmount <= 0)) {
      toast.error('Amount invested must be a positive number (or enter rate of return %).');
      return;
    }

    // Lock units from your value ÷ live feed — feed then drives future value & 24h.
    const holdings = accountValue / data.price;

    // Guard common mistake: treating pounds as share count
    if (holdings > 5) {
      toast.error(
        `That would be ${holdings.toFixed(2)} units (~${formatMoney(holdings * data.price, '£')}). Check the account value is in pounds, not units.`
      );
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
      syncDrafts(saved, data.price);
      setEditing(false);
      toast.success('Saved. Value & 24h now track the VUAG.L public feed.');
      await loadQuote(range);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
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
            Edit values
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
        {(editing || needsSetup) && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-3">
            <p className="text-xs text-gray-300">
              Enter your <span className="text-white">ISA / Trading 212</span> numbers. We convert
              account value → units using the live VUAG.L price; the feed then calculates value,
              last 24h, and the chart.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <AdminLabel>Account value (£)</AdminLabel>
                <AdminInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={valueDraft}
                  onChange={(e) => onValueChange(e.target.value)}
                  placeholder="21.23"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Live feed {data.price > 0 ? formatMoney(data.price, '£', 3) : '—'}/unit
                  {data.price > 0 && Number(valueDraft) > 0
                    ? ` → ≈ ${(Number(valueDraft) / data.price).toFixed(4)} units`
                    : ''}
                </p>
              </div>
              <div>
                <AdminLabel>Rate of return (%) — optional</AdminLabel>
                <AdminInput
                  type="number"
                  step="0.01"
                  value={returnDraft}
                  onChange={(e) => onReturnChange(e.target.value)}
                  placeholder="1.2"
                />
              </div>
              <div className="sm:col-span-2">
                <AdminLabel>Amount invested (£)</AdminLabel>
                <AdminInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={investedDraft}
                  onChange={(e) => onInvestedChange(e.target.value)}
                  placeholder="auto from return %, or type cost basis"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Used for unrealised P/L. Leave blank if you only care about live value &amp; 24h.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {!needsSetup && (
                <AdminButton size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </AdminButton>
              )}
              <AdminButton size="sm" variant="primary" disabled={saving} onClick={() => void saveIsa()}>
                {saving ? 'Saving…' : 'Save'}
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
                {live ? 'Live feed' : 'Offline'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] border ${
                  marketBadge.openish
                    ? 'bg-sky-500/10 text-sky-300 border-sky-400/20'
                    : 'bg-amber-500/10 text-amber-200/90 border-amber-400/20'
                }`}
              >
                {marketBadge.label}
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
                : ' · set account value'}
            </p>
          </div>
          <div className="text-right">
            {unrealized == null ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-emerald-300 hover:text-emerald-200"
              >
                Set invested
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
            value={unrealizedPct == null ? '—' : formatPct(unrealizedPct)}
            tone={unrealizedPct == null ? undefined : unrealizedPct >= 0 ? 'good' : 'bad'}
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
