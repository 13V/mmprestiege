# Prototype photo sources

All imagery is generic preview imagery. It does **not** show MM Prestige Motors' actual vehicles, premises or current stock. Replace these files with dealer-owned vehicle photography before publishing a real inventory.

Photos were obtained over verified HTTPS from these public example repositories:

- [Ridex by codewithsadee](https://github.com/codewithsadee/ridex), commit `473d9444c36dd45066d737a2eb14252713f6a38b` (most stock photos, hero and about image).
- [Car-Dealership-Website by syedfahadali399](https://github.com/syedfahadali399/Car-Dealership-Website), commit `0081ef00961e79f298ce4b25c0bf2d3dda6404b7` (high-resolution red BMW, engine and interior previews). This source provides no licence or photo credits; these assets must be replaced or their original rights established before publishing.
- [Axom car dealership by MDJAmin](https://github.com/MDJAmin/axom-car-dealership-website-html-css-js), commit `c3534e9f8d8817b308b70af071dcc1adb68132a8` (wheel detail). The repository has an MIT licence but does not identify original photography sources.

Ridex’s README states: “This project is **free to use** and does not contains any license.” It does not include individual photographers' names or original photo-provider references. This records the immediate source and upstream reuse statement, without claiming that its statement establishes rights for every photograph. For a public dealership launch, use dealer-owned photos or verify each original photo's licence and any required attribution.

| Local file | Source / upstream path | Dimensions | Content |
| --- | --- | --- | --- |
| `hero.jpg` | `assets/images/hero-banner.jpg` | 1391 × 1198 | Black BMW i8, front view in a dramatic illuminated tunnel |
| `car-1.jpg` | Car-Dealership-Website: `pics/7.jpg.jpg` | 3840 × 2160 | Red BMW performance coupe at night |
| `car-2.jpg` | `assets/images/car-2.jpg` | 440 × 300 | Black BMW performance sedan |
| `car-3.jpg` | `assets/images/car-3.jpg` | 440 × 300 | White Volkswagen Golf R |
| `car-4.jpg` | `assets/images/car-6.jpg` | 440 × 300 | Grey BMW sedan, studio setting |
| `car-5.jpg` | `assets/images/blog-3.jpg` | 640 × 400 | Classic American muscle car collection |
| `car-6.jpg` | `assets/images/car-2.jpg` | 440 × 300 | Second preview use of the black BMW sedan |
| `car-7.jpg` | `assets/images/car-3.jpg` | 440 × 300 | Second preview use of the white Golf R |
| `car-8.jpg` | Car-Dealership-Website: `pics/7.jpg.jpg` | 3840 × 2160 | Second preview use of the red BMW coupe |
| `detail-1.jpg` | Car-Dealership-Website: `pics/25.jpg` | 1920 × 1160 | Mercedes engine close-up |
| `detail-2.jpg` | Axom: `Assets/Product/Page 1/Section-4/Image (9).jpeg` | 1176 × 582 | Red sports-car wheel detail |
| `detail-3.jpg` | Car-Dealership-Website: `pics/26.jpg` | 900 × 596 | Mercedes driver cabin detail |
| `about.jpg` | `assets/images/blog-3.jpg` | 640 × 400 | Classic American muscle car collection |

Paths without a named source above belong to Ridex. Those images can be inspected at `https://raw.githubusercontent.com/codewithsadee/ridex/473d9444c36dd45066d737a2eb14252713f6a38b/<upstream-path>`.

Direct HTTPS access to `images.unsplash.com` and `upload.wikimedia.org` was rejected by this cloud environment's destination policy. The local files avoid runtime hotlinking and keep the preview usable without those hosts. No TLS checks were disabled. GitHub source requests used the environment's existing proxy and trust configuration.
