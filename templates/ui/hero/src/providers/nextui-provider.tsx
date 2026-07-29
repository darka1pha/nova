import { NextUIProvider } from "@nextui-org/react";
import type { ReactNode } from "react";

export function HeroProvider({ children }: { children: ReactNode }) {
  return <NextUIProvider>{children}</NextUIProvider>;
}
