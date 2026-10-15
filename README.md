# MM Prestige Motors website concept

A responsive boutique performance dealership website with a home page, searchable available/sold stock and individual vehicle pages. Built with React, Vite and React Router. The public pages use the showroom design from the Impulse Automotive concept, adapted for MM Prestige Motors in black and red. Fonts and images are local, so the preview does not depend on external image or font services.

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

- `/`: full-width studio hero with make, model, budget and availability search; specialties lettering; "What we offer" service panels; a featured stock carousel with in-stock/sold/all tabs; a sell-your-car banner; supplied customer reviews; showroom contact and location.
- `/stock`: a hero slab with keyword search and sorting, then available/sold/all pill tabs, make and body pills, transmission and price filters (a drawer on phones), saved cars, the car grid and a call-Madi banner. Hero searches from the home page arrive with their make, model and budget already applied.
- `/stock/:id`: a hero slab with the car photo, price card, facts bar and enquiry action; thumbnails and fullscreen viewing (available cars have two photos, sold cars one, and single photos have no carousel controls); an overview with highlights, a gallery panel and an enquiry panel; specifications; pricing with the illustrative repayment calculator beside the showroom map; and more cars from the collection.
- Unknown routes and cars show the same hero slab with a link back to stock.
- The website uses the black and red theme, with charcoal panels, keyboard-accessible themed dropdowns and locally hosted Big Shoulders Display headings. Saved cars persist in the browser.

## Stock management concept

Open `/stock-manager` for an interactive presentation of a Telegram stock assistant beside a dealership website preview. Try **Add new vehicle**, **Update listing**, or **Mark vehicle sold**. The add flow accepts a photo album, demonstrates a registration/state lookup, supports manual vehicle details, and asks for kilometres and price before a final publish confirmation. Use **Reset demo** to restore the original sample inventory.

Registration lookup and publishing are simulated. Uploaded photos stay in the browser, and changes affect only the concept preview; the public stock pages are unchanged. A real Telegram bot, vehicle-data provider, stock database and publishing service would be separate implementation work.

With the development server running, validate the concept with `npm run test:stock-manager`.

## Dealership CRM mockup

Open `/crm` for a one-page customer and sales pipeline mockup. The customer list and pipeline board share editable stages from **New enquiry** through **Test drive**, **Deposit paid** and **Delivered**. Open a customer to see their vehicle interest, trade-in and finance context, add comments, or set their next follow-up. Leads can also be moved by dragging cards between pipeline columns. Search, stage filters, new enquiries and **Reset demo** are interactive.

All customers are samples and edits stay in this page until it is refreshed or reset. Follow-up dates and times use the dealership's Adelaide timezone. No messages are sent or real customer records changed. With the development server running, validate with `npm run test:crm`.

## Client presentation

Open `/presentation/` for a six-slide walkthrough of the customer website, Telegram stock assistant and dealership CRM. Arrow keys and on-screen controls move between slides; **Read all** provides a responsive reading view, and **Try the demos** links to the working previews. The presentation uses actual interface screenshots and distinguishes the interactive concepts from the live connections still to be implemented. Its website screenshots show the previous public-site design; retake `public/presentation/assets/website-*.jpg` and rebuild if the presentation should show the current one.

The email attachment is [`MM-Prestige-Motors-Presentation.pdf`](public/presentation/MM-Prestige-Motors-Presentation.pdf), also available as a [public GitHub download](https://raw.githubusercontent.com/13V/mmprestiege/main/public/presentation/MM-Prestige-Motors-Presentation.pdf). The prepared text is in [`docs/presentation/email-draft.md`](docs/presentation/email-draft.md); the [email draft file](docs/presentation/MM-Prestige-Motors-Email-Draft.eml) includes the PDF attachment and leaves the recipient unset. No email has been sent. Rebuild the PDF and email file after editing the presentation, screenshots or email text with `npm run presentation:build`. The exporter uses the same Chromium setup as the browser checks and needs no running web server. Production hosting has not been verified; the PDF and email draft are ready for use independently of hosting.

## Content

Sample vehicle data is in `src/data.js`; photo assets are in `public/images`. The silver convertible hero, white SUV cutout and silver supercar banner are generated illustrative campaign images carried over from the Impulse concept; they do not depict MM Prestige stock or premises. The hero and sell-your-car banner carry a visible "Illustrative campaign imagery" caption; the "Next up." panel's SUV is identified as illustrative only in its alt text. Replace all three before launch. The specialties strip uses lettering rather than manufacturer logos and does not claim current inventory. Business address, phone and review excerpts come from the user's supplied MM Prestige Motors profile. All inventory, vehicle specifications, prices and generic photographs are illustrative; replace them with verified dealer-owned content before launch. The preview's photographs do not depict the sample HSV/Holden listings.

The enquiry form prepares a message and opens an SMS link to the supplied dealer number. It does not silently submit to a backend or claim delivery. Call and Google Maps links use the supplied business details. The map graphic is schematic, not live mapping.

The repayment calculator is illustrative, excludes fees/balloons and does not represent a finance offer. Confirm actual finance facilities and required disclosures before using it commercially.

## Design references

The public pages adapt the showroom design developed for the Impulse Automotive concept: charcoal surfaces, condensed uppercase Big Shoulders Display headings, a studio hero with working search, staggered service panels, compact inventory cards, a sell-your-car banner and a rounded white footer. Its yellow controls are recoloured to MM's red. A deeper red (`#d42536`) sits behind white button text for at least 4.5:1 contrast, and a lighter red (`#f45b67`) is used for small text on charcoal; the `--accent` token remains `#ed3545`. The red tokens (`--accent`, `--accent-strong`, `--accent-text` and their hover variants) are set in `src/direction.css`; other MM-specific styles, including the reviews section, specialties lettering and the admin heading font, are in `src/mm-prestige.css`. Every public page follows the home page's layout rules: it opens with a rounded hero slab under the overlaid header (footnote top-left, a light info card, a display title and a glass control bar), and its sections reuse the home page's headings, offer panels, info cards, map, pill tabs and car cards on the same 4% gutter. The stock and vehicle page styles are in `src/inner-pages.css`, and the display typeface sizes for every page are in `src/typeface.css`. Small placeholder photos are shown whole on a blurred stage rather than stretched; dealer photography fills the vehicle hero like the home hero. See [design notes](docs/design-research.md) and [photo sources](docs/photo-sources.md). Live boutique-site research was blocked by the environment's network policy; the two alternative palettes are design recommendations, not claims about inspected websites.

## Browser validation

With `npm run dev` running in another terminal, run `npm test`. The suite covers 44 checks: branding and contact details, the black and red theme, sample-content disclosures, the CRM and stock-manager routes, hero search and themed dropdowns, the featured carousel, reviews, stock filters and sorting, saved cars, the vehicle hero gallery and lightbox, specifications, finance, enquiries, the 404 page, keyboard focus, reduced motion, mobile navigation and filters, overflow at 360/390/768px, wide-screen layout, image loading and runtime errors. It uses system Chromium when present; otherwise install Chromium with `npx playwright install chromium`. Override the server URL with `MM_BASE_URL` and the browser executable with `MM_CHROMIUM_PATH` if needed. Screenshots and a results JSON are written to the ignored `.screenshots/` directory.

Standalone CRM, stock-management and presentation concepts retain their existing routes, content and styling.
