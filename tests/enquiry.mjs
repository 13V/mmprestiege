// Checks for the enquiry API's server code: the form's fields, the spam trap
// and rate limit, the email the dealership receives, and the SMTP client
// against a small local mail server. No browser, network or mailbox needed:
// `node tests/enquiry.mjs`.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { enquiryContext, folderMailer } from "../server/enquiry/context.js";
import { createLimiter, enquiryMail, handleEnquiryRequest, readEnquiry } from "../server/enquiry/handler.js";
import { buildMessage, encodeWords, sendMail } from "../server/enquiry/smtp.js";

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push(false);
    console.log(`FAIL ${name}\n  ${error.message}`);
  }
}
function expect(condition, message) {
  if (!condition) throw new Error(message);
}
const same = (actual, expected, message) =>
  expect(JSON.stringify(actual) === JSON.stringify(expected), `${message}: got ${JSON.stringify(actual)}`);

const finance = {
  kind: "finance",
  name: "Jane Smith",
  phone: "0400 000 000",
  email: "jane@example.com",
  car: "2016 HSV GTS",
  message: "Hi, I'd like to apply for finance.\n\nCar: 2016 HSV GTS\n\nName: Jane Smith\nPhone: 0400 000 000\nEmail: jane@example.com",
  page: "/stock/hsv-gts-2016",
};
const post = (body, headers = { "x-mm-enquiry": "1" }) =>
  new Request("http://localhost/api/enquiry", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
function context({ fails = false } = {}) {
  const sent = [];
  const logged = [];
  return {
    sent,
    logged,
    mailer: {
      async send(mail) {
        if (fails) throw new Error("SMTP sign-in failed: 535 Username and Password not accepted");
        sent.push(mail);
      },
    },
    from: "mmprestigemotors@gmail.com",
    to: "mmprestigemotors@gmail.com",
    site: "https://mmprestiege.vercel.app",
    limit: createLimiter(),
    log: (error) => logged.push(String(error?.message || error)),
  };
}

await check("A finance enquiry needs a full name, a phone number, an email and the car", () => {
  same(readEnquiry(finance).errors, {}, "complete enquiry");
  const { errors } = readEnquiry({ kind: "finance", name: "J", phone: "12", email: "", car: "", message: "" });
  same(Object.keys(errors).sort(), ["car", "email", "message", "name", "phone"], "missing fields");
  same(Object.keys(readEnquiry({ ...finance, email: "jane@" }).errors), ["email"], "bad email");
  same(Object.keys(readEnquiry({ ...finance, phone: "call me maybe 0400" }).errors), ["phone"], "bad phone");
});

await check("Other enquiries can leave out the email, and unknown kinds are general enquiries", () => {
  const { errors, enquiry } = readEnquiry({ kind: "nonsense", name: "Sam Lee", phone: "+61 400 000 000", message: "Hello" });
  same(errors, {}, "errors");
  expect(enquiry.kind === "talk", `kind ${enquiry.kind}`);
  same(readEnquiry({ kind: "sell", name: "Sam Lee", phone: "0400000000", message: "Car" }).errors, {}, "sell without email");
});

await check("Fields are trimmed, kept to length and stripped of control characters", () => {
  const { enquiry } = readEnquiry({ ...finance, name: "  Jane\r\nBcc: x@y.z  ", message: `${"a".repeat(6000)}\u0007`, page: "https://evil.example/" });
  expect(!/[\r\n]/.test(enquiry.name), "name keeps a line break");
  expect(enquiry.message.length === 5000, `message length ${enquiry.message.length}`);
  expect(enquiry.page === "", "outside page kept");
});

await check("The dealership's email has a clear subject, the visitor as reply-to and the page it came from", () => {
  const mail = enquiryMail(readEnquiry(finance).enquiry, context());
  expect(mail.subject === "Finance enquiry: Jane Smith, 2016 HSV GTS", mail.subject);
  same(mail.replyTo, { name: "Jane Smith", address: "jane@example.com" }, "reply-to");
  same(mail.to, { address: "mmprestigemotors@gmail.com" }, "to");
  expect(mail.text.startsWith(finance.message), "message first");
  expect(mail.text.includes("Reply to this email to answer Jane Smith, or call 0400 000 000."), "reply line");
  expect(mail.text.endsWith("https://mmprestiege.vercel.app/stock/hsv-gts-2016"), "page");
  const noEmail = enquiryMail(readEnquiry({ kind: "talk", name: "Sam Lee", phone: "0400000000", message: "Hi" }).enquiry, context());
  expect(!noEmail.replyTo && noEmail.text.includes("Sam Lee didn't leave an email address. Call 0400000000."), "no email");
  expect(noEmail.subject === "Website enquiry: Sam Lee", noEmail.subject);
  const carEnquiry = enquiryMail(readEnquiry({ kind: "talk", name: "Sam Lee", phone: "0400000000", car: "2016 HSV GTS", message: "Hi" }).enquiry, context());
  expect(carEnquiry.subject === "Website enquiry: Sam Lee, 2016 HSV GTS", carEnquiry.subject);
});

await check("GET says whether enquiries can be emailed", async () => {
  same(await (await handleEnquiryRequest(new Request("http://localhost/api/enquiry"), { ...context(), mailer: null })).json(), { ok: true, email: false }, "off");
  same(await (await handleEnquiryRequest(new Request("http://localhost/api/enquiry"), context())).json(), { ok: true, email: true }, "on");
});

await check("POST needs the site's header, readable JSON and valid fields", async () => {
  const ctx = context();
  expect((await handleEnquiryRequest(post(finance, {}), ctx)).status === 403, "no header");
  expect((await handleEnquiryRequest(post("{not json"), ctx)).status === 400, "bad json");
  expect((await handleEnquiryRequest(post("x".repeat(20000)), ctx)).status === 400, "too big");
  const invalid = await handleEnquiryRequest(post({ ...finance, email: "" }), ctx);
  expect(invalid.status === 400, `invalid status ${invalid.status}`);
  same(Object.keys((await invalid.json()).errors), ["email"], "errors");
  expect((await handleEnquiryRequest(new Request("http://localhost/api/enquiry", { method: "DELETE" }), ctx)).status === 405, "method");
  expect(ctx.sent.length === 0, "nothing sent");
});

await check("A filled-in spam trap looks like success but sends nothing", async () => {
  const ctx = context();
  const response = await handleEnquiryRequest(post({ ...finance, website: "https://spam.example" }), ctx);
  same(await response.json(), { ok: true }, "reply");
  expect(ctx.sent.length === 0, "sent");
});

await check("Without email set up, a valid enquiry is refused so the form offers the visitor's own apps", async () => {
  const response = await handleEnquiryRequest(post(finance), { ...context(), mailer: null });
  expect(response.status === 503, `status ${response.status}`);
  expect((await response.json()).code === "no_email", "code");
});

await check("A valid enquiry is emailed once", async () => {
  const ctx = context();
  const response = await handleEnquiryRequest(post(finance), ctx);
  same(await response.json(), { ok: true }, "reply");
  expect(ctx.sent.length === 1 && ctx.sent[0].subject === "Finance enquiry: Jane Smith, 2016 HSV GTS", "sent");
});

await check("One visitor can send five enquiries in 15 minutes", async () => {
  const ctx = context();
  for (let i = 0; i < 5; i++) expect((await handleEnquiryRequest(post(finance), ctx)).status === 200, `send ${i + 1}`);
  const sixth = await handleEnquiryRequest(post(finance), ctx);
  expect(sixth.status === 429, `sixth ${sixth.status}`);
  expect((await handleEnquiryRequest(post(finance, { "x-mm-enquiry": "1", "x-forwarded-for": "198.51.100.4" }), ctx)).status === 200, "another visitor");
  let time = 0;
  const limit = createLimiter({ now: () => time });
  for (let i = 0; i < 5; i++) limit("a");
  expect(limit("a") > 0, "limited");
  time = 15 * 60 * 1000;
  expect(limit("a") === 0, "allowed again after the window");
});

await check("A failed send is reported to the visitor, and the log has the reason but none of their details", async () => {
  const ctx = context({ fails: true });
  const response = await handleEnquiryRequest(post(finance), ctx);
  expect(response.status === 502, `status ${response.status}`);
  expect(ctx.logged.length === 1 && !/Jane|0400|example\.com/.test(ctx.logged[0]), `log ${ctx.logged}`);
});

await check("Header text is encoded so names with commas or accents can't break the email", () => {
  expect(encodeWords("Jane Smith", { name: true }) === "Jane Smith", "plain name");
  const comma = encodeWords("Smith, Jane", { name: true });
  expect(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/.test(comma), comma);
  expect(Buffer.from(comma.slice(10, -2), "base64").toString() === "Smith, Jane", "decodes");
  const long = encodeWords(`Finance enquiry: Jürgen ${"Ö".repeat(60)}`);
  for (const line of long.split("\r\n")) expect(line.length <= 76, `line ${line.length}`);
  const decoded = long.split("\r\n").map((w) => Buffer.from(w.trim().slice(10, -2), "base64").toString()).join("");
  expect(decoded === `Finance enquiry: Jürgen ${"Ö".repeat(60)}`, "round trip");
  expect(!encodeWords("Hi\r\nBcc: x@y.z").includes("\n"), "line break");
});

await check("Messages are base64 text with short lines", () => {
  const message = buildMessage({
    from: { name: "MM Prestige Motors website", address: "mmprestigemotors@gmail.com" },
    to: { address: "mmprestigemotors@gmail.com" },
    replyTo: { name: "Smith, Jane", address: "jane@example.com" },
    subject: "Finance enquiry: Smith, Jane",
    text: `.starts with a dot\n${"Long line ".repeat(40)}`,
    date: new Date("2026-10-24T01:55:00Z"),
  });
  const [head, body] = message.split("\r\n\r\n");
  expect(head.includes("Date: Sat, 24 Oct 2026 01:55:00 +0000"), "date");
  expect(head.includes("Content-Transfer-Encoding: base64"), "encoding");
  expect(/Reply-To: =\?UTF-8\?B\?[^?]+\?= <jane@example\.com>/.test(head), "reply-to");
  for (const line of message.split("\r\n")) expect(line.length <= 78, `line of ${line.length}`);
  expect(Buffer.from(body.replace(/\r\n/g, ""), "base64").toString().startsWith(".starts with a dot\r\n"), "body");
});

// A small SMTP server that accepts one sign-in and records what it is sent.
function fakeSmtp({ user, password, rejectSignIn = false }) {
  const received = [];
  const server = net.createServer((socket) => {
    let data = "";
    let inData = false;
    let message = "";
    socket.write("220 fake.smtp ESMTP ready\r\n");
    socket.on("data", (chunk) => {
      data += chunk.toString("latin1");
      let end;
      while ((end = data.indexOf("\r\n")) >= 0) {
        const line = data.slice(0, end);
        data = data.slice(end + 2);
        if (inData) {
          if (line === ".") {
            inData = false;
            received.push({ ...received.pop(), message });
            socket.write("250 2.0.0 OK queued\r\n");
          } else message += `${line.startsWith("..") ? line.slice(1) : line}\r\n`;
          continue;
        }
        if (line.startsWith("EHLO")) socket.write("250-fake.smtp at your service\r\n250-AUTH LOGIN PLAIN\r\n250 SMTPUTF8\r\n");
        else if (line.startsWith("AUTH PLAIN ")) {
          const [, u, p] = Buffer.from(line.slice(11), "base64").toString().split("\0");
          socket.write(!rejectSignIn && u === user && p === password ? "235 2.7.0 Accepted\r\n" : "535 5.7.8 Username and Password not accepted\r\n");
        } else if (line.startsWith("MAIL FROM:")) {
          received.push({ from: line.slice(10) });
          socket.write("250 2.1.0 OK\r\n");
        } else if (line.startsWith("RCPT TO:")) {
          received.push({ ...received.pop(), to: line.slice(8) });
          socket.write("250 2.1.5 OK\r\n");
        } else if (line === "DATA") {
          inData = true;
          socket.write("354 Go ahead\r\n");
        } else if (line === "QUIT") socket.end("221 2.0.0 closing\r\n");
        else socket.write("502 5.5.1 Unrecognized command\r\n");
      }
    });
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ port: server.address().port, received, close: () => server.close() })),
  );
}

