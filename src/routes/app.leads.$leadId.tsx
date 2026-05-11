import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Mail, Phone, Sparkles, Send, PhoneCall, Flame } from "lucide-react";
import { statusLabel, statusVariant } from "@/lib/leadStatus";
import { computeScore, temperatureLabel, temperatureBadgeVariant } from "@/lib/leadScore";
import { QualifyLead } from "@/components/QualifyLead";
import { toast } from "sonner";

export const Route = createFileRoute("/app/leads/$leadId")({
  component: LeadDetail,
});

const STATUSES = ["active", "contacted", "closed_won", "closed_lost"] as const;

function LeadDetail() {
  const { leadId } = Route.useParams();
  const qc = useQueryClient();

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: emails = [] } = useQuery({
    queryKey: ["follow_up_emails", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_emails")
        .select("*")
        .eq("lead_id", leadId)
        .order("day_offset");
      if (error) throw error;
      return data;
    },
  });

  const score = lead?.score ?? 0;
  const showCallNow = score >= 75;

  const generate = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const fullName = (lead?.first_name || lead?.last_name) 
        ? `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() 
        : (lead?.name || "Lead");

      const { data, error } = await supabase.functions.invoke("generate-followups", {
        body: { leadName: fullName, notes: lead?.notes },
      });

      if (error) throw error;
      
      const items = data?.emails || [];
      if (items.length === 0) throw new Error("AI failed to return emails.");

      const rows = items.map((it: any) => ({
        lead_id: leadId,
        user_id: user.id,
        subject: it.subject,
        body: it.body,
        day_offset: it.day_offset,
        status: "pending"
      }));

      const { error: insErr } = await supabase.from("follow_up_emails").insert(rows);
      if (insErr) throw insErr;
      
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["follow_up_emails", leadId] });
      await qc.refetchQueries({ queryKey: ["follow_up_emails", leadId] });
      toast.success("Follow-up sequence generated and saved!");
    },
    onError: (e) => toast.error(e.message),
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

  const sendSequence = useMutation({
    mutationFn: async () => {
      const pending = emails.filter((e) => e.status === "pending");
      for (const em of pending) {
        const { error } = await supabase.functions.invoke("send-followup", { body: { emailId: em.id } });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow_up_emails", leadId] });
      toast.success("Sequence sent");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to send"),
  });

  if (isLoading) return <p className="text-muted-foreground py-8">Loading…</p>;

  if (!lead) {
    return (
      <div className="max-w-2xl text-center py-16">
        <h1 className="text-2xl font-bold">Lead not found</h1>
        <p className="text-muted-foreground mt-2">This lead may have been deleted.</p>
        <Button asChild className="mt-6"><Link to="/app/leads"><ArrowLeft className="h-4 w-4 mr-1" /> Back to leads</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link to="/app/leads"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{lead.name}</h1>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-3 mt-1">
              <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lead.email}</span>
              {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{lead.phone}</span>}
              {lead.source && <span>· {lead.source}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">Score: {score}</Badge>
            <Badge variant={temperatureBadgeVariant(lead.temperature)}>
              {lead.temperature === "hot" && <Flame className="h-3 w-3 mr-1" />}
              {temperatureLabel(lead.temperature)}
            </Badge>
            <Badge variant={statusVariant(lead.status)}>{statusLabel(lead.status)}</Badge>
            <Select value={lead.status} onValueChange={(v) => updateStatus.mutate(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {showCallNow && (
        <Alert className="border-destructive bg-destructive/5">
          <PhoneCall className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Call now</AlertTitle>
          <AlertDescription>
            This lead has crossed 75 points — they're highly engaged. Pick up the phone before the moment passes.
          </AlertDescription>
        </Alert>
      )}

      {lead.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{lead.notes}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Follow-up emails</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
                <Sparkles className="h-4 w-4 mr-1" /> {generate.isPending ? "Generating…" : "Generate sequence"}
              </Button>
              <Button size="sm" onClick={() => sendSequence.mutate()} disabled={sendSequence.isPending || emails.length === 0}>
                <Send className="h-4 w-4 mr-1" /> {sendSequence.isPending ? "Sending…" : "Send sequence"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No emails yet. Generate a sequence to get started.</p>
          ) : (
            <div className="divide-y">
              {emails.map((em) => (
                <div key={em.id} className="py-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-medium text-sm">Day {em.day_offset}: {em.subject}</div>
                    <Badge variant={em.status === "sent" ? "default" : "secondary"}>{em.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{em.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {emails.length > 0 && <QualifyLead leadId={leadId} />}
    </div>
  );
}
