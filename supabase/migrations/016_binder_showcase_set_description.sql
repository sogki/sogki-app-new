-- Optional blurb per master set row (shown above the progress bar on /collection)
ALTER TABLE public.binder_showcase_sets
  ADD COLUMN IF NOT EXISTS description TEXT;
