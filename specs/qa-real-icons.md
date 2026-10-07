# QA — FE-004 Real brand icons (DS-004) — PASS ✅

Scope: static only (no Electron). Reviewed: `renderer.js:130-146,240-316,773` + `index.html:197-201,1244-1249` vs `specs/real-icons.md §3-§4` + `specs/implementation-summary.md (FE-004)`.

## Checks (all PASS)

| # | Check | Result |
|---|-------|--------|
| 1 | Đủ 10 key `BRAND_SVG_REAL` (zalo/telegram/messenger/fanpage/facebook/whatsapp/discord/teams/gmail/custom), mỗi key 1 `<path d="...">` non-empty, verbatim spec §3 | ✅ PASS — `renderer.js:135-146`, fanpage reuse path facebook đúng spec |
| 2 | Emoji xóa hết (`platformFallback/PLATFORM_EMOJI/innerText = p.avatar` + `BRAND_SVG[` rỗng, không còn `span` emoji) | ✅ PASS — grep `renderer.js` 0 match (còn lại chỉ trong docs/specs cũ, đúng) |
| 3 | Key lạ → link generic | ✅ PASS — `L258` + `L314` đều `... \|\| BRAND_SVG_REAL.custom` |
| 4 | `aria-hidden` sidebar SVG (btn đã có `aria-label`+`data-tip`) | ✅ PASS — `L259` `querySelector('svg')?.setAttribute('aria-hidden','true')` |
| 5 | Monochrome `currentColor` (9 fill + custom stroke), CSS chỉ size | ✅ PASS — inline attr đúng, `index.html:197-201` chỉ `width/height/flex:none`, không đè fill |
| 6 | No regression (badge/avatar-clear/roving/order avatar>SVG) | ✅ PASS — badge `span`+`aria-hidden` `L261-265`, `#avatar-clear` wiring `L773` + toggle `L306`, `img.alt=''` `L253` |

## Minor (non-blocking, optional)

- `updateAvatarPreview()` `L314` gán `innerHTML` vào `#avatar-letter` nhưng không set `aria-hidden` như sidebar `L259`. Preview nằm trong modal có label riêng nên không vi phạm spec §4.2 — bỏ qua được; nếu muốn đồng nhất thêm 1 dòng `avatarLetter.querySelector('svg')?.setAttribute('aria-hidden','true')`.

## Verdict

**PASS ✅** — FE-004 shippable. Còn lại duy nhất manual Electron (~2m, spec §6): 10 profile không avatar → logo thật, key lạ `foobar` → link, Tab ring, light-mode contrast, Xóa ảnh lộ SVG.

verification: `partially_verified` (static only, chưa chạy Electron).
