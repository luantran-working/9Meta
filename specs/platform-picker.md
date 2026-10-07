# Spec: Custom platform picker — shadcnUI Select (DS-005)

> Scope: thay native `<select id="profile-platform-input">` (`index.html:1255-1266`) bằng custom picker. Ponytail full: 1 hidden input + 1 button + 1 listbox, reuse `BRAND_SVG_REAL` + tokens shadcn + Quicksand sẵn có, 0 dep mới, 0 emoji.
> Đọc cùng: `DESIGN.md §11`, `specs/real-icons.md §3` (SVG source), `renderer.js:8,290-318,788-840` (code cũ giữ nguyên logic).

## 1. Vì sao bắt buộc custom (không style native)

Native `<option>` không render được SVG/img bên trong — chỉ text thuần. User chê emoji prefix (💬 ✈️…) xấu; yêu cầu logo thật 18px mỗi item → chỉ custom button+listbox mới chứa được inline SVG từ `BRAND_SVG_REAL`. Quyết định này là bắt buộc kỹ thuật, không phải gu thẩm mỹ.

## 2. Layout

```
[label "Nền tảng" — reuse .muted]
[trigger button 100% width, h ≈ 48px, padding 13px 14px = .modal-input]
  [SVG 18px currentColor] [Tên platform]        [chevron ▾]
[popover listbox, absolute dưới trigger, width 100%, max-height 240px scroll]
  [item 40px] [SVG 18px] [Tên]                              [✓ khi selected]
```

- Trigger tái dùng metrics `.modal-input` (padding/border/bg) → nhìn là 1 họ form, không thêm ngôn ngữ mới.
- Popover `position:absolute; inset-inline:0; top:calc(100% + 6px)` trong wrapper `position:relative`. `z-index` theo scale modal (popover = modal + 1, không số lẻ 9999).
- Item 10 cái, thứ tự + label (value giữ nguyên để không vỡ store/partition):

| value | label |
|---|---|
| zalo | Zalo |
| telegram | Telegram |
| messenger | Messenger |
| fanpage | FB Fanpage |
| facebook | Facebook |
| whatsapp | WhatsApp |
| discord | Discord |
| teams | Microsoft Teams |
| gmail | Google / Gmail |
| custom | Custom Link |

## 3. HTML structure (thay `index.html:1255-1266`)

```html
<!-- GIỮ id + .value API: select → hidden input cùng id -->
<input type="hidden" id="profile-platform-input" value="zalo">
<div class="pp-wrap" id="platform-picker">
  <button type="button" class="modal-input pp-trigger" id="pp-trigger"
    aria-haspopup="listbox" aria-expanded="false" aria-labelledby="pp-label pp-trigger-label">
    <span class="pp-trigger-icon" id="pp-trigger-icon" aria-hidden="true"></span>
    <span id="pp-trigger-label">Zalo</span>
    <svg class="pp-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  </button>
  <div class="pp-listbox" id="pp-listbox" role="listbox" aria-label="Nền tảng"
    tabindex="-1" hidden></div>
</div>
```

- Item render bằng JS (không hardcode 10 block HTML — SVG lấy từ `BRAND_SVG_REAL`, 1 nguồn thật duy nhất):

```html
<!-- mẫu 1 item do JS sinh -->
<button type="button" class="pp-item" role="option" data-value="zalo"
  aria-selected="true" data-active="true">
  <span class="pp-item-icon" aria-hidden="true"><!-- BRAND_SVG_REAL.zalo, size 18px via CSS --></span>
  <span class="pp-item-label">Zalo</span>
  <span class="pp-check" aria-hidden="true">✓</span>
</button>
```

- `ponytail: check = text "✓" weight 700`, không thêm icon lib. Khi nào cần pixel-perfect shadcn → thay bằng lucide `check` path.

## 4. CSS snippet (append vào `<style>` cạnh `.modal-select`, ~50 dòng)

