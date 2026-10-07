# QA Report — DS-QA-003 Brand Icons 10/10 (FE-003)

**Verdict: PASS ✅** — merge / route to manual Electron smoke (~2 min).
verification: `partially_verified` (static QA from source, chưa chạy Electron).

## Checks (spec ./specs/brand-icons.md)

| # | Check | Result |
|---|-------|--------|
| 1 | `BRAND_SVG` đủ 10 key (zalo/telegram/messenger/fanpage/facebook/whatsapp/discord/teams/gmail/custom) | ✅ PASS — `renderer.js:133-144` khớp snippet spec §3 verbatim |
| 2 | CSS `.profile-btn svg.brand` chỉ size, không đè fill | ✅ PASS — `index.html:197-201` = `width:20px;height:20px;flex:none`, đã bỏ `fill:currentColor` |
| 3 | Thứ tự render `avatar img > BRAND_SVG > emoji` | ✅ PASS — `renderer.js:251-257` đúng thứ tự, không chữ cái đơn |
| 4 | Nút "Xóa ảnh" lộ SVG cho profile cũ | ✅ PASS — `index.html:1249` `#avatar-clear` (hidden mặc định) + `renderer.js:770` wiring `tempAvatarPath=null` + `updateAvatarPreview:302-303` toggle + save `avatar=tempAvatarPath` (null → rớt SVG) `:815,825` |
| 5 | No regression (badge/a11y/nav) | ✅ PASS — badge vẫn `span` + `aria-hidden`, `aria-label/current`, `disabled=appLocked`, ArrowUp/Down roving còn nguyên |

## A11y / Contrast (static)

- Icon `currentColor` trên `secondary-fg` / `primary-fg` ≥ 4.5:1 cả 2 mode (kế thừa spec §6) ✅
- Nút Xóa ảnh có text显式, `type=button`, focusable ✅
- `:focus-visible` ring + `prefers-reduced-motion` không bị đụng ✅

## Manual smoke còn lại (~2 min, @leader/FE)

1. 10 profile không avatar → 10 SVG, không emoji.
2. Set avatar 1 profile → `<img>`; Xóa ảnh → SVG đúng platform.
3. Tab qua nút thấy ring; light-mode đọc được.

`ponytail:` không thêm gì — 0 issue, 0 follow-up code.
