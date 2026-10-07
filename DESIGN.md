# 9Meta — DESIGN.md (Sidebar shadcnUI)

> Scope: DS-001 sidebar Electron. Ponytail full: tokens chuẩn, không over-design.
> Stack: Electron + inline CSS `index.html` + `renderer.js`. Dark mặc định (`body.dark-mode`), light qua `body.light-mode`.

## 1. Audit nhanh sidebar hiện tại

| # | Vấn đề | Vị trí | Mức |
|---|--------|--------|-----|
| A1 | `platformIcon()` trả chữ cái đơn (Z/M/F/W/D/T/G) — sai nhận diện app, trùng nhau (M = messenger?) | `renderer.js:130`, `renderSidebar():224-247`, `updateAvatarPreview()` | P0 |
| A2 | Profile item là `div` + `onclick`, không `tabindex`, không Enter/Space, không `aria-label`/`aria-current` | `renderer.js:227-244` | P0 a11y |
| A3 | Không có `:focus-visible`, không tooltip keyboard, `title`-only | `index.html:113-226` | P0 a11y |
| A4 | Scrollbar bị ẩn hoàn toàn (`scrollbar-width:none`, `::-webkit-scrollbar{display:none}`) — mất affordance keyboard/scroll | `index.html:104-111` | P1 |
| A5 | Token tự chế (`--bg --panel --line --muted`) không theo shadcn, override light-mode rải rác, `--radius` không có | `index.html:11-57` | P1 |
| A6 | Gradient + shadow nặng mọi nơi (ghost-card: `1px border` + `blur 16-80px shadow`), glassmorphism trang trí | `index.html:70-76,93,133,149` | P1 |
| A7 | Radius loạn: 14/17/18/28px; sidebar 72px + btn 46/44/48px không theo scale 4px | `index.html:12,85,122,175` | P2 |
| A8 | Badge `border:2px solid #0f1624` hardcode — vỡ trên light-mode; font 9px dưới ngưỡng đọc | `index.html:152-168` | P1 |
| A9 | Hover `translateY(-2px) scale(1.04)` gây layout-shift cảm nhận, không có `prefers-reduced-motion` | `index.html:141-144` | P1 |
| A10 | `icon.png`/`icon.ico` là app icon cũ, không khớp brand badge gradient `9M` | repo root | P2 |
| A11 | `#brand-badge` là text `9M` (font-weight 900) — không phải logo, không scale favicon/taskbar | `index.html:84-96,829` | P2 |

## 2. Direction (shadcnUI cho Electron desktop)

- **Restrained**: neutrals + 1 accent ≤10% diện tích sidebar. Sidebar là chrome, không phải hero — bỏ radial-gradient nền body khỏi sidebar.
- **Dark-first** (scene: telesale trực 8-12h/ngày trong phòng thiếu sáng, nhìn sidebar liếc <1s để đổi nick) → dark mặc định, light là mirror token.
- **Flat > gradient**: bỏ mọi `linear-gradient(135deg, ...)` trong sidebar; active = `background:var(--primary)` + `ring`.
- **Radius scale**: `--radius:0.625rem (10px)`; sidebar btn `calc(var(--radius)+4px)=14px`; brand `14px`; badge/tooltip `999px`.
- **Contrast**: text ≥4.5:1, muted ≥4.5:1 (shadcn muted mặc định fail → đã bump foreground muted sáng hơn).

## 3. Design tokens (drop-in thay `:root` cũ)

