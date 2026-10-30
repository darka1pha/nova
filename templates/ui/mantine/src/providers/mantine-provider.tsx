"use client";

import "@mantine/core/styles.css";

import { MantineProvider as BaseMantineProvider } from "@mantine/core";
import type { ReactNode } from "react";

export function MantineProvider({ children }: { children: ReactNode }) {
  return <BaseMantineProvider>{children}</BaseMantineProvider>;
}
