# Modo — Landing Page Spec

> Spec version: 1.0 — June 2026  
> Reference copy: `docs/landing-copy.md`  
> Design system source: `app/globals.css` + `app/layout.tsx`

---

## 1. Design System

### 1.1 Cores

Todas as cores devem ser definidas como CSS custom properties e referenciadas por token — nunca hardcoded inline.

```css
/* Surfaces (dark-first) */
--color-surface-0: #0c0c0c;   /* page background */
--color-surface-1: #141414;   /* cards, modais */
--color-surface-2: #1a1a1a;   /* inputs, chips */
--color-surface-3: #222222;   /* hover de surface-2 */
--color-surface-4: #2a2a2a;   /* active/selected */

/* Bordas */
--color-border-subtle:  #ffffff08;
--color-border-default: #ffffff12;
--color-border-strong:  #ffffff20;

/* Texto */
--color-text-primary:   #e8e8e8;
--color-text-secondary: #9a9a9a;
--color-text-tertiary:  #757575;
--color-text-ghost:     #636363;

/* Accents */
--color-accent-green:       #34d399;   /* CTA primária, highlights */
--color-accent-green-hover: #6ee7b7;
--color-accent-pink:        #f472b6;   /* decorativo / badge */
--color-accent-blue:        #60a5fa;   /* decorativo */
```

**Seleção de texto:**
```css
::selection { background: #34d39940; color: #fff; }
```

---

### 1.2 Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Display / Headlines | **DM Sans** | H1, H2, H3, taglines, CTAs |
| Body / UI | **Inter Tight** | Parágrafos, listas, labels, badges |

Pesos disponíveis: 300, 400, 500, 600, 700.  
Carregar via `next/font/google` (já configurado no app).

**Escala tipográfica sugerida:**

| Token | Tamanho | Peso | Fonte | Uso |
|---|---|---|---|---|
| `display-xl` | 72–80px | 700 | DM Sans | Hero headline |
| `display-lg` | 48–56px | 700 | DM Sans | Section headline |
| `display-md` | 32–36px | 600 | DM Sans | Sub-section |
| `body-lg` | 18–20px | 400 | Inter Tight | Hero subhead, feature body |
| `body-md` | 16px | 400 | Inter Tight | Parágrafos gerais |
| `body-sm` | 14px | 400 | Inter Tight | Captions, labels |
| `label` | 11px | 600 | Inter Tight | Eyebrows, badges (uppercase + tracking-wider) |

---

### 1.3 Bordas & Cantos

- **Border radius padrão:** `8px` (`rounded-lg`)
- **Cards:** `rounded-2xl` (16px)
- **Botões:** `rounded-lg` (8px)
- **Badges/chips:** `rounded-full`
- **Bordas de card:** `1px solid var(--color-border-default)` — nunca mais visível que isso

---

### 1.4 Sombras

- **Cards floating:** `box-shadow: 0 24px 64px rgba(0,0,0,0.6)`
- **Dropdowns:** `shadow-2xl` (`0 25px 50px -12px rgba(0,0,0,0.25)`)
- **Glow do CTA:** `box-shadow: 0 0 32px rgba(52, 211, 153, 0.25)` no botão primário ao hover

---

### 1.5 Animações

Todos os keyframes usam a mesma easing: `cubic-bezier(0.16, 1, 0.3, 1)` (spring).

| Nome | Comportamento | Duração |
|---|---|---|
| `fade-in` | `opacity 0→1` + `translateY(4px→0)` | 0.4s |
| `scale-in` | `opacity 0→1` + `scale(0.96→1)` | 0.5s |
| `canvas-appear` | `opacity 0→1` + `scale(0.92→1)` | 0.7s |

Usar `IntersectionObserver` com threshold `0.15` para disparar `animate-fade-in` ao entrar na viewport. Elementos dentro de uma seção recebem `animation-delay` incremental de 80ms entre si.

---

### 1.6 Grid de fundo (canvas-grid)

Usado atrás do mock do editor e como textura de fundo do hero:

```css
background-image: radial-gradient(circle, #ffffff06 1px, transparent 1px);
background-size: 24px 24px;
```

---

## 2. Componentes Base

### Button — Primary (CTA)

