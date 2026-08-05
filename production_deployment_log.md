# Log de Deploy em Produção — Simulador MoneyGo

**Data:** 05/08/2026
**Branch de origem:** `claude/home-equity-property-value-limit-77nb38` → `main`
**Hosting:** Netlify (CI/CD disparado pelo push em `main`)

---

## 1. Resumo executivo

Cinco produtos do simulador receberam mudanças de regra de negócio e de interface.
As alterações entram juntas nesta consolidação, todas cobertas por testes automatizados.

| Produto | O que mudou | Impacto para o colaborador |
|---|---|---|
| **Auto Equity** | Idade por categoria: leve 20 anos, pesado 15 anos. Sem restrição a "carros de passeio". | Caminhões, ônibus e cavalos mecânicos passam a ser simulados. |
| **Home Equity** | Teto de R$ 5.000.000 no valor do imóvel removido. | Imóveis de alto padrão entram na simulação; o limite passa a ser o LTV. |
| **Financiamento Imobiliário** | LTV por tomador (PJ 70% imóvel / 60% terreno; PF terreno 60%), "Total pago" → "Renda necessária", tabelas SAC/PRICE completas em tela e PDF. | O percentual financiável muda ao escolher PF ou PJ; a renda exigida aparece direto na tela. |
| **Crédito de Construção** | Categorias de terreno (dentro/fora de condomínio) com público, teto, taxa e prazo próprios. PDF ativado. | A primeira pergunta define toda a operação; o cliente sai com PDF. |
| **Financiamento de Veículo** | "Valor da entrada" → "Valor a financiar" (teto de 80%), veículo pesado só até 5 anos. | O cliente informa quanto quer captar, não o aporte. |

---

## 2. Detalhamento por produto

### 2.1 Auto Equity
- Idade máxima de fabricação por categoria: **leve 20 anos**, **pesado 15 anos**
  (`CONFIG.autoEquity.idadeVeiculoMaximaLeve` / `idadeVeiculoMaximaPesado`).
- A frase "atendemos apenas carros de passeio" foi retirada de toda a interface
  (Step 1, FAQ e cards da home).
