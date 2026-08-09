// Central registry of Next.js cache tags used with `revalidateTag`.
// Keeping them in one place avoids typos causing silent cache bugs.
export const cacheTags = {
  user: (id: string) => `user:${id}`,
  users: "users",
} as const;
