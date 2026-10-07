# DS-QA-002 — QA tĩnh Icon + Font (FE-002 vs `specs/icon-font.md`)

**Verdict: PASS ✅** — 15/15 item đúng spec. Không lỗi blocking. (Ponytail full: ngắn gọn.)

## 1. Icon

| Check | Spec | Thực tế (verify trên disk) | Status |
|---|---|---|---|
| `icon.png` format | PNG-32 512 | Magic `89 50 4E 47`, 512×512, `Format32bppArgb` | ✅ |
| `icon.png` transparent | Góc alpha 0, giữa 255 | TL/TR/BL/BR = `(0,0,0,0)`, center `(27,31,50,255)` (PIL) | ✅ |
| `icon.png` content | Squircle "9" tight, bỏ wordmark | 91.425 bytes (cũ 34 KB JPEG-lockup) | ✅ |
| `icon.ico` entries | 16/32/48/256 | Header `count=4`: 16/32/48/256 (`bpp=0` = PNG-compressed, hợp lệ cho electron-builder) | ✅ |
| `icon_old.ico` | Xóa | `GONE` (cũ 909 KB PNG-đội-lốt) | ✅ |
| `package.json` win.icon | `"win": {"icon": "icon.ico"}` | Có, kèm nsis x64 target | ✅ |
| `package.json` files | `"fonts/**/*"` | Có | ✅ |

## 2. Font Quicksand

| Check | Spec §3 | Thực tế (`index.html`) | Status |
|---|---|---|---|
| 4 file woff2 | `fonts/quicksand-{400,500,600,700}.woff2` | 4 file, magic `wOF2`, 15776/15788/15864/15124 bytes (tổng ~62 KB, trong khoảng 60–80 KB) | ✅ |
| 4 `@font-face` + `swap` | Snippet verbatim trước `html, body` | L35–38, `font-display:swap` đủ 4 | ✅ |
| Font stack | `Quicksand, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif` | L46 khớp verbatim (Inter giữ fallback 2) | ✅ |
| `.tool-tile span` line-height | 1.25 → ≥1.45 | L461 = `1.55` (trong block L456) | ✅ |
| `.metric-value` letter-spacing | `-.8px` → `-0.01em` | L719 = `-0.01em` (trong block L716) | ✅ |
| Zero external request | Không `fonts.googleapis.com` trong app | Count = 0 | ✅ |

## 3. No-regression (màu / contrast / sidebar)

- Diff `index.html` có nhiều hunk màu (muted `#8ea2c8→#a9bcd9`, flat sidebar, radius 14px…) — **đây là FE-001/DS-001 (pre-existing dirty), không phải FE-002**. Hunk của FE-002 đúng 7 dòng: 4 `@font-face` + 1 `font-family` + 1 `line-height` + 1 `letter-spacing`.
- FE-002 không đụng DOM/aria/JS (`main.js`, `renderer.js` dirty là của FE-001/discord, FE-002 không chạm) → contrast audit DS-001 còn hiệu lực, không cần re-check.
- Token `--font-sans` khớp DESIGN.md §8.2.

## 4. Ghi chú (non-blocking, optional)

1. `icon-src-1024.png` master + `icon.icns` (retina mac) chưa có — spec ghi "Không bắt buộc", electron-builder mac chấp nhận PNG 512. Thêm khi cần retina sắc.
2. Chưa chạy live: `npm start` → glance tray 16px đọc được số "9", Tab qua sidebar thấy `:focus-visible` ring, DevTools Network không có `fonts.googleapis.com`. Khuyến nghị smoke 2 phút trước khi đóng FE-002 (cần Electron runtime, QA tĩnh không chạy được).

---
verification: `verified` (static QA trên disk: magic bytes + PIL alpha + grep + git diff; live Electron smoke chưa chạy — xem ghi chú 2).
