# Spec: Real brand icons — full 10 platform, 0 emoji (DS-004)

> Scope: `renderer.js` `BRAND_SVG` + `renderSidebar()` + `updateAvatarPreview()`. Ponytail full: 1 object thay thế, 0 dep npm mới, ~6 KB inline.
> Quy tắc render sau task này: **`p.avatar img` > `BRAND_SVG_REAL` (đủ 10/10)** > generic link SVG (key lạ). Emoji fallback bị xóa hoàn toàn.
> Đọc cùng: `DESIGN.md §9` (DS-003), file này thay thế snippet DS-003 §3.

## 1. So sánh 3 option offline-friendly cho Electron

| Tiêu chí | A. simple-icons (copy path inline) ✅ THẮNG | B. FontAwesome brands (`@fortawesome/fontawesome-free`) | C. Devicons / CDN / react-icons |
|---|---|---|---|
| Đủ 10 platform | 9/10 trực tiếp (zalo ✅ mới có slug `zalo`, telegram, messenger, facebook, whatsapp, discord, gmail + teams qua bản v9); fanpage = reuse path facebook (đúng brand: Fanpage là Facebook Page); custom = lucide `link` (không có brand — giữ generic là đúng) | 8/10 — thiếu **zalo**, teams chỉ có logo `microsoft` chung (không phải logo Teams 2-người) | Devicons thiếu messenger/zalo/teams; CDN наруж CSP + offline `file://` của Electron — loại ngay; react-icons = bundle React, vô dụng với vanilla `renderer.js` |
| Size ship | **~6 KB** inline trong `renderer.js` (mỗi path 0.3–1.5 KB) | ~500 KB+ (woff2 + css, dù chỉ dùng 10 glyph) + phải thêm vào `electron-builder files` | npm simple-icons full = ~10 MB / 3400 icon — lãng phí nếu add dep |
| Cách bundle local, không CDN | Copy `path` vào object (đã làm sẵn §3) — 0 file mới, 0 config build | Thêm dep + `@font-face` + whitelist `files[]` trong `package.json` build | Không offline được (CDN) hoặc lôi cả lib |
| License | **CC0-1.0** — không bắt buộc ghi công; trademark thuộc chủ brand (ghi chú §5) | CC-BY-4.0 cho brands → **bắt buộc attribution** trong app | CC0 (simple-icons) / MIT nhưng thiếu icon |
| Render ở 20px sidebar | fill solid → đọc tốt ở size nhỏ, `currentColor` ăn theo theme | tốt, nhưng phải canh `font-size`/baseline | — |

**Kết luận:** A thắng mọi tiêu chí. B chỉ xem xét khi sau này cần icon brand ngoài sidebar (lúc đó hãy add — YAGNI bây giờ).

## 2. Xử lý riêng từng ca đặc biệt

| Platform | Xử lý | Lý do |
|---|---|---|
| **zalo** | simple-icons slug `zalo` (path thật, fetch 07/10/2026 từ `simpleicons.org/icons/zalo.svg`) | Trước đây chưa có trong simple-icons/lucide nên DS-003 dùng "Z" tự vẽ — nay **thay bằng logo Zalo chính thức**, xóa Z tự vẽ |
| **teams** | Path `microsoftteams` từ **simple-icons v9** (bản hiện tại đã gỡ icon này — verify §1) | CC0 vẫn hiệu lực, project license không đổi. Ghim version trong comment để lần sau không ai "update" mất |
| **fanpage** | Reuse path `facebook` | Fanpage = Facebook Page, dùng logo "f" là đúng brand, không bịa flag generic như DS-003 |
| **custom** | Giữ lucide `link` stroke (path cũ trong repo) | URL tùy ý không có brand — generic là đúng, không cố "thật" |
| telegram/messenger/facebook/whatsapp/discord/gmail | Path simple-icons bản hiện tại (§3) | Thay toàn bộ stroke generic/lucide của DS-003 |

## 3. Snippet copy-paste — thay toàn bộ `BRAND_SVG` (`renderer.js:133-144`)

Tất cả: `viewBox="0 0 24 24"`, `fill="currentColor"`, `stroke="none"` (trừ `custom` giữ stroke lucide). `fill` do inline attr quyết định — CSS chỉ set size (giữ quy tắc DS-003 §4: cấm `fill` trong CSS).

