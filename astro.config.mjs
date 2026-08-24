import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";

export default defineConfig({
  site: "https://itwhite.ru",
  output: "server",
  security: {
    checkOrigin: true,
    allowedDomains: [
      {
        protocol: "https",
        hostname: "itwhite.ru"
      },
      {
        protocol: "https",
        hostname: "www.itwhite.ru"
      }
    ]
  },
  adapter: node({
    mode: "standalone"
  }),
  build: {
    inlineStylesheets: "always"
  },
  integrations: [react()]
});
