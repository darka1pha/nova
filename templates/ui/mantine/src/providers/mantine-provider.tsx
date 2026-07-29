import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";

export function MantineProvider({ children }: { children: ReactNode }) {
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS>
      {children}
    </MantineProvider>
  );
}
