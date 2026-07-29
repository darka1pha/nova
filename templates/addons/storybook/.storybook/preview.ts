import type { Preview } from "@storybook/react";

import "../src/styles/globals.css";
import { initialize, mswDecorator } from "msw-storybook-addon";

initialize();

export const decorators = [mswDecorator];

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
