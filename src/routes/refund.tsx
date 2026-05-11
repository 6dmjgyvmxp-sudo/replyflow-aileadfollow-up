import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/LegalShell";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — ReplyFlow" },
      { name: "description", content: "ReplyFlow's free trial and refund terms." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <LegalShell title="Refund Policy">
      <p>All plans include a 14-day free trial. No credit card is required to start.</p>
      <p>If you're not satisfied within 7 days of your first paid charge, email us for a full refund — no questions asked.</p>
      <p>You can cancel anytime from your account settings. Cancellations take effect at the end of your current billing period.</p>
      <p>Contact: <a className="text-primary underline" href="mailto:support@replyflowai.app">support@replyflowai.app</a></p>
    </LegalShell>
  );
}