```css
.pp-wrap { position: relative; margin-top: 16px; }
.pp-trigger {
  display: flex; align-items: center; gap: 10px;
  margin-top: 0; cursor: pointer; text-align: left; width: 100%;
}
/* ponytail: trigger reuse .modal-input nên chỉ thêm flex; radius/border/bg/focus ăn theo */
.pp-trigger-icon, .pp-item-icon { display: inline-flex; flex-shrink: 0; }
.pp-trigger-icon svg, .pp-item-icon svg { width: 18px; height: 18px; display: block; }
/* fill/stroke do inline attr của BRAND_SVG_REAL quyết định — cấm set fill trong CSS (quy tắc DS-003) */
.pp-trigger-label, .pp-item-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pp-chevron { margin-left: auto; opacity: .6; transition: transform .15s ease-out; flex-shrink: 0; }
.pp-trigger[aria-expanded="true"] .pp-chevron { transform: rotate(180deg); }
.pp-listbox {
  position: absolute; inset-inline: 0; top: calc(100% + 6px); z-index: 30;
  max-height: 240px; overflow: auto; padding: 4px;
  background: hsl(var(--popover, 222 40% 9%)); color: inherit;
  border: 1px solid var(--line); border-radius: calc(var(--radius, .625rem) + 2px);
  box-shadow: 0 12px 32px rgba(0,0,0,.45);
}
body.light-mode .pp-listbox { background: #fff; box-shadow: 0 12px 32px rgba(15,23,42,.16); }
.pp-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  min-height: 40px; padding: 8px 10px; border: 0; border-radius: 8px;
  background: transparent; color: inherit; font: inherit; cursor: pointer; text-align: left;
}
.pp-item:hover, .pp-item[data-active="true"] { background: rgba(110,168,255,.12); }
body.light-mode .pp-item:hover, body.light-mode .pp-item[data-active="true"] { background: rgba(37,99,235,.08); }
.pp-item[aria-selected="true"] { font-weight: 700; }
.pp-check { visibility: hidden; font-weight: 700; }
.pp-item[aria-selected="true"] .pp-check { visibility: visible; }
.pp-trigger:focus-visible, .pp-item:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
.pp-trigger-icon svg, .pp-item-icon svg { color: inherit; } /* currentColor ≥4.5:1 theo DS-003 §6 */
@media (prefers-reduced-motion: reduce) { .pp-chevron { transition: none; } }
```

- Xóa CSS `.modal-select option` cũ (`index.html:604-611`) khi không còn `<select>` nào khác ngoài crm/campaign/ai (giữ rule cho 3 select còn lại — chỉ xóa nếu đã migrate hết; ponytail: để yên, vô hại).
- Escape hatch kẹt `overflow:auto` của `.modal-box`: listbox absolute scroll cùng modal là chấp nhận được với 10 item; nếu QA thấy clipping ở modal đáy → chuyển `.pp-listbox` sang `position:fixed` tính tọa độ bằng `getBoundingClientRect()` (ghi sẵn để frontend không đoán).

## 5. JS behavior (append cuối `renderer.js`, ~45 dòng + 3 patch 1-dòng)

```js
// DS-005 custom platform picker — reuse BRAND_SVG_REAL, giữ platformInput.value API
const PLATFORM_ORDER = [
  ['zalo','Zalo'], ['telegram','Telegram'], ['messenger','Messenger'],
  ['fanpage','FB Fanpage'], ['facebook','Facebook'], ['whatsapp','WhatsApp'],
  ['discord','Discord'], ['teams','Microsoft Teams'], ['gmail','Google / Gmail'],
  ['custom','Custom Link'],
];
const ppTrigger = document.getElementById('pp-trigger');
const ppListbox = document.getElementById('pp-listbox');
const ppTriggerIcon = document.getElementById('pp-trigger-icon');
const ppTriggerLabel = document.getElementById('pp-trigger-label');
let ppActiveIndex = 0;

function ppRender() {
  const cur = platformInput.value || 'zalo';
  ppListbox.innerHTML = '';
  PLATFORM_ORDER.forEach(([v, label], i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pp-item'; b.setAttribute('role', 'option');
    b.dataset.value = v; b.dataset.index = i;
    b.setAttribute('aria-selected', String(v === cur));
    b.dataset.active = String(i === ppActiveIndex);
    b.innerHTML = `<span class="pp-item-icon">${BRAND_SVG_REAL[v] || BRAND_SVG_REAL.custom}</span>`
      + `<span class="pp-item-label">${label}</span><span class="pp-check">✓</span>`;
    b.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    b.onclick = () => ppSelect(v);
    ppListbox.appendChild(b);
  });
  ppTriggerIcon.innerHTML = BRAND_SVG_REAL[cur] || BRAND_SVG_REAL.custom;
  ppTriggerIcon.querySelector('svg')?.setAttribute('aria-hidden', 'true');
  ppTriggerLabel.textContent = (PLATFORM_ORDER.find(([v]) => v === cur) || ['' ,'Custom Link'])[1];
}
function ppOpen() {
  ppActiveIndex = Math.max(0, PLATFORM_ORDER.findIndex(([v]) => v === (platformInput.value || 'zalo')));
  ppRender();
  ppListbox.hidden = false;
  ppTrigger.setAttribute('aria-expanded', 'true');
  ppListbox.querySelector(`[data-index="${ppActiveIndex}"]`)?.focus();
  document.addEventListener('pointerdown', ppOutside, true);
}
function ppClose(focusTrigger = true) {
  ppListbox.hidden = true;
  ppTrigger.setAttribute('aria-expanded', 'false');
  document.removeEventListener('pointerdown', ppOutside, true);
  if (focusTrigger) ppTrigger.focus();
}
function ppOutside(e) { if (!document.getElementById('platform-picker').contains(e.target)) ppClose(false); }
function ppSelect(v) {
  if (platformInput.value !== v) {
    platformInput.value = v; // API cũ giữ nguyên — save/openModal/change-listener không vỡ
    platformInput.dispatchEvent(new Event('change', { bubbles: true })); // kích hoạt listener cũ (avatar preview + customUrl toggle)
  }
  ppRender(); ppClose();
}
ppTrigger.onclick = () => (ppListbox.hidden ? ppOpen() : ppClose(false));
ppTrigger.onkeydown = (e) => {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ppOpen(); }
};
ppListbox.onkeydown = (e) => {
  const items = () => [...ppListbox.querySelectorAll('.pp-item')];
  if (e.key === 'Escape') { e.preventDefault(); ppClose(); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ppSelect(items()[ppActiveIndex]?.dataset.value); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    ppActiveIndex = (ppActiveIndex + (e.key === 'ArrowDown' ? 1 : -1) + items().length) % items().length;
    ppRender(); items()[ppActiveIndex]?.focus();
  } else if (e.key === 'Home') { e.preventDefault(); ppActiveIndex = 0; ppRender(); items()[0]?.focus(); }
  else if (e.key === 'End') { e.preventDefault(); ppActiveIndex = items().length - 1; ppRender(); items().at(-1)?.focus(); }
};
```