```css
:root, body.dark-mode {
  --background: 222 47% 7%;        /* #060b14 */
  --foreground: 213 100% 96%;      /* #eef4ff */
  --card: 222 40% 10%;
  --popover: 222 40% 9%;
  --primary: 217 100% 71%;         /* #6ea8ff */
  --primary-foreground: 222 47% 7%;
  --secondary: 222 22% 14%;
  --secondary-foreground: 213 100% 96%;
  --muted: 222 18% 18%;
  --muted-foreground: 218 32% 72%; /* #a9bcd9 — bump từ #8ea2c8 cho đủ 4.5:1 */
  --accent: 250 100% 69%;          /* #7c5cff giữ làm accent phụ */
  --accent-foreground: 0 0% 100%;
  --destructive: 348 100% 68%;     /* #ff5c7c */
  --destructive-foreground: 0 0% 100%;
  --border: 213 30% 100% / 0.1;    /* dùng color-mix hoặc rgba(255,255,255,.1) */
  --input: 222 22% 16%;
  --ring: 217 100% 71%;
  --radius: 0.625rem;
  --sidebar: 4.5rem;               /* 72px giữ nguyên */
  --sidebar-btn: 2.75rem;          /* 44px thống nhất (bỏ 46px) */
}
body.light-mode {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --popover: 0 0% 100%;
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;
  --secondary: 214 32% 94%;
  --secondary-foreground: 222 47% 11%;
  --muted: 214 32% 94%;
  --muted-foreground: 215 16% 38%; /* #556070-ish, ≥4.5:1 trên trắng */
  --accent: 250 80% 60%;
  --destructive: 348 80% 55%;
  --border: 222 20% 10% / 0.1;
  --input: 214 32% 91%;
  --ring: 221 83% 53%;
}
```

> Dùng `hsl(var(--x))` như shadcn. `--border` dạng alpha: khai báo `--border: rgba(255,255,255,.1)` thực tế để khỏi cần color-mix (Electron Chromium mới hỗ trợ cả hai — chọn rgba cho ngắn).

## 4. Component map (chi tiết tại `specs/sidebar.md`)

| Component | File áp dụng | Trạng thái |
|---|---|---|
| `brand badge` 40px, flat primary, img logo | `index.html#brand-badge` | default only |
| `profile avatar button` 44px `<button>`, img > SVG > emoji | `renderer.js renderSidebar()` | default/hover/active/focus/unread/disabled |
| `tool-btn` 40px ghost | `index.html .tool-btn` | default/hover/active/focus |
| `add button` dashed `--border` | `index.html #btn-add-profile` | default/hover/focus |
| `tooltip` CSS-only `[data-tip]` | mới, thay `title` | hover/focus-visible |
| `scrollbar` 6px thin, không ẩn | `#profiles-list` | default/hover |
| `unread badge` 18px destructive, ring background | `.badge` | 0=hidden, 1-9, 9+ |

## 5. Icon app (logo thật thay chữ cái)

- **Quy tắc**: `avatar img (user)` > `platform brand SVG inline 20px` > `emoji fallback`. Cấm chữ cái đơn.
- **Emoji map chuẩn** (fallback + `<select>` modal): zalo `💬`, telegram `✈️`, messenger `💙`, fanpage `🚩`, facebook `📘`, whatsapp `💚`, discord `💜`, teams `🟣`, gmail `📧`, custom `🔗`. Giữ nguyên option hiện tại `index.html:1167-1178` — đã đúng.
- **SVG**: dùng brand path đơn giản (fill currentColor, không stroke) hoặc favicon chính chủ cache local. Snippet trong `specs/sidebar.md §6`.
- **`icon.png`/`icon.ico`**: vẽ lại — rounded-square 512px, nền `#0b1220`, glyph `9M` trắng + dot primary `#6ea8ff`; xuất `.ico` (16/32/48/256) + `icon.png` 512. Không dùng gradient 2 màu cũ.

## 6. Responsive + a11y (ràng buộc cứng)

- Mọi `.profile-btn`/`.tool-btn` phải là `<button type="button">` + `aria-label="..."` + `aria-current` khi active.
- `:focus-visible { outline:2px solid hsl(var(--ring)); outline-offset:2px; }` — không dùng `outline:none` trần.
- Keyboard: Enter/Space kích hoạt (native `<button>`), `ArrowUp/Down` trong `#profiles-list` (roving tabindex — frontend tự thêm, ~10 dòng).
- `@media (prefers-reduced-motion: reduce){ *{transition:none!important; animation:none!important} }`.
- Touch: min-target 44px đã đạt (`--sidebar-btn`).

## 7. Cho @frontend (không forward lại — đọc file)

Áp patch theo `specs/sidebar.md §7` (thay `:root`, `.profile-btn`, `.tool-btn`, `renderSidebar`, thêm tooltip+scrollbar+focus). Không đổi logic profile/ipc. Verify: mở app, Tab qua từng btn thấy ring, unread badge hiện/khuất, light-mode không vỡ badge.

