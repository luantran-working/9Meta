# QA Re-Report — Sidebar shadcnUI (DS-QA-002, Phase 3 re-QA)

Scope: static review only (no Electron run) — `index.html` + `renderer.js` vs `DESIGN.md` + `specs/qa-sidebar.md` (3 lỗi cũ) + `specs/implementation-summary.md` (FE-002).
Impeccable commands applied: `critique` + `audit` (a11y/states) + `layout` + `typeset`.

## Verdict: PASS ✅ (3/3 lỗi cũ đã fix, không regression)

### Fix verification

| # | Lỗi cũ | Fix kỳ vọng | Thực tế | Status |
|---|--------|-------------|---------|--------|
| P0-1 | Nút + tàng hình (thiếu CSS svg) | `#btn-add-profile svg{...stroke:currentColor...}` sau `:hover` | `index.html:285` khớp chính xác spec | ✅ |
| P2-1 | Badge `<div>` trong `<button>` invalid | `createElement('span')` | `renderer.js:250` là `span`, giữ class/id/aria-hidden | ✅ |
| P2-2 | Thiếu ArrowUp/Down | roving ~10 dòng sau `renderSidebar()` | `renderer.js:262-268` đủ guard, wrap-around, `?.focus()`, `preventDefault` | ✅ |

### No-regression checklist (đối chiếu DESIGN.md)

- Tokens `index.html:11-29,49-66` nguyên vẹn (legacy `--bg/--panel` giữ có chủ ý cho CRM cũ).
- `#sidebar` flat, `#brand-badge` 40px + img, `.profile-btn` 44px hover bg-only (không scale/translate trong sidebar).
- `renderSidebar()` (`renderer.js:230-260`): `<button type=button>` + `aria-label` + `aria-current` duy nhất + `data-tip` (không `title`) + `disabled=appLocked` + badge `aria-hidden`; badge logic `renderer.js:945-949` đúng (0=hidden, >9="9+").
- `platformFallback()` + `BRAND_SVG` đúng emoji map, không còn chữ cái đơn.
- Scrollbar thin 6px, tooltip hover+focus-visible, `:focus-visible` ring 2px, `prefers-reduced-motion` còn nguyên.
- Responsive: giữ 72px fixed (desktop app) — đúng spec.

### Ngoài scope (không tính FAIL, như QA-001)

- `icon.png/.ico` chưa vẽ lại — deferred theo thỏa thuận.
- `.mini-tool` `title`-only thuộc tools-panel, ngoài scope sidebar.
- Contrast tokens theo spec; chưa verify runtime Electron.

---
verification: `partially_verified` (review tĩnh, chưa chạy Electron — cần manual: nút + hiển thị, badge ẩn/hiện, ArrowUp/Down focus).
