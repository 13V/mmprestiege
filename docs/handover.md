# Hand-over checklist

Where things stand (9 November 2026): the website is live at **https://www.mmprestigemotors.com.au**, from the **mmprestigemotors** Vercel project in the Lumen team, and the stock manager is switched on and tested there. What's left is ticked off below, in order.

## 1. Hosting

- [ ] **Upgrade Lumen to Pro.** Lumen is on Vercel's free Hobby plan, which Vercel limits to non-commercial, personal use. Hobby's Blob allowance (1 GB stored, and 2,000 uploads and listings a month, where each photo is 5 uploads) also runs out at roughly 15 cars' photos a month, after which the stock manager can't save for up to 30 days. Upgrading needs no change to the project.
- [ ] **Retire the old copies.** The site used to deploy from `mmprestigemotors` in Troy's projects (with an empty Blob store, also named `mmprestigemotors-stock`) and, before that, from `mmprestiege` in another account. Both still build from this repository, and host rules in `vercel.json` make their addresses (`mmprestigemotors.vercel.app` and `mmprestiege.vercel.app`) redirect to the new domain. Delete them in a few weeks, once Google has moved over, so each push doesn't build three times; their addresses stop redirecting when they're gone.
- [ ] **Who owns the accounts.** Decide whether the dealership gets its own Vercel project and GitHub repository (both can be transferred) or you keep hosting it for them. If it moves, check sections 2 and 3 again afterwards.

## 2. Stock manager: done

- [x] `STOCK_ADMIN_PASSWORD` is set (production and preview). Give it to the owner in person. To change it: **Settings → Environment Variables**, edit it, then redeploy; that signs out every device.
- [x] A public Blob store, `mmprestigemotors-stock`, in Sydney, is connected to the project (`BLOB_READ_WRITE_TOKEN`).
- [x] A deploy hook, **Stock manager**, for `main` is set as `STOCK_DEPLOY_HOOK_URL`, so saved changes go live by themselves.
- [x] Tested in the Lumen project (9 November): signing in (and a wrong password refused), uploading a photo, putting a car on the website, editing it straight away, the website rebuilding with the change (about a minute), and deleting it. The test data has been removed, so the stock starts empty. The old project's stock manager was empty, so nothing needed copying.

[Stock manager](stock-manager.md) has the details.

## 3. Enquiry email (to do)

Enquiries are emailed to mmprestigemotors@gmail.com by [FormSubmit](https://formsubmit.co): free, with no account, password or Vercel setting. It needs one click from the owner, once. Until then, visitors who send an enquiry are offered their own email or a text instead, so nothing is lost. [Enquiries](enquiries.md) has the details.

- [ ] Send a test enquiry from https://www.mmprestigemotors.com.au (not a preview link). A new address is a new form to FormSubmit, so do this even if the old address was activated. Before activation, the website offers to send it by email or SMS instead; close that.
- [ ] The owner opens FormSubmit's email in mmprestigemotors@gmail.com (check Spam) and taps **Activate Form**.
- [ ] The test enquiry arrives. Send a second one: the website says "We've got it", and it arrives within a minute or two.

## 4. Web address and Google

- [x] **www.mmprestigemotors.com.au is connected.** Its DNS is at GoDaddy: the bare domain's A record points to Vercel, `www` is a CNAME to the bare domain, and Vercel redirects the bare domain to `www`.
- [x] **The site names it as its address.** Canonical links, the sitemap, robots.txt and link previews use `https://www.mmprestigemotors.com.au` (`SITE_URL`, also the build's default), so Google indexes this address. `mmprestigemotors-neon.vercel.app` (the Lumen project's own address) redirects to it as a domain setting, and the older addresses through `vercel.json` (section 1).
- [ ] **Google Search Console.** At [search.google.com/search-console](https://search.google.com/search-console), add a **Domain** property for `mmprestigemotors.com.au` and verify it with the TXT record Google gives you, added in GoDaddy's DNS. Then, under **Sitemaps**, submit `https://www.mmprestigemotors.com.au/sitemap.xml`, and use **URL inspection** on the home page to request indexing. A new site usually appears in Google within a few days to two weeks.
- [ ] **Point profiles at it.** Put `www.mmprestigemotors.com.au` in the dealership's Google Business Profile and its Instagram, TikTok and Facebook bios: they're how most people search for the business by name.

## 5. Run-through with the owner

- [ ] On his phone: open `www.mmprestigemotors.com.au/stock/manage`, sign in, and add it to his home screen (replacing any shortcut to the old address, which now redirects here).
- [ ] Add one real car with photos and put it on the website. After about a minute, check it on the website: the sample listings are gone and his car is there. (Or copy in the sample listings, correct one and publish it.)
- [ ] Try Mark as sold and Back on sale, then leave the stock as he wants it.
- [ ] Give him the [owner's guide](owner-guide.md), and the password in person.

## What changed for delivery

- **New home on Vercel.** The site deploys from the `mmprestigemotors` project in the Lumen team (moved from Troy's projects on 9 November), from the same GitHub repository (`13V/mmprestiege`, branch `main`), with its functions and Blob store in Sydney, at www.mmprestigemotors.com.au.
- **Rego lookup removed.** Cars are typed in by hand. The paid CarRegistrationAPI lookup, its setting, caching and sample records are gone; the rego, state, expiry and VIN stay as optional private notes.
- **Stock records never go stale.** Each save writes a new record rather than overwriting one, because Vercel's CDN could serve the old stock for a minute or two after a save, which made a quick second save fail and could have left a new car off the rebuilt site.
- **Pitch demos removed.** `/crm`, `/stock-manager`, `/presentation` and the pitch email draft are no longer part of the site; they now show the not-found page. They remain in Git history.
- **Enquiries through FormSubmit.** The forms send through FormSubmit rather than the dealership's Gmail, so no Google app password is needed: the owner activates it with one click. The `/api/enquiry` function and its Gmail code are gone.
- **Stock manager tidied.** Add a car opens the form straight away; the rego and VIN show in capitals as they're typed; leaving an untouched new car doesn't ask first; automatic website updates is now a normal setup step rather than optional.
- **Kept as it was:** the password-protected PDF at `/downloads/private-document-97d48df5a3a04ce3bf6c7311b987a1d6.pdf` (added 9 Oct, not linked from the site, hidden from search engines). Delete it if it's no longer needed.

## Good to know

- Until the first real car is published, the website shows six sample listings, labelled as samples. When real stock goes on, the sample labels and "sample listing" link previews go, and the cars' details are given to search engines, by themselves.
- Every save that changes a car on the website starts a Vercel build, about a minute each.
- The repayment calculator is illustrative and says so. Confirm the dealership's actual finance arrangements and any required disclosures before relying on it.
