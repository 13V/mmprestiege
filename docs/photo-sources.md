# Photo and video sources

Every photo and film on the site comes from MM Prestige Motors. The photos are from the dealership's showroom photoshoot: 29 photos supplied by the dealership in October 2026 (original files `MMMOTOR.CWATSON.jpg` and `MMMOTOR.CWATSON-2.jpg` to `-29.jpg`, about 5,800 × 3,900 px). They show the Wingfield showroom, the shopfront on Grand Junction Road and the cars on site that day.

The sample listings are mapped to the photographed cars, so each listing shows its own car. Each listing's year, price, kilometres and specifications are still samples (see `sampleStock` in `src/data.js`).

## Processing

`scripts/photos/export.py` makes every site photo from the full-size originals: `python3 -I scripts/photos/export.py <folder of originals> [name ...]` (it needs numpy, opencv-python-headless and Pillow). The crops, sizes and looks are listed in `scripts/photos/photos.txt`, and the grade is in `scripts/photos/grade.py`.

- **Grade.** The photographer's edit is bright, flat and slightly cool: its brightest lights stop at light grey, the concrete has a blue tint and the red paint looks pale orange. Every photo now gets the same grade: neutral white balance measured on the grey concrete, with a touch of warmth; levels so lights reach white and shadows reach near black; an S-curve; richer colour (muted colours lifted more than strong ones, greys left grey, strong paint deepened slightly); a light clean-up of camera grain, scaled to each shot's grain (the indoor shots are ISO 640 to 800); and local contrast with an edge-aware filter, so there are no halos round the cars. White balance and levels are measured on the whole frame, so every crop of a shot matches.
- **Looks.** Car photos get the *listing* look. Photos with text over them (the home, stock and 404 heroes, the sell banner and the location card) get the *hero* look, with darker mid-tones so white text stays readable; no browser filter is applied on top. Madi's photos get the gentler *portrait* look, so skin stays natural.
- **Sizes.** Photos are kept up to 3,200 px wide (crops smaller than that keep their full size), sharpened for the web after resizing and saved as JPEG (quality 90, full colour resolution). Camera metadata, including any location data, is removed.
- `npm run images` makes the WebP sizes in `public/images/opt` (480, 960, 1,600, 2,400 and 3,200 px; quality 82 with sharp YUV conversion, which keeps red paint crisp against black trim, and light edge sharpening on the resized copies) and the 1,200 × 630 link-preview crops. Each URL carries a short hash of its file, so browsers fetch a changed photo straight away instead of a copy cached for a day.
- `clubsport-cutout.webp` was cut out of shot 20 on this machine with the open-source BiRefNet background-removal model (through `rembg`). The export keeps its mask and replaces only its colour. No photo was uploaded to an outside service.
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

`scripts/films/build.sh` turns clips 1 to 3 into the two hero films in `public/video`. Everything runs locally; no footage is uploaded anywhere.

1. **Steadying** (`stabilise_upscale.py`). The camera's path is tracked frame to frame. The up-and-down bounce of walking is smoothed out, measured mostly on the far wall and the sign, so the room reads as still. Side-to-side movement is only lightly smoothed, so the pans keep their shape. A constant zoom of 3 to 4.5% hides the moving edges.
2. **Upscaling**. Each frame is upscaled 4× with the open-source Real-ESRGAN general model (an even blend of its standard and denoising weights, converted to run in ONNX Runtime by `esrgan_onnx.py`), then resized to 1,920 px wide. The model weights come from the Real-ESRGAN releases on GitHub.
3. **Slow motion** (`edit.sh`). The clips run at 0.8× speed. Motion-interpolated in-between frames keep them at a true 30 fps.
4. **Loops**. Eased dissolves join the clips into loops with no visible jump.
5. **Grading** (`scripts/photos/film_lut.py`). Each film gets the hero photos' grade, so it matches the photo it fades in over. The white balance and levels are measured on frames from the film itself, and the grade is applied as a 3D colour LUT.
6. **Encoding** (`encode.sh`). Each film is saved at 1,920 px for tablets and desktops and 1,280 px for phones, as AV1, as HEVC for Safari, and as H.264 for older browsers, with BT.709 colour like the source clips. The sound is dropped. The film URLs carry a version (`FILM_VERSION` in `src/main.jsx`); bump it after re-encoding, so browsers fetch the new files instead of a cached copy.

Clip 5 isn't used: it pans back the way clip 3 came, and the camera operator shows in the Clubsport's paint. Clip 1 stops at 18.3 s, before the camera nears the Clubsport's bonnet.

| Film | Made from | Length | Used for |
| --- | --- | --- | --- |
| `showroom-walk-*` | Clip 1. The end dissolves into the start, and the loop opens as the camera enters the showroom | 21.3 s | Home hero |
| `showroom-pans-*` | Clips 2 and 3, dissolving into each other and back round to the start | 7.0 s | Stock page hero (tablets and desktops) |

Each film is 1.3 to 5.8 MB, depending on size and codec: a desktop downloads about 5.3 MB for the home film and 2.2 MB for the stock film, and a phone about 3.3 MB for the home film. They load only after the rest of the page has loaded, and a button on the hero pauses them. Visitors who ask for reduced motion or data saving keep the still photo instead.

## Notes

- Number plates are readable in several photos (the gold Maloo, the E3 GTS and the Ferrari). The dealership asked for them to stay readable, so they are not blurred.
- The black Clubsport's bumper reflects the photographer. It is too small to see at the panel's display size.
- The dealership confirmed the portraits (shots 26 to 29) show Madi. Shot 28 is used for the round portrait and the Meet Madi photo; the others aren't used.
- The grade is built into the files (see [Processing](#processing)); the site applies no colour filters to photos. Sold cars' card photos are shown desaturated on purpose.
