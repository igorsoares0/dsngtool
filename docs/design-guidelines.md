# Modo — Design Guidelines

Two things get designed in this product: **the interface** (the editor chrome)
and **the output** (the templates and what the AI produces). They follow
opposite rules. The interface recedes; the output commits.

---

## Part 1 — The interface

### Principle

The canvas is the only thing that should have colour. Everything around it is
quiet and low-contrast, so the user's design is the brightest object on screen.
When in doubt, make the UI *less* visible.

Second principle: density over generosity. This is a tool people use for hours,
not a marketing page. Small type, tight spacing, no decorative whitespace.

The direction is **Daylight / Íris**: a warm-paper light theme paired with a
neutral dark one, and a single iris accent that carries meaning.

### How theming works — read this before touching `globals.css`

Tailwind v4's `@theme inline` **resolves a token's value at build time and
inlines it into the utility**. So this is a trap:

```css
/* WRONG — bg-accent compiles to `background-color: #5b5bd6`, a literal.
   The .dark block can never reach it, and dark mode silently does nothing. */
@theme inline { --color-accent: #5b5bd6; }
.dark { --color-accent: #8b8bf5; }
```

The working pattern, and the one `app/globals.css` uses, is one level of
indirection:

```css
:root { --accent: #5b5bd6; }
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

**Surfaces** — elevation is a step in lightness, never a shadow.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `surface-0` | `#eceae5` | `#0e0e10` | app background, canvas viewport |
| `surface-1` | `#f7f6f3` | `#161619` | topbar, rail, docked panels |
| `surface-2` | `#ffffff` | `#1c1c20` | panel content, popovers, modals, floating toolbars |
| `surface-3` | `#f4f2ee` | `#141417` | inputs and controls inside a panel |
| `surface-4` | `#eeece7` | `#26262b` | hover / pressed |

Note that in light, `surface-3` is *darker* than `surface-2` — an input sinks
into the white card. In dark it also sinks, which is the opposite of instinct.

**Borders** — black alphas in light, white alphas in dark.
`border-subtle` separates structure, `border-default` outlines floating
surfaces and inputs, `border-strong` is input hover. Focus and selection do
**not** use `border-strong` — they use the accent.

**Text** — four steps, and most UI text is *not* primary.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `text-primary` | `#1b1a18` | `#ededf0` | values, active labels, headings |
| `text-secondary` | `#6b6862` | `#9a9aa3` | labels, inactive controls |
| `text-tertiary` | `#8b877f` | `#7d7d86` | metadata, units |
| `text-ghost` | `#a5a09a` | `#5c5c65` | section captions, hints, empty states |

Neither pure black nor pure white — `#1b1a18` and `#ededf0` are deliberate.

**Accent — iris.** `accent` (`#5b5bd6` light / `#8b8bf5` dark) is the only
accent that carries meaning: selection, active tool, primary action, focus. Use
it sparingly; it loses its job the moment two unrelated things are iris.
`accent-hover` for hover on accent surfaces, `accent-tint` + `accent-tint-fg`
for a tinted chip or secondary button, `accent-fg` for text *on* the accent.

**Never `text-surface-0` on an accent surface** — that reads as near-white in
light mode. It is always `text-accent-fg`.

**Categorical, non-state:** `danger` / `danger-tint` (destructive, errors),
`success` (saved, confirmations), `warning`. Success is not the accent —
"saved" is information, not action. There is no raw `red-400` / `amber-400`
anywhere; use the tokens.

### Typography

- **Body / UI / display:** Instrument Sans (`--font-body`, `--font-display`).
- **Mono:** Geist Mono (`--font-mono`) — every numeric readout, always with
  `tabular-nums` so values don't jitter while dragging.
- These are the *chrome* fonts, loaded in `app/layout.tsx`. They are separate
  from the 14 **document** fonts in `app/lib/fonts.ts`, which keep their own
  `--font-*-design` variables. Don't cross the streams: changing the UI fonts
  must not touch `resolveFontFamily()` or `FONT_VARIABLES`.

Scale (medium density):

| Name | Size | Weight | Use |
| --- | --- | --- | --- |
| micro | 10px | 500 | section legends, UPPERCASE, `tracking-[0.1em]` |
| ui | 11.5px | 400/500 | the editor default: labels, buttons, list rows |
| ui-lg | 12.5px | 600 | panel titles, project name |
| body | 13px | 400 | dashboard and auth |
| title | 16px / 20px | 600 | dashboard and modal headings |

Weight carries hierarchy: 500 = active/selected, 400 = everything else. No bold
in the chrome.

### Layout and dimensions

These are fixed; don't invent new widths.

| Region | Size |
| --- | --- |
| Tool rail (`left-sidebar`) | `56px` |
| Contextual left panel | `252px` |
| Right properties panel | `266px` |
| Topbar | `52px` |
| Dropdown / popover | `min-w-[220px]` |
| Modal | `400–460px` |

Spacing is a 4px scale; panels use `p-[14px]`, list rows `px-2 py-1.5`. Hit
targets: 38px in the rail, 26–28px in the topbar, 22–26px inside a panel.

**Radius** is remapped globally, so plain Tailwind utilities already carry it:
`rounded-sm` 6px (segments in a group), `rounded-md` 8px (inputs, buttons,
rows), `rounded-lg` 11px (popovers, cards, floating toolbars, modals),
`rounded-xl` 14px (large surfaces), `rounded-full` for swatches, avatars, the
AI bar, and chips. Nothing is square; nothing is a pill unless it is genuinely
round.

**Depth:** floating surfaces get `border-border-default` + `shadow-pop`
(or `shadow-modal` for dialogs). Panels docked to an edge get a border and
**no** shadow. `shadow-raise` is for cards and the raised item in a segmented
control.

**Responsive:** below `xl` (1280px) the contextual panel becomes an overlay over
the canvas; below `lg` (1024px) the properties panel becomes a bottom sheet, and
the zoom pill and AI bar shift up to clear it. The rail and topbar never
collapse.

### Components

Three shared primitives live in `app/components/ui/`, and new UI should reach
for them before hand-rolling:

- **`Modal`** — the one dialog shell (scrim, Escape, focus restore, header,
  optional footer). Its `width` prop takes a `max-w-*`, not a `w-*`.
- **`IconButton`** — the rest/hover/active/focus/disabled matrix plus the
  tooltip. Every icon-only control needs one.
- **`Segmented`** — recessed track, active item raised out of it.

Beyond those:

- **Icons** — inline SVG in `icons.tsx`, `24×24` viewBox, `fill="none"`,
  `stroke="currentColor"`, `strokeWidth="1.5"`, round caps and joins. Never add
  an icon library; add to the file and match the stroke.
- **Primary button** — `bg-accent` + `text-accent-fg`. One per view. In the
  editor that is Export.
- **Inputs** — `surface-3`, `border-border-default`; focus moves the border to
  `1.5px accent`. No glow. Focus rings elsewhere are
  `focus-visible:ring-2 ring-accent`.
- **Empty states** — one `text-ghost` line and at most one action. No
  illustrations.
- **Toasts** — bottom-centre, `surface-2`, auto-dismiss, one line. Confirmations
  and recoverable errors only; never something the user must act on. `<Toaster />`
  has to be mounted per route tree — the editor and the dashboard each mount one.

### The canvas is not CSS

Konva draws to a canvas and cannot read Tailwind classes or CSS variables. The
selection frame, transform handles, marquee, snap guides and artboard shadow
come from `app/lib/theme-colors.ts`, keyed by the resolved theme and driven by
zustand so a theme flip re-renders them. Those values are duplicated from
`globals.css` on purpose — keep the two in step.

The document itself never follows the chrome theme. A user's white artboard
stays white in dark mode.

### Motion

One easing for everything: `--ease-standard`, `cubic-bezier(0.16, 1, 0.3, 1)` —
fast out, soft settle. Named animations in `globals.css`: `fade-in` (0.4s,
panels), `scale-in` (0.5s, popovers, modals, the selection toolbar),
`canvas-appear` (0.7s, first paint of a document), `toast-in` (0.28s). All of
them are disabled under `prefers-reduced-motion`.

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
body, a variation keeps that relationship. Only the 14 bundled families are
available (`app/lib/font-catalog.ts`) — they're the offline guarantee.

**Geometry is never regenerated.** Layouts are authored by hand in the template
file. Generation replaces content, colour, type, and scale within a fixed
skeleton, and `text-fit.ts` shrinks anything that still overflows. A weak
generation should look like a plain template, never like a broken one.
