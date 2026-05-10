import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/compliance")({
  component: CompliancePage,
});

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

function CompliancePage() {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const { data: emails, error } = await supabase
        .from("follow_up_emails")
        .select("id, lead_id, day_offset, subject, body, status, scheduled_for, sent_at, opened_at, replied_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: leads } = await supabase.from("leads").select("id, name, email");
      const leadMap = new Map((leads ?? []).map((l) => [l.id, l]));

      const headers = [
        "email_id", "created_at", "lead_name", "lead_email", "day_offset",
        "subject", "body", "status", "scheduled_for", "sent_at", "opened_at", "replied_at",
      ];
      const rows = (emails ?? []).map((e) => {
        const lead = leadMap.get(e.lead_id);
        return [
          e.id, e.created_at, lead?.name ?? "", lead?.email ?? "", e.day_offset,
          e.subject, e.body, e.status, e.scheduled_for, e.sent_at, e.opened_at, e.replied_at,
        ].map(csvEscape).join(",");
      });
      const csv = [headers.join(","), ...rows].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} AI interactions`);
    } catch (err: any) {
      toast.error(err.message ?? "Export failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Compliance
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Audit-ready exports of every AI-generated message.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FHA compliance is enforced on all AI prompts</CardTitle>
          <CardDescription>
            Generated emails never reference race, religion, national origin, sex, disability, or familial status.
            Every email includes a "Reply STOP to unsubscribe" footer.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export AI interactions</CardTitle>
          <CardDescription>
            Download a complete CSV of every AI-generated email — subject, body, status, and timestamps —
            for review and recordkeeping.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={download} disabled={downloading}>
            <Download className="h-4 w-4 mr-1" /> {downloading ? "Preparing…" : "Download full CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
