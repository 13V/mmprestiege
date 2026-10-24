// Settings for the enquiry API, from environment variables (Vercel's in
// production; see docs/enquiries.md):
//   ENQUIRY_EMAIL_APP_PASSWORD  a Google app password for the mailbox below.
//                               Without it, enquiries aren't emailed and the
//                               form offers the visitor's own apps instead.
//   ENQUIRY_EMAIL_USER          the mailbox that sends (default: the
//                               dealership's address in src/data.js)
//   ENQUIRY_EMAIL_TO            where enquiries go (default: the same)
//   ENQUIRY_SMTP_HOST, ENQUIRY_SMTP_PORT   another provider's SMTP server
//                               (default smtp.gmail.com, port 465)
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { business } from "../../src/data.js";
import { createLimiter } from "./handler.js";
import { buildMessage, sendMail } from "./smtp.js";

export const SITE = "https://mmprestiege.vercel.app";

export function smtpMailer({ host, port, user, password }) {
  return { send: (mail) => sendMail({ host, port, secure: true, user, password, ...mail }) };
}

// The dev server can write each enquiry to a folder instead of sending it.
export function folderMailer(dir) {
  return {
    async send(mail) {
      await mkdir(dir, { recursive: true });
      const name = `${new Date().toISOString().replace(/[:.]/g, "-")}.eml`;
      await writeFile(join(dir, name), buildMessage(mail));
    },
  };
}

export function enquiryContext(env = process.env, { outbox } = {}) {
  const password = (env.ENQUIRY_EMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  const user = (env.ENQUIRY_EMAIL_USER || business.email).trim();
  const to = (env.ENQUIRY_EMAIL_TO || business.email).trim();
  const mailer = password
    ? smtpMailer({ host: env.ENQUIRY_SMTP_HOST || "smtp.gmail.com", port: Number(env.ENQUIRY_SMTP_PORT) || 465, user, password })
    : outbox
      ? folderMailer(outbox)
      : null;
  return {
    mailer,
    from: user,
    to,
    site: SITE,
    limit: createLimiter(),
    log: (error) => console.error("[enquiry]", error?.message || error),
  };
}