```js
const BRAND_SVG_REAL = {
  zalo: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z"/></svg>',
  telegram: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
  messenger: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13"/></svg>',
  fanpage: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>',
  facebook: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>',
  whatsapp: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
  discord: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>',
  teams: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.625 8.127q-.55 0-1.025-.205-.475-.205-.832-.563-.358-.357-.563-.832Q18 6.053 18 5.502q0-.54.205-1.02t.563-.837q.357-.358.832-.563.474-.205 1.025-.205.54 0 1.02.205t.837.563q.358.357.563.837.205.48.205 1.02 0 .55-.205 1.025-.205.475-.563.832-.357.358-.837.563-.48.205-1.02.205zm0-3.75q-.469 0-.797.328-.328.328-.328.797 0 .469.328.797.328.328.797.328.469 0 .797-.328.328-.328.328-.797 0-.469-.328-.797-.328-.328-.797-.328zM24 10.002v5.578q0 .774-.293 1.46-.293.685-.803 1.194-.51.51-1.195.803-.686.293-1.459.293-.445 0-.908-.105-.463-.106-.85-.329-.293.95-.855 1.729-.563.78-1.319 1.336-.756.557-1.67.861-.914.305-1.898.305-1.148 0-2.162-.398-1.014-.399-1.805-1.102-.79-.703-1.312-1.664t-.674-2.086h-5.8q-.411 0-.704-.293T0 16.881V6.873q0-.41.293-.703t.703-.293h8.59q-.34-.715-.34-1.5 0-.727.275-1.365.276-.639.75-1.114.475-.474 1.114-.75.638-.275 1.365-.275t1.365.275q.639.276 1.114.75.474.475.75 1.114.275.638.275 1.365t-.275 1.365q-.276.639-.75 1.113-.475.475-1.114.75-.638.276-1.365.276-.188 0-.375-.024-.188-.023-.375-.058v1.078h10.875q.469 0 .797.328.328.328.328.797zM12.75 2.373q-.41 0-.78.158-.368.158-.638.434-.27.275-.428.639-.158.363-.158.773 0 .41.158.78.159.368.428.638.27.27.639.428.369.158.779.158.41 0 .773-.158.364-.159.64-.428.274-.27.433-.639.158-.369.158-.779 0-.41-.158-.773-.159-.364-.434-.64-.275-.275-.639-.433-.363-.158-.773-.158zM6.937 9.814h2.25V7.94H2.814v1.875h2.25v6h1.875zm10.313 7.313v-6.75H12v6.504q0 .41-.293.703t-.703.293H8.309q.152.809.556 1.5.405.691.985 1.19.58.497 1.318.779.738.281 1.582.281.926 0 1.746-.352.82-.351 1.436-.966.615-.616.966-1.43.352-.815.352-1.752zm5.25-1.547v-5.203h-3.75v6.855q.305.305.691.452.387.146.809.146.469 0 .879-.176.41-.175.715-.48.304-.305.48-.715t.176-.879Z"/></svg>',
  gmail: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>',
  custom: '<svg class="brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};
// nguồn path (verify 07/10/2026, fetch trực tiếp file .svg):
// zalo/telegram/messenger/facebook/whatsapp/discord/gmail = simpleicons.org/icons/{slug}.svg (bản hiện tại)
// fanpage = reuse path facebook (Fanpage là Facebook Page)
// teams = simple-icons v9 icons/microsoftteams.svg (bản hiện tại đã gỡ; CC0 vẫn hiệu lực — đừng "update" mất)
// custom = lucide link (giữ nguyên trong repo)
```

> Xóa object cũ `BRAND_SVG` (Z tự vẽ + 6 stroke generic), đổi mọi chỗ dùng thành `BRAND_SVG_REAL`. Giữ tên mới để grep ra chỗ sót.

## 4. Loại bỏ emoji fallback hoàn toàn (patch cho @frontend)

3 điểm chạm emoji trong `renderer.js` — sửa cả 3, không để sót:

**4.1. `renderSidebar()` (`renderer.js:249-257`)** — hiện tại luôn tạo `span` emoji rồi mới chèn SVG. Mới: không tạo span emoji nữa.

