# Deploy — Editor na Hetzner com Coolify

Guia de deploy do editor (esta app Next.js) num VPS Hetzner usando o **Coolify**
(PaaS self-hosted, gratuito e open source). O banco continua no **Neon**.

## Arquitetura

```
dominio.com       → landing (Cloudflare Pages — projeto separado, ver nota no fim)
app.dominio.com   → DNS A → VPS Hetzner
                              └─ Coolify (PaaS self-hosted)
                                  └─ container Next.js (porta 3000)
                                      ├─ /api/webhooks/paddle   ← Paddle chama aqui
                                      ├─ /api/auth/[...all]     ← better-auth
                                      ├─ /api/projects          ← sync entre dispositivos
                                      ├─ /api/uploads           ← upload pro R2
                                      └─ /api/ai/generate       ← Anthropic
Banco: Neon Postgres (não migra — continua onde está)
Arquivos: Cloudflare R2 (bucket modo-assets)
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
| `NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY` | ✅ **build** | price id da assinatura mensal |
| `PADDLE_API_KEY` | ❌ runtime | secret de produção |
| `PADDLE_WEBHOOK_SECRET` | ❌ runtime | do destination de produção (passo 8) |
| `BETTER_AUTH_URL` | ❌ runtime | `https://app.dominio.com` — links de e-mail e callback OAuth |
| `BETTER_AUTH_SECRET` | ❌ runtime | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `_SECRET` | ❌ runtime | opcional — em branco esconde o login com Google |
| `R2_ENDPOINT` / `R2_BUCKET` | ❌ runtime | bucket `modo-assets` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | ❌ runtime | token R2 com Object Read & Write |
| `R2_PUBLIC_URL` | ❌ runtime | domínio público do bucket; sem ele os assets são servidos via `/api/assets/<key>` |
| `ANTHROPIC_API_KEY` | ❌ runtime | ausente → `/api/ai/generate` responde 503 |
| `RESEND_API_KEY` | ❌ runtime | |
| `LICENSE_EMAIL_FROM` | ❌ runtime | remetente (reset de senha / verificação), domínio verificado no Resend |

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

> ⚠️ A migration `..._ai_usage_per_user` **apaga as linhas de `AiUsage`**
> (a cota passou a ser por usuário, e as antigas eram por device id, sem como
> mapear pra uma conta). Todo mundo recomeça o mês em zero — o que é o certo,
> já que os contadores antigos não eram confiáveis.

---

## 7. Primeiro deploy

1. **Deploy**.
2. Acompanhe o log: `npm install` → `prisma generate` → `next build` → start.
3. Em **Running**, o Coolify provisiona o **TLS** pro `app.dominio.com`.
4. Abra `https://app.dominio.com` — o editor deve carregar.

Se o build estourar memória (OOM no log) mesmo com swap, suba pra CX32.

---

## 8. Webhook do Paddle

No **Paddle Dashboard (produção)** → **Developer Tools → Notifications** →
**+ New destination**:

- **URL:** `https://app.dominio.com/api/webhooks/paddle`
- **Events:** os `subscription.*` (created, activated, updated, paused, resumed,
  canceled) — é o que o código processa; cada um carrega o estado completo da
  assinatura, então um upsert basta.
- Salve e **copie o secret** (`pdl_ntfset_...`) → vai em `PADDLE_WEBHOOK_SECRET`
  (passo 5). Re-deploy depois de colar.

Teste com **"Send test event"** e confira no log do Coolify se caiu em `[paddle]`
sem erro de assinatura.

---

## 9. Checklist pós-deploy

- [ ] `https://app.dominio.com` carrega (deslogado, cai no `/login`); service
      worker registra (DevTools → Application → Service Workers) e o cache
      ativo é o `dsgntool-v2`.
- [ ] Signup + reset de senha funcionam — o e-mail do Resend chega (cheque
      SPF/DKIM do `LICENSE_EMAIL_FROM`).
- [ ] Upload de imagem sobe pro R2 e o medidor de storage mexe.
- [ ] `POST /api/ai/generate` **sem sessão** responde **401** (com sessão,
      gera e desconta a cota do mês).
- [ ] Checkout do Paddle abre (vazio = esqueceu de marcar as `NEXT_PUBLIC` como
      Build Variable).
- [ ] Assinatura de teste → webhook cria `Subscription` no Neon → `GET /api/me`
      passa a responder `pro: true`.
- [ ] **Auto-deploy:** com GitHub App, todo push na `main` re-deploya.
- [ ] **Backup do Neon** ativado (o banco é o único estado com valor; o resto é
      client-side/IndexedDB).

---

## Nota — landing page (`dominio.com`)

A landing é um projeto **separado**, estático, e fica melhor na **Cloudflare
Pages**: free, **uso comercial permitido**, banda ilimitada, sem risco de fatura
surpresa. Não precisa de Vercel (cujo plano free é só não-comercial) nem de mais
um VPS.

| Componente | Onde | Custo |
|---|---|---|
| Landing (`dominio.com`) | Cloudflare Pages | €0 |
| Editor + API (`app.dominio.com`) | Hetzner CX22 + Coolify | ~€5/mês |
| Banco | Neon | €0 (free tier) |
