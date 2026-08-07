# Modo — Landing Page Spec

> Spec version: 2.0 — August 2026
> Reference copy: `docs/landing-copy.md` (v2.0)
> Design system source of truth: `app/globals.css` + `docs/design-guidelines.md`
>
> **O que mudou da v1.0:** o spec anterior descrevia um design system que não
> existe mais. O redesign (Daylight/Íris, 03/08/2026) trocou a paleta de
> *dark-first + verde* para *light-first + íris*, e as fontes de *DM Sans +
> Inter Tight* para **Instrument Sans + Geist Mono**. A copy também mudou de
> premissa (local-first/LTD → cloud/AI/assinatura). Nada da v1.0 sobrevive
> além da estrutura de seções.

---

## 0. Decisão de rota pendente

**A landing não tem onde morar hoje.** `app/page.tsx` é o editor, e
`proxy.ts:13` só libera `/login`, `/signup`, `/forgot-password` e
`/reset-password` — qualquer outra rota redireciona visitante deslogado para
`/login`. Uma landing pública precisa de uma das duas mudanças:

| Opção | O que fazer | Custo |
|---|---|---|
| **A — landing em `/`, editor em `/editor`** *(recomendada)* | Mover `page.tsx` para `app/editor/page.tsx`; `/` vira a landing e entra em `PUBLIC_PATHS`; deslogado vê a landing, logado é redirecionado de `/` para `/dashboard` | Quebra URLs salvas do editor; `/` deixa de ser o app |
| **B — landing em `/home` (ou domínio separado)** | Adicionar a rota a `PUBLIC_PATHS` e apontar o marketing para ela | Zero quebra, mas a raiz do domínio continua sendo um redirect para `/login` — ruim para SEO e para tráfego pago |

A recomendação é **A**: a raiz do domínio é o que recebe backlink, anúncio e
resultado de busca, e hoje ela devolve um redirect para uma tela de login.
Confirmar antes de implementar — as duas opções mudam `proxy.ts`.

---

## 1. Design System

Tudo abaixo é o sistema **real** do app, lido de `app/globals.css`. A landing
deve consumir os mesmos tokens, nunca redefinir cor própria.

### 1.1 Cores

> ⚠️ **Trap do Tailwind v4 (`@theme inline`)** — ler antes de tocar em token.
> Valores crus vivem em `:root` / `.dark`. `@theme inline` só faz *alias*
> (`--color-accent: var(--accent)`). Se você declarar um literal dentro de
> `@theme inline`, ele é inlinado em build time e o `.dark` nunca alcança —
> o tema quebra silenciosamente. Detalhe em `docs/design-guidelines.md`
> § "How theming works".

**Superfícies** — elevação é um passo de luminosidade, nunca uma sombra.

| Token | Light | Dark | Uso na landing |
|---|---|---|---|
| `surface-0` | `#eceae5` | `#0e0e10` | fundo da página |
| `surface-1` | `#f7f6f3` | `#161619` | seções alternadas, footer |
| `surface-2` | `#ffffff` | `#1c1c20` | cards, popovers, card de pricing |
| `surface-3` | `#f4f2ee` | `#141417` | inputs, chips |
| `surface-4` | `#eeece7` | `#26262b` | hover / pressed |

Em light, `surface-3` é **mais escuro** que `surface-2` — o input afunda no
card branco. Contra-intuitivo, e é de propósito.

**Bordas** — alphas pretos em light, brancos em dark.

```
--border-subtle   rgb(0 0 0 / 0.06)  |  #ffffff0d   → separa estrutura
--border-default  rgb(0 0 0 / 0.08)  |  #ffffff12   → contorna card/input
--border-strong   rgb(0 0 0 / 0.14)  |  #ffffff24   → hover de input
```

Foco e seleção **não** usam `border-strong` — usam o accent.

**Texto** — quatro passos, e a maior parte do texto **não** é primary.

