# AI & LLM Integration with Vercel AI SDK

Nova comes with first-class AI and LLM support powered by the [Vercel AI SDK](https://sdk.vercel.ai/docs).

## Architecture

- **API Route**: `src/app/api/chat/route.ts` provides a high-performance Edge/Node streaming endpoint.
- **Client Component**: `src/components/ai/chat.tsx` implements real-time reactive streaming using `useChat`.
- **Supported Providers**:
  - `openai`: OpenAI models (`gpt-4o`, `gpt-4o-mini`, etc.)
  - `anthropic`: Anthropic Claude models (`claude-3-5-sonnet`, etc.)
  - `ollama`: Local offline LLMs

## Environment Configuration

Configure your model API key in `.env`:

```env
OPENAI_API_KEY=sk-proj-...
# or
ANTHROPIC_API_KEY=sk-ant-...
# or
OLLAMA_BASE_URL=http://localhost:11434/api
```

## Adding Providers

To add or switch providers:

```bash
nova add openai
# or
nova add anthropic
# or
nova add ollama
```
