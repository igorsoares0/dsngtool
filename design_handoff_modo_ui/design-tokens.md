# Modo — Design Tokens (direção "Daylight / Íris")

Substitui o bloco `@theme inline` de `app/globals.css`. O verde `#34d399` sai;
o acento passa a ser **íris** (`#5b5bd6` no claro, `#8b8bf5` no escuro).
O tema claro é o padrão; o escuro é o mesmo sistema com as superfícies invertidas.

---

## 1. Superfícies

Elevação = um passo de claridade (no escuro) ou um passo de brancura (no claro),
nunca uma sombra — sombra só em elementos que realmente flutuam.

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--color-surface-0` | `#eceae5` | `#0e0e10` | fundo do app, viewport do canvas |
| `--color-surface-1` | `#f7f6f3` | `#161619` | topbar, rail, painéis docados |
| `--color-surface-2` | `#ffffff` | `#1c1c20` | conteúdo do painel, popovers, modais, toolbars flutuantes |
| `--color-surface-3` | `#f4f2ee` | `#141417` | inputs e controles dentro de um painel |
| `--color-surface-4` | `#eeece7` | `#26262b` | hover / pressionado |

Observação: no claro, `surface-3` é mais **escuro** que `surface-2` (input afunda
no cartão branco); no escuro é o contrário do instinto — o input também afunda.

## 2. Bordas

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--color-border-subtle` | `rgb(0 0 0 / .06)` | `#ffffff0d` | divisórias internas, estrutura |
| `--color-border-default` | `rgb(0 0 0 / .08)` | `#ffffff12` | superfícies flutuantes, inputs |
| `--color-border-strong` | `rgb(0 0 0 / .14)` | `#ffffff24` | hover de input |

Foco e seleção **não** usam border-strong: usam o acento (ver §4).

## 3. Texto

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--color-text-primary` | `#1b1a18` | `#ededf0` | valores, rótulos ativos, títulos |
| `--color-text-secondary` | `#6b6862` | `#9a9aa3` | rótulos, controles inativos |
| `--color-text-tertiary` | `#8b877f` | `#7d7d86` | metadados, unidades |
| `--color-text-ghost` | `#a5a09a` | `#5c5c65` | legendas de seção, dicas, estado vazio |

Nem preto puro nem branco puro — `#1b1a18` e `#ededf0` são intencionais.

## 4. Acento — íris

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--color-accent` | `#5b5bd6` | `#8b8bf5` | seleção, ferramenta ativa, ação primária, foco |
| `--color-accent-hover` | `#4a4ac4` | `#a5a5f8` | hover sobre superfície de acento |
| `--color-accent-fg` | `#ffffff` | `#12121a` | texto sobre o acento |
| `--color-accent-tint` | `#f0ecff` | `#8b8bf51f` | linha ativa, chip, botão secundário |
| `--color-accent-tint-fg` | `#4a45b8` | `#a5a5f8` | texto sobre o tint |

Regra herdada do guia antigo: **um acento com significado**. Se duas coisas não
relacionadas estão íris, o íris perdeu a função.

### Acentos categóricos (não-estado)

| Token | Claro | Escuro |
| --- | --- | --- |
| `--color-danger` | `#c9553d` | `#e0836f` |
| `--color-danger-tint` | `#fdf3f1` | `#c9553d1f` |
| `--color-success` | `#5f8f6c` | `#8fbf9a` |
| `--color-warning` | `#b8823a` | `#d9a75c` |

Sucesso não é o acento — "salvo" é informação, não ação.

## 5. Tipografia

| Token | Valor |
| --- | --- |
| `--font-body` | `'Instrument Sans', system-ui, sans-serif` |
| `--font-display` | `'Instrument Sans'` (600) — dashboard e auth |
| `--font-mono` | `'Geist Mono', ui-monospace, monospace` — todo valor numérico |

Escala (densidade **média**, a escolhida):

| Nome | Tamanho | Peso | Uso |
| --- | --- | --- | --- |
| micro | 10px | 500 | legenda de seção, MAIÚSCULAS, `letter-spacing:.1em` |
| ui | 11.5px | 400/500 | padrão do editor: rótulos, botões, itens de lista |
| ui-lg | 12.5px | 600 | título de painel, nome do projeto |
| body | 13px | 400 | dashboard e auth |
| title | 16px / 20px | 600 | títulos do dashboard e modais |

Numéricos sempre `--font-mono` + `font-variant-numeric: tabular-nums`.
Peso carrega hierarquia: 500 = ativo/selecionado, 400 = o resto. Sem negrito no chrome.

## 6. Espaçamento e dimensões

Escala de 4px. Painéis `p-[14px]`, linhas de lista `px-2 py-1.5`, `gap` de 4/6/8/11px.

| Região | Tamanho |
| --- | --- |
| Rail de ferramentas | `56px` |
| Painel contextual esquerdo | `252px` |
| Painel de propriedades | `266px` |
| Topbar | `52px` |
| Popover | `min-w-[220px]` |
| Modal | `400–460px` |

Alvos de clique: 36–38px no rail, 26–28px na topbar, 22–26px dentro de painel.

## 7. Raio

