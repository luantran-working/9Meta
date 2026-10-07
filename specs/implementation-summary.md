# Implementation Summary — FE-001 Sidebar shadcnUI (DS-001)

## Files đổi
- `index.html` — `:root,body.dark-mode` + `body.light-mode` tokens (§2, giữ legacy aliases `--bg/--panel/--text/--muted` cho code CRM cũ); `#sidebar` flat + `#brand-badge` 40px + `img`; `.profile-btn` 44px flat + `:hover` tint + `.active` primary + `:focus-visible` ring + `:disabled`; `.tool-btn` 40px ghost + `.launcher` primary; `.badge` 18px destructive + `border:var(--background)`; `#btn-add-profile` dashed; `[data-tip]` tooltip CSS-only; scrollbar thin 6px; `prefers-reduced-motion`; HTML: brand `<img src="icon.png">` (text 9M fallback), `#btn-add-profile`/`#btn-tools-launcher` → `type=button` + `data-tip` + `aria-label`.
- `renderer.js` — `platformIcon()` (chữ cái) → `PLATFORM_EMOJI` + `platformFallback()` + `BRAND_SVG` (telegram/messenger); `renderSidebar()` tạo `<button type=button>` + `aria-label` + `aria-current` + `data-tip` (thay `title`) + `disabled=appLocked` + badge `aria-hidden="true"`; `updateAvatarPreview()` dùng `platformFallback`. Không đổi logic ipc/profile/switch.
- Không đụng: `main.js`, `preload.js`, `icon.png/.ico` (giữ text fallback), CRM/campaign.

## States xử lý
- default / hover (bg-only, không scale) / active (`aria-current=true` duy nhất) / focus-visible (ring 2px) / unread (badge 0=hidden, 1-9 số, >9="9+", logic cũ giữ) / disabled (`appLocked` → opacity .5) / light-mode (tokens mirror, badge border theo bg) / reduced-motion (tắt transition/animation).

## Verify
- `node --check renderer.js` → SYNTAX_OK.
- Chưa chạy Electron (manual): Tab qua từng btn thấy ring; badge ẩn/hiện; light-mode không vỡ; không còn chữ cái icon.
- verification: `partially_verified` — cần manual Electron check.

## Return to @leader
Implementation complete — please route to @designer for Phase 3 Design QA.

---

# FE-002 QA fix (DS-QA-001 FAIL → fix)

## Files đổi
- `index.html` — thêm `#btn-add-profile svg{width:18px;height:18px;stroke:currentColor;stroke-width:2;stroke-linecap:round;fill:none}` sau `#btn-add-profile:hover` (fix P0-1 nút + tàng hình).
- `renderer.js:250` — `createElement('div')` → `createElement('span')` cho badge (fix P2-1 HTML invalid).
- `renderer.js` sau `renderSidebar()` — thêm ArrowUp/Down roving ~10 dòng (fix P2-2 DESIGN.md §6).
- Không đụng tokens/logic khác, không vẽ icon.png, không sửa tools-panel.

## Verify
- `node --check renderer.js` → SYNTAX_OK.
- verification: `partially_verified` — cần manual Electron: nút + hiển thị, badge ẩn/hiện, ArrowUp/Down focus.

## Return to @leader
FE-002 complete — please route to @designer for Phase 3 re-QA.

---

# FE-003 Brand icons 10/10 (DS-003)

## Files đổi
- `renderer.js` — `BRAND_SVG` 2 → 10 key (spec §3 copy-paste: zalo stroke-Z tự vẽ, telegram/messenger giữ path cũ, facebook simple-icons fill, fanpage/whatsapp/discord/teams/gmail/custom lucide stroke); `updateAvatarPreview()` toggle `#avatar-clear` (`tempAvatarPath` truthy → show); wiring `avatar-clear.onclick → tempAvatarPath=null + updateAvatarPreview()`. Save giữ nguyên (`avatar=tempAvatarPath`, null → rớt xuống BRAND_SVG). Thứ tự avatar>SVG>emoji + `renderSidebar` không đổi.
- `index.html:197` — `.profile-btn svg.brand` bỏ `fill:currentColor` → `flex:none` (CSS chỉ size, fill/stroke do inline attr).
- `index.html` modal — thêm `<button id="avatar-clear" class="modal-btn cancel">Xóa ảnh</button>` (ghost, `display:none` mặc định).
- Không đụng: tokens/font/icon.png, logic ipc/profile khác, không thêm icon lib.

