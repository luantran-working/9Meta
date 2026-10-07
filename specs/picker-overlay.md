# DS-007 — Picker overlay `position:fixed` (bật escape hatch thành mặc định)

> Scope: modal Thêm/Sửa profile — `.pp-listbox` `absolute` trong `.modal-box overflow:auto` vỡ: chiếm scrollHeight container + double scrollbar (modal scroll + listbox scroll). Fix duy nhất: listbox thành overlay `fixed` theo trigger. Ponytail full: 1 block CSS thay + ~15 dòng JS, giữ value/keyboard/a11y/BRAND_SVG_REAL/ppIcon/Z mini/0 dep/dark-light.
> Đọc cùng: `specs/picker-fix.md §4`, `specs/platform-picker.md`, `index.html:524-535` (modal-box), `index.html:613-653` (pp-*), `index.html:1298-1310` (pp HTML), `renderer.js:831-871` (ppOpen/ppClose/ppOutside).

## 1. Audit clip (vì sao vỡ — dòng chính xác)

| # | Hiện tượng | Nguyên nhân | Vị trí |
|---|---|---|---|
| C1 | Listbox đẩy modal scroll, 2 thanh scroll chồng | `.modal-box{overflow:auto}` (L529) là scroll container; `.pp-listbox{position:absolute}` (L630) là con của scroll container → `scrollHeight` modal phình + phần vượt bounds bị cắt; `z-index:60` vô hiệu qua `overflow` context | `index.html:524-535` + `629-636` |
| C2 | Escape hatch `fixed` đang comment nên chưa cứu | `picker-fix.md §4` để `getBoundingClientRect()` trong comment, mặc định tắt | `specs/picker-fix.md:99-107` |
| C3 | `z-index:60 < .overlay:99` — kể cả hết clip vẫn chui dưới overlay khác | Overlay `z-index:99` (L504); listbox phải `>99` | `index.html:500-504` + `630` |

Impeccable interaction rule: dropdown `absolute` trong `overflow:auto/hidden` luôn clip → dùng `fixed`/popover/portal. Đây chọn `fixed` (không dời DOM → `ppOutside contains()` + CSS dark/light giữ nguyên).

## 2. CSS patch (thay block `.pp-listbox`, copy-paste đè `index.html:629-636`)

```css
.pp-listbox {
  position: fixed; z-index: 200; /* ponytail: fixed = thoát .modal-box overflow:auto, không chiếm layout; left/top/width do JS ppPosition() set */
  max-height: 220px; overflow-y: auto; overscroll-behavior: contain; padding: 4px;
  scrollbar-width: thin; scrollbar-color: var(--line) transparent;
  background: hsl(var(--popover, 222 40% 9%)); color: inherit;
  border: 1px solid var(--line); border-radius: calc(var(--radius, .625rem) + 2px);
  box-shadow: 0 12px 32px rgba(0,0,0,.45);
}
```

Giữ nguyên 100%: `::-webkit-scrollbar 6px`, `body.light-mode .pp-listbox`, `.pp-item/.pp-check`, `:focus-visible var(--ring)`, `.pp-z`, trigger metrics, `prefers-reduced-motion`. Xóa duy nhất `inset-inline/top:calc(100%+6px)` (giờ do JS).

## 3. JS patch (copy-paste vào `renderer.js`, sau `ppOutside`)

```js
// DS-007: listbox fixed theo trigger — thoát .modal-box overflow:auto
function ppPosition() {
  if (!ppListbox || ppListbox.hidden) return;
  const r = ppTrigger.getBoundingClientRect();
  const gap = 6, maxH = 220;
  const below = window.innerHeight - r.bottom;
  const flip = below < 180 && r.top > below; // gần đáy viewport → mở lên trên
  const h = Math.min(maxH, ppListbox.scrollHeight || maxH);
  const top = flip ? Math.max(8, r.top - h - gap) : r.bottom + gap;
  const avail = Math.max(120, Math.min(maxH, (flip ? r.top - 16 : below - 16)));
  Object.assign(ppListbox.style, { left: r.left + 'px', width: r.width + 'px', top: top + 'px', maxHeight: avail + 'px' });
}
function ppOnScroll() {
  const r = ppTrigger.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight) ppClose(false); // modal scroll quá xa → đóng
  else ppPosition(); // scroll/resize nhẹ → bám theo trigger
}
```

