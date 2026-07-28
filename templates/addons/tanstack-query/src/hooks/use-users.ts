"use client";

import { useQuery } from "@tanstack/react-query";

import { browserApi } from "@/lib/api/browser-client";
import { QUERY_KEYS } from "@/lib/constants";
import type { PaginatedResponse } from "@/types/api";

interface User {
  id: string;
  name: string;
  email: string;
}

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: () => browserApi.get<PaginatedResponse<User>>("/users"),
  });
}
