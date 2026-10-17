# Stock manager

The stock manager at **`/stock/manage`** is where Madi adds and updates the cars on the website. A car starts from its rego and state (or its VIN): the details fill themselves in from the rego record, Madi checks them, adds photos, the price and kilometres, and puts the car on the website. About a minute later it's live, with its own page and link preview.

Until the first car is put on the website, the site keeps showing the sample listings.

## Switching it on

It needs four settings in Vercel. Each takes a minute. In the Vercel dashboard, open the **mmprestiege** project.

### 1. A sign-in password

**Settings → Environment Variables → Add**

| Name | Value |
| --- | --- |
| `STOCK_ADMIN_PASSWORD` | A passphrase of at least 10 characters, e.g. three or four random words |

Changing it later signs out every device.

### 2. Storage for cars and photos

**Storage → Create → Blob**

- Name it, e.g. `mm-stock`, and pick the **Sydney** region.
- Choose **Public** access. Photos are shown on the website, so the store must be public; the stock record itself is still kept at an address nobody can guess, and rego and VIN details never appear on the website.
- **Connect** the store to the mmprestiege project, for all environments. Vercel adds the store's settings (`BLOB_STORE_ID` and a token) by itself.

### 3. Automatic website updates

**Settings → Git → Deploy Hooks**

- Create a hook named `Stock manager` for the `main` branch and copy its URL.
- Add it as an environment variable:

| Name | Value |
| --- | --- |
| `STOCK_DEPLOY_HOOK_URL` | The deploy hook URL |

Without it, changes are saved but only appear after the next deploy.

### 4. Rego lookup

The lookup uses [CarRegistrationAPI](https://www.carregistrationapi.com.au/), which covers all eight states and territories.

- Register on their site. Once your email is verified you get a test account with 10 free lookups.
- Lookups cost AUD $0.30 each, bought in packs of 100 (10% off packs over 1,000). Top up and set a low-balance email warning in their dashboard.
- Add your account's username as an environment variable:

| Name | Value |
| --- | --- |
| `REGCHECK_USERNAME` | Your CarRegistrationAPI username |

Without it, the stock manager still works; the details are just typed in by hand.

### Then redeploy

**Deployments → the latest → Redeploy**, so the new settings take effect. Open `/stock/manage`: if anything is still missing, the page shows a checklist.

## Using it

1. **Add a car.** Enter the rego and tap the state it's registered in (or switch to VIN). Tap **Find the car**.
2. **Check what it found.** The result shows what the rego record says. If the car is already in your stock, or recorded as stolen, it says so.
3. **Use these details.** The form opens with the found details marked "from rego". What the record didn't include is listed at the top.
4. **Add photos.** Take them or pick them from the library. The first photo is the cover; use the arrows to reorder. Photos are resized on the phone before upload, and their location data is removed.
5. **Fill in the rest:** variant, gearbox, engine, kilometres, price and a description. A tag such as JUST ARRIVED is optional.
6. **Put on the website**, or **Save draft** to finish later.

Later, open a car to change it, **Mark as sold** (it moves to the sold cars on the website), put it **Back on sale**, or **Delete** it with its photos.

The first time, **Copy in the current listings** brings the six sample listings in as drafts with their real photos. Correct each one's price, kilometres and details before putting it on the website; they keep their current web addresses.

### What the rego record includes

It depends on the state. For South Australia the record gives the make, model, year, body, colour, VIN, rego expiry and CTP insurer, but not the variant, gearbox or engine, so those are always typed in. NSW, Tasmania and WA give the full specification but no colour or real VIN. VIC, QLD, the ACT and the NT give less again. Always check the details against the car: the year is the year of first registration.

Looking up the same car again within 30 days uses the saved answer and costs nothing.

## How it works

| Part | Where |
| --- | --- |
| The page | `src/admin/StockAdmin.jsx`, `src/admin/stock-admin.css`, photo resizing in `src/admin/photos.js` |
| The API (`/api/stock?op=…`) | `api/stock.js` on Vercel, logic in `server/stock/` (also used by the dev server) |
| Rego lookups | `server/stock/lookup.js` (provider and caching), `server/stock/normalize.js` (each state's record to listing fields) |
| Storage | `server/stock/stores.js`: Vercel Blob in production, a folder in development |
| Records and what's public | `server/stock/records.js` |
| Getting cars onto the website | `scripts/stock-snapshot.mjs` runs before each build; `scripts/stock-source.mjs` and `src/stock.js` give the pages their cars |

- **Storage.** The stock (drafts included) is one JSON record in the Blob store, created once with a random suffix so its address can't be guessed, and updated with its ETag so two devices can't overwrite each other's changes. Each save also keeps a dated copy (the latest 40) for recovery. Photos are public blobs in `stock/photos/`; lookups are cached in `stock/lookups/`.
- **Publishing.** A save that touches a car on the website calls the deploy hook. The build reads the stock record, writes the website's view of it (cars on the website only, with no rego, VIN, expiry or lookup details) and generates every page, link preview and the sitemap from it. If the store can't be read, the build fails and Vercel keeps the last good version live.
- **Photos.** The browser makes WebP copies at 480, 960, 1600 and 2400 px (JPEG where WebP isn't supported) and a 1200 × 630 crop for link previews, then uploads each photo in one request.
- **Security.** One password, compared in constant time; repeated wrong guesses from one address are locked out for up to 15 minutes. The session is an HttpOnly, SameSite=Strict cookie scoped to the API and signed with a key derived from the password. Every change also needs a custom header, which other websites can't send. Uploads must really be JPEG or WebP. The page and API are kept out of search engines.

### Changing the lookup provider

Blue Flag and RedBook (carsales) are authorised brokers of the national register (NEVDIS); RedBook can also match the exact variant. To use one, add a provider in `server/stock/lookup.js` with `byRego(rego, state)` and `byVin(vin)` methods, and normalise its records the way `normaliseRegCheck` does. The page shows whatever fields come back.

## Development

`npm run dev`, then open `/stock/manage`. The password is `mm-dev-password` (or `STOCK_ADMIN_PASSWORD` if set). Cars are saved in `.stock/dev` (delete the folder to start again), and lookups use sample records:

| Rego / VIN | State | Gives |
| --- | --- | --- |
| S123ABC | SA | 2016 HSV GTS, the SA fields |
| YY819H | SA | Mitsubishi Pajero |
| BEW76P | NSW | Ford Fairmont with full specification |
| ZZA271 · STOLEN1 | VIC | Hyundai · a car recorded as stolen |
| 949RWP | QLD | Hyundai Accent |
| E09FK · ZM06WA | TAS · WA | Mazda CX-5 · Mazda6 |
| YYF447 · CB78MH | ACT · NT | Mercedes-Benz · Toyota Prado |
| NOCREDIT · BADUSER | any | Out-of-credit and wrong-account messages |
| 6G1FK5EP0GL303518 | (VIN) | 2016 Holden Commodore |

Set `REGCHECK_USERNAME` to use live lookups in development. Publishing reloads open website pages instead of rebuilding. While `.stock/dev` has published cars, the website in the dev server shows them, so clear it before running `npm test` (which expects the sample listings).

`npm run test:stock` checks the lookups, records, sessions and storage, then runs the stock manager in a browser against its own temporary store.

## Limits

- Up to 40 photos per car. Photos uploaded to a car that is then never saved stay in storage.
- Each save that changes the website starts a new build, about a minute each.
- The rego lookup provider queries state records live; if a state's service is down, enter the details by hand.
