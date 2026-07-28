# MSW

MSW lets you exercise the same fetch calls against deterministic mock
responses in local development, tests, and Storybook.

Initialize the browser worker once:

```bash
npm run mock:api
```

Use the Node server in tests:

```ts
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "@/mocks/node";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Handlers live in `src/mocks/handlers.ts`. Keep them shaped like your real API
so services and Server Actions do not need mock-only branches.
