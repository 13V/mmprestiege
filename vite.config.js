import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
    },
  };
}

export default defineConfig({ plugins: [react(), presentationPage()] });
