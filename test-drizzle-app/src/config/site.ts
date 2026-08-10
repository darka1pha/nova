export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Enterprise Next App",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
