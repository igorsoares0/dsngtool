# Modo — Landing Page Spec

> Spec version: 3.0 — October 2026
> Mock de referência: `docs/design_handoff_modo_redesign/Modo H - Telas Externas.dc.html`
> (tela "Landing", 1440px; abrir no navegador com `support.js` ao lado) e
> `screenshots/telas-externas.jpg`
> Copy: `docs/landing-copy.md` (v3.0) · Tokens: `app/globals.css` · Regras: `docs/design-guidelines.md` Part 1
>
> **O que mudou da v2.0:** a v2.0 descrevia o sistema Daylight/Íris (Instrument
> Sans + Geist Mono, accent íris, cantos de 6–14px, peso máximo 600, `.canvas-dots`).
> O app migrou para o **H / Final** em 02/10/2026, e esse sistema não existe mais.
> A landing segue agora o H: papel quente, linhas de tinta, cantos retos,
> Archivo pesado e expandido, IBM Plex Mono nos metadados. A §0 da v2.0
> (landing em `/` ou `/home` deste repo) também caiu: a landing é um projeto
> separado.

---

## 0. Onde a landing mora

- **Projeto:** `../modolp`, um Next.js separado publicado em `getmodo.pro` (Coolify).
  O app fica em `app.getmodo.pro`.
- **Os dois não compartilham código.** Os tokens são copiados de
  `app/globals.css` para `modolp/app/globals.css` (ver §6). Quando um token mudar
  no app, a landing precisa mudar junto.
- **Os CTAs saem do domínio.** "Start free" → `https://app.getmodo.pro/signup`,
  "Log in" → `https://app.getmodo.pro/login`.

### Limite do hand-off (decisão pendente)

O mock tem uma barra BRIEF com "Try it →", e o app já tem um hand-off de brief
(`app/lib/brief-handoff.ts`). Só que ele usa `sessionStorage`, que **não
atravessa origens**: um brief digitado em `getmodo.pro` não chega a
`app.getmodo.pro`. Além disso, o redirect do `proxy.ts` para `/login` guarda só o
`pathname`, não a query, então nem um `?brief=` sobreviveria ao login.

| Opção | O que fazer | Custo |
|---|---|---|
| **A — barra sem estado** *(recomendada para lançar)* | "Try it →" leva para `/signup`; o brief digitado é descartado | Zero mudança no app. A barra vira um CTA com cara de produto |
| **B — brief atravessa o cadastro** | Landing manda `?brief=`; o app guarda o valor antes do redirect (cookie ou query preservada no `redirect`) e o entrega ao `ai-bar` depois da verificação de email | Mexe em `proxy.ts`, nas telas de auth e no fluxo de verificação |

Na opção A, o campo pode ser um `<input>` de verdade (o visitante digita), mas
a spec não promete que o brief chega ao editor. Nada na copy pode dizer isso.

---

## 1. Design System

Tudo aqui é o sistema **real** do app. A landing usa os mesmos tokens e não
inventa cor própria. Para o que não estiver aqui, valem as regras de
`docs/design-guidelines.md` Part 1.

### 1.1 Cores

> ⚠️ **Trap do Tailwind v4 (`@theme inline`).** Valores crus ficam em `:root` /
> `.dark`, e `@theme inline` só faz alias (`--color-accent: var(--accent)`). Um
> literal dentro de `@theme inline` é inlinado no build, e o `.dark` nunca o
> alcança. Detalhes em `docs/design-guidelines.md` § "How theming works".

**Superfícies e tinta**

| Token | Light | Dark | Uso na landing |
|---|---|---|---|
| `surface-0` | `#f2efe8` | `#121211` | fundo da página, fundo do hero e da colagem |
| `surface-1` | `#faf8f3` | `#1a1a18` | nav, barra BRIEF, célula Pro do pricing, footer |
| `surface-3` | `#efebe2` | `#242422` | inputs, hover |
| `text-primary` / `border-strong` | `#161513` | `#eeebe3` | headlines, e as linhas de tinta (borda da barra BRIEF, ficha de pricing) |
| `text-secondary` | `#5e5a52` | `#a9a498` | body, subheads, links do nav e do footer |
| `text-tertiary` | `#6f6a61` | `#928d83` | kickers mono, metadados, legendas FIG. |
| `border-default` | `rgb(22 21 19/.13)` | `rgb(238 235 227/.11)` | as linhas finas que separam seções e colunas |

