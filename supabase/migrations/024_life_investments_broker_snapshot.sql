-- Trading 212-style broker snapshot fields for accurate dashboard totals.
ALTER TABLE public.life_investments
  ADD COLUMN IF NOT EXISTS broker_value NUMERIC(18, 4),
  ADD COLUMN IF NOT EXISTS broker_day_pnl NUMERIC(18, 4);

COMMENT ON COLUMN public.life_investments.broker_value IS
  'Portfolio / account value from broker (GBP). Preferred over units×feed.';
COMMENT ON COLUMN public.life_investments.broker_day_pnl IS
  'Last 24h P/L from broker (GBP).';
