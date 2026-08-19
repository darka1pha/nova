export type PaymentProvider = "stripe" | "lemonsqueezy" | "paddle" | "mock";

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  popular?: boolean;
}

export interface CheckoutSessionOptions {
  planId: string;
  billingCycle: "monthly" | "yearly";
  userId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
}

export interface SubscriptionStatus {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
  currentPeriodEnd: number;
}
