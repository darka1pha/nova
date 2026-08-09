import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/features/auth/components/login-form";

// Demonstrates the reference "auth" feature wired into a route.
export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <LoginForm />
    </main>
  );
}
