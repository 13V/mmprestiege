// A small SMTP client for sending the website's enquiries through the
// dealership's own mailbox (Gmail on port 465, which is TLS from the start).
// It speaks just enough SMTP for one plain-text message and needs no
// packages beyond Node itself.
import { randomBytes } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

// One line of a header, without the line breaks someone could use to add
// headers of their own.
const oneLine = (value) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();

// RFC 2047 encoded words for text in headers (names and the subject), split
// so each stays well under the 76-character limit and no UTF-8 character is
// cut in half. A name is left as it is only when it is plain letters, digits
// and spaces, since a comma or a quote would change how it is read.
export function encodeWords(value, { name = false } = {}) {
  const text = oneLine(value);
  const plain = name ? /^[A-Za-z0-9 ]*$/.test(text) : /^[\x20-\x7e]*$/.test(text) && !/[="?_]/.test(text);
  if (plain) return text;
  const words = [];
  let chunk = "";
  for (const char of text) {
    if (Buffer.byteLength(chunk + char) > 45) {
      words.push(chunk);
      chunk = "";
    }
    chunk += char;
  }
  if (chunk) words.push(chunk);
  return words.map((word) => `=?UTF-8?B?${Buffer.from(word).toString("base64")}?=`).join("\r\n ");
}

export function formatAddress({ name, address }) {
  return name ? `${encodeWords(name, { name: true })} <${oneLine(address)}>` : oneLine(address);
}

// RFC 5322 date, for example "Sat, 24 Oct 2026 01:55:00 +0000".
function mailDate(date) {
  const [day, , month] = date.toUTCString().split(" ");
  const pad = (n) => String(n).padStart(2, "0");
  return `${day} ${pad(date.getUTCDate())} ${month} ${date.getUTCFullYear()} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} +0000`;
}

// The whole message: headers, then the text as base64 so any characters
// (and lines starting with a full stop) travel safely.
export function buildMessage({ from, to, replyTo, subject, text, date = new Date(), domain = "mmprestige.website" }) {
  const body = Buffer.from(String(text).replace(/\r?\n/g, "\r\n")).toString("base64").replace(/.{76}/g, "$&\r\n");
  const headers = [
    `From: ${formatAddress(from)}`,
    `To: ${formatAddress(to)}`,
    replyTo && `Reply-To: ${formatAddress(replyTo)}`,
    `Subject: ${encodeWords(subject)}`,
    `Date: ${mailDate(date)}`,
    `Message-ID: <${randomBytes(12).toString("hex")}@${domain}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ].filter(Boolean);
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

class SmtpError extends Error {
  constructor(stage, reply) {
    super(`SMTP ${stage} failed${reply ? `: ${reply.code} ${reply.text}` : ""}`);
    this.stage = stage;
    this.code = reply?.code;
  }
}

// Reads the server's replies: a reply ends on a line with a space after its
// three-digit code ("250 OK"); "250-" lines continue it.
function replies(socket) {
  let buffer = "";
  let lines = [];
  const waiting = [];
  const ready = [];
  let failure = null;
  socket.on("data", (data) => {
    buffer += data.toString("latin1");
    let end;
    while ((end = buffer.indexOf("\r\n")) >= 0) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      lines.push(line);
      if (/^\d{3}(?: |$)/.test(line)) {
        const reply = { code: Number(line.slice(0, 3)), text: lines.map((l) => l.slice(4)).join(" ").slice(0, 300) };
        lines = [];
        if (waiting.length) waiting.shift().resolve(reply);
        else ready.push(reply);
      }
    }
  });
  const fail = (error) => {
    failure ||= error;
    while (waiting.length) waiting.shift().reject(failure);
  };
  socket.on("error", fail);
  socket.on("close", () => fail(new SmtpError("connection")));
  return () => {
    if (ready.length) return Promise.resolve(ready.shift());
    if (failure) return Promise.reject(failure);
    return new Promise((resolve, reject) => waiting.push({ resolve, reject }));
  };
}

// Sends one message. `secure` is TLS from the start (port 465); without it
// the connection is plain, which is only for the local tests.
export async function sendMail({ host, port, secure = true, user, password, from, to, replyTo, subject, text, timeout = 15000, name = "mmprestige.website" }) {
  const socket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });
  socket.setTimeout(timeout, () => socket.destroy(new SmtpError("timeout")));
  const next = replies(socket);
  const step = async (stage, command, codes) => {
    if (command) socket.write(`${command}\r\n`);
    const reply = await next();
    if (!codes.includes(reply.code)) throw new SmtpError(stage, reply);
    return reply;
  };
  try {
    await step("greeting", null, [220]);
    await step("hello", `EHLO ${name}`, [250]);
    if (user) {
      const token = Buffer.from(`\0${user}\0${password}`).toString("base64");
      await step("sign-in", `AUTH PLAIN ${token}`, [235]);
    }
    await step("sender", `MAIL FROM:<${oneLine(from.address)}>`, [250]);
    await step("recipient", `RCPT TO:<${oneLine(to.address)}>`, [250, 251]);
    await step("data", "DATA", [354]);
    // Lines that start with a full stop are doubled (base64 never has one,
    // but the headers are checked too).
    const message = buildMessage({ from, to, replyTo, subject, text }).replace(/^\./gm, "..");
    await step("message", `${message}\r\n.`, [250]);
    socket.write("QUIT\r\n");
  } finally {
    socket.end();
    socket.destroy();
  }
}