| Token | Valor | Uso |
| --- | --- | --- |
| `--radius-sm` | `6px` | segmentos dentro de um grupo |
| `--radius-md` | `8px` | inputs, botões, linhas |
| `--radius-lg` | `10–11px` | popovers, cartões, toolbars flutuantes, modais |
| `--radius-xl` | `14px` | superfícies grandes |
| `--radius-full` | `9999px` | swatches, avatares, barra de IA, chips |

Nada é quadrado; nada é pílula sem ser genuinamente redondo.

## 8. Sombras

| Token | Valor |
| --- | --- |
| `--shadow-pop` | `0 8px 24px rgb(0 0 0 / .16)` (escuro: `0 12px 30px rgb(0 0 0 / .6)`) |
| `--shadow-modal` | `0 14px 40px rgb(0 0 0 / .16)` (escuro: `0 24px 60px rgb(0 0 0 / .55)`) |
| `--shadow-raise` | `0 1px 3px rgb(0 0 0 / .06)` — cartões e miniaturas no claro |
| `--shadow-canvas` | `0 18px 50px rgb(0 0 0 / .13), 0 2px 6px rgb(0 0 0 / .06)` (escuro: `0 24px 60px rgb(0 0 0 / .55)`) |

Painéis docados: borda, sem sombra. Flutuantes: borda + sombra.

## 9. Estados

| Estado | Tratamento |
| --- | --- |
| Repouso | `text-secondary`, sem fundo |
| Hover | `surface-4` + `text-primary` |
| Ativo (ferramenta) | fundo `accent` + `accent-fg`, ou `accent-tint` + `accent-tint-fg` para ações secundárias |
| Foco | `box-shadow: 0 0 0 2px var(--color-accent)` em botões; borda `1.5px accent` em inputs. Sem glow. |
| Desabilitado | `opacity: .35`, sem mudança de cor |
| Erro | borda `danger`, fundo `danger-tint`, texto `danger` |
| Seleção no canvas | quadro `1.5px accent` + alças 7px `surface-2` com borda accent |
| Vazio | uma linha `text-ghost` e, no máximo, uma ação |

## 10. Movimento

Easing único: `cubic-bezier(0.16, 1, 0.3, 1)`.

| Animação | Duração | Onde |
| --- | --- | --- |
| `fade-in` | 0.4s | painéis |
| `scale-in` | 0.5s | popovers, modais, toolbar de seleção |
| `canvas-appear` | 0.7s | primeira pintura do documento |
| `toast-in` | 0.28s | toasts |
| `transition-colors` | 150ms | hover e estados |

Nunca animar o canvas durante drag/transform.

---

## Snippet — `app/globals.css`

```css
@theme inline {
  --color-surface-0: #eceae5;
  --color-surface-1: #f7f6f3;
  --color-surface-2: #ffffff;
  --color-surface-3: #f4f2ee;
  --color-surface-4: #eeece7;

  --color-border-subtle: rgb(0 0 0 / .06);
  --color-border-default: rgb(0 0 0 / .08);
  --color-border-strong: rgb(0 0 0 / .14);

  --color-text-primary: #1b1a18;
  --color-text-secondary: #6b6862;
  --color-text-tertiary: #8b877f;
  --color-text-ghost: #a5a09a;

  --color-accent: #5b5bd6;
  --color-accent-hover: #4a4ac4;
  --color-accent-fg: #ffffff;
  --color-accent-tint: #f0ecff;
  --color-accent-tint-fg: #4a45b8;

  --color-danger: #c9553d;
  --color-danger-tint: #fdf3f1;
  --color-success: #5f8f6c;
  --color-warning: #b8823a;

  --font-body: 'Instrument Sans', system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 11px;
  --radius-xl: 14px;

  --ease-standard: cubic-bezier(0.16, 1, 0.3, 1);
}

.dark {
  --color-surface-0: #0e0e10;
  --color-surface-1: #161619;
  --color-surface-2: #1c1c20;
  --color-surface-3: #141417;
  --color-surface-4: #26262b;

  --color-border-subtle: #ffffff0d;
  --color-border-default: #ffffff12;
  --color-border-strong: #ffffff24;

  --color-text-primary: #ededf0;
  --color-text-secondary: #9a9aa3;
  --color-text-tertiary: #7d7d86;
  --color-text-ghost: #5c5c65;

  --color-accent: #8b8bf5;
  --color-accent-hover: #a5a5f8;
  --color-accent-fg: #12121a;
  --color-accent-tint: #8b8bf51f;
  --color-accent-tint-fg: #a5a5f8;

  --color-danger: #e0836f;
  --color-danger-tint: #c9553d1f;
  --color-success: #8fbf9a;
  --color-warning: #d9a75c;
}
```

## Migração a partir do tema verde

| Antes | Depois |
| --- | --- |
| `accent-green #34d399` | `accent` (`#5b5bd6` claro / `#8b8bf5` escuro) |
| `accent-green-hover #6ee7b7` | `accent-hover` |
| `bg-accent-green/10` | `accent-tint` |
| `surface-0 #0c0c0c` etc. | mesma escala, agora com par claro |
| `text-primary #e8e8e8` | `#ededf0` no escuro, `#1b1a18` no claro |
| `text-[11px]` padrão | `11.5px` (densidade média) |
| `accent-pink` / `accent-blue` | mantidos só como categóricos; estado é sempre íris |
