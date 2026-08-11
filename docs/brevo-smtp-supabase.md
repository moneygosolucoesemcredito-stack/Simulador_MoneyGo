# SMTP da Brevo no Supabase Auth

Passo a passo para tirar o envio de e-mail do servidor compartilhado
(`mail.moneygosolucoesemcredito.com.br` → `server6.clickplus.info`) e colocar na
Brevo. Sem isso a recuperação de senha não funciona: o Supabase tem um limite
fixo de **10 segundos** por requisição e o servidor atual estoura esse tempo.

## Estado da conta Brevo (lido em 11/08/2026)

| Item | Valor |
| --- | --- |
| Conta | MoneyGo Soluções em Crédito — `moneygosolucoesemcredito@gmail.com` |
| Plano | Free — **300 e-mails/dia** (folgado para recuperação de senha) |
| Relay SMTP | `smtp-relay.brevo.com` porta `587` |
| Login SMTP | `b52981001@smtp-brevo.com` |
| **Relay ativo?** | **Não** — precisa ser ativado |
| Remetentes | Só `moneygosolucoesemcredito@gmail.com` |
| Domínio autenticado | **Nenhum** |

Ou seja: a conta existe e está no ar, mas o envio transacional ainda não foi
ligado e o domínio `moneygosolucoesemcredito.com.br` não foi autenticado.

## O que falta fazer

Os três primeiros passos são na Brevo e exigem acesso ao painel — não dá para
automatizar (a API da Brevo não expõe ativação de relay, verificação de domínio
nem geração de chave SMTP).

### 1. Ativar o relay transacional

Brevo → **Transactional** → **Email** → **Settings** → **SMTP & API**.

Se aparecer um aviso de que o envio transacional precisa ser liberado, peça a
ativação ali mesmo. Em contas novas a Brevo costuma pedir uma descrição rápida
do uso — algo como *"e-mails transacionais de autenticação: recuperação de senha
e confirmação de conta para o portal de parceiros"* resolve.

Enquanto `relay.enabled` for `false`, nenhum e-mail sai por SMTP.

### 2. Autenticar o domínio

Brevo → **Senders, Domains & Dedicated IPs** → aba **Domains** → **Add a domain**
→ `moneygosolucoesemcredito.com.br`

A Brevo vai gerar 3 a 4 registros DNS (um TXT de verificação, o DKIM, e um DMARC
sugerido). Cadastre-os no painel de DNS do domínio — provavelmente na ClickPlus,
que é quem hospeda hoje.

**Não pule este passo.** Sem DKIM o e-mail sai, mas cai no spam do Gmail com
altíssima probabilidade — e aí o sintoma vira "não chega e-mail" de novo, com
outra causa.

### 3. Criar o remetente e a chave SMTP

- **Senders** → **Add a sender** → `suporte@moneygosolucoesemcredito.com.br`,
  nome `MoneyGo Soluções em Crédito`
- **SMTP & API** → aba **SMTP** → **Generate a new SMTP key** → copie a chave

A chave aparece **uma única vez**. Guarde no gerenciador de senhas.

### 4. Configurar no Supabase

Supabase → projeto **Simulador-MoneyGo** (`jeeizsbhphyjitdwdbbw`) →
**Authentication** → **Emails** → **SMTP Settings** → ligar **Enable Custom SMTP**:

| Campo | Valor |
| --- | --- |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | `b52981001@smtp-brevo.com` |
| Password | a chave SMTP gerada no passo 3 |
| Sender email | `suporte@moneygosolucoesemcredito.com.br` |
| Sender name | `MoneyGo Soluções em Crédito` |

Salve.

### 5. Subir o limite de envio

Supabase → **Authentication** → **Rate Limits** → **Emails per hour**.

O padrão é dimensionado para o serviço embutido do Supabase (pouquíssimos
e-mails/hora). Com SMTP próprio dá para subir com folga — **30/hora** cobre o uso
real de um portal de parceiros e ainda protege contra abuso. O teto prático é o
limite diário da Brevo (300/dia no plano free).

### 6. Trocar o template do e-mail

Supabase → **Authentication** → **Emails** → aba **Reset Password** → substituir
o corpo inteiro pelo conteúdo de
[`docs/email-templates/recuperacao-de-senha.html`](./email-templates/recuperacao-de-senha.html).

O template já vem com a identidade da marca e, principalmente, com o link no
formato `{{ .TokenHash }}` — que é o que faz o fluxo funcionar quando o usuário
pede o link no computador e abre o e-mail no celular.

## Depois de tudo, testar

1. Janela anônima → `https://simuladormoneygo.netlify.app/operador/login`
2. "Esqueci minha senha" → e-mail de um operador real
3. **A resposta tem que ser rápida** (menos de 2 segundos). Se ainda demorar ~10s
   e falhar, o SMTP não está valendo — revise os passos 1 a 4.
4. Abrir o e-mail e redefinir a senha
5. Repetir pedindo no computador e abrindo o e-mail no celular

Para confirmar do lado do servidor, os logs de auth do projeto mostram
`POST /recover` com status `200` e duração de milissegundos — em vez dos `504`
com `context deadline exceeded` de 10 segundos que apareciam antes.

## Segurança — pendência

A senha de `suporte@moneygosolucoesemcredito.com.br` foi exposta em conversa e
deve ser considerada comprometida. **Troque no painel da hospedagem.** Depois da
migração para a Brevo, essa credencial não é mais usada pelo Supabase — o acesso
à caixa continua valendo, então a troca segue necessária.
