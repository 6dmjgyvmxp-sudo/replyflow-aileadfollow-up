export function statusLabel(s: string) {
  if (s === "active") return "Active";
  if (s === "contacted") return "Contacted";
  if (s === "closed_won") return "Closed Won";
  return "Closed Lost";
}
export function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "closed_won") return "default";
  if (s === "closed_lost") return "destructive";
  if (s === "contacted") return "outline";
  return "secondary";
}