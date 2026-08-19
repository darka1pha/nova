import { createOpenAI } from "@ai-sdk/openai";

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const defaultModel = openai("gpt-4o");