| Token | Light | Dark | Uso na landing |
|---|---|---|---|
| `text-primary` | `#1b1a18` | `#ededf0` | headlines, títulos de card |
| `text-secondary` | `#6b6862` | `#9a9aa3` | body, subheads |
| `text-tertiary` | `#8b877f` | `#7d7d86` | metadados, unidades |
| `text-ghost` | `#a5a09a` | `#5c5c65` | supporting lines, captions, footer |

Nem preto puro nem branco puro. `#1b1a18` e `#ededf0` são deliberados.

**Accent — íris.** `accent` (`#5b5bd6` light / `#8b8bf5` dark) é o único accent
com significado: ação primária, foco, destaque. Usar com parcimônia — ele perde
a função no instante em que duas coisas não relacionadas ficam íris.

```
--accent          #5b5bd6  |  #8b8bf5   CTA primária, ícones de destaque
--accent-hover    #4a4ac4  |  #a5a5f8   hover
--accent-fg       #ffffff  |  #12121a   texto SOBRE o accent
--accent-tint     #f0ecff  |  #8b8bf51f chip/badge tintado
--accent-tint-fg  #4a45b8  |  #a5a5f8   texto no chip tintado
```

> **Nunca `text-surface-0` sobre superfície accent** — em light isso vira um
> quase-branco ilegível. É sempre `text-accent-fg`.

**Categóricos, não-estado:** `danger` / `danger-tint`, `success`, `warning`.
Success **não** é o accent — "salvo" é informação, não ação. A landing
provavelmente só precisa do accent; não introduzir cor decorativa nova
(a v1.0 tinha rosa e azul decorativos — foram embora com o redesign).

**Seleção de texto** (já em `globals.css`, não redeclarar):
```css
::selection { background: color-mix(in srgb, var(--accent) 25%, transparent); }
```

---

### 1.2 Tipografia

| Papel | Fonte | Variável |
|---|---|---|
| Display / Body / UI | **Instrument Sans** | `--font-display`, `--font-body` |
| Numérico | **Geist Mono** | `--font-mono` — sempre com `tabular-nums` |

Ambas já carregadas em `app/layout.tsx` via `next/font/google`. **Não adicionar
fonte nova para a landing.**

> **Não cruzar os fios:** essas são as fontes do *chrome*. As 14 fontes de
> *documento* em `app/lib/fonts.ts` (`--font-*-design`) são outra coisa e não
> devem ser tocadas — mexer nelas quebra `resolveFontFamily()` e os
> `fontFamily` já salvos em projetos.

**Escala.** A escala do editor (`docs/design-guidelines.md`) vai de 10px a
20px — ela é para chrome denso e **não cobre uma landing**. A landing estende a
escala para cima, mantendo a mesma fonte e a mesma lógica de peso:

| Token | Tamanho | Peso | Uso |
|---|---|---|---|
| `display-xl` | 64–72px | 600 | Hero headline |
| `display-lg` | 40–48px | 600 | Section headline |
| `display-md` | 28–32px | 600 | Sub-seção, nome de plano |
| `body-lg` | 18px | 400 | Hero subhead, body de destaque |
| `body-md` | 15–16px | 400 | Parágrafos gerais |
| `body-sm` | 13.5px | 400 | Body de card, respostas de FAQ |
| `caption` | 12px | 400 | Supporting lines, footer |
| `label` | 11px | 500 | Eyebrows e badges — UPPERCASE + `tracking-[0.1em]` |

**Peso carrega hierarquia: 600 é o teto.** O sistema não usa 700 em lugar
nenhum — a v1.0 pedia DM Sans 700 nas headlines e isso não existe mais. Se uma
headline parecer fraca, aumentar tamanho ou contraste, não peso.

---

### 1.3 Cantos

Tokens reais: `--radius-sm` 6px · `--radius-md` 8px · `--radius-lg` 11px ·
`--radius-xl` 14px.

