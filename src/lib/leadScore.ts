export type EmailRow = {
  status?: string | null;
  sent_at?: string | null;
  opened_at?: string | null;
  replied_at?: string | null;
};

// Points: opened = +10, clicked = +25 (not tracked yet), replied = +50
export function computeScore(emails: EmailRow[]): number {
  let score = 0;
  for (const e of emails) {
    if (e.opened_at) score += 10;
    if (e.replied_at) score += 50;
  }
  return score;
}

export function temperatureLabel(t: string | null | undefined): string {
  if (t === "hot") return "Hot (0–30 days)";
  if (t === "warm") return "Warm (31–90 days)";
  if (t === "long_term") return "Long-term (6+ months)";
  return "Not qualified";
}

export function temperatureBadgeVariant(t: string | null | undefined): "default" | "secondary" | "destructive" | "outline" {
  if (t === "hot") return "destructive";
  if (t === "warm") return "default";
  if (t === "long_term") return "secondary";
  return "outline";
}

export function temperatureFromAnswers(timeframe: string | null | undefined): "hot" | "warm" | "long_term" | null {
  if (!timeframe) return null;
  const t = timeframe.toLowerCase();
  if (/(now|asap|this month|0-30|0\u201330|<\s*30|within (a )?month|immediately|days)/.test(t)) return "hot";
  if (/(1-3|2-3|31-90|month|next quarter|soon)/.test(t)) return "warm";
  return "long_term";
}
