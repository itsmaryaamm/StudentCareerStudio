# Brand kit

Official logo files live in `apps/web/public/brand/` (served at `/brand/...`).

| File                                                             | Use                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `logo-horizontal.png` (1753 px), `logo-horizontal-800.png`       | Full logo on light backgrounds. Transparent.                       |
| `logo-horizontal-dark-bg.png`, `logo-horizontal-dark-bg-800.png` | Full logo for dark or purple backgrounds. Transparent, white text. |
| `logo-horizontal-on-purple.png`                                  | Full logo on its own solid purple (#370278) background.            |
| `icon-tile.png` (1024), `-512`, `-256`, `-128`                   | App icon tile. Transparent rounded corners.                        |
| `icon-ribbon.png`                                                | The ribbon S alone, no tile.                                       |

Derived files: favicons and app icons in `apps/web/public/` (`favicon.ico`, `favicon-*.png`, `pwa-*.png`,
`apple-touch-icon-180x180.png`, `maskable-icon-512x512.png`), `icon/*.svg` and `logo/*.svg` (the tile, for places that
load an SVG), and the share image `opengraph/banner.jpg`.

In the app, use `BrandWordmark` (`apps/web/src/components/brand-wordmark.tsx`) for the full logo and `BrandIcon` for
the tile. The account emails use `/brand/logo-horizontal-800.png`.
