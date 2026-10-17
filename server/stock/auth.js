// Sign-in for the stock manager: one password (STOCK_ADMIN_PASSWORD), and a
// session cookie signed with a key derived from it, so changing the password
// signs every device out.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "mm_stock";
const DAYS = 30;

const digest = (value) => createHash("sha256").update(String(value)).digest();
export const passwordMatches = (given, expected) =>
  Boolean(expected) && timingSafeEqual(digest(given), digest(expected));

const sign = (payload, password) =>
  createHmac("sha256", createHmac("sha256", "mm-prestige-stock").update(password).digest())
    .update(payload)
    .digest("base64url");

const attributes = (secure, maxAge) =>
  `Path=/api/stock; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;

export function sessionCookie(password, { secure, now = Date.now() }) {
  const payload = String(now + DAYS * 864e5);
  return `${COOKIE}=${payload}.${sign(payload, password)}; ${attributes(secure, DAYS * 86400)}`;
}
export const clearCookie = (secure) => `${COOKIE}=; ${attributes(secure, 0)}`;

export function hasSession(request, password, now = Date.now()) {
  if (!password) return false;
  const cookie = (request.headers.get("cookie") || "")
    .split(/;\s*/)
    .find((part) => part.startsWith(`${COOKIE}=`));
  const [payload, mac] = (cookie?.slice(COOKIE.length + 1) || "").split(".");
  if (!payload || !mac || !/^\d+$/.test(payload)) return false;
  const given = Buffer.from(mac);
  const expected = Buffer.from(sign(payload, password));
  return given.length === expected.length && timingSafeEqual(given, expected) && Number(payload) > now;
}

// Slows down repeated wrong passwords from one address: after 5 misses,
// a lockout that doubles each time, up to 15 minutes.
export function loginThrottle() {
  const misses = new Map();
  return {
    wait(key, now = Date.now()) {
      const entry = misses.get(key);
      return entry && entry.until > now ? Math.ceil((entry.until - now) / 1000) : 0;
    },
    miss(key, now = Date.now()) {
      const entry = misses.get(key) || { count: 0, until: 0 };
      entry.count += 1;
      if (entry.count >= 5) entry.until = now + Math.min(15 * 60e3, 30e3 * 2 ** (entry.count - 5));
      misses.set(key, entry);
      if (misses.size > 5000) misses.clear();
    },
    clear: (key) => misses.delete(key),
  };
}
