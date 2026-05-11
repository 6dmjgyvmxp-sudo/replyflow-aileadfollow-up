import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/LegalShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ReplyFlow" },
      { name: "description", content: "The terms that govern your use of ReplyFlow." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>Use ReplyFlow for lawful purposes only. You must comply with the Fair Housing Act (FHA) and TCPA at all times.</p>
      <p>Plans start at $29/month and include a 14-day free trial. You can cancel anytime.</p>
      <p>Billing is handled securely by Paddle.</p>
      <p>We reserve the right to suspend accounts that violate these terms.</p>
      <p>Contact: <a className="text-primary underline" href="mailto:support@replyflowai.app">support@replyflowai.app</a></p>
    </LegalShell>
  );
}
