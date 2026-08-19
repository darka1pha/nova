import { createAnthropic } from "@ai-sdk/anthropic";

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const defaultClaudeModel = anthropic("claude-3-5-sonnet-20241022");
