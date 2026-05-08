import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Mail } from "lucide-react";

export const Route = createFileRoute("/app/leads/new")({
  component: NewLead,
});

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  businessContext: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
});

type DraftEmail = { day_offset: number; subject: string; body: string };

function NewLead() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<DraftEmail[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", businessContext: "", notes: "" });

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      toast.message("Generating personalized follow-up sequence with Groq…");
      const { data: ai, error: fnErr } = await supabase.functions.invoke("generate-followups", {
        body: { leadName: parsed.data.name, leadEmail: parsed.data.email, businessContext: parsed.data.businessContext, notes: parsed.data.notes },
      });
      if (fnErr) throw fnErr;
      if (ai?.error) throw new Error(ai.error);
      const emails = (ai.emails as DraftEmail[]).sort((a, b) => a.day_offset - b.day_offset);
      setDrafts(emails);
      toast.success("Sequence ready — review and edit below.");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const updateDraft = (i: number, field: "subject" | "body", value: string) => {
    setDrafts((d) => d ? d.map((e, idx) => idx === i ? { ...e, [field]: value } : e) : d);
  };

  const saveAll = async () => {
    if (!drafts) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const { data: lead, error } = await supabase.from("leads").insert({
        user_id: userId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
      }).select().single();
      if (error) throw error;

      const now = new Date();
      const rows = drafts.map((e) => ({
        lead_id: lead.id,
        user_id: userId,
        day_offset: e.day_offset,
        subject: e.subject,
        body: e.body,
        scheduled_for: new Date(now.getTime() + e.day_offset * 24 * 60 * 60 * 1000).toISOString(),
      }));
      const { error: insErr } = await supabase.from("follow_up_emails").insert(rows);
      if (insErr) throw insErr;

      toast.success("Lead saved with follow-up sequence!");
      navigate({ to: "/app/leads/$leadId", params: { leadId: lead.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold">Add a lead</h1>
      <p className="text-muted-foreground text-sm mt-1">Groq AI will draft a 3-email follow-up sequence. You can edit before saving.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Lead details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={generate}>
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" required /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@acme.com" required /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0100" /></div>
            </div>
            <div><Label>What does your business do?</Label><Input value={form.businessContext} onChange={(e) => setForm({ ...form, businessContext: e.target.value })} placeholder="e.g. Boutique web design studio" /></div>
            <div><Label>Notes about this lead</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="How you met, what they asked about…" rows={3} /></div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={busy || saving}>
                <Sparkles className="h-4 w-4 mr-1" />
                {busy ? "Generating…" : drafts ? "Regenerate sequence" : "Generate Follow-Up Sequence"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/leads" })}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {drafts && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold">Review your 3-email sequence</h2>
          {drafts.map((email, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-primary" />
                  Day {email.day_offset} — {email.day_offset === 1 ? "Warm intro" : email.day_offset === 3 ? "Provide value" : "Gentle nudge"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Subject</Label>
                  <Input value={email.subject} onChange={(e) => updateDraft(i, "subject", e.target.value)} />
                </div>
                <div>
                  <Label>Body</Label>
                  <Textarea rows={8} value={email.body} onChange={(e) => updateDraft(i, "body", e.target.value)} />
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex gap-2">
            <Button onClick={saveAll} disabled={saving}>{saving ? "Saving…" : "Save lead & sequence"}</Button>
            <Button type="button" variant="outline" onClick={() => setDrafts(null)} disabled={saving}>Discard</Button>
          </div>
        </div>
      )}
    </div>
  );
}