**Nối vào `ppOpen` / `ppClose`** (thay 2 hàm cũ):

```diff
 function ppOpen() {
   ppActiveIndex = Math.max(0, PLATFORM_ORDER.findIndex(([v]) => v === (platformInput.value || 'zalo')));
   ppRender();
   ppListbox.hidden = false;
   ppTrigger.setAttribute('aria-expanded', 'true');
+  ppPosition();
+  window.addEventListener('resize', ppPosition);
+  document.addEventListener('scroll', ppOnScroll, true); // capture: modal-box + window
   ppListbox.querySelector(`[data-index="${ppActiveIndex}"]`)?.focus();
   document.addEventListener('pointerdown', ppOutside, true);
 }
 function ppClose(focusTrigger = true) {
   if (!ppListbox) return;
   ppListbox.hidden = true;
   ppTrigger.setAttribute('aria-expanded', 'false');
+  window.removeEventListener('resize', ppPosition);
+  document.removeEventListener('scroll', ppOnScroll, true);
   document.removeEventListener('pointerdown', ppOutside, true);
   if (focusTrigger) ppTrigger.focus();
 }
```

Không đụng: `PLATFORM_ORDER`, `PP_ZALO_MINI`/`ppIcon()`, `ppRender()`, `ppSelect()` (chọn → `ppClose()` sẵn), keyboard Arrow/Home/End/Enter/Space/Esc, `ppOutside` (`contains()` vẫn đúng vì không dời DOM), `platformInput.value` + `change`, `openModal()`/`modal-save`/avatar-preview.

## 4. Vì sao đủ (flip + listeners + đóng)

- **Không chiếm layout**: `fixed` tách khỏi flow modal → `scrollHeight` modal không phình, hết double scrollbar; scroll duy nhất còn lại là trong listbox 220px.
- **Flip**: `below < 180 && r.top > below` → `top = r.top - h - 6`; đủ 10 item (~400px cần) chỉ hiện 220px scroll trong, không tràn viewport.
- **Bám theo**: `resize` → `ppPosition()`; mọi `scroll` (capture) → `ppOnScroll()` → bám trigger; trigger bay khỏi viewport → `ppClose(false)` (không focus giật).
- **Đóng**: chọn (`ppSelect`), `Esc`, click ngoài (`ppOutside` giữ nguyên), scroll xa — đủ 4 đường.
- **a11y**: `role=listbox/option`, `aria-expanded/selected`, SVG `aria-hidden`, focus ring `var(--ring)`, contrast `currentColor` giữ nguyên; `z-index:200` theo scale dropdown < modal(99) < picker-overlay(200) < toast/tooltip.

## 5. Verify (~2 phút, Electron)

1. Mở modal → mở picker: **modal không sinh scrollbar mới**, chỉ listbox scroll trong.
2. Scroll modal / resize window khi list mở → list bám trigger; scroll mạnh → list tự đóng.
3. Kéo modal cho trigger sát đáy viewport → list **flip lên trên**, đủ `max-height ≥120px`, không cắt.
4. Chọn/Esc/click ngoài → đóng; Enter/Space/Arrow/Home/End vẫn chạy; `Z + Zalo` + 9 SVG + `✓` + dark/light + scrollbar 6px như cũ.
5. `grep 'position: absolute; inset-inline' index.html` → 0 hit ở `.pp-listbox`; `grep 'ppPosition|ppOnScroll' renderer.js` → ≥6 hit.

---
verification: `partially_verified` (patch từ đọc code tĩnh `index.html:500-535/613-653/1298-1310`, `renderer.js:794-871`; chưa chạy Electron).
