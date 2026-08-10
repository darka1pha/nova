import type { TemplateDefinition } from "./types.js";

export const OFFICIAL_TEMPLATES: TemplateDefinition[] = [
  {
    id: "default",
    name: "Default Next.js",
    description: "Production-ready Next.js App Router with TypeScript, Tailwind CSS, and essential tooling",
    defaultUiLibrary: "shadcn",
    structure: "nextjs",
    plugins: [],
  },
  {
    id: "saas",
    name: "SaaS Application",
    description: "Subscription SaaS with database, authentication, transactional emails, monitoring, and security",
    presetId: "saas",
    defaultUiLibrary: "shadcn",
    structure: "nextjs",
  },
  {
    id: "ai",
    name: "AI / LLM Application",
    description: "Next.js AI template with Vercel AI SDK, OpenAI model streaming, and interactive chat interface",
    presetId: "ai",
    defaultUiLibrary: "shadcn",
    structure: "nextjs",
  },
  {
    id: "dashboard",
    name: "Analytics Dashboard",
    description: "Data visualization dashboard with interactive TanStack tables and responsive Recharts",
    presetId: "dashboard",
    defaultUiLibrary: "shadcn",
    structure: "nextjs",
  },
  {
    id: "api",
    name: "API Service",
    description: "Headless Next.js API microservice with tRPC, OpenAPI contract validation, Docker, and health checks",
    presetId: "api",
    defaultUiLibrary: "headless",
    structure: "nextjs",
  },
];