await check("The SMTP client signs in, sends one message and the server receives it intact", async () => {
  const smtp = await fakeSmtp({ user: "mmprestigemotors@gmail.com", password: "abcdefghijklmnop" });
  try {
    const mail = enquiryMail(readEnquiry({ ...finance, name: "Jürgen O'Neil" }).enquiry, context());
    await sendMail({ host: "127.0.0.1", port: smtp.port, secure: false, user: "mmprestigemotors@gmail.com", password: "abcdefghijklmnop", ...mail });
    expect(smtp.received.length === 1, `received ${smtp.received.length}`);
    const [got] = smtp.received;
    expect(got.from === "<mmprestigemotors@gmail.com>" && got.to === "<mmprestigemotors@gmail.com>", `${got.from} ${got.to}`);
    const [head, body] = got.message.split("\r\n\r\n");
    expect(head.includes("To: mmprestigemotors@gmail.com"), "to header");
    expect(/^Reply-To: =\?UTF-8\?B\?/m.test(head), "encoded reply-to");
    const text = Buffer.from(body.replace(/\r\n/g, ""), "base64").toString();
    expect(text.includes("Name: Jane Smith") && text.includes("Car: 2016 HSV GTS"), "body text");
  } finally {
    smtp.close();
  }
});

await check("A refused sign-in fails with the reason and never the password", async () => {
  const smtp = await fakeSmtp({ user: "u", password: "right", rejectSignIn: true });
  try {
    let error;
    try {
      await sendMail({ host: "127.0.0.1", port: smtp.port, secure: false, user: "u", password: "secret-app-password", ...enquiryMail(readEnquiry(finance).enquiry, context()) });
    } catch (caught) {
      error = caught;
    }
    expect(error && /sign-in failed: 535/.test(error.message), String(error?.message));
    expect(!error.message.includes("secret-app-password"), "password in error");
    expect(smtp.received.length === 0, "nothing sent");
  } finally {
    smtp.close();
  }
});

