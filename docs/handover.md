# Hand-over checklist

Where things stand (1 November 2026): the website is live at **https://mmprestigemotors.vercel.app**, in the **mmprestigemotors** Vercel project in Troy's projects (Pro plan), and the stock manager is switched on and tested. What's left is ticked off below, in order.

## 1. Hosting

- [x] **On a paid plan.** The project is in Troy's projects, on Pro (Vercel's free Hobby plan is for non-commercial use).
- [ ] **Retire the old project.** The site used to be deployed from an `mmprestiege` project in another Vercel account. Delete it once you're happy, so each push doesn't build twice. Until then, its address, `mmprestiege.vercel.app`, redirects to the new one (a host rule in `vercel.json`). If Vercel lets you add that address to the new project afterwards (**Settings → Domains**), the same rule keeps old links redirecting.
- [ ] **Who owns the accounts.** Decide whether the dealership gets its own Vercel project and GitHub repository (both can be transferred) or you keep hosting it for them. If it moves, check sections 2 and 3 again afterwards.

## 2. Stock manager: done

- [x] `STOCK_ADMIN_PASSWORD` is set (production and preview). Give it to the owner in person. To change it: **Settings → Environment Variables**, edit it, then redeploy; that signs out every device.
- [x] A public Blob store, `mmprestigemotors-stock`, in Sydney, is connected to the project (`BLOB_READ_WRITE_TOKEN`).
- [x] A deploy hook, **Stock manager**, for `main` is set as `STOCK_DEPLOY_HOOK_URL`, so saved changes go live by themselves.
- [x] Tested on the live site: signing in (and a wrong password refused), uploading a photo, putting a car on the website, editing it straight away, the website rebuilding with the change, and deleting it. The test data has been removed, so the stock starts empty.

[Stock manager](stock-manager.md) has the details.

## 3. Enquiry email (to do)

Enquiries are emailed to mmprestigemotors@gmail.com once the dealership's Gmail has an app password. Until then, visitors send them from their own email or as a text, so nothing is lost. [Enquiries](enquiries.md) has the steps.

- [ ] With the owner, create the app password in his Google account (it needs 2-Step Verification).
- [ ] Add it as `ENQUIRY_EMAIL_APP_PASSWORD` (production) and redeploy.
- [ ] `https://mmprestigemotors.vercel.app/api/enquiry` shows `"email":true`.
- [ ] Send a test enquiry from the website and check it arrives.

## 4. Web address (optional)

- [ ] To use the dealership's own domain, add it in Vercel (**Settings → Domains**) and follow Vercel's DNS instructions.
- [ ] Redeploy. Canonical links, the sitemap, link previews and the link in enquiry emails use the project's production domain by themselves; to pin a different address, set `SITE_URL` (for example `https://www.example.com.au`).
- [ ] Update the web address at the top of the [owner's guide](owner-guide.md).

## 5. Run-through with the owner

- [ ] On his phone: open `mmprestigemotors.vercel.app/stock/manage`, sign in, and add it to his home screen.
- [ ] Add one real car with photos and put it on the website. After about a minute, check it on the website: the sample listings are gone and his car is there. (Or copy in the sample listings, correct one and publish it.)
- [ ] Try Mark as sold and Back on sale, then leave the stock as he wants it.
- [ ] Give him the [owner's guide](owner-guide.md), and the password in person.

## What changed for delivery

- **New home on Vercel.** The site now deploys from the `mmprestigemotors` project in Troy's projects, from the same GitHub repository (`13V/mmprestiege`, branch `main`), with its functions in Sydney.
- **Rego lookup removed.** Cars are typed in by hand. The paid CarRegistrationAPI lookup, its setting, caching and sample records are gone; the rego, state, expiry and VIN stay as optional private notes.
- **Stock records never go stale.** Each save writes a new record rather than overwriting one, because Vercel's CDN could serve the old stock for a minute or two after a save, which made a quick second save fail and could have left a new car off the rebuilt site.
- **Pitch demos removed.** `/crm`, `/stock-manager`, `/presentation` and the pitch email draft are no longer part of the site; they now show the not-found page. They remain in Git history.
- **Stock manager tidied.** Add a car opens the form straight away; the rego and VIN show in capitals as they're typed; leaving an untouched new car doesn't ask first; automatic website updates is now a normal setup step rather than optional.
- **Kept as it was:** the password-protected PDF at `/downloads/private-document-97d48df5a3a04ce3bf6c7311b987a1d6.pdf` (added 9 Oct, not linked from the site, hidden from search engines). Delete it if it's no longer needed.

## Good to know

- Until the first real car is published, the website shows six sample listings, labelled as samples. When real stock goes on, the sample labels and "sample listing" link previews go, and the cars' details are given to search engines, by themselves.
- Every save that changes a car on the website starts a Vercel build, about a minute each.
- The repayment calculator is illustrative and says so. Confirm the dealership's actual finance arrangements and any required disclosures before relying on it.
