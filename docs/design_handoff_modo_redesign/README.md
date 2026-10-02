# Handoff: Modo redesign ("H / Final")

## Overview
A visual redesign of the Modo editor (`igorsoares0/dsngtool`) and its surrounding screens. The goal is to drop the generic "AI-made SaaS" look: no more rounded everything, Instrument Sans or symmetric layouts. In its place is a print-shop identity (paper, ink, hairline rules, square corners, crop marks), combined with console precision (dense inspector, status bar, mono readouts) and atelier warmth (colour per tool, AI brief, page strip).

Structure stays close to the current app. This is a **re-skin plus layout adjustments**, not a new information architecture.

## About the design files
The `.dc.html` files in this bundle are **design references built in HTML**. They show the intended look and behaviour and are not production code. Recreate them in the existing Next.js 15 / React / Tailwind v4 codebase, using its components (`app/components/editor/*`, `app/components/ui/*`) and patterns. Open them in a browser: they need `support.js` next to them.

## Fidelity
**High-fidelity.** Colours, type, spacing and states are final. Recreate them pixel-accurately with the tokens in `globals.css`.

## Step 1: tokens and fonts
1. Replace `app/globals.css` with `globals.css` from this folder. Existing token names are kept, so most utilities keep working. New tokens: `surface-inverse`, `text-inverse`, `selection*`, `ai*`, `danger-on-inverse`, `tool-*`, `radius-float`.
2. **All `rounded-sm/md/lg/xl` now resolve to 0.** That is intentional. Then:
   - Use `rounded-float` (4px) on floating surfaces: the selection toolbar, toasts and menus.
   - Keep `rounded-full` only on the avatar, colour swatches and the status dot.
3. **Re-route the accent.** Iris used to mean "selection + active + primary + focus". Now:
   - `accent` (red) is used only for primary CTAs and the underline under an active text tab.
   - `selection` (cobalt) covers selection boxes and handles, the dimension badge, the selected layer row, the selected template/upload outline and focus rings.
   - `ai` (butter) is used only for AI.
   - The active tool is shown as an ink bar of 3px on its left edge. It never uses an accent colour.
   - Grep for `bg-accent`, `text-accent`, `ring-accent`, `border-accent` and `accent-tint` and reassign each one.
4. Fonts in `app/layout.tsx`:
```ts
import { Archivo, IBM_Plex_Mono } from "next/font/google";
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin","latin-ext"], axes: ["wdth"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400","500"] });
// className={`${archivo.variable} ${plexMono.variable} ${FONT_VARIABLES} h-full`}
// viewport.themeColor: light #f2efe8, dark #121211
```
Document fonts in `lib/fonts.ts` are untouched.

## Type scale
| Use | Font | Size / weight | Extras |
|---|---|---|---|
| Logo "mo." / "modo." | Archivo | 15–19px / 900 | stretch 125%, tracking −0.02em, "." in `accent` |
| Page title (dashboard "Projects", Account) | Archivo | 72–88px / 900 | stretch 125%, tracking −0.04em, line-height .82; count in mono `accent` superscript |
| Panel title ("Templates") | Archivo | 21px / 800 | stretch 118% |
| Primary button | Archivo | 13px / 800 | stretch 112%, UPPERCASE, tracking .02em |
| Body / controls | Archivo | 13–14px / 400–600 | |
| Section label ("GEOMETRY") | Archivo | 11px / 800 | tracking .08em, preceded by mono code A/B/C/D in `accent` |
| Readouts, dimensions, shortcuts, meta | IBM Plex Mono | 10.5–12px / 400–500 | UPPERCASE for meta. Never below 10.5px |

## Screens

### Editor (`Modo Redesign H - Final.dc.html`, 1440×900)
Layout, top to bottom: topbar (48px), body (flex), status bar (26px).

