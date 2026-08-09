import { exampleRouter } from "./routers/example";
import { createCallerFactory, router } from "./server";

/**
 * Primary root router for the application.
 * All sub-routers added to your application should be merged here.
 */
export const appRouter = router({
  example: exampleRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Server-side caller for invoking tRPC procedures directly from Server Components
 * or Server Actions without HTTP overhead.
 */
export const createCaller = createCallerFactory(appRouter);
