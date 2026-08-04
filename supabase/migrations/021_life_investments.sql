-- ============================================
-- Life investments (admin-private VUAG holdings)
-- ============================================
-- Stores portfolio holdings so the admin dashboard syncs across devices.
-- Access only via service_role (admin-api). No public SELECT.
-- ============================================

CREATE TABLE IF NOT EXISTS public.life_investments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      TEXT NOT NULL UNIQUE DEFAULT 'VUAG.L',
  name        TEXT NOT NULL DEFAULT 'Vanguard S&P 500 UCITS ETF Acc (LSE)',
  exchange    TEXT NOT NULL DEFAULT 'LSE',
  holdings    NUMERIC(18, 8) NOT NULL DEFAULT 0 CHECK (holdings >= 0),
  invested    NUMERIC(18, 4), -- total cost basis in GBP (nullable)
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_investments_symbol ON public.life_investments (symbol);

CREATE OR REPLACE FUNCTION public.update_life_investments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS life_investments_updated_at ON public.life_investments;
CREATE TRIGGER life_investments_updated_at
BEFORE UPDATE ON public.life_investments
FOR EACH ROW
EXECUTE FUNCTION public.update_life_investments_updated_at();

ALTER TABLE public.life_investments ENABLE ROW LEVEL SECURITY;

-- Private: no policies for anon/authenticated. Access only via service_role (admin-api).

INSERT INTO public.life_investments (symbol, name, exchange, holdings, invested)
VALUES ('VUAG.L', 'Vanguard S&P 500 UCITS ETF Acc (LSE)', 'LSE', 0, NULL)
ON CONFLICT (symbol) DO NOTHING;
