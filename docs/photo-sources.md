# Photo and video sources

Every photo and film on the site comes from MM Prestige Motors. The photos are from the dealership's showroom photoshoot: 29 photos supplied by the dealership in October 2026 (original files `MMMOTOR.CWATSON.jpg` and `MMMOTOR.CWATSON-2.jpg` to `-29.jpg`, about 5,800 × 3,900 px). They show the Wingfield showroom, the shopfront on Grand Junction Road and the cars on site that day.

The sample listings are mapped to the photographed cars, so each listing shows its own car. Each listing's year, price, kilometres and specifications are still samples (see `sampleStock` in `src/data.js`).

## Processing

- Crops were cut from the full-size originals, resized to at most 2,400 px wide and saved as JPEG (quality 84). Camera metadata, including any location data, was removed.
- `npm run images` makes the WebP sizes in `public/images/opt` and the 1,200 × 630 link-preview crops from these files.
- `clubsport-cutout.webp` was cut out of shot 20 on this machine with the open-source BiRefNet background-removal model (through `rembg`). No photo was uploaded to an outside service.
- `public/og-image.png` places the wordmark over `showroom-lineup.jpg` (`npm run share-image`).

## Files

Crops are given as fractions of the upright original frame (left, top, right, bottom).

| Local file | Original shot | Crop | Content | Used for |
| --- | --- | --- | --- | --- |
| `showroom-lineup.jpg` | 2 | Full frame | Gold E3 Maloo and red E3 GTS head-on under the wall sign | Home hero, link-preview image |
| `showroom-collection.jpg` | 21 | Full frame | Green Maloo, gold Maloo and red HSVs, with the Gen-F GTS's rear in front | Stock page hero |
| `showroom-doorway.jpg` | 9 | Full frame | Gen-F GTS and black Clubsport inside the open roller door | 404 page hero |
| `showroom-street.jpg` | 13 | Full frame | Shopfront with the MM Prestige sign and address, Maloo R8 and Ferrari 360 outside | Location card |
| `sell-roller-door.jpg` | 15 | Full frame | Maloo R8 and Ferrari 360 outside the open roller door | Sell-your-car banner |
| `performance-gts-rear.jpg` | 21 | 0.519, 0.375, 0.956, 1 | Gen-F GTS rear quarter, wheel and yellow brake caliper | "Performance" panel |
| `clubsport-cutout.webp` | 20 | 0.53, 0.47, 0.95, 0.985, then background removed | Black E3 Clubsport, front | "Next up." panel |
| `hsv-gts-genf-front.jpg` | 22 | Full frame | Gen-F GTS front three-quarter in the showroom | 2016 HSV GTS listing (main) |
| `hsv-gts-genf-rear.jpg` | 21 | 0.4, 0.4, 1, 1 | Gen-F GTS rear three-quarter | 2016 HSV GTS listing |
| `hsv-gts-genf-showroom.jpg` | 7 | 0.2, 0.497, 0.506, 0.806 | Gen-F GTS front with the line-up behind | 2016 HSV GTS listing |
| `hsv-clubsport-r8-front.jpg` | 20 | 0.506, 0.487, 0.994, 0.975 | Black E3 Clubsport front three-quarter | 2012 HSV Clubsport R8 listing (main) |
| `hsv-clubsport-r8-showroom.jpg` | 20 | Full frame | Black Clubsport and Gen-F GTS in the showroom | 2012 HSV Clubsport R8 listing |
| `ferrari-360-front.jpg` | 24 | 0.025, 0.075, 0.95, 1 | Ferrari 360 Modena front three-quarter outside | 2002 Ferrari 360 Modena listing (main) |
| `ferrari-360-street.jpg` | 13 | 0.625, 0.562, 1, 0.937 | Ferrari 360 Modena at the shopfront | 2002 Ferrari 360 Modena listing |
| `ferrari-360-doorway.jpg` | 18 | 0.4, 0.4, 1, 1 | Ferrari 360 Modena beside the open roller door | 2002 Ferrari 360 Modena listing |
| `hsv-maloo-r8-side.jpg` | 13 | 0, 0.384, 0.525, 0.909 | Gen-F Maloo R8 side profile at the shopfront | 2014 HSV Maloo R8 listing (main) |
| `hsv-maloo-r8-rear.jpg` | 15 | 0, 0.394, 0.475, 0.869 | Gen-F Maloo R8 rear three-quarter | 2014 HSV Maloo R8 listing |
| `hsv-gts-e3-front.jpg` | 3 | 0.063, 0.075, 0.988, 1 | Red E3 GTS front three-quarter | 2012 HSV GTS listing (main) |
| `hsv-gts-e3-nose.jpg` | 4 | 0, 0.388, 1, 0.832 | Red E3 GTS nose, bonnet vents and GTS badge | 2012 HSV GTS listing |
| `hsv-gts-e3-lineup.jpg` | 2 | 0.513, 0.441, 1, 0.928 | Red E3 GTS head-on in the line-up | 2012 HSV GTS listing |
| `hsv-maloo-e3-front.jpg` | 2 | 0.113, 0.441, 0.506, 0.834 | Gold E3 Maloo head-on | 2012 HSV Maloo listing (sold) |
| `hsv-maloo-green-front.jpg` | 21 | 0, 0.436, 0.234, 0.670 | Green Gen-F Maloo front | Stock manager demo's example photos |
| `hsv-maloo-green-side.jpg` | 2 | 0, 0.469, 0.206, 0.675 | Green Gen-F Maloo side | Stock manager demo's example photos |
| `madi-portrait.jpg` | 28 | 0.337, 0.241, 0.647, 0.447 (320 px square) | Madi in an MM Prestige vest in the showroom | Call Madi card on each listing, home "Talk directly with Madi" tile |
| `madi-showroom.jpg` | 28 | 0.1, 0.17, 0.9, 0.837 (4:5) | Madi in an MM Prestige vest, red HSVs and the wall sign behind | Home "Meet Madi" section |

