# DS-010 — Rebrand 9Meta → IIT Socials + fix logo cắt mép

> Scope: rename toàn app Electron + fix padding logo. Ponytail full: ít đổi nhất mà hết chữ cũ + hết cắt mép. 0 dep, offline, dark/light.
> Đọc trực tiếp repo 07/10/2026 (package.json, main.js, index.html, renderer.js, preload.js, custom_style.css, README, release.yml, icon.png/icon.ico magic verified).

## 1. Audit "9Meta/9M" — map file:line (đủ, không thừa)

| # | File:line | Hiện tại | Đổi thành | Loại |
|---|-----------|----------|-----------|------|
| R1 | `package.json:2` | `"name": "9meta"` | `"name": "iit-socials"` | build slug (npm/install dir, an toàn) |
| R2 | `package.json:4` | `"description": "9Meta - Quản lý…"` | `"description": "IIT Socials - Quản lý…"` (giữ phần còn lại) | meta |
| R3 | `package.json:14` | `"productName": "9Meta"` | `"productName": "IIT Socials"` | **quyết định lớn — xem §2** |
| R4 | `package.json:48` | `"title": "9Meta"` (dmg) | `"title": "IIT Socials"` | mac |
| R5 | `package.json:49` | `"artifactName": "9Meta-${version}-mac.${ext}"` | `"artifactName": "IIT-Socials-${version}-mac.${ext}"` | mac artifact |
| R6 | `package.json:55` | `"shortcutName": "9Meta"` | `"shortcutName": "IIT Socials"` | win shortcut |
| R7 | `package.json:77` | keyword `"9Meta"` | `"IIT Socials"` | search |
| R8 | `main.js:2` | `// Ứng dụng 9Meta Desktop` | `// Ứng dụng IIT Socials Desktop` | comment |
| R9 | `main.js:169` | `tray.setToolTip('9Meta')` | `tray.setToolTip('IIT Socials')` | tray |
| R10 | `main.js:181` | `{ label: '💬 Mở 9Meta', … }` | `{ label: '💬 Mở IIT Socials', … }` | tray menu |
| R11 | `main.js:408` | `title: '9Meta'` | `title: 'IIT Socials'` (giữ `icon:`) | window |
| R12 | `main.js:1009` | `` `9Meta — ${count} tin nhắn chưa đọc` : '9Meta' `` | `` `IIT Socials — ${count} tin nhắn chưa đọc` : 'IIT Socials' `` | tray tooltip |
| R13 | `index.html:8` | meta description `"9Meta - Quản lý…"` | `"IIT Socials - Quản lý…"` (giữ phần còn lại) | meta |
| R14 | `index.html:9` | `<title>9Meta Control Center</title>` | `<title>IIT Socials</title>` | title |
| R15 | `index.html:974` | `<div id="brand-badge"><img src="icon.png" alt="9Meta">9M</div>` | `<div id="brand-badge"><img src="icon.png" alt="IIT Socials">IIT</div>` | badge (xem §4) |
| R16 | `index.html:997` | `aria-label="Bảng công cụ 9Meta"` | `aria-label="Bảng công cụ IIT Socials"` | a11y label |
| R17 | `index.html:1000` | `<h3 …>Bảng công cụ 9Meta</h3>` | `<h3 …>Bảng công cụ IIT Socials</h3>` | heading |
| R18 | `custom_style.css:1` | `/* 9Meta injected platform polish */` | `/* IIT Socials injected platform polish */` | comment |
| R19 | `README.md:1,4,8,20,23(alt),40,149` | `9Meta` (7 điểm) | `IIT Socials` từng điểm, giữ câu cú | docs |
| R20 | `.github/workflows/release.yml:1` | `name: Release 9Meta` | `name: Release IIT Socials` | ci cosmetic |

### KHÔNG đụng (cố ý giữ — blind-replace sẽ vỡ)

| Giữ nguyên | Vì sao |
|---|---|
| `package.json:13` + `main.js:28,34` — `appId` / `APP_ID` / `setAppUserModelId('com.zalo.desktop')` | **GIỮ appId cũ.** Đổi appId = Windows coi là app khác: mất upgrade-in-place (NSIS), mất taskbar-pin, auto-updater không nhận diện bản cũ. (Ghi nợ: appId mạo danh Zalo — muốn đổi phải chấp nhận user gỡ/cài lại toàn bộ.) |
| `package.json:69-74` `publish.url https://api.tiodev.io.vn/updates` + `release.yml:110` target `/var/www/9meta-updates` | Path server user không thấy. Giữ = client cũ vẫn check update đúng URL. Server chỉ cần host thêm artifact tên mới (§2). |
| `package-lock.json` name `9meta` | Không sửa tay — tự hết sau `npm install` (regen). |
| `index.html:1001` `"9 chức năng chính…"` | Số đếm, không phải brand. |
| `renderer.js` `BRAND_SVG_REAL`, `PP_ZALO_MINI`, `custom_style.css --nine-meta-accent`, `localStorage 'mp_profiles'/'AI_*'` | Identifier/code key vô hình với user — đổi = rủi ro > lợi. Giữ. |
| `docs/index.html` | Template C lymphocytes lạ ("Dập Lọ") không liên quan app — out of scope. |
| `preview.png` | Screenshot marketing — chụp lại thủ công sau rebrand, không patch. |

## 2. Quyết định productName + migration (bắt buộc đọc)

`productName` → `userData` path (`%APPDATA%/…`). Đổi `productName` mà không migrate = **mất toàn bộ**: `settings.json` (`main.js:36`), `workspaces/` (`main.js:63`), session/partition từng profile, `localStorage` renderer. Nên:

