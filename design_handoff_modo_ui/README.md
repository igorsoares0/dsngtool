# Handoff: Modo — redesign da UI do editor (direção "Daylight / Íris")

## Overview
Redesign da interface do Modo (editor visual de posts para redes sociais). O verde
`#34d399` foi removido; o acento passa a ser íris (`#5b5bd6` claro / `#8b8bf5` escuro).
O chrome ganha um tema claro em papel quente como padrão, com tema escuro pareado,
densidade um pouco maior (11 → 11.5/12px), cantos mais macios e painéis/toolbars
flutuantes. A estrutura do produto (rail, painel contextual, canvas, propriedades)
é preservada — não é uma reorganização de arquitetura.

Cobertura: editor (claro e escuro), painéis contextuais (templates, uploads),
toolbar de seleção, barra de IA, dashboard de projetos, modal de export,
modal de upgrade, e a folha de estados/componentes.

## About the Design Files
Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos
que mostram aparência e comportamento pretendidos, **não** código de produção para
copiar. A tarefa é **recriar esses designs no ambiente já existente do Modo**:
Next.js 16 + React 19, Tailwind CSS v4 com tokens em `@theme inline`
(`app/globals.css`), componentes em `app/components/editor/`, ícones em
`icons.tsx`. Nenhum HTML daqui deve ir para o repositório.

O arquivo `Modo UI.dc.html` contém duas rodadas de exploração; **a direção aprovada
é a `1a` (Daylight / Íris)**, mais os detalhamentos `2a` (tema escuro completo),
`2b` (dashboard), `2c` (estados) e a densidade **média** da `2e`. As demais opções
(1b Nocturne, 2d outros acentos, 2f painel flutuante) ficam como registro — não
implemente.

## Fidelity
**Alta fidelidade.** Cores, tipografia, espaçamentos e raios são finais e estão
documentados em `design-tokens.md`. Recriar fielmente usando os componentes e
utilitários já existentes no codebase; onde este documento e o HTML divergirem,
`design-tokens.md` vence.

## Screens / Views

### 1. Editor — tema claro (opção `1a`)
**Propósito:** editar um documento no canvas Konva.
**Layout:** coluna vertical. Topbar `52px` fixa; abaixo, linha com rail `56px`,
painel contextual `252px`, canvas `flex:1`, painel de propriedades `266px`.
Fundo do app `#eceae5`; topbar, rail e painéis `#f7f6f3` com borda
`rgb(0 0 0 / .06)`; conteúdo do painel de propriedades em `#ffffff`.

**Topbar (esquerda → direita):**
- Marca: quadrado `26px`, `radius 8px`, fundo `#5b5bd6`, letra "M" branca 12px/600.
- Nome do projeto `13px/600`; formato `11px/400` em `#9a968f`.
- Chip "Salvo": `10px/500` mono, texto `#5f8f6c`, fundo `#5f8f6c1a`, `radius full`, `3px 8px`.
- Centro: grupo em `#eeece7`, `radius 9px`, `padding 3px` — seletor de formato
  ("1080 × 1080" + chevron) em cartão branco `radius 7px` com `shadow-raise`;
  divisor `1px`; ferramentas selecionar/mão e desfazer/refazer (`28×26`, `radius 7px`;
  a ativa em branco; refazer desabilitado em `#c3bfb8`).
- Direita: "Arquivo" (branco, borda `rgb(0 0 0 / .09)`, `radius 8px`, `11.5px/500`);
  "Upgrade" (fundo `#f0ecff`, texto `#4a45b8`); **"Exportar"** (fundo `#5b5bd6`, texto
  branco, `6px 13px`, `radius 8px`, sombra `0 1px 2px rgb(91 91 214 / .4)`) — o único
  botão primário da tela; avatar `27px` `radius full` `#d8d4cc`.

**Rail:** botões `38×38`, `radius 10px`, ícone 18px. Ativo = fundo `#5b5bd6` + ícone
branco. Ação de IA no fim, separada por divisor `1px × 24px`, em `accent-tint`.
Todo ícone precisa de tooltip.

**Painel contextual (templates):** título `12.5px/600`; busca (`#fff`, borda
`rgb(0 0 0 / .09)`, `radius 8px`); chips de filtro `radius full`, ativo `#1b1a18`/branco,
inativo `#eeece7`/`#6b6862`; grade 2 colunas, `gap 10px`, miniaturas `aspect-ratio 1`,
`radius 9px`; selecionada com borda `2px #5b5bd6`.

