"use server";

import type { AuthResult } from "@/features/auth/types";
import { redirect } from "@/i18n/navigation";
import { setTokens } from "@/lib/auth/token-store";
import { loginSchema } from "@/lib/validations/auth";

/**
 * Reference Server Action: validates input with the shared zod schema,
 * calls the backend, and persists tokens as httpOnly cookies. This is the
 * pattern to copy for other mutating forms in the app.
 */
export async function loginAction(_prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: "auth.errors.invalidCredentials" };
  }

  try {
    const response = await fetch(`${process.env.API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });

    if (!response.ok) {
      return { success: false, error: "auth.errors.invalidCredentials" };
    }

    const { accessToken, refreshToken } = await response.json();
    await setTokens({ accessToken, refreshToken });
  } catch {
    return { success: false, error: "auth.errors.invalidCredentials" };
  }

  redirect({ href: "/dashboard", locale: "en" });
  return { success: true };
}
