# Resumo do Deploy em Produção — Simulador MoneyGo

**Data:** 05/08/2026
**Origem:** `claude/home-equity-property-value-limit-77nb38` → `main` (fast-forward)
**Hosting:** Netlify — projeto `simuladormoneygo`, deploy disparado pelo push em `main`
**Público:** colaboradores da MoneyGo, uso diário

> Este documento consolida os 7 blocos de mudança. O `production_deployment_log.md`
> cobre a primeira leva (itens 1–5, publicada mais cedo hoje); aqui está o pacote
> completo, incluindo UI/FAQ e portal do parceiro.

---

## 1. Estado verificado antes do push

Valores lidos direto do código, não de memória:

| # | Produto | Verificação |
|---|---|---|
| 1 | Auto Equity | leve **20 anos** · pesado **15 anos** · frase "carros de passeio" ausente da UI |
| 2 | Home Equity | teto de valor do imóvel **removido** (piso de R$ 250.000 mantido) |
| 3 | Fin. Imobiliário | teto **removido** · PF casa 80% / terreno 60% · PJ casa 70% / terreno 60% · "Renda necessária" na tela · tabelas SAC/PRICE na UI e no PDF |
| 4 | Construção | condomínio **80% obra · 13,99% a.a. + TR · 30 anos · PF** \| fora **50% VGV · 1,25% a.m. + IPCA · 20 anos · PF e PJ** · PDF ativo |
| 5 | Fin. Veículo | LTV **80%** · pesado **5 anos** · campo "Valor a financiar" · "entrada é opcional" ausente |
| 6 | UI & FAQ | Hero sem atalhos HE/AE · rodapé com Redes sociais + Contatos · WhatsApp flutuante no layout · FAQ com 30% e correspondente bancário |
| 7 | Portal parceiro | "Olá, Daiana" (fallback "Olá, \<e-mail\>") · grupo com `ml-auto` · barra `w-full` |

```
npm test          → 25 arquivos, 328 testes, todos passando
npx tsc --noEmit  → sem erros
npm run build     → ✓ Compiled successfully
npm run lint      → 5 problemas pré-existentes, nenhum em arquivo alterado
```

---

## 2. Mudanças por produto

### 2.1 Auto Equity
Idade máxima por categoria: leve 20 anos, pesado 15 anos (`CONFIG.autoEquity`).
Veículo fora do limite encerra a jornada no Step 1, com o motivo na tela. A
restrição a "carros de passeio" saiu do Step 1, do FAQ e dos cards.

### 2.2 Home Equity
`valorImovelMaximo` removido — não há teto de valor de imóvel. O Step 1 ganhou
campo monetário digitável e régua que acompanha o valor. Piso de R$ 250.000
preservado. A limitação era só do controle deslizante; não havia trava no
back-end.

### 2.3 Financiamento Imobiliário
- Teto de R$ 5.000.000 removido, mesmo tratamento do Home Equity.
- **LTV por tomador:**

  | Tipologia | PF | PJ |
  |---|---|---|
  | Casa / Apartamento | 80% | 70% |
  | Comercial | 70% | 70% |
  | Terreno | 60% | 60% |

  O Step 4 pede o tomador antes do valor e rebaixa o crédito escolhido quando a
  troca PF → PJ reduz o teto.
- **"Total pago" → "Renda necessária"**: parcela ÷ 0,30, sobre a maior parcela
  de cada sistema (primeira no SAC, fixa no PRICE). Vale na tela e no PDF.
- Tabelas **SAC e PRICE completas** — todas as parcelas com juros, amortização,
  parcela e saldo devedor — na UI e no PDF (uma página por sistema).

### 2.4 Crédito para Construção
Categoria do terreno passa a definir a operação inteira:

| | Dentro de condomínio | Fora de condomínio |
|---|---|---|
| Público | só PF | PF e PJ |
| Teto | 80% do custo da obra | 50% do VGV |
| Taxa | 13,99% a.a. + TR | 1,25% a.m. + IPCA |
| Prazo | 360 meses | 240 meses |

O Step 2 pergunta "Custo da obra" **ou** "VGV estimado" conforme a categoria.
O seletor manual TR/IPCA foi removido. PDF ativado com resumo, comparativo e as
duas tabelas completas.

### 2.5 Financiamento de Veículo
"Valor da entrada" virou **"Valor a financiar"** — o cliente informa o montante
que quer captar. Saíram "a entrada é opcional", "Financie até 100%" e o rótulo
"Sem entrada". LTV de **80%**, bloqueado no passo e na qualificação. O funil
ganhou categoria do veículo (leve/pesado, com troca de tabela FIPE): pesado só
entra com até **5 anos**, senão a tela mostra "Bem não elegível para esta
modalidade" e a jornada encerra.

### 2.6 UI e FAQ
- Hero sem os dois atalhos em destaque; no lugar, "Conheça nossos produtos"
  apontando para a seção de produtos (os 5 funis seguem acessíveis lá e no rodapé).
- Rodapé segregado: **Redes sociais** (Instagram, Facebook, LinkedIn, YouTube) e
  **Contatos** (WhatsApp e e-mail comercial).
- **WhatsApp flutuante** no layout raiz — presente em todas as páginas, acima do
  banner de cookies.
- FAQ: imóvel financiado orienta sobre **30%** de saldo devedor deixando claro que
  não é regra fixa; pesados com o limite de cada produto; nova pergunta
  "A MoneyGo é uma instituição financeira?" com a resposta de correspondente
  bancário.