```
bg: #34d399
color: #0c0c0c (surface-0)
font: DM Sans 600
size: px-6 py-3 text-sm
border-radius: 8px
hover: bg #6ee7b7 + glow (0 0 32px rgba(52,211,153,0.25))
transition: all 0.2s cubic-bezier(0.16,1,0.3,1)
```

### Button — Secondary / Ghost

```
bg: surface-2 (#1a1a1a)
border: 1px solid border-default (#ffffff12)
color: text-primary (#e8e8e8)
font: Inter Tight 500
size: px-5 py-2.5 text-sm
hover: bg surface-3 + border-strong
```

### Badge / Eyebrow

```
font: Inter Tight 600 uppercase tracking-wider 11px
color: accent-green
bg: rgba(52,211,153,0.08)
border: 1px solid rgba(52,211,153,0.15)
px-3 py-1 rounded-full
```

### Feature Card

```
bg: surface-1 (#141414)
border: 1px solid border-default
border-radius: 16px
padding: 28px 32px
hover: border-color → border-strong, bg → surface-2
transition: all 0.3s ease
```

---

## 3. Estrutura da Página

### 3.1 Navbar

**Comportamento:**
- `position: fixed`, `top: 0`, `z-index: 50`
- Background: `surface-0` com `backdrop-filter: blur(12px)` + `border-bottom: 1px solid border-subtle`
- Scroll > 20px: `bg-surface-1/90` (transição suave 300ms)

**Layout:** `max-w-6xl mx-auto px-6 h-14 flex items-center justify-between`

**Conteúdo:**
- Esquerda: Logo (SVG do `icons.tsx` app) + wordmark "Modo" em DM Sans 600
- Centro (desktop): links `Templates`, `Pricing`, `FAQ` — Inter Tight 500 14px, color text-secondary, hover text-primary
- Direita: botão ghost "Sign in" + botão primary "Start for free"

**Mobile:** hamburger menu, links em drawer lateral deslizando da direita.

---

### 3.2 Hero Section

**Layout:** `min-h-screen flex flex-col items-center justify-center text-center px-6`  
**Background:** `surface-0` + canvas-grid atrás, com vignette radial `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(52,211,153,0.06) 0%, transparent 70%)` — brilho verde suave saindo do topo.

**Conteúdo (top→bottom):**

1. **Badge / Eyebrow**  
   Texto: `"Browser-based design editor"`  
   Componente Badge com `accent-green`.

2. **Headline** — `display-xl`, DM Sans 700  
   `"Design that moves`  
   `as fast as you think."`  
   Quebra de linha intencional. A palavra **"fast"** recebe `color: accent-green`.

3. **Subheadline** — `body-lg`, Inter Tight 400, `text-secondary`, `max-w-xl mx-auto`  
   Texto da copy: *"Modo is the browser-based design editor built for creators who don't have time to learn complex software…"*

4. **CTA Buttons** — `flex gap-3 justify-center mt-8`
   - Primário: "Start designing for free"
   - Secundário ghost: "See templates →"

5. **Supporting line** — `body-sm`, `text-ghost`, `mt-3`  
   `"No download. No credit card. Your files stay yours — forever."`

6. **Hero Visual** — `mt-16`, `max-w-5xl mx-auto w-full`  
   Mock do editor em dark (screenshot ou componente estático). Apresenta com animação `canvas-appear` (0.7s). Borda: `1px solid border-default`, `border-radius: 12px`, `box-shadow: 0 40px 80px rgba(0,0,0,0.7)`.  
   Abaixo do mock (overlap): pill badges mostrando formatos — `"1080×1080"`, `"1080×1920"`, `"1000×1500"` — em `surface-2/border-default/text-secondary`.

---

### 3.3 Social Proof Bar

**Layout:** `border-y border-border-subtle py-6 bg-surface-1`  
**Conteúdo:** linha de texto `text-ghost text-sm` + separadores `·`:  
`Instagram Posts · Instagram Stories · Pinterest · Marketing Creatives · Promotional Banners`  
Em desktop: exibir em única linha centralizada. Em mobile: scroll horizontal suave (sem scrollbar visível).

---

### 3.4 Section 1 — Value Prop

**Layout:** `max-w-5xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center`

**Lado esquerdo:**
- Eyebrow: `"Why Modo"`
- Headline: `"Canva is powerful.`  
  `Modo is fast."` — DM Sans 700 `display-lg`
