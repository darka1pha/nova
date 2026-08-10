# GraphQL Integration

This project includes a production-ready **GraphQL** integration powered by [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) and [GraphQL Codegen](https://the-guild.dev/graphql/codegen).

## Architecture

- **`src/app/api/graphql/route.ts`**: The Next.js App Router route handler serving Yoga with standard Web Fetch request/response handling.
- **`src/lib/graphql/schema.ts`**: Unified schema definition with `typeDefs` and `resolvers`.
- **`src/lib/graphql/client.ts`**: Typed client using `graphql-request`.
- **`src/lib/graphql/queries/`**: GraphQL documents for queries, mutations, and fragments.
- **`codegen.ts`**: GraphQL Code Generator configuration.

## GraphiQL Interactive IDE

Visit [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql) in development to open the built-in **GraphiQL** browser IDE.

## Running Code Generation

To generate TypeScript types from your schema and queries:

```bash
npm run codegen
# or with your package manager:
# pnpm codegen / yarn codegen / bun run codegen
```

This generates `src/lib/graphql/generated.ts` with typed operation signatures and response types.

## Querying from Server Components

```tsx
import { graphqlClient } from "@/lib/graphql/client";

export default async function Page() {
  const data = await graphqlClient.request(/* GraphQL */ `
    query GetUsers {
      users {
        id
        name
        email
      }
    }
  `);

  return (
    <div>
      {data.users.map((u) => (
        <p key={u.id}>{u.name}</p>
      ))}
    </div>
  );
}
```

## Adding Resolvers with Prisma / Drizzle

In `src/lib/graphql/schema.ts`, import your database client:

```ts
import { db } from "@/lib/db/client"; // Drizzle or Prisma

export const schema = createSchema({
  typeDefs: /* GraphQL */ `...`,
  resolvers: {
    Query: {
      users: async () => {
        return db.select().from(users);
      },
    },
  },
});
```
