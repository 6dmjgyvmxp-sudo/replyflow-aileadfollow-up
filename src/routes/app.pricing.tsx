import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/pricing")({
  component: PricingPage,
});

const PLANS = [
  {
    name: "Starter",
    price: 29,
    leads: "50 leads / month",
    features: ["AI follow-up sequences", "Lead qualification", "Compliance exports", "Email support"],
    cta: "Start 14-day free trial",
  },
  {
    name: "Growth",
    price: 79,
    leads: "200 leads / month",
    features: ["Everything in Starter", "Lead scoring & alerts", "CRM CSV export", "Priority support"],
    cta: "Start 14-day free trial",
    highlight: true,
  },
  {
    name: "Pro",
    price: 149,
    leads: "Unlimited leads",
    features: ["Everything in Growth", "Unlimited AI sequences", "Custom branding", "Dedicated success manager"],
    cta: "Start 14-day free trial",
  },
];

function PricingPage() {
  const startCheckout = (plan: string) => {
    // Paddle checkout will be wired once products are created in Paddle.
    // The Paddle SDK exposes window.Paddle.Checkout.open(...).
    alert(`Paddle checkout for ${plan} — sandbox products will be wired up next.`);
  };

  return (
    <div className="max-w-6xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold">Pricing</h1>
        <p className="text-muted-foreground mt-2">14-day free trial on every plan. No credit card required to start.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <Card key={plan.name} className={plan.highlight ? "border-primary shadow-lg" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.highlight && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </span>
                )}
              </div>
              <CardDescription>{plan.leads}</CardDescription>
              <div className="pt-2">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.highlight ? "default" : "outline"} onClick={() => startCheckout(plan.name)}>
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
