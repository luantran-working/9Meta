# DS-006 — Picker fix: hết vỡ "Zalo Zalo", scrollbar, clip (patch copy-paste)

> Scope: FE-005 custom picker đã ship (DS-005) bị vỡ trong modal Thêm/Sửa. Ponytail full: 1 CSS block thay thế + 3 dòng JS, giữ value/keyboard/a11y/0 dep/0 emoji.
> Đọc cùng: `specs/platform-picker.md`, `DESIGN.md §11`, `index.html:613-644` (CSS pp-*), `index.html:1288-1301` (modal HTML), `renderer.js:794-848` (pp logic), `renderer.js:136-137` (Zalo wordmark).

## 1. Audit vỡ (vì sao — dòng chính xác)

| # | Hiện tượng (screenshot) | Nguyên nhân chính xác | Vị trí |
|---|---|---|---|
| F1 | Trigger hiện "Zalo Zalo" trùng | `BRAND_SVG_REAL.zalo` là **simple-icons wordmark** — path vẽ cả bubble "Z" + chữ "alo" bên trong (`renderer.js:137`). Render 18px vẫn đọc được chữ "Zalo" mờ → cộng `pp-trigger-label` "Zalo" = 2 chữ Zalo cạnh nhau. 9 brand còn lại là glyph thuần nên không trùng. | `renderer.js:137` + `822-824` |
| F2 | Item đầu "Zalo Zalo ✓" | Cùng F1, lặp trong listbox: `ppRender()` nhúng nguyên wordmark + label (`renderer.js:816-817`). | `renderer.js:816-817` |
| F3 | Logo Zalo xấu/khó đọc ở 18px | Wordmark thiết kế cho size lớn ( strokes mảnh, aspect rộng). Ép vào 18×18px → nét chữ <1px, vỡ pixel, fail WCAG non-text contrast ở size nhỏ. | `index.html:620` (`svg 18px`) |
| F4 | Listbox scrollbar thô | `.pp-listbox` dùng `overflow:auto` trần, **không có thin-scrollbar** như `#profiles-list` (`index.html:126-139` đã có `scrollbar-width:thin` + `::-webkit-scrollbar 6px`). Scrollbar OS mặc định ~12-15px nổi bật trong popover 240px. | `index.html:624-630` |
| F5 | Modal có dấu hiệu clip | `.modal-box` là scroll container (`overflow:auto`, `index.html:529`). `.pp-listbox` `position:absolute` nằm **trong** scroll container → khi trigger gần đáy modal, phần listbox vượt bounds bị cắt; `z-index:30` vô hiệu qua `overflow` context. | `index.html:524-535` + `624-630` |
| F6 | Trigger metrics lệch `.modal-input` | 2 lỗi: (a) `#pp-trigger-label` **không có** rule ellipsis/flex — CSS cũ chỉ có `.pp-item-label` (`index.html:621`), label trigger co giãn tự do, cao hơn input 1-2px; (b) `button` vs `input` khác `line-height` mặc định, không có `min-height` chốt → trigger cao/thấp hơn input bên trên/dưới. | `index.html:613-621` |

## 2. Quyết định design (giữ / đổi)

- **Zalo ở picker: thay wordmark bằng glyph "Z"** (ô vuông bo 5px nền `#0068ff` + chữ Z trắng 800). Lý do: 18px chỉ đủ 1 glyph; wordmark giữ lại ở avatar-preview 56px (đủ lớn đọc được) và sidebar 44px — không đổi để ít diff nhất.
- **Không đổi value/keyboard/a11y**: `platformInput.value` + `change` event + ArrowUp/Down/Home/End/Enter/Space/Esc + `role=listbox/option` giữ nguyên 100%.
- **Không `position:fixed` mặc định**: list chỉ 10 item, `max-height:220px` (~5 item) + modal tự scroll là đủ; `fixed` + `getBoundingClientRect()` là escape hatch §4 khi QA vẫn thấy clip.

## 3. CSS patch (thay toàn bộ block `index.html:613-644`)

Copy-paste đè đúng block cũ:

