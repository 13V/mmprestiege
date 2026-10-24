// Development and build support for the stock manager:
//  - `virtual:mm-stock` gives the website its cars: in the dev server, the
//    published cars in the local store (or the samples); in a build, the
//    snapshot written by scripts/stock-snapshot.mjs (or the samples).
//  - In the dev server, /api/stock runs the same handler as the Vercel
//    function, against a folder (STOCK_DEV_DIR, default .stock/dev) and the
//    sample lookups (or the live provider if REGCHECK_USERNAME is set).
//    Publishing reloads the open pages instead of rebuilding.
import { resolve } from "node:path";
import { readSnapshot } from "../../scripts/stock-source.mjs";
import { send, toRequest } from "../node-http.js";
import { handleStockRequest } from "./handler.js";
import { mockProvider, regCheckProvider } from "./lookup.js";
import { publicSnapshot } from "./records.js";
import { fileStore } from "./stores.js";

const VIRTUAL = "virtual:mm-stock";
const RESOLVED = `\0${VIRTUAL}`;
const TYPES = { jpg: "image/jpeg", webp: "image/webp" };


export function stockPlugin() {
  let serving = false;
  let store;
  return {
    name: "mm-stock",
    configResolved(config) {
      serving = config.command === "serve";
      if (serving) store = fileStore(resolve(process.env.STOCK_DEV_DIR || ".stock/dev"));
    },
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : undefined),
    async load(id) {
      if (id !== RESOLVED) return undefined;
      const snapshot = serving ? publicSnapshot((await store.read()).doc) : readSnapshot();
      return `export default ${JSON.stringify(snapshot)};`;
    },
    configureServer(server) {
      const password = process.env.STOCK_ADMIN_PASSWORD || "mm-dev-password";
      // Open website pages reload with the new stock (src/stock.js listens);
      // the stock manager itself stays put.
      const reload = () => {
        const module = server.moduleGraph.getModuleById(RESOLVED);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "custom", event: "mm-stock:changed" });
      };
      const context = {
        mode: "development",
        password,
        secureCookies: false,
        store,
        provider: process.env.REGCHECK_USERNAME
          ? regCheckProvider({ username: process.env.REGCHECK_USERNAME })
          : mockProvider(),
        publishMode: "dev",
        publish: async () => {
          reload();
          return { state: "started", message: "Saved. The website (dev server) has been updated." };
        },
        log: (error) => server.config.logger.error(String(error?.stack || error)),
      };
      server.config.logger.info(`  Stock manager: /stock/manage (password: ${password === "mm-dev-password" ? password : "from STOCK_ADMIN_PASSWORD"})`);
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/stock")) return next();
        const photo = /^\/api\/stock\/dev-photo\/([A-Za-z0-9._-]+)$/.exec(req.url.split("?")[0]);
        if (photo) {
          const file = await store.photoFile(photo[1]);
          if (!file) {
            res.statusCode = 404;
            return res.end();
          }
          res.setHeader("content-type", TYPES[photo[1].split(".").pop()] || "application/octet-stream");
          return res.end(file);
        }
        try {
          await send(res, await handleStockRequest(await toRequest(req), context));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