**Topbar** (`topbar.tsx`): `surface-1`, bottom border `border-default`. The segments are separated by 1px vertical rules and sit on the full height, with no pill groups. In order:
1. Logo cell, 64px wide.
2. `Nº 014` (mono, tertiary) + project name (14px/600) + "saved" (mono 11px `success` with a 6px dot).
3. Size picker (mono 12px, a 11px square glyph, chevron).
4. Tools: select (active = `surface-inverse` 32×30 fill) | hand | undo | redo.
5. Flex spacer.
6. File | "Try Pro" + mono `$10` chip with a 1px ink border.
7. Export: `accent` button, 32px tall, padding 0 16px.
8. Avatar cell: 28px circle in `surface-3` with a hairline ring and mono initials.

**Left column** (`left-sidebar.tsx` + `left-panel.tsx`): 356px total, `surface-1`.
- **Tool rail, 68px.** The six tools are **stacked vertically**, 66px rows with a hairline between them.
  - Each row holds a 34×34 square tile filled with `bg-tool-<name>` and its icon in `text-tool-<name>-fg`, at 17px with stroke 1.6, plus a 10.5px label.
  - Active row: `box-shadow: inset 3px 0 0 var(--text-primary)` and the label at weight 700.
  - Hover: `surface-3` background.
  - The rail replaces the current 56px icon sidebar.
- **Panel, 288px.** Templates panel:
  - Title row: "Templates" with a mono count "53".
  - Search: an underline field (1px `border-strong` bottom, no box) with placeholder "Search by name or mood" and a mono `/` hint.
  - Text tabs: All / Post / Story / Promo. The active tab gets a 2px `accent` underline, offset 4px.
  - Grid: 3 columns, gap 12px vertical and 8px horizontal. Thumbnails use the real aspect ratio of each template (1, 9/16, 2/3). Below each one, the name (11px/600) and the ratio in mono (`1:1`).
  - Selected template: `0 0 0 2px var(--selection)`.

**Canvas** (`canvas-area.tsx`): `surface-0`, plain, with no dots and no rulers.
- Page label above the page: mono 10.5px tertiary, "01 — PAGE 1 · INSTAGRAM POST".
- **Crop marks**: 1px ink lines, 16px long, offset 10px outside each corner of the page.
- Page shadow: `shadow-canvas`.
- Selection: 1.5px `selection` border, with 8×8 white square handles bordered in `selection`. Below the selection, aligned right, the dimension badge: `selection` background, white mono 10px, reading "TEXT | 528 × 160".
- **Floating selection toolbar** (`selection-toolbar.tsx`):
  - Shape: `surface-inverse` fill, `text-inverse`, `rounded-float`, `shadow-pop`, 38px tall, 3px padding.
  - Contents: font picker (shows the font in its own face, on a `rgb(128 128 128 / .22)` chip) | size in mono | colour dot | divider | duplicate | layer order | lock | delete (icon in `danger-on-inverse`).

**Below the canvas:**
- **AI bar** (`ai-bar.tsx`), 40px, docked. It replaces the floating pill. Left to right:
  - a `BRIEF` tag (`ai` background, 12px/900, stretch 125%);
  - the prompt field, flex, 14px placeholder;
  - mono "1 OF 5";
  - mono "⌘K";
  - a 40×40 `surface-inverse` button with a send arrow.
- **Page strip**, 80px: 52px thumbnails. The current page has `0 0 0 2px surface-1, 0 0 0 3.5px selection`. A dashed "+ ADD" tile comes next. The zoom readout sits on the right (− 52% + FIT, mono). It replaces the per-page header controls in `page-controls.tsx`.

**Right panel** (`right-panel.tsx`), 288px:
- Tabs: Inspect | Layers 6, with a 2px ink underline on the active tab.
- Selected header: 32px `bg-tool-text` tile + "SELECTED · TEXT" (mono) + "“sonder”" (17px/700).
- Sections, each with a hairline separator and a coded label:
  - **A Geometry**: 2-column number fields, 28px tall, `surface-3`. A 26px mono label cell (X Y W H R O) with `cursor: ew-resize`, then the value, then the unit (PX / ° / %).
  - **B Type**: font card (44px "Aa" tile + name in its own face + "SERIF · CHANGE ▾"), SZ / LH fields, and a 7-cell segmented row (B I U Aa | align ×3). The active align cell is `surface-inverse`.
  - **C Color**: the hex in mono, 30px circular swatches built from the document palette (selected = 2px ring in `selection`), a dashed "+", and "FROM THIS DESIGN".
  - **D Shadow**: "+" to add.

