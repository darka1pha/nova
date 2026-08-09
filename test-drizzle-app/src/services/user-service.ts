import { api } from "@/lib/api/client";
import type { PaginatedResponse } from "@/types/api";

export interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * Services own the "what" (business-shaped calls); lib/api owns the "how"
 * (transport, retries, auth). Feature code should call services, not `api`
 * directly, so the transport layer can change without touching features.
 */
export const userService = {
  list: (params: { page?: number; pageSize?: number } = {}) =>
    api.get<PaginatedResponse<User>>("/users", { params, next: { tags: ["users"] } }),
  get: (id: string) => api.get<User>(`/users/${id}`, { next: { tags: [`user:${id}`] } }),
};
