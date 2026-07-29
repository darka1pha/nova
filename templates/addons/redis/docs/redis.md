# Redis addon

Provides a simple ioredis client wrapper at `src/lib/redis`.

Environment:

- REDIS_URL (e.g. redis://localhost:6379)

Usage:

Import `getRedis()` from `src/lib/redis` in server-side code to perform cached
operations, rate limiting, or as a queue backend for background jobs.

Notes:

- Generated code uses ioredis. For production clusters or advanced
  deployments, adjust connection options in `src/lib/redis/config.ts`.