- Veículo fora do limite encerra a jornada no Step 1, com o motivo exibido ao cliente.
- Já estava em produção antes desta consolidação (PR #3); revalidado aqui.

### 2.2 Home Equity
- `CONFIG.homeEquity.valorImovelMaximo` **removido** — não há teto de valor de imóvel.
- O Step 1 ganhou campo monetário digitável (sem limite superior) e a régua se
  estende até o valor informado. Piso de **R$ 250.000** preservado.
- Nenhuma trava existia no back-end: a limitação era só do controle deslizante.
- `valorImovelSliderReferencia` (R$ 5.000.000) permanece **apenas** como escala
  inicial da régua — não é validação.

### 2.3 Financiamento Imobiliário
- **LTV por tipologia e por tomador** (`LTV_POR_TIPO_IMOVEL_FI`):

  | Tipologia | PF | PJ |
  |---|---|---|
  | Casa / Apartamento | 80% | 70% |
  | Comercial | 70% | 70% |
  | Terreno | 60% | 60% |

- O Step 4 pede o tomador **antes** do valor e rebaixa automaticamente um crédito
  já escolhido quando a troca PF → PJ reduz o teto.
- Teto de R$ 5.000.000 no valor do imóvel removido (mesmo tratamento do Home Equity).
- **"Total pago" virou "Renda necessária"**: parcela ÷ 0,30 (comprometimento de
  renda), calculada sobre a maior parcela de cada sistema — a primeira no SAC, a
  fixa no PRICE.
- Tabelas **SAC e PRICE completas** (todas as parcelas, com juros, amortização,
  parcela e saldo devedor) na tela e no PDF.

### 2.4 Crédito de Construção
- Nova pergunta inicial: **categoria do terreno**.

  | | Dentro de condomínio | Fora de condomínio |
  |---|---|---|
  | Público | **só PF** | PF e PJ |
  | Teto de crédito | 80% do **custo da obra** | 50% do **VGV** |
  | Taxa | 13,99% **a.a.** + TR | 1,25% **a.m.** + IPCA |
  | Prazo máximo | 360 meses (30 anos) | 240 meses (20 anos) |

- O motor converte a taxa anual da TR para o mensal equivalente
  (`(1 + i_a)^(1/12) − 1` ≈ 1,0972% a.m.) — usar a taxa anual como se fosse
  mensal inflaria a parcela em várias vezes.
- O Step 2 pede **"Custo da obra"** ou **"VGV estimado"**, conforme a categoria.
- O antigo seletor manual TR/IPCA foi removido: a taxa vem da categoria.
- **PDF ativado** (`lib/pdf-credito-construcao.ts`): resumo das condições,
  comparativo SAC × PRICE e as duas tabelas completas, uma página por sistema.

### 2.5 Financiamento de Veículo
- Campo **"Valor da entrada" → "Valor a financiar"**: o cliente informa o montante
  que quer captar, não o aporte inicial (`valor_financiado` no lugar de `valor_entrada`).
- Frases removidas da interface: "a entrada é opcional", "Financie até 100%",
  rótulo "Sem entrada".
- **LTV de 80%**: `CONFIG.financiamentoVeiculo.ltv` passou de 1 para 0,8, com
  bloqueio no passo e na qualificação final.
- O funil ganhou **categoria do veículo** (leve/pesado, com troca de tabela FIPE).
  Veículo **pesado só é aceito com até 5 anos** de fabricação; acima disso a tela
  mostra **"Bem não elegível para esta modalidade"** e a jornada encerra ali.

---

## 3. Mensagens exibidas ao cliente

Todas em linguagem direta, com o valor concreto no texto:

| Situação | Mensagem |
|---|---|
| HE/FI — imóvel abaixo do piso | "Valor abaixo do mínimo de R$ 250.000,00." (ou R$ 200.000,00 no FI) |
| HE/FI — campo de valor | "Informe o valor de mercado estimado. Valor mínimo: … — não há valor máximo." |
| FI — teto por tomador | "Você pode financiar até R$ … (80% do valor do imóvel para PF)." |
| FI — renda | "Renda necessária estimada com comprometimento de 30% da renda mensal sobre a maior parcela do sistema." |
| Construção — categoria exclusiva | "Dentro de condomínio atende apenas PF." |
| Construção — teto abaixo do mínimo | "O teto desta categoria (R$ …) fica abaixo do crédito mínimo de R$ …. Revise o custo da obra." |
| Veículo — acima do LTV | "O valor a financiar não pode ultrapassar 80% do valor do veículo (R$ …)." |
| Veículo — bem recusado | "Bem não elegível para esta modalidade." + motivo e a regra ("veículos pesados até 5 anos") |

Placeholders monetários seguem o padrão `R$ 0,00` em todos os funis.

---

## 4. Verificação executada antes do deploy

```
npm test          → 22 arquivos, 301 testes, todos passando
npx tsc --noEmit  → sem erros
npm run build     → ✓ Compiled successfully (19 páginas estáticas)
npm run lint      → 5 problemas pré-existentes, nenhum nos arquivos alterados
```

Validação em navegador (Playwright sobre `npm run dev`), por produto:
- **HE/FI**: imóvel de R$ 12.000.000 aceito; LTV alternando 80% (PF) × 70% (PJ).
- **Construção**: condomínio/PF com 360 parcelas a 13,99% a.a.; fora/PJ com 240
  parcelas a 1,25% a.m.
- **Veículo**: teto de R$ 320.000 num bem de R$ 400.000; R$ 350.000 bloqueia o avanço.

### Suítes de teste da consolidação

| Arquivo | Cobertura |
|---|---|
| `__tests__/auto-equity-validacao.test.ts` + `auto-equity-step1-bloqueio.test.tsx` | idade por categoria e descarte no Step 1 |
| `__tests__/home-equity-valor-imovel.test.ts` + `home-equity-step1-valor-imovel.test.tsx` | ausência de teto, piso preservado |
| `__tests__/real_estate_financing.test.ts` + `fi-ui-ltv-amortizacao.test.tsx` + `fi-pdf-amortizacao.test.ts` | LTV PF/PJ, renda necessária, tabelas e PDF |
| `__tests__/construction_credit.test.ts` + `construcao-ui.test.tsx` + `construcao-pdf.test.ts` | categorias, conversão de taxas, PDF |
| `__tests__/vehicle_financing_logic.test.ts` + `financiamento-veiculo-ui.test.tsx` | LTV 80%, pesados 4a/6a, labels |

---

## 5. Deploy

1. `git checkout main && git merge --ff-only` da branch de trabalho — **fast-forward
   limpo**, sem conflitos (a branch já continha o merge do Auto Equity, PR #3).
2. `git push origin main` → dispara o build automático na Netlify.
3. A Netlify roda `npm run build` (Next.js 16) e publica o site.

### Variáveis de ambiente exigidas no painel da Netlify

Nenhuma variável nova foi introduzida nesta consolidação. As já existentes seguem
necessárias para o envio de leads (`KOMMO_*`), rastreamento
(`NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GTM_ID`) e área do operador
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

---

## 6. Pontos em aberto (não bloqueiam o deploy)

- **Estado persistido:** o funil guarda o estado em `sessionStorage`. Os campos
  mudaram de nome (`valor_entrada` → `valor_financiado`; `indexador` →
  `categoria_terreno`). Uma aba já aberta antes do deploy pode carregar estado
  antigo — basta recarregar a página ou reiniciar a simulação.
- **Financiamento de Veículo** é o único produto sem gerador de PDF.
- **Kommo:** continua recebendo `CF_VALOR_ENTRADA`, agora com os recursos próprios
  (bem − financiado). Não existe campo para "valor a financiar" separado, nem para
  categoria de terreno da Construção.
- **Construção:** o prazo de 30 anos em condomínio não conversa com a idade máxima
  de 60 anos do produto — não há trava "idade + prazo" como no Home Equity.
- **Financiamento Imobiliário:** as tabelas consideram só juros; MIP, DFI e
  estruturação estão no `CONFIG` mas não entram na parcela.
- **Documentos internos** (`prompt-ideal-claude-code-moneygo.md`, `docs/`) ainda
  descrevem regras antigas, se forem tratados como especificação viva.
