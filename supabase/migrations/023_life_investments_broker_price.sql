-- Optional broker price override for VUAG valuation (GBP per unit).
-- Public feeds often differ slightly from brokerage mid/last prices.

ALTER TABLE public.life_investments
  ADD COLUMN IF NOT EXISTS broker_price NUMERIC(18, 6);

COMMENT ON COLUMN public.life_investments.broker_price IS
  'Optional GBP/unit from broker; used for portfolio valuation instead of delayed public feed.';