## 8. Icon app + Typography Quicksand (DS-002 — chi tiết tại `specs/icon-font.md`)

### 8.1 Icon (audit: magic bytes, không đoán)
- `icon.png` hiện tại là **JPEG đội lốt** (1254px lockup marketing: squircle + chữ "9Meta" + tagline, nền xám đục) — sai format, sai content, vỡ ở 16–40px (tray `main.js:164`, badge `index.html:911`, BrowserWindow `main.js:408`).
- `icon.ico` chỉ **1 entry 256px** — thiếu 16/32/48 → taskbar/installer mờ size nhỏ.
- `icon_old.ico` là **PNG đội lốt .ico** — file chết, xóa.
- Icon đúng = **crop squircle "9" từ `icon.png` sẵn có** (không vẽ brand mới), nền transparent, padding ~8%: xuất `icon.png` 512 đè file cũ + `icon.ico` 16/32/48/256 đè file cũ + `package.json` thêm `"win": { "icon": "icon.ico" }`. Badge 40px giữ CSS, tự đúng khi ảnh mới tight.

### 8.2 Typography (Inter → Quicksand)
- Token: `--font-sans: Quicksand, Inter, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;` (Inter giữ vị trí fallback 2).
- Load offline-first: `fonts/quicksand-{400,500,600,700}.woff2` + `@font-face font-display:swap` (snippet trong spec); CDN Google Fonts chỉ fallback dev, không ship.
- Weights dùng: 400/500/600/700. Telesale readability: body `line-height 1.55–1.6`; label ≤12px dùng weight ≥500 + `letter-spacing +0.01em`; heading tracking `0 → -0.01em` (cấm tracking âm sâu); `.metric-value -.8px` → `-0.01em` tương đối.
- Contrast/màu giữ nguyên → audit DS-001 còn hiệu lực. 4 woff2 ≈ 60–80 KB local, không network, không FOIT.

## 9. Brand icons full 10 platform (DS-003 — chi tiết tại `specs/brand-icons.md`)

- **Audit**: `BRAND_SVG` cũ chỉ 2/10 key (telegram, messenger) → 8 platform rớt emoji; `p.avatar` truthy + `normalizeProfiles()` giữ avatar cũ → `<img>` che SVG mới vĩnh viễn. Screenshot "icon chưa thay" là DOM/avatar cached, không phải CSS.
- **Map**: zalo = "Z" stroke tự vẽ (không có trong simple-icons/lucide); telegram/messenger = path cũ trong repo; facebook = simple-icons `facebook` fill; fanpage/whatsapp/discord/teams/gmail/custom = lucide stroke (`flag`, `phone`, `message-circle`, `users`, `mail`, `link`).
- **Quy tắc render**: `avatar img` > `BRAND_SVG` > `PLATFORM_EMOJI`. CSS `.profile-btn svg.brand` chỉ set size (20px), fill/stroke do inline attr — cấm `fill:currentColor` trong CSS (đè `fill="none"` của icon stroke).
- **Nút "Xóa ảnh"** trong modal (ghost, chỉ hiện khi có avatar) — bắt buộc, nếu không profile cũ không bao giờ lộ SVG.
- **Contrast**: icon `currentColor` trên `secondary-fg` (default) và `primary-fg` (active) đạt ≥4.5:1 cả dark/light. Cấm tô màu brand riêng từng icon.

---
verification: `partially_verified` (spec từ đọc code tĩnh, chưa chạy Electron).

## 10. Real brand icons 10/10, 0 emoji (DS-004 — chi tiết tại `specs/real-icons.md`)

