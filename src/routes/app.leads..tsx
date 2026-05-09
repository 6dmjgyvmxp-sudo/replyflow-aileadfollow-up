import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { statusLabel, statusVariant } from "@/lib/leadStatus";

export const Route = createFileRoute("/app/leads/")({
  component: LeadDetail,
});

const STATUS_OPTIONS = [
  { value: "active", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed_won", label: "Won" },
  { value: "closed_lost", label: "Lost" },
] as const;

function LeadDetail() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: emails = [], isLoading: loadingEmails } = useQuery({
    queryKey: ["lead-emails", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_emails")
        .select("*")
        .eq("lead_id", leadId)
        .order("day_offset", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("leads").update({ status: status as any }).eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!lead) throw new Error("No lead");
      const { data, error } = await supabase.functions.invoke("generate-followups", {
        body: {
          leadName: lead.name,
          leadEmail: lead.email,
          notes: lead.notes ?? "",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      // Replace any existing pending emails
      await supabase.from("follow_up_emails").delete().eq("lead_id", leadId).eq("status", "pending");

      const rows = (data.emails as Array<{ day_offset: number; subject: string; body: string }>).map((e) => ({
        user_id: userId,
        lead_id: leadId,
        day_offset: e.day_offset,
        subject: e.subject,
        body: e.body,
      }));
      const { error: insErr } = await supabase.from("follow_up_emails").insert(rows);
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-emails", leadId] });
      toast.success("Follow-up sequence generated");
    },
    onError: (e: any) => toast.error(e.message ?? "Generation failed"),
  });

  const sendSequence = useMutation({
    mutationFn: async () => {
      const pending = emails.filter((e) => e.status === "pending");
      if (pending.length === 0) throw new Error("No pending emails to send");
      for (const e of pending) {
        const { data, error } = await supabase.functions.invoke("send-followup", {
          body: { emailId: e.id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-emails", leadId] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success("Sequence sent");
    },
    onError: (e: any) => toast.error(e.message ?? "Send failed"),
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading…</div>;
  }
  if (error || !lead) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button asChild variant="outline"><Link to="/app/leads"><ArrowLeft className="h-4 w-4 mr-1" /> Back to leads</Link></Button>
      </div>
    );
  }

  const pendingCount = emails.filter((e) => e.status === "pending").length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/app/leads"><ArrowLeft className="h-4 w-4 mr-1" /> Back to leads</Link>
        </Button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{lead.name}</h1>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-3 mt-1">
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
              {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
            </div>
          </div>
          <Badge variant={statusVariant(lead.status)}>{statusLabel(lead.status)}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Lead details</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <Field label="First name" value={lead.first_name ?? "—"} />
          <Field label="Last name" value={lead.last_name ?? "—"} />
          <Field label="Email" value={lead.email} />
          <Field label="Phone" value={lead.phone ?? "—"} />
          <Field label="Source" value={lead.source ?? "—"} />
          <div>
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <Select
              value={lead.status}
              onValueChange={(v) => updateStatus.mutate(v)}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Notes</div>
            <div className="whitespace-pre-wrap text-sm">{lead.notes || "—"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Follow-up sequence</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => generate.mutate()} disabled={generate.isPending} variant="outline">
                {generate.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {emails.length ? "Regenerate sequence" : "Generate Follow-Up Sequence"}
              </Button>
              <Button onClick={() => sendSequence.mutate()} disabled={sendSequence.isPending || pendingCount === 0}>
                {sendSequence.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Send Sequence{pendingCount ? ` (${pendingCount})` : ""}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEmails ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : emails.length === 0 ? (
            <p className="text-muted-foreground text-sm">No emails yet. Click "Generate Follow-Up Sequence" to create a 3-email sequence.</p>
          ) : (
            <div className="space-y-3">
              {emails.map((e) => (
                <div key={e.id} className="border rounded-md p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs text-muted-foreground">Day {e.day_offset}</div>
                    <Badge variant={e.status === "sent" || e.status === "opened" || e.status === "replied" ? "default" : "secondary"}>
                      {e.status}
                    </Badge>
                  </div>
                  <div className="font-medium">{e.subject}</div>
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground mt-2">{e.body}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
