# Convite de parceiro (Supabase Auth)

Como convidar um novo parceiro para a área do operador, e o que precisa estar
configurado para o link do e-mail funcionar.

## O caminho

```
Supabase → Authentication → Users → Invite user
        ↓
   e-mail de convite
        ↓
/auth/confirm               verifyOtp({ type: "invite", token_hash })
        ↓                   grava os cookies de sessão no redirect
/criar-senha                updateUser({ password })
        ↓
/operador                   ← exige estar na tabela `operadores`
```

| Etapa | Arquivo |
| --- | --- |
| Callback | `app/auth/confirm/route.ts` (o mesmo da recuperação de senha) |
| Tela de criação de senha | `app/criar-senha/page.tsx` |
| Formulário compartilhado | `components/auth/DefinirSenhaForm.tsx` |
| Template do e-mail | `docs/email-templates/convite-parceiro.html` |

## O que estava quebrado

Os logs de auth do convite enviado em 12/08 mostram:

```
POST /invite   → 200   redirect_to: https://simuladormoneygo.netlify.app
GET  /verify   → 303   redirect_to: https://simuladormoneygo.netlify.app
     auth_event.action: user_signedup
```

O template padrão usa `{{ .ConfirmationURL }}`, que joga o convidado na **Site
URL** — a home do site — com os tokens no fragmento da URL. Nada na home lê
aquilo. Resultado: o convite era **consumido** (`confirmed_at` preenchido no
banco), o parceiro caía numa página comum sem nenhum campo de senha, e um
segundo clique no link falhava porque o token é de uso único.

Não era erro de envio: o e-mail chegava e o link "funcionava" do ponto de vista
do Supabase. Faltava destino.

## Configuração obrigatória

### 1. Template do e-mail

Supabase → **Authentication** → **Emails** → aba **Invite user** → substituir o
corpo pelo conteúdo de
[`docs/email-templates/convite-parceiro.html`](./email-templates/convite-parceiro.html).

O link do template é:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/criar-senha
```

### 2. Incluir o parceiro na tabela `operadores`

**Convidar pelo Supabase não dá acesso ao painel.** O `proxy.ts` trata
`operadores` como allowlist: quem tem sessão mas não está na tabela é mandado
de volta para a home. É de propósito — contas de *cliente* também vivem em
`auth.users` e não podem entrar no painel.

Depois de convidar, rode no SQL Editor:

```sql
insert into public.operadores (id, nome)
select id, 'Nome do Parceiro'
from auth.users
where email = 'parceiro@exemplo.com.br'
on conflict (id) do nothing;
```

Para conferir quem está de fora:

```sql
select u.email, u.invited_at, u.confirmed_at, (o.id is not null) as e_operador
from auth.users u
left join public.operadores o on o.id = u.id
order by u.created_at desc;
```

## Convite já consumido

Se o parceiro clicou no link antigo (quebrado), a conta dele já está confirmada
e o convite não pode ser reenviado com efeito — o token foi gasto.

A saída é o próprio fluxo de recuperação, que funciona: peça para ele entrar em
`/recuperar-senha` e informar o e-mail. Ele recebe um link de definição de senha
e entra normalmente. Não é preciso apagar e recriar o usuário.

## Testar

1. Convidar um e-mail de teste em **Authentication → Users → Invite user**
2. Abrir o e-mail e clicar em "Criar minha senha"
3. Esperado: cai em `/criar-senha` com o título "Bem-vindo à MoneyGo"
4. Definir a senha → deve ir para `/operador`
5. Se cair na home em vez do painel, falta o `insert` em `operadores` (passo 2)
6. Repetir pedindo em um aparelho e abrindo o e-mail em outro — o `token_hash`
   torna isso possível; o formato antigo não funcionava assim
