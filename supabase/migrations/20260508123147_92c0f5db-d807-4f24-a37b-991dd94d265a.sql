
DO $$ BEGIN
  CREATE TYPE public.lead_source AS ENUM ('Website','Referral','Social Media','Cold Call','Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS source public.lead_source;

UPDATE public.leads
SET first_name = COALESCE(first_name, split_part(name, ' ', 1)),
    last_name  = COALESCE(last_name, NULLIF(regexp_replace(name, '^\S+\s*', ''), ''))
WHERE first_name IS NULL OR last_name IS NULL;
