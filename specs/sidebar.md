# Spec: Sidebar 9Meta — shadcnUI (DS-001)

> Áp trực tiếp vào `index.html` (CSS inline) + `renderer.js`. Giữ `--sidebar:72px`, dark mặc định.

## 1. Layout

```
#sidebar: 72px fixed, full height, flex column, align center
  #brand-badge 40px (top, mb 12px)
  #profiles-list (flex col, gap 8px, flex:1, overflow-y auto, width 100%, align center)
  #btn-add-profile 44px (mt 8px)
  .sidebar-spacer
  #btn-tools-launcher 44px (bottom)
```

- Gap thống nhất **8px** (cũ 10px/6px loạn). Padding sidebar `12px 0 10px`.
- Không transform `translateY/scale` trên hover (gây rung cột) — chỉ đổi background/border.

## 2. Tokens patch (thay `:root` line 11-25 + `body.light-mode` 45-57)

```css
:root, body.dark-mode{
  --sidebar:4.5rem; --sidebar-btn:2.75rem; --radius:.625rem;
  --background:rgba(6,11,20,1); --foreground:#eef4ff;
  --primary:#6ea8ff; --primary-fg:#060b14;
  --secondary:rgba(255,255,255,.08); --secondary-fg:#eef4ff;
  --muted-fg:#a9bcd9; --border:rgba(255,255,255,.1);
  --accent:#7c5cff; --destructive:#ff5c7c; --ring:#6ea8ff;
}
body.light-mode{
  --background:#fff; --foreground:#17253d;
  --primary:#2563eb; --primary-fg:#fff;
  --secondary:rgba(16,30,60,.06); --secondary-fg:#0f2c58;
  --muted-fg:#475569; --border:rgba(16,30,60,.1);
  --ring:#2563eb;
}
#sidebar{background:hsl(var(--background,0 0% 0%));background:var(--background);
  border-right:1px solid var(--border);box-shadow:none;}
body.light-mode #sidebar{background:#fff;}
```

> `ponytail:` giữ hex/rgba thay oklch để patch 1:1 không vỡ code cũ.

## 3. Component specs

### 3.1 Brand badge (`#brand-badge`) — 40px

```css
#brand-badge{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;
  background:var(--primary);color:var(--primary-fg);font-weight:800;font-size:15px;
  letter-spacing:.2px;box-shadow:none;margin-bottom:12px;overflow:hidden}
#brand-badge img{width:100%;height:100%;object-fit:cover}
/* HTML: <div id="brand-badge"><img src="icon.png" alt="9Meta"></div> — dùng icon mới, text 9M chỉ khi thiếu img */
```

### 3.2 Profile avatar button — 44px, `<button>`, mọi state

```css
.profile-btn{width:var(--sidebar-btn);height:var(--sidebar-btn);border-radius:14px;
  background:var(--secondary);color:var(--secondary-fg);border:1px solid var(--border);
  display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;
  position:relative;cursor:pointer;transition:background .15s ease,border-color .15s ease;overflow:hidden}
.profile-btn:hover{background:rgba(110,168,255,.18);border-color:rgba(110,168,255,.4)}
.profile-btn.active{background:var(--primary);color:var(--primary-fg);border-color:transparent}
.profile-btn:focus-visible,.tool-btn:focus-visible,#btn-add-profile:focus-visible{
  outline:2px solid var(--ring);outline-offset:2px}
.profile-btn img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.profile-btn svg.brand{width:20px;height:20px;fill:currentColor}
```

States: `default` (secondary) / `hover` (tint primary) / `active` (primary + `aria-current="true"`) / `focus-visible` (ring) / `unread` (badge) / `disabled[appLocked]` (`opacity:.5;cursor:not-allowed`).

`renderer.js renderSidebar()` — thay `div` bằng `button`:

```js
const btn = document.createElement('button');
btn.type = 'button';
btn.className = `profile-btn ${p.id === activeProfileId ? 'active' : ''}`;
btn.setAttribute('aria-label', `${p.name} (${p.platform || 'zalo'})`);
if (p.id === activeProfileId) btn.setAttribute('aria-current', 'true');
btn.innerHTML = ''; // rồi append avatar/SVG/emoji + badge như cũ
btn.disabled = appLocked;
```

### 3.3 Tool button — 40px ghost

```css
.tool-btn{width:2.5rem;height:2.5rem;border-radius:12px;background:transparent;
  color:var(--muted-fg);border:1px solid transparent;display:flex;align-items:center;justify-content:center}
.tool-btn:hover{background:var(--secondary);color:var(--secondary-fg)}
.tool-btn.active{background:var(--secondary);color:var(--foreground);border-color:var(--border)}
.tool-btn.launcher{background:var(--primary);color:var(--primary-fg)}
.tool-btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
body.light-mode .tool-btn:hover,body.light-mode .tool-btn.active{color:#0f2c58}
body.light-mode .tool-btn.launcher{color:#fff}
```

### 3.4 Add button (dashed)

```css
#btn-add-profile{width:var(--sidebar-btn);height:var(--sidebar-btn);border-radius:14px;
  border:1.5px dashed var(--border);background:transparent;color:var(--muted-fg)}
#btn-add-profile:hover{color:var(--foreground);border-color:var(--ring);background:var(--secondary)}
```

