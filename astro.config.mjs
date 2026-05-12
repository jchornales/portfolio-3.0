import { defineConfig } from "astro/config";

import icon from "astro-icon";

import react from "@astrojs/react";

export default defineConfig({
  site: "https://justinehornales.dev",
  server: { host: true, port: 4321 },
  integrations: [icon(), react()],
});