**Status bar**, 26px, mono 10.5px tertiary: SAVED 12:04 · SYNCED | PAGE 1/1 | 6 LAYERS · 1 SELECTED | spacer | AI quota pips (5px bars: used = tertiary, left = `ai`) "4 LEFT" | ? SHORTCUTS.

### Dashboard (same file, 1440×900; `app/dashboard/page.tsx`)
- **Topbar**: logo, text tabs (active = 2px ink underline), spacer, storage meter (16 bars of 5×12px, used = ink) "184/250 MB", "Try Pro $10", avatar. The left nav is removed.
- **Header row**: "Projects" title with superscript "09". On the right, a 42px search field ("Search projects", ⌘K) and an `accent` "+ NEW DESIGN" button.
- **Start row**: a grid of `150 / 120 / 136 / 1fr`.
  - Three format cards, 132px tall, `surface-1` with a hairline: an outline glyph of the ratio, the name (15px/800) and the size in mono.
  - The fourth cell is the brief card: a BRIEF tag, an underline prompt field and a `surface-inverse` "Generate ⏎" button.
- **Filters**: text tabs with mono counts, a GRID|LIST segmented control and "RECENT ↓".
- **Projects**: real-ratio thumbnails, bottom-aligned in one row. Each has a 1px ink rule on top of its caption: mono `014` + name (12.5px/700) + mono time. The most recent project gets a 2px `accent` outline, offset 3px.

### Panels and states (`Modo H - Paineis e Estados.dc.html`)
Every left panel shares the frame described above. Copy to use:
- **Uploads**:
  - Dashed 1.5px drop zone, 120px: "Drop files or browse" + "PNG · JPG · SVG · UP TO 20 MB".
  - Storage line, All/Images/Logos tabs, then a 2-column grid.
  - Uploading: 3px ink bar on the bottom edge, mono %.
  - Failed: `danger-tint` fill, 1px `danger` border, "OVER 20 MB · RETRY".
- **Text**: three add rows (heading 21px/900 `T`, subheading 16px/600 `⇧T`, body 13px `⌥T`). Then "A Font pairings" (2×2 previews rendered in the actual fonts) and "B Fonts in this design" (rows with mono layer counts).
- **Shapes**: A Basic (3×3 tiles), B Lines, C Photo frames, and a tip that sits on `surface-3` with a 3px ink bar on its left edge.
- **Assets**: underline search, Icons/Stickers/Badges tabs, a 4-column icon grid, B Icon style (Line/Solid/Duo segmented) and a stroke slider. The slider thumb is a 12px square.
- **Overlays**: 2-column previews shown over the current page, the active one with a 2px `selection` ring and a mono "ON", plus an Intensity slider.
- **Layers**: 38px rows: caret, 20px type glyph, name, mono flag (HIDDEN / LOCKED / child count). Children are indented 30px. The selected row gets `selection-tint` and an inset 3px `selection` bar on its left edge. Hidden rows use tertiary text.

**Component states** (light and dark are both shown):

| Component | Hover | Pressed | Focus | Disabled |
|---|---|---|---|---|
| Primary | `accent-hover` | adds `inset 0 2px 0 rgb(0 0 0/.25)` | 2px `selection` outline, offset 2px | `surface-3` with tertiary text |
| Secondary | ink border + `surface-3` | inverse fill | 2px `selection` outline, offset 2px | dashed border |
| Number field | label shows ↔ | `selection-tint` + `selection` ring | 1.5px `selection` ring + caret | — |

Number field error: 1.5px `danger` ring + mono hint "MIN 1".

**AI bar states:**
- Idle: placeholder text and ⌘K.
- Typing: "GENERATE ⏎" button on an ink background.
- Generating: "Picked “Serenity” · writing the copy…", a 2px `ai` progress line along the bottom of the field, quota shows "USING 1", and a CANCEL button.
- Done: the tag turns `success` with "✓ DONE", and the button reads "UNDO ⌘Z".
- Limit: the tag reads "0 LEFT" on `surface-3`, quota "5 / 5" in `danger`, and an `accent` "GO PRO" button.

