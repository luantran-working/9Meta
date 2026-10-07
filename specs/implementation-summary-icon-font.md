# FE-002 Implementation Summary — Icon + Font (Quicksand)

> Scope: `./specs/icon-font.md` §5 only. Colors, sidebar logic, other CSS untouched.
> Pre-existing dirty files (`main.js`, `renderer.js`, other `index.html` hunks = FE-001/discord work) were NOT touched.

## 1. Files changed

| File | Change |
|---|---|
| `icon.png` | OVERWROTE JPEG-lockup (1254px, `FF D8`) → real 512×512 PNG-32, squircle "9" tight, transparent corners |
| `icon.ico` | OVERWROTE single-entry 256 → 4 entries **16/32/48/256** (verified header parse) |
| `icon_old.ico` | DELETED (was PNG-in-disguise, unused) |
| `package.json` | `build.win` += `"icon": "icon.ico"`; `build.files` += `"fonts/**/*"` (JSON re-validated) |
| `fonts/quicksand-{400,500,600,700}.woff2` | NEW, 4 distinct static files (~62 KB total), magic `wOF2` |
| `index.html` | +4 `@font-face` (before `html, body`, `font-display:swap`); `font-family: Quicksand, Inter, …` (1 line); `.tool-tile span` `line-height 1.25 → 1.55`; `.metric-value` `letter-spacing -.8px → -0.01em` |

## 2. How the icon was cropped (no designer asset needed)

Source JPEG had bg ≈ #F8F8F8 vs squircle white ≈ #FB–FF — only ~4 levels apart, so brightness keying was unusable.
Method: downscale → shadow-ring mask (`lum < bg−2`, rows < 53% to exclude wordmark) → BFS component from glyph seed → bbox `(409,284)–(844,660)` → shrink 22px (drop soft shadow) → square 399px → geometric rounded-rect alpha mask (`r=24%`, 4× supersampled) → pad to 84% fill → LANCZOS 512.
Script kept at `C:\Users\admin\AppData\Local\Temp\opencode\crop_icon.py` (re-runnable).

## 3. Font note (deviation from naive approach, spec intent kept)

`fonts.googleapis.com/css2` returns ONE variable-font file for all weights → would break 400/500/600/700 rendering. Used google-webfonts-helper per-variant static woff2 instead (4 distinct md5). `@font-face` block matches spec snippet verbatim. No CDN link shipped.

## 4. Verification (all PASS)

- `verify_icon_font.py` (in same temp dir): 15/15 PASS — PNG magic, 512 RGBA, corner alpha 0 / center 255, ICO 4 entries, 4× wOF2, 4× @font-face, Quicksand-first stack, no `fonts.googleapis.com` in app, line-height/letter-spacing, `win.icon`, `files` entry.
- Browser smoke (`file://index.html`): badge renders new 512 squircle "9" tight; `document.fonts.load()` resolves all 4 weights; Network tab = 7× `file://` only (html, icon.png, renderer.js, 4 woff2) — **zero external requests**. Console shows only the expected Electron `require is not defined` (Chrome≠Electron, pre-existing, unrelated).
- NOT run (needs Electron runtime): full app launch, tray 16px glance, Tab-ring walk. Manual: `npm start` → check tray icon reads as "9", Tab through sidebar shows `:focus-visible` ring.

## 5. For @designer QA

- Token check: `--font-sans` = `Quicksand, Inter, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`; colors/contrast unchanged → DS-001 audit still valid.
- States: font swap touches no DOM/aria; loading/error/empty states N/A (static assets + CSS only).
- `node --check`: skipped — no JS touched.
