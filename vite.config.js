import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cleanUrls, sitePages } from "./scripts/site-pages.mjs";
import { enquiryPlugin } from "./server/enquiry/vite-plugin.js";
import { stockPlugin } from "./server/stock/vite-plugin.js";

function presentationPage() {
  const servePresentation = (request, response, next) => {
    const [pathname, query] = (request.url || "").split("?");
    if (pathname === "/presentation" || pathname === "/presentation/") {
      request.url = `/presentation/index.html${query === undefined ? "" : `?${query}`}`;
    }
    next();
  };
  return {
    name: "presentation-page",
    configureServer(server) {
      server.middlewares.use(servePresentation);
    },
    configurePreviewServer(server) {
      server.middlewares.use(servePresentation);
      server.middlewares.use(cleanUrls(server.config.build.outDir));
    },
  };
}

export default defineConfig({
  plugins: [react(), presentationPage(), stockPlugin(), enquiryPlugin(), sitePages()],
});
