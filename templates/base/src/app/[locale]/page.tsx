import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <Button>{t("cta")}</Button>
    </main>
  );
}
