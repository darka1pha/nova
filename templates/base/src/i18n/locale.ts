import "server-only";

import { cookies } from "next/headers";

import { routing } from "@/i18n/routing";

const LOCALE_COOKIE = "NEXT_LOCALE";

export async function getUserLocale() {
  const cookieStore = await cookies();
  return cookieStore.get(LOCALE_COOKIE)?.value ?? routing.defaultLocale;
}

export async function setUserLocale(locale: string) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale);
}
