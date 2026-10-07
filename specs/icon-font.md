# DS-002 — Icon + Font (Quicksand) cho 9Meta Electron

> Ponytail full: không vẽ brand mới. Icon đúng = crop squircle "9" từ `icon.png` hiện có. Font = swap Inter → Quicksand, màu/contrast giữ nguyên.

## 1. Audit icon hiện tại (sai ở đâu)

| File | Thực tế (magic bytes) | Sai gì | Đang dùng ở |
|---|---|---|---|
| `icon.png` 1254×1254, 34 KB | **JPEG** (`FF D8`), không phải PNG | (a) Sai format; (b) Nội dung là **lockup marketing** (squircle + chữ "9Meta" + tagline trên nền xám nhạt), không phải glyph icon — xuống 16–40px chữ thành nhòe; (c) Canvas đục, không transparent | `main.js:408` BrowserWindow icon (taskbar), `main.js:164` tray resize 16px, `index.html:911` `#brand-badge img`, `package.json:43` mac icon, `package.json:64` files, `README.md:4` |
| `icon.ico` 24 KB | ICO hợp lệ nhưng **chỉ 1 entry 256×256 32bpp** | Thiếu 16/32/48 → Windows tự downscale 256 → mờ ở taskbar small, Alt-Tab, titlebar; installer NSIS lấy đúng file này nên icon cài đặt cũng mờ ở size nhỏ | electron-builder win (mặc định lấy `icon.ico`), NSIS installer + shortcut |
| `icon_old.ico` 909 KB | **PNG đội lốt .ico** (`89 50 4E 47`) | electron-builder không đọc được → file chết, chỉ gây nhầm | Không dùng ở đâu — **xóa hoặc bỏ qua** |
| `preview.png` 2400×1592 | PNG thật, là **screenshot Zalo PC** | Không phải brand asset — giữ nguyên làm preview, **không dùng làm icon** | Docs/screenshot |
| `#brand-badge` | `<img src="icon.png">` + text fallback `9M` | `object-fit:cover` crop lockup JPEG → badge 40px hiện chữ "9Meta" bị cắt dở; nền xám của ảnh vỡ dark-mode | `index.html:91-111,911` |
| `package.json` win | Không khai báo `win.icon` | Dựa vào autodetect `icon.ico` — vẫn chạy nhưng nên khai báo tường minh | `package.json:18-28` |

**Icon đúng phải là gì:** squircle trắng + glyph "9" (đen → tím gradient ở đuôi) **đã có sẵn** trong `icon.png` — crop riêng glyph, bỏ wordmark/tagline/nền xám. Không bịa brand mới.

## 2. Spec icon thay thế (crop từ asset có sẵn)

```
Source:  icon.png hiện tại → crop tight squircle "9" (bỏ toàn bộ chữ + nền xám ngoài)
Master:  icon-src-1024.png — 1024×1024, nền TRONG SUỐT, squircle chiếm ~84% canvas
         (padding ~8% mỗi cạnh = safe-area Windows/macOS tự bo thêm)
```

| Xuất file | Spec | Đè file nào |
|---|---|---|
| `icon.png` | 512×512 PNG-32 transparent, squircle chiếm ~430px giữa canvas | **Đè `icon.png` cũ** (JPEG đội lốt) |
| `icon.ico` | Multi-entry **16 / 32 / 48 / 256** px, 32bpp + PNG-compressed 256 | **Đè `icon.ico` cũ** (single 256) |
| `icon_old.ico` | Xóa khỏi repo (PNG đội lốt, không dùng) | **Xóa** |
| mac (`package.json:43` đang trỏ `icon.png`) | electron-builder mac chấp nhận PNG 512 — giữ `icon.png` mới là đủ; nếu cần retina sắc: thêm `icon.icns` (tạo bằng `iconutil` từ 1024 master) | Không bắt buộc |

Cách xuất nhanh (không cần designer): mở `icon.png` → crop vuông quanh squircle → xóa nền ngoài về transparent → resize 512 → dùng `magick`/electron-icon-builder xuất ico 4 size. Verify: mở ico bằng 7-Zip/NirSoft IconsExtract thấy đủ 4 entry.

`package.json` patch (1 dòng, win khai tường minh):

```json
"win": { "icon": "icon.ico", "target": [{ "target": "nsis", "arch": ["x64"] }] }
```

`#brand-badge` không đổi CSS — sau khi `icon.png` mới là squircle tight thì `object-fit:cover` + `border-radius:14px` tự đúng. Giữ text `9M` làm fallback khi thiếu img (đã có).

