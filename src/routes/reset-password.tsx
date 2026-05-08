import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Rule = { label: string; test: (p: string) => boolean };
const RULES: Rule[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { label: "One number (0–9)", test: (p) => /\d/.test(p) },
  { label: "One symbol (e.g. !@#$%)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function strengthScore(p: string) {
  return RULES.reduce((n, r) => n + (r.test(p) ? 1 : 0), 0);
}

function strengthMeta(score: number) {
  if (score <= 1) return { label: "Very weak", color: "bg-destructive", text: "text-destructive" };
  if (score === 2) return { label: "Weak", color: "bg-orange-500", text: "text-orange-600" };
  if (score === 3) return { label: "Fair", color: "bg-yellow-500", text: "text-yellow-600" };
  if (score === 4) return { label: "Strong", color: "bg-green-500", text: "text-green-600" };
  return { label: "Excellent", color: "bg-emerald-600", text: "text-emerald-700" };
}

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password — ReplyFlow" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash; the client picks it up
    // automatically and emits a PASSWORD_RECOVERY event.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setValid(true);
      }
      setReady(true);
    });
    // In case the event already fired before we subscribed.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValid(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5" /> ReplyFlow
        </Link>
        <div>
          <h2 className="text-3xl font-bold">Set a new password</h2>
          <p className="mt-3 opacity-90 max-w-sm">Pick something strong — you'll use it next time you sign in.</p>
        </div>
        <p className="text-xs opacity-75">© ReplyFlow</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter and confirm your new password below.
          </p>

          {!ready ? (
            <p className="mt-6 text-sm text-muted-foreground">Verifying link…</p>
          ) : !valid ? (
            <div className="mt-6 space-y-3">
              <div className="rounded-md border bg-muted/40 p-4 text-sm">
                This reset link is invalid or has expired. Request a new one from the sign-in page.
              </div>
              <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>Back to sign in</Button>
            </div>
          ) : (
            <form
              className="space-y-3 mt-6"
              onSubmit={async (e) => {
                e.preventDefault();
                const score = strengthScore(password);
                if (score < 4) return toast.error("Please meet at least 4 of the password requirements.");
                if (password !== confirm) return toast.error("Passwords don't match.");
                setBusy(true);
                const { error } = await supabase.auth.updateUser({ password });
                setBusy(false);
                if (error) return toast.error(error.message);
                toast.success("Password updated.");
                navigate({ to: "/app" });
              }}
            >
              <div>
                <Label>New password</Label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="password-requirements"
                />
                <PasswordStrength password={password} />
              </div>
              <div>
                <Label>Confirm password</Label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={confirm.length > 0 && confirm !== password}
                />
                {confirm.length > 0 && confirm !== password && (
                  <p className="mt-1 text-xs text-destructive">Passwords don't match.</p>
                )}
                {confirm.length > 0 && confirm === password && password.length > 0 && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Passwords match
                  </p>
                )}
              </div>
              <Button
                className="w-full"
                disabled={busy || strengthScore(password) < 4 || password !== confirm}
              >
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score = strengthScore(password);
  const meta = strengthMeta(score);
  const pct = (score / RULES.length) * 100;
  return (
    <div id="password-requirements" className="mt-2 space-y-2">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", password ? meta.color : "bg-transparent")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={cn("font-medium", password ? meta.text : "text-muted-foreground")}>
          {password ? meta.label : "—"}
        </span>
      </div>
      <ul className="space-y-1 text-xs">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.label} className="flex items-center gap-2">
              {ok ? (
                <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={ok ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}