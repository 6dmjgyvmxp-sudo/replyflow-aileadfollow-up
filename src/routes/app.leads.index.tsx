import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone, Download, Flame } from "lucide-react";
import { statusLabel, statusVariant } from "@/lib/leadStatus";
import { computeScore, temperatureLabel, temperatureBadgeVariant } from "@/lib/leadScore";
import { toast } from "sonner";

export const Route = createFileRoute("/app/leads/")({
  component: LeadsList,
});

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

function LeadsList() {
  const [exporting, setExporting] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allEmails = [] } = useQuery({
    queryKey: ["all_emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_emails")
        .select("lead_id, status, sent_at, opened_at, replied_at, subject");
      if (error) throw error;
      return data;
    },
  });

  // Score by lead
  const scoreByLead = new Map<string, number>();
  for (const lead of leads) {
    const leadEmails = allEmails.filter((e) => e.lead_id === lead.id);
    scoreByLead.set(lead.id, computeScore(leadEmails));
  }

  const exportCSV = async () => {
    setExporting(true);
    try {
      const headers = [
        "Email", "First Name", "Last Name", "Phone", "Lead Source", "Lifecycle Stage",
        "HS Lead Status", "Lead Temperature", "Lead Score", "Notes",
        "Emails Sent", "Emails Opened", "Emails Replied", "Created At",
      ];
      const rows = leads.map((l) => {
        const lEmails = allEmails.filter((e) => e.lead_id === l.id);
        const sent = lEmails.filter((e) => e.sent_at).length;
        const opened = lEmails.filter((e) => e.opened_at).length;
        const replied = lEmails.filter((e) => e.replied_at).length;
        const score = scoreByLead.get(l.id) ?? 0;
        return [
          l.email, l.first_name ?? "", l.last_name ?? "", l.phone ?? "",
          l.source ?? "", "lead", l.status, l.temperature ?? "", score,
          l.notes ?? "", sent, opened, replied, l.created_at,
        ].map(csvEscape).join(",");
      });
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-hubspot-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} leads`);
    } catch (err: any) {
      toast.error(err.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground text-sm">All your leads, scores, and follow-up status.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={exporting || leads.length === 0}>
            <Download className="h-4 w-4 mr-1" /> {exporting ? "Exporting…" : "Export CSV"}
          </Button>
          <Button asChild><Link to="/app/leads/new"><Plus className="h-4 w-4 mr-1" /> Add lead</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{leads.length} {leads.length === 1 ? "lead" : "leads"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading…</p>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No leads yet.</p>
              <Button asChild className="mt-4"><Link to="/app/leads/new">Add your first lead</Link></Button>
            </div>
          ) : (
            <div className="divide-y">
              {leads.map((lead) => {
                const score = scoreByLead.get(lead.id) ?? 0;
                const hot = score >= 75;
                return (
                  <Link key={lead.id} to="/app/leads/$leadId" params={{ leadId: lead.id }}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 md:items-center py-4 hover:bg-accent/40 -mx-2 px-2 rounded-md">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {lead.name}
                        {hot && <span className="inline-flex items-center gap-1 text-xs text-destructive font-semibold"><Flame className="h-3 w-3" /> Call now</span>}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-0.5">
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                        {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono justify-self-start">{score} pts</Badge>
                    <Badge variant={temperatureBadgeVariant(lead.temperature)}>{temperatureLabel(lead.temperature)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                    <Badge variant={statusVariant(lead.status)}>{statusLabel(lead.status)}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
