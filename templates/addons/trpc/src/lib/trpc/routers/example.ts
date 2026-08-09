import { z } from "zod";

import { publicProcedure, router } from "../server";

export const exampleRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      const target = input?.name?.trim() || "world";
      return {
        greeting: `Hello ${target} from tRPC!`,
        timestamp: new Date().toISOString(),
      };
    }),

  listItems: publicProcedure.query(() => {
    return [
      { id: "1", title: "Type-safe API calls", done: true },
      { id: "2", title: "React Query integration", done: true },
      { id: "3", title: "Automatic TypeScript inference", done: true },
    ];
  }),

  addItem: publicProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(({ input }) => {
      return {
        id: String(Date.now()),
        title: input.title,
        done: false,
        createdAt: new Date().toISOString(),
      };
    }),
});
