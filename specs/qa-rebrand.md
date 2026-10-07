# DS-QA-010 — QA tĩnh Rebrand 9Meta → IIT Socials

> Scope: QA tĩnh FE-010 theo `specs/rebrand.md` §7. Không chạy Electron.
> Date: 07/10/2026. Verdict: **PASS ✅**

## 1. R1–R20 (20/20 PASS)

| # | Check | Kết quả |
|---|-------|---------|
| R1 | `package.json:2` name `iit-socials` | PASS |
| R2 | description `IIT Socials - …` | PASS |
| R3 | productName `IIT Socials` | PASS |
| R4 | dmg title `IIT Socials` | PASS |
| R5 | artifactName `IIT-Socials-…` | PASS |
| R6 | shortcutName `IIT Socials` | PASS |
| R7 | keyword `IIT Socials` | PASS |
| R8 | `main.js:2` comment IIT Socials | PASS |
| R9 | `main.js:169` tray tooltip | PASS |
| R10 | `main.js:181` menu `Mở IIT Socials` | PASS |
| R11 | `main.js:408` title + giữ `icon:` | PASS |
| R12 | `main.js:1009` unread tooltip | PASS |
| R13 | `index.html:8` meta description | PASS |
| R14 | `index.html:9` `<title>IIT Socials</title>` | PASS |
| R15 | `index.html:976` badge `alt=IIT Socials` + `IIT` | PASS |
| R16 | `index.html:999` aria-label IIT Socials | PASS |
| R17 | `index.html:1002` h3 IIT Socials | PASS |
| R18 | `custom_style.css:1` comment IIT Socials | PASS |
| R19 | `README` 7 điểm IIT Socials | PASS |
| R20 | `release.yml:1` name IIT Socials | PASS |

## 2. GIỮ (không đụng)

- `appId com.zalo.desktop` giữ (`package.json:13`, `main.js:28,34`) — PASS
- `publish.url https://api.tiodev.io.vn/updates` + VPS `/var/www/9meta-updates` giữ — PASS
- `9 chức năng` sống (`index.html:1003`) — PASS
- `grep 9Meta` = 2 hits, cả 2 là migrate allowed (`main.js:1017,1019`) = 0 hit lạ — PASS
- `9M` standalone = 0 — PASS

## 3. Migrate + Icon + Badge

- Migrate `9Meta→IIT Socials` `main.js:1017-1022` (`cpSync recursive force:false`, try/catch) trước `createWindow` — PASS
- `icon.png` 512×512 RGBA, magic `89504E47`, 53.2KB — PASS
- `icon.ico` 4 entry 16/32/48/256 32bpp, 30KB (cũ 410KB 8-entry) — PASS (planes=0, chuẩn PNG-compressed, không block)
- Fallback `9M→IIT`, `font-size 15→12px` (`index.html:109`) — PASS
- `#brand-badge img contain+padding:6px+display:block` (`index.html:119-121`) — PASS
- `.badge top/right -4→2px` badge-inside (`index.html:211-212`) — PASS
- `node --check main.js` → MAIN_OK — PASS

## 4. a11y nhanh (impeccable audit tĩnh)

- `:focus-visible` ring còn (`index.html:183-188`) — PASS
- Badge `IIT` trên `--primary` cả 2 mode đọc được (dark #060b14/#6ea8ff ~7:1; light primary đậm + fg trắng) — PASS
- Không thêm gradient/glass/side-stripe mới — PASS

## Verdict

**PASS ✅** — đủ điều kiện close DS-010. Manual Electron còn lại cho owner: badge đều 4 phía, unread tròn đầy, Tab ring, cài đè giữ profiles.

---
verification: `partially_verified` (QA tĩnh + magic-bytes + node check; chưa chạy Electron render test).
