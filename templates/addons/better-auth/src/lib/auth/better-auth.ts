import { betterAuth } from "better-auth";

/**
 * Replaces the custom token-store/refresh combo (src/lib/auth/token-store.ts,
 * refresh.ts) when Better Auth is enabled. Keep only one of the two systems
 * wired into `lib/api/client.ts` at a time.
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  // Add OAuth providers here, e.g.:
  // socialProviders: {
  //   github: {
  //     clientId: process.env.GITHUB_CLIENT_ID!,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  //   },
  // },
});
