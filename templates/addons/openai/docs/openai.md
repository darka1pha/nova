# OpenAI Model Provider

Provides OpenAI model integration for the Vercel AI SDK.

## Usage

```typescript
import { openai } from "@/lib/ai/openai";
import { generateText } from "ai";

const { text } = await generateText({
  model: openai("gpt-4o"),
  prompt: "Hello, world!",
});
```
