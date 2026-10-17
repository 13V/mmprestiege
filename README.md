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

The build writes a page for every route with its own title, description, canonical URL and link-preview image: `stock.html`, `stock/<id>.html` for each car, `404.html`, and pages for the admin concepts. It also writes `robots.txt` and `sitemap.xml` (see `scripts/site-pages.mjs`). Absolute URLs use `SITE_URL`, or Vercel's production domain, or `https://mmprestiege.vercel.app`. `npm run preview` serves the build the way Vercel does. On other static hosting, serve `<path>.html` for clean URLs and `404.html` for unknown paths.

## Vercel deployment

Import this directory as a Vite project, or deploy with the Vercel CLI from the repository root. `vercel.json` builds the app with `npm run build`, publishes only `dist` and turns on clean URLs, so `/stock/<id>` is served from `stock/<id>.html` and unknown pages return a real 404 with the site's own not-found page. Hashed assets are cached for a year and photos for a day. Vercel project metadata is ignored by Git. Supply deployment credentials through the CLI or environment settings; never save them in repository files.

## Pages and interactions

- Header: Madi's number (a call button on narrow screens), a saved-cars link with a count once a car is saved, and every page link on desktop; phones use the menu, which also lists saved cars.
- `/`: full-width showroom hero with make, model, budget and availability search; specialties marquee; "What we offer" service panels; a featured stock carousel with in-stock/sold/all tabs; a sell-your-car banner; Meet Madi; supplied customer reviews; showroom contact and location.
- `/stock`: a hero slab with keyword search and sorting, then available/sold/all pill tabs, make and body pills, transmission and price filters (a drawer on phones), saved cars, the car grid and a banner to find a car or call Madi. Cards show the year and variant. Hero searches from the home page arrive with their make, model and budget already applied, and `/stock?saved=1` opens the saved view.
- `/stock/:id`: a classifieds-style listing with a breadcrumb, Save and Share; a large photo stage with swipe, arrows, thumbnails and fullscreen viewing (single photos have no carousel controls); key details, dealer comments and a location card; a side column with the price, the illustrative repayment calculator and an "Ask Madi about finance" link, the specifications and a Call Madi card; a call bar on phones; and more cars from the collection. Sold cars offer the car finder instead.
- Unknown routes and cars show the same hero slab with a link back to stock.
- The website uses the black and red theme, with charcoal panels, keyboard-accessible themed dropdowns and locally hosted Big Shoulders Display headings. Saved cars persist in the browser.
- Motion (`src/motion.css`): pages crossfade, and a car's photo morphs from its card into the listing's photo stage and back again on Back, which also returns the visitor to the same place in the list (view transitions through React Router's data router, in browsers that support them). Hero titles and section headings rise word by word; the home hero photo slowly zooms and its title lifts away as the page scrolls; the specialties run as a slow marquee; the Meet Madi and showroom photos wipe into view; the black Clubsport drives into the red "Next up." panel; hovering a card with a mouse fades in the car's second photo; and once the hero has scrolled away the header floats as a compact frosted bar. Visitors who prefer reduced motion get the static page: no transitions, marquee or scroll effects.

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

Sample vehicle data is in `src/data.js`; photo assets are in `public/images`. Every photo comes from MM Prestige Motors' October 2026 showroom shoot: the home hero, the "Performance" and "Next up." panels, the sell-your-car banner, the stock and 404 heroes, the location card and every listing (see [photo sources](docs/photo-sources.md)). The home page's "Meet Madi" section pairs a portrait from the shoot with the dealership's own wall-sign line, "Driven by trust. Defined by quality.", and the About us and Our story links land on it. Madi's portrait also sits on the Call Madi card on each listing and on the home page's "Talk directly with Madi" tile. Available cars show their merchandising tag (for example "The icon" or "Just arrived") on the card photo. Each sample listing shows a car photographed at the showroom, but its year, price, kilometres and specifications are examples, and the pages say so; replace them with verified details before launch. The specialties strip uses lettering rather than manufacturer logos and does not claim current inventory. Business address, phone and review excerpts come from the user's supplied MM Prestige Motors profile.

The enquiry form prepares a message and opens an SMS link to the supplied dealer number. It does not silently submit to a backend or claim delivery. It has three forms: a general or car enquiry (also used for finance questions), a sell or trade-in form that asks for the car's year, make, model, kilometres, rego, condition and plan, and a car finder that asks for the make and model, years, budget and must-haves. Each builds a tidy SMS message from the answers.

Photos are served as resized WebP files with `srcset`. After adding or replacing photos in `public/images`, run `npm run images` to regenerate `public/images/opt` (480 to 2400 px wide, never upscaled), the 1200 × 630 link-preview crops and `src/image-variants.json`. `npm run share-image` re-renders the branded `public/og-image.png` over the showroom photo, and the app icons. While `sampleStock` in `src/data.js` is `true`, car link previews say "sample listing" and the listings aren't given to search engines as structured data; set it to `false` once the stock and prices are real. Call and Google Maps links use the supplied business details. The location card shows the shopfront on Grand Junction Road and opens Google Maps.

The repayment calculator is illustrative, excludes fees/balloons and does not represent a finance offer. Confirm actual finance facilities and required disclosures before using it commercially.

## Design references

The public pages adapt the showroom design developed for the Impulse Automotive concept: charcoal surfaces, condensed uppercase Big Shoulders Display headings, a showroom hero with working search, staggered service panels, compact inventory cards, a sell-your-car banner and a rounded white footer. Its yellow controls are recoloured to MM's red. A deeper red (`#d42536`) sits behind white button text for at least 4.5:1 contrast, and a lighter red (`#f45b67`) is used for small text on charcoal; the `--accent` token remains `#ed3545`. The red tokens (`--accent`, `--accent-strong`, `--accent-text` and their hover variants) are set in `src/direction.css`; other MM-specific styles, including the reviews section, specialties lettering and the admin heading font, are in `src/mm-prestige.css`. The stock and 404 pages follow the home page's layout rules: each opens with a rounded hero slab under the overlaid header (footnote top-left, a light info card, a display title and a glass control bar), and their sections reuse the home page's headings, offer panels, info cards, map, pill tabs and car cards on the same 4% gutter. Vehicle pages use a classifieds-style listing in the same style. A breadcrumb with Save and Share and the full-width title sit above two columns. On the left are a large photo stage with a thumbnail strip, the key details, dealer comments and a location card; on the right, matching cards hold the price and repayment estimate, the specifications and a Call Madi contact card. Red is kept for actions. On phones the photos come first, then the title, price, key details, comments, specifications and Madi, and a slim bar keeps the price and a Call Madi button at the bottom of the screen. The stock and vehicle page styles are in `src/inner-pages.css`, and the display typeface sizes for every page are in `src/typeface.css`. Listing photos are full-size crops from the shoot (up to 2,400 px wide), so the large stage stays sharp. See [design notes](docs/design-research.md) and [photo sources](docs/photo-sources.md). Live boutique-site research was blocked by the environment's network policy; the two alternative palettes are design recommendations, not claims about inspected websites.

## Browser validation

With `npm run dev` running in another terminal, run `npm test`. The suite covers 56 checks: branding and contact details, the black and red theme, sample-content disclosures, the CRM and stock-manager routes, hero search and themed dropdowns, the featured carousel, reviews, the Meet Madi section and card tags, the specialties marquee and floating header, the card-to-listing photo morph and Back scroll position, stock filters and sorting, saved cars and the header saved-cars link, resized WebP photos, link-preview tags and dealer details, the vehicle photo stage, thumbnails and lightbox, breadcrumb, save and share, the listing layout and phone call bar, specifications, finance, the enquiry, sell/trade-in and car-finder forms, the 404 page, keyboard focus, reduced motion, mobile navigation and filters, overflow at 360/390/768px, wide-screen layout, image loading and runtime errors. It uses system Chromium when present; otherwise install Chromium with `npx playwright install chromium`. Override the server URL with `MM_BASE_URL` and the browser executable with `MM_CHROMIUM_PATH` if needed. Screenshots and a results JSON are written to the ignored `.screenshots/` directory. `npm run test:pages` builds the site and checks the generated pages: per-car titles, canonical URLs and preview images, the 404 page, `robots.txt`, `sitemap.xml` and the Vercel routing.

Standalone CRM, stock-management and presentation concepts retain their existing routes, content and styling.