- **Botões e inputs:** `rounded-md` (8px)
- **Cards** (feature, persona, pricing): `rounded-lg` (11px)
- **Superfícies grandes** (mock do editor, card de pricing destacado): `rounded-xl` (14px)
- **Badges / chips / pills:** `rounded-full`

A v1.0 pedia `rounded-2xl` (16px) em cards — esse valor não existe na escala.

---

### 1.4 Sombras

Tokens reais: `shadow-raise` · `shadow-pop` · `shadow-modal` · `shadow-canvas`.

Regra herdada do app: **superfície ancorada leva borda e nenhuma sombra; só o
que flutua de verdade leva sombra.**

- **Feature/persona cards:** borda `border-default`, **sem sombra**
- **Card de pricing destacado:** `shadow-raise` + borda accent
- **Dropdown do menu mobile:** `shadow-pop`
- **Mock do editor no hero:** `shadow-canvas` (é literalmente a sombra que o
  canvas usa dentro do app — mantém a peça coerente com o produto)

Sem glow. A v1.0 pedia um halo verde no CTA; o sistema atual não tem glow em
lugar nenhum e o accent íris não sustenta um.

---

### 1.5 Movimento

Um easing para tudo: `--ease-standard` = `cubic-bezier(0.16, 1, 0.3, 1)`.

Keyframes **já existentes** em `globals.css` — reutilizar, não recriar:

| Classe | Comportamento | Duração |
|---|---|---|
| `.animate-fade-in` | `opacity 0→1` + `translateY(4px→0)` | 0.4s |
| `.animate-scale-in` | `opacity 0→1` + `scale(0.96→1)` | 0.5s |
| `.animate-canvas-appear` | `opacity 0→1` + `scale(0.92→1)` | 0.7s |

Entrada por scroll: `IntersectionObserver` com threshold `0.15`, aplicando
`.animate-fade-in`. Elementos irmãos recebem `animation-delay` incremental de
80ms.

`prefers-reduced-motion: reduce` **já está tratado** no `globals.css` para as
quatro animações — qualquer animação nova na landing precisa entrar naquele
mesmo bloco.

Hover e mudança de estado: `transition-colors duration-150 ease-standard`.

---

### 1.6 Grid de fundo

A classe `.canvas-dots` já existe e é temada (`--canvas-dot`, mais clara no
papel quente do light). Usar ela — não hardcodar o `radial-gradient`.

```css
.canvas-dots {
  background-image: radial-gradient(circle, var(--canvas-dot) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

---

### 1.7 Tema

A landing é **light-first com dark**, como o app. `theme-store` guarda
light/dark/system e `ThemeSync` aplica a classe `.dark` no `<html>`.

- Visitante deslogado não tem preferência salva → seguir `prefers-color-scheme`.
- O toggle de tema é opcional na landing; se existir, usar o mesmo store.
- **Nenhuma seção pode assumir fundo escuro.** A v1.0 era dark-only e usava
  `#0c0c0c` cravado; qualquer valor cravado agora quebra o light.

---

## 2. Componentes Base

### Button — Primary (CTA)

```
bg: accent
color: accent-fg          ← nunca surface-0
font: Instrument Sans 500
size: px-5 py-2.5 text-[15px]
radius: rounded-md (8px)
hover: bg accent-hover
transition: colors 150ms ease-standard
focus-visible: ring-2 ring-accent ring-offset-2 ring-offset-surface-0
```

### Button — Secondary / Ghost

```
bg: surface-2
border: 1px solid border-default
color: text-primary
font: Instrument Sans 400
size: px-5 py-2.5 text-[15px]
radius: rounded-md
hover: bg surface-4 + border-strong
```

### Badge / Eyebrow

```
font: Instrument Sans 500, 11px, uppercase, tracking-[0.1em]
color: accent-tint-fg
bg: accent-tint
border: none
px-2.5 py-1 rounded-full
```

### Feature Card