- Body: parágrafo completo da copy
- Link ghost: `"See all features →"` — `text-accent-green text-sm`

**Lado direito:**
- 3 feature pills empilhadas (icon 20px + texto):
  - `"No learning curve"` — ícone de raio
  - `"Your files stay local"` — ícone de lock
  - `"Works offline"` — ícone de wifi off
- Cada pill: `bg-surface-2 border border-border-default rounded-xl px-4 py-3 flex items-center gap-3`
- Icon: `color: accent-green`

---

### 3.5 Section 1B — Ownership Callout

**Layout:** `bg-surface-1 border-y border-border-subtle py-24`  
**Inner:** `max-w-3xl mx-auto px-6 text-center`

- Eyebrow: `"Local-first"`
- Headline: `"Your designs don't live`  
  `in someone else's cloud."` — DM Sans 700 `display-lg`
- Body: parágrafos da copy (divididos em 2 blocos com espaço entre)
- Blockquote:  
  ```
  border-left: 2px solid accent-green
  padding-left: 20px
  font-style: italic
  color: text-secondary
  margin-top: 32px
  ```
  Texto: *"Your work belongs to you — not to our servers."*

---

### 3.6 Section 2 — Features Grid

**Layout:** `max-w-6xl mx-auto px-6 py-24`

**Header:**
- Eyebrow: `"Features"`
- Headline: `"Everything you need.`  
  `Nothing you don't."` — DM Sans 700

**Grid:** `grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-16`

9 Feature Cards (ver componente em §2). Cada card:
- Ícone 24px no topo — `color: accent-green`
- Título — DM Sans 600 16px `text-primary`
- Body — Inter Tight 400 14px `text-secondary`

**Ordem dos cards:** Templates, Canvas Formats, Text & Typography, Image Editing, Assets Library, Overlays & Effects, Layers & History, Offline-First, Export.

---

### 3.7 Section 3 — How It Works

**Layout:** `bg-surface-1 border-y border-border-subtle py-24`  
**Inner:** `max-w-4xl mx-auto px-6`

- Eyebrow: `"Process"`
- Headline: `"From blank canvas to`  
  `ready-to-post in 3 steps."` — DM Sans 700

**Steps:** layout horizontal em desktop, vertical em mobile.

```
[  1  ]  [  2  ]  [  3  ]
 Pick     Make     Export
```

Cada step:
- Número: `text-4xl font-bold text-border-strong` (grande, quase invisível)
- Título: DM Sans 600 18px `text-primary`
- Descrição: Inter Tight 14px `text-secondary`
- Conector entre steps: linha `1px border-dashed border-border-default` (só desktop)

---

### 3.8 Section 4 — Who It's For

**Layout:** `max-w-5xl mx-auto px-6 py-24`

- Eyebrow: `"Who it's for"`
- Headline: `"Made for people who create,`  
  `not just designers."` — DM Sans 700

**Grid 2×2** de persona cards:
- Content creators
- Small business owners
- Marketers
- Freelancers

Cada persona card:
- `bg-surface-1 border border-border-default rounded-2xl p-6`
- Título: DM Sans 600 16px
- Descrição: Inter Tight 14px text-secondary

---

### 3.9 Section 5 — Pricing

**Layout:** `bg-surface-1 border-y border-border-subtle py-24`  
**Inner:** `max-w-4xl mx-auto px-6 text-center`

- Eyebrow: `"Pricing"`
- Headline: `"One price. Forever yours."` — DM Sans 700 `display-lg`
- Subheadline: `"No monthly fees. No seat limits. No surprises."` — `text-secondary`

**Cards de pricing:** `grid md:grid-cols-2 gap-6 mt-12 max-w-2xl mx-auto`

**Free card:**
```
bg: surface-1
border: 1px solid border-default
border-radius: 16px
padding: 32px
```

**Pro card (highlighted):**
```
bg: surface-1
border: 1px solid rgba(52,211,153,0.3)
box-shadow: 0 0 40px rgba(52,211,153,0.06)
border-radius: 16px
padding: 32px
position: relative (para badge "Best value")
```

Badge `"Best value"`: `position: absolute top: -12px left: 50% transform: -50%` — usa componente Badge com accent-green.

