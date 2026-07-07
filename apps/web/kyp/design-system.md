# Design System

Extracted from the approved demo: `E:\jemish\Sashvat jewels\Shashvat Jewels ERP Design Improved v1` (Dashboard, Certified Diamonds Inventory, Certified Diamond View). That demo is the visual source of truth; this doc turns it into tokens. Implementation: Tailwind CSS + shadcn/ui — tokens land in `globals.css` CSS variables and `tailwind.config`.

## Typography

- **Font:** Inter (300–800), `-webkit-font-smoothing: antialiased`. Numbers in tables/KPIs benefit from `font-variant-numeric: tabular-nums`.
- **Icons:** Material Symbols Outlined (variable: `FILL 0–1, wght 500`). Sizes 15–20px; filled (`FILL 1`) for active nav + stat icons, outlined elsewhere.

| Role | Size / weight | Extras |
|---|---|---|
| Page title (h2) | 22px / 800 | letter-spacing -0.01em, color text-primary |
| Page subtitle | 13px / 500 | text-secondary |
| Card title (h3) | 16px / 700 | |
| Section label | 11px / 700 | UPPERCASE, letter-spacing 0.1em, text-secondary |
| KPI value | 21–22px / 800 | letter-spacing -0.01em |
| Body / cell | 12–13px / 500–700 | |
| Table header | 10px / 700 | UPPERCASE, letter-spacing 0.08em, text-secondary |
| Caption / meta | 10–11px / 500–700 | text-muted |
| Input / filter label | 9.5–11.5px | label 9.5/700 text-muted above control |

## Color tokens

```css
:root {
  /* surfaces */
  --background: #f8fafc;        /* page canvas */
  --card: #ffffff;
  --card-subtle: #fbfcfd;       /* profile chip, subtle fills */
  --muted: #f1f5f9;             /* subtle fill, neutral badge bg, chart track */

  /* borders */
  --border: #f1f5f9;            /* card borders, dividers, table row lines */
  --input: #e2e8f0;             /* input/select/secondary-button borders */

  /* text */
  --foreground: #0f172a;        /* primary text */
  --text-strong-2: #475569;     /* secondary buttons, strong secondary */
  --text-secondary: #64748b;    /* labels, subtitles */
  --text-muted: #94a3b8;        /* meta, placeholders, group labels */

  /* brand */
  --primary: #3fa393;           /* teal — actions, active nav, links, chart line */
  --primary-light: #6FD3C4;     /* gradients, area fills, accents */
  --primary-dark: #2f7d70;      /* gradient end, hover text */
  --primary-ink: #0d1117;       /* icon color on light-teal gradient */

  /* semantic (bg / fg pairs) */
  --success-bg: #f0fdf4;  --success: #16a34a;
  --warning-bg: #fffbeb;  --warning: #d97706;    /* alt shades: #ca8a04, #f59e0b */
  --danger-bg:  #fef2f2;  --danger:  #dc2626;
  --info-bg:    #eff6ff;  --info:    #2563eb;
  --violet-bg:  #f5f3ff;  --violet:  #7c3aed;
  --orange-bg:  #fff7ed;  --orange:  #ea580c;
  --cyan-bg:    #ecfeff;  --cyan:    #0891b2;
  --neutral-bg: #f1f5f9;  --neutral: #475569;
}
```

Gradients:

- Logo tile: `linear-gradient(135deg, #6FD3C4 0%, #3fa393 100%)` + shadow `0 4px 14px rgba(111,211,196,0.35)`
- Primary CTA: `linear-gradient(135deg, #3fa393 0%, #2f7d70 100%)` + glow `0 10px 22px -10px rgba(63,163,147,0.5)`
- Progress bars: `linear-gradient(90deg, #6FD3C4, #3fa393)`

## Stock status → badge colors

Demo mapping, translated to `StockStatus` enum values:

| Status | bg / fg |
|---|---|
| `IN_STOCK` (Available) | `--success-bg` / `--success` |
| `ON_HOLD` | `--warning-bg` / `--warning` |
| `ON_MEMO` | `--info-bg` / `--info` |
| Reserved (hold w/ customer) | `--violet-bg` / `--violet` |
| `SOLD` | `--neutral-bg` / `--neutral` |
| `RETURNED_TO_SUPPLIER` | `--danger-bg` / `--danger` |
| `IN_TRANSIT` (Transfer Pending) | `--orange-bg` / `--orange` |
| `IN_MANUFACTURING` / Under Inspection | `--cyan-bg` / `--cyan` |
| `CONSUMED`, `LOST` | `--neutral-bg` / `--neutral` (LOST may use danger) |

Badge spec: `padding 2–3px 8–9px; border-radius 6px; font-size 10px; font-weight 700; uppercase; white-space nowrap`.

## Shape & elevation

| Token | Value |
|---|---|
| Radius: card | 14px |
| Radius: button / tile / dropdown | 10–12px |
| Radius: input / select / small button | 7–9px |
| Radius: pill / dot | 99px |
| Shadow: card resting | `0 1px 3px rgba(15,23,42,0.04), 0 10px 24px -14px rgba(15,23,42,0.10), 0 22px 48px -30px rgba(63,163,147,0.22)` |
| Shadow: card hover | `0 4px 10px rgba(15,23,42,0.06), 0 22px 42px -16px rgba(63,163,147,0.28)` |
| Shadow: dropdown menu | `0 12px 32px rgba(15,23,42,0.14)` |
| Shadow: tooltip (dark) | `0 8px 20px rgba(15,23,42,0.22)` |

Note the signature: card shadows carry a faint **teal tint** (`rgba(63,163,147,…)`) — keep it, it's what makes surfaces feel branded.

## Layout constants

| Token | Value |
|---|---|
| Sidebar | fixed left, **272px**, white, border-right `--border` |
| Header | fixed, **60px**, `rgba(255,255,255,0.85)` + `backdrop-filter: blur(10px)`, border-bottom `--border` |
| Main | `margin-left 272px; padding 84px 24px 40px; max-width 1520px` |
| Grid | 12-column, `gap 16px`; stat rows `repeat(4, 1fr)` |
| Card padding | 16px (stat) / 22px (content) |
| Scrollbar | 6px, thumb `rgba(0,0,0,0.12)`, radius 10px |

## Motion

- Card hover: `translateY(-3px)` + shadow, `0.25s cubic-bezier(0.2, 0.8, 0.2, 1)`
- Color/background transitions: `0.15s ease`
- Nav item hover: `translateX(2px)`
- Keyframes available: `fadeUp` (6px rise-in), `pulseDot` (opacity blink for live dots), `pulseRing` (expanding ring on latest chart point)
- Respect `prefers-reduced-motion`: disable lifts and pulse animations.

## Charts (Recharts, themed)

- Line: `--primary`, 2.5px, round caps, subtle teal drop-shadow glow; smooth (monotone) curve.
- Area fill: vertical gradient `#6FD3C4` 45% → 14% → 0 opacity.
- Grid: dashed `#eef2f6` horizontal only; baseline `#e2e8f0`.
- Tooltip: dark `#0f172a` bg, white text, radius 9px; value 12.5/800, label + delta below (delta green `#4ade80` / red `#f87171`).
- Donut: track `--muted`, 10px stroke, rounded caps, 3-unit gaps; center KPI stacked (22/800 + 9/700 uppercase).
- Categorical series order: `#3fa393, #2563eb, #f59e0b, #cbd5e1` then extend with violet/cyan.
