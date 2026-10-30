import type { Preview } from "@storybook/react";

import "../src/styles/globals.css";

// Nova regenerates this as preview.tsx during project creation, adding
// UI-library provider decorators and the MSW loader when those are enabled.
const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