```css
.pp-wrap { position: relative; margin-top: 16px; }
.pp-trigger {
  display: flex; align-items: center; gap: 10px;
  margin-top: 0; cursor: pointer; text-align: left; width: 100%;
  min-height: 48px; box-sizing: border-box; line-height: 1.5;
}
/* ponytail: trigger reuse .modal-input nên chỉ thêm flex + min-height chốt metrics */
.pp-trigger-icon, .pp-item-icon { display: inline-flex; flex-shrink: 0; width: 18px; height: 18px; align-items: center; justify-content: center; }
.pp-trigger-icon svg, .pp-item-icon svg { width: 18px; height: 18px; display: block; }
/* DS-006: Zalo mini glyph — wordmark 18px illegible nên dùng Z duy nhất trong picker */
.pp-z { width: 18px; height: 18px; border-radius: 5px; background: #0068ff; color: #fff;
  font-size: 12px; font-weight: 800; line-height: 1; display: inline-flex;
  align-items: center; justify-content: center; flex: none; }
#pp-trigger-label, .pp-item-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pp-chevron { margin-left: auto; opacity: .6; transition: transform .15s ease-out; flex-shrink: 0; }
.pp-trigger[aria-expanded="true"] .pp-chevron { transform: rotate(180deg); }
.pp-listbox {
  position: absolute; inset-inline: 0; top: calc(100% + 6px); z-index: 60;
  max-height: 220px; overflow-y: auto; overscroll-behavior: contain; padding: 4px;
  scrollbar-width: thin; scrollbar-color: var(--line) transparent;
  background: hsl(var(--popover, 222 40% 9%)); color: inherit;
  border: 1px solid var(--line); border-radius: calc(var(--radius, .625rem) + 2px);
  box-shadow: 0 12px 32px rgba(0,0,0,.45);
}
.pp-listbox::-webkit-scrollbar { width: 6px; }
.pp-listbox::-webkit-scrollbar-track { background: transparent; }
.pp-listbox::-webkit-scrollbar-thumb { background: var(--line); border-radius: 999px; }
body.light-mode .pp-listbox { background: #fff; box-shadow: 0 12px 32px rgba(15,23,42,.16); }
.pp-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  min-height: 40px; padding: 8px 10px; border: 0; border-radius: 8px;
  background: transparent; color: inherit; font: inherit; cursor: pointer; text-align: left;
}
.pp-item:hover, .pp-item[data-active="true"] { background: rgba(110,168,255,.12); }
body.light-mode .pp-item:hover, body.light-mode .pp-item[data-active="true"] { background: rgba(37,99,235,.08); }
.pp-item[aria-selected="true"] { font-weight: 700; }
.pp-check { visibility: hidden; font-weight: 700; margin-left: auto; flex-shrink: 0; }
.pp-item[aria-selected="true"] .pp-check { visibility: visible; }
.pp-trigger:focus-visible, .pp-item:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
.pp-trigger-icon svg, .pp-item-icon svg { color: inherit; }
@media (prefers-reduced-motion: reduce) { .pp-chevron { transition: none; } }
```

Thay đổi so với block cũ (để reviewer diff nhanh): `+min-height/box-sizing/line-height` ở trigger; `#pp-trigger-label` vào rule ellipsis; icon container chốt `18px`; `+ .pp-z` (7 dòng); listbox `240→220px`, `+overscroll/scrollbar thin/webkit 6px`, `z-index 30→60`; `.pp-check +margin-left:auto`.

## 4. JS patch (3 dòng trong `renderer.js`, copy-paste)

**Bước 1** — chèn sau `let ppActiveIndex = 0;` (`renderer.js:805`):

```js
// DS-006: Zalo wordmark (BRAND_SVG_REAL.zalo) chứa chữ "Zalo" trong path → 18px
// đọc thành "Zalo Zalo" khi cộng label. Picker dùng glyph Z, sidebar/avatar giữ wordmark.
// ponytail: text Z, không thêm path/lib. Đổi sang SVG Z khi cần pixel-perfect.
const PP_ZALO_MINI = '<span class="pp-z" aria-hidden="true">Z</span>';
function ppIcon(v) { if (v === 'zalo') return PP_ZALO_MINI; return BRAND_SVG_REAL[v] || BRAND_SVG_REAL.custom; }
```

**Bước 2** — trong `ppRender()`, thay 2 dòng:

```diff
-    b.innerHTML = `<span class="pp-item-icon">${BRAND_SVG_REAL[v] || BRAND_SVG_REAL.custom}</span>`
+    b.innerHTML = `<span class="pp-item-icon">${ppIcon(v)}</span>`
```

```diff
-  ppTriggerIcon.innerHTML = BRAND_SVG_REAL[cur] || BRAND_SVG_REAL.custom;
+  ppTriggerIcon.innerHTML = ppIcon(cur);
```

Không đụng: `ppOpen/ppClose/ppOutside/ppSelect`, keyboard handler, `openModal()` + `ppRender()`, listener `change`, `modal-save`. `updateAvatarPreview()` giữ wordmark (56px đủ đọc).

**Escape hatch clip (chỉ khi QA vẫn thấy cắt đáy modal)** — thêm cuối `ppOpen()`, sau `ppListbox.hidden = false;`:

```js
// DS-006 escape hatch: nếu modal đáy vẫn clip, thả listbox thành fixed theo trigger
// const r = ppTrigger.getBoundingClientRect();
// Object.assign(ppListbox.style, { position: 'fixed', left: r.left + 'px', top: (r.bottom + 6) + 'px', width: r.width + 'px' });
```

Mặc định để comment; bật khi QA FAIL clip.

## 5. Verify (~2 phút, Electron)

1. Mở Thêm profile → trigger hiện **1 ô Z xanh + "Zalo"** (không còn chữ Zalo mờ trong logo).
2. Mở list → item Zalo là **Z + "Zalo" + ✓**, 9 item còn lại SVG 18px + label + check đúng item selected.
3. Listbox scroll mượt, scrollbar 6px mảnh cả dark/light; mở gần đáy modal không bị cắt (nếu cắt → bật escape hatch §4).
4. Trigger cao bằng input Tên/Proxy (48px), label dài ("Microsoft Teams") ellipsis không vỡ hàng.
5. Chọn platform → avatar preview đổi, Custom Link hiện URL input, Lưu → sidebar logo đúng; keyboard Tab→Enter→↓↑→Enter→Esc không kẹt.
6. `grep 'BRAND_SVG_REAL\[v\]\|BRAND_SVG_REAL\[cur\]' renderer.js` → 0 hit (đã qua `ppIcon`); `grep 'pp-z' index.html renderer.js` → 2 hit (CSS + JS).

---
verification: `partially_verified` (patch từ đọc code tĩnh `index.html:613-644/1288-1301`, `renderer.js:136-137/794-848`; chưa chạy Electron).
