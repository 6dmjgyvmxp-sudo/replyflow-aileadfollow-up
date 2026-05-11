import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            ReplyFlow
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: May 11, 2026</p>
          <div className="space-y-4 text-base leading-relaxed">{children}</div>
        </article>
      </main>
      <footer className="border-t mt-10">
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/refund" className="hover:text-foreground">Refund</Link>
          <span className="ml-auto">© ReplyFlow</span>
        </div>
      </footer>
    </div>
  );
}
