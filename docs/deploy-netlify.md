# Deploy na Netlify

## Diagnóstico: por que o deploy automático não acontece

O site **`simuladormoneygo`** existe e está no ar, mas **não está conectado ao
repositório do GitHub**. Ele foi publicado por upload (CLI/API), não por Git.

Evidência do último deploy (`27/07/2026`) lida pela API da Netlify:

| Campo | Valor | Significado |
|---|---|---|
| `deploy_source` | `api` | Deploy enviado por CLI/API — **não** por webhook do GitHub |
| `has_source_zip` | `true` | O código subiu como .zip, não foi clonado do GitHub |
| `commit_ref` | `eedd10f` | Rótulo do commit local de quem rodou o comando |
| `connected_accounts` (conta) | `{}` | **Nenhum provedor Git autorizado** nessa conta Netlify |

Consequência prática: o commit `e8e60b7` (`feat(home-equity): remove population
constraint from simulator`) nunca foi publicado. Todo `git push` fica sem efeito,
porque não existe gatilho ligando o repositório ao site.

A Capita Max funciona porque está em **outra conta Netlify** (a pessoal), onde o
GitHub já foi autorizado uma vez. Essa autorização **não é herdada** pela conta
`moneygosolucoesemcredito@gmail.com` — cada conta Netlify tem a sua.

O build **não é o problema**: `next build` no commit mais recente compila sem
erros (19 rotas geradas).

---

## O que fazer para liberar o deploy

As etapas 1 e 2 exigem acesso ao painel — precisam ser feitas por você.

### 1. Instalar o app da Netlify na organização do GitHub

O repositório está sob a **organização** `moneygosolucoesemcredito-stack`, não
sob um usuário pessoal. Aplicativos instalados numa conta pessoal não enxergam
repositórios de organização — é por isso que o repo tende a não aparecer na
lista da Netlify.

1. Acesse <https://github.com/apps/netlify/installations/new>
2. Escolha a organização **`moneygosolucoesemcredito-stack`** (não a conta pessoal).
3. Em *Repository access*, marque **`Simulador_MoneyGo`** (ou *All repositories*).
4. Confirme com **Install**.

> Se você não for owner da organização, o GitHub envia um pedido de aprovação
> para quem é — o botão vira *Request*. Sem essa aprovação, nada adiante prossegue.

### 2. Conectar o repositório ao site na Netlify

Feito na conta **`moneygosolucoesemcredito@gmail.com`** (team **MoneyGo**):

1. <https://app.netlify.com/projects/simuladormoneygo/configuration/deploys>
2. Em **Continuous deployment › Build settings**, clique em **Link repository**.
3. Escolha **GitHub** e autorize (é aqui que a conta ganha o `connected_account`
   que hoje está vazio).
4. Selecione `moneygosolucoesemcredito-stack/Simulador_MoneyGo`.
5. Branch de produção: **`main`**.
6. Build command e publish directory podem ficar em branco — o `netlify.toml`
   na raiz do repositório define ambos (`npm run build` → `.next`).

### 3. Conferir as variáveis de ambiente do site

Em **Project configuration › Environment variables**. Um build vindo do Git roda
do zero e só enxerga o que estiver cadastrado aqui:

**Obrigatórias**

- `NEXT_PUBLIC_BRAND` = `moneygo`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_URL` = `https://www.moneygosolucoesemcredito.com.br`

**Conforme o que estiver ativo** — `KOMMO_SUBDOMAIN`, `KOMMO_LONG_LIVED_TOKEN`,
`KOMMO_PIPELINE_ID`, `KOMMO_*_STAGE_ID`, `GOOGLE_SHEETS_WEBHOOK_URL`,
`APIPLACAS_TOKEN`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GTM_ID`.

As sem prefixo `NEXT_PUBLIC_` são segredos de servidor: nunca as renomeie para
`NEXT_PUBLIC_`, isso as exporia no navegador.

### 4. Validar

Faça um push em `main` e confirme em **Deploys** que surge um build com origem
**GitHub** (e não `api`), publicando o commit mais recente.

---

## Por que o `netlify.toml` não fixa a marca

Este repositório é multimarca: o mesmo código gera MoneyGo e Capita Max, e a
escolha vem de `NEXT_PUBLIC_BRAND` (`lib/brand/index.ts`, default `moneygo`).

Valores em `[build.environment]` do `netlify.toml` **têm precedência sobre as
variáveis do painel**. Se o arquivo fixasse `NEXT_PUBLIC_BRAND = "moneygo"`, o
site da Capita Max — que lê o mesmo repositório — passaria a construir com a
identidade da MoneyGo, sem erro aparente.

Por isso o `netlify.toml` traz apenas o que é comum às duas marcas (comando de
build, `publish`, `NODE_VERSION`, plugin do Next). **Cada site define a sua
marca nas variáveis de ambiente do próprio projeto.**