## Verify
- `node --check renderer.js` → SYNTAX_OK.
- verification: `partially_verified` — cần manual Electron: 10 profile không avatar hiện SVG / có avatar hiện img / Xóa ảnh lộ SVG / Tab ring còn.

## Return to @leader
FE-003 complete — please route to @designer for Phase 3 Design QA.

---

# FE-004 Real brand icons 10/10, 0 emoji (DS-004 retry)

## Files đổi
- `renderer.js` — `BRAND_SVG_REAL` đã có verbatim spec §3 (10 key, giữ nguyên, 0 dep); `renderSidebar()` (§4.1): xóa `span` emoji + `platformFallback`/`BRAND_SVG` cũ → `if avatar img (alt='') else btn.innerHTML = BRAND_SVG_REAL[p.platform] || custom` + `aria-hidden=true` cho svg; `updateAvatarPreview()` (§4.2): `avatarLetter.innerText=platformFallback` → `innerHTML = BRAND_SVG_REAL[platform||zalo] || custom`; §4.3: không còn `PLATFORM_EMOJI`/`platformFallback` (definition đã xóa trước, nay xóa nốt 3 usages).
- Không đụng: `icon.png`/font/tokens/CSS size/`package.json`.

## Verify
- `node --check renderer.js` → SYNTAX_OK.
- `grep platformFallback|PLATFORM_EMOJI|innerText = p.avatar|BRAND_SVG[` → rỗng (0 match); `BRAND_SVG_REAL` refs = 3 (def + 2 dùng).
- verification: `partially_verified` — cần manual Electron: 10 profile không avatar → logo thật, key lạ → link generic, Tab ring, light-mode đọc được.

## Return to @leader
FE-004 complete — please route to @designer for Phase 3 Design QA.

---

# FIX-001 Avatar opt-out — Xóa ảnh không bị refill ảnh cũ (retry)

## Root cause
- `preload.js:296` Zalo fallback `imgs[0]` lấy ảnh bừa khi không match `ava/zavatar` → gửi avatar rác lên mỗi 5s.
- `renderer.js:971` refill `if (payload.avatarUrl && !profile.avatar)` → profile vừa Xóa ảnh (avatar=null) bị gán lại ảnh cũ sau ~5s.

## Files đổi
- `renderer.js` — `+ let tempAvatarOptOut`; `normalizeProfiles()` giữ `avatarOptOut: !!p.avatarOptOut`; `openModal()` init từ `profileToEdit.avatarOptOut`; `#avatar-clear.onclick → tempAvatarPath=null + tempAvatarOptOut=true`; `avatarInput.onchange → tempAvatarOptOut=false`; `modal-save`: edit `editingProfile.avatarOptOut = tempAvatarOptOut || !tempAvatarPath`, create push `avatarOptOut` tương tự; listener `update-profile-info` → `if (payload.avatarUrl && !profile.avatar && !profile.avatarOptOut)`.
- `preload.js` — xóa dòng `if (!avatarEl && imgs.length > 0) avatarEl = imgs[0];` (chỉ giữ match `ava/zavatar`, không avatar → gửi rỗng, không refill).
- Không đụng: `BRAND_SVG_REAL`/tokens/CSS/`main.js` forward giữ nguyên.

## Verify
- `node --check renderer.js/preload.js/main.js` → SYNTAX_OK (3/3 True).
- `grep avatarOptOut renderer.js` → 8 hits (def + normalize + openModal + clear + select + save×2 + listener); `grep imgs[0] preload.js` → 0 match.
- verification: `partially_verified` — cần manual Electron: Xóa ảnh → SVG đúng platform, đợi >5s không về ảnh cũ; chọn ảnh mới → hiện img + interval không đè; restart app persist opt-out.

## Return to @leader
FIX-001 complete — no design QA needed (logic-only, no visual change).

---

