# MM Prestige Motors design references

## Evidence and access limitations

The supplied business profile describes MM Prestige Motors as a Wingfield, South Australia dealer specialising in HSV, Holden Commodore, prestige and performance vehicles. The supplied stock-page example establishes a filter sidebar, sortable card grid, visible pricing and key specifications. The hand-drawn vehicle page establishes a large photo carousel with thumbnails on the left and vehicle summary, price, finance, telephone and location on the right.

Read-only HTTPS requests to the following reference candidates were attempted through the cloud environment's configured proxy on 9 October 2026:

- Dutton Garage — https://duttongarage.com/
- Romans International — https://www.romansinternational.com/
- Hexagon Classics — https://www.hexagonclassics.com/

All three failed with `Tunnel connection failed: 403 Forbidden`. The environment's HTTP allowlist contains package and source-code hosts but does not list these dealership domains. No page content or screenshots were retrieved, so the recommendations below are design judgements and are not claimed as findings from these websites. The domains can be added to environment settings to enable a later live review.

## Recommended visual direction

Use photography as the dominant element: a dramatic home-page hero, generous landscape inventory images and a large gallery on vehicle pages. Keep navigation compact and enquiries prominent. Pair bold, condensed performance-oriented headings with restrained body typography, clear specification rows and ample whitespace. The owner's supplied reviews can support an understated trust section, without inventing additional reviews or ratings.

The stock page should provide Available / Sold / All choices, make and price filters, keyword search and useful sorting. Sold vehicles should have explicit status badges and a path back to available stock. On a vehicle page, retain the sketch's two-column layout on desktop, move the summary below the gallery on mobile, and offer thumbnail selection, previous/next controls and a photo count.

## Three palette proposals

| Palette | Dark | Page / text | Accent | Supporting tone | Rationale |
| --- | --- | --- | --- | --- | --- |
| Performance red | `#111113` | `#FFFFFF` | `#D71920` | `#F1F1F0` | Requested direction; strong motorsport associations and clear enquiry actions. |
| Midnight blue | `#101A2B` | `#FFFFFF` | `#235ED6` | `#EAF0F7` | A cooler, contemporary option suited to performance specifications and polished showroom photography. |
| Racing green | `#102B25` | `#F7F4EC` | `#A67A38` | `#E9E5D9` | A warmer boutique option with classic motoring associations, suitable for collectible Australian muscle cars. |

Use dark filled buttons with white text or white filled buttons with dark text where appropriate. Bronze should be decorative or paired with dark text; avoid assuming every accent/text combination meets accessibility contrast. Retain a separate semantic red for alerts and sale-status communication in the alternative palettes.

## Prototype content boundaries

Vehicle specifications, prices and photos are sample content until the dealer supplies current inventory. Generic photographs should be labelled as illustrative; do not imply they depict the exact listed HSV or Holden. Contact details and review wording may be taken from the user's supplied profile. Do not invent finance terms, opening days, warranty promises or dealer licence details.

The implemented red accent is `#D52C33`. Racing green uses a darker bronze `#946B2E` for small white button text (4.77:1 contrast against white); decorative palette swatches retain the warmer original proposal.
