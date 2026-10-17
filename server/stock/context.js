// Production settings for the stock manager, from Vercel environment
// variables (see docs/stock-manager.md):
//   STOCK_ADMIN_PASSWORD   the sign-in password (10 characters or more)
//   BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN   added by connecting a Blob store
//   REGCHECK_USERNAME      the CarRegistrationAPI account's username
//   STOCK_DEPLOY_HOOK_URL  a Vercel deploy hook, so changes rebuild the site
import { regCheckProvider } from "./lookup.js";
import { blobStore } from "./stores.js";

export const MIN_PASSWORD = 10;

export async function deployHook(url) {
  if (!url) return { state: "manual", message: "Saved. Add a deploy hook so the website updates by itself." };
  try {
    const response = await fetch(url, { method: "POST", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { state: "started", message: "Saved. The website updates in about a minute." };
  } catch {
    return { state: "failed", message: "Saved, but the website update didn't start. Tap Update website to try again." };
  }
}

export async function productionContext(env = process.env) {
  const configured = env.STOCK_ADMIN_PASSWORD || "";
  const password = configured.length >= MIN_PASSWORD ? configured : "";
  const storage = env.BLOB_STORE_ID || env.BLOB_READ_WRITE_TOKEN;
  return {
    mode: "production",
    password,
    passwordTooShort: Boolean(configured) && !password,
    secureCookies: true,
    store: storage ? blobStore(await import("@vercel/blob")) : null,
    provider: env.REGCHECK_USERNAME ? regCheckProvider({ username: env.REGCHECK_USERNAME.trim() }) : null,
    publishMode: env.STOCK_DEPLOY_HOOK_URL ? "deploy-hook" : null,
    publish: () => deployHook(env.STOCK_DEPLOY_HOOK_URL),
    log: (error) => console.error("[stock]", error),
  };
}
