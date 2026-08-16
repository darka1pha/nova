import { ArrowRight, BookOpen, Cpu, Globe2, Layers, ShieldCheck, Sparkles, Terminal } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default async function HomePage() {
  const t = await getTranslations("home");

  const featureCards = [
    {
      key: "proxy",
      icon: Layers,
      title: t("features.proxy.title"),
      description: t("features.proxy.description"),
      tag: "Next.js 16",
    },
    {
      key: "i18n",
      icon: Globe2,
      title: t("features.i18n.title"),
      description: t("features.i18n.description"),
      tag: "i18n & RTL",
    },
    {
      key: "styling",
      icon: ShieldCheck,
      title: t("features.styling.title"),
      description: t("features.styling.description"),
      tag: "Radix UI",
    },
    {
      key: "plugins",
      icon: Cpu,
      title: t("features.plugins.title"),
      description: t("features.plugins.description"),
      tag: "Extensible",
    },
  ];

  const stackPills = [
    { name: t("stack.nextjs"), badge: "v16" },
    { name: t("stack.react"), badge: "v19" },
    { name: t("stack.tailwind"), badge: "v3.4" },
    { name: t("stack.typescript"), badge: "v5" },
    { name: t("stack.turbopack"), badge: "Fast" },
    { name: t("stack.i18n"), badge: "Universal" },
  ];

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-background">
      {/* Subtle background ambient gradients */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[36rem] w-[36rem] rounded-full bg-primary/5 blur-3xl" />
        <div className="h-[28rem] w-[28rem] -translate-y-16 rounded-full bg-accent/10 blur-2xl" />
      </div>

      <div className="container relative mx-auto flex flex-col items-center px-4 py-16 sm:py-24">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-card">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{t("badge")}</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="mt-8 max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-tight">
            {t("title")}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t("description")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild className="gap-2 shadow-md">
            <Link href="/dashboard">
              {t("cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button variant="outline" size="lg" asChild className="gap-2">
            <a
              href="https://github.com/darka1pha/nova"
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen className="h-4 w-4" />
              {t("docs")}
            </a>
          </Button>
        </div>

        {/* Quick Start Terminal Snippet */}
        <div className="mt-10 flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-2 font-mono text-xs text-foreground shadow-sm backdrop-blur-sm sm:text-sm">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span>{t("cliPill")}</span>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.key}
                className="group relative border-border/80 bg-card/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50 text-foreground transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {card.tag}
                  </span>
                </CardHeader>
                <CardContent className="pt-3">
                  <CardTitle className="text-base font-semibold text-foreground">
                    {card.title}
                  </CardTitle>
                  <p className="mt-2 text-sm leading-normal text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tech Stack Pills Section */}
        <div className="mt-20 w-full max-w-4xl text-center">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("stack.title")}
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {stackPills.map((pill) => (
              <div
                key={pill.name}
                className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs backdrop-blur-sm"
              >
                <span>{pill.name}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {pill.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
