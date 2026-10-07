# QA Report — Sidebar shadcnUI (DS-QA-001, Phase 3)

Scope: static review only (no Electron run) — `index.html` sidebar CSS/HTML + `renderer.js` `renderSidebar()`/`platformFallback()` vs `DESIGN.md` + `specs/sidebar.md`.
Impeccable commands applied: `critique` + `audit` (a11y/states) + `layout` + `typeset` (contrast tokens).

## Verdict: FAIL ❌ (1× P0, 2× P2)

### P0-1 — Nút "Thêm tài khoản" render trống (không thấy dấu +)
- **File**: `index.html:912-917` (HTML) + thiếu CSS sau `index.html:284`
- **Lỗi**: `<svg viewBox="0 0 24 24">` chứa `<line>` nhưng không có rule CSS nào target `#btn-add-profile svg` (chỉ có `.tool-btn svg` và `.profile-btn svg.brand`, không khớp). Hậu quả kép: (1) `<line>` mặc định `stroke:none` → dấu + tàng hình; (2) svg mặc định 300×150px trong nút 44px `overflow:hidden` → tràn/khó đoán.
- **Fix** (thêm sau block `#btn-add-profile:hover`, ~line 284):
```css
#btn-add-profile svg{width:18px;height:18px;stroke:currentColor;stroke-width:2;stroke-linecap:round;fill:none}
```

### P2-1 — Badge dùng `<div>` trong `<button>` (HTML invalid)
- **File**: `renderer.js:250`
- **Lỗi**: `<button>` chỉ cho phép phrasing content; `<div class="badge">` sai spec (browser vẫn render, nhưng fail validator + rủi ro SR).
- **Fix**: `document.createElement('div')` → `document.createElement('span')` (giữ nguyên class/id/aria-hidden).

### P2-2 — Thiếu ArrowUp/Down trong `#profiles-list` (lệch DESIGN.md §6)
- **File**: `renderer.js` (sau `renderSidebar()`, ~line 260)
- **Lỗi**: DESIGN.md yêu cầu roving tabindex (~10 dòng); hiện tại chỉ Tab được (vẫn accessible, chỉ kém tiện khi nhiều nick).
- **Fix** (ponytail, ~10 dòng):
```js
// ponytail: native Tab vẫn đủ a11y; arrows chỉ là tiện ích
profilesList.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const btns = [...profilesList.querySelectorAll('.profile-btn:not(:disabled)')];
  const i = btns.indexOf(document.activeElement);
  e.preventDefault();
  (btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length] || btns[0])?.focus();
});
```

## PASS checklist (đã đối chiếu, không cần sửa)
- Tokens `index.html:11-29,49-66` khớp spec §2 (legacy `--bg/--panel` giữ có chủ ý cho CRM cũ).
- `#sidebar` flat, `#brand-badge` 40px + img, `.profile-btn` 44px hover bg-only (không còn translateY/scale trong sidebar).
- `renderSidebar()` (`renderer.js:230-260`): `<button type=button>` + `aria-label` + `aria-current` duy nhất + `data-tip` (không `title`) + `disabled=appLocked` + badge `aria-hidden`; badge logic `renderer.js:940-941` đúng (0=hidden, >9="9+").
- `platformIcon()` chữ cái đã xóa; `platformFallback()` + `updateAvatarPreview()` (`renderer.js:293`) đúng emoji map; `BRAND_SVG` telegram/messenger đúng pattern `fill:currentColor` 20px.
- Scrollbar thin 6px (`index.html:121-134`), tooltip hover+focus-visible, `:focus-visible` ring 2px, `prefers-reduced-motion` (`index.html:898-903`).
- Responsive: giữ 72px fixed (desktop app) — đúng spec §4.

## Ghi nhận ngoài scope (không tính FAIL)
- `icon.png/.ico` chưa vẽ lại — đã thỏa thuận deferred trong implementation-summary.
- `.mini-tool` (`index.html:989-1016`) vẫn `title`-only — thuộc tools-panel, ngoài scope sidebar.
- Contrast tokens theo spec; chưa verify runtime Electron.

---
verification: `partially_verified` (review tĩnh, chưa chạy Electron — cần manual: Tab qua từng btn thấy ring, badge ẩn/hiện, nút + hiển thị).