```
bg: surface-2
border: 1px solid border-default
radius: rounded-lg (11px)
padding: 24px
hover: border-color → border-strong
transition: colors 150ms ease-standard
sem sombra
```

---

## 3. Estrutura da Página

Seções na ordem da copy v2.0.

### 3.1 Navbar

- `position: fixed`, `top: 0`, `z-50`
- Fundo `surface-0/80` + `backdrop-filter: blur(12px)` + `border-b border-border-subtle`
- Scroll > 20px: fundo vira `surface-1/90`, transição 300ms
- Layout: `max-w-6xl mx-auto px-6 h-14 flex items-center justify-between`

**Conteúdo:**
- Esquerda: `LogoIcon` de `app/components/editor/icons.tsx` + wordmark "Modo", Instrument Sans 600
- Centro (desktop): `Features`, `Pricing`, `FAQ` — 14px, `text-secondary`, hover `text-primary`
- Direita: ghost "Sign in" + primary "Start free"

**Mobile:** hamburger + drawer lateral (`shadow-pop`).

---

### 3.2 Hero

**Layout:** `min-h-screen flex flex-col items-center justify-center text-center px-6`
**Fundo:** `surface-0` + `.canvas-dots`, com vinheta radial suave em accent:
`radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--accent) 7%, transparent) 0%, transparent 70%)`

1. **Eyebrow** — `"AI design editor"` (componente Badge)

2. **Headline** — `display-xl`, peso 600
   `"Describe the post.`
   `Get the design."`
   Quebra intencional. **"Get the design."** em `text-accent`.

3. **Subheadline** — `body-lg`, `text-secondary`, `max-w-2xl mx-auto`
   Texto da copy §HERO.

4. **Prompt demo** *(elemento novo — substitui a lista de formatos da v1.0)*
   Um campo falso, não interativo, imitando a AI bar do editor:
   ```
   bg: surface-2 · border border-default · rounded-full · px-5 py-3
   max-w-lg mx-auto · shadow-raise
   ```
   Ícone de sparkle em `text-accent` + texto tipado com cursor piscando,
   ciclando 3 briefs:
   `"launch post for a matcha café, warm and minimal"` →
   `"black friday story, bold, high contrast"` →
   `"pinterest pin for a yoga retreat"`
   Respeitar `prefers-reduced-motion`: sem typing, mostra o primeiro brief estático.

5. **CTAs** — `flex gap-3 justify-center mt-8`
   - Primário: "Start free"
   - Ghost: "See how it works →" (âncora para §3.7)

6. **Supporting line** — `caption`, `text-ghost`, `mt-3`
   `"Free plan, no credit card. Nothing to install. Works in your browser."`

7. **Hero visual** — `mt-16 max-w-5xl mx-auto w-full`
   Mock do editor, `.animate-canvas-appear` (0.7s), `rounded-xl`,
   `border border-border-default`, `shadow-canvas`.
   **Precisa existir em light e dark** — dois screenshots trocados por
   `<picture>` ou pela classe `.dark`. Um mock dark sobre página light é o erro
   mais provável desta seção.
   Pills sobrepostas abaixo: `"1080×1080"`, `"1080×1920"`, `"1000×1500"` em
   `surface-2 / border-default / text-secondary`, `rounded-full`.

---

### 3.3 Social Proof Bar

`border-y border-border-subtle py-6 bg-surface-1`
Linha em `text-ghost text-sm`, separadores `·`:
`Instagram Posts · Instagram Stories · Pinterest · Marketing Creatives · Promotional Banners`
Desktop: linha única centralizada. Mobile: scroll horizontal sem scrollbar visível.

---

### 3.4 Section 1 — Value Prop

`max-w-5xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center`

**Esquerda:**
- Eyebrow: `"Why Modo"`
- Headline: `"Canva is powerful.` / `Modo is fast."` — `display-lg`
- Body: parágrafos da copy §SECTION 1. O brief *"launch post for a matcha café,
  warm and minimal"* fica em `font-mono text-accent-tint-fg` sobre
  `bg-accent-tint`, `rounded-sm px-1.5` — dá a ele cara de input real.
