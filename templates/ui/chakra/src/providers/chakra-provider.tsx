"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { ReactNode } from "react";

export function ChakraAppProvider({ children }: { children: ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>;
}
