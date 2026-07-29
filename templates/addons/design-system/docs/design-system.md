/**
 * Component Categories
 *
 * Organize your components by functional category.
 *
 * src/components/
 * ├── ui/                      # Primitive components
 * │   ├── button.tsx
 * │   ├── card.tsx
 * │   ├── input.tsx
 * │   └── label.tsx
 * │
 * ├── layout/                  # Layout components
 * │   ├── header.tsx
 * │   ├── footer.tsx
 * │   ├── sidebar.tsx
 * │   └── main.tsx
 * │
 * ├── navigation/              # Navigation components
 * │   ├── nav-menu.tsx
 * │   ├── breadcrumbs.tsx
 * │   └── tabs.tsx
 * │
 * ├── feedback/                # User feedback components
 * │   ├── alert.tsx
 * │   ├── toast.tsx
 * │   ├── spinner.tsx
 * │   └── progress.tsx
 * │
 * ├── data-display/            # Data display components
 * │   ├── table.tsx
 * │   ├── list.tsx
 * │   ├── grid.tsx
 * │   └── card-grid.tsx
 * │
 * ├── forms/                   # Form-related components
 * │   ├── form.tsx
 * │   ├── text-field.tsx
 * │   ├── select.tsx
 * │   └── checkbox.tsx
 * │
 * └── design-system/           # Design system helpers
 *     ├── tokens.ts
 *     └── index.ts
 */

// Design System Documentation

## Overview

The design system is a centralized collection of design tokens and component definitions
that ensure consistency across the application.

## Design Tokens

All design decisions (colors, spacing, typography, shadows) are defined in `src/lib/design-system/tokens.ts`:

- **Colors**: Primary, secondary, success, warning, error, and a neutral palette
- **Spacing**: xs, sm, md, lg, xl, 2xl, 3xl scales
- **Border Radius**: Visual consistency for rounded corners
- **Typography**: Font families, sizes, weights, line heights
- **Shadows**: Subtle to prominent elevation levels
- **Transitions**: Animation durations for smooth interactions
- **Breakpoints**: Responsive design breakpoints

## Usage

### In Components

```tsx
import { designTokens } from "@/lib/design-system";

export function MyButton() {
  return (
    <button style={{ color: designTokens.colors.primary }}>
      Click me
    </button>
  );
}
```

### In Tailwind Config

The tailwind.config.ts automatically extends Tailwind with these tokens via CSS variables.

### In CSS/Styled Components

```css
.my-element {
  color: var(--color-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
}
```

## Component Organization

Organize components by functional category (ui, layout, navigation, feedback, data-display, forms)
to make them easy to discover and maintain.

## Best Practices

1. Use design tokens instead of hardcoded values
2. Maintain responsive design using breakpoints
3. Follow the component organization structure
4. Document component props and usage
5. Use TypeScript for component safety