### 3.5 Unread badge — 18px

```css
.badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;
  border-radius:999px;display:none;align-items:center;justify-content:center;
  background:var(--destructive);color:#fff;font-size:10px;font-weight:700;
  border:2px solid var(--background)}
/* 0 → display:none; 1-9 số; >9 → "9+" (giữ logic renderer.js:925-929) */
```

### 3.6 Tooltip CSS-only (thay `title`)

```html
<button class="profile-btn" data-tip="Nick 1 (zalo)" aria-label="Nick 1 (zalo)">…</button>
```

```css
[data-tip]{position:relative}
[data-tip]:hover::after,[data-tip]:focus-visible::after{content:attr(data-tip);
  position:absolute;left:calc(100% + 10px);top:50%;translate:0 -50%;white-space:nowrap;
  background:var(--foreground);color:var(--background);font-size:12px;font-weight:600;
  padding:6px 10px;border-radius:8px;z-index:50;pointer-events:none}
/* renderSidebar: btn.dataset.tip = btn.title; btn.removeAttribute('title') — title không hiện khi focus */
```

### 3.7 Scrollbar (không ẩn)

```css
#profiles-list{scrollbar-width:thin;scrollbar-color:var(--border) transparent}
#profiles-list::-webkit-scrollbar{width:6px;display:block}
#profiles-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
/* xóa block cũ ::-webkit-scrollbar{display:none} line 109-111 */
```

### 3.8 Reduced motion (append cuối `<style>`)

```css
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
```

## 4. Responsive

- Giữ 72px mọi viewport (desktop app). `@media(max-width:920px)` hiện tại chỉ chạm `.tools-panel` — không đổi sidebar.
- Min target 44px đã đạt; không thu nhỏ thêm.

## 5. A11y checklist (frontend verify)

- [ ] `<button>` + `aria-label` + `aria-current` đúng active duy nhất
- [ ] Tab tới từng btn thấy `:focus-visible` ring
- [ ] Enter/Space đổi profile (native button)
- [ ] Badge `aria-hidden="true"` + label đã chứa tên (tránh SR đọc số 2 lần) — thêm `badge.setAttribute('aria-hidden','true')`
- [ ] `prefers-reduced-motion` không còn animation
- [ ] Contrast muted `#a9bcd9`/dark, `#475569`/light ≥ 4.5:1

## 6. Icon app fix — cấm chữ cái, dùng SVG/emoji

Quy tắc render: `p.avatar img` → `brand SVG inline` → `emoji`. Xóa map chữ cái `renderer.js:130`.

```js
// ponytail: emoji fallback đủ nhận diện, add SVG brand khi có asset
const PLATFORM_EMOJI = { zalo:'💬', telegram:'✈️', messenger:'💙', fanpage:'🚩', facebook:'📘', whatsapp:'💚', discord:'💜', teams:'🟣', gmail:'📧', custom:'🔗' };
function platformFallback(p){ return PLATFORM_EMOJI[p||'zalo'] || '💬'; }
// SVG inline mẫu (lucide-style, stroke) cho tool-btn đã có — giữ; brand icon dùng fill:
const BRAND_SVG = {
  telegram:'<svg class="brand" viewBox="0 0 24 24"><path d="M21.9 4.6 2.7 12.1c-.8.3-.8 1.4.1 1.6l4.7 1.5 1.8 5.6c.3.8 1.3.9 1.8.2l2.6-2.6 4.9 3.6c.6.4 1.5.1 1.7-.6l2.6-15c.2-.9-.6-1.7-1-1.8z"/></svg>',
  messenger:'<svg class="brand" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.1 2 11.3c0 2.9 1.6 5.4 4 7v3.7l3.7-2c1 .3 2 .4 3.1.4h.2c5.5 0 10-4.1 10-9.1S17.5 2 12 2z"/></svg>',
};
// zalo/messenger/facebook/whatsapp/discord: lấy favicon chính chủ hoặc simple-icons path, cùng pattern fill currentColor 20px
```

- Modal `<select>` giữ emoji hiện tại (đã chuẩn).
- `icon.png/.ico`: rounded-square 512, nền `#0b1220`, chữ `9M` trắng + dot `#6ea8ff`; xuất ico 16/32/48/256. Brand-badge `<img src="icon.png">` sẽ tự khớp taskbar/tray.

## 7. Patch order cho @frontend (áp theo thứ tự)

1. Thay `:root` + `body.light-mode` (§2); sửa `#sidebar` flat (§2).
2. Thay toàn bộ block `.profile-btn/.tool-btn/.badge/#btn-add-profile` (§3.2-3.5) + thêm tooltip/scrollbar/reduced-motion (§3.6-3.8).
3. `renderer.js`: `platformIcon` → `platformFallback`; `renderSidebar` tạo `<button>` + aria (§3.2); badge `aria-hidden`; `data-tip` thay `title`.
4. `#brand-badge` 40px + `<img icon.png>` (§3.1).

---
verification: `partially_verified` (spec tĩnh từ source, chưa chạy Electron).
