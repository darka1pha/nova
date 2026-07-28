"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { FormError } from "@/components/forms/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/features/auth/actions/login-action";
import type { AuthResult } from "@/features/auth/types";

const initialState: AuthResult = { success: false };

/**
 * Uses the App Router `useActionState` + Server Action pattern rather than
 * a client-only onSubmit handler, so this form works with progressive
 * enhancement (no JS needed for the base submit to function).
 */
export function LoginForm() {
  const t = useTranslations("auth");
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error ? <FormError message={t(state.error as never)} /> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t.raw("submit") : t("submit")}
      </Button>
    </form>
  );
}
