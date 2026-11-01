# Hand-over checklist

What's left to do before MM Prestige Motors takes over the website, in order. The website itself is finished and live at **mmprestiege.vercel.app**; these are settings in Vercel and Google, plus a run-through with the owner.

## 1. Hosting

- [ ] **Vercel plan.** Vercel's free Hobby plan is for personal, non-commercial use, and a dealership's website is commercial, so the project belongs on a paid (Pro) plan.
- [ ] **Who owns the accounts.** Decide whether the dealership gets its own Vercel project and GitHub repository (both can be transferred) or you keep hosting it for them. If it moves, check sections 2 and 3 again afterwards.

## 2. Stock manager

Three Vercel settings switch it on; [stock manager](stock-manager.md#switching-it-on) has the steps.

- [ ] `STOCK_ADMIN_PASSWORD`: a passphrase of at least 10 characters.
- [ ] A **public** Blob store in the Sydney region, connected to the project.
- [ ] `STOCK_DEPLOY_HOOK_URL`: a deploy hook for `main`, so saved changes go live by themselves.
- [ ] If `REGCHECK_USERNAME` was ever added, delete it. The rego lookup has been removed: details are typed in.
- [ ] Redeploy, then open `/stock/manage`. It should show **Sign in**, not the setup checklist.

## 3. Enquiry email

Enquiries are emailed to mmprestigemotors@gmail.com once the dealership's Gmail has an app password. Until then, visitors send them from their own email or as a text, so nothing is lost. [Enquiries](enquiries.md) has the steps.

- [ ] With the owner, create the app password in his Google account (it needs 2-Step Verification).
- [ ] Add it as `ENQUIRY_EMAIL_APP_PASSWORD` and redeploy.
- [ ] `https://mmprestiege.vercel.app/api/enquiry` shows `"email":true`.
- [ ] Send a test enquiry from the website and check it arrives.

## 4. Web address (optional)

- [ ] To use the dealership's own domain, add it in Vercel (**Settings → Domains**) and follow Vercel's DNS instructions.
- [ ] Redeploy. Canonical links, the sitemap and link previews use the project's production domain by themselves; to pin a different address, set `SITE_URL` (for example `https://www.example.com.au`).
- [ ] Update the web address at the top of the [owner's guide](owner-guide.md).

## 5. Run-through with the owner

- [ ] On his phone: open `/stock/manage`, sign in, and add it to his home screen.
- [ ] Add one real car with photos and put it on the website. After about a minute, check it on the website: the sample listings are gone and his car is there. (Or copy in the sample listings, correct one and publish it.)
- [ ] Try Mark as sold and Back on sale, then leave the stock as he wants it.
- [ ] Give him the [owner's guide](owner-guide.md), and the password in person.

## What changed for delivery

- **Rego lookup removed.** Cars are typed in by hand. The paid CarRegistrationAPI lookup, its setting, caching and sample records are gone; the rego, state, expiry and VIN stay as optional private notes.
- **Pitch demos removed.** `/crm`, `/stock-manager`, `/presentation` and the pitch email draft are no longer part of the site; they now show the not-found page. They remain in Git history.
- **Stock manager tidied.** Add a car opens the form straight away; the rego and VIN show in capitals as they're typed; leaving an untouched new car doesn't ask first; automatic website updates is now a normal setup step rather than optional.
- **Kept as it was:** the password-protected PDF at `/downloads/private-document-97d48df5a3a04ce3bf6c7311b987a1d6.pdf` (added 9 Oct, not linked from the site, hidden from search engines). Delete it if it's no longer needed.

## Good to know

- Until the first real car is published, the website shows six sample listings, labelled as samples. When real stock goes on, the sample labels and "sample listing" link previews go, and the cars' details are given to search engines, by themselves.
- Every save that changes a car on the website starts a Vercel build, about a minute each.
- The repayment calculator is illustrative and says so. Confirm the dealership's actual finance arrangements and any required disclosures before relying on it.
