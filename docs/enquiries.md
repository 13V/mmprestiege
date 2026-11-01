# Enquiries and finance applications

Every enquiry form on the site (finance, sell or trade-in, find a car, general enquiries and viewings) asks for a full name, a phone number and an email address. The email is required on the finance form, which also asks which car the visitor wants to finance. The finance form opens from the Finance section on the home page (where the menu's Finance link lands) and from Apply for finance on each listing.

Enquiries go to **mmprestigemotors@gmail.com**, and visitors can always call or text **0411 710 409**.

## How enquiries arrive

The forms send through [FormSubmit](https://formsubmit.co), a free service that emails website forms. There's no account, password or server to look after.

- The visitor taps **Send enquiry**, and FormSubmit emails the enquiry to mmprestigemotors@gmail.com. The subject says what it is (for example "Finance enquiry: Jane Smith, 2016 HSV GTS"), and the email lists the visitor's name, phone, email, the car, their message and the page they sent it from. Replying to the email answers the visitor, when they gave an email address (the finance form requires one). The Gmail app on the dealership's phone shows each one as it arrives.
- If the website can't send it (before the form is activated, if FormSubmit is down, or if the visitor has no connection), the visitor is told so and offered **Send by email** (their email app, addressed to mmprestigemotors@gmail.com with the message filled in), **Send via SMS** (their messages app, addressed to 0411 710 409) or **Copy message**. The form never says an enquiry was sent unless FormSubmit confirmed it.

Texting enquiries to the phone automatically would need a paid SMS service; the Gmail app's notifications do the same job for free.

## Switching it on: one click, once

FormSubmit asks the owner of the address to confirm the form before it delivers anything.

1. Send a test enquiry from the website (any form). As the form isn't activated yet, the website offers to send it by email or SMS instead; that's expected, so just close it.
2. Within a few minutes, FormSubmit emails mmprestigemotors@gmail.com asking to activate the form. If it isn't in the inbox, check Spam and Promotions.
3. The owner opens it and taps **Activate Form**. From then on every enquiry is emailed to him, starting with the test: FormSubmit holds enquiries sent before activation and delivers them once it's activated.
4. Send a second test enquiry. The website says "Thanks… We've got it.", and the email arrives within a minute or two.

Good to know:

- **One activation covers the whole site.** FormSubmit tells forms apart by the page that sends them. The site sends it only the website's address, never the page, so every page and form counts as one form.
- **A new web address means one more click.** When the site moves to a new address (for example the dealership's own domain), the first enquiry from it sends another activation email. Preview links (other `.vercel.app` addresses) count as new addresses too, so test on the live site.
- **Ignore activation emails you aren't expecting.** Anyone can point a form at a public email address, but nothing from it is delivered unless the owner activates it.
- **If FormSubmit's emails land in Spam**, mark them **Not spam** so the next ones reach the inbox.
- **To change the address enquiries go to**, change `business.email` in `src/data.js` (it's also the address shown on the site), deploy, and activate again from the new mailbox. To stop FormSubmit delivering to an address, use **Request Deactivation** on [formsubmit.co/help](https://formsubmit.co/help).

## Spam and privacy

- A hidden field catches bots that fill in every field: they are told it worked, and nothing is sent. FormSubmit also filters spam.
- Enquiries pass through FormSubmit, a third-party service, which keeps submissions for 30 days (that's how it can deliver ones sent before activation). The website itself doesn't store them. The form tells visitors "It's emailed to mmprestigemotors@gmail.com. We only use your details to reply to you." If the dealership publishes a privacy policy, it should mention that enquiries are emailed through FormSubmit.

## For developers

- The form is `Enquiry` in `src/main.jsx`. It posts JSON to `https://formsubmit.co/ajax/mmprestigemotors@gmail.com` (`ENQUIRY_ENDPOINT`, built from `business.email`) with the fields `name`, `phone`, `email` (FormSubmit makes it the email's Reply-To), `car`, `message` and `page`, and FormSubmit's settings `_subject`, `_template: "table"` and `_captcha: "false"`. A reply of `{"success":"true"}` shows the thank-you. Anything else (not activated, an error, no connection, or no answer within 20 seconds) shows the email and SMS options.
- The request is sent with `referrerPolicy: "origin"`, so FormSubmit always sees the site's address rather than the page's, which keeps the site to one activation. FormSubmit's CORS headers allow the JSON request from any site.
- After activation, FormSubmit also sends a random alias for the address. It can replace the address in `ENQUIRY_ENDPOINT` to keep it out of the page's code, though the address is shown on the site anyway.
- There's no server code for enquiries. The browser tests (`npm test`) answer FormSubmit's requests inside the browser: on the main page the way it answers before activation, and in their own check as a success, a not-activated reply and no connection. So the tests never send a real enquiry, even against the live site.