- **Lựa chọn**: simple-icons copy path inline (0 dep, ~6 KB) thắng FontAwesome (thiếu zalo, +500 KB, CC-BY cần attribution) và devicons/CDN (thiếu icon, vỡ offline `file://`).
- **Map**: zalo/telegram/messenger/facebook/whatsapp/discord/gmail = simple-icons bản hiện tại (fetch 07/10/2026); fanpage = reuse path facebook (Fanpage là Facebook Page); teams = simple-icons v9 `microsoftteams` (bản hiện tại đã gỡ — đừng update mất); custom = lucide `link` giữ nguyên.
- **Zalo**: nay đã có slug `zalo` chính thức → xóa "Z" tự vẽ (DS-003), thay logo thật.
- **Xóa emoji hoàn toàn**: `BRAND_SVG_REAL` đủ 10/10 + key lạ → link generic; xóa `PLATFORM_EMOJI`/`platformFallback()`; sửa 3 điểm chạm (`renderSidebar`, `updateAvatarPreview`, xóa map cũ) theo spec §4. SVG thêm `aria-hidden` (nút đã có `aria-label`).
- **License**: simple-icons CC0-1.0 (không bắt buộc attribution, giữ comment nguồn trong code); trademark thuộc chủ brand — chỉ dùng làm indicator tài khoản, không tô màu brand riêng (`currentColor` + restrained strategy).

---
verification DS-004: `partially_verified` (path fetch trực tiếp, chưa chạy Electron).

## 11. Custom platform picker kiểu shadcnUI Select (DS-005 — chi tiết tại `specs/platform-picker.md`)

- **Vì sao custom**: native `<option>` không chứa được SVG — emoji prefix (💬 ✈️…) bị chê xấu → custom trigger + listbox mới render được `BRAND_SVG_REAL` 18px mỗi item.
- **Tương thích API**: `<select id="profile-platform-input">` → `<input type="hidden" cùng id>`; `platformInput.value` + `change` event giữ nguyên → `openModal`/`modal-save`/listener avatar-preview/customUrl không vỡ. Patch duy nhất: +1 dòng `ppRender()` sau gán value trong `openModal()`.
- **Cấu trúc**: `button.pp-trigger` (icon + label + chevron, metrics `.modal-input`) + `div[role=listbox]` absolute 10 `button[role=option]` (SVG 18px + label + ✓ khi selected), render item từ `BRAND_SVG_REAL` (1 nguồn thật, không hardcode SVG lần 2), check = text `✓`.
- **States/keyboard/a11y**: default/hover/selected/focus + ArrowUp/Down/Home/End/Enter/Space/Esc; `aria-haspopup/expanded/selected`, SVG `aria-hidden`, focus ring `var(--ring)`, `prefers-reduced-motion`, dark/light qua `--popover`.
- **Rủi ro known**: `.modal-box overflow:auto` có thể clip popover ở đáy → escape hatch `position:fixed` + `getBoundingClientRect()` đã ghi trong spec §4.

---
verification DS-005: `partially_verified` (spec từ đọc code tĩnh, chưa chạy Electron).

## 12. Picker fix "Zalo Zalo" + scrollbar + clip (DS-006 — chi tiết tại `specs/picker-fix.md`)

- **F1/F2 trùng**: `BRAND_SVG_REAL.zalo` là simple-icons **wordmark** (path chứa chữ "Zalo") → 18px + label = "Zalo Zalo" ở trigger và item đầu. Fix: picker dùng glyph `Z` (`--` ô 18px nền `#0068ff`, chữ Z trắng 800, class `.pp-z`); sidebar 44px/avatar-preview 56px giữ wordmark (đủ lớn) — ít diff nhất.
- **F3 xấu**: wordmark strokes <1px ở 18px → glyph Z duy nhất đạt contrast white-on-`#0068ff` cả dark/light.
- **F4 scrollbar thô**: `.pp-listbox` thiếu thin-scroll (không như `#profiles-list`) → thêm `scrollbar-width:thin` + `::-webkit-scrollbar 6px` + `scrollbar-color:var(--line)`, `max-height 240→220px` (~5 item) + `overscroll-behavior:contain`.
- **F5 clip**: `.modal-box overflow:auto` cắt listbox absolute gần đáy → `z-index 30→60` + list ngắn lại; escape hatch `position:fixed` + `getBoundingClientRect()` để comment, bật khi QA vẫn FAIL.
- **F6 lệch metrics**: `#pp-trigger-label` thiếu ellipsis/flex (chỉ có `.pp-item-label`) + button thiếu `min-height` → chốt `min-height:48px`, `box-sizing`, `line-height:1.5`, icon container `18px`, `.pp-check{margin-left:auto}`.
- **Giữ nguyên**: `platformInput.value` + `change` event, keyboard Arrow/Home/End/Enter/Space/Esc, `role=listbox/option`, 0 dep, 0 emoji. JS chỉ +`PP_ZALO_MINI`/`ppIcon()` và thay 2 dòng `innerHTML` sang `ppIcon()`.

