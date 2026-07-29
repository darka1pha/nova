import { ConfigProvider } from "antd";
import type { ReactNode } from "react";

export function AntProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>;
}
