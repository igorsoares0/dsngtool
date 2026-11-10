# Deploy — Editor na Hetzner com Coolify

Guia de deploy do editor (esta app Next.js) num VPS Hetzner usando o **Coolify**
(PaaS self-hosted, gratuito e open source). O banco continua no **Neon**.

## Arquitetura

```
dominio.com       → landing (Cloudflare Pages — projeto separado, ver nota no fim)
app.dominio.com   → DNS A → VPS Hetzner
                              └─ Coolify (PaaS self-hosted)
                                  └─ container Next.js (porta 3000)
                                      ├─ /api/webhooks/paddle   ← venda direta → licença + e-mail
                                      ├─ /api/webhooks/appsumo  ← ciclo das licenças AppSumo
                                      ├─ /api/appsumo/redeem    ← redirect OAuth do AppSumo
                                      ├─ /api/license/status    ← checagem diária de reembolso
                                      └─ /api/license/by-transaction ← chave pós-checkout
Banco: Neon Postgres — só a tabela License
Designs, imagens e chave de IA: no aparelho do usuário (IndexedDB)
```

Custos: **Coolify = €0** (self-hosted). Você paga só o servidor Hetzner
(**~€5/mês na CX22**). Nenhuma assinatura de software.

---

## 0. Escolha do servidor

`next build` (Next 16 + TypeScript) consome bastante RAM e roda **no próprio
servidor**. Recomendado:

| Instância | RAM | Custo aprox. | Veredito |
|---|---|---|---|
| **CX22** | 4 GB | **~€5/mês** | **Padrão.** Build passa com swap (passo 2.1) |
| CX32 | 8 GB | ~€9/mês | Conforto — build folgado, sem swap |
| CPX11 | 2 GB | ~€4/mês | ❌ build de Next morre por OOM |

Vá de **CX22 + swap**. Localização EU inclui 20 TB de tráfego.

---

## 1. Criar o servidor na Hetzner

1. Hetzner Cloud Console → **New Project** → **Add Server**.
2. **Image:** Ubuntu 24.04 LTS.
3. **Type:** CX22.
4. **SSH key:** adicione a sua (evita senha por e-mail).
5. **Firewall:** libere **22 (SSH), 80 (HTTP), 443 (HTTPS)**. A porta **8000**
   (setup do Coolify) pode ser liberada temporariamente ou acessada via túnel SSH.
6. Crie e anote o **IP público**.

---

## 2. Instalar o Coolify

SSH no servidor e rode o instalador oficial:

```bash
ssh root@SEU_IP
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Acesse `http://SEU_IP:8000` e crie a **conta de admin** rápido (esse endpoint
fica aberto até você registrar).

> Depois, em **Settings**, dá pra apontar um domínio pro painel
> (ex: `coolify.dominio.com`) com TLS e fechar a porta 8000.

### 2.1. Adicionar swap (na CX22)

Logo após criar o servidor, garanta que o `next build` não estoure memória:

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

(Pule este passo se usar CX32.)

---

## 3. DNS

No provedor de DNS do `dominio.com`:

| Tipo | Nome | Valor |
|---|---|---|
| A | `app` | `SEU_IP` |

Aguarde propagar (`dig app.dominio.com` deve retornar o IP). O TLS do Let's
Encrypt depende disso resolvendo.

---

## 4. Criar a aplicação no Coolify

1. **+ New** → **Project** (ex: `dsgntool`) → environment **Production**.
2. **+ New Resource** → **Public Repository** ou **GitHub App** (recomendado, pra
   deploy automático no push).
3. URL do repositório + branch `main`.
4. **Build Pack:** **Nixpacks** (detecta Next.js sozinho — sem Dockerfile).
5. **Port:** `3000`.
6. **Domain:** `https://app.dominio.com` — com `https://`, dispara o TLS automático.

O Nixpacks usa os scripts do `package.json`:
- `postinstall` / `build` → rodam `prisma generate` ✓
- `start` → `next start` ✓

---

## 5. Variáveis de ambiente ⚠️ (pegadinha principal)

As variáveis **`NEXT_PUBLIC_*` são embutidas no bundle durante o `build`**, não em
runtime. No Coolify, cada env var tem um checkbox **"Build Variable?"** — você
**precisa marcar** as três `NEXT_PUBLIC` e o `DIRECT_URL`, senão o checkout do
Paddle vem vazio no cliente.

Em **Environment Variables**, adicione (valores de **produção** do Paddle):

