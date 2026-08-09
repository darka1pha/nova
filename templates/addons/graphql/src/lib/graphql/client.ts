import { GraphQLClient } from "graphql-request";

export function getGraphQLEndpoint(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "/api/graphql";
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/graphql`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/graphql`;
  }
  return `http://localhost:${process.env.PORT || 3000}/api/graphql`;
}

export function createGraphQLClient(token?: string) {
  return new GraphQLClient(getGraphQLEndpoint(), {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
}

export const graphqlClient = createGraphQLClient();
