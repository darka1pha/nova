import { getRequestConfig } from "next-intl/server";

import { routing } from "@/i18n/routing";

function isSupportedLocale(value: string | undefined): value is (typeof routing.locales)[number] {
  return Boolean(value) && routing.locales.includes(value as (typeof routing.locales)[number]);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isSupportedLocale(requested) ? requested : routing.defaultLocale;

  const [common, auth, dashboard, validation, home, metadata] = await Promise.all([
    import(`@/messages/${locale}/common.json`),
    import(`@/messages/${locale}/auth.json`),
    import(`@/messages/${locale}/dashboard.json`),
    import(`@/messages/${locale}/validation.json`),
    import(`@/messages/${locale}/home.json`),
    import(`@/messages/${locale}/metadata.json`),
  ]);

  return {
    locale,
    messages: {
      common: common.default,
      auth: auth.default,
      dashboard: dashboard.default,
      validation: validation.default,
      home: home.default,
      metadata: metadata.default,
    },
  };
});
