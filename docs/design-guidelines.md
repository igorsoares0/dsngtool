# Modo — Design Guidelines

Two things get designed in this product: **the interface** (the editor chrome)
and **the output** (the templates and what the AI produces). They follow
opposite rules. The interface recedes; the output commits.

---

## Part 1 — The interface

### Principle

The canvas is the only thing that should carry the user's colour. The chrome
is **print shop + console**: warm paper, ink hairlines, square corners, crop
marks, a dense inspector with mono readouts — plus a little atelier warmth
(a colour per tool, the AI brief, the page strip). It is a working surface,
not a marketing page: density over generosity, structure by rules rather than
by boxes and shadows.

The direction is **"H / Final"** (handoff in `docs/design_handoff_modo_redesign/`,
which supersedes Daylight/Íris). Colour in the chrome is reserved and each hue
has exactly one job — see Colour below.

### How theming works — read this before touching `globals.css`

Tailwind v4's `@theme inline` **resolves a token's value at build time and
inlines it into the utility**. So this is a trap:

```css
/* WRONG — bg-accent compiles to `background-color: #ff4a1c`, a literal.
   The .dark block can never reach it, and dark mode silently does nothing. */
@theme inline { --color-accent: #ff4a1c; }
.dark { --color-accent: #8b8bf5; }
```

The working pattern, and the one `app/globals.css` uses, is one level of
indirection:

```css
:root { --accent: #ff4a1c; }
.dark { --accent: #8b8bf5; }
@theme inline { --color-accent: var(--accent); }   /* → background-color: var(--accent) */
```

Consequences to keep in mind:

- **Raw vars live in `:root` / `.dark` and carry no `--color-` prefix.** Only the
  `@theme inline` block uses that namespace, and every entry in it must be a
  `var(--raw)` reference, never a literal.
- **`@theme inline` emits nothing to `:root`.** Any value hand-written CSS also
  needs (`--ease-standard`, `--canvas-dot`) must be declared in `:root` too.
- `@custom-variant dark (&:is(.dark *))` is what makes `dark:` variants work at
  all — Tailwind v4 has no class-based dark variant built in.
- Alpha modifiers still theme correctly: `bg-accent/10` compiles to a
  `color-mix()` over `var(--accent)`.

The applied theme is a `.dark` class on `<html>`, set before first paint by an
inline script in `app/layout.tsx` and thereafter by `app/store/theme-store.ts`
(preference persisted to `localStorage["modo-theme"]`, default `system`).

### Colour

All tokens live in `app/globals.css`. Use the token, never a raw hex, in
components.

**Surfaces** — warm paper; elevation is a step in lightness.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `surface-0` | `#f2efe8` | `#121211` | app background, canvas viewport |
| `surface-1` | `#faf8f3` | `#1a1a18` | topbar, rail, docked panels, status bar |
| `surface-2` | `#fffdf8` | `#1f1f1d` | popovers, modals |
| `surface-3` | `#efebe2` | `#242422` | inputs and controls inside a panel, hover |
| `surface-4` | `#e7e2d7` | `#2c2c29` | pressed |
| `surface-inverse` | `#161513` | `#eeebe3` | selection toolbar, toasts, active tool / segment fill |

`text-inverse` is the text on `surface-inverse`.

**Rules.** `border-subtle` / `border-default` are hairlines (ink alphas).
`border-strong` is **solid ink** — the rule under search fields, page titles,
card captions and table headers.

**Text** — `text-primary` (ink), `text-secondary`, `text-tertiary` (≥4.5:1 on
surface-0/1; metadata, units, mono captions), `text-ghost` (placeholders and
disabled only).

**Each hue has one job:**

| Token | Job — and nothing else |
| --- | --- |
| `accent` (riso red `#ff4a1c`) | primary CTAs (Export, + New design, Go Pro, auth submit) and the 2px underline under an active **text tab**; the "." in the wordmark; the mono section codes (A/B/C) |
| `selection` / `selection-tint` (cobalt) | selection frame and handles, the dimension badge, selected layer row, selected template / page / swatch ring, **every focus ring** |
| `ai` (butter) | AI only: BRIEF tag, brief card tag, quota pips, the generating progress line |
| `tool-*` / `tool-*-fg` | the 34×34 tool tiles in the rail (and the inspector's "selected" tile). Light: pastel tile + ink icon; dark: neutral tile + coloured icon |
| `danger` / `danger-tint` / `danger-on-inverse` | destructive actions, errors; the trash icon on the ink toolbar |
| `success`, `warning` | saved / synced / done; storage 80–99% |

**Active state is never a colour.** An active tool is an inset 3px ink bar on
its left edge (`shadow-[inset_3px_0_0_var(--text-primary)]`) plus weight 700;
an active segment or icon toggle is an ink fill (`surface-inverse`); an active
tab in a tab bar is a 2px ink underline (`shadow-[inset_0_-2px_0_…]`).

**Never `text-white` on `bg-danger`** — dark-mode danger is a light pink. Use
`text-surface-1`.

### Typography

- **Chrome:** Archivo, variable with the `wdth` axis (`--font-body`,
  `--font-display`). `.font-expanded` (stretch 118%) for panel titles and
  primary buttons, `.font-wide` (125%) for the wordmark, page titles and the
  BRIEF tag.
- **Mono:** IBM Plex Mono (`--font-mono`) for every readout, dimension,
  shortcut, section code and UPPERCASE meta — with `tabular-nums` on numbers.
  **Never below 10.5px.**
- These are loaded in `app/layout.tsx` and are separate from the **document**
  fonts in `app/lib/fonts.ts` (which keep their own `--font-*` variables —
  `--font-archivo-black` is a document font, not the chrome's Archivo).

| Use | Font | Size / weight | Extras |
| --- | --- | --- | --- |
| Wordmark "mo." / "modo." | Archivo | 15–22px / 900 | wide, tracking −0.02em, "." in accent |
| Page title (Projects, Account) | Archivo | 72–88px / 900 | wide, tracking −0.04em, leading .82, mono accent count |
| Auth headline | Archivo | 44px / 900 | stretch 122%, tracking −0.03em |
| Panel title | Archivo | 21px / 800 | expanded |
| Primary button | Archivo | 13–14px / 800 | expanded, UPPERCASE, tracking .02em |
| Body / controls | Archivo | 12.5–14px / 400–600 | |
| Section label | Archivo | 11px / 800 | tracking .08em, UPPERCASE, after a mono accent code — use `<SectionLabel>` |
| Readouts, meta | IBM Plex Mono | 10.5–12px / 400–500 | UPPERCASE for meta |

### Layout and dimensions

These are fixed; don't invent new widths.

| Region | Size |
| --- | --- |
| Topbar (editor and dashboard) | `48px`, full-height cells split by 1px rules — no pill groups |
| Tool rail (`left-sidebar`) | `68px`, six `66px` rows, `34×34` tiles |
| Contextual left panel | `288px` |
| Right panel (Inspect / Layers) | `288px` |
| AI brief bar (under the canvas) | `40px` |
| Page strip | `80px`, `52px` thumbnails |
| Status bar | `26px`, mono 10.5px, `lg` and up |
| Number field | `28px` tall, `26px` scrub-label cell |

The page stack's vertical gap (`PAGE_GAP`) is **screen pixels**, constant
across zoom, so the page label and crop marks always fit between pages.

**Radius:** `rounded-sm/md/lg/xl` all resolve to 0 — the chrome is square on
purpose. Exceptions: `rounded-float` (4px) on floating surfaces (selection
toolbar, toasts, menus, popovers) and `rounded-full` on the avatar, colour
swatches and the status dot. No arbitrary `rounded-[Npx]`.

**Depth:** structure is drawn with hairlines. Floating surfaces get
`shadow-pop` (dialogs `shadow-modal`); docked panels get a border and no
shadow. `shadow-raise` is `none`.

**Responsive:** below `xl` the contextual panel is an overlay over the canvas;
below `lg` the right panel is a 45vh bottom sheet — the centre column pads its
bottom by the same 45vh so the brief bar and page strip sit above it — and the
status bar is hidden.

### Components

Shared primitives in `app/components/ui/`:

- **`Modal`** — the one dialog shell. Its `width` prop takes a `max-w-*`.
- **`IconButton`** — rest/hover/active/focus/disabled matrix plus tooltip.
  `active` is an ink fill, never the accent.
- **`Segmented`** — hairline-ruled square cells, active cell ink-filled.
- **`SectionLabel`** — "A  GEOMETRY".
- **`buttons.ts`** — `btnPrimary` / `btnSecondary`, the two button recipes.

| Component | Hover | Pressed | Focus | Disabled |
| --- | --- | --- | --- | --- |
| Primary | `accent-hover` | + `inset 0 2px 0 rgb(0 0 0/.25)` | 2px `selection` outline, offset 2px | `surface-3`, tertiary text |
| Secondary | ink border + `surface-3` | ink fill | same | dashed border |
| Number field | label shows ↔ | `selection-tint` + `selection` ring | 1.5px `selection` ring | — |

Beyond those:

- **Icons** — inline SVG in `icons.tsx`, 24×24 viewBox, stroke `currentColor`
  1.5–1.6. Never add an icon library.
- **Inputs** — `surface-3` (panels) or `surface-0` (auth), no border; focus is
  an inset 1.5px `selection` ring, error an inset 1.5px `danger` ring plus a
  mono hint under the field ("MIN 1", "AT LEAST 8 CHARACTERS"). Search fields
  are an ink underline with a `/` hint.
- **Text tabs** (template formats, dashboard filters) — active is bold with a
  2px accent underline, offset 4–6px, with mono counts.
- **Swatches** — 30px circles from the document's own palette
  (`lib/doc-palette.ts`), "FROM THIS DESIGN", then a dashed "+" picker.
- **Empty states** — one line, mono UPPERCASE when it is meta, at most one
  action. No illustrations. Loading uses `.skeleton` at real aspect ratios.
- **Toasts** — bottom-right, `surface-inverse`, `rounded-float`, 4px colour
  bar (success / warning / danger / tertiary), title + optional mono `sub`,
  one action, 5s. `<Toaster />` is mounted per route tree (editor, dashboard).
- **Storage meter** — discrete bars (`SegmentBars`): ink under 80%,
  `warning` + "N MB LEFT" at 80–99%, `danger` + a "Storage full" block at 100%.
- **AI bar states** — idle · typing (GENERATE ⏎) · generating (indeterminate
  `ai` line, CANCEL / Esc) · done (✓ DONE, UNDO) · limit (0 LEFT, GO PRO).

### The canvas is not CSS

Konva draws to a canvas and cannot read Tailwind classes or CSS variables. The
selection frame, transform handles, marquee, snap guides and artboard shadow
come from `app/lib/theme-colors.ts` (selection = cobalt, square 8px white
anchors), keyed by the resolved theme and driven by
zustand so a theme flip re-renders them. Those values are duplicated from
`globals.css` on purpose — keep the two in step.

The document itself never follows the chrome theme. A user's white artboard
stays white in dark mode.

### Motion

One easing for everything: `--ease-standard`, `cubic-bezier(0.16, 1, 0.3, 1)` —
fast out, soft settle. Named animations in `globals.css`: `panel-in` (150ms
fade, panel / inspector switch), `fade-in`, `scale-in` (popovers, modals, the
selection toolbar), `canvas-appear`, `toast-in`, `ai-progress` (indeterminate
— the generate request is one round trip, so there is no real % to show) and
the `.skeleton` shimmer (1.2s). All are disabled under
`prefers-reduced-motion`.

Hover and state changes use `transition-colors duration-150 ease-standard` —
not `transition-all`, which animates layout properties for no reason. Never
animate the canvas during a drag or transform; the interaction must feel direct.

### Gotcha: fixed-position popovers

A `position: fixed` element inside a container that has a `transform` positions
against that container, not the viewport — which is how a colour picker ends up
in the wrong place inside a panel. Portal floating UI to `document.body`
(`createPortal`, as in `color-picker.tsx`) and compute coordinates from the
trigger's `getBoundingClientRect()`.

Related: the selection toolbar positions itself with computed `left`/`top`, not
a CSS transform, because its entrance animation animates `transform` and would
otherwise clobber the centring and the vertical flip.

---

## Part 2 — The output (templates and AI designs)

The rules invert here. A safe, evenly-weighted, mid-tone design is a failure
even though nothing about it is wrong. These principles are enforced in the AI
system prompt (`app/api/ai/generate/route.ts`) and should also govern any
template added to `app/data/templates.ts`.

**One focal point.** Exactly one element dominates. Hierarchy comes from the
*gap* between the largest and the rest — pushing everything up achieves nothing.
The per-slot `scales` dial (0.8–1.6) exists for this.

**Short copy.** A three-word headline can be set twice as large as a seven-word
one. Every slot has a hard `maxChars` budget; the layout cannot grow. Headlines
are headlines, not sentences. No emoji, no hashtags, no wrapping quotes.

**Commit to a palette.** Preserve colour *roles* (whatever sits behind stays the
background; foregrounds stay legible) but not the key — inverting light and dark
as a set, going to a deep near-black, or a tight duotone are all better than
tinting the original. Avoid muddy mid-tones and low-contrast pairings.

**Gradients are depth, not decoration.** 2–3 stops, close in hue. A dark ground
with a subtly lighter corner reads as premium; a rainbow reads as a template.
Stay flat when the design is typographic.

**Type pairing is structural.** If a template pairs a display serif with a sans
body, a variation keeps that relationship. Only the 28 bundled families are
available (`app/lib/font-catalog.ts`).

**Geometry is never regenerated.** Layouts are authored by hand in the template
file. Generation replaces content, colour, type, and scale within a fixed
skeleton, and `text-fit.ts` shrinks anything that still overflows. A weak
generation should look like a plain template, never like a broken one.
