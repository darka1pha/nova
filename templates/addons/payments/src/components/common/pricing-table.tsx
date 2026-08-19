"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PLANS } from "@/lib/payments/client";
import type { PricingPlan } from "@/lib/payments/types";

export function PricingTable() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const plans = DEFAULT_PLANS;

  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Simple, transparent pricing
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose the plan that best fits your product requirements.
        </p>

        <div className="mt-6 inline-flex p-1 bg-muted rounded-lg">
          <button
            type="button"
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              billingCycle === "monthly" ? "bg-background text-foreground shadow" : "text-muted-foreground"
            }`}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              billingCycle === "yearly" ? "bg-background text-foreground shadow" : "text-muted-foreground"
            }`}
            onClick={() => setBillingCycle("yearly")}
          >
            Yearly (Save 20%)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {plans.map((plan: PricingPlan) => {
          const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
          return (
            <div
              key={plan.id}
              className={`flex flex-col justify-between p-8 bg-card border rounded-2xl relative shadow-sm ${
                plan.popular ? "border-primary ring-2 ring-primary/20" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                  Most Popular
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight">${price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    /{billingCycle === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm">
                      <Check className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                  {plan.priceMonthly === 0 ? "Get Started Free" : "Subscribe Now"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
