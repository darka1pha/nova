import createClient from "openapi-fetch";

import type { paths } from "@/lib/api/schema";

export const openApiClient = createClient<paths>({
  baseUrl: process.env.API_BASE_URL,
});