**Cada cor tem uma função só:**

| Token | Na landing, e em mais nenhum lugar |
|---|---|
| `accent` (vermelho riso `#ff4a1c`) | CTA primária ("START FREE" no nav, "GO PRO"), o "." do wordmark e do headline, os códigos mono dos passos (01/02/03) |
| `ai` (amarelo-manteiga) | a tag BRIEF da barra do hero e o tile do passo 02 (o passo de IA) |
| `selection` (cobalto) | o badge de dimensão sobre a colagem ("STORY · 1080 × 1920") e todo focus ring |
| `tool-*-bg` | os tiles 40×40 dos passos 01 e 03 (`tool-templates-bg`, `tool-uploads-bg`) |

Texto sobre `accent` é **`accent-fg`** (tinta escura, `#161513`), não branco. O
mock usa tinta sobre o vermelho, e o app também.

Não usar: íris, glow, vinheta radial colorida, gradiente decorativo. O vermelho
perde a função quando aparece em duas coisas que não são ação.

### 1.2 Tipografia

| Papel | Fonte | Variável no app |
|---|---|---|
| Display / body / UI | **Archivo** (variável, eixo `wdth`) | `--font-archivo` |
| Kickers, preços, metadados, legendas | **IBM Plex Mono** 400/500 | `--font-plex-mono` |

Carregar via `next/font/google` como em `app/layout.tsx`: Archivo **sem
`weight`**, com `axes: ["wdth"]` (sem isso o `font-stretch` não faz nada), e
Plex Mono com `weight: ["400","500"]`. Não adicionar outra fonte de UI.

**Escala da landing** (lida do mock em 1440px):

| Uso | Tamanho / peso | Extras |
|---|---|---|
| H1 do hero | 104px / 900 | stretch 125%, tracking −0.045em, leading .86, `text-wrap: balance`, "." em `accent` |
| Headline de seção ("Two plans. No seats.") | 56px / 900 | stretch 125%, tracking −0.035em, leading .9 |
| Título de passo | 30px / 800 | stretch 115%, tracking −0.015em, leading 1 |
| Nome de plano | 24px / 800 | stretch 112% |
| Wordmark do nav | 19px / 900 | stretch 125%, tracking −0.02em |
| Wordmark do footer | 120px / 900 | stretch 125%, tracking −0.05em, leading .75 |
| Subhead do hero | 19px / 400 | leading 1.45, `text-secondary`, máx. 520px |
| Body de passo | 15px / 400 | leading 1.5, `text-secondary` |
| Nav, linhas do pricing | 14px / 400–600 | |
| Botão (CTA) | 14px / 800 | stretch 112%, UPPERCASE, tracking .02em |
| Kicker / meta | Plex Mono 12px / 500 | UPPERCASE, tracking .06em, `text-tertiary` |
| Legenda FIG., badge | Plex Mono 10.5px / 400–500 | nunca abaixo de 10.5px |

Números e preços em mono levam `tabular-nums`.

> **Não cruzar os fios:** Playfair Display, Bebas Neue e Caveat aparecem no mock
> só *dentro* dos posts da colagem, porque são fontes de documento. Na landing
> a colagem é imagem (§3.3), então essas fontes não são carregadas.

### 1.3 Cantos

**Tudo reto.** `--radius-sm/md/lg/xl` = 0, igual ao app. Únicas exceções:
`rounded-float` (4px) para o drawer do menu mobile e `rounded-full` para pontos
de status. Nada de pílula, chip arredondado ou card de 11px.

### 1.4 Profundidade

Estrutura é desenhada com linha, não com sombra nem com caixa.

- Seções são separadas por `border-b border-default` em largura total; colunas, por `border-r`.
- Elementos que precisam pesar (barra BRIEF, ficha de pricing) levam uma
  **linha de tinta** de 1px (`border-strong`), não sombra.
- Só os posts da colagem têm sombra: `0 30px 60px -12px rgb(60 40 10 / .35)`.
  É a sombra de papel do mock, parente do `--sh-canvas` do app.
- Drawer mobile: `shadow-pop`.

### 1.5 Movimento

