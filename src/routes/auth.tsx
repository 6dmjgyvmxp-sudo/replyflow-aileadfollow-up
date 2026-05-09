import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — ReplyFlow" }] }),
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"tabs" | "forgot">("tabs");
  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5" /> ReplyFlow
        </Link>
        <div>
          <h2 className="text-3xl font-bold">Follow-ups on autopilot.</h2>
          <p className="mt-3 opacity-90 max-w-sm">Bring leads in, ReplyFlow handles the warm, human follow-ups for you.</p>
        </div>
        <p className="text-xs opacity-75">© ReplyFlow</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {mode === "forgot" ? (
            <ForgotPasswordForm onBack={() => setMode("tabs")} />
          ) : (
            <>
              <h1 className="text-2xl font-bold">Welcome</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in or create your account.</p>
              <Tabs defaultValue="signin" className="mt-6">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin"><SignInForm onForgot={() => setMode("forgot")} /></TabsContent>
                <TabsContent value="signup"><SignUpForm /></TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <form
      className="space-y-3 mt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) toast.error(error.message);
        else navigate({ to: "/app" });
      }}
    >
      <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div>
        <div className="flex items-center justify-between">
          <Label>Password</Label>
          <button type="button" onClick={onForgot} className="text-xs text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <div>
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Enter your email and we'll send you a secure reset link.
      </p>
      {sent ? (
        <div className="mt-6 space-y-3">
          <div className="rounded-md border bg-muted/40 p-4 text-sm">
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
            Check your inbox (and spam folder).
          </div>
          <Button variant="outline" className="w-full" onClick={onBack}>Back to sign in</Button>
        </div>
      ) : (
        <form
          className="space-y-3 mt-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: "https://replyflow-aileadfollow-up.lovable.app/reset-password",
            });
            setBusy(false);
            if (error) toast.error(error.message);
            else setSent(true);
          }}
        >
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
          <button type="button" onClick={onBack} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
            Back to sign in
          </button>
        </form>
      )}
    </div>
  );
}

function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <form
      className="space-y-3 mt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        setBusy(false);
        if (error) toast.error(error.message);
        else { toast.success("Account created!"); navigate({ to: "/app" }); }
      }}
    >
      <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
    </form>
  );
}