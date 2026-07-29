import Redis from "ioredis";
import { redisConfig } from "./config";

let client: Redis | null = null;

export function getRedis() {
  if (!client) {
    client = new Redis(redisConfig.url, redisConfig.options);

    client.on("error", (err) => {
      // Basic logging — generated projects should wire this into their
      // structured logger if available.
      // Avoid throwing during init — just log and let callers handle errors.
      // eslint-disable-next-line no-console
      console.error("Redis error:", err);
    });
  }
  return client;
}

export async function shutdownRedis() {
  if (client) {
    try {
      await client.quit();
    } catch (e) {
      await client.disconnect();
    }
    client = null;
  }
}
