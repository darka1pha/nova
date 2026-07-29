# Health & readiness checks

Adds a `/api/ready` endpoint that reports liveness and readiness for
optional services like Redis and the database. The endpoint is intentionally
conservative: it will attempt a ping for Redis (if `REDIS_URL` is set) and
report `unknown` for databases when no Prisma client is present.

Usage:

- GET /api/ready — returns JSON object with checks for `redis`, `database`.

Security:

Do not expose sensitive configuration in health responses. The generated
endpoint avoids leaking connection strings.