Um easing para tudo: `--ease-standard` = `cubic-bezier(0.16, 1, 0.3, 1)`.
Hover e mudança de estado: `transition-colors duration-150 ease-standard`.

- Entrada da colagem: cada post com `fade-in` + uma rotação que assenta no
  ângulo final, com 80ms de atraso entre eles.
- Seções abaixo da dobra: `fade-in` via `IntersectionObserver` (threshold 0.15).
- Tudo desligado sob `prefers-reduced-motion: reduce`.

O mock não tem animação. Pouco movimento combina mais com o sistema do que muito.

### 1.6 Tema

O mock da landing é **só light** (as telas de login e conta têm o toggle; a
landing não). Os tokens cobrem os dois temas, então:

- O padrão é seguir `prefers-color-scheme`. Sem toggle na landing.
- Em dark, a colagem **não muda**: os posts são documentos, e documento nunca
  segue o tema da interface. A sombra de papel fica mais fraca no fundo escuro,
  e isso é aceitável.
- Nenhum hex cravado nos componentes; tudo via token.
- Revisar em dark antes de publicar (§7): o mock não testou esse caso.

---

## 2. Componentes base

### CTA primária
```
bg: accent · color: accent-fg
Archivo 800 14px, stretch 112%, UPPERCASE, tracking .02em
padding: 11px 18px (no nav: célula de altura total, px-7)
hover: accent-hover · sem raio
focus-visible: outline 2px selection, offset 2px
```

### CTA secundária (contorno de tinta)
```
bg: transparent · border: 1px solid border-strong · color: text-primary
Archivo 700 14px · padding: 10px 18px
hover: bg surface-3 · pressed: fundo de tinta (surface-inverse / text-inverse)
```

### Célula de nav
Altura total do header (56px), `px-5`, separada das vizinhas por `border-l`/`border-r`
`border-default`. Sem pílulas, sem grupos arredondados (mesma regra do topbar do app).

### Kicker
Plex Mono 500 12px, UPPERCASE, tracking .06em, `text-tertiary`. Abre o hero
("Nº 001 — A DESIGN TOOL FOR SOCIAL POSTS") e cada seção ("PRICING").

### Barra BRIEF
```
altura 56px · max-w 600px · border 1px solid border-strong · bg surface-1 · flex, sem gap
[BRIEF]   bg ai, color ai-fg, Archivo 900 13px stretch 125% tracking .06em, px-4
[campo]   flex-1, px-4, 15px; placeholder em text-tertiary
[Try it →] bg surface-inverse, color text-inverse, Archivo 700 14px, px-5
```
É a mesma linguagem da barra de IA do editor (`ai-bar.tsx`), e isso é de propósito.

### Badge de dimensão
`bg selection`, texto branco, Plex Mono 500 10.5px, altura 22px, duas células
("STORY" | "1080 × 1920") separadas por `border-l` branca a 30%. Igual ao badge
de seleção do canvas.

### Linha de ficha técnica
`flex justify-between py-2.5 border-b border-default`. À esquerda, rótulo em 14px
`text-secondary`; à direita, valor em Plex Mono 500 13px UPPERCASE.

---

## 3. Estrutura da página

### 3.0 Ordem

O mock tem cinco blocos: nav, hero, passos, pricing e footer. A copy v3.0
acrescenta três blocos, desenhados aqui na mesma linguagem.

| # | Bloco | Origem |
|---|---|---|
| 1 | Nav | mock |
| 2 | Hero | mock |
| 3 | Passos (3 colunas) | mock |
| 4 | Features | derivado: seção da copy no estilo H |
| 5 | Pricing | mock |
| 6 | FAQ | derivado (conta para SEO; responde às objeções do modelo freemium) |
| 7 | CTA final | derivado |
| 8 | Footer | mock |

**Cortados da v2.0:** a faixa de social proof, "Value prop", "AI callout" e "Who
it's for". O mock é seco de propósito, e o hero + passos já cobrem esses argumentos.
É uma recomendação; se algum voltar, segue o padrão de §3.4.

O conteúdo fica em largura total (1440px no mock), com as linhas de seção indo
de borda a borda. Não é um layout centralizado em `max-w-6xl`.

### 3.1 Nav

`h-14` (56px), `bg surface-1`, `border-b border-default`, `items-stretch`, `whitespace-nowrap`.

