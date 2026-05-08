import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail, BarChart3, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-10 bg-background/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            ReplyFlow
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 md:py-28 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> AI follow-ups that sound human
        </div>
        <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
          Never let a lead{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
            go cold
          </span>{" "}
          again.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          ReplyFlow writes warm, personal follow-up sequences for every new lead so small businesses can focus on closing — not chasing.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="shadow-[var(--shadow-elegant)]">
            <Link to="/auth">Start free <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline"><a href="#features">See how it works</a></Button>
        </div>
      </section>

      <section id="features" className="container mx-auto px-4 py-16 grid gap-6 md:grid-cols-3">
        {[
          { icon: Sparkles, title: "AI-written sequences", desc: "Day 1, Day 3, and Day 7 emails crafted to sound like you wrote them." },
          { icon: Mail, title: "Track every reply", desc: "See who opened, who replied, and what stage every lead is in." },
          { icon: BarChart3, title: "Win/loss insights", desc: "Mark leads Closed Won or Lost and watch your pipeline shape up." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="rounded-3xl border bg-card p-10 md:p-14 text-center shadow-[var(--shadow-elegant)]" style={{ backgroundImage: "var(--gradient-primary)" }}>
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">Set up in under a minute.</h2>
          <p className="mt-3 text-primary-foreground/90">Add your first lead and watch ReplyFlow draft the entire follow-up sequence.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/auth">Create your account <Check className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© ReplyFlow</footer>
    </div>
  );
}