| Variável | "Build Variable?" | Observação |
|---|---|---|
| `DATABASE_URL` | ❌ runtime | Neon **pooled** |
| `DIRECT_URL` | ✅ **build** | Neon **direct** — usado pelo migrate |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | ✅ **build** | token de produção |
| `NEXT_PUBLIC_PADDLE_ENV` | ✅ **build** | `production` |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_LTD` | ✅ **build** | price **único** (one-time) da licença vitalícia. O webhook também lê — o Next embute `NEXT_PUBLIC_*` até no código do servidor |
| `NEXT_PUBLIC_LTD_PRICE_LABEL` | ✅ **build** | opcional, ex. `$59` — aparece no botão de compra |
| `PADDLE_API_KEY` | ❌ runtime | secret de produção (busca o e-mail do comprador) |
| `PADDLE_WEBHOOK_SECRET` | ❌ runtime | do destination de produção (passo 8) |
| `LICENSE_PRIVATE_KEY` | ❌ runtime | chave Ed25519 que assina as licenças (`scripts/license-keygen.mjs`). **Guarde no gerenciador de senhas** — perdeu, não emite mais chaves que o app aceite |
| `APP_URL` | ❌ runtime | `https://app.dominio.com` — links do e-mail e redirect do AppSumo |
| `APPSUMO_API_KEY` | ❌ runtime | Partner Portal — assina os webhooks do AppSumo |
| `APPSUMO_CLIENT_ID` / `_SECRET` | ❌ runtime | Partner Portal — OAuth do redeem |
| `RESEND_API_KEY` | ❌ runtime | |
| `LICENSE_EMAIL_FROM` | ❌ runtime | remetente do e-mail da licença, domínio verificado no Resend |

Não existem mais: `BETTER_AUTH_*`, `GOOGLE_*`, `R2_*`, `ANTHROPIC_API_KEY`,
`NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY` — pode apagar do Coolify.

> **Sandbox → produção:** token, env, price id, API key e webhook secret **todos
> mudam** ao sair do sandbox. Não reaproveite os de teste.

---

## 6. Migrations do banco (Prisma)

As migrations não rodam sozinhas. Escolha uma:

**Opção A (recomendada) — Pre-deployment command no Coolify.**
Em **Configuration → Pre-deployment Command**:

```bash
npx prisma migrate deploy
```

Roda antes de cada release, usando `DIRECT_URL`. Idempotente.

**Opção B — uma vez, manual.** Numa máquina com o `DIRECT_URL` de produção:

```bash
npx prisma migrate deploy
```

> ⚠️ A migration `..._local_first_licensing` **apaga todas as tabelas da era
> SaaS** (usuários, sessões, projetos, assinaturas, assets, cota de IA) e cria
> só a `License`. Na época só existiam contas de teste. Os objetos no R2 não
> são tocados — apague o bucket `modo-assets` à mão quando quiser.

---

## 7. Primeiro deploy

1. **Deploy**.
2. Acompanhe o log: `npm install` → `prisma generate` → `next build` → start.
3. Em **Running**, o Coolify provisiona o **TLS** pro `app.dominio.com`.
4. Abra `https://app.dominio.com` — o editor deve carregar.

Se o build estourar memória (OOM no log) mesmo com swap, suba pra CX32.

---

## 8. Webhooks — Paddle e AppSumo

**Paddle** — Dashboard (produção) → **Developer Tools → Notifications** →
**+ New destination**:

- **URL:** `https://app.dominio.com/api/webhooks/paddle`
- **Events:** `transaction.completed` (cria a licença e manda o e-mail),
  `adjustment.created` e `adjustment.updated` (reembolso total aprovado ou
  chargeback revogam a licença).
- Salve e **copie o secret** (`pdl_ntfset_...`) → `PADDLE_WEBHOOK_SECRET`.
  Re-deploy depois de colar.

**AppSumo** — Partner Portal, na página do produto:

- **Webhook URL:** `https://app.dominio.com/api/webhooks/appsumo`
- **OAuth Redirect URL:** `https://app.dominio.com/api/appsumo/redeem`
  (tem que bater byte a byte com `APP_URL` + `/api/appsumo/redeem`).
- O portal valida as duas URLs na hora de salvar (POST de teste e GET vazio) —
  a app precisa estar no ar. Depois disso ele libera `client_id`/`client_secret`
  e a API key → envs do passo 5.

---

## 9. Checklist pós-deploy

- [ ] `https://app.dominio.com` mostra a tela **Activate Modo**; service worker
      registra (DevTools → Application) e o cache ativo é o `modo-v3`.
- [ ] Uma chave manual (`node --env-file=.env scripts/issue-license.mjs --note teste`)
      ativa pelo link e cai no dashboard.
- [ ] Checkout do Paddle abre (vazio = esqueceu de marcar as `NEXT_PUBLIC` como
      Build Variable) → compra de teste → a app se ativa sozinha e o e-mail chega
      (cheque SPF/DKIM do `LICENSE_EMAIL_FROM`).
- [ ] Reembolso no Paddle → `GET /api/license/status?id=<id>` responde `revoked`.
- [ ] AppSumo: as duas URLs salvas no portal; um redeem de teste volta pra
      `/activate` já ativado.
- [ ] **Auto-deploy:** com GitHub App, todo push na `main` re-deploya.
- [ ] **Backup do Neon** ativado — a tabela `License` é o único estado do
      servidor (o AppSumo exige que guardemos as license keys deles).

---

## Nota — landing page (`dominio.com`)

A landing é um projeto **separado**, estático, e fica melhor na **Cloudflare
Pages**: free, **uso comercial permitido**, banda ilimitada, sem risco de fatura
surpresa. Não precisa de Vercel (cujo plano free é só não-comercial) nem de mais
um VPS.

| Componente | Onde | Custo |
|---|---|---|
| Landing (`dominio.com`) | Cloudflare Pages | €0 |
| Editor + licenças (`app.dominio.com`) | Hetzner CX22 + Coolify | ~€5/mês |
| Banco | Neon | €0 (free tier) |
