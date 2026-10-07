# DS-009 — Fix Quicksand vỡ dấu tiếng Việt (giữ Quicksand + subset vietnamese)

> Ponytail full: giữ font, +4 file (~21 KB), patch CSS-only. Không đổi brand DS-002, không CDN production.
> Quyết định: **Option A**. B/C chỉ là fallback, xem §2 rồi bỏ qua.

## 1. Audit — vì sao vỡ ("Chỉnh sửa tài khoản")

| File local | Size thực | Là gì |
|---|---|---|
| `fonts/quicksand-400.woff2` | 15.776 B | subset **latin-only** |
| `fonts/quicksand-500.woff2` | 15.788 B | subset **latin-only** |
| `fonts/quicksand-600.woff2` | 15.864 B | subset **latin-only** |
| `fonts/quicksand-700.woff2` | 15.124 B | subset **latin-only** |
| `fonts/quicksand-*-vietnamese.woff2` | **không tồn tại** | ← root cause |

Ba lỗi chồng nhau:

1. **Thiếu subset vietnamese.** Quicksand chính chủ CÓ vietnamese (xác minh: `METADATA.pb` trong `google/fonts` liệt kê `subsets: latin, latin-ext, menu, vietnamese`; `css2` live trả 3 block/weight: vietnamese + latin-ext + latin). File latin ~15 KB/chữ; file vietnamese chỉ ~5 KB/chữ — lúc DS-002 tải chỉ lấy nhầm block latin.
2. **`@font-face` không có `unicode-range`** (`index.html:35-38`). Không range = file latin tự nhận phủ MỌI codepoint → browser không fallback đúng cách cho glyph thiếu.
3. **Triệu chứng "vỡ dấu" = chữ lai 2 font.** Range latin `U+0000-00FF` ĐÃ chứa `à á â ã è é ê ì í ò ó ô õ ù ú ý` → các chữ này render Quicksand; còn `ỉ (U+1EC9) ử (U+1EED) ả (U+1EA3)…` nằm ở `U+1EA0-1EF9` KHÔNG có trong file → rớt sang font hệ thống (Segoe UI/Arial). Trong 1 từ vừa tròn vừa méo, dấu lệch baseline = screenshot user gửi.

Các range vietnamese còn thiếu (để patch §4): `U+0102-0103 (Ăă) U+0110-0111 (Đđ) U+0128-0129 (Ĩĩ) U+0168-0169 (Ũũ) U+01A0-01A1 (Ơơ) U+01AF-01B0 (Ưư) U+1EA0-1EF9 (mọi nguyên âm + tone: ằ ắ ỉ ử ả ỗ ữ…) U+20AB (₫)` + combining marks `U+0300-0301 U+0303-0304 U+0308-0309 U+0323 U+0329`.

## 2. So sánh 3 option (chỉ A được chọn)

| Tiêu chí | **A. Quicksand + VN subset (✅ chọn)** | B. Nunito | C. Be Vietnam Pro |
|---|---|---|---|
| Đủ dấu VN | ✅ Có chính chủ (cmap verify: `ạ ế ộ ữ ơ ư đ ₫`) | ✅ Có (`vietnamese` + cả `cyrillic`) | ✅ Chắc nhất (thiết kế bởi người Việt, dấu adaptive) |
| Giống Quicksand tròn | ✅ 100% (cùng font) | Tương đối (cùng rounded-sans, x-height khác → phải re-verify readability DS-002 §3.3) | ❌ Khác genre (neo-grotesk, không tròn → đổi identity) |
| Weights 400–700 | ✅ Giữ nguyên 4 file | ✅ Đủ (200–1000) | ✅ Đủ (100–900) |
| Size offline | ✅ **+21 KB** (4×~5 KB) → tổng fonts ~82 KB | Thay 8 file (~100+ KB), bỏ asset cũ | Thay 8 file (~21 KB latin + VN mỗi weight → ~250 KB tổng) |
| Diff | CSS-only + 4 file mới | Đổi family + stack + re-QA toàn app | Đổi family + stack + re-QA toàn app |