# FE-005 Custom platform picker (DS-005)

## Files đổi
- `index.html` — `<select id="profile-platform-input">` (10 option emoji) → `<input type="hidden" cùng id>` + `.pp-wrap#platform-picker` (trigger button + `div[role=listbox]`); CSS `~35 dòng` `.pp-*` (trigger flex reuse `.modal-input`, listbox absolute, item 40px, check `✓` text, focus ring `var(--ring)`, light/dark, reduced-motion). Không đụng CRM/campaign/ai select.
- `renderer.js` — `openModal()` +1 dòng `if (typeof ppRender === 'function') ppRender();` sau gán value; append `~60 dòng` `PLATFORM_ORDER` + `ppRender/ppOpen/ppClose/ppOutside/ppSelect` + trigger/listbox keyboard (Arrow/Home/End/Enter/Space/Esc, click ngoài). `change`-listener + `modal-save` giữ nguyên (ppSelect dispatch `change`).
- Không đụng: `BRAND_SVG_REAL`/tokens/save logic/dep mới.

## Verify
- `node --check renderer.js` → SYNTAX_OK.
- `grep '<select id="profile-platform-input"' index.html` → 0 match; `ppRender|pp-trigger|pp-listbox` → 25 hits; `platformInput.value/change/dispatch` refs giữ (openModal/save/listener).
- verification: `partially_verified` — cần manual Electron: trigger/item có SVG 18px, chọn đổi value+preview, keyboard + Esc + click ngoài, light/dark.

## Return to @leader
FE-005 complete — please route to @designer for Phase 3 Design QA.

---

# FE-006 Picker fix "Zalo Zalo" + scrollbar + clip (DS-006)

## Files đổi
- `index.html` — thay toàn block `.pp-*` (§3 spec): trigger `+min-height:48px/box-sizing/line-height:1.5` chốt metrics = `.modal-input`; icon container chốt `18px`; `+ .pp-z` (ô 18px `#0068ff`, Z trắng 800); `#pp-trigger-label` vào rule ellipsis; listbox `240→220px` + `overscroll-behavior:contain` + `scrollbar thin/6px` + `z-index 30→60`; `.pp-check +margin-left:auto`.
- `renderer.js` — sau `let ppActiveIndex` + `PP_ZALO_MINI`/`ppIcon()` (Zalo → glyph Z, còn lại `BRAND_SVG_REAL`); `ppRender()` + trigger thay 2 dòng `innerHTML` sang `ppIcon()`. Không đụng `ppOpen/ppClose/keyboard/value/change`, `updateAvatarPreview`/sidebar giữ wordmark, escape-hatch `fixed` để comment (không bật mặc định).
- Không đụng: sidebar/`BRAND_SVG_REAL` gốc/value logic/modal khác.

## Verify
- `node --check renderer.js` → SYNTAX_OK.
- `grep pp-z` → 2 hits (1 CSS `index.html` + 1 JS `PP_ZALO_MINI`); `ppIcon|PP_ZALO_MINI` → 4 refs (def + fn + 2 dùng); `BRAND_SVG_REAL[v|cur]` trực tiếp ở render → 0 (chỉ còn 1 trong `ppIcon` wrapper + 2 ở sidebar/avatar giữ wordmark đúng ý).
- verification: `partially_verified` — cần manual Electron: trigger 1 ô Z + "Zalo", list 10 SVG, scrollbar 6px, trigger = input 48px, keyboard Tab→Enter→↓↑→Enter→Esc.

## Return to @leader
FE-006 complete — please route to @designer for Phase 3 Design QA.

---

# FE-007 Picker overlay fixed (DS-007)

## Files đổi
- `index.html` — block `.pp-listbox`: `absolute inset-inline/top + z60` → `fixed z200` (left/top/width do JS); giữ `max-height/scrollbar 6px/border/radius/shadow/light`.
- `renderer.js` — + `ppPosition()` (rect trigger, flip `below<180`, clamp `avail≥120`) + `ppOnScroll()` (bám trigger, bay khỏi viewport → `ppClose(false)`); `ppOpen` +3 dòng (position/resize/scroll-capture), `ppClose` +2 dòng (remove listeners). Không đụng value/keyboard/SVG.
- Không đụng: `BRAND_SVG_REAL`/`ppIcon`/`.pp-z`/keyboard/value/change/modal khác.

