import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("common");

  return (
    <footer className="border-t py-6">
      <div className="container text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("appName")}
      </div>
    </footer>
  );
}
