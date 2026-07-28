"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Density = "comfortable" | "compact";

interface PreferencesState {
  density: Density;
  sidebarOpen: boolean;
  setDensity: (density: Density) => void;
  toggleSidebar: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      density: "comfortable",
      sidebarOpen: true,
      setDensity: (density) => set({ density }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: "app-preferences",
      partialize: (state) => ({ density: state.density, sidebarOpen: state.sidebarOpen }),
    },
  ),
);
