
CREATE TYPE public.lead_status AS ENUM ('active', 'closed_won', 'closed_lost');
CREATE TYPE public.email_status AS ENUM ('pending', 'sent', 'opened', 'replied');

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  status public.lead_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.follow_up_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_offset INT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status public.email_status NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_user ON public.leads(user_id);
CREATE INDEX idx_emails_lead ON public.follow_up_emails(lead_id);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own leads select" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own leads insert" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own leads update" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own leads delete" ON public.leads FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own emails select" ON public.follow_up_emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own emails insert" ON public.follow_up_emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own emails update" ON public.follow_up_emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own emails delete" ON public.follow_up_emails FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER leads_updated BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
