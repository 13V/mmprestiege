// The website's enquiry API, as a web-standard handler: the Vercel function
// (api/enquiry.js) and the Vite dev server (vite-plugin.js) both call it.
//   GET  /api/enquiry   whether enquiries can be emailed: { ok, email }
//   POST /api/enquiry   emails one enquiry to the dealership
// When email isn't set up, the form lets visitors send their message from
// their own email or messaging app instead.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
const fail = (status, code, message, extra = {}) => json({ ok: false, code, message, ...extra }, status);

export const KINDS = {
  talk: "Website enquiry",
  finance: "Finance enquiry",
  sell: "Sell or trade-in enquiry",
  find: "Car finder request",
};
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
const clean = (value, max) =>
  String(value ?? "")
    .replace(/\r\n?/g, "\n")
    // Control characters other than new lines and tabs.
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

// Checks one enquiry and returns its fields, or the problems with it.
export function readEnquiry(body) {
  const kind = Object.hasOwn(KINDS, body?.kind) ? body.kind : "talk";
  const name = clean(body?.name, 80).replace(/\s+/g, " ");
  const phone = clean(body?.phone, 30).replace(/\s+/g, " ");
  const email = clean(body?.email, 254);
  const car = clean(body?.car, 120).replace(/\s+/g, " ");
  const message = clean(body?.message, 5000);
  const page = clean(body?.page, 200);
  const errors = {};
  if (name.length < 2) errors.name = "Please enter your full name.";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || /[^\d +().-]/.test(phone))
    errors.phone = "Please enter a phone number we can call.";
  if (email ? !EMAIL.test(email) : kind === "finance") errors.email = "Please enter your email address.";
  if (kind === "finance" && !car) errors.car = "Please tell us which car you'd like to finance.";
  if (!message) errors.message = "Please add a message.";
  return {
    errors,
    enquiry: { kind, name, phone, email, car, message, page: page.startsWith("/") ? page : "" },
  };
}

// The email the dealership receives. Replying goes straight to the visitor.
export function enquiryMail(enquiry, { site, to, from }) {
  const { kind, name, phone, email, car, message, page } = enquiry;
  const subject = `${KINDS[kind]}: ${name}${car ? `, ${car}` : ""}`;
  const reach = email ? `Reply to this email to answer ${name}, or call ${phone}.` : `${name} didn't leave an email address. Call ${phone}.`;
  const text = `${message}\n\n--\n${reach}\nSent from the enquiry form on ${site}${page || "/"}`;
  return {
    from: { name: "MM Prestige Motors website", address: from },
    to: { address: to },
    replyTo: email ? { name, address: email } : undefined,
    subject,
    text,
  };
}

// Limits how often one visitor (and everyone together) can send, so the form
// can't be used to flood the inbox. It lives in memory, so it is a light
// guard rather than a hard one.
export function createLimiter({ perVisitor = 5, windowMs = 15 * 60 * 1000, total = 60, totalWindowMs = 60 * 60 * 1000, now = () => Date.now() } = {}) {
  const seen = new Map();
  let all = [];
  return (visitor) => {
    const time = now();
    all = all.filter((t) => time - t < totalWindowMs);
    const mine = (seen.get(visitor) || []).filter((t) => time - t < windowMs);
    if (mine.length >= perVisitor || all.length >= total) {
      seen.set(visitor, mine);
      const oldest = mine.length >= perVisitor ? mine[0] + windowMs : all[0] + totalWindowMs;
      return Math.max(1, Math.ceil((oldest - time) / 1000));
    }
    mine.push(time);
    all.push(time);
    seen.set(visitor, mine);
    if (seen.size > 5000) seen.delete(seen.keys().next().value);
    return 0;
  };
}

async function readBody(request) {
  const text = await request.text();
  if (text.length > 16000) return null;
  try {
    return JSON.parse(text) || {};
  } catch {
    return null;
  }
}

export async function handleEnquiryRequest(request, ctx) {
  const method = request.method;
  if (method === "GET" || method === "HEAD") return json({ ok: true, email: Boolean(ctx.mailer) });
  if (method !== "POST") return fail(405, "method", "Use POST to send an enquiry.");
  // Pages on other sites can't send this header without the browser asking
  // first, and the API never says yes.
  if (request.headers.get("x-mm-enquiry") !== "1") return fail(403, "forbidden", "This request isn't allowed.");
  const body = await readBody(request);
  if (!body) return fail(400, "bad_request", "That enquiry couldn't be read.");
  // A field people can't see: if it's filled in, a bot sent the form. It is
  // told it worked, and nothing is sent.
  if (String(body.website || "").trim()) return json({ ok: true });
  const { errors, enquiry } = readEnquiry(body);
  if (Object.keys(errors).length) return fail(400, "invalid", "Please check the highlighted details.", { errors });
  if (!ctx.mailer) return fail(503, "no_email", "Enquiries can't be emailed from the website yet.");
  const visitor = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const wait = ctx.limit(visitor);
  if (wait) return fail(429, "slow_down", `Too many enquiries. Please wait ${Math.ceil(wait / 60)} minutes, or call us.`);
  try {
    await ctx.mailer.send(enquiryMail(enquiry, ctx));
  } catch (error) {
    // The reason, not the enquiry: visitors' details stay out of the logs.
    ctx.log(error);
    return fail(502, "send_failed", "Your enquiry couldn't be sent just now.");
  }
  return json({ ok: true });
}
