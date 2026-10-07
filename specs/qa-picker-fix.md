# DS-QA-006 — QA picker fix FE-006 (static)

> Scope: `specs/picker-fix.md` + `specs/implementation-summary.md (FE-006)` vs `index.html:613-653,1297-1310` + `renderer.js:290-298,801-871`. Static only, no Electron. Ponytail: ngắn gọn.

## Checks

| # | Check | Result |
|---|---|---|
| 1 | Hết "Zalo Zalo" trigger + list | ✅ PASS — `ppIcon()` L810 branch `zalo→PP_ZALO_MINI`, dùng ở L821 (item) + L827 (trigger). Direct `BRAND_SVG_REAL[v/cur]` ở picker = 0 (chỉ còn 1 trong wrapper + 2 sidebar/avatar L259/L317 giữ wordmark đúng ý). Sidebar 44px/avatar 56px không đổi. |
| 2 | Z mini rõ, contrast | ✅ PASS — `.pp-z` L623-625: 18×18, radius 5, `#0068ff`/trắng 800 12px, `flex:none` + `aria-hidden`. White-on-`#0068ff` ≥4.5:1 (non-text ≥3:1 dư). Không thêm dep/path. |
| 3 | Scrollbar mảnh | ✅ PASS — `scrollbar-width:thin` + `scrollbar-color` + `::-webkit-scrollbar 6px` L632/L637-639, `max-height 220px` + `overscroll:contain` L631. Khớp `#profiles-list` pattern. |
| 4 | Hết clip đáy modal | ⚠️ CONDITIONAL — `z-index 30→60` + `220px` + `overscroll` xong, nhưng `.modal-box` vẫn `overflow:auto` L529 nên absolute listbox vẫn có thể cắt khi trigger sát đáy. Escape hatch `fixed` đang comment (đúng spec — chỉ bật khi thấy clip thật). Cần manual Electron 30s. |
| 5 | Trigger = input metrics, ellipsis | ✅ PASS — trigger reuse `modal-input` + `min-height:48px/box-sizing/line-height:1.5` L614-617; `#pp-trigger-label` vào rule ellipsis L626; icon chốt 18px L620-621; `.pp-check{margin-left:auto}` L649. `Microsoft Teams` không tràn. |
| 6 | Không regression value/keyboard/a11y | ✅ PASS — `openModal L297-298` + `ppRender`; `ppSelect L848-851` giữ `value` + `dispatch change`; keyboard Arrow/Home/End/Enter/Space/Esc L856-868 nguyên; `role=listbox/option`, `aria-expanded/selected`, `focus-visible ring`, `reduced-motion` giữ. `node --check` → SYNTAX_OK. |

## Findings

- P0: 0.
- P1-1 (manual): mở Thêm/Sửa, scroll modal để trigger sát đáy → mở list. Nếu bị cắt → bật escape hatch `fixed`+`getBoundingClientRect()` (§4 picker-fix.md), rồi re-QA. Nếu không cắt → ship.
- P2: 0. `✓` text-check, `inset-inline` RTL, `body.light-mode` listbox trắng — giữ nguyên đúng spec.

## Verdict

**PASS (static) ✅** — ship được, kèm 1 manual check P1-1 (~2 phút theo §5 picker-fix.md: 1 Z + "Zalo", 10 item, scrollbar 6px, trigger 48px, Tab→Enter→↓↑→Enter→Esc).

---
verification: `partially_verified` (static + `node --check`; chưa chạy Electron).
