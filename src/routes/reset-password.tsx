import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

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
                if (password.length < 6) return toast.error("Password must be at least 6 characters.");
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
                <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <Label>Confirm password</Label>
                <Input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button className="w-full" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}