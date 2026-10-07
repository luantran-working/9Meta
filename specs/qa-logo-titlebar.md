# DS-QA-011 — QA tĩnh Logo plate trắng + titlebar theo theme

> Scope: QA tĩnh FE-011 theo `specs/logo-titlebar.md` §3. Không chạy Electron.
> Date: 07/10/2026. Verdict: **PASS ✅**

## 1. Badge trắng (6/6 PASS)

| # | Check | Kết quả |
|---|-------|---------|
| B1 | `#brand-badge` 40px + `radius:14px` + `overflow:hidden` giữ (`index.html:100-115`) | PASS |
| B2 | `background:#fff` cố định dark+light, 0 branch `body.light-mode` | PASS |
| B3 | `color:#0b1220` fallback `IIT` trên `#fff` ≈15:1, ≥4.5:1 ✅ | PASS |
| B4 | `border:1px solid var(--line)` định viền khi sidebar light cũng trắng | PASS |
| B5 | `img contain+padding:6px+display:block+background:#fff` (`index.html:117-124`) | PASS |
| B6 | `alt="IIT Socials"` giữ, text fallback `IIT` (`index.html:978`) | PASS |

## 2. Titlebar native (5/5 PASS)

| # | Check | Kết quả |
|---|-------|---------|
| T1 | `main.js:417` dark `'#242526'`→`'#060b14'` (= `--background`, liền sidebar) | PASS |
| T2 | `main.js:581` `set-theme` +`setBackgroundColor(...)` live, không restart | PASS |
| T3 | `grep 242526 main.js` = 0 hit code (chỉ còn trong specs/docs lịch sử) | PASS |
| T4 | `setBackgroundColor` = 1 hit (`:581`); `060b14` = 2 hits (init + live) | PASS |
| T5 | `titleBarOverlay:false` còn nguyên, không custom titlebar/drag-region | PASS |

## 3. GIỮ (không đụng)

- `renderer.js:180-185` gửi `set-theme` + đổi `body` class giữ — PASS
- `main.js:1035` init `themeSource` giữ — PASS
- Không đụng `titleBarStyle`/preload — PASS

## 4. a11y nhanh (impeccable audit + colorize tĩnh)

- Plate trắng trên sidebar dark `#060b14` ≈19:1, tách glyph tối/sáng — PASS
- Chữ titlebar OS tự đảo theo `nativeTheme.themeSource`, không code thêm — PASS
- Không thêm gradient/glass/side-stripe/card mới — PASS

## Verdict

**PASS ✅** — đủ điều kiện close DS-011. Manual Electron còn lại cho owner: toggle Giao diện ăn ngay + restart nhớ theme, xóa `icon.png` thấy `IIT` đọc được.

---
verification: `partially_verified` (QA tĩnh + grep + đọc diff; chưa chạy Electron render test).
