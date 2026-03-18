-- Add optional description shown in mod UI
ALTER TABLE public.resource_packs
ADD COLUMN IF NOT EXISTS description TEXT;