**Toasts**: bottom-right, auto-dismiss after 5s, `surface-inverse`, `rounded-float`, with a 4px colour bar on the left edge:
- `success`: "Exported sonder-post.png" + Open.
- `warning`: "Storage almost full" + Manage.
- `danger`: "Export failed · NOTHING WAS LOST" + Retry.
- tertiary: "Layer deleted" + Undo.

**Loading**: the `.skeleton` class keeps real thumbnail ratios. Shimmer runs 1.2s and is off under reduced motion.

**Empty dashboard**: "Projects 00", the line "Nothing here yet. Pick a format, or describe what you need.", the three format cards and the brief card ("5 FREE THIS MONTH").

**Storage meter**:
- Under 80%: ink bars.
- 80–99%: `warning` bars and the text "19 MB LEFT".
- 100%: `danger` bars, plus a "Storage full" block (`danger-tint`, 3px `danger` bar on its left edge) with "GO PRO · $10" and "Manage files".

### External screens (`Modo H - Telas Externas.dc.html`)
- **Landing** (1440 wide):
  - Nav with a full-height `accent` "START FREE" cell.
  - Hero split 1.1fr / 1fr: mono kicker; H1 "Posts that look made, not generated." at 104px/900, stretch 125%; an inline BRIEF try-it bar; "FREE · NO CARD · 5 AI BRIEFS A MONTH"; a rotated collage of real-template posts with a "FIG. 1" caption.
  - Three steps in ruled columns.
  - Pricing as a two-cell spec sheet (Free | Pro).
  - Footer with a 120px wordmark.
- **Login / signup**: collage on the left, 560px form on the right. Tabs (Create account / Log in), Google button, mono field labels, a focused field with a `selection` ring, an error field with a `danger` ring and "AT LEAST 8 CHARACTERS", and an `accent` "CREATE ACCOUNT" button.
- **Account**:
  - Side nav coded A–D.
  - "Account" title over an ink rule.
  - A Profile rows (NAME / EMAIL / PASSWORD / THEME as a segmented Light/Dark/System control).
  - B Plan card: storage and AI meters, "RESETS NOV 1", Go Pro.
  - Danger zone with a `danger` outlined "Delete…".

## Interactions and behaviour
- Clicking a tool switches the left panel. The rail stays visible, and clicking the active tool again collapses the panel down to the rail.
- ⌘K focuses the AI bar from anywhere. Enter generates and Esc cancels. A successful generation shows an Undo toast.
- Number fields scrub on horizontal drag of the label cell; ⇧ steps by 10.
- Keyboard shortcuts: ⌘E export, N new design (dashboard), / search, T / ⇧T / ⌥T add text, ⌘G group, ⌘L lock.
- Motion: the existing `--ease-standard`. Panel switch is a 150ms fade. Toasts use `toast-in`.

## State
Unchanged from the current store. New UI-only state:
- `activeTool`, now including a collapsed state;
- `aiStatus`: `idle | typing | generating | done | limit`, plus a step label and progress;
- `toasts[]`;
- `dashboardView`: `grid | list`.

## Assets
- Icons: the existing set in `app/components/editor/icons.tsx` (stroke 1.5–1.6).
- Template thumbnails: rendered from template data at their real ratio.
- Uploads in the mocks are neutral placeholders.
- No new image assets.

## Open copy to confirm
- Pro limits: "1 GB" and "100 AI briefs a month" are placeholders.
- "No watermark" on Pro is a placeholder.
- The landing headline.

## Files
- `globals.css`: drop-in replacement for `app/globals.css`.
- `Modo Redesign H - Final.dc.html`: editor and dashboard, light and dark.
- `Modo H - Paineis e Estados.dc.html`: the six panels, Layers and all states.
- `Modo H - Telas Externas.dc.html`: landing, login/signup, account.
- `support.js`: runtime needed to open the `.dc.html` files.
- `screenshots/`: zoomed-out overviews (editor-dashboard, paineis-estados, telas-externas). Open the `.dc.html` files for exact detail.