**3 patch 1-dòng vào code cũ (bắt buộc, liệt kê đủ để frontend không sót):**

1. `openModal()` sau `platformInput.value = ...` (`renderer.js:297`) thêm `ppRender();` — nếu không, mở modal Sửa sẽ hiện label cũ.
2. Listener `platformInput change` (`renderer.js:788`) giữ nguyên 100% — `ppSelect` đã dispatch `change` nên avatar preview + customUrl toggle chạy lại không sửa.
3. `modal-save` (`renderer.js:811-840`) giữ nguyên — đọc `platformInput.value` như cũ.

## 6. States checklist (cho @frontend + QA)

| State | Trigger | Kỳ vọng |
|---|---|---|
| default | đóng | logo 18px + label + chevron, viền như `.modal-input` |
| hover (trigger) | pointer | border-color + shadow như `.modal-input:focus` nhẹ (ăn theo) |
| open | click/Enter/↓ | listbox hiện, `aria-expanded=true`, focus item hiện tại |
| hover/active (item) | pointer/Arrow | nền `rgba(110,168,255,.12)`, focus ring 2px `var(--ring)` |
| selected | Enter/click | check ✓ hiện, trigger cập nhật icon+label, `aria-selected=true`, `change` fired |
| closed/Esc | Esc/chọn/click ngoài | listbox `hidden`, focus về trigger, `aria-expanded=false` |
| dark/light | toggle theme | popover bg `#121b2f→--popover` / `#fff`, icon `currentColor` đọc được cả 2 |
| custom | chọn Custom Link | `profile-custom-url-input` hiện (qua listener cũ, không code mới) |

## 7. a11y (ràng buộc cứng, không thương lượng)

- `button[aria-haspopup=listbox][aria-expanded]` + `div[role=listbox]` + `button[role=option][aria-selected]` — đúng pattern shadcn Select.
- SVG trang trí `aria-hidden="true"` (trigger + item), screen reader đọc label text.
- Keyboard đầy đủ: `ArrowUp/Down`, `Home/End`, `Enter/Space`, `Esc`; focus-visible ring 2px; target item 40px (gần 44px, trong modal desktop chấp nhận — ghi rõ để QA không bắt lỗi oan).
- `prefers-reduced-motion`: tắt xoay chevron.
- Không type-ahead: `ponytail:` bỏ qua (10 item cuộn <1s), thêm khi list >20.

## 8. Verify (~2 phút, Electron)

1. Mở Thêm/Sửa → trigger hiện logo + tên đúng platform, không emoji/chữ cái.
2. Mở list → đủ 10 item, mỗi item có SVG 18px + check ở item đang chọn.
3. Chọn platform khác → avatar preview đổi logo, Custom Link hiện URL input.
4. Lưu → sidebar render logo mới, partition đổi khi đổi platform (logic cũ).
5. Keyboard-only: Tab tới trigger → Enter → ↓↑ → Enter → Esc — không kẹt focus.
6. `grep 'profile-platform-input' renderer.js index.html` → refs vẫn là hidden input + `pp*` mới; không còn `<select id="profile-platform-input">` ولا emoji trong modal.

---
verification: `partially_verified` (spec từ đọc code tĩnh `index.html:1255-1266`, `renderer.js:8/290-318/788-840`, `specs/real-icons.md`; chưa chạy Electron).