- Link ghost: `"See all features →"` em `text-accent text-sm`

**Direita:** 3 pills empilhadas (ícone 18px `text-accent` + texto), cada uma
`bg-surface-2 border border-border-default rounded-lg px-4 py-3 flex items-center gap-3`:
- `"First draft in one sentence"` — ícone sparkle
- `"No learning curve"` — ícone raio
- `"Synced across your devices"` — ícone de nuvem/devices

> As pills da v1.0 (`"Your files stay local"`, `"Works offline"`) venderiam
> exatamente o oposto do produto atual. Não reintroduzir.

---

### 3.5 Section 1B — AI Callout

*(Substitui integralmente o "Ownership Callout" da v1.0.)*

`bg-surface-1 border-y border-border-subtle py-24`
Inner: `max-w-3xl mx-auto px-6 text-center`

- Eyebrow: `"AI generation"`
- Headline: `"The fastest first draft you'll ever get."` — `display-lg`
- Body: os três blocos da copy §SECTION 1B, separados
- **Visual (opcional, mas é a seção que mais pede):** antes/depois em duas
  colunas — à esquerda o brief em mono dentro de um input falso, à direita o
  design gerado. Seta ou `→` em `text-ghost` entre eles.
- Blockquote:
  ```
  border-left: 2px solid var(--accent)
  padding-left: 20px
  font-style: italic
  color: text-secondary
  margin-top: 32px
  ```
  *"Blank canvas to finished post, in one sentence."*
- Linha final: `"Included on every plan. 5 generations a month on Free, 100 on Pro."`
  em `caption text-ghost`

---

### 3.6 Section 2 — Features Grid

`max-w-6xl mx-auto px-6 py-24`

- Eyebrow: `"Features"`
- Headline: `"Everything you need.` / `Nothing you don't."`
- Grid: `grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-16`

9 Feature Cards (§2). Cada card: ícone 20px `text-accent` no topo · título
Instrument Sans 600 15px `text-primary` · body 13.5px `text-secondary`.

**Ordem (mudou — a AI abre a grade):**
1. AI Generation
2. Templates
3. Canvas Formats
4. Text & Typography
5. Image Editing
6. Shapes, Assets & Overlays
7. Layers & History
8. Cross-Device Sync
9. Export

Ícones 1–6 e 8–9 podem reaproveitar `icons.tsx` (`TemplatesIcon`, `TextIcon`,
`ShapesIcon`, `AssetsIcon`, `OverlaysIcon`, `LayersIcon`, `ImageIcon`,
`DownloadIcon`) — a landing fica visualmente amarrada ao produto de graça.

> O card "Offline-First & Local Ownership" da v1.0 foi substituído por
> "Cross-Device Sync". É a inversão exata do argumento antigo; ver o apêndice
> de `landing-copy.md`.

---

### 3.7 Section 3 — How It Works

`bg-surface-1 border-y border-border-subtle py-24` · Inner `max-w-4xl mx-auto px-6`
Alvo da âncora do CTA secundário do hero (`id="how-it-works"`).

- Eyebrow: `"Process"`
- Headline: `"From one sentence to` / `ready-to-post in 3 steps."`

```
[  1  ]  [  2  ]  [  3  ]
Describe   Edit    Export
```

Cada step: número em `text-4xl font-semibold text-border-strong` (grande, quase
invisível) · título Instrument Sans 600 17px · descrição 13.5px
`text-secondary`. Conector tracejado `1px border-dashed border-border-default`
entre steps, só no desktop.

---

### 3.8 Section 4 — Who It's For

`max-w-5xl mx-auto px-6 py-24`

- Eyebrow: `"Who it's for"`
- Headline: `"Made for people who create,` / `not just designers."`
- Grid 2×2 de persona cards (`surface-2`, `border-default`, `rounded-lg`, `p-6`):
  Content creators · Small business owners · Marketers · Freelancers