**Estrutura de cada card:**
- Nome do plano: DM Sans 700 20px
- Preço: DM Sans 700 `display-md`; Free: `"$0"`, Pro: `"$47"` com `"one-time"` em `text-secondary text-sm`
- Descrição breve: `text-secondary text-sm`
- Separador: `border-t border-border-subtle`
- Lista de features com `✓` em `text-accent-green`
- CTA: Free → button ghost, Pro → button primary

**Supporting line** abaixo do Pro card: `"Limited early-access pricing. Lock it in before it changes."` — `text-ghost text-xs text-center mt-3`

---

### 3.10 Section 6 — FAQ

**Layout:** `max-w-3xl mx-auto px-6 py-24`

- Eyebrow: `"FAQ"`
- Headline: `"Questions? We have answers."` — DM Sans 700

**Accordion:** 6 perguntas da copy. Cada item:
```
border-bottom: 1px solid border-subtle
py-5
```
- Pergunta: DM Sans 500 16px `text-primary` + `+`/`-` icon direita `text-text-ghost`
- Resposta: Inter Tight 400 14px `text-secondary`, `pt-3 pb-2`
- Animação de abertura: `max-height 0 → auto` com `overflow: hidden` + `transition 0.3s ease`

---

### 3.11 Final CTA Section

**Layout:** `py-32 px-6 text-center`  
**Background:** canvas-grid + `radial-gradient(ellipse 60% 40% at 50% 100%, rgba(52,211,153,0.07) 0%, transparent 70%)` — brilho verde suave saindo do rodapé.

- Headline: `"Stop putting off your next design."` — DM Sans 700 `display-lg`
- Body: `"Open Modo, pick a template…"` — `text-secondary body-lg max-w-lg mx-auto`
- CTAs: mesma dupla do hero
- `mt-4 text-ghost text-sm`: `"Free to start. No credit card required."`

---

### 3.12 Footer

**Layout:** `border-t border-border-subtle bg-surface-1 py-10 px-6`  
**Inner:** `max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6`

- Esquerda: logo + `"© 2026 Modo. All rights reserved."` — `text-ghost text-sm`
- Direita: links `Terms`, `Privacy` — `text-ghost text-sm hover:text-text-secondary`

---

## 4. Responsividade

| Breakpoint | Largura | Mudanças |
|---|---|---|
| `sm` | 640px | Grid de features 2 colunas |
| `md` | 768px | Layout dual em sections 1, 3.12; pricing 2 colunas |
| `lg` | 1024px | Grid de features 3 colunas |
| `xl` | 1280px | Hero visual em tamanho máximo |

**Mobile (< 640px):**
- `display-xl` → 40px
- `display-lg` → 28px
- Grids colapsam em 1 coluna
- Navbar vira hamburger
- Hero visual pode ser substituído por screenshot estático menor

---

## 5. Performance & SEO

**`<head>` obrigatório:**
```html
<title>Modo — Browser-Based Design Editor for Social Media</title>
<meta name="description" content="Create stunning Instagram posts, stories, Pinterest graphics, and marketing visuals in your browser. No download. No monthly fees. Try Modo free." />
<meta property="og:title" content="Design beautiful social media graphics — in minutes." />
<meta property="og:description" content="Modo is the fast, browser-based design editor. Templates, assets, layers, and high-res export — all without leaving your browser." />
<meta property="og:image" content="/og-image.png" />  <!-- 1200×630 -->
<meta name="theme-color" content="#0c0c0c" />
```

**Core Web Vitals:**
- Fontes: `display: swap` + preconnect a `fonts.googleapis.com`
- Hero visual: `<img>` com `fetchpriority="high"` + `width`/`height` definidos
- Animações: só rodar após `prefers-reduced-motion: no-preference`
- Abaixo do fold: `loading="lazy"` em imagens

---

## 6. Observações de Implementação

- A landing é uma rota separada (`/` ou `/landing`) — **não** carrega o editor Konva.
- Reutilizar o `LogoIcon` de `app/components/editor/icons.tsx`.
- Não usar `overflow: hidden` no `body` nessa rota (o editor usa, mas a landing precisa de scroll).
- O botão primary de CTA deve usar o mesmo padrão do `LicenseModal` — `bg-accent-green text-surface-0`.
- Evitar `fixed` dentro de elementos com `transform` (ver memory: fixed-position transform trap).
- Se o hero visual for um iframe do editor real: adicionar `pointer-events: none` + `tabIndex={-1}`.
