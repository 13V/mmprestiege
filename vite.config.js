import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cleanUrls, sitePages } from "./scripts/site-pages.mjs";
import { stockPlugin } from "./server/stock/vite-plugin.js";

// `vite preview` serves the built pages with clean URLs, the way Vercel does.
function previewCleanUrls() {
  return {
    name: "preview-clean-urls",
    configurePreviewServer(server) {
      server.middlewares.use(cleanUrls(server.config.build.outDir));
    },
  };
}

export default defineConfig({
  plugins: [react(), previewCleanUrls(), stockPlugin(), sitePages()],
});
