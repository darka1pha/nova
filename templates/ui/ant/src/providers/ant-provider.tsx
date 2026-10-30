"use client";

// antd v5 officially supports React 19 only through this compatibility patch.
import "@ant-design/v5-patch-for-react-19";

import { ConfigProvider } from "antd";
import type { ReactNode } from "react";

export function AntProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>;
}