**Canvas:** documento `1080²` escalado; papel `#f4f1ea`, `radius 2px`, `shadow-canvas`.
- **Seleção:** quadro `1.5px #5b5bd6` com `inset -9px -2px`; 4 alças `7px` brancas com
  borda `1.5px` accent, `radius 2px`.
- **Toolbar de seleção:** flutua **acima** do quadro (`top:22px` relativo ao documento
  no mock), `#fff`, borda `rgb(0 0 0 / .07)`, `radius 11px`, `padding 4px`,
  `shadow-pop`, `white-space:nowrap` — chip da fonte em `accent-tint`, swatch da cor,
  divisor, duplicar / agrupar / bloquear / excluir (excluir em `#c9553d`).
- **Pílula de zoom:** canto inferior esquerdo, `#fff`, `radius 10px`; valor em mono
  `11px` `tabular-nums`, largura mínima `36px`; "Ajustar" à direita.
- **Barra de IA:** inferior centralizada, `330px`, `radius full`, `#fff`, borda
  `rgb(0 0 0 / .08)`, `shadow 0 6px 20px rgb(0 0 0 / .10)`; ícone accent, placeholder
  "Descreva um post…", contador de cota "4/5" em mono, botão circular `26px` accent.

**Painel de propriedades:** abas "Propriedades" / "Camadas" (`11.5px`; ativa em
`#fff` com `radius 8px 8px 0 0`). Seções com legenda `10px/500` maiúscula
`letter-spacing:.1em` `#9a968f` + chevron, separadas por `1px rgb(0 0 0 / .06)`,
`padding 14px`, `gap 11px`:
- POSIÇÃO & TAMANHO — grade 2×2 X/Y/W/H (input `#f4f2ee`, borda `rgb(0 0 0 / .06)`,
  `radius 8px`, `6px 9px`; rótulo mono `10px` `#a5a09a`, valor mono `11.5px`;
  o campo focado ganha borda `1.5px #5b5bd6` e fundo branco); rotação e opacidade;
  slider (trilha `4px` `#eae7e1`, preenchimento accent, alça `12px` branca com borda accent).
- TIPOGRAFIA — seletor de fonte renderizado **na própria fonte**; tamanho; alinhamento
  em grupo segmentado (`radius 6px` internos, ativo em branco com `shadow-raise`).
- COR — swatch `20px` `radius 6px` + hex mono + opacidade; "Paleta do documento"
  com swatches `24px` `radius full` e um slot tracejado de adicionar.

### 2. Editor — tema escuro (opção `2a`)
Mesma estrutura, superfícies da coluna "Escuro" dos tokens. Acento sobe para
`#8b8bf5` e o texto sobre acento vira `#12121a`. Papel do canvas continua
`#f4f1ea` (o documento não muda com o tema) e ganha sombra mais profunda.
Painel contextual mostrado aqui com **Uploads**: busca, uso "184 MB de 250 MB" +
link Upgrade, barra de progresso `4px` accent, dropzone tracejada
(`1px dashed #ffffff1f`, `radius 10px`) e grade 3 colunas; miniatura selecionada
com `outline: 2px #8b8bf5`, `outline-offset: 1px`.

### 3. Dashboard (opção `2b`)
**Layout:** nav lateral `212px` (`surface-1`) + conteúdo `padding 20px 22px`, `gap 16px`.
- Nav: marca; itens `8px 10px`, `radius 9px`, `12px`; ativo = `#fff` + `shadow-raise`
  + ícone accent. Rodapé: cartão `accent-tint` `radius 11px` com plano, cota de IA
  restante e botão accent "Ver o Pro".
- Cabeçalho: "Seus projetos" `20px/600` + subtítulo `11.5px` `#8b877f`; busca; botão
  primário "Novo design"; avatar.
- Três cartões de métrica (`surface-1`, `radius 11px`): ARMAZENAMENTO (barra accent),
  GERAÇÕES DE IA (barra `#c9553d` quando ≥80% da cota), DISPOSITIVOS. Valor em mono `17px`.
- Chips de filtro por formato + "Ordenar: recentes".
- Grade de 5 colunas, `gap 14px`: miniatura `aspect-ratio 1` `radius 11px`, nome
  `11.5px/500`, metadado `10.5px` `#a5a09a`. **Hover/atual:** `outline 2px accent`,
  `outline-offset 2px`, e botão de menu `22px` `radius 7px` no canto superior direito.
  Último slot = "Em branco" tracejado.

