# Enquiries and finance applications

Every enquiry form on the site (finance, sell or trade-in, find a car, general enquiries and viewings) asks for a full name, a phone number and an email address. The email is required on the finance form, which also asks which car the visitor wants to finance. The finance form opens from the Finance section on the home page (where the menu's Finance link lands) and from Apply for finance on each listing.

Enquiries go to **mmprestigemotors@gmail.com**, and visitors can always call or text **0411 710 409**.

## How enquiries arrive

The site works two ways, depending on whether email is set up in Vercel:

- **Email set up:** the visitor taps Send enquiry and the enquiry is emailed straight to mmprestigemotors@gmail.com from the dealership's own Gmail account. The subject says what it is (for example "Finance enquiry: Jane Smith, 2016 HSV GTS"), and replying to the email answers the visitor. The Gmail app on the dealership's phone shows each one as it arrives.
- **Email not set up yet** (or if a send fails): the form prepares the message and offers **Send by email** (it opens the visitor's email app, addressed to mmprestigemotors@gmail.com) and **Send via SMS** (it opens their messages app, addressed to 0411 710 409). Nothing is sent until the visitor sends it.

Texting enquiries to the phone automatically would need a paid SMS service; the Gmail app's notifications do the same job for free.

## Turning on email (about 5 minutes)

The site sends through the dealership's Gmail account with a Google *app password*: a separate password that can only send mail and can be removed at any time. The Gmail password itself is never shared.

1. Sign in to the Google account for **mmprestigemotors@gmail.com** and open [myaccount.google.com/security](https://myaccount.google.com/security).
2. Turn on **2-Step Verification** if it isn't on already (Google requires it for app passwords).
3. Open [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), name the password "MM Prestige website" and select **Create**. Google shows a 16-letter password once; copy it.
4. In Vercel, open the project, then **Settings → Environment Variables**, and add:
   - Name: `ENQUIRY_EMAIL_APP_PASSWORD`
   - Value: the 16 letters (spaces don't matter)
   - Environment: Production (add Preview too to test on preview links)
5. Redeploy: **Deployments**, then the latest deployment's **⋯** menu, then **Redeploy**.
6. Send a test enquiry from the website. It arrives in the inbox from "MM Prestige Motors website" within a few seconds. `https://mmprestiege.vercel.app/api/enquiry` shows `"email":true` once email is on.

To stop emails, delete the app password in Google (step 3's page) or remove the variable in Vercel and redeploy; the form goes back to offering the visitor's own apps.

Optional variables: `ENQUIRY_EMAIL_TO` sends enquiries to a different address; `ENQUIRY_EMAIL_USER` signs in as a different mailbox (its app password then goes in `ENQUIRY_EMAIL_APP_PASSWORD`); `ENQUIRY_SMTP_HOST` and `ENQUIRY_SMTP_PORT` use another provider's SMTP server over TLS (default `smtp.gmail.com`, port 465).

## Spam and privacy

- A hidden field catches bots that fill in every field: they are told it worked, and nothing is sent.
- Each visitor can send 5 enquiries in 15 minutes, and the site sends at most 60 an hour.
- Other websites' pages can't send enquiries through the API.
- Enquiries aren't stored on the server. They go to the mailbox, and the server's logs only record why a send failed, never the visitor's details.

## For developers

- Code: `server/enquiry/handler.js` (the API: `GET /api/enquiry` reports `{ ok, email }`, `POST` sends one enquiry), `server/enquiry/smtp.js` (a small SMTP client using Node's built-in TLS, so no mail package is needed), `server/enquiry/context.js` (settings), `api/enquiry.js` (the Vercel function) and `server/enquiry/vite-plugin.js` (the same API in the dev server). The form is `Enquiry` in `src/main.jsx`.
- In the dev server, set `ENQUIRY_DEV_OUTBOX=.enquiries` to save each enquiry as an `.eml` file instead of emailing it.
- `npm run test:enquiry` checks the fields, the spam trap, the rate limit, the email itself and the SMTP exchange against a small local mail server. The browser tests (`npm test`) never send a real enquiry, even against the live site.