---

### 3.9 Section 5 — Pricing

`bg-surface-1 border-y border-border-subtle py-24` · Inner `max-w-4xl mx-auto px-6 text-center`

- Eyebrow: `"Pricing"`
- Headline: `"Start free. Upgrade when you outgrow it."` — `display-lg`
- Subheadline: `"One plan, one price. Cancel any time."` — `text-secondary`

**Cards:** `grid md:grid-cols-2 gap-6 mt-12 max-w-2xl mx-auto`

**Free card:** `bg-surface-2 · border border-border-default · rounded-xl · p-8`

**Pro card (destacado):**
```
bg: surface-2
border: 1px solid var(--accent)
box-shadow: var(--sh-raise)
rounded-xl · p-8 · position: relative
```
Badge `"Most popular"` em `top: -12px; left: 50%; transform: translateX(-50%)`
usando o componente Badge.

**Estrutura de cada card:**
- Nome do plano — Instrument Sans 600 18px
- Preço — `display-md`, `font-mono tabular-nums`: Free `"$0"`, Pro `"$10"` com
  `"/month"` em `text-secondary text-sm`
- Descrição — `text-secondary text-sm`
- Separador `border-t border-border-subtle`
- Features com `✓` em `text-accent`; os números que diferenciam (**100
  generations**, **1 GB**) em `text-primary font-medium` — o resto secondary
- CTA: Free → ghost `"Start free"` · Pro → primary `"Upgrade to Pro — $10/month"`

**Supporting line** abaixo do card Pro, `caption text-ghost text-center mt-3`:
`"No contract, no seat minimums. Cancel any time and you keep access until the end of your billing period."`

> Preço vem de `NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY` no app. Se o valor mudar
> no Paddle, esta seção **e** `upgrade-modal.tsx` precisam mudar juntos — hoje
> o `"$10/month"` está cravado nos dois lugares.

---

### 3.10 Section 6 — FAQ

`max-w-3xl mx-auto px-6 py-24`

- Eyebrow: `"FAQ"`
- Headline: `"Questions? We have answers."`

**Accordion — 10 perguntas** (eram 7 na v1.0). Cada item:
```
border-bottom: 1px solid var(--border-subtle)
py-5
```
- Pergunta: Instrument Sans 500 15px `text-primary` + ícone `+`/`−` à direita em `text-ghost`
- Resposta: 13.5px `text-secondary`, `pt-3 pb-2`
- Abertura: `grid-template-rows: 0fr → 1fr` com `transition 0.3s ease-standard`
  (mais confiável que `max-height` chutado)
- **Acessibilidade:** `<button aria-expanded>` controlando um `<div role="region">`;
  o accordion precisa funcionar por teclado.

As três perguntas novas — *"Is the free plan a trial?"*, *"What exactly does the
AI do?"*, *"Do free exports have a watermark?"* — são as que respondem às
objeções reais do modelo novo. Não cortar por espaço.

---

### 3.11 Final CTA

`py-32 px-6 text-center`
Fundo: `.canvas-dots` + `radial-gradient(ellipse 60% 40% at 50% 100%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 70%)`

- Headline: `"Your next post is one sentence away."` — `display-lg`
- Body: copy §FINAL CTA — `body-lg text-secondary max-w-lg mx-auto`
- CTAs: mesma dupla do hero
- `mt-4 caption text-ghost`: `"Free to start. No credit card required."`

---

### 3.12 Footer

`border-t border-border-subtle bg-surface-1 py-10 px-6`
Inner: `max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6`

- Esquerda: logo + `"© 2026 Modo. All rights reserved."` — `text-ghost text-sm`
- Direita: `Terms`, `Privacy` — `text-ghost text-sm hover:text-text-secondary`

---

## 4. Responsividade

