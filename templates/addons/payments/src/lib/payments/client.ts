import type { CheckoutSessionOptions, CheckoutSessionResult, PaymentProvider, PricingPlan, SubscriptionStatus } from "./types";

export const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Starter",
    description: "Essential features for individuals and side projects.",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "USD",
    features: ["Up to 3 projects", "Community support", "Core integrations", "1GB storage"],
  },
  {
    id: "pro",
    name: "Professional",
    description: "Advanced capabilities for teams and growing products.",
    priceMonthly: 29,
    priceYearly: 290,
    currency: "USD",
    popular: true,
    features: ["Unlimited projects", "Priority support", "Full API access", "50GB storage", "Custom domain"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Dedicated security, SLA, and custom infrastructure.",
    priceMonthly: 99,
    priceYearly: 990,
    currency: "USD",
    features: ["Dedicated instance", "24/7 SLA", "SSO / SAML", "Unlimited storage", "Audit logs"],
  },
];

export class PaymentsClient {
  private provider: PaymentProvider;

  constructor() {
    this.provider = (process.env.PAYMENTS_PROVIDER as PaymentProvider) || "mock";
  }

  getPlans(): PricingPlan[] {
    return DEFAULT_PLANS;
  }

  async createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSessionResult> {
    // Provider abstraction stub: replace with real Stripe / LemonSqueezy SDK calls when keys provided
    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const checkoutUrl = options.successUrl.includes("?") 
      ? `${options.successUrl}&session_id=${sessionId}`
      : `${options.successUrl}?session_id=${sessionId}`;

    return {
      sessionId,
      checkoutUrl,
    };
  }

  async getSubscription(userId: string): Promise<SubscriptionStatus | null> {
    return {
      id: `sub_${userId}`,
      userId,
      planId: "pro",
      status: "active",
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
  }
}

export const payments = new PaymentsClient();