---
verification DS-006: `partially_verified` (patch từ đọc code tĩnh, chưa chạy Electron).

## 13. Picker overlay fixed — hết vỡ double scrollbar (DS-007 — chi tiết tại `specs/picker-overlay.md`)

- **Root cause**: `.pp-listbox absolute` là con của `.modal-box overflow:auto` → phình `scrollHeight` + clip đáy; `z-index:60 < overlay:99` nên không cứu được bằng z-index.
- **Fix**: listbox → `position:fixed; z-index:200` (left/top/width do `ppPosition()` từ `trigger.getBoundingClientRect()`); `max-height 220px` scroll trong; flip lên trên khi `below < 180 && r.top > below`; `resize` + `scroll capture` bám trigger, trigger bay khỏi viewport → `ppClose(false)`.
- **Giữ nguyên**: value/`change`, keyboard Arrow/Home/End/Enter/Space/Esc, `role=listbox/option`, `BRAND_SVG_REAL`/`ppIcon()`/`.pp-z`, thin scrollbar 6px, dark/light, 0 dep. Không dời DOM nên `ppOutside contains()` giữ nguyên.

---
verification DS-007: `partially_verified` (patch từ đọc code tĩnh, chưa chạy Electron).

## 14. Dialog actions Xóa / Hủy / Lưu (DS-008 — chi tiết tại `specs/dialog-actions.md`)

- **Root cause**: inner `<div>` bọc Hủy+Luu là div trần (không flex/gap) → gap 0, dính; mode Thêm `#modal-delete display:none` → outer `.row` còn 1 child → `space-between` vô hiệu; `.modal-btn` không margin/min-height.
- **Fix**: +2 class scoped (`modal-actions` outer, `modal-actions-group` inner, không đụng `.row` global); group `display:flex; gap:8px; margin-left:auto`; nút `min-height:40px; radius var(--radius)`; Lưu `min-width:96px`; Xóa thêm `border destructive 35%`; focus ring `var(--ring)`; `≤400px` group full-row chia đều; 0 token mới, 0 dep.
- **Cho @frontend**: áp diff HTML 2 dòng + block CSS sau `.modal-btn.warn` theo spec §3. Không đổi logic modal/ipc.

---
verification DS-008: `partially_verified` (patch từ đọc code tĩnh, chưa chạy Electron).

## 15. Fix Quicksand vỡ dấu tiếng Việt (DS-009 — chi tiết tại `specs/font-vn.md`)

- **Root cause**: 4 woff2 trong `fonts/` (~15 KB/file) là subset **latin-only** — thiếu hoàn toàn file vietnamese (~5 KB/weight); `@font-face` (`index.html:35-38`) không có `unicode-range` nên file latin nhận vơ mọi codepoint. Chữ `à á ê` (U+0000-00FF) render Quicksand, chữ `ỉ ử ả` (U+1EA0-1EF9) rớt system font → 1 từ lai 2 font = "vỡ dấu".
- **Quyết định (Ponytail)**: giữ Quicksand — chính chủ CÓ vietnamese (`METADATA.pb` + `css2` live verify 07/10/2026). Không đổi sang Nunito/Be Vietnam Pro (đổi genre, re-QA toàn app, file nặng hơn).
- **Đã làm**: +4 file `fonts/quicksand-{400,500,600,700}-vietnamese.woff2` (~21 KB, magic `wOF2` verified, nguồn Fontsource CDN).
- **Cho @frontend**: thay 4 dòng `@font-face` cũ bằng 8 block trong spec §4 (4 VN + 4 latin có `unicode-range`); stack/weight/line-height giữ nguyên. Verify bằng chuỗi `Ă Â Đ Ê Ô Ơ Ư ằ ắ ỉ ử ả ỗ ữ ₫` + DevTools Rendered Fonts chỉ hiện Quicksand + 0 request googleapis.

