import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    reply_to_email: "",
    phone: "",
    brokerage_name: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        reply_to_email: profile.reply_to_email ?? "",
        phone: profile.phone ?? "",
        brokerage_name: profile.brokerage_name ?? "",
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Not signed in");
      const payload = { user_id: userId, ...form };
      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your branding details are used in every AI-generated email.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent branding</CardTitle>
          <CardDescription>Personalize follow-ups with your name, contact info, and brokerage.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-4">Loading…</p>
          ) : (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
              <div>
                <Label htmlFor="full_name">Your name</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Smith" />
              </div>
              <div>
                <Label htmlFor="reply_to_email">Reply-to email</Label>
                <Input id="reply_to_email" type="email" value={form.reply_to_email} onChange={(e) => setForm({ ...form, reply_to_email: e.target.value })} placeholder="jane@brokerage.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 0100" />
              </div>
              <div>
                <Label htmlFor="brokerage_name">Brokerage name</Label>
                <Input id="brokerage_name" value={form.brokerage_name} onChange={(e) => setForm({ ...form, brokerage_name: e.target.value })} placeholder="Acme Realty" />
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={save.isPending}>
                  <Save className="h-4 w-4 mr-1" /> {save.isPending ? "Saving…" : "Save settings"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
