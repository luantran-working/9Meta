# QA DS-QA-009 — Font VN Quicksand (FE-009)

**Verdict: PASS ✅** — QA tĩnh. `verification: partially_verified` (chưa chạy Electron render live).

## Checks (spec ./specs/font-vn.md §4-§5)

| # | Check | Expected | Actual (`index.html`, `fonts/`, `package.json`) | Status |
|---|---|---|---|---|
| 1 | Đủ 8 block | 4 VN + 4 latin | `index.html:35-42` = 8 `@font-face`, verbatim spec §4 | ✅ |
| 2 | Mọi block có `unicode-range` | 8/8 | 8/8 có range; latin cũ đã thêm range (fix root cause §1.2) | ✅ |
| 3 | `U+1EA0-1EF9` đủ 4 weight | 4 | 4/4 block VN (L35-38) chứa `U+1EA0-1EF9` | ✅ |
| 4 | VN range đầy đủ | Ăă Đđ Ĩĩ Ũũ Ơơ Ưư + combining + ₫ | Đủ: `U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB` | ✅ |
| 5 | 0 request Google (app runtime) | 0 | `index.html` root = 0 `googleapis/gstatic`; `main.js:447` chỉ là allowlist webview avatar (fbcdn/gstatic/googleusercontent), không phải font | ✅ |
| 6 | Stack giữ nguyên | `Quicksand, Inter, -apple-system…` | `index.html:50` giữ nguyên | ✅ |
| 7 | `fonts/` đủ 8 file | 4 latin + 4 VN | 8 file tồn tại | ✅ |
| 8 | `package.json files` gồm fonts | `fonts/**/*` | Có sẵn L66, khỏi sửa | ✅ |
| 9 | `font-display:swap` đủ 8 | 8/8 | 8/8 | ✅ |

## Ghi chú (không chặn PASS)

- `docs/index.html` còn link `fonts.googleapis.com` (Inter) — ngoài scope app ship (`package.json files` không gồm `docs/`). Không tính FAIL.
- `main.js:447` allowlist `gstatic.com` là cho WebView/Zalo avatar, không load font app. Giữ nguyên.
- Không đụng `font-family`/`line-height`/`letter-spacing` — DS-002 §3.3 còn hiệu lực ✅.
- a11y: swap → không FOIT; contrast/metrics chữ không đổi nên không re-check contrast.

## Còn lại cho live smoke (2 phút, cần Electron)

1. `npm start` → modal "Chỉnh sửa tài khoản" → paste `Ă Â Đ Ê Ô Ơ Ư ằ ắ ỉ ử ả ỗ ữ ₫` → Rendered Fonts chỉ `Quicksand`.
2. DevTools Network: 0 request `googleapis`/`gstatic` cho font.

---
verification: `partially_verified` (tĩnh 9/9 PASS; chưa render live).
