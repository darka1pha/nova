export const APP_NAME = "Enterprise Next App";

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
} as const;

export const QUERY_KEYS = {
  users: ["users"] as const,
  user: (id: string) => ["users", id] as const,
};