## Verify
- `node --check renderer.js` → SYNTAX_OK.
- `grep ppPosition|ppOnScroll renderer.js` → 8 hits (≥6); `position: fixed; z-index: 200` → 1 hit (L630).
- verification: `partially_verified` — cần manual Electron: modal không sinh scroll mới, flip đáy, bám trigger, scroll xa tự đóng.

## Return to @leader
FE-007 complete — please route to @designer for Phase 3 Design QA.

---

# FE-008 Dialog actions row (DS-008)

## Files đổi
- `index.html` — HTML 2 dòng: outer `.row.mt-16` + `modal-actions`, inner div trần + `modal-actions-group` (Xóa trái, Hủy/Lưu phải, gap 8px); CSS 12 dòng sau `.modal-btn.warn`: `gap/flex-wrap`, group `flex+margin-left:auto` (mode Thêm Xóa ẩn vẫn neo phải), btn `min-height:40px`, Lưu `min-width:96px`, warn `border`, `focus-visible` ring, `disabled`, media 400px `flex:1` chia đều.
- Không đụng: `.row` global, JS, CRM row.

## Verify
- `Select-String modal-actions` → 9 hits CSS (7 rules + 2 responsive) + 2 HTML (outer + group).
- Manual Electron còn lại: Thêm modal Hủy/Lưu cách 8px neo phải cao 40px; Sửa modal Xóa trái; Tab ring; ≤400px chia đều không tràn.
- verification: `partially_verified` — patch từ đọc code tĩnh, chưa chạy Electron.

## Return to @leader
FE-008 complete — please route to @designer for Phase 3 Design QA.

---

# FE-009 Fix Quicksand vỡ dấu VN (DS-009)

## Files đổi
- `index.html:35-42` — 4 `@font-face` latin-no-range → 8 block spec §4 verbatim (4 VN trước + 4 latin thêm `unicode-range`); stack `Quicksand, Inter, ...` giữ nguyên.
- Không đụng: JS/tokens/`font-family`/weights/`package.json` (fonts/**/* có sẵn).

## Verify
- `@font-face` = 8; `U+1EA0-1EF9` = 4; `vietnamese.woff2` = 4; `googleapis|gstatic` = 0; `fonts/` 8 file (4 latin ~15KB + 4 VN ~5KB).
- Manual Electron còn lại: modal "Chỉnh sửa tài khoản" paste `Ă Â Đ Ê Ô Ơ Ư ằ ắ ỉ ử ả ỗ ữ ₫` → Rendered Fonts chỉ `Quicksand`, Network 0 request Google.
- verification: `partially_verified`.

## Return to @leader
FE-009 complete — please route to @designer for Phase 3 Design QA.

---

# FE-010 Rebrand 9Meta → IIT Socials + fix logo clip (DS-010)

## Files đổi
- `package.json` — R1-R7: `name 9meta→iit-socials`, description/productName/dmg title+artifactName `IIT Socials`/`IIT-Socials`, shortcutName, keyword. Giữ `appId com.zalo.desktop` + `publish.url` + files list.
- `main.js` — R8-R12: comment, `tray.setToolTip`, menu `Mở IIT Socials`, window `title`, unread tooltip; + migrate copy-on-first-run `9Meta→IIT Socials` trong `app.whenReady` trước `createWindow` (~8 dòng, `fs.cpSync recursive force:false`, try/catch fresh-start). Không đụng APP_ID/userModelId.
- `index.html` — R13-R17: meta description, `<title>IIT Socials</title>`, `#brand-badge alt IIT Socials + IIT`, aria-label + h3; giữ `9 chức năng` (số đếm). CSS §5: `#brand-badge font-size 15→12px`, `img contain+padding:6px+display:block`, `.badge top/right -4→2px` (badge-inside).
- `custom_style.css:1` — comment `IIT Socials`; giữ `--nine-meta-accent` identifier.
- `README.md` — replaceAll `9Meta→IIT Socials` (7 điểm + alt Preview). `release.yml:1` `name: Release IIT Socials`; giữ VPS path `/var/www/9meta-updates`.
- `icon.png` — regen 271→512 PNG-32 transparent, glyph resize 368px (bbox 72%, padding 14%/cạnh), magic `89504E47` verified. `icon.ico` — regen 16/32/48/256 32bpp từ master đã padding (30KB, thay file 8-entry 410KB cũ).
- Không đụng: `BRAND_SVG/picker/font logic`, `package-lock` (regen via npm install), `docs/index.html`, `preview.png`.

