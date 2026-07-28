# OpenAPI

Use OpenAPI when your backend publishes a schema and you want endpoint paths,
params, request bodies, and responses checked by TypeScript.

```bash
npm run api:types
```

The default script reads `openapi/schema.yaml` and writes generated types to
`src/lib/api/schema.d.ts`.

Example usage:

```ts
import { openApiClient } from "@/lib/api/openapi-client";

const { data, error } = await openApiClient.GET("/users");

if (error) {
  throw new Error("Could not load users");
}
```

Replace the example schema with your backend contract, then commit the
generated type file so CI and code review see API shape changes.
