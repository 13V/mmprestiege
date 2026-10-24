// In the dev server, /api/enquiry runs the same handler as the Vercel
// function. Enquiries are emailed only when ENQUIRY_EMAIL_APP_PASSWORD is
// set. With ENQUIRY_DEV_OUTBOX (a folder), each one is saved there as an
// .eml file instead; otherwise the form offers the visitor's own email and
// messaging apps, as the live site does before email is set up.
import { resolve } from "node:path";
import { send, toRequest } from "../node-http.js";
import { enquiryContext } from "./context.js";
import { handleEnquiryRequest } from "./handler.js";

export function enquiryPlugin() {
  return {
    name: "mm-enquiry",
    configureServer(server) {
      const outbox = process.env.ENQUIRY_DEV_OUTBOX ? resolve(process.env.ENQUIRY_DEV_OUTBOX) : undefined;
      const context = {
        ...enquiryContext(process.env, { outbox }),
        log: (error) => server.config.logger.error(String(error?.stack || error)),
      };
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== "/api/enquiry") return next();
        try {
          await send(res, await handleEnquiryRequest(await toRequest(req), context));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