## Verify (§7 spec)
- `Select-String 9Meta index.html/main.js/package.json/README` → 2 hits, cả 2 là migrate comment + `oldDir '9Meta'` (allowed) = 0 hit lạ; `9M` standalone = 0; `9 chức năng` sống; `appId com.zalo.desktop` giữ (package.json:13, main.js:28).
- `node --check main.js` → MAIN_OK.
- `icon.png` 512×512 RGBA magic `89504E47`; `icon.ico` 4 entry 16/32/48/256.
- Manual Electron còn lại: badge 40px glyph cách mép đều; unread-badge tròn đầy; Tab ring; light-mode `IIT` đọc được; cài đè giữ profiles (migrate).
- verification: `partially_verified`.

## Return to @leader
FE-010 complete — please route to @designer for Phase 3 Design QA.

# FIX-002 Theme default light + tạm tắt auto-update

## Files đổi
- `main.js:44` — `isDarkMode: true→false` (default light); `main.js` migrate block — thêm `settings = loadSettings()` sau `fs.cpSync` (kẻo settings memory cũ ghi đè file vừa migrate); thêm `const AUTO_UPDATE_ENABLED = false` + early-return trong `setupAutoUpdater()` (bỏ check 5s + listeners) và `checkForUpdates()` (trả idle "Tự động cập nhật đang tạm tắt." + dialog khi manual). Tray "Kiểm tra cập nhật" giữ nguyên, code update giữ để bật lại 1 dòng.
- `renderer.js:43` — `let isDarkMode = true→false` (tránh flash dark trước `get-settings` dòng 1088).
- `index.html:973` — `<body class="dark-mode→light-mode">` (tránh flash dark trước khi renderer apply settings).
- Không đụng: `BRAND_SVG/picker/font/logo`.

## Verify
- `node --check main.js` + `node --check renderer.js` → OK (không lỗi).
- grep → `isDarkMode: false` (main.js:44), `let isDarkMode = false` (renderer.js:43), `AUTO_UPDATE_ENABLED` ×3 (khai báo + 2 guard).
- Manual Electron còn lại: mở app fresh (xóa settings.json) → sáng ngay từ frame đầu; máy đã có settings dark cũ → vẫn giữ dark (không reset); tray "Kiểm tra cập nhật" → dialog "tạm tắt".
- verification: `partially_verified`.

## Return to @leader
FIX-002 complete.

---

# FE-011 Logo plate trắng + titlebar theo theme (DS-011)

## Files đổi
- `index.html` — `#brand-badge`: `background var(--primary)→#fff` + `color var(--primary-fg)→#0b1220` + `+border:1px solid var(--line)`; `img +background:#fff`. Giữ `40px/contain/padding:6px/radius:14px/overflow:hidden`.
- `main.js:417` — `backgroundColor '#242526'→'#060b14'` (dark = --background); `:581` — `set-theme +mainWindow.setBackgroundColor(...)` live, không restart. Giữ `titleBarOverlay:false`, không đụng renderer/preload.
- Không đụng: custom titlebar, `titleBarStyle`, theme init `:1035`.

## Verify
- `node --check main.js` → OK.
- `grep 242526 main.js` → 0 hit; `setBackgroundColor` → 1 hit (:581); `060b14` → 2 hits (init + live).
- Badge trắng 2 mode (plate + img `#fff`, fallback `IIT` ~15:1, border định viền light).
- verification: `partially_verified` — cần manual Electron: toggle Giao diện ăn ngay, restart nhớ theme.

## Return to @leader
FE-011 complete — please route to @designer for Phase 3 Design QA.
