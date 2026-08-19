# Anthropic Claude Provider

Provides Anthropic Claude model integration for the Vercel AI SDK.

## Usage

```typescript
import { anthropic } from "@/lib/ai/anthropic";
import { generateText } from "ai";

const { text } = await generateText({
  model: anthropic("claude-3-5-sonnet-20241022"),
  prompt: "Hello, Claude!",
});
```
