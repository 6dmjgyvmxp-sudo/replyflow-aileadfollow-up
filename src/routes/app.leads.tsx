import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone } from "lucide-react";
import { statusLabel, statusVariant } from "@/lib/leadStatus";

export const Route = createFileRoute("/app/leads")({
  component: LeadsList,
});

function LeadsList() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground text-sm">All your leads and follow-up status.</p>
        </div>
     <Button onClick={() => window.location.href = '/app/leads/new'}>
  Add your first lead
</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{leads.length} {leads.length === 1 ? "lead" : "leads"}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading…</p>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
             <p>No leads yet.</p>
<Button className="mt-4" onClick={() => window.location.href = '/app/leads/new'}>
  Add your first lead
</Button>
            </div>
          ) : (
            <div className="divide-y">
              {leads.map((lead) => (
                <Link key={lead.id} to="/app/leads/$leadId" params={{ leadId: lead.id }}
                  className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 md:items-center py-4 hover:bg-accent/40 -mx-2 px-2 rounded-md">
                  <div>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                      {lead.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                  <Badge variant={statusVariant(lead.status)}>{statusLabel(lead.status)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