1. Đổi `productName` → `"IIT Socials"` (R3) — installer/Start Menu/Tài khoản mới đúng tên.
2. Thêm migrate-on-first-run trong `main.js` (sau `app.whenReady`, trước `createWindow`), ~10 dòng:

```js
// DS-010: migrate userData 9Meta -> IIT Socials (chạy 1 lần, giữ data user cũ)
try {
  const oldDir = path.join(path.dirname(app.getPath('userData')), '9Meta');
  const newDir = app.getPath('userData');
  if (newDir !== oldDir && fs.existsSync(oldDir) && !fs.existsSync(path.join(newDir, 'settings.json'))) {
    fs.cpSync(oldDir, newDir, { recursive: true, force: false });
  }
} catch { /* ponytail: fresh-start nếu copy lỗi, app vẫn chạy */ }
```

3. Server update: khi release bản rebrand đầu tiên, host **cả 2 bộ artifact** (tên cũ `9Meta-Setup-*` cho client chưa update thấy? không — client đọc `latest.yml` duy nhất → chỉ cần `latest.yml` mới trỏ artifact tên mới; client cũ cùng appId update bình thường).

## 3. Logo: chẩn đoán cắt mép (verify bằng đọc file, không đoán)

- `icon.png` thực tế là **PNG 271×271** (magic `89504E47` verified, không phải 512 như hợp đồng DS-002 ghi) — glyph gradient xanh chạm **sát cả 4 mép canvas, fill ~100%, safe-area 0**.
- Nền **transparent** + `#brand-badge img { object-fit: cover }` (`index.html:116-120`) + badge `overflow:hidden` + `border-radius:14px` → glyph bị ép tràn khung, viền ngoài clipped — đúng symptom screenshot.
- Cộng hưởng bug thứ hai: `.badge { top:-4px; right:-4px }` nằm **trong** `.profile-btn { overflow:hidden }` (`index.html:152-168,207-223`) → mọi unread-badge đều bị cắt góc ngoài. Sidebar có 3 profile có badge = "3 icon bị cắt sát mép".
- `.profile-btn svg.brand` 20px/44px + `.profile-btn img` cover: an toàn, không đổi.

## 4. Logo spec (không vẽ lại — glyph hiện tại đã đọc được "iT", giữ)

| Thuộc tính | Giá trị chốt |
|---|---|
| Master | Vẽ lại từ vector (hoặc upscale từ SVG gốc nếu còn), canvas **1024**, xuất `icon.png` **512×512 PNG-32 transparent** đè file cũ |
| Safe-area / fill | Glyph bbox **≤ 72% canvas** (padding **≥ 14% mỗi cạnh ≈ 72px @512**). Spec padding ~8%/fill 84% của DS-002 chính là nguyên nhân bug này — cấm tái dùng |
| Căn | Center quang học (nâng glyph ~1–2% lên trên bù cap-height) |
| Radius artwork | N/A (transparent, không squircle-bg; bo tròn do container CSS). Nếu sau này thêm nền: squircle radius 22.5% (≈115px @512) |
| Đổi "9"→"IIT" vẽ lại? | **KHÔNG trong pass này.** Glyph trừu tượng hiện tại trung tính, đọc được iT ≈ IIT. Vẽ wordmark mới = design task riêng (DS mới) |
| `icon.ico` | Regen từ master đã padding: **16 / 32 / 48 / 256**, 32bpp, 256 PNG-compressed. File 8-entry hiện tại (410 KB) nguồn từ art chưa padding → **bắt buộc regen**, 4 size là đủ |
| Fallback text | **Đổi `9M` → `IIT`** (R15). Text chỉ hiện khi thiếu img — giữ `9M` sau rebrand là vô nghĩa |

## 5. Patch CSS (3 block, áp sau R15)

```css
/* DS-010 fix badge clip: contain + padding thay cover (index.html sau #brand-badge img) */
#brand-badge { font-size: 12px; /* "IIT" 3 ký tự vừa 40px */ }
#brand-badge img { object-fit: contain; padding: 6px; display: block; }

/* DS-010 fix unread-badge bị .profile-btn overflow:hidden cắt góc */
.badge { top: 2px; right: 2px; }
```

> Alternative đã loại: `overflow:visible` cho `.profile-btn` (giữ badge overhang) — tốn 3 dòng + rủi ro avatar vuông lòi góc khi img load chậm. Chọn badge-inside: 1 dòng, deterministic.

## 6. Cho @frontend (không forward lại — đọc file này + file gốc)

1. Áp R1–R20 (find-replace từng dòng, cấm replace-all `9M` — `9 chức năng` ở `index.html:1001` phải sống).
2. Thêm migrate §2 vào `main.js` trước `createWindow()`.
3. Xuất lại `icon.png` 512 + `icon.ico` 4 size từ master **đã padding §4**, đè file cũ.
4. Áp block CSS §5. Không đổi logic profile/ipc/keyboard.
5. `npm install` (regen lock) + verify §7.

## 7. Verify

- [ ] `grep -rin 9meta index.html main.js package.json README.md` (trừ `com.zalo.desktop` + comment migrate) = 0 hit
- [ ] `node -e` đọc `icon.png`: magic `89504E47`, 512×512; parse `icon.ico` đủ 4 entry 16/32/48/256
- [ ] Mở app: badge 40px glyph cách mép đều 4 phía; unread-badge tròn đầy không khuyết góc; Tab qua sidebar thấy ring
- [ ] `light-mode`: badge fallback `IIT` đọc được (contrast trên `--primary` cả 2 mode)
- [ ] Cài đè bản 9Meta cũ → Start Menu hiện IIT Socials, profiles/workspaces còn nguyên (nhờ migrate)

---
verification: `partially_verified` (audit + spec từ đọc code tĩnh + magic-bytes verified; chưa chạy Electron render test).
