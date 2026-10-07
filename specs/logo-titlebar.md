# DS-011 — Logo nền trắng + titlebar theo theme (IIT Socials)

> Scope: 2 việc UI theo screenshot user (titlebar đen cố định + logo khó thấy trên sidebar tối).
> Đọc trực tiếp: `index.html:100-122,976` + `main.js:417,581,1035` + `renderer.js:180-185,1087-1090`. 0 dep.
> Strategy: restrained — logo 1 plate trắng cố định (không branch theme); titlebar giữ **native Windows tự vẽ** (`titleBarOverlay:false`), chỉ sync màu.

## 1. Logo sidebar — nền trắng (badge 40px giữ)

**Root cause**: `#brand-badge` nền `var(--primary)` (xanh) + `img icon.png` nền transparent → glyph tối chìm trên sidebar dark `#060b14`; light-mode sidebar `#fff` thì mất viền.

**Quyết định: trắng cả dark + light (không branch)** — ít dòng nhất (1 rule, 0 override `body.light-mode`), contrast ổn định vì plate cố định bất kể sidebar `#060b14`/`#fff`; trùng sidebar light thì `border:var(--line)` định viền.

### Patch CSS (copy-paste, `index.html` thay block `#brand-badge` cũ)

```css
#brand-badge {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #fff; /* DS-011: plate trắng cố định dark+light */
  color: #0b1220; /* DS-011: fallback chữ "IIT" đọc được trên trắng */
  border: 1px solid var(--line); /* DS-011: định viền khi sidebar light cũng trắng */
  font-weight: 800;
  font-size: 12px;
  letter-spacing: .2px;
  box-shadow: none;
  margin-bottom: 12px;
  overflow: hidden;
}

#brand-badge img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 6px; /* giữ từ DS-010 */
  display: block;
  background: #fff; /* DS-011: img transparent vẫn trắng */
}
```

Diff thực tế vs code hiện tại: `background:var(--primary)` → `#fff`, `color:var(--primary-fg)` → `#0b1220`, +1 dòng `border`, img +1 dòng `background`. Giữ `40px / contain / padding:6px / radius:14px / overflow:hidden`.

### Contrast / fallback

- Fallback text `IIT` (`index.html:976`, khi `img` lỗi): `#0b1220` trên `#fff` ≈ 15:1, ≥4.5:1 ✅.
- Glyph tối trên plate trắng: đạt; glyph sáng (nếu icon mới viền sáng) vẫn tách khỏi sidebar dark nhờ plate.
- `alt="IIT Socials"` giữ nguyên (a11y, không đổi).

## 2. Titlebar theo dark/light (native, không custom)

**Quyết định: Windows tự vẽ, không custom titlebar.** `titleBarOverlay:false` giữ nguyên — custom = drag-region + nút min/max/close tự vẽ (~100 dòng), vi phạm ponytail. Màu + chữ theo theme do OS tự xử khi `nativeTheme.themeSource` đúng.

**2 bug hiện tại**:
- (a) `main.js:417` dark dùng `'#242526'` (xám lạ, lệch `--background #060b14`) → titlebar đen kiểu screenshot.
- (b) `main.js:581` handler `set-theme` chỉ set `nativeTheme.themeSource`, không `setBackgroundColor` → đổi theme phải restart mới ăn màu khung.

**Màu chốt**: dark `#060b14` (= `--background`, liền mạch sidebar), light `#ffffff` (= sidebar light `#fff`). Chữ titlebar theo OS tự động (sáng trên dark, tối trên light) — không code thêm.

### Patch main.js (copy-paste, 2 điểm)

P1 — sửa màu khởi tạo (dòng 417):

```js
backgroundColor: settings.isDarkMode ? '#060b14' : '#ffffff', show: !settings.startMinimized, autoHideMenuBar: true, titleBarOverlay: false,
```

P2 — live-update khi toggle, không restart (thay dòng 581):

```js
ipcMain.on('set-theme', (event, isDark) => { settings.isDarkMode = isDark; saveSettings(settings); nativeTheme.themeSource = isDark ? 'dark' : 'light'; if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setBackgroundColor(isDark ? '#060b14' : '#ffffff'); });
```

`renderer.js` giữ nguyên (đã gửi `set-theme` + đổi `body` class tại `:180-185`; init sync tại `:1087-1090`). `main.js:1035` init `themeSource` giữ nguyên. Không đụng `titleBarStyle`/`titleBarOverlay`/preload.

## 3. Verify (cho @frontend / @leader)

- [ ] Badge 40px, nền trắng cả 2 mode, `IIT` fallback đọc được khi xóa/rename `icon.png`.
- [ ] Khởi động dark → viền window/titlebar `#060b14`; toggle Giao diện → trắng ngay, không restart; restart vẫn nhớ (settings).
- [ ] `grep -n "242526" main.js` = 0 hit; `grep -n "setBackgroundColor" main.js` = 1 hit.
- [ ] Không custom titlebar: `titleBarOverlay: false` còn nguyên.

---
verification: `partially_verified` (patch từ đọc code tĩnh index.html/main.js/renderer.js, chưa chạy Electron render test).