| Breakpoint | Largura | Mudanças |
|---|---|---|
| `sm` | 640px | Features em 2 colunas |
| `md` | 768px | Layout duplo nas seções 1 e 4; pricing 2 colunas |
| `lg` | 1024px | Features em 3 colunas |
| `xl` | 1280px | Hero visual no tamanho máximo |

**Mobile (< 640px):**
- `display-xl` → 38px · `display-lg` → 27px
- Grids colapsam em 1 coluna
- Navbar vira hamburger
- Prompt demo do hero: reduzir para 1 brief, sem ciclo
- Hero visual pode virar screenshot estático menor

---

## 5. Performance & SEO

```html
<title>Modo — AI Design Editor for Social Media, in Your Browser</title>
<meta name="description" content="Describe your post and Modo designs it — templates, copy, palette and type. Instagram, Stories and Pinterest graphics in minutes. Free plan, no watermark." />
<meta property="og:title" content="Describe the post. Get the design." />
<meta property="og:description" content="Modo is the fast, AI-powered design editor for social media. Templates, assets, layers and watermark-free export — all in your browser." />
<meta property="og:image" content="/og-image.png" />  <!-- 1200×630 -->
<meta name="theme-color" content="#eceae5" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0e0e10" media="(prefers-color-scheme: dark)" />
```

`theme-color` agora é **duplo** — a v1.0 tinha só o `#0c0c0c` de um app
dark-only.

**Core Web Vitals:**
- Fontes já vêm de `next/font/google` no layout (self-hosted, sem request a
  `fonts.googleapis.com`) — **não** adicionar `preconnect`, seria um DNS lookup
  inútil.
- Hero visual: `next/image` com `priority`, `width`/`height` definidos
- Animações só depois de `prefers-reduced-motion: no-preference`
- Abaixo da dobra: `loading="lazy"`
- A landing **não** deve importar nada de `components/editor/` além de
  `icons.tsx` — puxar `editor-layout` arrasta Konva inteiro para o bundle da
  página de marketing

---

## 6. Observações de Implementação

- **A landing não carrega o editor.** Sem Konva, sem Dexie, sem
  `entitlement-store`. É uma página estática.
- **`body { overflow: hidden }` está global** em `globals.css` (o editor
  precisa). A rota da landing tem que sobrescrever para `overflow: auto` —
  senão a página simplesmente não rola.
- **CSP com nonce por request** (`proxy.ts`). Nada de `<script>` ou `<style>`
  inline sem o nonce; script de terceiro (analytics, pixel) precisa entrar na
  policy explicitamente.
- Reaproveitar `LogoIcon` e os ícones de `app/components/editor/icons.tsx`.
- CTA primária segue o padrão de `upgrade-modal.tsx` — `bg-accent text-accent-fg`.
  *(A v1.0 mandava seguir o `LicenseModal`, que foi deletado junto com o LTD.)*
- Evitar `position: fixed` dentro de elemento com `transform` — ver memory
  "fixed-position transform trap".
- Se o hero visual for um iframe do editor real: `pointer-events: none` +
  `tabIndex={-1}`. Mas prefira screenshot: o editor é gated por sessão, então um
  iframe mostraria a tela de login.
- **Sem HMR neste repo** (`/mnt/c`, WSL2): reiniciar `next dev` para ver
  qualquer alteração.

---

## 7. Checklist antes de publicar

- [ ] Rota decidida (§0) e `PUBLIC_PATHS` em `proxy.ts` atualizado
- [ ] Página revisada em light **e** dark, incluindo o mock do hero
- [ ] Zero hex cravado — tudo via token
- [ ] Nenhuma claim do apêndice de `landing-copy.md` sobreviveu
- [ ] Preço bate com `upgrade-modal.tsx` e com o Paddle
- [ ] Accordion navegável por teclado; animações respeitam reduced-motion
- [ ] `og-image.png` 1200×630 existe
- [ ] Bundle da landing não contém Konva

---

*Spec version: 2.0 — August 2026*
