# UI / UX Guidelines

How screens are composed. Tokens in [design-system.md](design-system.md); demo pages (`Shashvat Jewels ERP Design Improved v1`) are the reference for look & feel.

## Page anatomy (every tenant screen)

```
[fixed sidebar 272px] [fixed translucent header 60px: breadcrumb · branch · currency · bell]
[main: page header (title 22/800 + one-line subtitle) → section label → content cards]
```

- Breadcrumb in header: `Module › Page`, current segment 13/700 dark.
- Section labels ("KEY METRICS", "OPERATIONAL HEALTH") group card rows — 11/700 uppercase.
- Footer: single muted line, top border.

## Sidebar & navigation

- Grouped nav (Overview / Inventory / Operations / …) with 10px uppercase group labels.
- Item: 26px icon tile + 12.5px label. Active: teal-tinted bg, left 2px `--primary` accent, filled icon, 700 weight. Hover: `translateX(2px)` + subtle bg.
- Module search field at top ("Search modules…").
- Items are **permission-filtered** (§19.3) — absent, never disabled. Badge pill (e.g. count) right-aligned when relevant.
- Profile card pinned at bottom (avatar, name 12/700, role 10 muted).
- Branch-scoped users: branch switcher in header is locked to their branch (display only).

## Cards

White, radius 14, border `--border`, tinted shadow, hover lift. Stat card: icon tile (32px, semantic bg/fg) + 10px uppercase label on one row, trend pill top-right, value row (21/800 + small colored sub). Content card: title 16/700 + 11px subtitle, optional header controls right (segmented control, select, "View All" text button).

## Buttons

| Kind | Spec |
|---|---|
| Primary | `--primary` bg, white, 12/700, radius 8, padding 8–16px |
| Primary CTA (hero) | brand gradient, radius 12, icon tile + label/sub, glow shadow |
| Secondary | white bg, border `--input`, text `--text-strong-2`, 12/700, radius 8 |
| Segmented control | container `--background` bg + border radius 9; active segment white bg, teal text, hairline shadow |
| Ghost / text | no bg, 11/700 teal |
| Icon button | padding 6, radius 8, hover `--background` |
| Row kebab | `more_vert` icon → dropdown menu (radius 10, shadow, 11.5/600 items, danger item red) |

## Tables (module lists)

- Header row: `--background` bg, 10/700 uppercase headers; numeric columns right-aligned.
- Rows: border-top `--border`, cell padding ~13px 20px; primary identifier 13/700 dark, secondary text 12/500 muted; barcode/ids in 10.5px monospace muted.
- Status/type as badges (see design-system status map).
- Row actions via kebab menu: View, Edit, Sell, Memo, Reserve, Transfer, Generate Barcode, Print, History, Delete (danger, confirm dialog).
- Toolbar above table: filter row (see below) + primary action right.
- Footer: rows-per-page select (10/25/50) + "1–25 of 312" + pager. Maps to cursor pagination (`apps/api/kyp/pagination.md`).

## Filters

- Grid of labeled selects (label 9.5/700 muted above control), 5 core filters + **"More Filters"** toggle button showing an active-count pill (teal, 99px radius).
- Quick-view chips/tabs (e.g. Available / On Hold / Memo) are presets over the same query params.
- Filter changes reset to page 1 (drop cursor). Persist filters in URL search params so views are shareable.

## Forms

- RHF + Zod (same schema shapes as backend). Field errors inline under the control (from `error.details` on 400).
- Money/carat inputs: right-aligned, formatted on blur via `lib/money.ts` / `lib/carat.ts`.
- Destructive/irreversible actions (delete, cancel document, approve): confirmation dialog stating the consequence.
- Submit buttons disable + spinner during mutation; keep forms mounted on error.

## Feedback & states

- **Empty state:** centered icon + 12px muted message + actions row (Reset Filters secondary, primary CTA) — as in demo.
- **Loading:** skeleton cards/rows matching final layout (no spinners for full pages).
- **Errors:** toast per error class (`apps/api/kyp/` §21 envelope): permission → "You don't have permission…"; stock → the specific reason + refresh row; business rule → dialog if blocking.
- **Notifications:** bell in header with 6px red dot; dropdown list → full page `(dashboard)/notifications`. Each links to its source document.
- Live/system indicators use `pulseDot`.

## Language rules (§19.1 — hard rule)

Never render: "Tenant", "SaaS", "Workspace", "Multi-Tenant", plan/subscription copy in `(dashboard)`. Say "Company Settings", "Your branches", "Users". Super-admin-only vocabulary stays in `(super-admin)`.

## Accessibility

- All interactive elements keyboard-reachable; visible focus ring (2px `--primary` offset ring).
- Icon-only buttons get `aria-label`. Status badges must not rely on color alone (text label always present — they do).
- Contrast: body text tokens on white pass AA; never place `--text-muted` on `--muted`.
- Tables get `<caption>`/aria labels; charts get text summaries or accessible tooltips.
