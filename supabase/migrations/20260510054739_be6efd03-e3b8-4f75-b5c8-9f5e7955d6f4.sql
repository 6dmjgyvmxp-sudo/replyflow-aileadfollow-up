
-- Profiles (agent branding)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  reply_to_email text,
  phone text,
  brokerage_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lead temperature enum
CREATE TYPE public.lead_temperature AS ENUM ('hot', 'warm', 'long_term');

-- Lead qualification answers
CREATE TABLE public.lead_qualification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  spoken_with_lender boolean,
  credit_confidence integer CHECK (credit_confidence BETWEEN 1 AND 10),
  buying_timeframe text,
  temperature public.lead_temperature,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_qualification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own qual select" ON public.lead_qualification FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own qual insert" ON public.lead_qualification FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own qual update" ON public.lead_qualification FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own qual delete" ON public.lead_qualification FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER lead_qual_set_updated_at BEFORE UPDATE ON public.lead_qualification
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add score + temperature to leads
ALTER TABLE public.leads
  ADD COLUMN score integer NOT NULL DEFAULT 0,
  ADD COLUMN temperature public.lead_temperature;