### 4. Modal de export (em `1a`)
`412px`, `#fff`, `radius 10px`, `padding 20px`, `shadow-modal`. Título `15px/600`,
subtítulo `11.5px` `#8b877f`. Três cartões de formato (PNG / JPEG / JSON,
`radius 10px`, `padding 11px 12px`); o selecionado com borda `1.5px accent` e fundo
`#f6f5ff`. Rodapé separado por `1px`: tamanho estimado à esquerda; "Cancelar"
(contornado) e "Baixar" (accent).

### 5. Estados e componentes (opção `2c`)
Folha de referência: botões de ícone (repouso / hover / ativo / foco / desabilitado)
+ tooltip; inputs (repouso / hover / foco / erro); painel de múltipla seleção
("3 elementos", ferramentas de alinhamento, botão "Agrupar"); estado vazio
("Nada selecionado. Clique em um elemento do canvas." + ação secundária "Editar o
fundo"); toasts de sucesso e de erro recuperável. Valores exatos em §9 dos tokens.

## Interactions & Behavior
- **Toolbar de seleção:** aparece quando há ≥1 elemento selecionado, ancorada ao topo
  do quadro de seleção (`bottom: 100%; margin-bottom: 10px` no wrapper do quadro),
  centralizada horizontalmente; some durante drag/transform; `scale-in` 0.5s.
  Precisa de `white-space: nowrap` — o chip da fonte não pode quebrar em duas linhas.
- **Popovers e color picker:** portal para `document.body` com `createPortal` e
  coordenadas de `getBoundingClientRect()` do gatilho — `position: fixed` dentro de um
  container com `transform` posiciona errado (gotcha já conhecido do time).
- **Painéis:** `fade-in` 0.4s ao trocar de ferramenta no rail.
- **Canvas:** `canvas-appear` 0.7s na primeira pintura; nada animado durante gestos.
- **Barra de IA:** contador mostra cota usada/limite; ao esgotar, dispara o modal de
  upgrade em vez de chamar a API.
- **Uploads:** dropzone aceita drag & drop; erro de tipo/tamanho vira toast `danger`
  ("Arquivo maior que 15 MB" + ação "Tentar outro"), nunca bloqueia o editor.
- **Hover:** `transition-colors` 150ms com `--ease-standard` em tudo.
- **Responsivo:** abaixo de ~1280px, o painel contextual colapsa em overlay sobre o
  canvas; abaixo de ~1024px, o painel de propriedades vira folha inferior. Rail e
  topbar não colapsam.

## State Management
Nenhuma mudança no modelo de dados. O redesign toca só a camada visual, mas presume:
- `theme: 'light' | 'dark' | 'system'` persistido em Zustand + localStorage, aplicado
  como classe `.dark` no `<html>`; padrão = `system`.
- `activeTool`, `selection`, `viewport.zoom` já existentes governam rail ativo,
  toolbar de seleção e pílula de zoom.
- `propertiesTab: 'properties' | 'layers'` para as abas do painel direito.
- Cotas (storage, gerações de IA) continuam vindas de `/api/me`; a UI só as exibe.

## Design Tokens
Documento completo e pronto para colar: **`design-tokens.md`** (neste pacote),
incluindo o bloco `@theme inline` + `.dark` e a tabela de migração a partir do verde.

## Assets
- **Fontes:** Instrument Sans (UI) e Geist Mono (numéricos) — adicionar a
  `app/lib/fonts.ts` via `next/font/google` para manter a garantia offline.
  Playfair Display já existe no catálogo e aparece nos mocks só como conteúdo do
  documento do usuário.
- **Ícones:** todos os ícones dos mocks são SVG inline, `24×24`, `fill="none"`,
  `stroke="currentColor"`, `stroke-width="1.5"`, pontas e junções arredondadas —
  mesma convenção do `icons.tsx` atual. Não introduzir biblioteca de ícones.
- **Imagens:** nenhuma. Miniaturas de template e upload nos mocks são blocos de cor
  representando conteúdo real.

## Files
- `screenshots/` — capturas das telas aprovadas:
  `1a-editor-claro.png`, `2a-editor-escuro.png`, `2b-dashboard.png`,
  `2c-estados.png`, `1a-modal-export-e-dashboard-compacto.png`.
- `Modo UI.dc.html` — todas as explorações. **Implemente a `1a`** (+ `2a`, `2b`, `2c`,
  densidade média da `2e`). Ignore `1b`, `2d`, `2f`.
- `design-tokens.md` — tokens finais e migração.
- `overview.md`, `design-guidelines.md` — documentos originais do produto, para contexto.
