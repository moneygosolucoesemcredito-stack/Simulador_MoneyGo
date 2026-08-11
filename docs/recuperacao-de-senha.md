# Recuperação de senha (Supabase Auth)

Fluxo completo do "Esqueci minha senha" e o que precisa estar configurado no
painel do Supabase para ele funcionar. **Código sozinho não resolve**: os dois
itens da seção "Configuração no painel" são obrigatórios.

## O caminho que o usuário percorre

```
/operador/login  →  "Esqueci minha senha"
        ↓
/recuperar-senha            resetPasswordForEmail(email, { redirectTo })
        ↓                   redirectTo = <origem>/auth/confirm?next=/redefinir-senha
   e-mail do Supabase
        ↓
/auth/confirm               verifyOtp({ type, token_hash })      ← token_hash
        ↓                   exchangeCodeForSession(code)         ← PKCE (fallback)
        ↓                   grava os cookies de sessão no redirect
/redefinir-senha            já abre autenticado → updateUser({ password })
        ↓
/operador
```

Arquivos:

| Etapa | Arquivo |
| --- | --- |
| Pedido do link | `app/recuperar-senha/page.tsx` |
| Callback | `app/auth/confirm/route.ts` |
| Formulário de nova senha | `app/redefinir-senha/page.tsx` |
| Mensagens de erro | `lib/supabase/erros-auth.ts` |
| Testes | `__tests__/recuperacao-senha.test.ts` |

## Configuração no painel do Supabase

Cada marca tem o seu **próprio projeto Supabase** (`NEXT_PUBLIC_SUPABASE_URL`
para a MoneyGo, `NEXT_PUBLIC_SUPABASE_URL_CAPITAMAX` para a Capita Max). O que
está abaixo precisa ser feito **em cada projeto**.

### 1. Authentication → URL Configuration

Esta é a causa mais comum de "o link não funciona": o `redirectTo` enviado pelo
app precisa casar com a allowlist. Quando não casa, o Supabase **descarta**
o `redirectTo` silenciosamente e manda o usuário para a *Site URL* — que por
padrão é `http://localhost:3000`.

- **Site URL**: `https://simuladormoneygo.netlify.app`
- **Redirect URLs** (uma por linha):
  - `https://simuladormoneygo.netlify.app/**`
  - `http://localhost:3000/**` — desenvolvimento
  - `https://www.moneygosolucoesemcredito.com.br/**` — quando o domínio próprio
    entrar no ar
  - `https://*--simuladormoneygo.netlify.app/**` — deploy previews, se forem usados

> O app monta o `redirectTo` a partir de `window.location.origin`, então
> **todo host de onde alguém possa pedir o link** precisa estar na lista —
> inclusive a variante com e sem `www`, que o Supabase trata como origens
> diferentes.

### 2. Authentication → Emails → "Reset Password"

Troque o corpo padrão (`{{ .ConfirmationURL }}`) pelo template com `token_hash`
em [`docs/email-templates/recuperacao-de-senha.html`](./email-templates/recuperacao-de-senha.html),
cujo link é:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha
```

Por que trocar, e não deixar o `{{ .ConfirmationURL }}` padrão:

- **O `{{ .ConfirmationURL }}` depende de PKCE.** Ele passa por
  `/auth/v1/verify`, que devolve um `?code=` que só pode ser trocado por sessão
  com o `code_verifier` gravado em cookie **no navegador que pediu o link**.
  Pedir no computador e abrir o e-mail no celular quebra o fluxo — que é
  exatamente o comportamento mais comum dos usuários.
- **O `token_hash` é validado no servidor**, sem depender de nada guardado no
  navegador. Funciona em qualquer aparelho.

O `/auth/confirm` aceita os dois formatos, então o fluxo não quebra durante a
transição nem para links que já foram entregues antes da mudança.

## Diagnóstico rápido

| Sintoma | Causa provável |
| --- | --- |
| O link do e-mail leva para `localhost:3000` | O host não está na allowlist de Redirect URLs (item 1) |
| "Link inválido ou expirado" na hora, em qualquer link | `redirectTo` fora da allowlist, ou o token já foi consumido |
| Funciona no desktop, falha no celular | Template ainda usa `{{ .ConfirmationURL }}` (PKCE); veja o item 2 |
| Link "expira" sozinho antes do clique | Antivírus/Safe Links do e-mail corporativo abriu o link antes; o `token_hash` reduz, mas não elimina — oriente a pedir um link novo |
| A tela diz "verifique seu e-mail" mas nada chega | Veja o console: o erro de `resetPasswordForEmail` agora é exibido. Cheque também o rate limit de e-mail do projeto (padrão baixo no plano free) e o SMTP customizado |
| "Não foi possível enviar o link agora", com ~10s de espera | SMTP estourando o timeout do Supabase. Ver [`docs/brevo-smtp-supabase.md`](./brevo-smtp-supabase.md) |

### Como ler os logs do servidor

Supabase → **Logs** → **Auth Logs**, filtrando por `/recover`. O que procurar:

- `status: 200` com duração de milissegundos → envio saudável
- `status: 504`, `error_code: request_timeout`, duração de ~10s → o SMTP está
  travando; é o sintoma que motivou a migração para a Brevo
- o campo `referer` do log mostra o `redirect_to` que o Supabase realmente
  aceitou — se vier só a origem, sem `/auth/confirm`, a allowlist do item 1
  está recusando o valor e caindo na Site URL

## Notas de segurança

- `/auth/confirm` só aceita caminhos internos em `next` — `?next=https://…` e
  `?next=//…` são ignorados, para não virar um open redirect.
- A página `/redefinir-senha` limpa `?code=`/`#access_token`/`?erro=` da barra
  de endereço assim que valida, para o token não ficar no histórico do navegador.
- `resetPasswordForEmail` não revela se o e-mail existe, e a UI mantém esse
  comportamento: só erros de configuração e de rate limit aparecem para o usuário.
