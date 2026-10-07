# QA — FE-005 Custom platform picker (DS-005) — FAIL ❌

Scope: static only (no Electron). Reviewed: `index.html:613-644,1288-1301` + `renderer.js:8,136-147,290-318,789-866,885-906` vs `specs/platform-picker.md §2-§8` + `specs/implementation-summary.md (FE-005)`.

## Checks

| # | Check | Result |
|---|-------|--------|
| 1 | Đủ 10 item, đúng order/label, value API giữ (`zalo…custom`) | ✅ PASS — `PLATFORM_ORDER L795-800` khớp spec §2; `modal-save L890-906` + partition + customUrl đọc `platformInput.value` nguyên vẹn |
| 2 | SVG thật 18px, 0 emoji trong picker | ✅ PASS — `ppRender L816-824` dùng `BRAND_SVG_REAL[v] \|\| custom`; `BRAND_SVG_REAL` 10 key đầy đủ (fanpage reuse facebook path đúng DS-004); `<select id="profile-platform-input">` 0 match; 3 `<select>` còn lại là crm/campaign/ai — đúng |
| 3 | `hidden input` cùng id + `change` dispatch → preview/customUrl không vỡ | ✅ PASS — `openModal L297-298` + `ppRender`; `ppSelect L842-848` dispatch `change`; listener `L789-793` + `updateAvatarPreview L307-319` giữ nguyên |
| 4 | Keyboard/listbox pattern + reduced-motion | ✅ PASS — `aria-haspopup/expanded`, `role=listbox/option`, `aria-selected`, SVG `aria-hidden`, Arrow/Home/End/Enter/Space/Esc, `ppOutside` pointerdown-capture, chevron `prefers-reduced-motion` |
| 5 | Dark/light + popover/z-index | ✅ PASS (tĩnh) — listbox `#fff` light / `--popover` fallback dark, hover tint 2 mode, icon `currentColor`; `z-index:30` trong stacking context modal OK |
| 6 | Focus-visible ring 2px `var(--ring)` (WCAG 2.4.7) | ❌ FAIL (P1) — `index.html:642` viết `hsl(var(--ring))` nhưng token `--ring` là hex (`#6ea8ff` dark / `#2563eb` light, `index.html:17,59`) → declaration invalid → **ring tàng hình**. Sidebar cũ `L180` dùng `var(--ring)` trực tiếp mới đúng |

## Fix (1 dòng, @frontend)

- P1-1 `index.html:642`: `outline: 2px solid hsl(var(--ring))` → `outline: 2px solid var(--ring)` (2 chỗ trong cùng rule: `.pp-trigger:focus-visible, .pp-item:focus-visible`).

## Minor (non-blocking, gom vào cùng patch nếu muốn)

- P2-1 `.pp-check` thiếu `aria-hidden` — SR có thể đọc "✓" sau label. Thêm `aria-hidden="true"` vào span check (trigger + item template `index.html` không có check; `renderer.js:817` sinh check).
- P2-2 Trigger label mất class ellipsis — spec CSS có `.pp-trigger-label, .pp-item-label`, impl `L621` chỉ còn `.pp-item-label` → "Microsoft Teams" có thể tràn ở trigger. Thêm `#pp-trigger-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`.
- P2-3 `--popover` chưa định nghĩa trong `:root` (ăn may nhờ fallback `222 40% 9%` ở `L627`). Vệ sinh: thêm `--popover` vào tokens hoặc giữ fallback (spec đã chốt fallback — để yên cũng được).

## Manual Electron còn lại (~2m, spec §8 — chưa chạy)

1. Trigger hiện logo+label đúng; list đủ 10 item SVG 18px + ✓ ở item chọn.
2. Chọn platform → avatar preview đổi + Custom Link hiện URL input; Lưu → sidebar logo + partition đổi.
3. Keyboard-only: Tab → Enter → ↓↑/Home/End → Enter → Esc → click ngoài, focus về trigger (sau fix P1 phải thấy ring).
4. Modal đáy: listbox có bị `.modal-box overflow:auto` clip không — nếu có, áp escape hatch `position:fixed`+`getBoundingClientRect()` (spec §4 đã ghi sẵn).
5. Light/dark contrast icon + popover.

## Verdict

**FAIL ❌** — 1 P1 one-line fix (`hsl(var(--ring))` → `var(--ring)`). Sau fix: shippable, không cần re-QA full — Leader verify 1 dòng + Electron checklist §8.

verification: `partially_verified` (static only, chưa chạy Electron).
