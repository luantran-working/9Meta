# Spec: Brand icons sidebar — full 10 platform (DS-003)

> Scope: `renderer.js` `BRAND_SVG` + `renderSidebar()`. Ponytail full: 1 object thay thế, 0 dep mới.
> Quy tắc render (không đổi thứ tự): **`p.avatar img` > `BRAND_SVG` > `PLATFORM_EMOJI`**. Cấm chữ cái đơn.

## 1. Audit — vì sao screenshot vẫn thấy icon cũ

| # | Nguyên nhân | Vị trí |
|---|-------------|--------|
| B1 | `BRAND_SVG` chỉ có **2/10** key (telegram, messenger) → 8 platform còn lại rớt xuống emoji `PLATFORM_EMOJI` | `renderer.js:133-136` |
| B2 | `p.avatar` truthy → `<img>` phủ kín nút (`position:absolute;inset:0`), che cả SVG mới | `renderer.js:243-247` |
| B3 | `normalizeProfiles()` giữ nguyên `p.avatar` cũ qua mọi lần persist → icon mới **không bao giờ hiện** với profile đã có avatar | `renderer.js:88-91` |
| B4 | Nút "9 / Zalo / tím" trong screenshot = DOM cũ (letter/avatar cached), code mới chưa có nút xóa avatar nên user không có cách nào lộ SVG ra |

Kết luận: **thay `BRAND_SVG` thôi chưa đủ — phải thêm nút "Xóa ảnh" trong modal** (§4), nếu không profile cũ mãi hiện `<img>`.

## 2. Map platform → icon (10/10)

| Platform | Loại icon | Nguồn path (không bịa) |
|----------|-----------|------------------------|
| zalo | stroke "Z" tự vẽ | custom — Zalo không có trong simple-icons/lucide |
| telegram | fill paper-plane | giữ nguyên path đang có trong repo |
| messenger | fill bubble | giữ nguyên path đang có trong repo |
| fanpage | stroke flag | lucide `flag` |
| facebook | fill "f" | simple-icons `facebook` |
| whatsapp | stroke phone | lucide `phone` |
| discord | stroke bubble | lucide `message-circle` |
| teams | stroke users | lucide `users` |
| gmail | stroke mail | lucide `mail` |
| custom | stroke link | lucide `link` |

> Nâng cấp sau (khi cần brand thật 100%): copy path fill từ `simpleicons.org` (whatsapp/discord) đè vào cùng key — không đổi code render. `ponytail:` stroke generic đủ nhận diện ở 20px, đừng add dep icon lib cho 3 path.

## 3. Snippet copy-paste — thay toàn bộ `BRAND_SVG` (`renderer.js:133-136`)

```js
const BRAND_SVG = {
  zalo: '<svg class="brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10l-10 16h10"/></svg>',
  telegram: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21.9 4.6 2.7 12.1c-.8.3-.8 1.4.1 1.6l4.7 1.5 1.8 5.6c.3.8 1.3.9 1.8.2l2.6-2.6 4.9 3.6c.6.4 1.5.1 1.7-.6l2.6-15c.2-.9-.6-1.7-1-1.8z"/></svg>',
  messenger: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.5 2 2 6.1 2 11.3c0 2.9 1.6 5.4 4 7v3.7l3.7-2c1 .3 2 .4 3.1.4h.2c5.5 0 10-4.1 10-9.1S17.5 2 12 2z"/></svg>',
  fanpage: '<svg class="brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>',
  facebook: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  whatsapp: '<svg class="brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  discord: '<svg class="brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
  teams: '<svg class="brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  gmail: '<svg class="brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  custom: '<svg class="brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};
```

`PLATFORM_EMOJI` + `platformFallback()` giữ nguyên (fallback khi key lạ).

## 4. CSS bắt buộc — sửa 1 dòng (`index.html:197`)

```css
/* CŨ (vỡ icon stroke — CSS fill đè attribute fill="none"): */
/* .profile-btn svg.brand{width:20px;height:20px;fill:currentColor} */
/* MỚI (fill/stroke do inline attr quyết định, CSS chỉ size): */
.profile-btn svg.brand{width:20px;height:20px;flex:none}
```

Logic `renderSidebar()` giữ nguyên — đã đúng thứ tự (`renderer.js:241-249`).

## 5. Nút "Xóa ảnh" trong modal — BẮT BUỘC (giải B4)

Thêm 1 ghost button cạnh avatar preview trong modal thêm/sửa profile:

```js
// trong openModal(), sau updateAvatarPreview():
// HTML modal thêm: <button id="avatar-clear" type="button" class="modal-btn cancel">Xóa ảnh</button>
document.getElementById('avatar-clear').onclick = () => { tempAvatarPath = null; updateAvatarPreview(); };
// khi save: profile.avatar = tempAvatarPath (null → renderSidebar rớt xuống BRAND_SVG)
```

Hiển thị nút chỉ khi `tempAvatarPath` truthy (không thì ẩn — tránh clutter).

## 6. Contrast trên 2 nền (ràng buộc cứng)

| Nền nút | Màu icon (`currentColor`) | Tỉ lệ tương phản |
|---------|--------------------------|------------------|
| `secondary` default (dark `rgba(255,255,255,.08)` / light `rgba(16,30,60,.06)`) | `secondary-fg` (`#eef4ff` / `#0f2c58`) | ≥ 4.5:1 cả 2 mode ✅ |
| `active primary` (`#6ea8ff` dark / `#2563eb` light) | `primary-fg` (`#060b14` / `#fff`) | ≥ 4.5:1 cả 2 mode ✅ |
| Emoji fallback | màu native của emoji | không phụ thuộc nền, chấp nhận ✅ |

Cấm tô màu brand riêng từng icon (xanh lá whatsapp, tím discord…) — sidebar restrained, 1 accent duy nhất (§2 DESIGN.md).

## 7. Cách test (frontend, ~2 phút)

1. Thay snippet §3 + CSS §4 → reload Electron.
2. Tạo 10 profile, mỗi platform 1 cái, **không đặt avatar** → cả 10 hiện SVG, không còn emoji.
3. Đặt avatar 1 profile → hiện `<img>`; bấm "Xóa ảnh" → SVG của đúng platform hiện ra.
4. Tab qua từng nút: thấy `:focus-visible` ring; bật light-mode: icon vẫn đọc được.
5. Xóa `p.avatar` trong store cũ 1 lần nếu user báo vẫn thấy ảnh cũ (data migration, không phải code).

---
verification: `partially_verified` (spec tĩnh từ source + path SVG đã biết chính xác, chưa chạy Electron).
