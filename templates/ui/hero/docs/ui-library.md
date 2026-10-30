# HeroUI overlay

This overlay wires a HeroUI (formerly NextUI) provider into the generated app.
The provider is mounted automatically in `src/providers/app-providers.tsx`, and
`tailwind.config.ts` is patched with the `heroui()` plugin and HeroUI's theme
content path.

HeroUI is pinned to the 2.7 line because HeroUI 2.8+ requires Tailwind v4,
while this template ships Tailwind v3.

Files added:

- src/providers/nextui-provider.tsx

Dependencies added when selected: `@heroui/react`, `framer-motion`.
