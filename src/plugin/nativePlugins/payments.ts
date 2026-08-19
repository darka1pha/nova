import { FEATURE_CONTRIBUTIONS } from "../../featureContributions.js";
import { PLUGIN_METADATA } from "../../generator/pluginMetadata.js";
import { definePlugin } from "../definePlugin.js";

/**
 * Native manifest for the Payments plugin.
 */
export const paymentsPlugin = definePlugin({
  id: "payments",
  name: PLUGIN_METADATA.payments.name,
  version: "1.0.0",
  description: PLUGIN_METADATA.payments.description,
  category: "payments",
  author: "Nova",
  license: "MIT",
  trustLevel: "official",
  compatibility: {
    nova: ">=0.1.0",
  },
  tags: ["payments", "billing", "subscriptions", "checkout", "webhooks"],
  capabilities: PLUGIN_METADATA.payments.capabilities,
  owns: PLUGIN_METADATA.payments.owns,
  dependencies: FEATURE_CONTRIBUTIONS.payments.dependencies,
  devDependencies: FEATURE_CONTRIBUTIONS.payments.devDependencies,
  scripts: FEATURE_CONTRIBUTIONS.payments.scripts,
  requires: PLUGIN_METADATA.payments.requires,
  conflicts: PLUGIN_METADATA.payments.conflicts,
  supportedUI: PLUGIN_METADATA.payments.supportedUI,
  env: [
    {
      key: "PAYMENTS_PROVIDER",
      example: "mock",
      description: "Payments provider: 'stripe', 'lemonsqueezy', 'paddle', or 'mock'.",
      required: false,
    },
    {
      key: "PAYMENTS_WEBHOOK_SECRET",
      example: "whsec_sample_secret_key",
      description: "Secret key used to verify incoming payment webhook signatures.",
      required: false,
    },
    {
      key: "NEXT_PUBLIC_PAYMENTS_PUBLIC_KEY",
      example: "pk_test_sample_public_key",
      description: "Client-side public key for payment provider checkout.",
      required: false,
    },
  ],
});
