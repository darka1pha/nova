import { createNavigation } from "next-intl/navigation";

import { routing } from "@/i18n/routing";

// Locale-aware wrappers around next/navigation. Always import Link/useRouter
// from here instead of next/navigation directly.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