await check("A server that never answers times out", async () => {
  const silent = net.createServer(() => {});
  await new Promise((resolve) => silent.listen(0, "127.0.0.1", resolve));
  try {
    let error;
    const started = Date.now();
    try {
      await sendMail({ host: "127.0.0.1", port: silent.address().port, secure: false, timeout: 300, ...enquiryMail(readEnquiry(finance).enquiry, context()) });
    } catch (caught) {
      error = caught;
    }
    expect(error && /timeout|connection/.test(error.message), String(error?.message));
    expect(Date.now() - started < 3000, "took too long");
  } finally {
    silent.close();
  }
});

await check("Settings: the app password turns email on (spaces ignored); the dev outbox saves .eml files", async () => {
  expect(enquiryContext({}).mailer === null, "off without a password");
  const on = enquiryContext({ ENQUIRY_EMAIL_APP_PASSWORD: "abcd efgh ijkl mnop" });
  expect(on.mailer && on.to === "mmprestigemotors@gmail.com" && on.from === "mmprestigemotors@gmail.com", "on");
  const dir = mkdtempSync(join(tmpdir(), "mm-outbox-"));
  try {
    const ctx = enquiryContext({}, { outbox: dir });
    const response = await handleEnquiryRequest(post(finance), ctx);
    expect(response.status === 200, `status ${response.status}`);
    const files = readdirSync(dir);
    expect(files.length === 1 && files[0].endsWith(".eml"), `files ${files}`);
    expect(readFileSync(join(dir, files[0]), "utf8").includes("Subject: Finance enquiry: Jane Smith, 2016 HSV GTS"), "saved message");
    await folderMailer(dir).send(enquiryMail(readEnquiry(finance).enquiry, ctx));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
