import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, XCircle, Mail, Plus, ArrowRight } from "lucide-react";
import { statusLabel, statusVariant } from "@/lib/leadStatus";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: emails = [] } = useQuery({
    queryKey: ["emails-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("follow_up_emails").select("status, opened_at, replied_at");
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: leads.length,
    active: leads.filter((l) => l.status === "active").length,
    won: leads.filter((l) => l.status === "closed_won").length,
    lost: leads.filter((l) => l.status === "closed_lost").length,
    opened: emails.filter((e) => e.opened_at).length,
    replied: emails.filter((e) => e.replied_at).length,
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Your follow-up pipeline at a glance.</p>
        </div>
        <Button asChild><Link to="/app/leads/new"><Plus className="h-4 w-4 mr-1" /> Add lead</Link></Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Stat icon={Users} label="Total leads" value={stats.total} tone="default" />
        <Stat icon={Mail} label="Active" value={stats.active} tone="primary" />
        <Stat icon={CheckCircle2} label="Closed won" value={stats.won} tone="success" />
        <Stat icon={XCircle} label="Closed lost" value={stats.lost} tone="destructive" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent leads</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to="/app/leads">View all <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto opacity-40" />
              <p className="mt-3">No leads yet. Add your first one to see ReplyFlow in action.</p>
              <Button asChild className="mt-4"><Link to="/app/leads/new">Add a lead</Link></Button>
            </div>
          ) : (
            <div className="divide-y">
              {leads.slice(0, 6).map((lead) => (
                <Link key={lead.id} to="/app/leads/$leadId" params={{ leadId: lead.id }}
                  className="flex items-center justify-between py-3 hover:bg-accent/40 -mx-2 px-2 rounded-md">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{lead.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
                  </div>
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

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "default" | "primary" | "success" | "destructive" }) {
  const toneClass = {
    default: "bg-accent text-accent-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-[oklch(0.65_0.16_155/0.15)] text-[oklch(0.45_0.16_155)]",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass}`}><Icon className="h-4 w-4" /></div>
        <div className="mt-3 text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}