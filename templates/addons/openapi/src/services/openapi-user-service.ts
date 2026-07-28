import { openApiClient } from "@/lib/api/openapi-client";

export const openApiUserService = {
  async list() {
    const { data, error } = await openApiClient.GET("/users");

    if (error) {
      throw new Error("Could not load users");
    }

    return data;
  },
};
