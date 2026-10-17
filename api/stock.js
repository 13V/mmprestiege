// The stock manager's API on Vercel: /api/stock?op=<name>. The logic lives
// in server/stock (shared with the dev server).
import { productionContext } from "../server/stock/context.js";
import { handleStockRequest } from "../server/stock/handler.js";

export const config = { maxDuration: 30 };

let context;
export default {
  async fetch(request) {
    context ||= productionContext(process.env);
    return handleStockRequest(request, await context);
  },
};