```js
// CŨ:
const span = document.createElement('span');
span.innerText = p.avatar ? '' : platformFallback(p.platform);
if (p.avatar) {
  const img = document.createElement('img');
  img.src = p.avatar.startsWith('http') || p.avatar.startsWith('data:') ? p.avatar : `file://${String(p.avatar).replace(/\\/g, '/')}`;
  img.style.cssText = 'width:100%;height:100%;border-radius:inherit;object-fit:cover;position:absolute;inset:0;';
  btn.appendChild(img);
} else if (BRAND_SVG[p.platform]) btn.innerHTML = BRAND_SVG[p.platform];
else btn.appendChild(span);

// MỚI:
if (p.avatar) {
  const img = document.createElement('img');
  img.alt = '';
  img.src = p.avatar.startsWith('http') || p.avatar.startsWith('data:') ? p.avatar : `file://${String(p.avatar).replace(/\\/g, '/')}`;
  img.style.cssText = 'width:100%;height:100%;border-radius:inherit;object-fit:cover;position:absolute;inset:0;';
  btn.appendChild(img);
} else {
  btn.innerHTML = BRAND_SVG_REAL[p.platform] || BRAND_SVG_REAL.custom; // key lạ → link generic, KHÔNG emoji
}
```

**4.2. `updateAvatarPreview()` (`renderer.js:301-313`)** — preview modal hiện dùng `avatarLetter.innerText = platformFallback(...)`. Mới: preview render SVG thật.

```js
// trong nhánh else (không có tempAvatarPath):
avatarImg.style.display = 'none';
avatarLetter.style.display = 'block';
avatarLetter.innerHTML = BRAND_SVG_REAL[platformInput.value || 'zalo'] || BRAND_SVG_REAL.custom;
```

**4.3. Xóa `PLATFORM_EMOJI` + `platformFallback()` (`renderer.js:130-132`)** — xóa cả comment `ponytail: emoji fallback...`. Verify không còn reference: `grep -rn "platformFallback\|PLATFORM_EMOJI\|innerText = p.avatar" renderer.js` phải trả về rỗng.

> a11y đi kèm (§6 DESIGN.md không đổi): `btn` đã có `aria-label` + `data-tip` = tên + platform → icon SVG trang trí, thêm `aria-hidden="true"` vào svg khi innerHTML (patch: `btn.querySelector('svg')?.setAttribute('aria-hidden','true')` sau khi gán — 1 dòng, screen reader đọc label nút thay vì path).

## 5. License — ghi chú bắt buộc

- **simple-icons = CC0-1.0** (public domain,_fetch từ simpleicons.org + jsdelivr v9_): **không bắt buộc attribution**. Giữ comment nguồn trong code (§3, đã có) là đủ.
- **Trademark**: logo Zalo/Telegram/Messenger/Facebook/WhatsApp/Discord/Teams/Gmail thuộc chủ sở hữu. Dùng làm indicator "profile này là tài khoản X" trong app quản lý đa tài khoản = nominative fair use; **không** dùng làm logo app, không ngụ ý chứng thực (app icon vẫn là `9M` — DESIGN.md §8 không đổi).
- **Không tô màu brand riêng** (xanh lá/ tím…): icon luôn `currentColor` theo theme — vừa đúng restrained strategy (§2 DESIGN.md), vừa tránh vi phạm guideline màu brand (một số brand yêu cầu màu chuẩn khi dùng màu, monochrome luôn an toàn).

## 6. Bundle & test (không đổi build)

- **0 file mới, 0 dep, 0 sửa `package.json:files[]`** — path nằm trong `renderer.js` đã có trong bundle. Không CDN → không chạm CSP/`file://`.
- Test (~2 phút, Electron): 10 profile không avatar → 10 logo thật, 0 emoji; key lạ (sửa store tay 1 platform `"foobar"`) → icon link generic; Tab qua từng nút thấy ring; light-mode đọc được (currentColor ≥4.5:1 theo DS-003 §6, fill không đổi tỉ lệ); Xóa avatar → SVG đúng platform hiện ra (nút `#avatar-clear` giữ nguyên).

---
verification: `partially_verified` (path fetch trực tiếp từ simpleicons.org + jsdelivr v9 ngày 07/10/2026, chưa chạy Electron).
