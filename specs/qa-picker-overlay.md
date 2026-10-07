# DS-QA-007 — QA tĩnh Picker overlay fixed (FE-007)

**Verdict: PASS ✅** — merge/tiếp tục được. Không cần fix trước merge. 2 ghi chú P2 (không chặn).

## 1. Checks theo contract (tĩnh, đọc code)

| # | Check | Kết quả |
|---|---|---|
| 1 | Hết double scrollbar / modal phình | ✅ PASS — `.pp-listbox` đã `position:fixed; z-index:200` (`index.html:630`), tách khỏi flow `.modal-box overflow:auto` (L529) → không chiếm `scrollHeight`; `inset-inline/top absolute` cũ đã xóa; `overscroll-behavior:contain` + `max-height 220px` giữ scroll duy nhất trong listbox |
| 2 | Flip đáy | ✅ PASS — `ppPosition()` (`renderer.js:853-863`): `flip = below<180 && r.top>below` → `top = r.top-h-6` (clamp `≥8px`); `avail = max(120, min(220, …))` → luôn ≥120px dùng được, không tràn viewport |
| 3 | Bám trigger | ✅ PASS — `resize→ppPosition`, `scroll capture→ppOnScroll→ppPosition` (`renderer.js:837-838`); `left/width` từ `getBoundingClientRect()` mỗi lần; trigger bay khỏi viewport → `ppClose(false)` không giật focus |
| 4 | Đóng đủ 4 đường | ✅ PASS — (1) chọn `ppSelect→ppClose`, (2) `Esc→ppClose`, (3) click ngoài `ppOutside contains()` (không dời DOM nên vẫn đúng), (4) scroll xa `ppClose(false)` + toggle trigger. `ppClose` gỡ đủ 3 listeners (resize/scroll/pointerdown) — không leak |
| 5 | Không regression | ✅ PASS — value/`change`, keyboard Arrow/Home/End/Enter/Space/Esc, `role=listbox/option`, `aria-expanded/selected`, SVG `aria-hidden`, `ppIcon()`/`.pp-z`/`BRAND_SVG_REAL`, ring `var(--ring)`, scrollbar 6px, dark/light, `prefers-reduced-motion` giữ nguyên. `grep ppPosition|ppOnScroll` = 8 hits (≥6 theo spec) |

## 2. Impeccable QA (critique / audit / layout / typeset / colorize)

- **critique**: đúng interaction rule (dropdown trong `overflow:auto` phải `fixed`/portal) — root cause C1–C3 trong spec được xử lý đúng, không workaround z-index.
- **audit (a11y)**: `aria-haspopup/expanded`, focus item khi mở + focus trigger khi đóng, `:focus-visible` ring, `aria-hidden` SVG, contrast `currentColor` + `.pp-z` trắng/`#0068ff` — giữ nguyên, đạt.
- **layout**: z-scale hợp lệ (tooltip 50 < tools 80 < overlay 99 < picker 200); không số 9999 trong app (999 ở `preload.js` là webview hint, 1000 ở `docs/` — ngoài scope).
- **typeset/colorize**: không đổi type/color — restrained strategy giữ nguyên, không regression.

## 3. Ghi chú P2 (không chặn, làm khi rảnh)

- **P2-1** Right-edge chưa clamp: `left = r.left, width = r.width`, viewport <520px modal gần mép phải có thể chạm mép. Fix khi cần: `left = Math.min(r.left, innerWidth - r.width - 8)`.
- **P2-2** Manual Electron 2 phút theo `picker-overlay.md §5` vẫn nên chạy 1 lần (flip thật + bám scroll thật) — tĩnh không thay được mắt.

---
verification: `partially_verified` (QA tĩnh `index.html:500-535/613-653/1295-1310`, `renderer.js:794-893`; chưa chạy Electron).