### 2.7 Portal do parceiro
O e-mail cru deu lugar a **"Olá, [Nome]"**, lido do `user_metadata` do Supabase
Auth (chaves `nome`, `full_name`, `name`, `nome_completo`, `display_name`), com o
e-mail como fallback. A barra do cabeçalho passou a ocupar a largura total — antes
usava o mesmo container estreito do conteúdo, o que colava a identificação na logo
no meio da tela. O grupo "saudação + Sair" é empurrado por `ml-auto` até a borda
direita, em qualquer resolução; a saudação trunca com `title` e o "Sair" não encolhe.
**A logo permanece intocada**: mesma imagem, mesmo tamanho (h-12) e mesmo canto de
antes. No celular a saudação fica oculta (como o e-mail já ficava), já que a logo
completa ocupa quase toda a largura.

---

## 3. Motor de cálculo — o que foi conferido

- **LTV** aplicado em três camadas: régua limitada no passo, valor recortado antes
  de gravar no funil e nova checagem na qualificação antes do envio do lead.
  Testes fixam os limites exatos (ex.: FI PJ casa aprova 350.000 e reprova 355.000
  de um imóvel de 500.000; veículo aprova 80.000 e reprova 80.000,01 de um bem de
  100.000).
- **Taxas**: a de condomínio é publicada ao ano e o cálculo roda no mensal
  equivalente — `(1 + i_a)^(1/12) − 1` ≈ 1,0972% a.m. Um teste garante que a taxa
  anual crua não é usada como se fosse mensal (o erro inflaria a parcela em várias
  vezes).
- **Tabelas de amortização**: soma das amortizações igual ao principal e saldo
  devedor exatamente zero na última parcela, nos dois sistemas.
- **Renda necessária**: a parcela representa exatamente 30% da renda calculada.

## 4. Mensagens ao colaborador

| Situação | Texto |
|---|---|
| HE/FI abaixo do piso | "Valor abaixo do mínimo de R$ 250.000,00." (R$ 200.000,00 no FI) |
| FI teto por tomador | "Você pode financiar até R$ … (80% do valor do imóvel para PF)." |
| FI renda | "Renda necessária estimada com comprometimento de 30% da renda mensal sobre a maior parcela do sistema." |
| Construção público | "Dentro de condomínio atende apenas PF." |
| Construção teto baixo | "O teto desta categoria (R$ …) fica abaixo do crédito mínimo de R$ …. Revise o custo da obra." |
| Veículo acima do LTV | "O valor a financiar não pode ultrapassar 80% do valor do veículo (R$ …)." |
| Veículo recusado | "Bem não elegível para esta modalidade." + motivo e a regra |

Todas trazem o valor concreto no texto e o campo problemático fica em vermelho —
o colaborador consegue reportar o caso sem precisar reproduzir a tela.

---

## 5. Deploy

1. `git checkout main && git merge --ff-only` da branch de trabalho.
2. `git push origin main` → build automático na Netlify (`npm run build`, Next.js 16).

Nenhuma variável de ambiente nova. As existentes seguem necessárias: `KOMMO_*`
(envio de leads), `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_GTM_ID` (rastreamento)
e `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (área do operador).

---

## 6. O que os colaboradores precisam saber

- **Aba antiga pode mostrar estado velho.** O funil guarda dados em
  `sessionStorage` e alguns campos mudaram de nome (`valor_entrada` →
  `valor_financiado`, `indexador` → `categoria_terreno`). Quem estiver com o
  simulador aberto desde antes do deploy deve recarregar a página.
- **A saudação "Olá, [Nome]" só aparece com o nome cadastrado** no usuário do
  Supabase Auth (Authentication → Users → User Metadata). Sem isso, o cabeçalho
  segue mostrando o e-mail — funciona, mas sem o nome.

## 7. Pontos abertos (não bloqueiam o deploy)

1. **FAQ 30% × simulador 50%** — decisão do negócio (05/08): o 30% é orientação
   ao cliente sobre o saldo devedor, não a regra. A trava do simulador continua em
   50%, intencionalmente.
2. **Pesados de 5 anos no FAQ** — o pedido original mandava escrever isso na
   pergunta do Auto Equity, mas 5 anos é regra do Financiamento de Veículo (no Auto
   Equity são 15). A resposta cobre os dois produtos com o limite correto de cada um.
   Se a intenção era mudar o Auto Equity, é alteração de regra e precisa de decisão.
3. ~~FAQ institucional~~ — **resolvido (05/08)**: a pergunta "Quanto tempo leva para
   receber o crédito?" foi removida a pedido do negócio. O FAQ fica com 7 perguntas.
4. **WhatsApp** — o número informado (`554797890220`) não tem o nono dígito e o link
   wa.me não abriria. Está em uso `5547997890220` — (47) 99789-0220, o mesmo número
   já cadastrado no projeto.
5. **"+10" × "mais de 50" instituições** — o selo do topo e a seção de parceiros
   dizem "+10 instituições parceiras", enquanto a resposta nova do FAQ fala em "mais
   de 50". Vale alinhar os dois números.
6. **Schema do Supabase** — a tabela `operadores` é consultada pelo middleware mas
   não é criada por nenhuma migration do repositório: o banco real tem estrutura que
   o repositório não descreve. Se `operadores` já tiver uma coluna de nome, ela é uma
   fonte melhor para a saudação do que o `user_metadata`.
7. **Financiamento de Veículo** é o único produto sem gerador de PDF.
8. **Fin. Imobiliário**: as tabelas consideram só juros — MIP, DFI e estruturação
   estão no `CONFIG` mas não entram na parcela.