Bỏ B khi nào: Quicksand bị khai tử khỏi Google Fonts (không xảy ra). Bỏ A sang C khi nào: app cần thêm `cyrillic`/ngôn ngữ khác.

## 3. Files vietnamese — ĐÃ TẢI SẴN (designer làm, frontend khỏi tải)

Tải 07/10/2026 từ Fontsource CDN (file static đúng từng weight, magic `wOF2` đã verify):

| File | Size |
|---|---|
| `fonts/quicksand-400-vietnamese.woff2` | 5.244 B |
| `fonts/quicksand-500-vietnamese.woff2` | 5.260 B |
| `fonts/quicksand-600-vietnamese.woff2` | 5.216 B |
| `fonts/quicksand-700-vietnamese.woff2` | 5.068 B |

Tải lại nếu mất (copy-paste, chạy 1 lần — **không ship CDN vào production**):

```powershell
$ProgressPreference = 'SilentlyContinue'
foreach ($w in @(400,500,600,700)) {
  Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/fontsource/fonts/quicksand@latest/vietnamese-$w-normal.woff2" -OutFile "fonts\quicksand-$w-vietnamese.woff2" -TimeoutSec 30
}
```

Nguồn thay thế (gstatic immutable v37 — lưu ý Google dùng CHUNG 1 file VN cho cả 4 weight nên chỉ dùng khi hiểu variable/static): `https://fonts.gstatic.com/s/quicksand/v37/6xKtdSZaM9iE8KbpRA_hJFQNcOM.woff2`.

## 4. Patch `@font-face` — drop-in thay `index.html:35-38` (8 block)

Nguyên tắc: block latin cũ **thêm `unicode-range` latin** (nếu không, latin không-range sẽ nuốt mọi codepoint, VN vẫn vỡ); 4 block vietnamese mới đứng TRƯỚC theo thứ tự Google (range rời nhau nên thứ tự không bắt buộc, theo convention cho dễ diff với `css2`).

```css
@font-face{font-family:'Quicksand';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/quicksand-400-vietnamese.woff2') format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}
@font-face{font-family:'Quicksand';font-style:normal;font-weight:500;font-display:swap;src:url('fonts/quicksand-500-vietnamese.woff2') format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}
@font-face{font-family:'Quicksand';font-style:normal;font-weight:600;font-display:swap;src:url('fonts/quicksand-600-vietnamese.woff2') format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}
@font-face{font-family:'Quicksand';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/quicksand-700-vietnamese.woff2') format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}
@font-face{font-family:'Quicksand';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/quicksand-400.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Quicksand';font-style:normal;font-weight:500;font-display:swap;src:url('fonts/quicksand-500.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Quicksand';font-style:normal;font-weight:600;font-display:swap;src:url('fonts/quicksand-600.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Quicksand';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/quicksand-700.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
```

Font stack **giữ nguyên** (`index.html:46`): `Quicksand, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`. Không thêm `latin-ext` (app VN-only; thêm khi cần `ł ğ €` — xem range trong `css2` live §1).

## 5. Cho @frontend (đọc file, không forward)

1. Xóa 4 dòng `@font-face` cũ (`index.html:35-38`) → dán 8 block §4 vào đúng vị trí.
2. Không đụng `font-family`, weight, `line-height`/`letter-spacing` (DS-002 §3.3 còn hiệu lực).
3. Verify: mở modal "Chỉnh sửa tài khoản" → paste chuỗi tra tấn `Ă Â Đ Ê Ô Ơ Ư ằ ắ ỉ ử ả ỗ ữ ₫` → mọi glyph cùng 1 font (DevTools → Computed → Rendered Fonts chỉ hiện `Quicksand`, không còn `Segoe UI/Arial` xen kẽ); DevTools Network không có request `fonts.googleapis.com`/`gstatic.com`; `package.json files` đã gồm `fonts/**/*` (có sẵn, khỏi sửa).

---
verification: `partially_verified` (file woff2 verify magic `wOF2` + size; range copy từ `css2` live 07/10/2026; chưa chạy Electron render test).
