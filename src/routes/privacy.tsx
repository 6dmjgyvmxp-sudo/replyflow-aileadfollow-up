import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/LegalShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ReplyFlow" },
      { name: "description", content: "How ReplyFlow collects, stores, and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>We collect your name, email, and the lead data you enter into ReplyFlow.</p>
      <p>Your data is stored securely in Supabase. We do not sell your data to third parties.</p>
      <p>Emails are sent on your behalf via Resend and always include an opt-out option, in compliance with TCPA.</p>
      <p>You may request deletion of your account and data at any time.</p>
      <p>Contact: <a className="text-primary underline" href="mailto:support@replyflowai.app">support@replyflowai.app</a></p>
    </LegalShell>
  );
}
