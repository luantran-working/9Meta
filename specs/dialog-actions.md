# DS-008 — Dialog actions: row Xóa / Hủy / Lưu modal profile

> Scope: `#modal-overlay .modal-box` row cuối (`#modal-delete/#modal-cancel/#modal-save`, `index.html:1314-1317`). Ponytail: patch scoped, 0 dep, không đụng `.row` global.

## 1. Audit — vì sao dính

| # | Nguyên nhân | Vị trí | Mức |
|---|-------------|--------|-----|
| R1 | Inner `<div>` bọc Hủy+Luu là div trần — **không `display:flex`, không `gap`** → 2 nút inline sát nhau, gap = 0 | `index.html:1315-1316` | P0 |
| R2 | Mode Thêm: `#modal-delete` có `style="display:none"` → outer `.row` chỉ còn 1 child → `justify-content:space-between` vô hiệu | `index.html:1314` | P0 |
| R3 | `.modal-btn` không có `margin`, row này không có inline `margin-left/right:5px` như row CRM (`index.html:1149-1150`) → 0 khoảng cách dự phòng | `index.html:660-669` | P1 |
| R4 | `.modal-btn` thiếu `min-height`/`min-width`, padding `11px 16px` → hit-target < 40px, cao thấp lệch khi font render khác nhau | `index.html:660-669` | P1 |
| R5 | `.row` là class dùng chung toàn app (`panel-head, section-head, .row` chung 1 rule) — cấm sửa global, phải scope class riêng | `index.html:550-557` | P1 |
| R6 | `.modal-btn.warn` (Xóa) nền `rgba(255,92,124,.16)` chữ `#ff7d97` — light-mode contrast yếu, không có `:focus-visible` riêng | `index.html:690-693` | P2 a11y |

## 2. Spec shadcn (cho @frontend)

- **Layout**: outer `space-between` (Xóa trái, group Hủy+Luu phải, `gap:8px`); group phải `display:flex; gap:8px; align-items:center`.
- **Delete ẩn** (mode Thêm): group phải tự `margin-left:auto` → vẫn neo phải, không trôi trái.
- **Metrics**: nút `min-height:40px; padding:10px 16px; border-radius:10px (var(--radius))`; Lưu `min-width:96px`.
- **Variants**: Lưu = primary (`linear-gradient primary→primary-2` giữ nguyên, chữ `#fff`); Hủy = ghost (`var(--secondary)`/light `rgba(12,30,60,.08)` giữ nguyên); Xóa = destructive-ghost (giữ nền cũ + thêm `border:1px solid rgba(255,92,124,.35)`).
- **States**: hover `translateY(-1px)` giữ; `:focus-visible { outline:2px solid var(--ring); outline-offset:2px }`; `:disabled { opacity:.5; cursor:not-allowed }`.
- **Dark/light**: dùng token sẵn (`--primary`, `--ring`, `--line`, `--secondary`) — không thêm token mới.
- **Responsive modal hẹp** (`≤400px`): cho wrap — `.modal-actions { flex-wrap:wrap }`, group phải `flex:1` + nút `flex:1` (full-row chia đều, không tràn).
- **`prefers-reduced-motion`**: đã có rule global `transition:none` (`index.html:946-951`) — không thêm.

## 3. Patch copy-paste (ít dòng nhất)

**HTML** — thêm 2 class (2 dòng diff):

```diff
-      <div class="row mt-16"><button class="modal-btn warn" id="modal-delete" style="display:none;">Xóa</button>
-        <div><button class="modal-btn cancel" id="modal-cancel">Hủy</button><button class="modal-btn save"
+      <div class="row mt-16 modal-actions"><button class="modal-btn warn" id="modal-delete" style="display:none;">Xóa</button>
+        <div class="modal-actions-group"><button class="modal-btn cancel" id="modal-cancel">Hủy</button><button class="modal-btn save"
             id="modal-save">Lưu</button></div>
       </div>
```

**CSS** — dán sau block `.modal-btn.warn` (`index.html:690-693`):

```css
.modal-actions { gap: 8px; flex-wrap: wrap; }
.modal-actions-group { display: flex; gap: 8px; align-items: center; margin-left: auto; }
.modal-actions .modal-btn { min-height: 40px; padding: 10px 16px; border-radius: var(--radius); }
.modal-actions .modal-btn.save { min-width: 96px; }
.modal-actions .modal-btn.warn { border: 1px solid rgba(255,92,124,.35); }
.modal-actions .modal-btn:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
.modal-actions .modal-btn:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 400px) {
  .modal-actions-group { flex: 1 1 100%; }
  .modal-actions-group .modal-btn { flex: 1; }
}
```

> `// ponytail: không đụng .row global (dùng chung 10+ nơi); margin-left:auto để mode Thêm (Xóa ẩn) vẫn neo phải.`

## 4. Verify

1. Mở modal Thêm → Hủy + Lưu cách nhau 8px, neo phải, cao 40px.
2. Mở modal Sửa → Xóa trái, Hủy+Luu phải, không dính.
3. Tab qua 3 nút thấy focus ring; thu modal ≤400px nút chia đều không tràn.
4. Light-mode: ghost Hủy đọc được, Xóa không chói.

---
verification: `partially_verified` (patch từ đọc code tĩnh, chưa chạy Electron).
