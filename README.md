# MM Prestige Motors website concept

A responsive boutique performance dealership website with a home page, searchable available/sold stock and individual vehicle pages. Built with React, Vite and React Router. Fonts and images are local, so the preview does not depend on external image or font services.

## Run

Node.js 20.19+ or 22.12+ is required (validated with Node 24).

```sh
npm ci
npm run dev
```

To make and serve a production build:

```sh
npm run build
npm run preview
```

When deploying to static hosting, configure all non-file requests to fall back to `index.html` so direct `/stock` and `/stock/:id` links work.

## Vercel deployment

Import this directory as a Vite project, or deploy with the Vercel CLI from the repository root. `vercel.json` builds the app with `npm run build`, publishes only `dist`, and routes direct page links through `index.html`. Vercel project metadata is ignored by Git. Supply deployment credentials through the CLI or environment settings; never save them in repository files.

## Pages and interactions

- `/`: photo-led home page, featured stock, dealer story, supplied customer reviews, call CTA.
- `/stock`: available/sold/all collections; model search; make, body, transmission and price filters; sorting; saved cars.
- `/stock/:id`: carousel with thumbnails and fullscreen viewing; overview/specification tabs; price, illustrative repayment calculator, enquiry, phone and location.
- The floating **Colour palettes** control switches between Performance red (black/white/red), Midnight blue (navy/silver/cobalt) Racing green (forest/ivory/bronze), and Commodore SS (black/silver/Holden-inspired red). The choice and saved cars persist in the browser.

## Stock management concept

Open `/stock-manager` for an interactive presentation of a Telegram stock assistant beside a dealership website preview. Try **Add new vehicle**, **Update listing**, or **Mark vehicle sold**. The add flow accepts a photo album, demonstrates a registration/state lookup, supports manual vehicle details, and asks for kilometres and price before a final publish confirmation. Use **Reset demo** to restore the original sample inventory.

Registration lookup and publishing are simulated. Uploaded photos stay in the browser, and changes affect only the concept preview; the public stock pages are unchanged. A real Telegram bot, vehicle-data provider, stock database and publishing service would be separate implementation work.

With the development server running, validate the concept with `npm run test:stock-manager`.

## Dealership CRM mockup

Open `/crm` for a one-page customer and sales pipeline mockup. The customer list and pipeline board share editable stages from **New enquiry** through **Test drive**, **Deposit paid** and **Delivered**. Open a customer to see their vehicle interest, trade-in and finance context, add comments, or set their next follow-up. Leads can also be moved by dragging cards between pipeline columns. Search, stage filters, new enquiries and **Reset demo** are interactive.

All customers are samples and edits stay in this page until it is refreshed or reset. Follow-up dates and times use the dealership's Adelaide timezone. No messages are sent or real customer records changed. With the development server running, validate with `npm run test:crm`.

## Client presentation

Open `/presentation/` for a six-slide walkthrough of the customer website, Telegram stock assistant and dealership CRM. Arrow keys and on-screen controls move between slides; **Read all** provides a responsive reading view, and **Try the demos** links to the working previews. The presentation uses actual interface screenshots and distinguishes the interactive concepts from the live connections still to be implemented.

The email attachment is [`MM-Prestiege-Motors-Presentation.pdf`](public/presentation/MM-Prestiege-Motors-Presentation.pdf), also available as a [public GitHub download](https://raw.githubusercontent.com/13V/mmprestiege/main/public/presentation/MM-Prestiege-Motors-Presentation.pdf). The prepared text is in [`docs/presentation/email-draft.md`](docs/presentation/email-draft.md); the [email draft file](docs/presentation/MM-Prestiege-Motors-Email-Draft.eml) includes the PDF attachment and leaves the recipient unset. No email has been sent. Rebuild the PDF and email file after editing the presentation, screenshots or email text with `npm run presentation:build`. The exporter uses the same Chromium setup as the browser checks and needs no running web server. Production hosting has not been verified; the PDF and email draft are ready for use independently of hosting.

## Content

Sample vehicle data is in `src/data.js`; photo assets are in `public/images`. Business address, phone and review excerpts come from the user's supplied MM Prestige Motors profile. All inventory, vehicle specifications, prices and generic photographs are illustrative; replace them with verified dealer-owned content before launch. The preview's photographs do not depict the sample HSV/Holden listings.

The enquiry form prepares a message and opens an SMS link to the supplied dealer number. It does not silently submit to a backend or claim delivery. Call and Google Maps links use the supplied business details. The map graphic is schematic, not live mapping.

The repayment calculator is illustrative, excludes fees/balloons and does not represent a finance offer. Confirm actual finance facilities and required disclosures before using it commercially.

## Design references

The stock sidebar/grid and vehicle gallery/right-hand summary follow the user's references. See [design notes](docs/design-research.md) and [photo sources](docs/photo-sources.md). Live boutique-site research was blocked by the environment's network policy; the two alternative palettes are design recommendations, not claims about inspected websites.

## Browser validation

With `npm run dev` running in another terminal, run `npm test`. The suite covers 29 stock, gallery, enquiry, palette, mobile and layout checks. It uses system Chromium when present; otherwise install Chromium with `npx playwright install chromium`. Override the server URL with `MM_BASE_URL` and the browser executable with `MM_CHROMIUM_PATH` if needed. Screenshots and a results JSON are written to the ignored `.screenshots/` directory.

The stock page uses the full viewport width, with filters against the left edge and three large vehicle columns on wide screens. Card titles sit above photos, following the supplied dealer reference. The home page prioritises stock, showroom contact details and customer reviews.

Vehicle detail pages also use the full viewport width. The Commodore SS palette adds black navigation, silver surfaces and red trim; it is an independent visual theme inspired by the car, rather than an official Holden paint specification.
