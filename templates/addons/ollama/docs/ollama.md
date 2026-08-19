# Ollama Local Model Provider

Provides local, private LLM execution with Ollama and Vercel AI SDK.

## Usage

```typescript
import { ollama } from "@/lib/ai/ollama";
import { generateText } from "ai";

const { text } = await generateText({
  model: ollama("llama3.2"),
  prompt: "Hello, local LLM!",
});
```