## Video

The dealership supplied five walkthrough clips in October 2026, filmed on a gimbal in the showroom (848 × 464 px, 30 fps, with sound). Clip 4 is the same footage as clip 2.

| Clip | Length | Content |
| --- | --- | --- |
| 1 | 19.5 s | Walk from the street past the Maloo R8 and Ferrari 360, through the roller door and into the showroom, then a pan across the line-up |
| 2 (and 4) | 4.6 s | Pan along the line-up under the wall sign |
| 3 | 3.2 s | Pan from the red Gen-F GTS to the black Clubsport |
| 5 | 3.8 s | Pan from the black Clubsport back to the red GTS |

`scripts/showroom-films.sh` turns them into the two hero films in `public/video`. The clips run at 0.8× speed (24 fps). They are lightly denoised and the sound is dropped. For desktops they are upscaled to 1,280 px with Lanczos and contrast-adaptive sharpening; phones get an 848 px cut. Each film is saved as AV1, with H.264 for browsers that can't play AV1. The colour grade is applied in CSS, the same as the hero photos.

| Film | Made from | Length | Used for |
| --- | --- | --- | --- |
| `showroom-walk-*` | Clip 1. The end dissolves into the start so it loops without a jump, and the loop opens as the camera enters the showroom | 23.1 s | Home hero |
| `showroom-pans-*` | Clips 2, 3 and 5, dissolving into each other and back round to the start | 11.5 s | Stock page hero (tablets and desktops) |

Each film is 0.7 to 3.9 MB, depending on size and codec. They load only after the rest of the page has loaded. Visitors who ask for reduced motion or data saving keep the still photo instead.

## Notes

- Number plates are readable in several photos (the gold Maloo, the E3 GTS and the Ferrari). The dealership asked for them to stay readable, so they are not blurred.
- The black Clubsport's bumper reflects the photographer. It is too small to see at the panel's display size.
- The dealership confirmed the portraits (shots 26 to 29) show Madi. Shot 28 is used for the round portrait and the Meet Madi photo; the others aren't used.
- The home hero, sell banner and location photos get a deeper grade in CSS (`src/mm-prestige.css`) so the bright shoot edit sits well on the dark page. Listing photos are shown as supplied.