---
verification DS-009: `partially_verified` (woff2 verify magic + size; range copy từ `css2` live; chưa chạy Electron render test).

## 16. Rebrand 9Meta → IIT Socials + fix logo cắt mép (DS-010 — chi tiết tại `specs/rebrand.md`)

- **Rename (20 điểm R1–R20)**: `package.json` name/productName/dmg-title+artifact/shortcut/keyword, `main.js` comment+tray tooltip+menu+window title+unread tooltip, `index.html` meta+title+brand-badge+tools aria+h3, `custom_style.css` comment, `README` 7 điểm, `release.yml` name. Không blind-replace: `index.html:1001` "9 chức năng" là số đếm phải sống.
- **GIỮ appId `com.zalo.desktop`** (`package.json:13`, `main.js:28,34`): đổi = Windows coi là app khác, mất upgrade-in-place + taskbar-pin + nhận diện auto-updater. Giữ `publish.url` + VPS path (vô hình với user). `package-lock` regen qua `npm install`, không sửa tay. Identifier nội bộ (`BRAND_SVG_REAL`, `--nine-meta-accent`, `mp_profiles`) giữ.
- **productName đổi → userData dời** (`settings.json` + `workspaces/` + sessions theo `main.js:36,63`): bắt buộc migrate copy-on-first-run 9Meta→IIT Socials (~10 dòng trong spec §2), nếu không user mất toàn bộ profiles.
- **Logo clip — 2 root cause**: (a) `icon.png` thực tế 271×271 (không phải 512), glyph chạm sát 4 mép (fill ~100%, safe-area 0) + `object-fit:cover` + badge `overflow:hidden` → ép tràn khung; spec fill 84% của DS-002 chính là nguồn bug. (b) `.badge top/right:-4px` nằm trong `.profile-btn overflow:hidden` → unread-badge nào cũng khuyết góc (= "3 icon bị cắt").
- **Logo spec**: giữ glyph hiện tại (đọc được iT, không vẽ lại pass này); re-export master 1024 → `icon.png` 512 PNG-32 transparent, glyph bbox **≤72%** (padding ≥14%/cạnh, cấm fill 84% cũ); `icon.ico` regen **16/32/48/256** (file 8-entry hiện tại nguồn từ art chưa padding → regen bắt buộc); fallback text **`9M`→`IIT`** (`font-size` 15→12px); CSS `#brand-badge img{object-fit:contain;padding:6px}` + `.badge{top:2px;right:2px}`.
- **Cho @frontend**: áp R1–R20 + migrate + regen icon + CSS §5 theo `specs/rebrand.md §6`; verify theo §7 (grep 0 hit, icon magic+size, badge không khuyết, cài đè giữ data).

---
verification DS-010: `partially_verified` (audit + spec từ đọc code tĩnh + PNG/ICO magic verified; chưa chạy Electron render test).

## 17. Logo nền trắng + titlebar theo theme (DS-011 — chi tiết tại `specs/logo-titlebar.md`)

- **Logo**: `#brand-badge` 40px giữ (`contain` + `padding:6px` từ DS-010); nền `var(--primary)` → plate `#fff` **cố định cả dark+light** (1 rule, 0 branch theme) + `border:var(--line)` định viền trên sidebar light + chữ fallback `IIT` màu `#0b1220` (≈15:1 trên trắng); `img` +`background:#fff` vì file transparent.
- **Titlebar**: giữ **native Windows tự vẽ** (`titleBarOverlay:false`, không custom); fix dark `'#242526'` → `#060b14` (= `--background`); handler `set-theme` +`mainWindow.setBackgroundColor(...)` để toggle ăn ngay không restart; chữ titlebar OS tự đảo theo `nativeTheme.themeSource`.
- **Cho @frontend**: áp patch CSS `index.html` + 2 dòng `main.js` theo spec §1–§2; verify theo spec §3 (badge trắng 2 mode, toggle không restart, grep 0 hit `242526`).

---
verification DS-011: `partially_verified` (patch từ đọc code tĩnh index.html/main.js/renderer.js, chưa chạy Electron render test).
