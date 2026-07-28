# Deployment

## Vercel (recommended default)
Push to a connected git repository; Vercel auto-detects Next.js. Set the
environment variables from `.env.example` in the Vercel project settings.

## Docker (if selected during generation)
```bash
docker build -t app .
docker run -p 3000:3000 --env-file .env app
```
The generated `Dockerfile` uses a multi-stage build (deps → build → runtime)
and Next.js `output: "standalone"` for a minimal production image.

## Environment variables
Every variable in `.env.example` must be set in production. Missing
required variables will fail fast at boot if you're using
`src/config/env.ts` validation — extend that schema as you add variables.