Células, da esquerda para a direita:
1. Wordmark "modo." (`px-7`, `border-r`)
2. `Templates` · `AI briefs` · `Pricing`: 14px `text-secondary`, hover `text-primary`;
   são âncoras para as seções
3. espaçador flex
4. `Log in`: 14px/600, `border-l`, `px-6`
5. `START FREE`: célula de CTA primária em altura total, `px-7`

Fixa no topo (`sticky top-0 z-50`). Sem blur nem transparência: o fundo é sólido,
porque o papel é a superfície.

### 3.2 Hero

`grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] border-b`.

**Coluna esquerda** — `pt-18 px-14 pb-14 flex flex-col gap-7 border-r`:
1. Kicker: `Nº 001 — A DESIGN TOOL FOR SOCIAL POSTS`
2. H1: **"Posts that look made, not generated."**, com o ponto final em `accent`
3. Subhead: "Start from a template or a one-line brief. Adjust type, color and
   layout like a designer would. Export for Instagram and Pinterest."
4. Barra BRIEF (§2). Placeholder: "An opening-day post for my bakery, warm and simple"
5. Linha mono 12px `text-tertiary`: `FREE · NO CARD · 5 AI BRIEFS A MONTH`

**Coluna direita** — `relative min-h-[640px] overflow-hidden bg surface-0`. É a colagem (§3.3).

### 3.3 Colagem ("FIG. 1")

Três posts **reais**, de templates do app, sobrepostos e girados:

| Post | Template (`app/data/templates.ts`) | Formato | Tamanho no mock | Rotação |
|---|---|---|---|---|
| "sonder" | "Word of the Day" | Post | 340×340 | −3° |
| "ASK ME" | "Ask Me" | Story | 200×356 | +4° |
| "botanica" | "Botanica" | Post | 220×220 | +2° |

- **Exportar como PNG pelo próprio editor** (Export → PNG) e servir com
  `next/image` (`priority` no primeiro). Não redesenhar em HTML/CSS como o mock
  faz: o ponto do headline é que são posts *feitos no Modo*.
- Legenda acima: `FIG. 1 — MADE IN MODO`, Plex Mono 10.5px `text-tertiary`.
- Badge de dimensão sobre o canto do Story: `STORY | 1080 × 1920`.
- Posições do mock (relativas à coluna): sonder `left 64 top 70`, Ask Me
  `left 330 top 150`, botanica `left 150 top 390`, legenda `left 64 top 46`,
  badge `left 376 top 120`.
