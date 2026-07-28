# Zustand

Use Zustand for local client state that does not belong in the URL, server
cache, or form state.

```tsx
"use client";

import { usePreferencesStore } from "@/stores/preferences-store";

export function DensityToggle() {
  const density = usePreferencesStore((state) => state.density);
  const setDensity = usePreferencesStore((state) => state.setDensity);

  return (
    <button onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}>
      {density}
    </button>
  );
}
```

Keep remote data in the API layer or TanStack Query. Zustand is best for UI
preferences, wizard state, optimistic drafts, and other browser-only state.
