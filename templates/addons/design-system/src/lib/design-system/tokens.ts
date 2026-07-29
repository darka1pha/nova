/**
 * Central design token definitions for the application.
 * These tokens define the core visual language and can be referenced
 * across components, tailwind config, and theme providers.
 */

export const designTokens = {
  // Colors
  colors: {
    primary: "#0070F3",
    secondary: "#FF1053",
    success: "#17C950",
    warning: "#FFA500",
    error: "#FF4757",
    info: "#0070F3",
    neutral: {
      50: "#FAFAFA",
      100: "#F5F5F5",
      200: "#EEEEEE",
      300: "#E0E0E0",
      400: "#BDBDBD",
      500: "#9E9E9E",
      600: "#757575",
      700: "#616161",
      800: "#424242",
      900: "#212121",
    },
  },

  // Spacing scale (in pixels)
  spacing: {
    xs: "0.25rem",  // 4px
    sm: "0.5rem",   // 8px
    md: "1rem",     // 16px
    lg: "1.5rem",   // 24px
    xl: "2rem",     // 32px
    "2xl": "3rem",  // 48px
    "3xl": "4rem",  // 64px
  },

  // Border radius
  radius: {
    none: "0",
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "1rem",
    full: "9999px",
  },

  // Typography
  typography: {
    fontFamily: {
      sans: "system-ui, -apple-system, sans-serif",
      mono: '"Fira Code", monospace',
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Shadows
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },

  // Transitions / animations
  transitions: {
    fast: "150ms ease-out",
    base: "200ms ease-out",
    slow: "300ms ease-out",
  },

  // Breakpoints (for responsive design)
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
};

export type DesignTokens = typeof designTokens;