- Os posts são imagens decorativas com `alt` descritivo ("Instagram post made
  with the Word of the Day template"). A colagem inteira não recebe foco.

### 3.4 Passos

`grid grid-cols-3 border-b`, cada coluna com `px-10 pt-9 pb-10 flex flex-col gap-3.5 border-r`
(a última sem `border-r`). Âncora `id="how-it-works"`.

Cada passo tem um tile 40×40 com ícone de 19px (stroke 1.6, tinta), o código
mono em `accent` ao lado, o título (30px/800) e o body (15px).

| Código | Tile | Ícone (paths de `app/components/editor/icons.tsx`) | Título | Body |
|---|---|---|---|---|
| 01 | `tool-templates-bg` | `TemplatesIcon` | Pick a format | Instagram post, story or Pinterest pin. Start from one of 52 templates or a blank page. |
| 02 | `ai` | `TextIcon` | Brief or edit | Describe the post and AI drafts it, or adjust every layer yourself: type, color, overlays. |
| 03 | `tool-uploads-bg` | `DownloadIcon` | Export | PNG or JPG at the exact size each platform expects. Your projects stay saved for later. |

> O mock diz "53 templates". O app tem **52**; usar o número real.

Este é o padrão para qualquer seção derivada: kicker mono, headline grande à
esquerda, conteúdo em colunas com linhas, sem cards.

### 3.5 Features (derivado)

Âncora `id="templates"` (alvo do link "Templates" do nav).

`grid grid-cols-[360px_minmax(0,1fr)] gap-12 p-14 border-b`, o mesmo esqueleto do pricing:
- Esquerda: kicker `FEATURES` + headline 56px "Everything you need. Nothing you don't."
- Direita: grade de 3 colunas com os 9 itens da copy §2, **sem cards**. Cada
  item é uma célula separada por `border-t` + `border-r` `border-default`, com
  `p-6`: código mono em `accent` (A–I), título 17px/800 e body 14px
  `text-secondary`. O item de IA (A) usa um ponto `ai` ao lado do código, e é o
  único lugar em que o amarelo aparece nesta seção.

### 3.6 Pricing

Âncora `id="pricing"`. `p-14 grid grid-cols-[360px_minmax(0,1fr)] gap-12 border-b`.

- Esquerda: kicker `PRICING` + headline 56px **"Two plans. No seats."**
- Direita: a ficha técnica, `grid grid-cols-2 border border-strong`

| | Free (célula sem fundo, `border-r border-strong`) | Pro (célula `bg surface-1`) |
|---|---|---|
| Cabeçalho | "Free" 24px/800 · `$0` mono | "Pro" 24px/800 · `$10 / MO` mono |
| Storage | 250 MB | 1 GB |
| AI briefs | 5 / MO | 100 / MO |
| Templates | 46 OF 52 | ALL 52 |
| CTA | secundária "Start free" | primária "GO PRO" |

Padding das células: `p-7`, `gap-4.5`. As linhas são a "Linha de ficha técnica" (§2).

> **O mock está errado em dois pontos:** diz "ALL 53" para os dois planos e, na
> tela de conta, vende "no watermark" como vantagem do Pro. O correto: são 52
> templates, dos quais **6 são exclusivos do Pro** (então o Free tem 46), e
> **nenhum plano tem marca d'água** (`upgrade-modal.tsx` documenta isso).
> Limites conferidos em `app/lib/server/storage.ts` e `app/lib/ai-limits.ts`.

Abaixo da ficha, mono 11px `text-tertiary`: `CANCEL ANY TIME · BILLED THROUGH PADDLE`.

O preço (`$10`) está cravado aqui, em `upgrade-modal.tsx` e no Paddle. Mudou em
um, muda nos três.

### 3.7 FAQ (derivado)

Âncora `id="faq"`. Mesmo esqueleto de duas colunas: kicker `FAQ` e headline
"Questions? We have answers." à esquerda; o acordeão à direita.

- Cada item: `border-t border-default` (o último também com `border-b`), `py-5`.
- Pergunta em 16px/700 `text-primary`; à direita, `+`/`−` em Plex Mono `text-tertiary`.
- Resposta em 15px `text-secondary`, máx. 640px.
- Abre com `grid-template-rows: 0fr → 1fr`, 150ms `ease-standard`.
- `<button aria-expanded>` controla um `<div role="region">`. Tem que funcionar
  pelo teclado.

### 3.8 CTA final (derivado)

`p-14 border-b flex items-end justify-between gap-12`:
- Esquerda: headline 56px "Your next post is one sentence away." e a linha mono
  `FREE · NO CARD · NOTHING TO INSTALL`.
- Direita: CTA primária "START FREE" + CTA secundária "See the templates".

Sem fundo especial, sem gradiente. É a mesma página, com mais uma linha.

### 3.9 Footer

`bg surface-1 flex items-end justify-between px-14 pt-10 pb-8`:
- Esquerda: wordmark "modo." em 120px (§1.2).
- Direita: `Templates` · `Pricing` · `Privacy` · `Terms` (13.5px `text-secondary`,
  `gap-7`) e `© 2026` em Plex Mono 12px `text-tertiary`.

---

## 4. Responsividade

O mock só existe em 1440px. O que vem abaixo é derivado.

| Largura | Mudanças |
|---|---|
| ≥ 1280 (`xl`) | Igual ao mock |
| 1024–1279 (`lg`) | H1 em 84px; colagem com escala 0.85 (o conjunto todo, via `transform: scale` num wrapper) |
| 768–1023 (`md`) | Hero empilha: texto em cima, colagem embaixo com `min-h-[520px]` e a linha de coluna vira `border-b`. Esqueletos de duas colunas (features, pricing, FAQ) empilham. Ficha de pricing segue com 2 colunas |
| < 768 | H1 em 52px (leading .9), headlines de seção em 40px, wordmark do footer em 72px. Passos e features em 1 coluna. Ficha de pricing empilha (Free em cima, Pro embaixo, `border-t border-strong` entre os dois). Nav: wordmark + "START FREE"; os links vão para um drawer (`shadow-pop`, `rounded-float`). Barra BRIEF: o botão vira só "→". Colagem: dois posts (sonder + Ask Me), escala 0.7 |

Margens laterais: 56px (`px-14`) no desktop, 24px no tablet e 16px no celular.
Nenhuma largura pode criar scroll horizontal.

---

## 5. SEO e meta

```html
<title>Modo — Social post design editor, in your browser</title>
<meta name="description" content="Start from a template or a one-line brief, then adjust type, color and layout like a designer would. Instagram and Pinterest posts, free plan, no watermark." />
<meta property="og:title" content="Posts that look made, not generated." />
<meta property="og:description" content="Modo is a fast design editor for social posts — 52 templates, AI briefs and watermark-free export, in your browser." />
<meta name="theme-color" content="#f2efe8" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#121211" media="(prefers-color-scheme: dark)" />
```

- `opengraph-image.tsx` / `twitter-image.tsx` do `modolp` precisam ser refeitos
  no H: fundo `#f2efe8`, o headline em Archivo 900 expandido e o "." em `#ff4a1c`.
  Com `next/og` a fonte tem de ser carregada como arquivo; ela não vem do `next/font`.
- Fontes já vêm self-hosted pelo `next/font`; não adicionar `preconnect` para o Google.
- Colagem com `next/image`, `width`/`height` definidos e `priority` no post maior.

---

## 6. Implementação no `modolp`

- **Tokens:** substituir os blocos `:root` / `.dark` / `@theme inline` de
  `modolp/app/globals.css` pelos de `app/globals.css` deste repo. Isso inclui
  `--radius-*: 0`, `--radius-float`, `selection`, `ai`, `tool-*` e
  `surface-inverse`. Remover `.canvas-dots`.
- **Fontes:** em `modolp/app/layout.tsx`, trocar Instrument Sans + Geist Mono
  (+ Playfair) por Archivo (`axes: ["wdth"]`, sem `weight`) + IBM Plex Mono. Criar
  utilitários `.font-expanded` (stretch 118%) e `.font-wide` (125%), como no app.
- **Componentes de `app/components/landing/`:**
  - `navbar.tsx`: refazer em células (§3.1)
  - `prompt-demo.tsx`: vira a barra BRIEF (§2); sai o efeito de digitação
  - `editor-mock.tsx`: substituído pela colagem (§3.3)
  - `primitives.tsx`: botões e kicker no padrão da §2
  - `faq.tsx`: restyle (§3.7)
  - `reveal.tsx`: mantém, com o easing do sistema
- **Outras páginas** (`/vs`, `/sizes`, `/privacy`, `/terms`, `/refund`, que usam
  `content-page.tsx`): herdam os tokens automaticamente, mas precisam de uma
  varredura por `rounded-*`, pílulas e usos de `accent` que não sejam CTA.
- **`modolp/designdocs/`** tem cópias antigas da spec e da copy (Daylight).
  Apagar ou trocar por um link para os docs deste repo, para não existirem duas
  fontes de verdade.
- A landing não importa nada do app: sem Konva, Dexie ou stores.

---

## 7. Checklist antes de publicar

- [ ] Decisão do hand-off do brief tomada (§0) e a copy não promete mais do que ela entrega
- [ ] Tokens do `modolp` iguais aos de `app/globals.css`
- [ ] Zero `rounded-*` além de `rounded-float` / `rounded-full`; zero íris; zero hex cravado
- [ ] Vermelho só em CTA, no "." e nos códigos; amarelo só na IA; cobalto só no badge e no foco
- [ ] Números conferidos com o app: 52 templates (6 Pro), 250 MB / 1 GB, 5 / 100 briefs, $10
- [ ] Nenhuma claim de "no watermark" como vantagem do Pro
- [ ] Colagem feita de PNGs exportados do editor, não redesenhada
- [ ] Revisado em light **e** dark, em 1440, 1024, 768 e 375px
- [ ] Acordeão navegável por teclado; animações respeitam reduced-motion
- [ ] OG/Twitter images refeitas no H
- [ ] `modolp/designdocs/` limpo

---

*Spec version: 3.0 — October 2026*
