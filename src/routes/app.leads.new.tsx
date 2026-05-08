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
import { Sparkles } from "lucide-react";

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

function NewLead() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", businessContext: "", notes: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
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

      toast.message("Generating personalized follow-up sequence…");
      const { data: ai, error: fnErr } = await supabase.functions.invoke("generate-followups", {
        body: { leadName: lead.name, leadEmail: lead.email, businessContext: parsed.data.businessContext, notes: parsed.data.notes },
      });
      if (fnErr) throw fnErr;
      if (ai?.error) throw new Error(ai.error);

      const now = new Date();
      const rows = (ai.emails as { day_offset: number; subject: string; body: string }[]).map((e) => ({
        lead_id: lead.id,
        user_id: userId,
        day_offset: e.day_offset,
        subject: e.subject,
        body: e.body,
        scheduled_for: new Date(now.getTime() + e.day_offset * 24 * 60 * 60 * 1000).toISOString(),
      }));
      const { error: insErr } = await supabase.from("follow_up_emails").insert(rows);
      if (insErr) throw insErr;

      toast.success("Lead added with AI follow-up sequence!");
      navigate({ to: "/app/leads/$leadId", params: { leadId: lead.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold">Add a lead</h1>
      <p className="text-muted-foreground text-sm mt-1">ReplyFlow will draft a 3-email follow-up sequence automatically.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Lead details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" required /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@acme.com" required /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0100" /></div>
            </div>
            <div><Label>What does your business do?</Label><Input value={form.businessContext} onChange={(e) => setForm({ ...form, businessContext: e.target.value })} placeholder="e.g. Boutique web design studio" /></div>
            <div><Label>Notes about this lead</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="How you met, what they asked about…" rows={3} /></div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={busy}>{busy ? "Generating sequence…" : "Add lead & generate emails"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/leads" })}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}