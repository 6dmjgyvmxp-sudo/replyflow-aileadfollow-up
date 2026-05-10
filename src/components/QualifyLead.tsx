import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { temperatureFromAnswers } from "@/lib/leadScore";

const TIMEFRAMES = [
  { value: "0-30 days", label: "Within 30 days" },
  { value: "31-90 days", label: "1–3 months" },
  { value: "3-6 months", label: "3–6 months" },
  { value: "6+ months", label: "6+ months" },
];

export function QualifyLead({ leadId }: { leadId: string }) {
  const qc = useQueryClient();
  const [lender, setLender] = useState<"yes" | "no" | "">("");
  const [credit, setCredit] = useState<string>("");
  const [timeframe, setTimeframe] = useState<string>("");

  const { data: existing } = useQuery({
    queryKey: ["qualification", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_qualification")
        .select("*")
        .eq("lead_id", leadId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existing) {
      setLender(existing.spoken_with_lender === true ? "yes" : existing.spoken_with_lender === false ? "no" : "");
      setCredit(existing.credit_confidence ? String(existing.credit_confidence) : "");
      setTimeframe(existing.buying_timeframe ?? "");
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Not signed in");
      const temperature = temperatureFromAnswers(timeframe);
      const payload = {
        lead_id: leadId,
        user_id: userId,
        spoken_with_lender: lender === "yes" ? true : lender === "no" ? false : null,
        credit_confidence: credit ? parseInt(credit, 10) : null,
        buying_timeframe: timeframe || null,
        temperature,
      };
      const { error } = await supabase.from("lead_qualification").upsert(payload, { onConflict: "lead_id" });
      if (error) throw error;
      if (temperature) {
        await supabase.from("leads").update({ temperature }).eq("id", leadId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qualification", leadId] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead qualified");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Qualify lead
        </CardTitle>
        <CardDescription>Answer to auto-categorize this lead's temperature.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label className="text-sm">Have you spoken with a lender yet?</Label>
          <RadioGroup className="flex gap-4 mt-2" value={lender} onValueChange={(v) => setLender(v as any)}>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="yes" id="lender-yes" /> Yes</label>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="no" id="lender-no" /> No</label>
          </RadioGroup>
        </div>
        <div>
          <Label htmlFor="credit" className="text-sm">How confident are you in your credit? (1–10)</Label>
          <Input id="credit" type="number" min={1} max={10} value={credit} onChange={(e) => setCredit(e.target.value)} className="mt-2 w-32" />
        </div>
        <div>
          <Label className="text-sm">When are you looking to buy/sell?</Label>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Select a timeframe" /></SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !timeframe}>
          {save.isPending ? "Saving…" : existing ? "Update qualification" : "Qualify lead"}
        </Button>
      </CardContent>
    </Card>
  );
}
