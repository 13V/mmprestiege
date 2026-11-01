# Stock manager

The stock manager at **`/stock/manage`** is where the dealership adds and updates the cars on the website. A car's details are typed in by hand: year, make, model and the rest, then photos, the price and kilometres. Put it on the website and about a minute later it's live, with its own page and link preview.

Until the first car is put on the website, the site keeps showing the sample listings (marked as samples). The first published car replaces them, and the sample notes disappear by themselves.

For the owner, [the owner's guide](owner-guide.md) covers day-to-day use in plain language. This page covers setup and how it works.

## Switching it on

It needs three settings in Vercel. Each takes a minute. In the Vercel dashboard, open the **mmprestiege** project.

### 1. A sign-in password

**Settings → Environment Variables → Add**

| Name | Value |
| --- | --- |
| `STOCK_ADMIN_PASSWORD` | A passphrase of at least 10 characters, e.g. three or four random words |

Changing it later signs out every device.

### 2. Storage for cars and photos

**Storage → Create → Blob**

- Name it, e.g. `mm-stock`, and pick the **Sydney** region.
- Choose **Public** access. Photos are shown on the website, so the store must be public; the stock record itself is kept at an address nobody can guess, and the private details (rego, VIN, rego expiry) never appear on the website.
- **Connect** the store to the mmprestiege project, for all environments. Vercel adds the store's settings (`BLOB_STORE_ID` and a token) by itself.

### 3. Automatic website updates

**Settings → Git → Deploy Hooks**

- Create a hook named `Stock manager` for the `main` branch and copy its URL.
- Add it as an environment variable:

| Name | Value |
| --- | --- |
| `STOCK_DEPLOY_HOOK_URL` | The deploy hook URL |

Without it, changes are saved but only appear after the next deploy.

### Then redeploy

**Deployments → the latest → Redeploy**, so the new settings take effect. Open `/stock/manage`: if anything is still missing, the page shows a checklist.

## Using it

1. **Add a car.** Tap **Add a car**: the form opens straight away.
2. **Add photos.** Take them or pick them from the library. The first photo is the cover; use the arrows to reorder. Photos are resized on the phone before upload, and their location data is removed.
3. **Fill in the details:** year, make and model (required), then variant, body, colour, gearbox, engine, fuel, power and kilometres.
4. **Price and listing:** the price, an optional tag on the photo (such as JUST ARRIVED) and a description.
5. **Registration (private):** the rego, state, rego expiry and VIN, if you want them on record. None of it shows on the website. A stock number is given automatically (MM101, MM102, …) unless you type one.
6. **Put on the website**, or **Save draft** to finish later.

Later, open a car to change it, **Mark as sold** (it moves to the sold cars on the website), put it **Back on sale**, or **Delete** it with its photos.

The first time, **Copy in the current listings** brings the six sample listings in as drafts with their real photos. Correct each one's price, kilometres and details before putting it on the website; they keep their current web addresses.

## How it works

| Part | Where |
| --- | --- |
| The page | `src/admin/StockAdmin.jsx`, `src/admin/stock-admin.css`, photo resizing in `src/admin/photos.js` |
| The API (`/api/stock?op=…`) | `api/stock.js` on Vercel, logic in `server/stock/` (also used by the dev server) |
| Storage | `server/stock/stores.js`: Vercel Blob in production, a folder in development |
| Records and what's public | `server/stock/records.js` |
| Getting cars onto the website | `scripts/stock-snapshot.mjs` runs before each build; `scripts/stock-source.mjs` and `src/stock.js` give the pages their cars |

- **Storage.** The stock (drafts included) is one JSON record in the Blob store, created once with a random suffix so its address can't be guessed, and updated with its ETag so two devices can't overwrite each other's changes. Each save also keeps a dated copy (the latest 40) for recovery. Photos are public blobs in `stock/photos/`.
- **Publishing.** A save that touches a car on the website calls the deploy hook. The build reads the stock record, writes the website's view of it (cars on the website only, with no rego, VIN or expiry) and generates every page, link preview and the sitemap from it. If the store can't be read, the build fails and Vercel keeps the last good version live.
- **Photos.** The browser makes WebP copies at 480, 960, 1600 and 2400 px (JPEG where WebP isn't supported) and a 1200 × 630 crop for link previews, then uploads each photo in one request.
- **Security.** One password, compared in constant time; repeated wrong guesses from one address are locked out for up to 15 minutes. The session lasts 30 days in an HttpOnly, SameSite=Strict cookie scoped to the API and signed with a key derived from the password. Every change also needs a custom header, which other websites can't send. Uploads must really be JPEG or WebP. The page and API are kept out of search engines, and the page can't be shown inside another site's frame.

## Development

`npm run dev`, then open `/stock/manage`. The password is `mm-dev-password` (or `STOCK_ADMIN_PASSWORD` if set). Cars are saved in `.stock/dev` (delete the folder to start again; `STOCK_DEV_DIR` picks another folder). Publishing reloads open website pages instead of rebuilding. While `.stock/dev` has published cars, the website in the dev server shows them, so clear it (or point `STOCK_DEV_DIR` at an empty folder) before running `npm test`, which expects the sample listings.

`npm run test:stock` checks the records, sessions, storage and the API's guards, then runs the stock manager in a browser against its own temporary store.

## Limits

- Up to 40 photos per car. Photos uploaded to a car that is then never saved stay in storage.
- Each save that changes the website starts a new build, about a minute each.