## 3. Spec font Quicksand (thay Inter mọi nơi)

Phạm vi: `index.html:41` (1 dòng duy nhất trong app) + `docs/style.css:26,411` (landing docs, làm cùng cho đồng bộ). `main.js:143` badge dùng Arial trên canvas 18px — giữ nguyên (không liên quan).

### 3.1 Load offline cho Electron (ưu tiên local)

```
Bước 0 (1 lần): tải Quicksand woff2 400/500/600/700 từ Google Fonts
  https://fonts.google.com/specimen/Quicksand → đặt vào fonts/quicksand-400.woff2 … -700.woff2
  + thêm "fonts/**/*" vào package.json "files".
```

Drop-in — dán **ngay trước** `html, body {...}` trong `index.html` (~dòng 35):

```css
@font-face{font-family:'Quicksand';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/quicksand-400.woff2') format('woff2')}
@font-face{font-family:'Quicksand';font-style:normal;font-weight:500;font-display:swap;src:url('fonts/quicksand-500.woff2') format('woff2')}
@font-face{font-family:'Quicksand';font-style:normal;font-weight:600;font-display:swap;src:url('fonts/quicksand-600.woff2') format('woff2')}
@font-face{font-family:'Quicksand';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/quicksand-700.woff2') format('woff2')}
```

Fallback CDN (chỉ khi chưa có `fonts/`, VD dev máy chưa tải — **không ship production** vì telesale offline vẫn phải có chữ):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap">
```

### 3.2 Font stack thay thế (drop-in, 1 dòng)

```css
/* cũ index.html:41 — XÓA Inter đầu stack */
font-family: Quicksand, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
```

Giữ `Inter` ở vị trí 2 trong stack = fallback khi thiếu file local (mọi máy dev đều có Inter từ docs page). Token cho DESIGN.md: `--font-sans: Quicksand, Inter, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`.

### 3.3 Readability telesale (Quicksand x-height nhỏ hơn Inter ~10%)

| Rule | Giá trị | Lý do |
|---|---|---|
| body/chat/CRM text | giữ 13–15px hiện tại, `line-height: 1.55–1.6` (hiện 1.25 ở `.tool-tile span` → nâng lên tối thiểu 1.45) | Quicksand tròn, nét mảnh — line-height rộng bù lại, trực 8–12h đỡ mỏi |
| label 11–12px (`.badge`, `.muted`, `.metric-label`) | `letter-spacing: +0.01em`, không dùng weight 400 dưới 12px (dùng 500+) | Chữ nhỏ + font tròn = dễ nhòe, medium cứu nét |
| heading (`.panel-title` 22px, `.metric-value` 34px) | `letter-spacing: 0` đến `-0.01em` tối đa; **cấm** `-0.04em` kiểu display grotesque | Quicksand đã tròn rộng, tracking âm làm chữ dính nhau |
| `.metric-value letter-spacing:-.8px` hiện tại | Sửa thành `-0.01em` tương đối | `-0.8px` cứng vỡ khi đổi size |

Không đổi `font-size` scale hiện tại — chỉ đổi family + 2 rule trên.

## 4. A11y + performance (không đổi contrast)

- Màu sắc giữ nguyên 100% → contrast đã audit ở DS-001 vẫn đúng, không cần re-check.
- `font-display: swap` bắt buộc ở cả 4 `@font-face` (chữ hiện ngay bằng fallback, không FOIT trắng màn khi mở app).
- Tổng 4 woff2 ≈ 60–80 KB local — load 1 lần từ disk, không network, không ảnh hưởng startup Electron.
- Giữ `prefers-reduced-motion` hiện có; Quicksand không thêm animation.
- Keyboard/screen-reader: đổi font không đụng DOM/aria — không cần re-test ngoài smoke Tab 1 vòng.

## 5. Cho @frontend (đọc file, không forward)

1. Crop `icon.png` → xuất `icon.png` 512 + `icon.ico` 16/32/48/256 (§2) → xóa `icon_old.ico` → patch `package.json` win.icon.
2. Tải 4 woff2 vào `fonts/` → dán `@font-face` + đổi `font-family` (§3.1–3.2) → sửa 2 line-height/letter-spacing (§3.3).
3. Verify: `ls icon.png icon.ico fonts/` tồn tại; mở app thấy badge 40px là squircle "9" nét; tray 16px nhận ra số 9; DevTools → Network không có request fonts.googleapis.com; Tab qua sidebar vẫn thấy ring.

---
verification: `partially_verified` (audit từ đọc code + magic bytes + xem ảnh; chưa chạy Electron/build).
