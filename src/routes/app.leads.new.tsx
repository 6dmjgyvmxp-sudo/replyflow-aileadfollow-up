import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/app/leads/new")({
  component: NewLead,
});

const SOURCES = ["Website", "Referral", "Social Media", "Cold Call", "Other"] as const;

const schema = z.object({
  firstName: z.string().trim().min(1, "First name required").max(80),
  lastName: z.string().trim().min(1, "Last name required").max(80),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  source: z.enum(SOURCES, { errorMap: () => ({ message: "Select a source" }) }),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function NewLead() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    source: "" as (typeof SOURCES)[number] | "",
    notes: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const { data: lead, error } = await supabase
        .from("leads")
        .insert({
          user_id: userId,
          name: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          source: parsed.data.source,
          notes: parsed.data.notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      toast.success("Lead added!");
      navigate({ to: "/app/leads/$leadId", params: { leadId: lead.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Could not save lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold">Add a lead</h1>
      <p className="text-muted-foreground text-sm mt-1">Capture a new contact for your follow-up pipeline.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Lead details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First name *</Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Jane" required />
              </div>
              <div>
                <Label htmlFor="lastName">Last name *</Label>
                <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Smith" required />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@acme.com" required />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0100" />
              </div>
            </div>
            <div>
              <Label htmlFor="source">Source *</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as (typeof SOURCES)[number] })}>
                <SelectTrigger id="source"><SelectValue placeholder="Select a source" /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="How you met, what they're interested in…" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/leads" })}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}