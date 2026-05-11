import { defineConfig } from "astro/config";

import icon from "astro-icon";

import react from "@astrojs/react";

export default defineConfig({
  site: "https://jchornales.github.io",
  base: "/portfolio-3.0",
  server: { host: true, port: 4321 },
  integrations: [icon(), react()],
});
