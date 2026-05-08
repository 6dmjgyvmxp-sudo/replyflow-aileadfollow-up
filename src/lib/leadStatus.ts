export function statusLabel(s: string) {
  return s === "active" ? "Active" : s === "closed_won" ? "Closed Won" : "Closed Lost";
}
export function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "closed_won") return "default";
  if (s === "closed_lost") return "destructive";
  return "secondary";
}