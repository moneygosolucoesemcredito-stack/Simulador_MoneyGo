# Recuperação de senha do parceiro

Guia de configuração do fluxo "Esqueci minha senha" da área do parceiro.
O código já está pronto no repositório — o que falta é **configuração no painel
do Supabase**, e é ela que faz o link do e-mail funcionar de verdade.

> Faça o passo a passo **em cada projeto Supabase**: o da MoneyGo e o da
> Capita Max são bancos separados (`NEXT_PUBLIC_SUPABASE_URL` e
> `NEXT_PUBLIC_SUPABASE_URL_CAPITAMAX`). Configurar só um deixa a outra marca
> quebrada.

---

## Como o fluxo funciona

| Etapa | Onde | O que acontece |
|---|---|---|
| 1 | `/operador/login` | Parceiro clica em "Esqueci minha senha" |
| 2 | `/recuperar-senha` | `resetPasswordForEmail` com `redirectTo = <origem>/auth/confirm` |
| 3 | Supabase | Envia o e-mail com o link (template "Reset Password") |
| 4 | `/auth/confirm` | Valida o token **no servidor** (`verifyOtp`) e grava a sessão em cookie |
| 5 | `/redefinir-senha` | Parceiro define a nova senha (`updateUser`) |
| 6 | `/operador` ou `/` | Vai para o painel se estiver na allowlist `operadores` |

Arquivos envolvidos:

- `app/recuperar-senha/page.tsx` — formulário de pedido
- `app/auth/confirm/route.ts` — validação do token no servidor
- `app/redefinir-senha/page.tsx` — tela de nova senha
- `lib/auth/recuperacao.ts` — mensagens de erro e proteção contra redirect aberto

---

## Passo 1 — URL Configuration (obrigatório)

`Dashboard > Authentication > URL Configuration`

**Site URL**

```
https://www.moneygosolucoesemcredito.com.br
```

**Redirect URLs** (uma por linha):

```
https://www.moneygosolucoesemcredito.com.br/**
https://*.vercel.app/**
http://localhost:3000/**
http://localhost:3001/**
```

- O `/**` no fim é o que libera `/auth/confirm`. **Sem essa entrada, o Supabase
  ignora o `redirectTo` e joga o parceiro na Site URL** — é o motivo nº 1 de
  "cliquei no link e caiu na home sem fazer nada".
- `localhost:3001` é a porta do `npm run dev:capitamax`.
- `https://*.vercel.app/**` cobre os deploy previews. Se o deploy for Netlify,
  troque por `https://*.netlify.app/**`.

## Passo 2 — SMTP próprio (obrigatório em produção)

`Dashboard > Project Settings > Authentication > SMTP Settings`

O servidor de e-mail embutido do Supabase é **só para desenvolvimento**: manda
poucos e-mails por hora e, em projetos novos, só entrega para os membros da
equipe do projeto. Enquanto ele estiver ativo, o parceiro pede a recuperação,
o app mostra "verifique seu e-mail" e **o e-mail nunca chega**.

Configure um provedor real (Resend, Brevo, SendGrid, Amazon SES…):

| Campo | Valor |
|---|---|
| Sender email | `nao-responda@moneygosolucoesemcredito.com.br` |
| Sender name | `MoneyGo Soluções em Crédito` |
| Host / Port / User / Pass | os do provedor |

Depois, em `Authentication > Rate Limits`, suba o limite de e-mails
(`Rate limit for sending emails`) — o padrão de 2/hora derruba qualquer teste.

> O domínio remetente precisa estar verificado no provedor (SPF/DKIM), senão o
> e-mail vai para spam ou é recusado.

## Passo 3 — Template do e-mail

`Dashboard > Authentication > Email Templates > Reset Password`

**Subject**

```
Redefinição de senha — MoneyGo
```

**Message body**

```html
<h2>Redefinição de senha</h2>
<p>Olá! Recebemos um pedido para redefinir a senha da sua conta de parceiro MoneyGo.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha">
    Definir nova senha
  </a>
</p>
<p>O link vale por 1 hora e só pode ser usado uma vez.</p>
<p>Se você não pediu isso, ignore este e-mail — sua senha continua a mesma.</p>
```

Por que **não** usar o `{{ .ConfirmationURL }}` padrão:

- `{{ .TokenHash }}` funciona em **qualquer navegador ou aparelho**. O parceiro
  pode pedir a recuperação no computador e abrir o e-mail no celular. Com o
  link padrão (PKCE), o verificador fica guardado no navegador de origem e a
  troca falha com "link inválido" no celular.
- Antivírus e filtros de e-mail corporativo abrem os links antes da pessoa e
  queimam o token de uso único. O `token_hash` só é consumido no clique real.

O `/auth/confirm` continua aceitando o formato padrão (`?code=…`), então nada
quebra se o template não for trocado — mas o problema do "outro aparelho"
permanece enquanto ele não for.

### Validade do link

`Dashboard > Authentication > Providers > Email > Email OTP Expiration`

O padrão é 3600s (1 hora). Se aumentar ou diminuir, ajuste o texto do template.

## Passo 4 — Convite de parceiro novo (opcional, mesmo caminho)

As contas são criadas pela administração (`Authentication > Users > Invite user`).
Para o convidado definir a própria senha, ajuste o template **Invite user**:

```html
<h2>Bem-vindo à área do parceiro MoneyGo</h2>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/redefinir-senha">
    Criar minha senha
  </a>
</p>
```

O `/auth/confirm` aceita `type=invite`, e a tela de nova senha é a mesma.

Depois de criar o usuário, **lembre de inserir o id dele na tabela
`operadores`** — sem isso ele redefine a senha, entra, e o proxy o manda de
volta para a home:

```sql
-- confira as colunas antes: a tabela foi criada direto no dashboard e pode
-- exigir nome/e-mail além do id.
insert into public.operadores (id) values ('<uuid-do-usuario>');
```

---

## Como testar

1. `Authentication > Users` → confirme que o e-mail de teste existe.
2. Abra `/operador/login` → "Esqueci minha senha" → informe o e-mail.
3. O e-mail deve chegar em segundos. Não chegou? Veja
   `Dashboard > Logs > Auth Logs` — erro de SMTP aparece lá.
4. Clique no link **em outro navegador** (ex.: aba anônima). Tem que abrir a
   tela "Definir nova senha" — esse é o teste que o fluxo antigo não passava.
5. Salve a senha e confirme que caiu em `/operador`.
6. Clique no **mesmo link de novo**: precisa mostrar "Este link já foi usado ou
   expirou" com o botão de solicitar novo.

## Diagnóstico rápido

| Sintoma | Causa provável | Onde resolver |
|---|---|---|
| E-mail não chega | SMTP embutido / limite de envio | Passo 2 |
| Cai na home ao clicar no link | `/auth/confirm` fora da allowlist | Passo 1 |
| "Este link expirou" logo de cara | Filtro de e-mail abriu o link antes; ou OTP expiration curto | Passo 3 |
| "Precisa ser aberto no mesmo navegador" | Template ainda usa `{{ .ConfirmationURL }}` | Passo 3 |
| Redefine a senha mas volta para a home | Usuário não está na tabela `operadores` | Passo 4 |
| "Muitas solicitações" | Rate limit de e-mail do Supabase | Passo 2 |

Os erros do Supabase são traduzidos em `lib/auth/recuperacao.ts` — se aparecer
uma mensagem genérica ("Não foi possível validar este link"), o código do erro
está na URL (`?error_code=…`) e basta mapeá-lo lá.
