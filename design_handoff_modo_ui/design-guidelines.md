# Modo — Design Guidelines

Two things get designed in this product: **the interface** (the editor chrome)
and **the output** (the templates and what the AI produces). They follow
opposite rules. The interface recedes; the output commits.

---

## Part 1 — The interface

### Principle

The canvas is the only thing that should have color. Everything around it is
near-black, low-contrast, and quiet, so the user's design is the brightest
object on screen. When in doubt, make the UI *less* visible.

Second principle: density over generosity. This is a tool people use for hours,
not a marketing page. Small type, tight spacing, no decorative whitespace.

### Color

All tokens live in `app/globals.css` under `@theme inline`. Use the token, never
a raw hex, in components.

**Surfaces** — elevation is a step up in lightness, not a shadow.

| Token | Value | Use |
| --- | --- | --- |
| `surface-0` | `#0c0c0c` | app background, canvas viewport |
| `surface-1` | `#141414` | panels, sidebars, topbar |
| `surface-2` | `#1a1a1a` | popovers, menus, cards, inputs |
| `surface-3` | `#222222` | hover state, controls inside a panel |
| `surface-4` | `#2a2a2a` | active/pressed, hover on `surface-3` |

**Borders** — always white at low alpha, never a lighter gray.
`border-subtle #ffffff08` separates structure (panel edges), `border-default
#ffffff12` outlines floating surfaces and inputs, `border-strong #ffffff20` is
focus and selection.

**Text** — four steps, and most UI text is *not* primary.

| Token | Value | Use |
| --- | --- | --- |
| `text-primary` | `#e8e8e8` | values, active labels, headings |
| `text-secondary` | `#9a9a9a` | labels, inactive controls |
| `text-tertiary` | `#757575` | metadata, units |
| `text-ghost` | `#636363` | section captions, hints, empty states |

Note `#e8e8e8`, not `#fff` — pure white on near-black is harsh over a long session.

**Accent** — `accent-green #34d399` is the only accent that carries meaning:
selection, active tool, primary action, success, brand. Use it sparingly; it
loses its job the moment two unrelated things are green. `accent-green-hover
#6ee7b7` for hover on green surfaces, `bg-accent-green/10` for a tinted active
row. `accent-pink` and `accent-blue` exist for categorical accents only (chart-
or tag-like distinctions), never for state.

### Typography

- **Body / UI:** Inter Tight (`--font-body`). **Display:** DM Sans
  (`--font-display`) — headings in auth and dashboard only.
- The editor's default size is **`text-[11px]`**. `text-xs` (12px) for panel
  content and buttons, `text-sm` for dashboard/auth body, `text-[10px]` for
  micro-labels. Anything larger belongs to the marketing surfaces, not the tool.
- Weight carries hierarchy, not size: `font-medium` for active/selected,
  `font-normal` otherwise. Avoid bold in the chrome.
- Uppercase + `tracking-wide` at 10px is the section-caption style in panels.
- Numeric readouts (zoom, coordinates, sizes) use `tabular-nums` so they don't
  jitter while dragging.

### Layout and dimensions

These are fixed; don't invent new widths.

| Region | Size |
| --- | --- |
| Tool rail (`left-sidebar`) | `52px` |
| Contextual left panel | `260px` |
| Right properties panel | `260px` |
| Dropdown / popover | `min-w-[220px]` |
| Modal | `360–460px` |

Spacing is a 4px scale (`gap-1` … `gap-4`); panels use `p-4`, list rows `px-2 py-1.5`.

**Radius:** `rounded-md` (6px) for controls and inputs, `rounded-lg` (8px) for
popovers, cards, and modals, `rounded-full` for pills, avatars, and swatches.
`rounded-xl` only on large surfaces. Nothing is square, nothing is a pill unless
it's genuinely round.

**Depth:** floating surfaces get `border-border-default` + `shadow-2xl`. Panels
docked to an edge get a border and no shadow.

### Components

- **Icon buttons** — 18px icon in a `rounded-md` hit area, `text-text-secondary`
  at rest → `text-text-primary` + `bg-surface-3` on hover, `text-accent-green` +
  `bg-surface-3` when active. Every icon-only control needs a tooltip.
- **Icons** — inline SVG in `icons.tsx`, `24×24` viewBox, `fill="none"`,
  `stroke="currentColor"`, `strokeWidth="1.5"`, round caps and joins. Never mix
  in an icon library; add to the file and match the stroke.
- **Primary button** — `bg-accent-green` with near-black text. One per view.
- **Inputs** — `bg-surface-2`, `border-border-default`, focus moves the border to
  `border-strong`. No focus ring glow.
- **Empty states** — one `text-text-ghost` line and, where useful, a single
  action. No illustrations.
- **Toasts** — bottom, `surface-2`, auto-dismiss, one line. Use for confirmations
  and recoverable errors; never for anything the user must act on.

### Motion

Everything uses the same easing: `cubic-bezier(0.16, 1, 0.3, 1)` — fast out,
soft settle. Named animations in `globals.css`: `fade-in` (0.4s, panels),
`scale-in` (0.5s, popovers and modals), `canvas-appear` (0.7s, first paint of a
document), `toast-in` (0.28s).

Hover and state changes use `transition-colors` (or `transition-all`) at the
default duration. Never animate the canvas during a drag or transform — the
interaction must feel direct.

### Gotcha: fixed-position popovers

A `position: fixed` element inside a container that has a `transform` positions
against that container, not the viewport — which is how a color picker ends up
in the wrong place inside a panel. Portal floating UI to `document.body`
(`createPortal`, as in `color-picker.tsx`) and compute coordinates from the
trigger's `getBoundingClientRect()`.

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

**Commit to a palette.** Preserve color *roles* (whatever sits behind stays the
background; foregrounds stay legible) but not the key — inverting light and dark
as a set, going to a deep near-black, or a tight duotone are all better than
tinting the original. Avoid muddy mid-tones and low-contrast pairings.

**Gradients are depth, not decoration.** 2–3 stops, close in hue. A dark ground
with a subtly lighter corner reads as premium; a rainbow reads as a template.
Stay flat when the design is typographic.

**Type pairing is structural.** If a template pairs a display serif with a sans
body, a variation keeps that relationship. Only the 14 bundled families are
available (`app/lib/font-catalog.ts`) — they're the offline guarantee.

**Geometry is never regenerated.** Layouts are authored by hand in the template
file. Generation replaces content, color, type, and scale within a fixed
skeleton, and `text-fit.ts` shrinks anything that still overflows. A weak
generation should look like a plain template, never like a broken one.
